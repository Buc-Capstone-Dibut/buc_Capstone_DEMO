"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// "기본(basic)" 선형 검색은 루프마다 2회 검사(범위 검사 + 값 비교)를 수행하고,
// "보초법(sentinel)"은 배열 끝에 타겟을 심어 범위 검사를 제거 → 루프마다 1회 검사.
type Mode = "basic" | "sentinel";

type Step = {
  step: number;        // legacy field
  activeIdx: number;   // -1 = none
  isFound: boolean;
  mode: Mode;
  comparisons: number; // 누적 비교(검사) 횟수
  sentinelHit: boolean;// 보초(가짜 타겟)에 멈췄는가
  narrative: string;
  msg: string;
};

const ARR = [6, 13, 4, 17, 8];
const TARGET = 17;
const MATCH_IDX = 3; // value 17 sits at index 3

const INIT_LOG = "> 시스템 초기화: 선형 검색 대기 중... Step을 눌러 시작하세요.";

function buildSteps(mode: Mode): Step[] {
  const steps: Step[] = [];
  // 보초법은 arr 끝(가상의 index N)에 타겟을 추가한다.
  const checksPerLoop = mode === "basic" ? 2 : 1;

  steps.push({
    step: 0, activeIdx: -1, isFound: false, mode, comparisons: 0, sentinelHit: false,
    narrative:
      mode === "basic"
        ? "기본 선형 검색: 각 원소마다 '범위 안인가?'와 '값이 같은가?' 두 가지를 검사합니다."
        : "보초법(Sentinel): 배열 맨 끝에 타겟을 심어두고 '값이 같은가?' 단 하나만 검사합니다.",
    msg:
      mode === "basic"
        ? "[INIT] 기본 모드. 루프마다 2회 검사(범위 + 값)."
        : "[INIT] 보초법 모드. arr[N] = target 보초를 추가 → 루프마다 1회 검사(값).",
  });

  let comparisons = 0;
  for (let i = 0; i <= MATCH_IDX; i++) {
    comparisons += checksPerLoop;
    const matched = ARR[i] === TARGET;
    steps.push({
      step: i + 1, activeIdx: i, isFound: matched, mode, comparisons, sentinelHit: false,
      narrative: matched
        ? `인덱스 ${i}: 값 ${ARR[i]} == 타겟 ${TARGET}. 일치를 발견했습니다!`
        : `인덱스 ${i}: 값 ${ARR[i]} != 타겟 ${TARGET}. 포인터를 다음으로 이동합니다.`,
      msg: matched
        ? `[PROBE] index ${i}: ${ARR[i]} == ${TARGET}. 일치 확정. (누적 검사 ${comparisons})`
        : mode === "basic"
        ? `[PROBE] index ${i}: 범위 검사 통과, ${ARR[i]} != ${TARGET}. (검사 +2 → ${comparisons})`
        : `[PROBE] index ${i}: ${ARR[i]} != ${TARGET}. (검사 +1 → ${comparisons})`,
    });
  }

  // 반환 단계
  steps.push({
    step: MATCH_IDX + 2, activeIdx: MATCH_IDX, isFound: true, mode, comparisons, sentinelHit: false,
    narrative: `현재 인덱스 ${MATCH_IDX} 를 반환합니다.`,
    msg: `[RETURN] 인덱스 ${MATCH_IDX} 에서 타겟 획득. 위치를 반환합니다. (총 검사 ${comparisons})`,
  });
  steps.push({
    step: MATCH_IDX + 3, activeIdx: MATCH_IDX, isFound: true, mode, comparisons, sentinelHit: false,
    narrative:
      mode === "basic"
        ? `탐색 종료. 총 ${comparisons}회 검사. 최악의 경우 O(N).`
        : `탐색 종료. 총 ${comparisons}회 검사. 보초법으로 루프 검사 비용을 절반으로 줄였습니다.`,
    msg: `[TERMINATE] 검색 종료. 모드=${mode}, 총 검사 ${comparisons}회.`,
  });

  return steps;
}

