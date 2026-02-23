"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useFlowTracingSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Debugger Initialized.",
    "[SYSTEM] Press Peek to step through the execution flow."
  ]);
  const maxSteps = 9;

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = prev >= maxSteps ? 1 : prev + 1;
      let logMsg = "";
      if (next === 1) logMsg = "Step 1: [INIT] sum = 0";
      if (next === 2) logMsg = "Step 2: [LOOP INIT] i = 1, Check i <= 3 (TRUE)";
      if (next === 3) logMsg = "Step 3: [EXECUTE] sum += i (sum = 1)";
      if (next === 4) logMsg = "Step 4: [LOOP INC] i = 2, Check i <= 3 (TRUE)";
      if (next === 5) logMsg = "Step 5: [EXECUTE] sum += i (sum = 3)";
      if (next === 6) logMsg = "Step 6: [LOOP INC] i = 3, Check i <= 3 (TRUE)";
      if (next === 7) logMsg = "Step 7: [EXECUTE] sum += i (sum = 6)";
      if (next === 8) logMsg = "Step 8: [LOOP INC] i = 4, Check i <= 3 (FALSE), Exit Loop";
      if (next === 9) logMsg = "Step 9: [RETURN] End of execution";
      appendLog(logMsg);
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["[SYSTEM] Debugger memory reset."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step },
      logs,
      handlers: { peek, reset, clear: reset },
    },
  };
}

