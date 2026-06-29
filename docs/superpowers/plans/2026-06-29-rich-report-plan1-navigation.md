# 리치 리포트 Plan ① — 네비게이션 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 리포트 "면접 영상" 섹션을 2분할로 — 좌측 영상 + 답변구간 타임라인, 우측 Q&A·STT 스크립트(클릭 시 해당 구간으로 영상 점프 + 답변별 기존 피드백 연결) — 로 업그레이드한다. 분석(시선/표정)은 범위 밖(Plan ②③).

**Architecture:** 이미 있는 `interview_turns`(STT content + created_at)와 Slice 1 녹화/`recording_started_at`만 사용. 새 BFF 라우트가 turns+anchor를 반환하고, 클라이언트 순수 함수가 Q&A 구간(startMs/endMs)으로 변환. rehearse의 검증된 seek/sync 계약(`seekTo(ms)=currentTime=ms/1000`, 타임라인 left%/width%, 200ms 폴링 active 구간)을 이식. 분석 인프라 불필요.

**Tech Stack:** Next.js(App Router, web/), node:test(`tsx --test`), Supabase admin 클라이언트(turns 읽기), 기존 DocumentSection/TOC 머신러리.

**중요 데이터 사실(탐색 검증):**
- `interview_turns.started_at`/`completed_at`은 실무상 **NULL**(페이로드 빌더 미설정). 신뢰 가능한 시각은 **`created_at`**(DB now(), 백그라운드 persist라 실제 발화보다 약간 지연 — 네비게이션엔 충분).
- 질문↔답변 페어링: **`exchange_index` 공유**(전용 인덱스 존재), 폴백 = 직전 model 턴.
- role: `{model, ai, assistant, interviewer}` = 질문(model), 그 외 = 답변(user).
- offset anchor = `recording_started_at ?? session.started_at`. `session.started_at`은 현재 세션 상세 응답에 없음 → 새 turns 라우트에서 함께 반환.
- 리포트 `report_payload`의 `questionFindings`(question/userAnswer/strengths/improvements/refinedAnswer)에 답변별 텍스트 피드백 존재 → 구간에 연결.

---

## File Structure
- Create `web/lib/interview/report/answer-segments.ts` — 순수: role 판정, 턴→Q&A 구간(startMs/endMs) 변환. (테스트 대상)
- Create `web/lib/interview/report/answer-segments.test.ts` — node:test.
- Create `web/app/api/interview/sessions/[id]/segments/route.ts` — GET: turns + anchor 반환(소유권 검사).
- Create `web/hooks/interview/use-segment-sync.ts` — 200ms 폴링 → active 구간.
- Create `web/components/features/interview/report/segment-video-player.tsx` — forwardRef VideoPlayerHandle + WebM duration 보정.
- Create `web/components/features/interview/report/segment-timeline-bar.tsx` — left%/width% 구간 + playhead + onSeek.
- Create `web/components/features/interview/report/answer-script-panel.tsx` — 우측 Q&A·STT 목록(클릭→seek, active 강조).
- Create `web/components/features/interview/report/interview-recording-section.tsx` — 2분할 조합(영상+타임라인 | 스크립트).
- Modify `web/app/interview/result/page.tsx` — recording fetch에서 durationMs/recordingStartedAt 캡처 + segments fetch + 기존 `<video>` 블록(약 1697–1709)을 `<InterviewRecordingSection>`으로 교체.

---

## Task 1: 답변 구간 순수 함수 + 테스트

**Files:**
- Create: `web/lib/interview/report/answer-segments.ts`
- Test: `web/lib/interview/report/answer-segments.test.ts` (기존 `test:interview-report` 스크립트가 `lib/interview/report/*.test.ts`를 커버)

- [ ] **Step 1: 실패 테스트 작성**

