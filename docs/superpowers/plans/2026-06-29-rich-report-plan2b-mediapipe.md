# 리치 리포트 Plan ②b — 시선/표정 분석 (MediaPipe) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** 셋업에서 얼굴 캘리브레이션(정면=baseline)을 받고, 면접 중 브라우저 MediaPipe로 시선·머리자세·표정을 5Hz 시계열로 캡처해 저장한다. 서버 워커가 시선이탈 구간·표정 분포를 집계하고, 그 집계 숫자 + 답변 텍스트를 Gemini(기존 Vertex, 텍스트)에 넣어 **비언어 자연어 코멘트(nonverbalSummary)**를 만들어 리포트에 표시한다. 면접 중에는 분석 UI를 노출하지 않는다.

**Architecture:** MediaPipe(`@mediapipe/tasks-vision@0.10.35`)는 **브라우저에서만** 실행(서버 무관). 에셋(WASM+`.task`)은 `web/public/mediapipe/`에 자가호스팅. 시선·머리자세·표정 도출과 이탈 판정은 **순수 함수**(단위테스트). 비언어 분석은 **옵션ㄴ 확정**: 영상 미전송, MediaPipe 집계 숫자 + 답변 텍스트를 Gemini에 → 자연어 코멘트. **신규 키/서비스 0, GCS 0.** 무점수.

**Tech Stack:** Next.js(web), `@mediapipe/tasks-vision@0.10.35`, node:test, FastAPI(기존 `analyze_interview` Gemini 패턴 재사용), Supabase(`interview_recording_signals` 신규), 기존 `interview_eval_signals`.

**검증된 사실(리서치+공식문서):** 둘 다 기본 false → `outputFaceBlendshapes:true`+`outputFacialTransformationMatrixes:true` 필수. blendshape은 categoryName으로 조회(인덱스 하드코딩 금지). 시선 8종 eyeLook*. 행렬 16-float column-major → `R[r][c]=m[c*4+r]`. 정확도 coarse(~2-5°) → "주의 on/off" 수준, 무점수.

---

## File Structure
- Modify `web/package.json` — `@mediapipe/tasks-vision@0.10.35` 의존성.
- Create `web/public/mediapipe/` — WASM 폴더 + `face_landmarker.task`(자가호스팅).
- Modify `web/next.config.mjs` — `/mediapipe/:path*` immutable 캐시 헤더.
- Create `web/lib/interview/face/face-metrics.ts` — 순수: gaze/head-pose/calibrate/attention/expression-label/aggregate/timeseries encode. (테스트 대상)
- Create `web/lib/interview/face/face-metrics.test.ts` — node:test.
- Create `web/hooks/interview/use-face-capture.ts` — MediaPipe 로드 + 프레임 루프(공유 비디오 스트림), baseline/시계열 수집.
- Create `web/components/features/interview/face-calibration-panel.tsx` — 3-pose 캘리브레이션(skippable).
- Modify `web/components/features/interview/interview-device-check.tsx` (또는 셋업 부모) — 캘리브레이션 패널 + 동의 게이트 연결.
- Create `web/app/api/interview/sessions/[id]/signals/route.ts` — 시계열 POST(저장) (소유권).
- Modify `web/app/interview/room/video/page.tsx` — 캡처 시작/정지(공유 스트림) + 종료 시 업로드. 면접 중 UI 미노출.
- Modify `ai-interview/app/db/database.py` — `interview_recording_signals` DDL + 인덱스 + RLS.
- Modify `ai-interview/app/services/llm_gemini.py` — `analyze_nonverbal()` (analyze_interview 클론, 텍스트).
- Modify `ai-interview/app/interview/reporting/agent.py` — `_process_job`에서 시계열 집계 + analyze_nonverbal 호출 → 저장/리포트.
- Modify `ai-interview/app/interview/reporting/document.py` — `_build_default_report_view`에 `nonverbalSummary` 추가.
- Modify `web/app/interview/result/page.tsx` + `web/components/features/interview/report/interview-recording-section.tsx` — nonverbalSummary·이탈 구간 표시.

---

## Task 1: 의존성 + MediaPipe 에셋 자가호스팅 + 캐시 헤더

**Files:** Modify `web/package.json`, `web/next.config.mjs`; Create `web/public/mediapipe/**`

- [ ] **Step 1: 의존성 설치**
Run: `cd web && npm install @mediapipe/tasks-vision@0.10.35`
Expected: dependencies에 정확 핀 추가.

