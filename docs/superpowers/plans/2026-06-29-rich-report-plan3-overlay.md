# Plan ③ — 리포트 영상 시각 오버레이 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** 리포트 재생 영상 위에 시선이탈 하이라이트·표정/시선 HUD를 시간 동기화로 그리고, 타임라인에 시선이탈 구간을 빨강 마커로 표시한다(면접 중 아님, 리포트에서만).

**Architecture:** 재생 시 추론 없음 — 면접 때 저장한 5Hz 시계열(`interview_recording_signals.samples`)을 영상 `currentTime`에 동기화해 다시 그린다. 투명 `<canvas>`가 `<video>` 위에 `relative` 래퍼로 겹치고, `requestVideoFrameCallback`(미지원 시 rAF) 루프가 현재 시각의 샘플을 찾아 그린다. **저장 샘플엔 랜드마크/박스가 없음**(`{tMs,gazeX,gazeY,yaw,pitch,away,expr}`) → 얼굴 추적 박스가 아니라 **HUD형**(이탈 틴트/배지 + 표정 라벨 + 시선 방향 인디케이터). 타임라인 빨강 마커는 `awaySegments`(이미 nonverbalSummary에 있음) 사용.

**Tech Stack:** Next.js(web), Canvas2D, `requestVideoFrameCallback`, node:test. 신규 인프라 0(저장 시계열 재사용).

**Scope 밖:** 진짜 얼굴 추적 박스(랜드마크 미저장 → capture 스키마 확장 필요, 추후). 면접 중 오버레이(원칙상 미노출).

---

## File Structure
- Create `web/lib/interview/report/overlay-geometry.ts` — 순수: `sampleAtTime`, `letterboxRect`, `awayAtTime`. (테스트 대상)
- Create `web/lib/interview/report/overlay-geometry.test.ts` — node:test.
- Modify `web/app/api/interview/sessions/[id]/signals/route.ts` — GET 추가(소유권 → samples/aggregates/baseline 반환).
- Create `web/components/features/interview/report/replay-overlay.tsx` — canvas 오버레이(rVFC 루프 + 드로잉).
- Modify `web/components/features/interview/report/segment-video-player.tsx` — `samples` prop 시 video를 relative 래퍼로 감싸고 ReplayOverlay 렌더.
- Modify `web/components/features/interview/report/segment-timeline-bar.tsx` — `awaySegments` 빨강 마커 prop.
- Modify `web/components/features/interview/report/interview-recording-section.tsx` — samples/awaySegments prop 받아 플레이어/타임라인에 전달 + 범례.
- Modify `web/app/interview/result/page.tsx` — `/signals` GET fetch → samples/awaySegments 전달.

---

## Task 1: 오버레이 순수 기하 함수 + 테스트

**Files:** Create `web/lib/interview/report/overlay-geometry.ts` + `.test.ts`; Modify `web/package.json`(스크립트).

- [ ] **Step 1: 실패 테스트** `overlay-geometry.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleAtTime, letterboxRect, awayAtTime } from "./overlay-geometry";

const S = [
  { tMs: 0, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, expr: "중립" },
  { tMs: 200, gazeX: 0.4, gazeY: 0, yaw: 20, pitch: 0, away: true, expr: "긴장" },
  { tMs: 400, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, expr: "중립" },
];

test("sampleAtTime returns nearest sample by tMs", () => {
  assert.equal(sampleAtTime(S, 0)?.expr, "중립");
  assert.equal(sampleAtTime(S, 180)?.expr, "긴장");   // nearest 200
  assert.equal(sampleAtTime(S, 9999)?.tMs, 400);      // clamps to last
  assert.equal(sampleAtTime([], 100), null);
});

test("letterboxRect maps object-contain content box", () => {
  // 16:9 video in a 200x200 box → letterboxed: full width 200, height 112.5, offsetY 43.75
  const r = letterboxRect(1280, 720, 200, 200);
  assert.equal(Math.round(r.width), 200);
  assert.equal(Math.round(r.height), 113);
  assert.ok(r.offsetX === 0 && r.offsetY > 0);
});

test("awayAtTime true inside an away segment", () => {
  assert.equal(awayAtTime([[200, 400]], 300), true);
  assert.equal(awayAtTime([[200, 400]], 100), false);
});
```

- [ ] **Step 2: 스크립트 + 실패 확인** — `web/package.json` scripts에 `"test:interview-overlay": "tsx --test lib/interview/report/overlay-geometry.test.ts",` 추가. `cd web && npm run test:interview-overlay` → FAIL(module missing).

