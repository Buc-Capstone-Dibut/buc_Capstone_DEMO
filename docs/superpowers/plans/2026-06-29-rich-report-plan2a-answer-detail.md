# 리치 리포트 Plan ②a — 답변 상세 토글 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 리포트 "면접 영상" 섹션에 **"면접 내용 상세히 보기" 토글**을 추가해, 답변별 전체 transcript + 강점/개선점/모범답안/꼬리질문을 상세히 보여주고 각 항목에서 영상 해당 구간으로 점프할 수 있게 한다.

**Architecture:** 신규 인프라 0. 이미 리포트가 가진 `report_view.questionFindings`(답변별 strengths/improvements/refinedAnswer/followUpQuestion)와 Plan ① 답변 구간(`AnswerSegment`)을 결합해, 기존 `CollapsibleSection`(`web/components/features/resume/collapsible-section.tsx`) 토글 안에 상세 리스트를 렌더한다. Gemini/MediaPipe/DB 변경 없음 — 순수 프론트.

**Tech Stack:** Next.js(web/), node:test, 기존 `CollapsibleSection`(Radix 아님, useState 토글), 기존 디자인 토큰. 이모지 없음.

**전제(검증됨):** `questionFindings` 항목 = `{question, userAnswer, strengths[], improvements[], refinedAnswer, followUpQuestion, evidence[], confidence}` (result/page.tsx `SessionReportView` 115-124). Plan①에서 `recordingFeedbackByOrder`(필터된 findings, 1-base)를 이미 만들어 `InterviewRecordingSection`에 전달 중.

---

## File Structure
- Modify `web/lib/interview/report/answer-segments.ts` — `AnswerFinding`/`AnswerDetail` 타입 + `buildAnswerDetails()` 순수 헬퍼 추가.
- Modify `web/lib/interview/report/answer-segments.test.ts` — `buildAnswerDetails` 테스트 추가.
- Create `web/components/features/interview/report/answer-detail-list.tsx` — 답변별 상세(전문+강점/개선/모범답안/꼬리질문+구간점프).
- Modify `web/components/features/interview/report/answer-script-panel.tsx` — `SegmentFeedback`를 `AnswerFinding`로 통일(개선점 표시 그대로).
- Modify `web/components/features/interview/report/interview-recording-section.tsx` — 2분할 아래 `CollapsibleSection`("면접 내용 상세히 보기") + `AnswerDetailList` 추가, prop `findingsByOrder`.
- Modify `web/app/interview/result/page.tsx` — `recordingFeedbackByOrder`를 full finding 맵으로 확장(strengths/refinedAnswer/followUpQuestion 포함), 섹션에 `findingsByOrder`로 전달.

---

## Task 1: 상세 타입 + 머지 헬퍼 + 테스트

**Files:** Modify `web/lib/interview/report/answer-segments.ts` + `web/lib/interview/report/answer-segments.test.ts`

- [ ] **Step 1: 실패 테스트 추가** — `answer-segments.test.ts` 끝에 추가:

```ts
import { buildAnswerDetails, type AnswerFinding } from "./answer-segments";

test("buildAnswerDetails zips segments with 1-based findings", () => {
  const segs = [
    { id: "a1", exchangeIndex: 1, question: "Q1", answer: "A1", startMs: 0, endMs: 10 },
    { id: "a2", exchangeIndex: 2, question: "Q2", answer: "A2", startMs: 10, endMs: 20 },
  ];
  const findings: Record<number, AnswerFinding> = {
    1: { improvements: ["imp1"], strengths: ["str1"], refinedAnswer: "ref1", followUpQuestion: "fu1" },
  };
  const details = buildAnswerDetails(segs, findings);
  assert.equal(details.length, 2);
  assert.equal(details[0].segment.id, "a1");
  assert.equal(details[0].finding?.refinedAnswer, "ref1");
  assert.equal(details[1].finding, undefined); // no finding[2]
});

test("buildAnswerDetails handles undefined findings map", () => {
  const segs = [{ id: "a1", exchangeIndex: 1, question: "Q", answer: "A", startMs: 0, endMs: 10 }];
  const details = buildAnswerDetails(segs, undefined);
  assert.equal(details.length, 1);
  assert.equal(details[0].finding, undefined);
});
```

- [ ] **Step 2: 실패 확인** — `cd web && npm run test:interview-report` → FAIL (`buildAnswerDetails` 없음).

- [ ] **Step 3: 구현** — `answer-segments.ts` 끝에 추가:

```ts
export interface AnswerFinding {
  strengths?: string[];
  improvements?: string[];
  refinedAnswer?: string | null;
  followUpQuestion?: string | null;
}

export interface AnswerDetail {
  segment: AnswerSegment;
  finding?: AnswerFinding;
}

// 답변 구간(시간순)과 1-base findings 맵을 인덱스로 결합.
export function buildAnswerDetails(
  segments: AnswerSegment[],
  findingsByOrder?: Record<number, AnswerFinding>,
): AnswerDetail[] {
  return segments.map((segment, i) => ({ segment, finding: findingsByOrder?.[i + 1] }));
}
```

