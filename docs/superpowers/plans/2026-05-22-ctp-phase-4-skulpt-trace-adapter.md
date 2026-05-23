# CTP Phase 4: Skulpt Trace 어댑터 + GenericVisualizer + PoC 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Phase 0에서 검증한 Skulpt Worker 인프라(`trace()`, `captureGlobals`, `BATCH_STEPS` 메시지)를 시각화 모듈로 연결하는 어댑터를 작성하고, GenericArrayVisualizer가 `step.variables`/`step.events`를 자동 매핑하도록 만들어, 1개 PoC 컨셉(`linear-search`)을 trace 기반으로 동작하게 한다.

**Architecture:** spec §9 + §6.2 패턴 C 채택. 단, D3 결정 존중 — 기존 Step 시나리오 visualizer는 그대로 유지, **trace 기반 모드는 옵션으로 추가**한다. PoC 컨셉만 trace 기반으로 전환.

**Tech Stack:** Skulpt (이미 web/public/libs/) + Web Worker (이미 skulpt.worker.js) + useCTPStore (이미 Phase 0에서 정합) + svg-primitives (Phase 0).

**참조:**
- Spec: [§9 Phase 4](../specs/2026-05-22-ctp-content-pipeline-design.md)
- Phase 0 산출: `web/public/workers/skulpt.worker.js` (이미 trace API + captureGlobals 구현됨)
- 1차 조사 결과: 시뮬레이터 인프라 90% 완성, 어댑터만 부재

---

## File Structure

### 신규 생성 파일
- `web/lib/ctp/skulpt-runner.ts` — Skulpt Worker → VisualStep[] 어댑터
- `web/lib/ctp/skulpt-runner.test.ts` — 단위 테스트 (스텁 Worker 또는 통합 테스트)
- `web/components/features/ctp/playground/visualizers/shared/GenericArrayVisualizer.tsx` — step.variables 자동 매핑 시각화
- `web/components/features/ctp/playground/visualizers/svg-animations/module-01/linear-search-trace.tsx` — PoC: 사용자 코드 → trace → 시각화

### 수정 파일
- `web/components/features/ctp/store/use-ctp-store.ts` — VisualStep 타입에 `variables`/`events`/`stdout` 필드 보강 (이미 있을 수 있음, 확인)
- `web/components/features/ctp/contents/categories/modules/module-01-foundation.tsx` — linear-search를 trace 모드 PoC로 등록 (선택)
- `web/data/ctp/specs/linear-search-trace.json` — PoC spec (신규 또는 기존 linear-search.json 수정)
- `web/package.json` — `test:ctp-skulpt-runner` 스크립트 추가

---

## Task 1: skulpt-runner.ts 어댑터 작성

### Task 1.1: 타입 + Worker 메시지 핸들러

**Files:** `web/lib/ctp/skulpt-runner.ts`

