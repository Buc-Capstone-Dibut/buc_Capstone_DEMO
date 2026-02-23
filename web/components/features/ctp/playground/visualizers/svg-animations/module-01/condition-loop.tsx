"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useConditionLoopSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Control_Flow 엔진 준비 완료.",
    "[SYSTEM] Peek 버튼을 눌러 라우팅 경로를 확인하세요."
  ]);

  const maxSteps = 6;

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = prev >= maxSteps ? 1 : prev + 1;
      let logMsg = "";
      if (next === 1) logMsg = "Step 1: [START] 메인 스레드가 진입점에 도달했습니다.";
      if (next === 2) logMsg = "Step 2: [INIT] 메모리 할당: 제어 변수 x가 0으로 초기화되었습니다.";
      if (next === 3) logMsg = "Step 3: [CONDITION] 분기점 도달. 조건(x < 3)을 평가 중입니다...";
      if (next === 4) logMsg = "Step 4: [BODY] 조건 평가 결과 TRUE. 루프 본문 연산이 실행됩니다.";
      if (next === 5) logMsg = "Step 5: [UPDATE] 제어 변수 업데이트 (x++). 평가 지점으로 회귀합니다.";
      if (next === 6) logMsg = "Step 6: [EXIT] 조건 평가 결과 FALSE. 메인 스레드로 제어권을 반환합니다.";
      appendLog(logMsg);
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["[SYSTEM] 메모리 초기화 및 포인터 리셋 완료."]);
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