- [ ] **Step 2: 에셋 자가호스팅**
```bash
cd web
mkdir -p public/mediapipe
cp -r node_modules/@mediapipe/tasks-vision/wasm public/mediapipe/wasm
curl -fsSL -o public/mediapipe/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
ls -lh public/mediapipe/face_landmarker.task   # ~3.7MB 확인
ls public/mediapipe/wasm                        # vision_wasm_internal.{js,wasm} 등 확인
```
Expected: `face_landmarker.task`(~3.7MB) + `wasm/` 존재.

- [ ] **Step 3: next.config 캐시 헤더**
`web/next.config.mjs`의 `async headers()` 배열에 `/libs/`·`/workers/` 블록과 동일 형식으로 추가:
```js
      {
        source: "/mediapipe/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
```
(기존 헤더 블록들 옆에 추가. COEP/COOP 불필요 — 싱글스레드 WASM.)

- [ ] **Step 4: 서빙 확인**
Run: `cd web && npx next build` 대신 가볍게: `ls public/mediapipe/wasm/*.wasm` 존재 확인(빌드는 무거워 생략). 정적 서빙은 dev/배포 모두 `/mediapipe/...` 경로로 됨.

- [ ] **Step 5: 커밋** (대용량 바이너리 주의 — `.task`는 ~3.7MB, git에 포함)
```bash
git add web/package.json web/package-lock.json web/next.config.mjs web/public/mediapipe
git commit -m "feat(interview): MediaPipe tasks-vision 의존성 + 에셋 자가호스팅 + 캐시 헤더"
```
> `.task`를 git에 넣기 싫으면 배포 빌드 스텝에서 curl로 받도록 분리 가능(확장 가이드). 데모는 git 포함이 단순.

---

## Task 2: 얼굴 지표 순수 함수 + 테스트

**Files:** Create `web/lib/interview/face/face-metrics.ts` + `web/lib/interview/face/face-metrics.test.ts`

순수 함수만(브라우저 API 없음) — 시선 축·머리 오일러각·캘리브레이션·이탈 판정·표정 라벨·집계.

- [ ] **Step 1: 실패 테스트** (`face-metrics.test.ts`):

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gazeFromBlendshapes, headPoseFromMatrix, calibrateBaseline,
  isLookingAway, expressionLabel, aggregateSamples, type FaceSample,
} from "./face-metrics";

test("gazeFromBlendshapes: looking screen-right is +X", () => {
  const b = { eyeLookInLeft: 0.8, eyeLookOutRight: 0.8, eyeLookOutLeft: 0, eyeLookInRight: 0 };
  const g = gazeFromBlendshapes(b);
  assert.ok(g.gazeX > 0.5);
  assert.equal(g.gazeY, 0);
});

test("headPoseFromMatrix: identity rotation → ~0 angles", () => {
  const I = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; // column-major identity
  const p = headPoseFromMatrix(I)!;
  assert.ok(Math.abs(p.yaw) < 0.01 && Math.abs(p.pitch) < 0.01 && Math.abs(p.roll) < 0.01);
});

test("calibrateBaseline averages frames", () => {
  const base = calibrateBaseline([
    { gazeX: 0.1, gazeY: 0, yaw: 2, pitch: 0 },
    { gazeX: 0.3, gazeY: 0, yaw: 4, pitch: 0 },
  ]);
  assert.equal(base.gazeX0, 0.2);
  assert.equal(base.yaw0, 3);
});

test("isLookingAway: deviation beyond threshold, blink-gated", () => {
  const base = { gazeX0: 0, gazeY0: 0, yaw0: 0, pitch0: 0 };
  assert.equal(isLookingAway({ gazeX: 0.5, gazeY: 0, yaw: 0, pitch: 0, blink: 0 }, base), true);
  assert.equal(isLookingAway({ gazeX: 0.5, gazeY: 0, yaw: 0, pitch: 0, blink: 0.9 }, base), false); // blink suppresses
  assert.equal(isLookingAway({ gazeX: 0.1, gazeY: 0, yaw: 5, pitch: 0, blink: 0 }, base), false);
});

test("expressionLabel maps blendshape combos", () => {
  assert.equal(expressionLabel({ mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }), "여유");
  assert.equal(expressionLabel({ browDownLeft: 0.6, browDownRight: 0.6 }), "긴장");
  assert.equal(expressionLabel({}), "중립");
});