`web/lib/interview/report/answer-segments.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { isModelRole, buildAnswerSegments, type RawTurn } from "./answer-segments";

test("isModelRole treats model/ai/assistant/interviewer as question", () => {
  for (const r of ["model", "ai", "assistant", "interviewer", "MODEL"]) {
    assert.equal(isModelRole(r), true);
  }
  assert.equal(isModelRole("user"), false);
  assert.equal(isModelRole(""), false);
});

test("buildAnswerSegments pairs by exchange_index and computes offsets from created_at - anchor", () => {
  const anchor = "2026-06-29T00:00:00.000Z";
  const turns: RawTurn[] = [
    { id: "q1", role: "model", content: "자기소개 해주세요", exchangeIndex: 1, turnIndex: 0, createdAt: "2026-06-29T00:00:05.000Z" },
    { id: "a1", role: "user", content: "안녕하세요 저는", exchangeIndex: 1, turnIndex: 1, createdAt: "2026-06-29T00:00:20.000Z" },
    { id: "q2", role: "model", content: "기술 경험은?", exchangeIndex: 2, turnIndex: 2, createdAt: "2026-06-29T00:01:00.000Z" },
    { id: "a2", role: "user", content: "결제 모듈을", exchangeIndex: 2, turnIndex: 3, createdAt: "2026-06-29T00:01:30.000Z" },
  ];
  const segs = buildAnswerSegments(turns, anchor, 200_000);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].question, "자기소개 해주세요");
  assert.equal(segs[0].answer, "안녕하세요 저는");
  assert.equal(segs[0].startMs, 20_000); // a1 created - anchor
  assert.equal(segs[0].endMs, 90_000);   // next seg start (a2)
  assert.equal(segs[1].startMs, 90_000);
  assert.equal(segs[1].endMs, 200_000);  // last → durationMs
});

test("buildAnswerSegments falls back to nearest preceding model turn when exchange_index is 0", () => {
  const anchor = "2026-06-29T00:00:00.000Z";
  const turns: RawTurn[] = [
    { id: "q1", role: "model", content: "Q1", exchangeIndex: 0, turnIndex: 0, createdAt: "2026-06-29T00:00:05.000Z" },
    { id: "a1", role: "user", content: "A1", exchangeIndex: 0, turnIndex: 1, createdAt: "2026-06-29T00:00:10.000Z" },
  ];
  const segs = buildAnswerSegments(turns, anchor, 60_000);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].question, "Q1");
  assert.equal(segs[0].startMs, 10_000);
  assert.equal(segs[0].endMs, 60_000);
});

test("buildAnswerSegments clamps negative offsets to 0 and returns [] for invalid anchor", () => {
  const turns: RawTurn[] = [
    { id: "q1", role: "model", content: "Q", exchangeIndex: 1, turnIndex: 0, createdAt: "2026-06-29T00:00:00.000Z" },
    { id: "a1", role: "user", content: "A", exchangeIndex: 1, turnIndex: 1, createdAt: "2026-06-28T23:59:59.000Z" },
  ];
  const segs = buildAnswerSegments(turns, "2026-06-29T00:00:00.000Z", 60_000);
  assert.equal(segs[0].startMs, 0); // clamped
  assert.deepEqual(buildAnswerSegments(turns, "not-a-date", 60_000), []);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && npm run test:interview-report`
Expected: FAIL — `Cannot find module './answer-segments'`

- [ ] **Step 3: 구현**

`web/lib/interview/report/answer-segments.ts`:

```ts
export interface RawTurn {
  id: string;
  role: string;
  content: string;
  exchangeIndex: number;
  turnIndex: number;
  createdAt: string; // ISO
}

export interface AnswerSegment {
  id: string; // answer turn id
  exchangeIndex: number;
  question: string;
  answer: string;
  startMs: number;
  endMs: number;
}

const MODEL_ROLES = new Set(["model", "ai", "assistant", "interviewer"]);

export function isModelRole(role: string): boolean {
  return MODEL_ROLES.has(String(role || "").trim().toLowerCase());
}

/**
 * 턴 목록을 Q&A 답변 구간으로 변환.
 * - 오프셋(startMs) = answer.created_at - anchor (음수는 0으로 clamp).
 * - 질문 = 같은 exchange_index의 model 턴, 없으면 직전(turnIndex) model 턴.
 * - endMs = 다음 구간 startMs, 마지막은 durationMs.
 * anchor 파싱 불가 시 [] 반환.
 */
export function buildAnswerSegments(
  turns: RawTurn[],
  anchorIso: string,
  durationMs: number,
): AnswerSegment[] {
  const anchor = Date.parse(anchorIso);
  if (Number.isNaN(anchor)) return [];

  const sorted = [...turns].sort((a, b) => a.turnIndex - b.turnIndex);

  const findQuestion = (answer: RawTurn): string => {
    const byExchange = sorted.find(
      (t) => isModelRole(t.role) && t.exchangeIndex === answer.exchangeIndex,
    );
    if (byExchange) return byExchange.content;
    let prompt = "";
    for (let i = sorted.indexOf(answer) - 1; i >= 0; i--) {
      if (isModelRole(sorted[i].role)) {
        prompt = sorted[i].content;
        break;
      }
    }
    return prompt;
  };

  const segs: AnswerSegment[] = sorted
    .filter((t) => !isModelRole(t.role))
    .map((ans) => {
      const created = Date.parse(ans.createdAt);
      const startMs = Number.isNaN(created) ? 0 : Math.max(0, created - anchor);
      return {
        id: ans.id,
        exchangeIndex: ans.exchangeIndex,
        question: findQuestion(ans),
        answer: ans.content,
        startMs,
        endMs: 0, // set below
      };
    })
    .sort((a, b) => a.startMs - b.startMs);

  for (let i = 0; i < segs.length; i++) {
    segs[i].endMs = i + 1 < segs.length ? segs[i + 1].startMs : Math.max(durationMs, segs[i].startMs);
  }
  return segs;
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd web && npm run test:interview-report`
Expected: PASS (신규 4 테스트 포함 전체 통과)

