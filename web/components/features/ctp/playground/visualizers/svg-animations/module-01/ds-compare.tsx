"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useDsCompareSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Data Structure Comparative Analysis",
    "> [AWAITING COMMAND] >> Select 'Peek' to initiate performance analysis."
  ]);
  const maxSteps = 4;

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = prev >= maxSteps ? 1 : prev + 1;
      let logMsg = "";
      if (next === 1) logMsg = "[ARRAY_ACCESS] Indexing direct memory offset... O(1) latency.";
      if (next === 2) logMsg = "[LL_ACCESS] Traversing pointer chain from HEAD... O(N) latency.";
      if (next === 3) logMsg = "[ARRAY_INSERT] Allocating space. Shifting contiguous segments... O(N) latency.";
      if (next === 4) logMsg = "[LL_INSERT] Rewiring segment pointers... O(1) latency.";
      appendLog(logMsg);
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> SYSTEM RESET: Benchmarks cleared. Memory buffers restored."]);
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

export function DsCompareVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;

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
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono px-4 md:px-8 gap-8 rounded-xl py-8">
      <CyberGrid />

      {/* Narrative Info Header */}
      <motion.div
        className="w-full max-w-5xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-[0_0_30px_hsla(var(--primary),0.05)]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          {step === 0 && "Compare core operations between Arrays and Linked Lists."}
          {step === 1 && "Arrays offer O(1) random access by computing fixed memory offsets."}
          {step === 2 && "Linked Lists require O(N) traversal following pointers from the Head."}
          {step === 3 && "Array insertion requires O(N) time to shift subsequent elements."}
          {step === 4 && "Linked List insertion requires O(1) pointer updates (if position is known)."}
        </p>
      </motion.div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 z-10">

        {/* ARRAY PANEL */}
        <div className="bg-[#0d1117]/90 backdrop-blur-md border border-border rounded-2xl p-6 shadow-2xl relative min-h-[300px] flex flex-col">
          <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-8">
            <h3 className="font-black uppercase tracking-widest text-cyan-500 text-sm">Contiguous Array</h3>
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span className={step === 1 ? "text-cyan-500 font-bold bg-cyan-500/10 px-2 py-1 rounded" : "px-2 py-1"}>Access: O(1)</span>
              <span className={step === 3 ? "text-destructive font-bold bg-destructive/10 px-2 py-1 rounded" : "px-2 py-1"}>Insert: O(N)</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative">
            {/* Memory Blocks Container */}
            <div className="flex border border-cyan-500/30 p-2 rounded-xl bg-cyan-500/5 relative overflow-visible shadow-[0_0_30px_hsla(var(--cyan-500),0.05)]">

              {/* Target Access Pointer Step 1 */}
              <AnimatePresence>
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute -top-12 left-[78px] flex flex-col items-center text-cyan-500"
                  >
                    <span className="font-black text-[10px] tracking-widest bg-card border border-cyan-500/50 px-2 py-1 rounded shadow-[0_0_10px_currentColor]">arr[1]</span>
                    <div className="w-0.5 h-4 bg-current mt-1 rounded-full" />
                  </motion.div>
                )}
              </AnimatePresence>

              {[10, 20, 30, 40].map((num, i) => {
                 const isShifted = step === 3 && i >= 2;
                 return (
                  <motion.div
                    key={`arr-${i}`}
                    className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-card border-r border-cyan-500/20 last:border-r-0 font-black text-xl relative z-10"
                    animate={{
                      backgroundColor: (step === 1 && i === 1) ? "hsl(var(--cyan-500)/0.2)" : "hsl(var(--card)/0.8)",
                      borderColor: (step === 1 && i === 1) ? "hsl(var(--cyan-500))" : "hsl(var(--cyan-500)/0.2)",
                      color: (step === 1 && i === 1) ? "hsl(var(--cyan-500))" : "hsl(var(--foreground))",
                      x: isShifted ? 68 : 0 // Shift elements for insertion
                    }}
                    transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
                  >
                    {num}
                  </motion.div>
                 );
              })}

              {/* Inserting Element Step 3 */}
              <AnimatePresence>
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: -40, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", bounce: 0.4 }}
                    className="absolute top-2 left-[152px] w-14 h-14 md:w-16 md:h-16 flex items-center justify-center border-2 border-emerald-500 bg-emerald-500/20 text-emerald-500 font-black text-xl rounded shadow-[0_0_20px_theme(colors.emerald.500)] z-20"
                  >
                    25
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

             {/* Array Memory Shifting Visual */}
             {step === 3 && (
                <motion.div
                   className="absolute bottom-8 right-12 text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-2"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.2 }}
                >
                   <span>Shifting Memory Blocks O(N)</span>
                   <motion.div animate={{ x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1 }}>→</motion.div>
                </motion.div>
             )}
          </div>
        </div>

        {/* LINKED LIST PANEL */}
        <div className="bg-[#0d1117]/90 backdrop-blur-md border border-border rounded-2xl p-6 shadow-2xl relative min-h-[300px] flex flex-col">
          <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-8">
            <h3 className="font-black uppercase tracking-widest text-purple-500 text-sm">Linked List</h3>
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span className={step === 2 ? "text-destructive font-bold bg-destructive/10 px-2 py-1 rounded" : "px-2 py-1"}>Access: O(N)</span>
              <span className={step === 4 ? "text-purple-500 font-bold bg-purple-500/10 px-2 py-1 rounded" : "px-2 py-1"}>Insert: O(1)</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative w-full pb-8">
            <div className="flex items-center justify-center gap-8 relative w-full h-24">

              {/* Target Access Traversal Step 2 */}
              <AnimatePresence>
                {step === 2 && (
                  <motion.div
                    className="absolute -top-10 left-0 w-8 h-8 rounded-full border-2 border-primary/50 bg-primary/20 shadow-[0_0_15px_hsl(var(--primary))] z-30 pointer-events-none"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 140, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                )}
              </AnimatePresence>

              {[10, 20, 30].map((num, i) => (
                <div key={`ll-${i}`} className="flex items-center gap-8 relative z-10">
                  <motion.div
                    className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-card border border-purple-500/30 rounded-lg shadow-[0_0_20px_hsla(var(--purple-500),0.05)] font-black text-xl z-20"
                    animate={{
                      backgroundColor: (step === 2 && i === 1) ? "hsl(var(--purple-500)/0.2)" : "hsl(var(--card)/0.8)",
                      borderColor: (step === 2 && i === 1) ? "hsl(var(--purple-500))" : "hsl(var(--purple-500)/0.3)",
                      color: (step === 2 && i === 1) ? "hsl(var(--purple-500))" : "hsl(var(--foreground))"
                    }}
                    transition={{ duration: 0.5, delay: (step === 2 && i === 1) ? 1.5 : 0 }} // Delay highlight until pointer reaches
                  >
                    {num}
                  </motion.div>

                  {/* Connecting Pointers */}
                  {i < 2 && (
                    <div className="w-8 h-0.5 bg-purple-500/40 relative z-10 hidden sm:block">
                      <div className="absolute -right-1 -top-1 w-2.5 h-2.5 border-t-2 border-r-2 border-purple-500/40 rotate-45" />
                    </div>
                  )}
                </div>
              ))}

              {/* Inserting Element Step 4 */}
              <AnimatePresence>
                {step === 4 && (
                  <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.5 }}
                    animate={{ opacity: 1, y: -45, scale: 1 }}
                    className="absolute top-1/2 left-[30%] -translate-x-1/2 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center border-2 border-emerald-500 bg-emerald-500/20 text-emerald-500 font-black text-xl rounded-lg shadow-[0_0_20px_theme(colors.emerald.500)] z-20"
                  >
                    15

                    {/* Rewired Pointers */}
                    <svg className="absolute w-[200px] h-[100px] pointer-events-none -left-20 top-6 overflow-visible">
                       <motion.path
                          d="M 50 20 Q 80 50, 65 0"
                          fill="none" stroke="hsl(var(--emerald-500))" strokeWidth="2" strokeDasharray="4"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                       />
                       <motion.path
                          d="M 100 0 Q 120 50, 140 20"
                          fill="none" stroke="hsl(var(--emerald-500))" strokeWidth="2" strokeDasharray="4"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.4 }}
                       />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

             {step === 2 && (
                <motion.div
                   className="absolute bottom-4 right-1/2 translate-x-1/2 text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-2"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.2 }}
                >
                   <span>Linear Search Required O(N)</span>
                </motion.div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