test("aggregateSamples: away ratio + segments + expression histogram", () => {
  const samples: FaceSample[] = [
    { tMs: 0, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, expr: "중립" },
    { tMs: 200, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: true, expr: "긴장" },
    { tMs: 400, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: true, expr: "긴장" },
    { tMs: 600, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, expr: "중립" },
  ];
  const agg = aggregateSamples(samples);
  assert.equal(agg.awayRatio, 0.5);
  assert.deepEqual(agg.awaySegments, [[200, 400]]);
  assert.equal(agg.expressionHistogram["긴장"], 2);
});
```

- [ ] **Step 2: 실패 확인** — package.json scripts에 `"test:interview-face": "tsx --test lib/interview/face/*.test.ts"` 추가 후 `cd web && npm run test:interview-face` → FAIL.

- [ ] **Step 3: 구현** (`face-metrics.ts`) — 리서치 검증 공식 그대로:

```ts
export interface Blendshapes { [name: string]: number | undefined }
export interface Gaze { gazeX: number; gazeY: number; blink: number }
export interface HeadPose { yaw: number; pitch: number; roll: number }
export interface Baseline { gazeX0: number; gazeY0: number; yaw0: number; pitch0: number }
export interface FaceSample { tMs: number; gazeX: number; gazeY: number; yaw: number; pitch: number; away: boolean; expr: string }

const g = (b: Blendshapes, k: string) => b[k] ?? 0;

export function gazeFromBlendshapes(b: Blendshapes): Gaze {
  const gazeX = ((g(b, "eyeLookInLeft") + g(b, "eyeLookOutRight")) - (g(b, "eyeLookOutLeft") + g(b, "eyeLookInRight"))) / 2;
  const gazeY = ((g(b, "eyeLookUpLeft") + g(b, "eyeLookUpRight")) - (g(b, "eyeLookDownLeft") + g(b, "eyeLookDownRight"))) / 2;
  const blink = (g(b, "eyeBlinkLeft") + g(b, "eyeBlinkRight")) / 2;
  return { gazeX, gazeY, blink };
}

// m: column-major Float32Array(16)/number[]; R[r][c] = m[c*4+r]
export function headPoseFromMatrix(m: ArrayLike<number> | null | undefined): HeadPose | null {
  if (!m || m.length < 16) return null;
  const R = (r: number, c: number) => m[c * 4 + r];
  const R00 = R(0,0), R10 = R(1,0), R20 = R(2,0), R21 = R(2,1), R22 = R(2,2), R12 = R(1,2), R11 = R(1,1);
  const sy = Math.hypot(R00, R10);
  let pitch, yaw, roll;
  if (sy > 1e-6) { pitch = Math.atan2(R21, R22); yaw = Math.atan2(-R20, sy); roll = Math.atan2(R10, R00); }
  else { pitch = Math.atan2(-R12, R11); yaw = Math.atan2(-R20, sy); roll = 0; }
  const deg = (r: number) => (r * 180) / Math.PI;
  return { yaw: deg(yaw), pitch: deg(pitch), roll: deg(roll) };
}

export function calibrateBaseline(frames: Array<{ gazeX: number; gazeY: number; yaw: number; pitch: number }>): Baseline {
  const n = Math.max(1, frames.length);
  const avg = (k: "gazeX" | "gazeY" | "yaw" | "pitch") => frames.reduce((s, x) => s + x[k], 0) / n;
  return { gazeX0: avg("gazeX"), gazeY0: avg("gazeY"), yaw0: avg("yaw"), pitch0: avg("pitch") };
}

const TH = { gazeX: 0.30, gazeY: 0.30, yaw: 15, pitch: 12, blink: 0.5 };

export function isLookingAway(cur: { gazeX: number; gazeY: number; yaw: number; pitch: number; blink: number }, base: Baseline): boolean {
  if (cur.blink > TH.blink) return false; // 깜빡임 중엔 판정 보류
  return (
    Math.abs(cur.gazeX - base.gazeX0) > TH.gazeX ||
    Math.abs(cur.gazeY - base.gazeY0) > TH.gazeY ||
    Math.abs(cur.yaw - base.yaw0) > TH.yaw ||
    Math.abs(cur.pitch - base.pitch0) > TH.pitch
  );
}