```typescript
"use client";

import type { VisualStep } from "@/components/features/ctp/store/use-ctp-store";

export interface SkulptRunOptions {
  maxSteps?: number;       // 기본 10000 (Skulpt MAX_STEPS과 일치)
  stdin?: string;          // testCase input
  captureSteps?: boolean;  // true: trace 캡처 / false: stdout만 (채점 경로용)
}

export interface SkulptStep {
  line: number;
  variables: Record<string, unknown>;  // captureGlobals 결과
  stdout: string;
  events: Array<{ event_type: string; scope?: string; [key: string]: unknown }>;
}

export interface SkulptRunResult {
  steps: VisualStep[];          // 시각화로 직접 흘러갈 형태
  rawSteps: SkulptStep[];       // 원본 (debugging용)
  stdout: string;
  error: null | {
    code: "TLE" | "OLE" | "RTE" | "WORKER_CRASH";
    message: string;
  };
}

export async function runWithTrace(
  code: string,
  options: SkulptRunOptions = {}
): Promise<SkulptRunResult> {
  const worker = new Worker(`/workers/skulpt.worker.js?v=${Date.now()}`);
  
  return new Promise((resolve) => {
    const rawSteps: SkulptStep[] = [];
    let finalStdout = "";
    
    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({
        steps: [],
        rawSteps,
        stdout: finalStdout,
        error: { code: "WORKER_CRASH", message: "Worker timeout 30s" },
      });
    }, 30_000);
    
    worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === "BATCH_STEPS") {
        // BATCH_STEPS는 분할 전송 가능. 모두 누적.
        for (const s of payload.steps as SkulptStep[]) {
          rawSteps.push(s);
        }
      } else if (type === "RESULT") {
        clearTimeout(timeout);
        finalStdout = payload.stdout ?? "";
        worker.terminate();
        const visualSteps = rawSteps.map(toVisualStep);
        resolve({
          steps: visualSteps,
          rawSteps,
          stdout: finalStdout,
          error: null,
        });
      } else if (type === "ERROR") {
        clearTimeout(timeout);
        worker.terminate();
        resolve({
          steps: rawSteps.map(toVisualStep),
          rawSteps,
          stdout: finalStdout,
          error: {
            code: payload.code ?? "RTE",
            message: payload.message ?? "Unknown error",
          },
        });
      }
    };
    
    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({
        steps: [],
        rawSteps,
        stdout: "",
        error: { code: "WORKER_CRASH", message: e.message },
      });
    };
    
    worker.postMessage({
      type: "RUN_CODE",
      payload: {
        code,
        stdin: options.stdin ?? "",
        maxSteps: options.maxSteps ?? 10000,
        captureSteps: options.captureSteps ?? true,
      },
    });
  });
}

function toVisualStep(s: SkulptStep): VisualStep {
  return {
    description: deriveDescription(s),
    activeLine: s.line,
    data: mapToVisualData(s),  // 자료구조 자동 매핑
    variables: s.variables,
    events: s.events,
    stdout: s.stdout,
  };
}

function deriveDescription(s: SkulptStep): string {
  const latestEvent = s.events?.[s.events.length - 1];
  if (latestEvent?.event_type === "compare") {
    return `Step at line ${s.line}: 비교`;
  }
  if (latestEvent?.event_type === "found") {
    return `Step at line ${s.line}: 발견`;
  }
  return `Step at line ${s.line}`;
}

function mapToVisualData(s: SkulptStep): unknown {
  // step.variables에서 자료구조 추출 → Visualizer가 인식할 수 있는 형태
  const vars = s.variables ?? {};
  const arr = vars.arr ?? vars.nums ?? vars.data ?? vars.array;
  if (Array.isArray(arr)) {
    return { array: arr, pointers: extractPointers(vars), events: s.events };
  }
  return vars;
}

function extractPointers(vars: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  // 알려진 포인터 변수명
  const POINTER_NAMES = ["L", "R", "M", "i", "j", "k", "left", "right", "mid", "low", "high", "current"];
  for (const name of POINTER_NAMES) {
    if (typeof vars[name] === "number") {
      result[name] = vars[name] as number;
    }
  }
  return result;
}
```

Commit:
```
feat(CTP): Phase 4 skulpt-runner.ts 어댑터 작성

Skulpt Worker → VisualStep[] 변환 어댑터. captureSteps=true 시
step별 line/variables/events/stdout을 캡처해 useCTPStore가
사용할 수 있는 형태로 매핑. 30s timeout + WORKER_CRASH 처리.
```

### Task 1.2: 단위 테스트

**Files:** `web/lib/ctp/skulpt-runner.test.ts`

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";

// Worker 모킹 — 실제 Skulpt 실행 대신 메시지 응답 simulator
class MockWorker {
  onmessage: ((e: { data: any }) => void) | null = null;
  postMessage(msg: any) {
    // 비동기 응답 simulator
    setTimeout(() => {
      this.onmessage?.({
        data: {
          type: "BATCH_STEPS",
          payload: {
            steps: [
              {
                line: 1,
                variables: { arr: [1, 2, 3], i: 0 },
                stdout: "",
                events: [{ event_type: "init", scope: "test" }],
              },
            ],
          },
        },
      });
      setTimeout(() => {
        this.onmessage?.({
          data: { type: "RESULT", payload: { stdout: "done" } },
        });
      }, 10);
    }, 10);
  }
  terminate() {}
  onerror: ((e: any) => void) | null = null;
}

// global Worker 대체
(globalThis as any).Worker = MockWorker;

