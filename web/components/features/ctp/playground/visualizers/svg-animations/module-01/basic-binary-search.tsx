"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  PointerArrow,
  IndexLabel,
  colorTokens,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

type Outcome = "running" | "found" | "failure";

// which source line to highlight (index into the rendered code block)
type CodeLine = "init" | "while" | "mid" | "ifEq" | "return" | "elseIf" | "left" | "elseRight" | "fail";

type Step = {
  step: number;     // legacy field
  L: number;        // -1 = not yet initialized
  R: number;
  M: number;        // -1 = no midpoint this step
  outcome: Outcome;
  codeLine: CodeLine;
  narrative: string;
  msg: string;
};

const INIT_LOG = "> 시스템 초기화: 이진 검색 대기 중... Step을 눌러 시작하세요.";

// Two runnable scenarios on the same sorted array.
//  success: target 11 (exists at index 5)
//  failure: target 10 (absent → L crosses R, returns -1)
const SCENARIOS = {
  success: { arr: [1, 3, 5, 7, 9, 11, 13], target: 11 },
  failure: { arr: [1, 3, 5, 7, 9, 11, 13], target: 10 },
} as const;
type ScenarioKey = keyof typeof SCENARIOS;

// Build a fully-resolved step list by actually running binary search and
// emitting a step at every meaningful state transition (probe / compare /
// shrink). This makes the success AND the L>R crossing failure path concrete.
function buildSteps(key: ScenarioKey): Step[] {
  const { arr, target } = SCENARIOS[key];
  const steps: Step[] = [];

  steps.push({
    step: 0, L: -1, R: -1, M: -1, outcome: "running", codeLine: "init",
    narrative: "이진 검색: O(log N). 매 단계 탐색 공간을 절반으로 줄입니다.",
    msg: `[READY] 정렬된 배열에서 타겟 ${target} 검색 준비.`,
  });

  let L = 0;
  let R = arr.length - 1;
  steps.push({
    step: 1, L, R, M: -1, outcome: "running", codeLine: "init",
    narrative: "초기화: Left, Right 경계가 배열 전체를 감쌉니다.",
    msg: `[BOUNDS_INIT] Left=${L}, Right=${R}. 탐색 공간 활성화.`,
  });

  let stepNo = 2;
  while (L <= R) {
    const M = Math.floor((L + R) / 2);
    // probe
    steps.push({
      step: stepNo++, L, R, M, outcome: "running", codeLine: "mid",
      narrative: `중간값 탐색: Mid = floor((${L} + ${R}) / 2) = ${M}. 값은 ${arr[M]}.`,
      msg: `[PROBE] Mid=${M}, Value[${M}]=${arr[M]}.`,
    });

    if (arr[M] === target) {
      steps.push({
        step: stepNo++, L, R, M, outcome: "running", codeLine: "ifEq",
        narrative: `비교: ${arr[M]} == 타겟 ${target}. 일치!`,
        msg: `[EVALUATE] ${arr[M]} === ${target}. 일치 확인.`,
      });
      steps.push({
        step: stepNo++, L, R, M, outcome: "found", codeLine: "return",
        narrative: `인덱스 ${M} 를 반환합니다. 검색 성공.`,
        msg: `[TERMINATE] 인덱스 ${M} 에서 타겟 획득. 검색 종료.`,
      });
      return steps;
    }

    if (arr[M] < target) {
      steps.push({
        step: stepNo++, L, R, M, outcome: "running", codeLine: "elseIf",
        narrative: `비교: ${arr[M]} < ${target}. 정답은 오른쪽 절반에 있습니다.`,
        msg: `[EVALUATE] ${arr[M]} < ${target}. 왼쪽 절반 폐기.`,
      });
      L = M + 1;
      steps.push({
        step: stepNo++, L, R, M: -1, outcome: "running", codeLine: "left",
        narrative: `경계 갱신: Left = Mid + 1 = ${L}. 탐색 공간 축소.`,
        msg: `[BOUNDS_UPDATE] Left=${L}, Right=${R}.`,
      });
    } else {
      steps.push({
        step: stepNo++, L, R, M, outcome: "running", codeLine: "elseRight",
        narrative: `비교: ${arr[M]} > ${target}. 정답은 왼쪽 절반에 있습니다.`,
        msg: `[EVALUATE] ${arr[M]} > ${target}. 오른쪽 절반 폐기.`,
      });
      R = M - 1;
      steps.push({
        step: stepNo++, L, R, M: -1, outcome: "running", codeLine: "elseRight",
        narrative: `경계 갱신: Right = Mid - 1 = ${R}. 탐색 공간 축소.`,
        msg: `[BOUNDS_UPDATE] Left=${L}, Right=${R}.`,
      });
    }
  }

  // Loop exited because L > R → target absent.
  steps.push({
    step: stepNo++, L, R, M: -1, outcome: "failure", codeLine: "fail",
    narrative: `Left(${L}) > Right(${R}): 경계가 교차했습니다. 타겟 ${target} 은(는) 존재하지 않습니다. -1 반환.`,
    msg: `[NOT_FOUND] Left > Right 교차. 탐색 공간 소진 → return -1.`,
  });
  return steps;
}