export function expressionLabel(b: Blendshapes): string {
  const smile = (g(b, "mouthSmileLeft") + g(b, "mouthSmileRight")) / 2;
  const browDown = (g(b, "browDownLeft") + g(b, "browDownRight")) / 2;
  const browUp = g(b, "browInnerUp");
  if (smile > 0.4) return "여유";
  if (browDown > 0.4) return "긴장";
  if (browUp > 0.5) return "당황";
  return "중립";
}

// away 구간 = 연속된 away=true 샘플의 [시작tMs, 끝tMs]
export function aggregateSamples(samples: FaceSample[]) {
  const total = samples.length || 1;
  const awayCount = samples.filter((s) => s.away).length;
  const awaySegments: Array<[number, number]> = [];
  let start: number | null = null;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].away && start === null) start = samples[i].tMs;
    if (!samples[i].away && start !== null) { awaySegments.push([start, samples[i].tMs]); start = null; }
  }
  if (start !== null) awaySegments.push([start, samples[samples.length - 1].tMs]);
  const expressionHistogram: Record<string, number> = {};
  for (const s of samples) expressionHistogram[s.expr] = (expressionHistogram[s.expr] ?? 0) + 1;
  return { awayRatio: awayCount / total, awaySegments, expressionHistogram, sampleCount: samples.length };
}
```

- [ ] **Step 4: 통과 확인** — `cd web && npm run test:interview-face` → 전체 PASS.

- [ ] **Step 5: 커밋**
```bash
git add web/lib/interview/face/face-metrics.ts web/lib/interview/face/face-metrics.test.ts web/package.json
git commit -m "feat(interview): 얼굴 지표 순수 함수(시선/머리자세/캘리브레이션/이탈/표정/집계) + 테스트"
```

---

## Task 3: `interview_recording_signals` DDL (FastAPI)

**Files:** Modify `ai-interview/app/db/database.py`; Test `ai-interview/tests/test_recording_signals_ddl.py`

Slice 1 Task 1 패턴 그대로(상수 + ddl 리스트 + 인덱스 + 기존 RLS DO 블록에 fold). unittest.

- [ ] **Step 1: 실패 테스트** (`tests/test_recording_signals_ddl.py`): stdlib unittest, `from app.db.database import INTERVIEW_RECORDING_SIGNALS_DDL` 임포트 후 컬럼(`session_id, sample_rate_hz, samples, baseline, aggregates`) + FK CASCADE + `UNIQUE(session_id)` 포함 assert. Run `cd ai-interview && uv run python -m unittest tests.test_recording_signals_ddl -v` → FAIL.

- [ ] **Step 2: 상수 + init_db 포함** — `database.py` 모듈레벨:
```python
INTERVIEW_RECORDING_SIGNALS_DDL = """
CREATE TABLE IF NOT EXISTS public.interview_recording_signals (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    sample_rate_hz INT NOT NULL DEFAULT 5,
    samples JSONB NOT NULL DEFAULT '[]'::jsonb,
    baseline JSONB NOT NULL DEFAULT '{}'::jsonb,
    aggregates JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(session_id)
)
"""
```
`init_db()` ddl 리스트에 `INTERVIEW_RECORDING_SIGNALS_DDL` 추가; 인덱스 리스트에 `"CREATE INDEX IF NOT EXISTS idx_recording_signals_session ON public.interview_recording_signals(session_id)"` 추가.

- [ ] **Step 3: RLS** — 기존 auth-guarded DO 블록에 `interview_turns` 정책과 동일 형태로 `interview_recording_signals_owner_select`(EXISTS join, TO authenticated, DROP-then-CREATE) + `ENABLE ROW LEVEL SECURITY` 추가.

- [ ] **Step 4: 통과 확인** — `cd ai-interview && uv run python -m unittest tests.test_recording_signals_ddl -v` → OK.

- [ ] **Step 5: 커밋**
```bash
git add ai-interview/app/db/database.py ai-interview/tests/test_recording_signals_ddl.py
git commit -m "feat(interview): interview_recording_signals 테이블 DDL + RLS"
```

---

## Task 4: MediaPipe 캡처 훅 (브라우저)

**Files:** Create `web/hooks/interview/use-face-capture.ts`

브라우저 전용 — 단위테스트 없음(순수 로직은 Task 2에서 테스트). 타입체크 + Task 8 사용자 카메라 검증.

- [ ] **Step 1: 구현** — MediaPipe 동적 로드(ssr 금지) + 공유 비디오에 5Hz 루프:

```ts
"use client";