export function ConditionLoopVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;

  // Simulate variable state based on step
  const getVariableX = () => {
    if (step < 2) return "null";
    if (step >= 2 && step <= 4) return "0";
    if (step === 5) return "1";
    if (step === 6) return "3";
    return "0";
  };

  const getLogOutput = () => {
    if (step < 4) return "None";
    if (step >= 4 && step <= 5) return "x is 0";
    if (step === 6) return "x is 0\\nx is 1\\nx is 2";
    return "";
  };

  return (
    <div className="w-full flex flex-col bg-background/50 font-mono rounded-xl overflow-hidden">
       {/* Background Cyber Grid */}
       <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
        <defs>
          <pattern id="cl-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx="20" cy="20" r="1" fill="hsl(var(--primary))" opacity="0.3" />
          </pattern>
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#cl-grid)" />
        <rect width="100%" height="100%" fill="url(#center-glow)" />
      </svg>

      <div className="relative w-full max-w-5xl flex flex-row items-center justify-between px-8 py-8 z-10">

        {/* Left: Memory & Output Panel */}
        <div className="w-64 flex flex-col gap-6">
          <motion.div
            animate={{
              boxShadow: step === 2 || step === 5 ? "0 0 20px hsla(var(--primary), 0.3)" : "none",
              borderColor: step === 2 || step === 5 ? "hsl(var(--primary))" : "hsl(var(--border))"
            }}
            className="w-full bg-card/80 border border-border/50 rounded-2xl p-5 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Memory Block</h4>
            </div>
            <div className="bg-background/80 p-3 rounded-lg border border-border flex justify-between items-center">
              <span className="text-primary/70 font-bold text-sm">let x =</span>
              <span className="text-2xl font-black font-mono text-foreground">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={getVariableX()}
                    initial={{ opacity: 0, y: -10, color: "hsl(var(--primary))" }}
                    animate={{ opacity: 1, y: 0, color: "hsl(var(--foreground))" }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                  >
                    {getVariableX()}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>
          </motion.div>

          <motion.div
             animate={{
              boxShadow: step === 4 ? "0 0 20px hsla(var(--emerald-500), 0.2)" : "none",
              borderColor: step === 4 ? "hsl(var(--emerald-500)/0.5)" : "hsl(var(--border))"
            }}
            className="w-full h-40 bg-card/80 border border-border/50 rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col"
          >
             <div className="flex items-center gap-2 mb-3">
              <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Console Output</h4>
            </div>
            <div className="flex-1 bg-black/40 rounded-lg p-3 overflow-hidden border border-border/30 font-mono text-xs text-emerald-400 whitespace-pre">
              {getLogOutput()}
              {step >= 4 && step < 6 && <motion.span animate={{ opacity: [0, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>_</motion.span>}
            </div>
          </motion.div>
        </div>

        {/* Right: Flowchart SVG Canvas */}
        <div className="relative w-[500px] h-[450px]">
          {/* Neon Glow Filters */}
          <svg className="absolute w-0 h-0">
            <defs>
              <filter id="flow-glow-primary">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="flow-glow-destructive">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>

          {/* Paths connecting nodes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {/* 1 to 2 */}
            <path d="M 250 40 L 250 90" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <motion.path d="M 250 40 L 250 90" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
              opacity={step >= 1 ? 1 : 0} strokeDasharray={step === 1 ? "4 4" : "0"}
              animate={step === 1 ? { strokeDashoffset: -20 } : {}} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />

            {/* 2 to 3 */}
            <path d="M 250 130 L 250 170" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <motion.path d="M 250 130 L 250 170" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
              opacity={step >= 2 ? 1 : 0} strokeDasharray={step === 2 || step === 5 ? "4 4" : "0"}
              animate={step === 2 || step === 5 ? { strokeDashoffset: -20 } : {}} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />

            {/* 3 to 4 (True Branch) */}
            <path d="M 250 250 L 250 300" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <motion.path d="M 250 250 L 250 300" fill="none" stroke="hsl(var(--emerald-500))" strokeWidth="4"
              opacity={step >= 3 && step < 6 ? 1 : 0} strokeDasharray={step === 3 || step === 4 ? "4 4" : "0"}
              animate={step === 3 || step === 4 ? { strokeDashoffset: -20 } : {}} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              filter="url(#flow-glow-primary)"
            />
            <text x="260" y="280" className={`text-xs font-bold ${step >= 3 && step < 6 ? "fill-emerald-500" : "fill-muted-foreground"}`}>TRUE</text>

            {/* 4 to 5 to 3 (Loop Back) */}
            <path d="M 180 320 L 80 320 L 80 210 L 170 210" fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeLinejoin="round" />
            <motion.path d="M 180 320 L 80 320 L 80 210 L 170 210" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinejoin="round"
              opacity={step >= 4 && step < 6 ? 1 : 0} strokeDasharray={step === 4 || step === 5 ? "4 4" : "0"}
              animate={step === 4 || step === 5 ? { strokeDashoffset: 40 } : {}} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <polygon points="160,206 170,210 160,214" fill={step >= 4 && step < 6 ? "hsl(var(--primary))" : "hsl(var(--border))"} />
            <text x="90" y="270" className={`text-xs font-bold ${step >= 4 && step < 6 ? "fill-primary" : "fill-muted-foreground"}`}>LOOP</text>


            {/* 3 to 6 (False Branch) */}
            <path d="M 330 210 L 420 210 L 420 400 L 250 400" fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeLinejoin="round" />
            <motion.path d="M 330 210 L 420 210 L 420 400 L 250 400" fill="none" stroke="hsl(var(--destructive))" strokeWidth="4" strokeLinejoin="round"
              opacity={step === 6 ? 1 : 0} strokeDasharray={step === 6 ? "4 4" : "0"}
              animate={step === 6 ? { strokeDashoffset: -60 } : {}} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              filter="url(#flow-glow-destructive)"
            />
            <polygon points="260,396 250,400 260,404" fill={step === 6 ? "hsl(var(--destructive))" : "hsl(var(--border))"} />
            <text x="340" y="200" className={`text-xs font-bold ${step === 6 ? "fill-destructive" : "fill-muted-foreground"}`}>FALSE</text>
          </svg>

          {/* Nodes (z-index 10) */}
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center">

            {/* Node 1: Start */}
            <motion.div
              animate={{
                scale: step === 1 ? 1.05 : 1,
                borderColor: step === 1 ? "hsl(var(--primary))" : step > 1 ? "hsl(var(--primary)/0.5)" : "hsl(var(--border))",
                boxShadow: step === 1 ? "0 0 20px hsla(var(--primary), 0.4)" : "none",
                backgroundColor: step === 1 ? "hsl(var(--primary)/0.1)" : "hsl(var(--card))"
              }}
              className="absolute top-[0px] w-36 h-10 rounded-full border-2 flex items-center justify-center backdrop-blur-md"
            >
              <span className="font-bold text-sm text-foreground tracking-widest">START</span>
            </motion.div>

            {/* Node 2: Init */}
            <motion.div
              animate={{
                scale: step === 2 ? 1.05 : 1,
                borderColor: step === 2 ? "hsl(var(--primary))" : step > 2 ? "hsl(var(--primary)/0.5)" : "hsl(var(--border))",
                boxShadow: step === 2 ? "0 0 20px hsla(var(--primary), 0.4)" : "none",
                backgroundColor: step === 2 ? "hsl(var(--primary)/0.1)" : "hsl(var(--card))"
              }}
              className="absolute top-[90px] w-36 h-10 rounded-lg border-2 flex items-center justify-center backdrop-blur-md"
            >
              <span className="font-bold text-sm text-foreground font-mono">let x = 0</span>
            </motion.div>

            {/* Node 3: Condition (Diamond Shape using CSS) */}
            <div className="absolute top-[170px] w-32 h-32 flex items-center justify-center">
              <motion.div
                animate={{
                  rotate: 45,
                  scale: step === 3 ? 1.1 : 1,
                  borderColor: step === 3 ? "hsl(var(--destructive))" : step > 3 ? "hsl(var(--primary)/0.5)" : "hsl(var(--border))",
                  boxShadow: step === 3 ? "0 0 30px hsla(var(--destructive), 0.4)" : "none",
                  backgroundColor: step === 3 ? "hsl(var(--destructive)/0.1)" : "hsl(var(--card))"
                }}
                className="w-24 h-24 border-2 absolute backdrop-blur-md"
              />
               <span className="font-black text-sm z-10 text-foreground">x &lt; 3 ?</span>
            </div>

            {/* Node 4: Loop Body */}
            <motion.div
              animate={{
                scale: step === 4 ? 1.05 : 1,
                borderColor: step === 4 ? "hsl(var(--emerald-500))" : step > 4 && step < 6 ? "hsl(var(--primary)/0.5)" : "hsl(var(--border))",
                boxShadow: step === 4 ? "0 0 20px hsla(var(--emerald-500), 0.4)" : "none",
                backgroundColor: step === 4 ? "hsl(var(--emerald-500)/0.1)" : "hsl(var(--card))"
              }}
              className="absolute top-[300px] w-36 h-12 rounded-lg border-2 flex items-center justify-center backdrop-blur-md"
            >
              <span className="font-bold text-sm text-foreground font-mono">print("x is ", x)</span>
            </motion.div>

            {/* Node 5: UPDATE (On the return path) */}
            <motion.div
               animate={{
                scale: step === 5 ? 1.1 : 1,
                borderColor: step === 5 ? "hsl(var(--primary))" : "hsl(var(--border))",
                boxShadow: step === 5 ? "0 0 20px hsla(var(--primary), 0.4)" : "none",
                backgroundColor: step === 5 ? "hsl(var(--primary)/0.1)" : "hsl(var(--card))",
                opacity: step >= 4 && step < 6 ? 1 : 0.3
              }}
              className="absolute top-[260px] left-[50px] w-16 h-8 rounded border-2 flex flex-col items-center justify-center backdrop-blur-md z-20"
            >
               <span className="font-bold text-[10px] text-foreground font-mono">x++</span>
            </motion.div>

             {/* Node 6: End */}
             <motion.div
              animate={{
                scale: step === 6 ? 1.05 : 1,
                borderColor: step === 6 ? "hsl(var(--destructive))" : "hsl(var(--border))",
                boxShadow: step === 6 ? "0 0 20px hsla(var(--destructive), 0.4)" : "none",
                backgroundColor: step === 6 ? "hsl(var(--destructive)/0.1)" : "hsl(var(--card))"
              }}
              className="absolute top-[380px] w-36 h-10 rounded-full border-2 flex items-center justify-center backdrop-blur-md"
            >
              <span className="font-bold text-sm text-foreground tracking-widest">END</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Narrative Footer — placed below the visualizer in normal document flow */}
      <motion.div
        key={`desc-${step}`}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full px-6 pb-5 pt-3 border-t border-border/40 bg-card/60 backdrop-blur-md"
      >
        <div className="text-[11px] font-bold text-primary mb-1 uppercase tracking-widest">
          {step === 0 && "System Idle"}
          {step === 1 && "Start Execution"}
          {step === 2 && "Memory Allocation"}
          {step === 3 && "Condition Evaluation"}
          {step === 4 && "Loop Execution"}
          {step === 5 && "State Update"}
          {step === 6 && "Loop Exit"}
        </div>
        <p className="text-sm font-medium text-foreground/80 leading-relaxed">
          {step === 0 && "조건문(If)은 분기를 만들고, 반복문(Loop)은 특정 로직을 되풀이합니다. 시스템을 가동하세요."}
          {step === 1 && "메인 프로세스가 시작되었습니다. 변수를 초기화할 준비를 합니다."}
          {step === 2 && "루프를 제어할 기준 변수 x를 메모리에 할당하고 0으로 초기화했습니다."}
          {step === 3 && "다이아몬드 노드에서 x < 3 인지 검사합니다. 분기가 결정되는 핵심 지점입니다."}
          {step === 4 && "조건이 참(TRUE)입니다! 루프 내부로 진입하여 지정된 명령(출력)을 수행합니다."}
          {step === 5 && "한 번의 사이클이 끝났습니다. 다음 평가를 위해 x의 값을 1 증가시키고 되돌아갑니다."}
          {step === 6 && "x가 3에 도달했습니다. 조건이 거짓(FALSE)이 되어 루프를 탈출하고 종료됩니다."}
        </p>
      </motion.div>
    </div>
  );
}