- [ ] **Step 3: 구현** `overlay-geometry.ts`:
```ts
import type { FaceSample } from "@/lib/interview/face/face-metrics";

export function sampleAtTime(samples: FaceSample[], tMs: number): FaceSample | null {
  if (samples.length === 0) return null;
  let lo = 0, hi = samples.length - 1;
  if (tMs <= samples[0].tMs) return samples[0];
  if (tMs >= samples[hi].tMs) return samples[hi];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].tMs < tMs) lo = mid + 1;
    else hi = mid;
  }
  const a = samples[lo - 1], b = samples[lo];
  return tMs - a.tMs <= b.tMs - tMs ? a : b;
}

export interface ContentRect { offsetX: number; offsetY: number; width: number; height: number }

export function letterboxRect(natW: number, natH: number, elemW: number, elemH: number): ContentRect {
  if (natW <= 0 || natH <= 0) return { offsetX: 0, offsetY: 0, width: elemW, height: elemH };
  const scale = Math.min(elemW / natW, elemH / natH);
  const width = natW * scale, height = natH * scale;
  return { offsetX: (elemW - width) / 2, offsetY: (elemH - height) / 2, width, height };
}

export function awayAtTime(awaySegments: Array<[number, number]>, tMs: number): boolean {
  return awaySegments.some(([s, e]) => tMs >= s && tMs <= e);
}
```

- [ ] **Step 4: 통과 확인** — `cd web && npm run test:interview-overlay` → 3 pass.
- [ ] **Step 5: 커밋**
```bash
git -C <worktree> add web/lib/interview/report/overlay-geometry.ts web/lib/interview/report/overlay-geometry.test.ts web/package.json
git -C <worktree> commit -m "feat(interview): 리포트 오버레이 기하 순수함수(sampleAtTime/letterbox/away) + 테스트"
```

---

## Task 2: signals GET 라우트 (samples 조회)

**Files:** Modify `web/app/api/interview/sessions/[id]/signals/route.ts` (POST 옆에 GET 추가).

- [ ] **Step 1: GET 추가** — POST와 동일 인증/소유권 패턴(`getInterviewRouteUserId()` 무인자, `assertSessionOwner`, `createAdminSupabaseClient`, params 동기형). 소유권 통과 후 `interview_recording_signals`에서 `samples, aggregates, baseline` 조회:
```ts
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id;
  const userId = await getInterviewRouteUserId();
  if (!userId) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  if (!(await assertSessionOwner(admin, sessionId, userId))) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }
  const { data } = await admin
    .from("interview_recording_signals")
    .select("samples, aggregates, baseline")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!data) return NextResponse.json({ success: true, data: null });
  return NextResponse.json({ success: true, data: { samples: data.samples ?? [], aggregates: data.aggregates ?? {}, baseline: data.baseline ?? {} } });
}
```
(`assertSessionOwner`는 이미 파일에 있으니 재사용. 파일 상단 import에 부족한 것 없는지 확인.)

- [ ] **Step 2: 타입체크** — `cd web && npx tsc --noEmit -p tsconfig.json` → 이 파일 에러 0.
- [ ] **Step 3: 커밋**
```bash
git -C <worktree> add web/app/api/interview/sessions/[id]/signals/route.ts
git -C <worktree> commit -m "feat(interview): signals GET(소유권) — 리포트 오버레이용 시계열 조회"
```

---

## Task 3: ReplayOverlay 컴포넌트 + 플레이어 연결

**Files:** Create `web/components/features/interview/report/replay-overlay.tsx`; Modify `segment-video-player.tsx`.

- [ ] **Step 1: ReplayOverlay** — props `{ videoRef: RefObject<HTMLVideoElement|null>; samples: FaceSample[] }`. 투명 canvas(`absolute inset-0 pointer-events-none`), `requestVideoFrameCallback`(미지원 시 `requestAnimationFrame`) 자기재등록 루프 + `seeked`/`pause`/`resize` 1회 redraw. 매 틱: `t=video.currentTime*1000` → `sampleAtTime(samples,t)`. `letterboxRect(video.videoWidth, video.videoHeight, canvas clientW/H)`로 콘텐츠 박스 계산, canvas는 `devicePixelRatio` 백킹 + `ResizeObserver`. 드로잉(Canvas2D):
  - `sample.away` 면 콘텐츠 박스 테두리 amber(예: `rgba(245,158,11,0.9)`) 4px + 좌상단 배지 "시선 이탈".
  - 표정 라벨 텍스트(우상단, 예: "표정: 긴장").
  - 시선 인디케이터: 콘텐츠 박스 중앙에서 `(gazeX,gazeY)` 비례 오프셋된 점/짧은 화살표(시선 방향 표시).
  - 색상은 인라인 rgba(캔버스라 CSS 변수 불가) — amber/lime/foreground 계열, 이모지 없음.
  - `samples.length===0`이면 아무것도 안 그림.
  정리: 언마운트 시 rVFC/rAF 취소, ResizeObserver disconnect.