describe("skulpt-runner", () => {
  it("returns visual steps + stdout on success", async () => {
    const { runWithTrace } = await import("./skulpt-runner");
    const result = await runWithTrace("print('hi')");
    assert.equal(result.error, null);
    assert.equal(result.stdout, "done");
    assert.ok(result.steps.length > 0);
    assert.equal(result.rawSteps[0].variables.i, 0);
  });

  it("extracts known pointer variables", async () => {
    const { runWithTrace } = await import("./skulpt-runner");
    const result = await runWithTrace("");
    const data = result.steps[0].data as { pointers: Record<string, number> };
    assert.equal(data.pointers.i, 0);
  });
});
```

Commit:
```
test(CTP): skulpt-runner 단위 테스트 2건 (MockWorker)

성공 케이스(steps + stdout) + 포인터 변수 자동 추출 검증.
```

### Task 1.3: package.json script + 통합 검증

```json
"test:ctp-skulpt-runner": "tsx --test lib/ctp/skulpt-runner.test.ts"
```

```bash
cd web && pnpm test:ctp-skulpt-runner
```
Expected: 2 pass / 0 fail.

빌드 검증:
```bash
cd web && pnpm exec tsc --noEmit 2>&1 | grep "lib/ctp/skulpt-runner"
```
Expected: 0 매치.

---

## Task 2: GenericArrayVisualizer 작성

### Task 2.1: step.variables 자동 매핑 시각화

**Files:** `web/components/features/ctp/playground/visualizers/shared/GenericArrayVisualizer.tsx`

```tsx
"use client";

import { ArrayBox, IndexLabel, PointerArrow, CyberGrid, NeonGlowFilters, colorTokens } from "./svg-primitives";

export interface GenericArrayVisualizerProps {
  data?: {
    array?: unknown[];
    pointers?: Record<string, number>;
    events?: Array<{ event_type: string; scope?: string; [key: string]: unknown }>;
  };
}

const POINTER_COLOR = {
  L: "hsl(var(--primary))",
  R: "hsl(var(--warning, 38 92% 50%))",
  M: "hsl(var(--success, 142 71% 45%))",
  i: "hsl(var(--primary))",
  j: "hsl(var(--accent))",
  k: "hsl(var(--success, 142 71% 45%))",
  left: "hsl(var(--primary))",
  right: "hsl(var(--warning, 38 92% 50%))",
  mid: "hsl(var(--success, 142 71% 45%))",
  current: "hsl(var(--accent))",
};

export function GenericArrayVisualizer({ data }: GenericArrayVisualizerProps) {
  const arr = data?.array ?? [];
  const pointers = data?.pointers ?? {};
  const latestEvent = data?.events?.[data.events.length - 1];
  
  const cellWidth = 70;
  const cellHeight = 60;
  const offsetX = 50;
  const offsetY = 200;
  
  return (
    <svg viewBox={`0 0 ${offsetX * 2 + arr.length * cellWidth} 400`}>
      <CyberGrid width={800} height={400} />
      <NeonGlowFilters />
      
      {/* 배열 박스 */}
      {arr.map((value, i) => {
        const x = offsetX + i * cellWidth;
        const status = deriveStatus(i, pointers, latestEvent);
        return (
          <g key={i}>
            <ArrayBox
              x={x}
              y={offsetY}
              width={cellWidth - 8}
              height={cellHeight}
              value={String(value)}
              status={status}
              showGlow={status === "found" || status === "comparing"}
            />
            <IndexLabel
              x={x + (cellWidth - 8) / 2}
              y={offsetY + cellHeight + 14}
              index={i}
            />
          </g>
        );
      })}
      
      {/* 포인터 화살표 */}
      {Object.entries(pointers).map(([name, idx]) => {
        if (idx < 0 || idx >= arr.length) return null;
        const x = offsetX + idx * cellWidth + (cellWidth - 8) / 2;
        const color = POINTER_COLOR[name as keyof typeof POINTER_COLOR] ?? "hsl(var(--primary))";
        return (
          <PointerArrow
            key={name}
            x={x}
            y={offsetY - 20}
            label={name}
            color={color}
            direction="down"
          />
        );
      })}
    </svg>
  );
}