export function useBasicBinarySearchSim() {
  const [scenario, setScenario] = useState<ScenarioKey>("success");
  const [steps, setSteps] = useState<Step[]>(() => buildSteps("success"));
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([INIT_LOG]);

  useEffect(() => {
    setSteps(buildSteps(scenario));
    setStepIdx(0);
    setLogs([INIT_LOG]);
  }, [scenario]);

  const handleSetStep = useCallback(
    (newStep: number) => {
      if (newStep < 0 || newStep >= steps.length) return;
      setStepIdx(newStep);
      const rebuilt = [INIT_LOG];
      for (let i = 1; i <= newStep; i++) rebuilt.unshift(`[Step ${i}] ${steps[i].msg}`);
      setLogs(rebuilt);
    },
    [steps],
  );

  const nextStep = useCallback(() => {
    setStepIdx((prev) => {
      const next = prev >= steps.length - 1 ? prev : prev + 1;
      if (next !== prev) handleSetStep(next);
      return next;
    });
  }, [steps.length, handleSetStep]);

  const reset = useCallback(() => handleSetStep(0), [handleSetStep]);

  const toggleScenario = useCallback(() => {
    setScenario((s) => (s === "success" ? "failure" : "success"));
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { ...(steps[stepIdx] ?? {}), scenario } as Step & { scenario: ScenarioKey },
      logs,
      handlers: {
        push: nextStep,      // ▶ / Step
        clear: reset,        // Reset
        pop: toggleScenario, // 성공(11) ⇄ 실패(10) 시나리오
      },
      currentStep: stepIdx,
      maxSteps: steps.length,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

export function BasicBinarySearchVisualizer({
  data,
}: {
  data: (Step & { scenario?: ScenarioKey }) | { step: number } | null;
}) {
  if (!data) return null;

  const scenario: ScenarioKey =
    ("scenario" in data && data.scenario) ? data.scenario : "success";
  const arr = SCENARIOS[scenario].arr;
  const target = SCENARIOS[scenario].target;

  // Resolve current state from data (full step) or tolerate a legacy `{ step }`.
  const hasFull = "outcome" in (data as object);
  const L = hasFull ? (data as Step).L : -1;
  const R = hasFull ? (data as Step).R : -1;
  const M = hasFull ? (data as Step).M : -1;
  const outcome: Outcome = hasFull ? (data as Step).outcome : "running";
  const codeLine: CodeLine = hasFull ? (data as Step).codeLine : "init";
  const narrative = hasFull ? (data as Step).narrative : "";

  const isFound = outcome === "found";
  const isFailure = outcome === "failure";

  // SVG geometry
  const svgWidth = 700;
  const svgHeight = 260;
  const boxSize = 64;
  const boxGap = 12;
  const totalWidth = arr.length * boxSize + (arr.length - 1) * boxGap;
  const boxStartX = (svgWidth - totalWidth) / 2;
  const boxY = 100;

  const ln = (k: CodeLine, classes: string) =>
    codeLine === k ? classes : "text-muted-foreground/60 transition-opacity";

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono px-4 md:px-8 gap-8 rounded-xl py-8">
      {/* Narrative Info Header */}
      <motion.div
        className="w-full max-w-5xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-[0_0_30px_hsla(var(--primary),0.05)]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          className={`h-2 w-2 rounded-full animate-pulse ${
            isFound ? "bg-emerald-500" : isFailure ? "bg-destructive" : "bg-cyan-500"
          }`}
        />
        <p className="text-sm font-medium tracking-wide">{narrative}</p>
      </motion.div>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 relative items-stretch z-10">
        {/* Code Execution Panel */}
        <div className="flex-1 min-w-[300px] bg-background/90 backdrop-blur-md rounded-2xl p-6 font-mono text-xs md:text-sm leading-relaxed border border-border shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold flex-1 text-center">
              Execution Context
            </span>
          </div>

          <div className="relative text-base h-full flex flex-col py-4 mt-2">
            <div className="relative z-10 flex flex-col gap-[12px]">
              <div className={`h-[24px] flex items-center ${ln("init", "text-cyan-500 font-bold")}`}>
                <span className="text-purple-400">let</span>&nbsp;left = <span className="text-yellow-300">0</span>, right = arr.<span className="text-emerald-400">length</span> - <span className="text-yellow-300">1</span>;
              </div>
              <div className={`h-[24px] flex items-center ${ln("while", "text-primary font-bold")}`}>
                <span className="text-purple-400">while</span>&nbsp;(left &lt;= right) {"{"}
              </div>
              <div className={`h-[24px] flex items-center pl-4 ${ln("mid", "text-cyan-500 font-bold")}`}>
                <span className="text-purple-400">let</span>&nbsp;mid = <span className="text-yellow-300">Math</span>.<span className="text-blue-400">floor</span>((left + right) / <span className="text-yellow-300">2</span>);
              </div>
              <div className={`h-[24px] flex items-center pl-4 ${ln("ifEq", "text-foreground font-bold")}`}>
                <span className="text-purple-400">if</span>&nbsp;(arr[mid] === target) {"{"}
              </div>
              <div
                className={`h-[24px] flex items-center pl-8 ${
                  codeLine === "return"
                    ? "text-emerald-500 font-bold shadow-[0_0_10px_currentColor] bg-emerald-500/10 rounded px-2 w-max"
                    : "text-muted-foreground/60 transition-opacity"
                }`}
              >
                <span className="text-purple-400">return</span>&nbsp;mid;
              </div>
              <div className={`h-[24px] flex items-center pl-4 ${ln("elseIf", "text-orange-400 font-bold")}`}>
                {"}"} <span className="text-purple-400">else if</span> (arr[mid] &lt; target) {"{"} left = mid + <span className="text-yellow-300">1</span>; {"}"}
              </div>
              <div className={`h-[24px] flex items-center pl-4 ${ln("elseRight", "text-primary font-bold")}`}>
                <span className="text-purple-400">else</span> {"{"} right = mid - <span className="text-yellow-300">1</span>; {"}"}
              </div>
              <div className={`h-[24px] flex items-center ${ln("while", "text-primary font-bold")}`}>{"}"}</div>
              <div
                className={`h-[24px] flex items-center ${
                  codeLine === "fail"
                    ? "text-destructive font-bold shadow-[0_0_10px_currentColor] bg-destructive/10 rounded px-2 w-max"
                    : "text-muted-foreground/60 transition-opacity"
                }`}
              >
                <span className="text-purple-400">return</span>&nbsp;-<span className="text-yellow-300">1</span>;
              </div>
            </div>
          </div>
        </div>

        {/* Array Visualization Panel — SVG-based via svg-primitives */}
        <div className="flex-[2] bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex flex-col items-center justify-center overflow-hidden min-h-[400px]">
          <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
            <div className="px-3 py-1 rounded bg-card/60 border text-[10px] font-black uppercase text-cyan-500 tracking-widest shadow-inner">
              Target : {target}
            </div>
            {M !== -1 && (
              <div
                className={`px-3 py-1 rounded border text-[10px] font-black uppercase tracking-widest transition-colors ${
                  isFound ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50" : "bg-card/60 text-muted-foreground"
                }`}
              >
                Current MID : {arr[M]}
              </div>
            )}
            {isFailure && (
              <div className="px-3 py-1 rounded border text-[10px] font-black uppercase tracking-widest bg-destructive/20 text-destructive border-destructive/50">
                L &gt; R · Not Found
              </div>
            )}
          </div>

          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" preserveAspectRatio="xMidYMid meet" className="relative z-0">
            <CyberGrid width={svgWidth} height={svgHeight} />
            <NeonGlowFilters />

            {arr.map((val, i) => {
              const isInRange = L !== -1 && i >= L && i <= R;
              const isMid = i === M;
              const isEliminated = L !== -1 && !isInRange;
              const isTargetNode = isFound && isMid;

              const status = isTargetNode
                ? "found"
                : isMid
                ? "active"
                : isEliminated
                ? "muted"
                : isInRange
                ? "comparing"
                : "default";

              const x = boxStartX + i * (boxSize + boxGap);

              return (
                <g key={`bs-cell-${i}`} opacity={isEliminated ? 0.5 : 1}>
                  <ArrayBox x={x} y={boxY} width={boxSize} height={boxSize} value={val} status={status} showGlow={isMid || isTargetNode} />
                  <IndexLabel x={x + boxSize / 2} y={boxY + boxSize + 18} index={i} />
                  {isEliminated && (
                    <g stroke="hsl(var(--destructive))" strokeWidth={3} strokeLinecap="round" opacity={0.85}>
                      <line x1={x + 10} y1={boxY + 10} x2={x + boxSize - 10} y2={boxY + boxSize - 10} />
                      <line x1={x + boxSize - 10} y1={boxY + 10} x2={x + 10} y2={boxY + boxSize - 10} />
                    </g>
                  )}
                </g>
              );
            })}

            {/* L / R / M pointers. On failure (L > R) the bounds have crossed,
                so we still anchor them to valid box centers when in range. */}
            {L !== -1 && L === R && (
              <PointerArrow
                x={boxStartX + L * (boxSize + boxGap) + boxSize / 2}
                y={boxY - 12}
                label="L=R"
                color={colorTokens.pointer}
                direction="down"
              />
            )}
            {L !== -1 && L !== R && L < arr.length && (
              <PointerArrow
                x={boxStartX + Math.min(L, arr.length - 1) * (boxSize + boxGap) + boxSize / 2}
                y={boxY - 12}
                label="LEFT"
                color={isFailure ? "hsl(var(--destructive))" : colorTokens.pointer}
                direction="down"
              />
            )}
            {R !== -1 && L !== R && R >= 0 && (
              <PointerArrow
                x={boxStartX + Math.max(R, 0) * (boxSize + boxGap) + boxSize / 2}
                y={boxY - 12}
                label="RIGHT"
                color={isFailure ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                direction="down"
              />
            )}
            {M !== -1 && (
              <PointerArrow
                x={boxStartX + M * (boxSize + boxGap) + boxSize / 2}
                y={boxY + boxSize + 44}
                label="MID"
                color={isFound ? colorTokens.found : colorTokens.active}
                direction="up"
              />
            )}

            {/* Failure ribbon */}
            {isFailure && (
              <g>
                <rect x={svgWidth / 2 - 150} y={svgHeight - 34} width={300} height={26} rx={13} fill="hsl(var(--destructive))" opacity={0.12} stroke="hsl(var(--destructive))" />
                <text x={svgWidth / 2} y={svgHeight - 16} textAnchor="middle" fontSize="13" fontWeight="800" fill="hsl(var(--destructive))">
                  Left &gt; Right — 탐색 실패 (return -1)
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