- [ ] **Step 4: 통과 확인** — `cd web && npm run test:interview-report` → 전체 PASS.

- [ ] **Step 5: 커밋**
```bash
git add web/lib/interview/report/answer-segments.ts web/lib/interview/report/answer-segments.test.ts
git commit -m "feat(interview): 답변 상세 머지 헬퍼(buildAnswerDetails) + AnswerFinding 타입"
```

---

## Task 2: 답변 상세 리스트 컴포넌트

**Files:** Create `web/components/features/interview/report/answer-detail-list.tsx`

브라우저 표현 컴포넌트 — 단위테스트 없음, 타입체크 + Task 4 브라우저 검증.

- [ ] **Step 1: 구현**

```tsx
"use client";

import type { AnswerDetail } from "@/lib/interview/report/answer-segments";

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

interface Props {
  details: AnswerDetail[];
  onSeek: (ms: number) => void;
}

export function AnswerDetailList({ details, onSeek }: Props) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">상세 내용이 없습니다.</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      {details.map((d, i) => {
        const { segment: s, finding: f } = d;
        return (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Q{i + 1} · {fmt(s.startMs)}
              </p>
              <button
                type="button"
                onClick={() => onSeek(s.startMs)}
                className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition hover:border-primary hover:text-primary"
              >
                영상에서 보기
              </button>
            </div>
            {s.question ? <p className="mt-2 text-sm font-semibold">{s.question}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{s.answer}</p>

            {f?.strengths && f.strengths.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground">강점</p>
                <ul className="mt-1 list-disc pl-5 text-sm leading-6">
                  {f.strengths.map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {f?.improvements && f.improvements.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground">개선점</p>
                <ul className="mt-1 list-disc pl-5 text-sm leading-6">
                  {f.improvements.map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {f?.refinedAnswer ? (
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground">모범 답안 예시</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{f.refinedAnswer}</p>
              </div>
            ) : null}

            {f?.followUpQuestion ? (
              <p className="mt-3 text-sm text-muted-foreground">
                예상 꼬리질문: <span className="text-foreground">{f.followUpQuestion}</span>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크** — `cd web && npx tsc --noEmit -p tsconfig.json` → 이 파일 에러 0.

- [ ] **Step 3: 커밋**
```bash
git add web/components/features/interview/report/answer-detail-list.tsx
git commit -m "feat(interview): 답변 상세 리스트(전문+강점/개선/모범답안/꼬리질문+구간점프)"
```

---

## Task 3: 토글 섹션 연결 + 리포트 findings 확장

**Files:** Modify `answer-script-panel.tsx`, `interview-recording-section.tsx`, `web/app/interview/result/page.tsx`

- [ ] **Step 1: `SegmentFeedback`를 `AnswerFinding`로 통일**

`answer-script-panel.tsx`에서 로컬 `SegmentFeedback` 정의를 제거하고 `AnswerFinding`를 재사용. 상단 import 교체:
```ts
import type { AnswerSegment, AnswerFinding } from "@/lib/interview/report/answer-segments";
```
`export interface SegmentFeedback { improvements?: string[]; }` 줄 삭제, Props의 `feedbackByOrder?: Record<number, SegmentFeedback>` → `feedbackByOrder?: Record<number, AnswerFinding>`. (본문은 `fb?.improvements`만 쓰므로 그대로 동작.) `SegmentFeedback`를 import하던 다른 파일은 Step 2에서 정리.

- [ ] **Step 2: 섹션에 토글 + 상세 리스트 추가**

`interview-recording-section.tsx` 교체:
```tsx
"use client";

import { useRef } from "react";
import { SegmentVideoPlayer, type SegmentVideoPlayerHandle } from "./segment-video-player";
import { SegmentTimelineBar } from "./segment-timeline-bar";
import { AnswerScriptPanel } from "./answer-script-panel";
import { AnswerDetailList } from "./answer-detail-list";
import { useSegmentSync } from "@/hooks/interview/use-segment-sync";
import { buildAnswerDetails, type AnswerSegment, type AnswerFinding } from "@/lib/interview/report/answer-segments";
import { CollapsibleSection } from "@/components/features/resume/collapsible-section";

interface Props {
  recordingUrl: string;
  segments: AnswerSegment[];
  findingsByOrder?: Record<number, AnswerFinding>;
}