function deriveStatus(
  idx: number,
  pointers: Record<string, number>,
  event?: { event_type: string; [key: string]: unknown }
): "default" | "active" | "comparing" | "found" | "muted" {
  // found 이벤트 우선
  if (event?.event_type === "found" && (event.index === idx)) return "found";
  // 비교 중 인덱스 강조
  if (pointers.M === idx || pointers.mid === idx) return "comparing";
  // 활성 범위 표시
  const L = pointers.L ?? pointers.left ?? -1;
  const R = pointers.R ?? pointers.right ?? Infinity;
  if (idx < L || idx > R) return "muted";
  // 현재 포인터
  if (pointers.i === idx || pointers.current === idx) return "active";
  return "default";
}
```

Commit:
```
feat(CTP): GenericArrayVisualizer (trace 기반 자동 매핑)

step.variables.array + pointers를 받아 ArrayBox + PointerArrow로
자동 렌더링. 알려진 포인터 변수명(L/R/M/i/j/k/...)을 색상별로 매핑.
event_type=found/compare에 따른 status 자동 분기.
```

### Task 2.2: index.ts에 export 추가

`web/components/features/ctp/playground/visualizers/shared/svg-primitives/index.ts`에는 svg-primitives만 export. `GenericArrayVisualizer`는 별도 위치라 직접 import.

또는 `web/components/features/ctp/playground/visualizers/shared/index.ts` 신규 작성:

```typescript
export { GenericArrayVisualizer } from "./GenericArrayVisualizer";
export type { GenericArrayVisualizerProps } from "./GenericArrayVisualizer";
export * from "./svg-primitives";
```

(이미 svg-primitives 디렉토리에 index.ts 있음 — 부모 shared 디렉토리에 새 index.ts 추가)

Commit:
```
feat(CTP): shared/index.ts 신규 — GenericArrayVisualizer + svg-primitives 통합 export
```

---

## Task 3: PoC — linear-search trace 기반 전환

### Task 3.1: linear-search-trace.tsx 신규

**Files:** `web/components/features/ctp/playground/visualizers/svg-animations/module-01/linear-search-trace.tsx`

기존 linear-search.tsx는 그대로 유지 (Step 시나리오). 새 컨셉 ID로 trace 기반 PoC 추가.

```tsx
"use client";

import { useState, useCallback } from "react";
import { runWithTrace } from "@/lib/ctp/skulpt-runner";
import { GenericArrayVisualizer } from "@/components/features/ctp/playground/visualizers/shared";
import { useCTPStore } from "@/components/features/ctp/store/use-ctp-store";

const STARTER_CODE = `# 선형 검색을 구현하세요
arr = [6, 13, 4, 17, 8]
target = 17

i = 0
while i < len(arr):
    current = arr[i]
    if arr[i] == target:
        # 발견
        break
    i = i + 1
`;

export function useLinearSearchTraceSim() {
  const setSteps = useCTPStore((s) => s.setSteps);
  const setPlayState = useCTPStore((s) => s.setPlayState);
  const setCurrentStep = useCTPStore((s) => s.setCurrentStep);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  
  const runSimulation = useCallback(async (code: string) => {
    setRunning(true);
    setLogs([`Skulpt Worker 시작...`]);
    
    const result = await runWithTrace(code, { captureSteps: true });
    
    if (result.error) {
      setLogs((prev) => [...prev, `에러: ${result.error!.code} — ${result.error!.message}`]);
      setRunning(false);
      setPlayState("idle");
      return;
    }
    
    setLogs((prev) => [...prev, `${result.steps.length} step 캡처 완료`]);
    setSteps(result.steps);
    setCurrentStep(0);
    setPlayState("paused");
    setRunning(false);
  }, [setSteps, setCurrentStep, setPlayState]);
  
  const reset = useCallback(() => {
    setLogs([]);
    setSteps([]);
    setCurrentStep(0);
    setPlayState("idle");
  }, [setSteps, setCurrentStep, setPlayState]);
  
  return {
    runSimulation,
    starterCode: STARTER_CODE,
    interactive: {
      visualData: { running, logs },
      logs,
      handlers: { reset, clear: reset },
    },
  };
}

export function LinearSearchTraceVisualizer({ data }: { data: unknown }) {
  // data는 useCTPStore.steps[currentStepIndex]?.data
  return <GenericArrayVisualizer data={data as any} />;
}
```

Commit:
```
feat(CTP): linear-search-trace PoC visualizer (Phase 4)