- [ ] **Step 2: 플레이어 연결** — `SegmentVideoPlayer`에 optional prop `samples?: FaceSample[]` 추가. samples 있으면 `<video>`를 `<div className="relative">`로 감싸고 그 안에 `<video>` + `<ReplayOverlay videoRef={videoRef} samples={samples} />`. samples 없으면 기존대로 `<video>`만(폴백). imperative handle(seekTo 등) 변경 없음. `videoRef`(내부)를 ReplayOverlay에 그대로 전달.

- [ ] **Step 3: 타입체크** — `cd web && npx tsc --noEmit -p tsconfig.json` → 두 파일 에러 0.
- [ ] **Step 4: 커밋**
```bash
git -C <worktree> add web/components/features/interview/report/replay-overlay.tsx web/components/features/interview/report/segment-video-player.tsx
git -C <worktree> commit -m "feat(interview): 재생 영상 시선/표정/이탈 캔버스 오버레이(시간동기·letterbox)"
```

---

## Task 4: 타임라인 이탈 마커 + 섹션/페이지 배선

**Files:** Modify `segment-timeline-bar.tsx`, `interview-recording-section.tsx`, `web/app/interview/result/page.tsx`.

- [ ] **Step 1: 타임라인 마커** — `SegmentTimelineBar`에 optional prop `awaySegments?: Array<[number,number]>`. 있으면 기존 마커 위에 `awaySegments.map(([s,e]) => ...)` 빨강(예: `bg-red-500/70`) 가는 막대를 `left% = s/duration*100`, `width% = max((e-s)/duration*100, 0.4)`로 절대배치(클릭 시 `onSeek(s)`), 그리고 작은 범례("시선 이탈" 빨강) 한 줄. (구간 길이 0이면 최소폭.)

- [ ] **Step 2: 섹션 배선** — `InterviewRecordingSection` Props에 `faceSamples?: FaceSample[]`, `awaySegments?: Array<[number,number]>` 추가. `<SegmentVideoPlayer ref={videoRef} src={recordingUrl} samples={faceSamples} />`, `<SegmentTimelineBar ... awaySegments={awaySegments} />`. (awaySegments는 prop으로 받되, 없으면 `nonverbalSummary?.awaySegments` 폴백.)

- [ ] **Step 3: 페이지 fetch** — `result/page.tsx`에서 `/api/interview/sessions/${id}/signals` GET(cache:no-store) → `setFaceSamples(json.data.samples)`, `setAwaySegments(json.data.aggregates?.awaySegments ?? [])`. (`/recording`,`/segments`와 동일 패턴, 키 resolvedSessionId.) `InterviewRecordingSection`에 `faceSamples`/`awaySegments` 전달. 없으면(카메라 스킵) 오버레이/마커 자동 미표시.

- [ ] **Step 4: 타입체크** — `cd web && npx tsc --noEmit -p tsconfig.json` → 관련 파일 에러 0.
- [ ] **Step 5: 커밋**
```bash
git -C <worktree> add web/components/features/interview/report/segment-timeline-bar.tsx web/components/features/interview/report/interview-recording-section.tsx web/app/interview/result/page.tsx
git -C <worktree> commit -m "feat(interview): 타임라인 시선이탈 마커 + 오버레이 시계열 배선"
```

---

## Task 5: 사용자 브라우저 검증 (헤드리스 불가)
실제 녹화 세션 + 완료 리포트 필요. 사용자가 로컬에서: 리포트 영상 재생 → ① 시선 이탈 순간 테두리 amber+배지 ② 표정 라벨 변화 ③ 타임라인 빨강 마커 클릭 점프 ④ 카메라 스킵 세션은 오버레이/마커 미표시(폴백) 확인.

---

## Self-Review
- **Spec coverage:** 오버레이(box-less HUD)·이탈 하이라이트·표정 라벨·시선 인디케이터(T3) · 타임라인 마커(T4) · 시계열 조회(T2) · 순수기하+테스트(T1) · 브라우저검증(T5). 재생 시 추론 0, 신규 인프라 0.
- **Placeholder:** 순수/라우트는 코드 명시. 캔버스 드로잉은 데이터·좌표계약 명시 + 디자인 latitude. 브라우저는 명시 사용자검증.
- **Type consistency:** `FaceSample`(face-metrics) ↔ sampleAtTime ↔ ReplayOverlay ↔ 섹션. `awaySegments: [number,number][]`(aggregates/nonverbalSummary) ↔ 타임라인/페이지. `SegmentVideoPlayerHandle` 불변.
- **데이터 한계 명시:** 랜드마크 미저장 → HUD형(박스 아님). 진짜 박스는 capture 스키마 확장(추후).
- **실행자 확인:** signals 라우트의 기존 `assertSessionOwner`/params 타이핑, result/page의 기존 fetch 패턴, SegmentVideoPlayer 내부 videoRef 전달.