- [ ] **Step 5: 커밋**

```bash
git add web/lib/interview/report/answer-segments.ts web/lib/interview/report/answer-segments.test.ts
git commit -m "feat(interview): 답변 구간(Q&A offset) 순수 함수"
```

---

## Task 2: segments BFF 라우트 (turns + anchor)

**Files:**
- Create: `web/app/api/interview/sessions/[id]/segments/route.ts`

> 템플릿: `web/app/api/interview/sessions/[id]/route.ts`(소유권 + admin read) + recording 라우트(`assertSessionOwner`, `runtime="nodejs"`). 라우트는 thin — 페어링/오프셋은 Task 1 순수 함수가 클라이언트에서 수행.

- [ ] **Step 1: 구현**

`web/app/api/interview/sessions/[id]/segments/route.ts`:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getInterviewRouteUserId } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id;
  const userId = await getInterviewRouteUserId();
  if (!userId) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();

  const { data: session } = await admin
    .from("interview_sessions")
    .select("user_id, started_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== userId) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }

  const { data: rec } = await admin
    .from("interview_recordings")
    .select("recording_started_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  const anchorIso: string | null = rec?.recording_started_at ?? session.started_at ?? null;

  const { data: turns, error } = await admin
    .from("interview_turns")
    .select("id, role, content, turn_index, exchange_index, created_at")
    .eq("session_id", sessionId)
    .order("turn_index", { ascending: true });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: {
      anchorIso,
      turns: (turns ?? []).map((t) => ({
        id: t.id,
        role: t.role,
        content: t.content,
        exchangeIndex: t.exchange_index ?? 0,
        turnIndex: t.turn_index,
        createdAt: t.created_at,
      })),
    },
  });
}
```

- [ ] **Step 2: 타입체크**

Run: `cd web && npx tsc --noEmit -p tsconfig.json`
Expected: 이 라우트 관련 에러 없음. (params 타이핑은 기존 `sessions/[id]/route.ts`와 동일한 동기형 `{ params: { id: string } }`.)

- [ ] **Step 3: 커밋**

```bash
git add web/app/interview/sessions/[id]/segments/route.ts
git commit -m "feat(interview): 답변 구간용 turns+anchor BFF 라우트(소유권 검사)"
```

---

## Task 3: 동기화 훅 + 비디오 플레이어(imperative seek)

**Files:**
- Create: `web/hooks/interview/use-segment-sync.ts`
- Create: `web/components/features/interview/report/segment-video-player.tsx`

> rehearse `use-feedback-sync.ts` / `video-player.tsx` 계약 이식. 브라우저 컴포넌트라 단위테스트 대신 타입체크 + Task 5 수동검증.

- [ ] **Step 1: 비디오 플레이어 구현 (WebM duration 보정 포함)**

`web/components/features/interview/report/segment-video-player.tsx`:

```tsx
"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export interface SegmentVideoPlayerHandle {
  seekTo: (ms: number) => void;
  getCurrentTimeMs: () => number;
  getDurationMs: () => number;
}

interface Props {
  src: string;
  className?: string;
}

