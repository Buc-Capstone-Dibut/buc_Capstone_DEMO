"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Step model ---------------------------------------------------------
type Outcome = "running" | "success" | "failure";

type Step = {
  step: number;          // legacy field kept so any `{ step }` reader still works
  phase: 0 | 1 | 2 | 3 | 4 | 5;
  scanIndex: number;     // record index currently being compared (-1 = none)
  visited: number[];     // record indices already compared
  outcome: Outcome;      // running | success | failure
  matchIndex: number;    // resolved record index on success (-1 otherwise)
  target: string;        // target value for the key
  narrative: string;
  msg: string;           // learning-note line
};

const RECORDS = [
  { id: 1, name: "Alice", age: 24, role: "Admin" },
  { id: 2, name: "Bob", age: 30, role: "User" },
  { id: 3, name: "Charlie", age: 28, role: "Editor" },
];

// Two runnable scenarios: a found target and a missing one, so the failure
// (-1 / None) termination path is demonstrated, not just success.
const SCENARIOS: Record<"success" | "failure", { target: string; matchIndex: number }> = {
  success: { target: "Bob", matchIndex: 1 },
  failure: { target: "Dave", matchIndex: -1 },
};

function buildSteps(scenario: "success" | "failure"): Step[] {
  const { target, matchIndex } = SCENARIOS[scenario];
  const steps: Step[] = [];

  steps.push({
    step: 0, phase: 0, scanIndex: -1, visited: [], outcome: "running",
    matchIndex: -1, target,
    narrative: "'키(Key)'는 레코드를 식별하는 데 쓰이는 특정 속성입니다.",
    msg: "검색 문제 정의 대기 중. 데이터베이스 연결 준비 완료.",
  });
  steps.push({
    step: 1, phase: 1, scanIndex: -1, visited: [], outcome: "running",
    matchIndex: -1, target,
    narrative: "여러 개의 레코드(객체)를 담은 데이터베이스가 있습니다.",
    msg: `[MEMORY_DUMP] 기본 데이터베이스에서 ${RECORDS.length}개의 레코드를 추출했습니다.`,
  });
  steps.push({
    step: 2, phase: 2, scanIndex: -1, visited: [], outcome: "running",
    matchIndex: -1, target,
    narrative: `검색 설정: 키 'name' 이(가) '${target}' 인 레코드를 찾습니다.`,
    msg: `[QUERY_CONFIG] 검색 키 'name', 타겟 값 '${target}' 으로 질의를 구성했습니다.`,
  });

  // Sequential scan — one step per record so the comparison is unambiguous.
  RECORDS.forEach((rec, idx) => {
    const isMatch = idx === matchIndex;
    const visited = RECORDS.slice(0, idx).map((_, i) => i);
    steps.push({
      step: 3, phase: 3, scanIndex: idx, visited, outcome: "running",
      matchIndex: -1, target,
      narrative: `레코드 [${idx}] 의 키 'name' = "${rec.name}" 을(를) 타겟 "${target}" 과 비교합니다.`,
      msg: isMatch
        ? `[MATCH_FOUND] 레코드 #${rec.id} 의 키 "${rec.name}" 이(가) 타겟과 일치합니다.`
        : `[SCAN] 레코드 #${rec.id}: "${rec.name}" != "${target}". 다음 레코드로 이동합니다.`,
    });
    if (isMatch) {
      steps.push({
        step: 4, phase: 4, scanIndex: idx, visited: [...visited, idx],
        outcome: "success", matchIndex: idx, target,
        narrative: "일치! 키가 일치하는 레코드 전체가 반환됩니다.",
        msg: `[RETURN] 일치하는 레코드 객체를 반환합니다. (인덱스 ${idx})`,
      });
    }
  });

  if (matchIndex === -1) {
    // Failure path: the scan exhausted every record and returns -1 / None.
    steps.push({
      step: 5, phase: 5, scanIndex: -1, visited: RECORDS.map((_, i) => i),
      outcome: "failure", matchIndex: -1, target,
      narrative: `모든 레코드를 확인했지만 "${target}" 을(를) 찾지 못했습니다. 검색 실패: -1(None)을 반환합니다.`,
      msg: `[NOT_FOUND] 전체 ${RECORDS.length}개 레코드 탐색 완료. 일치 항목 없음 → -1 / None 반환.`,
    });
  }

  return steps;
}