export function useLinearSearchSim() {
  const [mode, setMode] = useState<Mode>("basic");
  const [steps, setSteps] = useState<Step[]>(() => buildSteps("basic"));
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([INIT_LOG]);

  useEffect(() => {
    setSteps(buildSteps(mode));
    setStepIdx(0);
    setLogs([INIT_LOG]);
  }, [mode]);

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

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "basic" ? "sentinel" : "basic"));
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: steps[stepIdx] ?? null,
      logs,
      handlers: {
        push: nextStep,   // ▶ / Step
        clear: reset,     // Reset
        pop: toggleMode,  // 기본 ⇄ 보초법 토글
      },
      currentStep: stepIdx,
      maxSteps: steps.length,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

export function LinearSearchVisualizer({ data }: { data: Step | { step: number } | null }) {
  if (!data) return null;
  const s: Step =
    "mode" in data
      ? (data as Step)
      : {
          step: (data as { step: number }).step ?? 0,
          activeIdx: ((data as { step: number }).step ?? 0) - 1,
          isFound: ((data as { step: number }).step ?? 0) >= 4,
          mode: "basic", comparisons: 0, sentinelHit: false, narrative: "", msg: "",
        };

  const { activeIdx, isFound, mode, comparisons, narrative } = s;
  const isSentinel = mode === "sentinel";

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
    </div>
  );

  // For sentinel mode we render a ghost sentinel cell after the real array.
  const cells: { val: number; idx: number; isSentinel: boolean }[] = ARR.map((val, i) => ({ val, idx: i, isSentinel: false }));
  if (isSentinel) cells.push({ val: TARGET, idx: ARR.length, isSentinel: true });

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono px-4 md:px-8 gap-8 rounded-xl py-8">
      <CyberGrid />

      {/* Narrative Info Header */}
      <motion.div
        className="w-full max-w-5xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-[0_0_30px_hsla(var(--primary),0.05)]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={`h-2 w-2 rounded-full animate-pulse ${isFound ? "bg-emerald-500" : "bg-blue-500"}`} />
        <p className="text-sm font-medium tracking-wide">{narrative}</p>
      </motion.div>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 relative items-stretch z-10">
        {/* Mode + Counter Panel */}
        <div className="flex-1 min-w-[280px] bg-card/90 backdrop-blur-md rounded-2xl p-6 border border-border shadow-2xl relative overflow-hidden flex flex-col gap-5">
          <div className="flex items-center gap-2 px-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold flex-1 text-center">
              Search Mode
            </span>
          </div>

          {/* Mode toggle indicator (Pop 버튼이 모드를 전환) */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`rounded-xl border-2 p-3 text-center transition-all ${
                !isSentinel
                  ? "border-blue-500 bg-blue-500/10 text-blue-500 shadow-[0_0_18px_hsla(var(--blue-500),0.25)]"
                  : "border-border bg-card text-muted-foreground/70"
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-widest">기본</div>
              <div className="text-[11px] mt-1 font-bold">2 검사 / 루프</div>
            </div>
            <div
              className={`rounded-xl border-2 p-3 text-center transition-all ${
                isSentinel
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-[0_0_18px_hsla(var(--emerald-500),0.25)]"
                  : "border-border bg-card text-muted-foreground/70"
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-widest">보초법</div>
              <div className="text-[11px] mt-1 font-bold">1 검사 / 루프</div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            <span className="font-bold text-foreground">Pop</span> 버튼으로 두 모드를 전환할 수 있습니다.
          </p>

          {/* Comparison counter */}
          <div className="mt-auto rounded-xl border border-border bg-muted/30 p-4 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">누적 비교(검사) 횟수</span>
            <motion.span
              key={comparisons}
              initial={{ scale: 0.7, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-4xl font-black tabular-nums ${isFound ? "text-emerald-500" : "text-blue-500"}`}
            >
              {comparisons}
            </motion.span>
            <span className="text-[11px] text-muted-foreground mt-1">루프당 {isSentinel ? 1 : 2}회</span>
          </div>
        </div>

        {/* Array Visualization Panel */}
        <div className="flex-[2] bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex flex-col items-center justify-center overflow-hidden min-h-[400px]">
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <div className="px-3 py-1 rounded bg-card/60 border text-[10px] font-black uppercase text-blue-500 tracking-widest shadow-inner">
              Target Objective : {TARGET}
            </div>
          </div>

          <div className="relative z-10 w-full flex justify-center gap-2 mt-12 mb-16">
            {cells.map(({ val, idx, isSentinel: isSent }) => {
              const isCurrent = activeIdx === idx;
              let bgColor = "hsl(var(--card)/0.8)";
              let borderColor = "hsl(var(--border))";
              let textColor = "hsl(var(--card-foreground))";
              let shadow = "none";
              let scale = 1;

              if (isCurrent && isFound) {
                bgColor = "hsl(var(--emerald-500)/0.2)";
                borderColor = "hsl(var(--emerald-500))";
                textColor = "hsl(var(--emerald-500))";
                shadow = "0 0 20px hsla(var(--emerald-500), 0.4)";
                scale = 1.1;
              } else if (isCurrent) {
                bgColor = "hsl(var(--blue-500)/0.2)";
                borderColor = "hsl(var(--blue-500))";
                textColor = "hsl(var(--blue-500))";
                shadow = "0 0 20px hsla(var(--blue-500), 0.4)";
                scale = 1.05;
              }

              return (
                <div key={`ls-cell-${idx}`} className="flex flex-col items-center relative min-w-[50px] md:min-w-[64px] lg:min-w-[80px]">
                  <AnimatePresence>
                    {isCurrent && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: -20 }}
                        className={`absolute -top-16 flex flex-col items-center ${isFound ? "text-emerald-500" : "text-blue-500"}`}
                      >
                        <span
                          className={`font-bold text-[10px] tracking-widest bg-card border px-2 py-0.5 rounded shadow-[0_0_10px_currentColor] ${
                            isFound ? "border-emerald-500/30" : "border-blue-500/30"
                          }`}
                        >
                          SCAN PTR
                        </span>
                        <motion.div
                          className={`w-0.5 h-6 mt-1 rounded-full ${isFound ? "bg-emerald-500" : "bg-blue-500"}`}
                          animate={{ scaleY: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          style={{ transformOrigin: "top" }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    animate={{
                      backgroundColor: bgColor,
                      borderColor: borderColor,
                      color: textColor,
                      boxShadow: shadow,
                      scale,
                      opacity: activeIdx > -1 && idx < activeIdx ? 0.4 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center text-xl md:text-2xl lg:text-3xl font-black rounded-lg border-2 relative overflow-hidden ${
                      isSent ? "border-dashed" : ""
                    }`}
                  >
                    {isCurrent && !isFound && (
                      <motion.div
                        className="absolute inset-x-0 h-1 bg-blue-400/60 blur-sm"
                        animate={{ top: ["-20%", "120%"] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                    {isCurrent && isFound && (
                      <motion.div
                        className="absolute inset-0 bg-emerald-400/30"
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                    <span className="relative z-10">{val}</span>
                  </motion.div>

                  <div className="mt-4 text-xs font-mono font-bold text-muted-foreground/80">
                    {isSent ? "보초" : `idx: ${idx}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sentinel explainer chip */}
          <AnimatePresence>
            {isSentinel && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="absolute bottom-6 px-4 py-2 bg-emerald-500/10 border border-emerald-500/40 rounded-lg text-[11px] font-bold text-emerald-500 tracking-wide z-10"
              >
                arr[N] = target — 보초가 있으므로 &quot;배열 끝 도달&quot; 검사가 필요 없습니다.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
