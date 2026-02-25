"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Custom simulation hook
export function useAlgoOverviewSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Algo_Core 엔진 준비 완료.",
    "[SYSTEM] Peek 버튼을 눌러 시뮬레이션을 시작하세요.",
  ]);

  const maxSteps = 4;

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = prev >= maxSteps ? 1 : prev + 1;
      let logMsg = "";
      if (next === 1) logMsg = "Step 1: [INPUT] 원시 데이터 배열(Unsorted)이 버퍼에 적재되었습니다.";
      if (next === 2) logMsg = "Step 2: [TRANSFER] 데이터 패킷이 알고리즘 코어로 전송 중입니다...";
      if (next === 3) logMsg = "Step 3: [PROCESS] 알고리즘 연산 가동 (Sorting Logic Active).";
      if (next === 4) logMsg = "Step 4: [OUTPUT] 통제된 결과(Sorted)가 메모리에 반환되었습니다.";
      appendLog(logMsg);
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["[SYSTEM] 메모리 초기화 완료. 시스템 리셋."]);
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

// Custom SVG Visualizer
export function AlgoOverviewVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;

  const rawData = [5, 2, 9, 1, 5, 6];
  const processedData = [1, 2, 5, 5, 6, 9];

  return (
    <div className="w-full flex flex-col overflow-hidden font-mono bg-background/50 rounded-xl">
      {/* Background Cyber Grid & Glows */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
        <defs>
          <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx="0" cy="0" r="1" fill="hsl(var(--primary))" opacity="0.5" />
          </pattern>
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        <rect width="100%" height="100%" fill="url(#center-glow)" />
      </svg>

      {/* Main Architecture Diagram */}
      <div className="relative w-full max-w-4xl aspect-[21/9] flex items-center justify-between px-8 md:px-16 mt-4">

        {/* 1. Input Module */}
        <div className="flex flex-col items-center gap-4 z-10 w-36">
          <motion.div
            animate={{
              boxShadow: step === 1 ? "0 0 30px hsla(var(--primary), 0.5)" : "0 0 0px hsla(var(--primary), 0)",
              borderColor: step === 1 ? "hsl(var(--primary))" : "hsl(var(--border))",
              backgroundColor: step === 1 ? "hsl(var(--primary)/0.05)" : "hsl(var(--card))"
            }}
            className="w-full h-48 border border-border/50 rounded-2xl flex flex-col p-3 gap-2 items-center justify-center relative overflow-hidden backdrop-blur-md"
          >
            <div className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest absolute top-3">Raw Buffer</div>
            <div className="flex flex-col gap-1.5 mt-4 w-full px-4">
              {rawData.map((num, i) => (
                <motion.div
                  key={`raw-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: step >= 1 ? (step >= 2 ? 0.2 : 1) : 0,
                    x: step >= 1 ? (step >= 2 ? 40 : 0) : -20,
                    scale: step === 1 ? [1, 1.05, 1] : 1
                  }}
                  transition={{ delay: step === 1 ? i * 0.05 : 0, scale: { repeat: Infinity, duration: 2, delay: i * 0.2 } }}
                  className="w-full h-5 bg-card border border-primary/30 rounded flex items-center justify-center shadow-sm"
                >
                  <span className="text-xs font-bold text-primary">{num}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <div className="flex flex-col items-center">
            <div className="text-lg font-black text-foreground tracking-widest uppercase">Input</div>
            <div className="text-[10px] text-muted-foreground">Unsorted Data</div>
          </div>
        </div>

        {/* 2. Process Module (Core Box) */}
        <div className="flex flex-col items-center gap-4 z-20 flex-1 px-4 relative">

          {/* Data Transfer Lines (Input -> Process) */}
          <svg className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-24 pointer-events-none -z-10">
            {/* Base line */}
            <path d="M 0 48 L 100 48" fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />
            {/* Active flow line */}
            <motion.path
              d="M 0 48 L 100 48" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
              animate={{
                strokeDasharray: step >= 2 && step < 4 ? ["0 100", "50 50", "100 0"] : "0 100",
                opacity: step >= 2 && step < 4 ? 1 : 0
              }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {/* Moving Packet */}
            <AnimatePresence>
              {step === 2 && (
                <motion.rect
                  width="12" height="12" rx="2" fill="hsl(var(--primary))" y="42"
                  initial={{ x: 0, opacity: 0 }}
                  animate={{ x: 100, opacity: [0, 1, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary)))" }}
                />
              )}
            </AnimatePresence>
          </svg>

          {/* Central Algorithm Box */}
          <motion.div
            animate={{
              scale: step === 3 ? [1, 1.02, 1] : 1,
              borderColor: step === 3 ? "hsl(var(--primary))" : step >= 2 ? "hsl(var(--primary)/0.5)" : "hsl(var(--border))",
              boxShadow: step === 3 ? "0 0 50px hsla(var(--primary), 0.3)" : "none",
              backgroundColor: step === 3 ? "hsl(var(--primary)/0.05)" : "hsl(var(--card))"
            }}
            transition={{ duration: 1, repeat: step === 3 ? Infinity : 0 }}
            className="w-56 h-56 bg-card border-2 border-border/50 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-xl shadow-2xl"
          >
            {/* Decorative corners */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/30" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/30" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/30" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/30" />

            {/* Core Icon/Animation */}
            <motion.div
              animate={{ rotate: step === 3 ? 360 : 0 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="relative w-20 h-20 flex items-center justify-center mb-4"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <circle cx="50" cy="50" r="40" fill="none" stroke={step === 3 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} strokeWidth="4" strokeDasharray="10 15" />
                <circle cx="50" cy="50" r="25" fill="none" stroke={step === 3 ? "hsl(var(--primary)/0.5)" : "hsl(var(--muted-foreground)/0.5)"} strokeWidth="2" strokeDasharray="4 8" />
                <motion.circle cx="50" cy="50" r="10"
                  fill={step === 3 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                  animate={{ scale: step === 3 ? [1, 1.5, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ filter: step === 3 ? "drop-shadow(0 0 10px hsl(var(--primary)))" : "none" }}
                />
              </svg>
            </motion.div>

            <div className="text-xl font-black tracking-[0.2em] text-foreground uppercase">ALGO_CORE</div>

            {/* Processing equalizer bars */}
            <div className="absolute bottom-6 flex gap-1.5 h-8 items-end">
              {[1,2,3,4,5,6].map((i) => (
                <motion.div
                  key={`eq-${i}`}
                  animate={{
                    height: step === 3 ? [4, Math.random() * 24 + 4, 4] : 4,
                    backgroundColor: step === 3 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground)/0.5)"
                  }}
                  transition={{ duration: 0.5, repeat: step === 3 ? Infinity : 0, delay: i * 0.1 }}
                  className="w-1.5 rounded-t-sm"
                />
              ))}
            </div>
          </motion.div>

          <div className="flex flex-col items-center">
             <div className="text-lg font-black text-foreground tracking-widest uppercase">Algorithm</div>
             <div className="text-[10px] text-muted-foreground">Defined Procedure</div>
          </div>
        </div>

        {/* 3. Output Module */}
        <div className="flex flex-col items-center gap-4 z-10 w-36 relative">

           {/* Data Transfer Lines (Process -> Output) */}
           <svg className="absolute top-1/2 -translate-y-1/2 right-[100%] w-32 h-24 pointer-events-none -z-10">
            {/* Base line */}
            <path d="M 0 48 L 128 48" fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />
            {/* Active flow line */}
            <motion.path
              d="M 0 48 L 128 48" fill="none" stroke="hsl(var(--emerald-500))" strokeWidth="3"
              animate={{
                strokeDasharray: step === 4 ? ["0 128", "64 64", "128 0"] : "0 128",
                opacity: step === 4 ? 1 : 0
              }}
              transition={{ duration: 1, ease: "linear" }}
            />
            {/* Moving Packet */}
            <AnimatePresence>
              {step === 4 && (
                <motion.rect
                  width="12" height="12" rx="2" fill="hsl(var(--emerald-500))" y="42"
                  initial={{ x: 0, opacity: 0 }}
                  animate={{ x: 128, opacity: [0, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  style={{ filter: "drop-shadow(0 0 8px hsl(var(--emerald-500)))" }}
                />
              )}
            </AnimatePresence>
          </svg>

          <motion.div
            animate={{
              boxShadow: step === 4 ? "0 0 30px hsla(var(--emerald-500), 0.5)" : "0 0 0px hsla(var(--emerald-500), 0)",
              borderColor: step === 4 ? "hsl(var(--emerald-500))" : "hsl(var(--border))",
              backgroundColor: step === 4 ? "hsl(var(--emerald-500)/0.05)" : "hsl(var(--card))"
            }}
            className="w-full h-48 border border-border/50 rounded-2xl flex flex-col p-3 gap-2 items-center justify-center relative overflow-hidden backdrop-blur-md"
          >
            <div className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest absolute top-3">Result Mem</div>
            <div className="flex flex-col gap-1.5 mt-4 w-full px-4">
              {processedData.map((num, i) => (
                <motion.div
                  key={`out-${i}`}
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  animate={{
                    opacity: step >= 4 ? 1 : 0,
                    scale: step >= 4 ? 1 : 0.8,
                    x: step >= 4 ? 0 : -20,
                    borderColor: step >= 4 ? "hsl(var(--emerald-500)/0.5)" : "hsl(var(--border))",
                    backgroundColor: step >= 4 ? "hsl(var(--emerald-500)/0.1)" : "hsl(var(--card))"
                  }}
                  transition={{ delay: step === 4 ? 0.5 + i * 0.1 : 0, type: "spring", stiffness: 200 }}
                  className="w-full h-5 rounded flex items-center justify-center border shadow-sm relative overflow-hidden"
                >
                  {/* Success highlight sweep */}
                  {step === 4 && (
                    <motion.div
                      className="absolute inset-0 bg-emerald-400/20"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                    />
                  )}
                  <span className={`text-xs font-bold ${step >= 4 ? "text-emerald-500" : "text-muted-foreground"}`}>{num}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <div className="flex flex-col items-center">
            <div className="text-lg font-black text-foreground tracking-widest uppercase">Output</div>
            <div className="text-[10px] text-muted-foreground">Sorted Data</div>
          </div>
        </div>
      </div>

      {/* Description Footer — in normal document flow, always visible */}
      <motion.div
        key={`desc-${step}`}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full px-6 pb-5 pt-3 border-t border-border/40 bg-card/60 backdrop-blur-md"
      >
        <div className="text-[11px] font-bold text-primary mb-1 uppercase tracking-widest">
          {step === 0 && "System Idle"}
          {step === 1 && "Phase 1: Input Standby"}
          {step === 2 && "Phase 2: Data Transfer"}
          {step === 3 && "Phase 3: Processing"}
          {step === 4 && "Phase 4: Output Complete"}
        </div>
        <p className="text-sm text-foreground/80 font-medium leading-relaxed">
          {step === 0 && "알고리즘은 특정 문제를 해결하기 위한 명확하고 단계적인 절차입니다. 우측 패널의 기능들을 실행해보세요."}
          {step === 1 && "입력(Input) 단계: 정제되지 않은 원시 데이터(Unsorted)가 메모리에 적재되어 대기 중입니다."}
          {step === 2 && "전송 단계: 목표된 출력을 얻기 위해 데이터가 알고리즘 엔진으로 하나씩 유입됩니다."}
          {step === 3 && "처리(Process) 단계: 내부 로직(정렬, 탐색 등)에 따라 데이터가 오차 없이 분석 및 가공됩니다."}
          {step === 4 && "출력(Output) 단계: 유한한 시간 안에 목적에 맞는 최적화된 결과물(Sorted)이 완성되었습니다."}
        </p>
      </motion.div>
    </div>
  );
}