const INIT_LOG = "> 시스템 초기화: 검색 문제 정의 대기 중... Step을 눌러 시작하세요.";

export function useProblemKeySim() {
  const [scenario, setScenario] = useState<"success" | "failure">("success");
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

  // `pop` switches the runnable scenario (success ⇄ failure) and rewinds.
  const toggleScenario = useCallback(() => {
    setScenario((s) => (s === "success" ? "failure" : "success"));
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: steps[stepIdx] ?? null,
      logs,
      handlers: {
        push: nextStep,      // ▶ / Step
        clear: reset,        // Reset
        pop: toggleScenario, // 성공/실패 시나리오 전환
      },
      currentStep: stepIdx,
      maxSteps: steps.length,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

export function ProblemKeyVisualizer({ data }: { data: Step | { step: number } | null }) {
  if (!data) return null;
  // Backwards-safe: tolerate an old `{ step }`-only payload.
  const s: Step =
    "phase" in data
      ? (data as Step)
      : {
          step: (data as { step: number }).step ?? 0,
          phase: Math.min(4, (data as { step: number }).step ?? 0) as Step["phase"],
          scanIndex: -1, visited: [], outcome: "running", matchIndex: -1,
          target: "Bob", narrative: "", msg: "",
        };

  const { phase, scanIndex, visited, outcome, matchIndex, target, narrative } = s;
  const isFailure = outcome === "failure";

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

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono px-4 md:px-8 gap-8 rounded-xl py-8">
      <CyberGrid />

      {/* Narrative Info Header */}
      <motion.div
        className="w-full max-w-5xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-[0_0_30px_hsla(var(--primary),0.05)]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          className={`h-2 w-2 rounded-full animate-pulse ${
            outcome === "success" ? "bg-emerald-500" : isFailure ? "bg-destructive" : "bg-purple-500"
          }`}
        />
        <p className="text-sm font-medium tracking-wide">{narrative}</p>
      </motion.div>

      <div className="w-full max-w-5xl flex flex-col gap-8 relative items-center z-10">
        {/* Query Configuration Panel */}
        <div className="w-full bg-card/90 backdrop-blur-md rounded-2xl p-6 border border-border shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold flex-1 text-center">
              Application Search Query
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 relative z-10">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded">
                Search Key (Property)
              </span>
              <div
                className={`px-6 py-3 rounded-lg font-black text-lg border-2 transition-all duration-300 shadow-inner ${
                  phase >= 2
                    ? "bg-cyan-500/10 border-cyan-500 text-cyan-500 shadow-[0_0_15px_hsla(var(--cyan-500),0.3)]"
                    : "bg-card border-border text-foreground"
                }`}
              >
                {'"name"'}
              </div>
            </div>

            <div className="text-2xl font-black text-muted-foreground/50 hidden md:block mt-8">=</div>
            <div className="text-2xl font-black text-muted-foreground/50 md:hidden rotate-90">=</div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded">
                Target Value
              </span>
              <motion.div
                key={target}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`px-6 py-3 rounded-lg font-black text-lg border-2 transition-all duration-300 shadow-inner ${
                  phase >= 2
                    ? "bg-purple-500/10 border-purple-500 text-purple-500 shadow-[0_0_15px_hsla(var(--purple-500),0.3)]"
                    : "bg-card border-border text-foreground"
                }`}
              >
                {`"${target}"`}
              </motion.div>
            </div>

            <AnimatePresence>
              {phase >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 flex flex-col items-center"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      outcome === "success"
                        ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_hsla(var(--emerald-500),0.4)]"
                        : isFailure
                        ? "bg-destructive/20 border-destructive shadow-[0_0_20px_hsla(var(--destructive),0.4)]"
                        : "bg-cyan-500/20 border-cyan-500 shadow-[0_0_20px_hsla(var(--cyan-500),0.4)]"
                    }`}
                  >
                    {outcome === "success" ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : isFailure ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-destructive"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-cyan-500"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-black mt-2 uppercase tracking-widest ${
                      outcome === "success" ? "text-emerald-500" : isFailure ? "text-destructive" : "text-cyan-500"
                    }`}
                  >
                    {outcome === "success" ? "Found" : isFailure ? "Not Found" : "Scanning"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Database Records Container */}
        <div className="w-full bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex flex-col items-center overflow-hidden">
          <div className="absolute top-6 left-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted px-4 py-1 rounded-full border border-border shadow-inner">
            Database Records (Memory)
          </div>

          <div className="w-full min-h-[160px] flex flex-col md:flex-row gap-6 items-center justify-center mt-12 relative z-10">
            {RECORDS.map((rec, index) => {
              const isScanningThis = phase === 3 && scanIndex === index;
              const isVisited = visited.includes(index) && scanIndex !== index;
              const isMatch = index === matchIndex && outcome === "success";
              // On failure, every record is dimmed/struck once the scan is done.
              const isRejected =
                (isVisited && index !== matchIndex) || (isFailure && true);

              return (
                <motion.div
                  key={`rec-${rec.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: phase >= 1 ? 1 : 0,
                    y: phase >= 1 ? 0 : 20,
                    scale: isMatch ? 1.05 : isScanningThis ? 1.03 : 1,
                    filter: isMatch ? "none" : isRejected ? "grayscale(80%) opacity(55%)" : "none",
                  }}
                  transition={{ duration: 0.4, delay: phase === 1 ? index * 0.1 : 0 }}
                  className={`flex-1 w-full max-w-[280px] rounded-xl border-2 p-4 text-xs relative transition-colors duration-300 ${
                    isMatch
                      ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_hsla(var(--emerald-500),0.3)]"
                      : isScanningThis
                      ? "bg-cyan-500/10 border-cyan-500 shadow-[0_0_24px_hsla(var(--cyan-500),0.25)]"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-black tracking-widest">ID: {rec.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest ${
                        isMatch ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      RECORD
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className={`flex justify-between p-2 rounded relative ${phase >= 3 ? "bg-cyan-500/10" : ""}`}>
                      {phase >= 2 && <div className="absolute inset-0 rounded border-2 border-cyan-500/50 pointer-events-none" />}
                      <span className={`font-bold ${phase >= 3 ? "text-cyan-500" : "text-muted-foreground"}`}>name:</span>
                      <span className={`font-mono font-bold ${phase >= 3 ? "text-foreground" : "text-muted-foreground"}`}>{`"${rec.name}"`}</span>
                    </div>
                    <div className="flex justify-between p-2">
                      <span className="text-muted-foreground/60">age:</span>
                      <span className="font-mono text-muted-foreground/60">{rec.age}</span>
                    </div>
                    <div className="flex justify-between p-2">
                      <span className="text-muted-foreground/60">role:</span>
                      <span className="font-mono text-muted-foreground/60">{`"${rec.role}"`}</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isScanningThis && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center text-cyan-500"
                      >
                        <span className="font-bold text-[10px] tracking-widest bg-card border border-cyan-500/40 px-2 py-0.5 rounded shadow-[0_0_10px_currentColor]">
                          COMPARE
                        </span>
                      </motion.div>
                    )}
                    {isMatch && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--background))" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Rejection strike for records ruled out (incl. failure path). */}
                  {isRejected && !isMatch && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/15 border border-destructive/40 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Failure banner: -1 / None termination. */}
          <AnimatePresence>
            {isFailure && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="mt-6 px-6 py-2 bg-destructive/10 border border-destructive/50 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-[0_0_30px_hsla(var(--destructive),0.2)] z-10"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="3"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                <span className="text-sm font-black text-destructive uppercase tracking-widest">검색 실패 · return -1 / None</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