import { useCallback, useRef } from "react";
import {
  gazeFromBlendshapes, headPoseFromMatrix, calibrateBaseline, isLookingAway, expressionLabel,
  type Baseline, type FaceSample, type Blendshapes,
} from "@/lib/interview/face/face-metrics";

const SAMPLE_MS = 200; // 5Hz

export function useFaceCapture() {
  const lmRef = useRef<unknown>(null);
  const samplesRef = useRef<FaceSample[]>([]);
  const baselineRef = useRef<Baseline | null>(null);
  const t0Ref = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const ensureLandmarker = useCallback(async () => {
    if (lmRef.current) return lmRef.current;
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    lmRef.current = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    return lmRef.current;
  }, []);

  const readFrame = useCallback((video: HTMLVideoElement) => {
    const lm = lmRef.current as { detectForVideo: (v: HTMLVideoElement, t: number) => any } | null;
    if (!lm) return null;
    const res = lm.detectForVideo(video, performance.now());
    const cats = res.faceBlendshapes?.[0]?.categories ?? [];
    if (cats.length === 0) return null;
    const b: Blendshapes = {};
    for (const c of cats) b[c.categoryName] = c.score;
    const gaze = gazeFromBlendshapes(b);
    const head = headPoseFromMatrix(res.facialTransformationMatrixes?.[0]?.data) ?? { yaw: 0, pitch: 0, roll: 0 };
    return { gaze, head, expr: expressionLabel(b) };
  }, []);

  // 캘리브레이션: video에서 ~1.5초 정면 프레임 평균
  const calibrate = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    await ensureLandmarker();
    const frames: Array<{ gazeX: number; gazeY: number; yaw: number; pitch: number }> = [];
    const end = performance.now() + 1500;
    return new Promise((resolve) => {
      const tick = () => {
        const f = readFrame(video);
        if (f) frames.push({ gazeX: f.gaze.gazeX, gazeY: f.gaze.gazeY, yaw: f.head.yaw, pitch: f.head.pitch });
        if (performance.now() < end) { rafRef.current = requestAnimationFrame(tick); }
        else { if (frames.length >= 5) { baselineRef.current = calibrateBaseline(frames); resolve(true); } else resolve(false); }
      };
      rafRef.current = requestAnimationFrame(tick);
    });
  }, [ensureLandmarker, readFrame]);

  const start = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video || !lmRef.current || !baselineRef.current) return; // 캘리브레이션 없으면 캡처 안 함
    samplesRef.current = [];
    t0Ref.current = performance.now();
    let last = 0;
    const loop = () => {
      const now = performance.now();
      if (now - last >= SAMPLE_MS) {
        last = now;
        const f = readFrame(video);
        if (f && baselineRef.current) {
          const away = isLookingAway({ gazeX: f.gaze.gazeX, gazeY: f.gaze.gazeY, yaw: f.head.yaw, pitch: f.head.pitch, blink: f.gaze.blink }, baselineRef.current);
          samplesRef.current.push({ tMs: Math.round(now - (t0Ref.current ?? now)), gazeX: f.gaze.gazeX, gazeY: f.gaze.gazeY, yaw: f.head.yaw, pitch: f.head.pitch, away, expr: f.expr });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [readFrame]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    return { sampleRateHz: 5, samples: samplesRef.current, baseline: baselineRef.current };
  }, []);

  return { ensureLandmarker, calibrate, start, stop, getBaseline: () => baselineRef.current };
}
```

- [ ] **Step 2: 타입체크** — `cd web && npx tsc --noEmit -p tsconfig.json` → 이 훅 관련 에러 0. (`@mediapipe/tasks-vision` 타입 제공.)

- [ ] **Step 3: 커밋**
```bash
git add web/hooks/interview/use-face-capture.ts
git commit -m "feat(interview): 브라우저 MediaPipe 캡처 훅(캘리브레이션+5Hz 시계열)"
```

---

## Task 5: 셋업 얼굴 캘리브레이션 UI + 동의

**Files:** Create `web/components/features/interview/face-calibration-panel.tsx`; Modify the setup component that owns device-check/start (`web/components/features/interview/interview-device-check.tsx` 또는 셋업 페이지) — 캘리브레이션 패널 + 동의 체크 + 시작 게이트.

- [ ] **Step 1: 캘리브레이션 패널** — 카메라 미리보기(공유 스트림) + SVG 얼굴 가이드 오벌 + 3-step 인디케이터(정면/좌/우) + `aria-live` 상태줄 + **건너뛰기** 버튼. `useFaceCapture().calibrate(video)`로 정면 baseline 확보(좌/우는 추적 확인용 — 각 포즈 ~0.5s 유지 자동확정). 카메라 없음/거부 시 자동 `unavailable` + `onCalibrationChange(status)`. (이모지 없음, lucide `ScanFace`/`Check`/`AlertCircle`, 라임 토큰.)

- [ ] **Step 2: 동의 + 시작 게이트** — 셋업에 미체크 단일 체크박스("영상·음성이 녹화되어 리포트 생성에만 사용됩니다") + 시작 게이트 = `micReady && consent && (calib done | skipped | unavailable)`, 비활성 사유 `role=status`. (Slice 1에서 라이브 페이지 prep에 넣은 고지를 이 셋업 단계로 승격/일원화.)

- [ ] **Step 3: 타입체크** — `cd web && npx tsc --noEmit -p tsconfig.json` → 관련 에러 0.

- [ ] **Step 4: 커밋**
```bash
git add web/components/features/interview/face-calibration-panel.tsx web/components/features/interview/interview-device-check.tsx
git commit -m "feat(interview): 셋업 얼굴 캘리브레이션(3-pose, skippable) + 녹화 동의 게이트"
```

> 실행자: 셋업 컴포넌트의 실제 위치/시작버튼 게이트 로직을 읽고 맞출 것. baseline은 라이브 페이지로 전달돼야 함(스토어 `interview-setup-store` 또는 ref) — Task 6에서 사용.

---

## Task 6: 시계열 업로드 BFF + 라이브 페이지 연결

**Files:** Create `web/app/api/interview/sessions/[id]/signals/route.ts`; Modify `web/app/interview/room/video/page.tsx`

- [ ] **Step 1: 업로드 라우트** — `recording/route.ts` 패턴(소유권 + admin upsert) 미러. POST body `{ sampleRateHz, samples, baseline, aggregates? }` → `interview_recording_signals` upsert(onConflict session_id). `getInterviewRouteUserId()` 무인자, `assertSessionOwner`, 에러키 `error`. samples 크기 가드(예: 길이 20000 초과 거부).

- [ ] **Step 2: 라이브 페이지 연결** — 셋업에서 받은 baseline을 `useFaceCapture`에 주입하고, 면접 시작 effect(`recording.start` 옆)에서 `face.start(sharedVideoStreamVideoEl)`, `completeSession()`에서 `recording.stopAndUpload` 다음에 `const sig = face.stop(); if (sig.samples.length) await fetch('/api/interview/sessions/${sid}/signals', {POST, body: sig})` (Promise.race 타임아웃 동일 패턴). **면접 중 분석 UI 절대 미노출.** 카메라/캘리브레이션 없으면 캡처 스킵(graceful).

> 주의: MediaPipe 캡처는 Slice 1의 공유 비디오 트랙(LocalCameraPreview onStream)을 재사용 — 카메라 3중 취득 금지. `<video>` 엘리먼트가 필요하므로 preview의 video ref 또는 별도 offscreen video에 동일 stream 연결.

- [ ] **Step 3: 타입체크 + 커밋**
```bash
git add web/app/interview/sessions/[id]/signals/route.ts web/app/interview/room/video/page.tsx
git commit -m "feat(interview): 시계열 업로드 라우트 + 라이브 캡처 연결(면접 중 UI 미노출)"
```

---

## Task 7: 워커 집계 + Gemini 비언어 코멘트 + 리포트 표시

**Files:** Modify `ai-interview/app/services/llm_gemini.py`, `ai-interview/app/interview/reporting/agent.py`, `ai-interview/app/interview/reporting/document.py`, `web/app/interview/result/page.tsx`, `web/components/features/interview/report/interview-recording-section.tsx`

- [ ] **Step 1: `analyze_nonverbal()` (llm_gemini.py)** — `analyze_interview` 클론. 입력 = 답변별 텍스트 + 집계 숫자(awayRatio·awaySegments·expressionHistogram). 한국어 프롬프트로 "점수 없이 정성 비언어 코멘트(시선·표정 경향)" 요청, `_generate_report`(response_mime_type=json) + Pydantic validator(`NonverbalSummary{overall: str, perAnswer: list[{index:int, comment:str}]}`) + `_extract_json`. 영상 미전송.

- [ ] **Step 2: 워커 집계 (agent.py `_process_job`)** — 세션의 `interview_recording_signals.samples` 조회(없으면 스킵) → Python으로 `aggregateSamples`와 동등 집계(awayRatio/awaySegments/expressionHistogram) → `interview_eval_signals`에 dimension `eye_contact`/`expression`(무점수, evidence=구간/분포) 저장 + `analyze_nonverbal(...)` 호출 → 결과를 report 문서에 전달.

- [ ] **Step 3: `nonverbalSummary` (document.py)** — `_build_default_report_view` 반환 dict에 `nonverbalSummary: {overall, perAnswer, awayRatio, awaySegments, expressionHistogram}` 키 추가. (UI는 reportView 통째 읽으므로 라우트 변경 불필요.)

- [ ] **Step 4: 리포트 표시 (web)** — `SessionReportView`에 `nonverbalSummary?` 필드 추가 + 어댑터 매핑. `interview-recording-section.tsx`(또는 상세 토글 안)에 비언어 요약(overall 코멘트 + 답변별 시선이탈%·표정경향) 표시. 무점수·정성 문구. 시선이탈 구간은 (Plan③에서) 타임라인 마커로.

- [ ] **Step 5: 타입체크/테스트 + 커밋**
```bash
cd ai-interview && uv run python -m unittest -v 2>&1 | tail -5   # 기존 테스트 무회귀
cd ../web && npx tsc --noEmit -p tsconfig.json
git add ai-interview/app/services/llm_gemini.py ai-interview/app/interview/reporting/agent.py ai-interview/app/interview/reporting/document.py web/app/interview/result/page.tsx web/components/features/interview/report/interview-recording-section.tsx
git commit -m "feat(interview): 시계열 집계 + Gemini 비언어 코멘트(nonverbalSummary) + 리포트 표시"
```

---

## Task 8: 사용자 카메라 검증 (헤드리스 불가)

브라우저 MediaPipe·웹캠은 헤드리스로 완전 검증 불가. 순수 로직(Task 2)·DDL(Task 3)·타입체크는 자동 검증됨. 아래는 **사용자가 로컬에서** 확인:
1. `cd web && npm run dev`, 셋업 진입 → 카메라 허용 → 얼굴 가이드 오벌에 맞추면 정면/좌/우 자동 확정, 건너뛰기 동작.
2. 동의 체크 전 시작 비활성, 체크 후 활성.
3. 면접 진행 — 화면에 분석 오버레이/숫자 **안 보임**(면접 중 미노출), AI 음성/STT 정상.
4. 종료 후 Supabase `interview_recording_signals`에 samples/baseline 저장 확인.
5. 리포트에 비언어 요약(시선이탈 경향·표정) 자연어 코멘트 표시 확인.
6. 카메라 거부 시 → 캘리브레이션 unavailable + 음성으로 면접 진행(캡처 스킵), 리포트엔 비언어 없음(graceful).

---

## Self-Review
**Spec coverage:** MediaPipe 에셋·의존(T1) · 시선/표정/이탈/집계 순수로직(T2) · 시계열 저장 스키마(T3) · 브라우저 캡처(T4) · 셋업 캘리브+동의(T5) · 업로드+라이브 연결(T6) · 워커 집계+Gemini 비언어 코멘트(옵션ㄴ)+리포트(T7). 무점수·면접중 미노출·신규인프라 0·GCS 0.
**Placeholder:** 순수로직·DDL·캡처훅·라우트·Gemini는 코드/패턴 명시. UI/통합은 검증된 패턴+앵커. 브라우저는 명시 사용자검증.
**Type consistency:** `Blendshapes/Gaze/HeadPose/Baseline/FaceSample`(T2) ↔ 캡처훅(T4) ↔ 업로드 body(T6) ↔ 워커 집계(T7). `NonverbalSummary`(T7 백엔드) ↔ `nonverbalSummary`(document/리포트). 카메라 공유 스트림(Slice1 onStream) 재사용 — 3중취득 금지.
**실행자 확인:** ① 셋업 컴포넌트 실제 위치·시작 게이트 ② baseline 전달 경로(store/ref) ③ 라이브 페이지 공유 video 엘리먼트 ④ `@mediapipe/tasks-vision` 타입 ⑤ document.py `_build_default_report_view` 반환 dict 위치 ⑥ Gemini Pydantic validator는 기존 AnalysisReport 패턴 따름.