기존 linear-search.tsx는 Step 시나리오 유지, 새 컨셉 linear-search-trace
신규 추가. runWithTrace로 사용자 Python 코드를 Skulpt Worker에서 실행 →
GenericArrayVisualizer로 자동 시각화. D3 결정의 일부 완화.
```

### Task 3.2: ConceptSpec + 모듈 등록

**Files:** 
- `web/data/ctp/specs/linear-search-trace.json` (신규)
- `web/components/features/ctp/contents/categories/modules/module-01-foundation.tsx` (linear-search-trace 컨셉 추가)
- `web/lib/ctp-curriculum.ts` (subConcept 추가)

ConceptSpec:
- id: `linear-search-trace`
- moduleId: `module-01-foundation`
- conceptId: `search-algorithms`
- title: "03-2.1 선형 검색 (코드 실행)"
- simulation.mode: `"code"` ← Phase 4의 핵심 차이
- simulation.domain: `"array"`
- simulation.initialState: `{ starter: "<위 STARTER_CODE>" }`
- simulation.storyboard: [] (trace 기반이라 storyboard 필요 없음)
- visualizer.type: `"array"`
- content.story: linear-search와 비슷하나 "직접 코드 실행" 강조
- content.features 4개

Steps:
1. linear-search-trace.json 작성
2. module-01-foundation.tsx에 import + 등록 (search-algorithms concept 안)
3. ctp-curriculum.ts에 subConcept 추가
4. ctp-verify G1-G7 PASS 확인
5. 빌드 검증

Commit:
```
feat(CTP): linear-search-trace ConceptSpec + 모듈 등록

PoC 컨셉 정식 등록. Phase 1 16 컨셉 외 신규 추가.
```

---

## Task 4: 통합 검증

```bash
cd web && pnpm test:ctp-skulpt-runner   # 2/2 pass
cd web && pnpm test:ctp-specs           # 3/3 pass 유지
cd web && pnpm test:ctp-problem-bank    # 7/7 pass 유지
cd web && node scripts/ctp-verify.mjs --all  # 17+1=18 PASS
cd web && pnpm exec tsc --noEmit 2>&1 | grep -E "features/ctp|data/ctp|lib/ctp" | head
cd web && pnpm exec next build 2>&1 | tail -3
```

---

## Phase 4 Exit Criteria

- [ ] `web/lib/ctp/skulpt-runner.ts` + 단위 테스트 2건 PASS
- [ ] `GenericArrayVisualizer` 신규 + svg-primitives 사용 (hex 0건)
- [ ] linear-search-trace PoC: 사용자가 Python 코드 수정 → Run → 새 step 시퀀스 + 새 visualizer 반영
- [ ] ctp-verify --all 18/18 PASS (기존 17 + 신규 1)
- [ ] next build compile 성공
- [ ] 기존 테스트 모두 PASS

---

## 예상 commits

| Task | Commit 수 |
|---|---|
| 1.1 skulpt-runner.ts | 1 |
| 1.2 단위 테스트 | 1 |
| 2.1 GenericArrayVisualizer | 1 |
| 2.2 shared/index.ts | 1 |
| 3.1 linear-search-trace visualizer | 1 |
| 3.2 ConceptSpec + 모듈 등록 | 1 |
| 4.x fix (필요 시) | 0-N |

**총 6 + N commits**

---

## D3 결정 영향 및 위험

- D3 (Step 시나리오 전면) 결정 유지: 기존 50 commit으로 만든 16 컨셉 시각화 그대로 보존
- Phase 4는 **신규 PoC 컨셉 1개만 trace 기반**. 기존 컨셉 변경 없음
- 향후 trace 모드가 검증되면 점진적으로 전환 가능 (별도 phase)

## 위험

| 위험 | 완화 |
|---|---|
| Skulpt Worker가 `BATCH_STEPS` 메시지를 실제로 보내는가? | Phase 0 조사에서 확인됨, 단 captureSteps 옵션 필요 |
| useCTPStore.VisualStep 타입이 variables/events 필드를 갖는가? | Read하여 확인, 없으면 추가 |
| 사용자 코드가 무한 루프 → Worker 멈춤 | 30s timeout + maxSteps 10000으로 차단 |
| MockWorker 테스트가 실제 Worker와 다름 | 통합 테스트는 PoC 페이지 수동 검증으로 |
