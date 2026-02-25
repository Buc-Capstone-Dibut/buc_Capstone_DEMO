"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function use1DArraySim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: 1D Array Structure (Linear Memory allocation)",
    "> [AWAITING COMMAND] >> press 'Step Forward' to trace memory access."
  ]);
  const maxSteps = 4;

  const appendLog = useCallback((msg: string) => setLogs(p => [`> ${msg}`, ...p]), []);

  const peek = useCallback(() => {
    setStep(prev => {
      const next = prev >= maxSteps ? 1 : prev + 1;
      if (next === 1) appendLog("[SUCCESS] ptr = arr[0] -> Accessing index 0 (O(1)). Value: 'A'");
      if (next === 2) appendLog("[SUCCESS] ptr = arr[5] -> Accessing tail element (O(1)). Value: 'F'");
      if (next === 3) appendLog("[ALLOCATE] ptr = arr.slice(1, 4) -> Copying indices 1-3 into new memory segment.");
      if (next === 4) appendLog("[SEGFAULT] ptr = arr[6] -> FATAL: Memory Violation! Out of Bounds access at requested offset.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> SYSTEM RESET: Memory footprint cleared. Waiting for allocation."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step },
      logs,
      handlers: { peek, reset, clear: reset }
    }
  };
}

export function OneDArrayVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const arr = ["A", "B", "C", "D", "E", "F"];

  // Cyber Background Grid
  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <div className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono px-8 gap-8 rounded-xl py-8">
      <CyberGrid />

      {/* Narrative Info Header */}
      <motion.div
        className="w-full max-w-5xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-[0_0_30px_hsla(var(--primary),0.05)]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          {step === 0 && "1D Arrays are contiguous blocks of memory. Access is O(1)."}
          {step === 1 && "Access via index '0'. Offset calculation is instantaneous."}
          {step === 2 && "Access via length offset. Also an O(1) operation."}
          {step === 3 && ".slice() creates a shallow copy, allocating new memory. O(N)."}
          {step === 4 && "Access beyond capacity triggers a bounds error or returns undefined."}
        </p>
      </motion.div>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 relative items-stretch z-10">

        {/* Code Execution Panel */}
        <div className="flex-1 min-w-[300px] bg-[#0d1117]/90 backdrop-blur-md rounded-2xl p-6 font-mono text-sm leading-relaxed border border-border shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold flex-1 text-center">Execution Context</span>
          </div>

          <div className="relative text-base h-full flex flex-col justify-center py-4">
            {/* Active Highlight Background */}
            <motion.div
              className="absolute left-[-24px] right-[-24px] h-[36px] bg-primary/10 border-l-[3px] border-primary pointer-events-none z-0"
              initial={{ top: 0, opacity: 0 }}
              animate={{
                top: 16 + (step * 36), // 16px is the padding top of the container
                opacity: step === 0 ? 0 : 1,
                boxShadow: step > 0 ? "0 0 20px hsla(var(--primary), 0.2) inset" : "none"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />

            <div className="relative z-10 flex flex-col gap-[12px]">
              <div className={`h-[24px] flex items-center ${step === 0 ? "text-primary font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                <span><span className="text-blue-400">const</span> arr = ['A', 'B', 'C', 'D', 'E', 'F'];</span>
              </div>
              <div className={`h-[24px] flex items-center ${step === 1 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                <span><span className="text-yellow-300">console</span>.log(arr[<span className="text-blue-400">0</span>]); <span className="text-muted-foreground text-xs">// 'A'</span></span>
              </div>
              <div className={`h-[24px] flex items-center ${step === 2 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                <span><span className="text-yellow-300">console</span>.log(arr[<span className="text-blue-400">arr.length-1</span>]); <span className="text-muted-foreground text-xs">// 'F'</span></span>
              </div>
              <div className={`h-[24px] flex items-center ${step === 3 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                <span><span className="text-blue-400">const</span> sub = arr.<span className="text-emerald-400">slice</span>(1, 4); <span className="text-muted-foreground text-xs">// ['B', 'C', 'D']</span></span>
              </div>
              <div className={`h-[24px] flex items-center ${step === 4 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                <span><span className="text-yellow-300">console</span>.log(arr[<span className="text-destructive">6</span>]); <span className="text-muted-foreground text-xs">// Out Of Bounds</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Hardware Interface */}
        <div className="flex-[2] bg-card/40 backdrop-blur-sm rounded-2xl p-8 border border-border shadow-2xl relative flex flex-col items-center justify-center overflow-hidden min-h-[350px]">
          {/* Decorative Memory Trace Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" preserveAspectRatio="none">
            <path d="M 0,50 L 50,50 L 100,100 L 400,100" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M 0,200 L 80,200 L 150,150 L 400,150" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="4 4" />
          </svg>

          <div className="text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted px-4 py-1 rounded-full mb-12 z-10 border border-border shadow-inner">
            Linear Memory Segment: 0x00A1F
          </div>

          <div className="relative z-10 w-full flex justify-center">
            {/* Main Array Strip */}
            <div className="flex relative bg-muted/20 p-4 rounded-xl border border-primary/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md">
              {arr.map((char, i) => {
                const isTargetStep1 = step === 1 && i === 0;
                const isTargetStep2 = step === 2 && i === 5;
                const isSliced = step === 3 && i >= 1 && i < 4;

                let bgColor = "hsl(var(--card))";
                let borderColor = "hsl(var(--border))";
                let textColor = "hsl(var(--card-foreground))";
                let shadowColor = "none";
                let yOffset = 0;

                if (isTargetStep1) {
                  bgColor = "hsl(var(--primary)/0.2)";
                  borderColor = "hsl(var(--primary))";
                  textColor = "hsl(var(--primary))";
                  shadowColor = "0 0 20px hsla(var(--primary), 0.4)";
                } else if (isTargetStep2) {
                  bgColor = "hsl(var(--purple-500)/0.2)";
                  borderColor = "hsl(var(--purple-500))";
                  textColor = "hsl(var(--purple-500))";
                  shadowColor = "0 0 20px hsla(var(--purple-500), 0.4)";
                } else if (isSliced) {
                  bgColor = "hsl(var(--emerald-500)/0.2)";
                  borderColor = "hsl(var(--emerald-500))";
                  textColor = "hsl(var(--emerald-500))";
                  shadowColor = "0 0 15px hsla(var(--emerald-500), 0.3)";
                  yOffset = -8;
                }

                return (
                  <div key={`arr-node-${i}`} className="flex flex-col items-center relative mx-1 md:mx-1.5 min-w-[48px] md:min-w-[64px]">
                    {/* Visual Pointer for Targeting */}
                    <AnimatePresence>
                      {(isTargetStep1 || isTargetStep2) && (
                        <motion.div
                          initial={{ opacity: 0, y: -20, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.8 }}
                          className={`absolute -top-12 flex flex-col items-center z-40 ${isTargetStep1 ? "text-primary" : "text-purple-500"}`}
                        >
                          <span className="font-bold text-[10px] tracking-widest bg-card border px-2 py-0.5 rounded shadow-[0_0_10px_currentColor] whitespace-nowrap">
                            INDEX {i}
                          </span>
                          <div className="w-0.5 h-4 bg-current mt-1 rounded-full" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Array Cell */}
                    <motion.div
                      animate={{
                        y: yOffset,
                        backgroundColor: bgColor,
                        color: textColor,
                        borderColor: borderColor,
                        boxShadow: shadowColor,
                        scale: (isTargetStep1 || isTargetStep2 || isSliced) ? 1.05 : 1
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-12 h-14 md:w-16 md:h-16 border-2 flex items-center justify-center text-xl md:text-2xl font-black rounded-lg relative z-20 overflow-hidden"
                    >
                      {/* Inner glare */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
                      {char}
                    </motion.div>

                    {/* Memory Address / Index beneath */}
                    <div className="flex flex-col items-center mt-3 gap-1">
                      <span className="text-[9px] md:text-[10px] text-muted-foreground/50 font-mono tracking-tighter">0x{(1000 + i * 4).toString(16).toUpperCase()}</span>
                      <span className="text-xs text-muted-foreground font-bold px-2 py-0.5 rounded-sm bg-background border border-border/50 shadow-inner w-full text-center">
                        [{i}]
                      </span>
                    </div>

                    {/* Sliced copy extracting */}
                    <AnimatePresence>
                      {isSliced && (
                        <motion.div
                          initial={{ opacity: 0, y: 0, scale: 0.8 }}
                          animate={{ opacity: 1, y: -80, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8, y: -40 }}
                          transition={{ type: "spring", stiffness: 200, damping: 20, delay: (i-1) * 0.1 }}
                          className="absolute top-0 w-12 h-14 md:w-16 md:h-16 border-y-2 border-emerald-500/50 bg-emerald-500/10 backdrop-blur-md text-emerald-400 flex items-center justify-center text-xl md:text-2xl font-black rounded-lg shadow-[0_0_20px_hsla(var(--emerald-500),0.3)] z-30 pointer-events-none"
                        >
                          {char}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Ghost Segment for Out of Bounds (Index 6) */}
              <div className="flex flex-col items-center relative pl-2 md:pl-4 ml-2 md:ml-4 border-l-2 border-dashed border-border/50 min-w-[48px] md:min-w-[64px]">
                 <AnimatePresence>
                    {step === 4 && (
                      <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                        className="absolute -top-12 flex flex-col items-center text-destructive z-40"
                      >
                        <span className="font-bold text-[10px] tracking-widest bg-destructive/10 border border-destructive/30 px-2 py-0.5 rounded shadow-[0_0_15px_hsla(var(--destructive),0.5)] whitespace-nowrap">
                          INDEX 6
                        </span>
                        <div className="w-0.5 h-4 bg-current mt-1 rounded-full animate-pulse" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                <motion.div
                  animate={{
                    borderColor: step === 4 ? "hsl(var(--destructive))" : "hsl(var(--border)/0.3)",
                    backgroundColor: step === 4 ? "hsl(var(--destructive)/0.1)" : "transparent",
                    rotate: step === 4 ? [0, -3, 3, -3, 3, 0] : 0,
                    boxShadow: step === 4 ? "0 0 30px hsla(var(--destructive), 0.4) inset" : "none"
                  }}
                  transition={{ duration: 0.4 }}
                  className={`w-12 h-14 md:w-16 md:h-16 border-2 border-dashed flex items-center justify-center font-black rounded-lg relative z-20 overflow-hidden ${step === 4 ? "text-destructive text-sm" : "text-muted-foreground/30 text-xl"}`}
                >
                  {step === 4 ? (
                    <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.2 }}>ERR_</motion.span>
                  ) : "?"}

                  {/* Matrix Glitch Overlay Line */}
                  {step === 4 && (
                    <motion.div
                      className="absolute inset-x-0 h-0.5 bg-destructive/50"
                      animate={{ top: ['0%', '100%'] }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </motion.div>

                <div className="flex flex-col items-center mt-3 gap-1">
                  <span className="text-[9px] md:text-[10px] text-destructive/50 font-mono tracking-tighter hidden md:block">UNALLOCATED</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-sm border w-full text-center ${step === 4 ? "bg-destructive/20 text-destructive border-destructive/50" : "bg-transparent text-muted-foreground border-transparent"}`}>
                    [6]
                  </span>
                </div>
              </div>

            </div>

            {/* Slice Container Highlight Box */}
            <AnimatePresence>
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0.8 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0.8 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  className="absolute top-[-92px] left-[52px] md:left-[64px] w-[168px] md:w-[228px] h-20 border border-emerald-500/30 bg-emerald-500/5 rounded-xl -z-10 pointer-events-none"
                >
                  <span className="absolute -top-6 left-2 text-[10px] uppercase font-bold tracking-widest text-emerald-500 whitespace-nowrap">New Array Allocated: sub[]</span>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}