// WebM(MediaRecorder) duration=Infinity 보정: 메타 로드 시 강제 seek으로 실제 길이 확정.
export const SegmentVideoPlayer = forwardRef<SegmentVideoPlayerHandle, Props>(
  function SegmentVideoPlayer({ src, className }, ref) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [fixedDuration, setFixedDuration] = useState(false);

    useImperativeHandle(ref, () => ({
      seekTo: (ms: number) => {
        if (videoRef.current) videoRef.current.currentTime = ms / 1000;
      },
      getCurrentTimeMs: () => (videoRef.current ? videoRef.current.currentTime * 1000 : 0),
      getDurationMs: () =>
        videoRef.current && isFinite(videoRef.current.duration)
          ? videoRef.current.duration * 1000
          : 0,
    }));

    const handleLoadedMetadata = () => {
      const v = videoRef.current;
      if (!v) return;
      if (!isFinite(v.duration) && !fixedDuration) {
        // Infinity → 끝으로 점프해 duration 확정 후 복귀
        const onSeeked = () => {
          v.currentTime = 0;
          setFixedDuration(true);
          v.removeEventListener("seeked", onSeeked);
        };
        v.addEventListener("seeked", onSeeked);
        v.currentTime = 1e101;
      }
    };

    return (
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        className={className ?? "w-full rounded-xl border bg-black"}
      />
    );
  },
);
```

- [ ] **Step 2: 동기화 훅 구현**

`web/hooks/interview/use-segment-sync.ts`:

```ts
"use client";

import { useEffect, useState, type RefObject } from "react";
import type { SegmentVideoPlayerHandle } from "@/components/features/interview/report/segment-video-player";
import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

export function useSegmentSync(
  videoRef: RefObject<SegmentVideoPlayerHandle | null>,
  segments: AnswerSegment[],
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const ms = v.getCurrentTimeMs();
      setCurrentTimeMs(ms);
      const d = v.getDurationMs();
      if (d > 0) setDurationMs(d);
      const active = segments.find((s) => ms >= s.startMs && ms < s.endMs);
      setActiveId(active?.id ?? null);
    }, 200);
    return () => clearInterval(interval);
  }, [videoRef, segments]);

  const seekTo = (ms: number) => videoRef.current?.seekTo(ms);

  return { activeId, currentTimeMs, durationMs, seekTo };
}
```

- [ ] **Step 3: 타입체크**

Run: `cd web && npx tsc --noEmit -p tsconfig.json`
Expected: 두 파일 관련 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add web/hooks/interview/use-segment-sync.ts web/components/features/interview/report/segment-video-player.tsx
git commit -m "feat(interview): 리포트 비디오 플레이어(imperative seek) + 구간 동기화 훅"
```

---

## Task 4: 타임라인 바 + 스크립트 패널

**Files:**
- Create: `web/components/features/interview/report/segment-timeline-bar.tsx`
- Create: `web/components/features/interview/report/answer-script-panel.tsx`

- [ ] **Step 1: 타임라인 바 구현**

`web/components/features/interview/report/segment-timeline-bar.tsx`:

```tsx
"use client";

import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

interface Props {
  segments: AnswerSegment[];
  durationMs: number;
  currentTimeMs: number;
  activeId: string | null;
  onSeek: (ms: number) => void;
}

export function SegmentTimelineBar({ segments, durationMs, currentTimeMs, activeId, onSeek }: Props) {
  if (durationMs <= 0) return null;
  const indicator = Math.min((currentTimeMs / durationMs) * 100, 100);

  return (
    <div className="relative mt-3 h-8 w-full overflow-hidden rounded-lg bg-muted">
      {segments.map((s) => {
        const left = (s.startMs / durationMs) * 100;
        const width = ((s.endMs - s.startMs) / durationMs) * 100;
        const isActive = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSeek(s.startMs)}
            title={`${Math.round(s.startMs / 1000)}s`}
            className={`absolute top-1 bottom-1 rounded-md bg-primary/70 transition hover:bg-primary ${
              isActive ? "ring-2 ring-primary ring-offset-1" : ""
            }`}
            style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
          />
        );
      })}
      <div
        className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-foreground"
        style={{ left: `${indicator}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 2: 스크립트 패널 구현**

`web/components/features/interview/report/answer-script-panel.tsx`:

```tsx
"use client";

import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

export interface SegmentFeedback {
  improvements?: string[];
}

interface Props {
  segments: AnswerSegment[];
  activeId: string | null;
  // exchangeIndex(1-base) → 피드백 (report_payload.questionFindings 순서 기반)
  feedbackByOrder?: Record<number, SegmentFeedback>;
  onSeek: (ms: number) => void;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function AnswerScriptPanel({ segments, activeId, feedbackByOrder, onSeek }: Props) {
  if (segments.length === 0) {
    return <p className="text-sm text-muted-foreground">표시할 답변 구간이 없습니다.</p>;
  }
  return (
    <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
      {segments.map((s, i) => {
        const fb = feedbackByOrder?.[i + 1];
        const isActive = s.id === activeId;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSeek(s.startMs)}
              className={`w-full rounded-xl border p-3 text-left transition hover:border-primary ${
                isActive ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Q{i + 1} · {fmt(s.startMs)}
              </p>
              {s.question ? <p className="mt-1 text-sm font-medium">{s.question}</p> : null}
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.answer}</p>
              {fb?.improvements && fb.improvements.length > 0 ? (
                <p className="mt-2 text-xs text-foreground">개선: {fb.improvements[0]}</p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: 타입체크**

Run: `cd web && npx tsc --noEmit -p tsconfig.json`
Expected: 두 파일 관련 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add web/components/features/interview/report/segment-timeline-bar.tsx web/components/features/interview/report/answer-script-panel.tsx
git commit -m "feat(interview): 답변 구간 타임라인 바 + Q&A 스크립트 패널"
```

---

## Task 5: 2분할 섹션 조합 + 리포트 페이지 연결

**Files:**
- Create: `web/components/features/interview/report/interview-recording-section.tsx`
- Modify: `web/app/interview/result/page.tsx`

- [ ] **Step 1: 2분할 섹션 컴포넌트**

`web/components/features/interview/report/interview-recording-section.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { SegmentVideoPlayer, type SegmentVideoPlayerHandle } from "./segment-video-player";
import { SegmentTimelineBar } from "./segment-timeline-bar";
import { AnswerScriptPanel, type SegmentFeedback } from "./answer-script-panel";
import { useSegmentSync } from "@/hooks/interview/use-segment-sync";
import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

interface Props {
  recordingUrl: string;
  segments: AnswerSegment[];
  feedbackByOrder?: Record<number, SegmentFeedback>;
}

export function InterviewRecordingSection({ recordingUrl, segments, feedbackByOrder }: Props) {
  const videoRef = useRef<SegmentVideoPlayerHandle | null>(null);
  const { activeId, currentTimeMs, durationMs, seekTo } = useSegmentSync(videoRef, segments);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <SegmentVideoPlayer ref={videoRef} src={recordingUrl} />
        <SegmentTimelineBar
          segments={segments}
          durationMs={durationMs}
          currentTimeMs={currentTimeMs}
          activeId={activeId}
          onSeek={seekTo}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          답변/타임라인을 클릭하면 영상이 해당 구간으로 이동합니다.
        </p>
      </div>
      <AnswerScriptPanel
        segments={segments}
        activeId={activeId}
        feedbackByOrder={feedbackByOrder}
        onSeek={seekTo}
      />
    </div>
  );
}
```

- [ ] **Step 2: 리포트 페이지 — segments 상태/페치 + recording 메타 캡처**

`web/app/interview/result/page.tsx`의 기존 recording fetch effect(약 1103–1122)를 durationMs/recordingStartedAt도 잡도록 바꾸고, segments를 별도로 페치한다. 컴포넌트 본문(다른 useState 영역)에 추가:

```ts
  const [segments, setSegments] = useState<import("@/lib/interview/report/answer-segments").AnswerSegment[]>([]);
```

기존 recording effect 내부에서 `setRecordingUrl(json.data.url)` 직후, 같은 응답의 메타로 segments 페치를 트리거(또는 별도 effect). 별도 effect 추가:

```ts
  useEffect(() => {
    if (!resolvedSessionId || !recordingUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const [segRes, recRes] = await Promise.all([
          fetch(`/api/interview/sessions/${resolvedSessionId}/segments`, { cache: "no-store" }),
          fetch(`/api/interview/sessions/${resolvedSessionId}/recording`, { cache: "no-store" }),
        ]);
        const segJson = await segRes.json();
        const recJson = await recRes.json();
        if (cancelled || !segJson?.success || !recJson?.success || !recJson.data) return;
        const { buildAnswerSegments } = await import("@/lib/interview/report/answer-segments");
        const durationMs = Number(recJson.data.durationMs) || 0;
        const anchorIso = segJson.data.anchorIso ?? recJson.data.recordingStartedAt ?? null;
        if (!anchorIso) return;
        setSegments(buildAnswerSegments(segJson.data.turns, anchorIso, durationMs));
      } catch {
        /* 구간 없으면 통영상만 표시 */
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedSessionId, recordingUrl]);
```

- [ ] **Step 3: 기존 `<video>` 블록 교체**

`result/page.tsx`의 `id="recording"` `DocumentSection` 내부(기존 `<video>` + 캡션, 약 1698–1708)를 교체:

```tsx
{recordingUrl && (
  <DocumentSection index="00" id="recording" title="면접 영상">
    {segments.length > 0 ? (
      <InterviewRecordingSection
        recordingUrl={recordingUrl}
        segments={segments}
        feedbackByOrder={recordingFeedbackByOrder}
      />
    ) : (
      <video src={recordingUrl} controls playsInline className="w-full rounded-xl border bg-black" />
    )}
  </DocumentSection>
)}
```

상단 import 추가:
```ts
import { InterviewRecordingSection } from "@/components/features/interview/report/interview-recording-section";
```

`recordingFeedbackByOrder`는 기존 리포트 데이터의 `questionFindings`(있으면)에서 1-base 순서 맵으로 파생. 컴포넌트 본문에 추가(이미 있는 report view 데이터 변수명에 맞춰 연결 — 없으면 `{}`):
```ts
  const recordingFeedbackByOrder = useMemo(() => {
    const findings = sessionDetail?.report_view?.questionFindings ?? [];
    const map: Record<number, { improvements?: string[] }> = {};
    findings.forEach((f, i) => { map[i + 1] = { improvements: f.improvements }; });
    return map;
  }, [sessionDetail]);
```
(`sessionDetail?.report_view?.questionFindings` 경로는 실제 SessionDetail/SessionReportView 필드명에 맞춰 확인 후 사용.)

- [ ] **Step 4: 타입체크**

Run: `cd web && npx tsc --noEmit -p tsconfig.json`
Expected: result/page.tsx 및 신규 컴포넌트 관련 에러 없음.

- [ ] **Step 5: 수동 검증 (사용자 환경: dev server + 녹화된 세션 필요)**

```bash
cd web && npm run dev
```
1. 녹화된 세션 결과 페이지(`/interview/result?id={sessionId}`) 열기.
2. "면접 영상" 섹션이 2분할(좌 영상+타임라인 / 우 Q&A·STT)로 표시되는지.
3. 우측 답변 클릭 → 영상이 해당 구간으로 점프하는지(seek). 타임라인 막대 클릭도 동일.
4. 재생 중 현재 구간이 우측/타임라인에서 하이라이트되는지(200ms 폴링).
5. turns/녹화 없는 세션 → 통영상 폴백 또는 섹션 미표시(에러 없음).

Expected: 클릭 점프 + active 하이라이트 동작. (offset은 created_at 기반이라 ±persist 지연 — 구간 시작 근처로 점프하면 정상.)

- [ ] **Step 6: 커밋**

```bash
git add web/components/features/interview/report/interview-recording-section.tsx web/app/interview/result/page.tsx
git commit -m "feat(interview): 리포트 면접영상 2분할(타임라인+Q&A 스크립트 점프)"
```

---

## Self-Review

**1. Spec coverage (Plan ① 부분):** 좌측 영상+타임라인(Task 3,4,5) · 우측 Q&A+STT 클릭 점프(Task 4,5) · 구간 offset(Task 1, created_at 기반) · 기존 피드백 연결(Task 4,5 questionFindings) · seek/sync rehearse 패턴(Task 3). 분석/오버레이/캘리브레이션은 의도적 범위 밖(Plan ②③).

**2. Placeholder scan:** TBD/TODO 없음. 모든 코드 스텝 실제 코드 포함. 브라우저/통합은 명시 수동검증.

**3. Type consistency:** `RawTurn`/`AnswerSegment`(Task1) ↔ 라우트 응답 매핑(Task2) ↔ 훅/컴포넌트 props(Task3,4,5) 일치. `SegmentVideoPlayerHandle`(Task3) ↔ useSegmentSync RefObject(Task3) ↔ section useRef(Task5) 일치. `SegmentFeedback`(Task4) ↔ feedbackByOrder(Task4,5) 일치.

**4. 실행자 확인 항목:** ① `getInterviewRouteUserId()` 무인자 + params 동기형(기존 라우트와 일치). ② `sessionDetail?.report_view?.questionFindings` 실제 필드 경로 확인 후 `recordingFeedbackByOrder` 연결(없으면 `{}` 폴백). ③ result/page.tsx 앵커는 라인 아닌 코드 심볼(`recordingUrl` effect, `id="recording"` DocumentSection)로 탐색. ④ offset은 `created_at` 기반(turns.started_at NULL) — 정확도 근사, 네비게이션엔 충분.