export function InterviewRecordingSection({ recordingUrl, segments, findingsByOrder }: Props) {
  const videoRef = useRef<SegmentVideoPlayerHandle | null>(null);
  const { activeId, currentTimeMs, durationMs, seekTo } = useSegmentSync(videoRef, segments);
  const details = buildAnswerDetails(segments, findingsByOrder);

  return (
    <div className="flex flex-col gap-6">
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
          feedbackByOrder={findingsByOrder}
          onSeek={seekTo}
        />
      </div>

      <CollapsibleSection title="면접 내용 상세히 보기" defaultOpen={false}>
        <AnswerDetailList details={details} onSeek={seekTo} />
      </CollapsibleSection>
    </div>
  );
}
```

> `CollapsibleSection`의 실제 props(`title`/`defaultOpen`/`children` 및 badge/action 옵션)를 `web/components/features/resume/collapsible-section.tsx`에서 확인하고 정확히 맞출 것. 시그니처가 다르면(예: `defaultOpen` 없음) 해당 형태로 조정.

- [ ] **Step 3: result/page.tsx — findings 맵 확장 + prop 이름 변경**

기존 `recordingFeedbackByOrder` useMemo를 full finding으로 확장:
```ts
  const recordingFeedbackByOrder = useMemo(() => {
    const findings = (sessionDetail?.report_view?.questionFindings ?? []).filter(
      (f) => String(f?.question || f?.userAnswer || "").trim().length > 0,
    );
    const map: Record<number, { strengths?: string[]; improvements?: string[]; refinedAnswer?: string | null; followUpQuestion?: string | null }> = {};
    findings.forEach((f, i) => {
      map[i + 1] = {
        strengths: f.strengths,
        improvements: f.improvements,
        refinedAnswer: f.refinedAnswer,
        followUpQuestion: f.followUpQuestion,
      };
    });
    return map;
  }, [sessionDetail?.report_view?.questionFindings]);
```
`<InterviewRecordingSection>` 호출에서 `feedbackByOrder={recordingFeedbackByOrder}` → `findingsByOrder={recordingFeedbackByOrder}` 로 변경.

- [ ] **Step 4: 타입체크** — `cd web && npx tsc --noEmit -p tsconfig.json` → 변경 파일 에러 0. (`SessionReportView.questionFindings` 항목에 `strengths/refinedAnswer/followUpQuestion`가 있는지 확인하고 필드명 정확히.)

- [ ] **Step 5: 커밋**
```bash
git add web/components/features/interview/report/answer-script-panel.tsx web/components/features/interview/report/interview-recording-section.tsx web/app/interview/result/page.tsx
git commit -m "feat(interview): '면접 내용 상세히 보기' 토글 섹션 연결 + findings 확장"
```

---

## Task 4: 브라우저 검증(임시 프리뷰) + 정리

**Files:** 임시 `web/app/plan2a-preview/page.tsx` (검증 후 삭제), `web/public/plan2a-sample.mp4`(임시)

- [ ] **Step 1: 임시 프리뷰 라우트 + 샘플영상**

샘플영상: `ffmpeg -f lavfi -i testsrc=duration=120:size=640x360:rate=15 -pix_fmt yuv420p -y web/public/plan2a-sample.mp4 -loglevel error`
`.env` 복사: `cp /Users/junghwan/buc_Capstone_DEMO/web/.env web/.env` (gitignore됨)
`web/app/plan2a-preview/page.tsx`: `InterviewRecordingSection`를 목 segments + 목 `findingsByOrder`(strengths/improvements/refinedAnswer/followUpQuestion 포함) + `recordingUrl="/plan2a-sample.mp4"` 로 렌더.

- [ ] **Step 2: dev server + 검증**

`preview_start "web"` → `/plan2a-preview` 이동 → 스크린샷.
확인: ① 2분할 정상 ② "면접 내용 상세히 보기" 토글 보임, 클릭 시 펼쳐짐 ③ 펼친 상세에 전문+강점+개선+모범답안+꼬리질문 표시 ④ 상세의 "영상에서 보기" 클릭 → `video.currentTime` 점프(preview_eval로 before/after 측정) ⑤ 이모지 없음.

- [ ] **Step 3: 정리 + 커밋**

임시파일 삭제: `rm -f web/app/plan2a-preview/page.tsx web/public/plan2a-sample.mp4 web/.env; rmdir web/app/plan2a-preview 2>/dev/null`. `git status` 클린 확인(임시파일 미추적). preview_stop.
(검증은 코드 변경 없음 — 별도 커밋 불필요. 스크린샷을 사용자에게 보고.)

---

## Self-Review
**Spec coverage:** "오른쪽 디자인 변형 + 토글 상세보기"(Task 2,3) · "plan2 도입"(이 plan) · 기존 인프라/데이터 재사용(questionFindings, CollapsibleSection — 신규 인프라 0) · 구간 점프 연동(onSeek). MediaPipe 시선/표정은 Plan②b(별도, 가이드 §5).
**Placeholder:** 없음(코드 전부 포함). 브라우저는 명시 검증.
**Type consistency:** `AnswerFinding`/`AnswerDetail`/`buildAnswerDetails`(Task1) ↔ AnswerDetailList(Task2) ↔ 섹션 findingsByOrder(Task3) ↔ result/page 맵(Task3) 일치. `SegmentFeedback`→`AnswerFinding` 통일.
**실행자 확인:** ① `CollapsibleSection` 실제 props ② `questionFindings` 항목 필드명(strengths/refinedAnswer/followUpQuestion) ③ result/page 앵커는 코드 심볼로.