export function FlowTracingVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;

  const getActiveLine = () => {
    if (step === 1) return 1;
    if (step === 2 || step === 4 || step === 6 || step === 8) return 2;
    if (step === 3 || step === 5 || step === 7) return 3;
    if (step === 9) return 5;
    return 0; // hide highlight
  };

  const getVariableState = () => {
    let sum = "?";
    let i = "?";
    if (step >= 1) sum = "0";
    if (step >= 2) i = "1";
    if (step >= 3) sum = "1";
    if (step >= 4) i = "2";
    if (step >= 5) sum = "3";
    if (step >= 6) i = "3";
    if (step >= 7) sum = "6";
    if (step >= 8) i = "4";
    return { sum, i };
  };

  const vars = getVariableState();
  const activeLine = getActiveLine();

  return (
    <div className="w-full flex flex-col bg-background/40 relative font-mono px-8 gap-6 rounded-xl py-8">
       {/* Background Grid */}
       <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none">
        <pattern id="ft-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="1.5" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#ft-grid)" />
      </svg>

      <div className="w-full max-w-5xl flex gap-8 relative items-stretch z-10">

        {/* Code Editor Panel (Debugger Style) */}
        <div className="flex-[3] bg-[#0d1117]/90 backdrop-blur-md rounded-2xl p-6 font-mono text-sm leading-relaxed border border-border shadow-2xl relative overflow-hidden">
          {/* Editor Header */}
          <div className="flex items-center gap-3 text-muted-foreground mb-6 text-xs font-bold border-b border-border/50 pb-4">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="ml-2 px-2 py-1 bg-muted rounded-md tracking-widest uppercase">algo.js</span>
            {activeLine > 0 && (
              <span className="ml-auto flex items-center gap-2 text-primary font-mono tracking-widest animate-pulse">
                <div className="w-2 h-2 rounded-full bg-primary" />
                EXECUTING LINE {activeLine}
              </span>
            )}
          </div>

          <div className="relative text-base h-[200px]">
            {/* Active Highlight Background */}
            <motion.div
              className="absolute left-[-24px] right-[-24px] h-[36px] bg-primary/10 border-l-[3px] border-primary pointer-events-none z-0"
              initial={{ top: -40, opacity: 0 }}
              animate={{
                top: (activeLine - 1) * 36,
                opacity: step === 0 || activeLine === 0 ? 0 : 1,
                boxShadow: step > 0 && activeLine > 0 ? "0 0 20px hsla(var(--primary), 0.2) inset" : "none"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />

            {/* Code Lines */}
            <div className="h-[36px] flex items-center text-slate-300 relative z-10 w-full px-2">
              <span className="text-slate-600 mr-6 w-4 text-right select-none">1</span>
              <span className="text-pink-400 mr-2">let</span> sum = <span className="text-sky-400 ml-1">0</span>;
            </div>

            <div className="h-[36px] flex items-center text-slate-300 relative z-10 w-full px-2">
              <span className="text-slate-600 mr-6 w-4 text-right select-none">2</span>
              <span className="text-pink-400 mr-2">for</span> (let i = <span className="text-sky-400 mx-1">1</span>; i &lt;= <span className="text-sky-400 mx-1">3</span>; i++) {"{"}

              {/* Variable overlay for Loop Check */}
              <AnimatePresence>
                {[2, 4, 6, 8].includes(step) && (
                  <motion.div
                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute right-4 bg-muted/80 backdrop-blur-sm text-foreground text-xs px-3 py-1.5 rounded-md border border-border shadow-lg flex items-center gap-3 z-20"
                  >
                    <span className="font-mono">i = {vars.i}</span>
                    <span className={`font-black ${step === 8 ? "text-destructive" : "text-emerald-500"}`}>
                      {step === 8 ? "FALSE (Break)" : "TRUE"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-[36px] flex items-center pl-10 text-slate-300 relative z-10 px-2">
              <span className="text-slate-600 absolute left-2 w-4 text-right select-none">3</span>
              sum += i;

              {/* Variable overlay for Math */}
              <AnimatePresence>
                {[3, 5, 7].includes(step) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-4 bg-primary/10 backdrop-blur-sm text-primary font-bold text-xs px-3 py-1.5 rounded-md border border-primary/30 shadow-lg z-20 flex items-center gap-2"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span>sum = sum + {vars.i}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-[36px] flex items-center text-slate-300 relative z-10 px-2">
              <span className="text-slate-600 mr-6 w-4 text-right select-none">4</span>
              {"}"}
            </div>

            <div className="h-[36px] flex items-center text-slate-300 relative z-10 px-2">
              <span className="text-slate-600 mr-6 w-4 text-right select-none">5</span>
              <span className="text-slate-300 mr-2">console</span>.<span className="text-blue-400">log</span>(sum);

              <AnimatePresence>
                {step === 9 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-4 bg-emerald-500/20 text-emerald-400 font-black text-xs px-3 py-1.5 rounded-md border border-emerald-500/30 shadow-lg flex items-center gap-2"
                  >
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Console: 6
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Memory Space Panel */}
        <div className="flex-[2] flex flex-col gap-4">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden flex-1 flex flex-col h-full relative">
             <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

            <div className="bg-muted/50 p-4 border-b border-border/50 flex items-center justify-between relative z-10">
              <span className="font-black text-[10px] tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                Memory State
              </span>
            </div>

            <div className="flex-1 p-6 flex flex-col gap-6 justify-center relative z-10">
              {/* Variable: sum */}
              <div className="relative group">
                <motion.div
                  animate={{
                    borderColor: [3, 5, 7].includes(step) ? "hsl(var(--primary))" : "hsl(var(--border))",
                    boxShadow: [3, 5, 7].includes(step) ? "0 0 20px hsla(var(--primary), 0.2)" : "none"
                  }}
                  className="bg-background/80 backdrop-blur-sm border-2 rounded-xl p-5 relative shadow-sm transition-colors duration-300"
                >
                  <div className="absolute -top-3 left-4 bg-background px-2 text-[10px] font-black tracking-widest uppercase text-primary border border-border rounded-full">var sum</div>
                  <div className="text-5xl font-black text-center text-foreground flex items-center justify-center min-h-[50px] font-mono">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={`sum-${vars.sum}`}
                        initial={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 20, filter: "blur(4px)", position: "absolute" }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="inline-block tracking-tighter"
                      >
                        {vars.sum}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>

              {/* Variable: i */}
              <div className="relative group">
                <motion.div
                  animate={{
                    borderColor: [2, 4, 6, 8].includes(step) ? "hsl(var(--destructive))" : "hsl(var(--border))",
                    boxShadow: [2, 4, 6, 8].includes(step) ? "0 0 20px hsla(var(--destructive), 0.2)" : "none"
                  }}
                  className="bg-background/80 backdrop-blur-sm border-2 rounded-xl p-5 relative shadow-sm transition-colors duration-300"
                >
                  <div className="absolute -top-3 left-4 bg-background px-2 text-[10px] font-black tracking-widest uppercase text-destructive border border-border rounded-full">var i</div>
                  <div className="text-5xl font-black text-center text-foreground flex items-center justify-center min-h-[50px] font-mono">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={`i-${vars.i}`}
                        initial={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 20, filter: "blur(4px)", position: "absolute" }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="inline-block tracking-tighter"
                      >
                        {vars.i}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Narrative Footer */}
      <motion.div
        key={`desc-${step}`}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-4xl w-full mx-auto text-center px-8 py-4 bg-card/80 rounded-2xl border border-border/50 backdrop-blur-xl shadow-lg z-30"
      >
        <div className="text-[10px] font-black text-primary mb-2 uppercase tracking-widest">
           {step === 0 && "Idle State"}
           {step === 1 && "Initialization"}
           {step > 1 && step < 9 && `Loop Iteration`}
           {step === 9 && "Terminal Output"}
         </div>
        <p className="text-sm font-medium text-foreground/80">
          {step === 0 && "흐름 추적(Flow Tracing)은 코드가 한 줄씩 실행될 때 메모리의 변화를 추적하는 기술입니다."}
          {step === 1 && "Start: 프로그램 변수 'sum'을 메모리에 할당하고 0으로 초기화합니다."}
          {step === 2 && "Loop: 반복 제어 변수 'i'를 1로 선언하고, 조건(1 <= 3)을 만족하므로 블록 내부로 진입합니다."}
          {step === 3 && "Execute: 현재의 'i'(1) 값을 'sum'(0)에 더합니다. 새로운 sum은 1이 됩니다."}
          {step === 4 && "Loop: 'i'가 2로 증가합니다. 조건(2 <= 3)을 만족하여 다시 진입합니다."}
          {step === 5 && "Execute: 현재의 'i'(2) 값을 'sum'(1)에 더합니다. 새로운 sum은 3이 됩니다."}
          {step === 6 && "Loop: 'i'가 3으로 증가합니다. 조건(3 <= 3)을 만족하여 마지막으로 진입합니다."}
          {step === 7 && "Execute: 현재의 'i'(3) 값을 'sum'(3)에 더합니다. 새로운 sum은 6이 됩니다."}
          {step === 8 && "Break: 'i'가 4로 증가합니다. 조건(4 <= 3)이 처음으로 FALSE가 되어 루프를 탈출합니다."}
          {step === 9 && "End: 메모리에 저장된 최종 'sum'의 값(6)을 콘솔에 출력하고 종료합니다."}
        </p>
      </motion.div>

    </div>
  );
}
