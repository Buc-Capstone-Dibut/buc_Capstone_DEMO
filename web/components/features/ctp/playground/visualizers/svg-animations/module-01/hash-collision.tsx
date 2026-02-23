"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useHashCollisionSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Hash Table Memory Matrix",
    "> [AWAITING COMMAND] >> Ready to process key-value insertions with collision resolution."
  ]);
  const maxSteps = 5;

  const appendLog = useCallback((msg: string) => {
    setLogs(l => [`> ${msg}`, ...l]);
  }, []);

  const peek = useCallback(() => {
    setStep(p => {
      const next = p >= maxSteps ? 1 : p + 1;
      if (next === 1) appendLog("[HASH_COMPUTATION] Generating signature for Key '15'. hash(15) = 15 % 8 = Sector 7.");
      if (next === 2) appendLog("[MEMORY_ALLOCATION] Sector 7 is available. Writing data payload '15' to matrix.");
      if (next === 3) appendLog("[HASH_COMPUTATION] Generating signature for Key '23'. hash(23) = 23 % 8 = Sector 7.");
      if (next === 4) appendLog("[COLLISION_DETECTED] Sector 7 is preoccupied! Standard memory write aborted.");
      if (next === 5) appendLog("[CHAINING_PROTOCOL] Initiating linked-list extension at Sector 7. Data '23' securely appended.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> SYSTEM RESET: Hash Matrix cleared. Chaining structures dismantled."]);
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

export function HashCollisionVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const buckets = [0, 1, 2, 3, 4, 5, 6, 7];

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
        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          {step === 0 && "Hash Tables use a hash function to map keys to indices for O(1) access."}
          {step === 1 && "Insert Key 15: The hash function calculates Hash(15) = 15 % 8 = Index 7."}
          {step === 2 && "Index 7 is empty. The value is stored directly in the bucket."}
          {step === 3 && "Insert Key 23: The hash function calculates Hash(23) = 23 % 8 = Index 7."}
          {step === 4 && "Collision! A value already exists at Index 7."}
          {step === 5 && "Resolution: Chaining. The new value is appended as a linked list node to the existing bucket."}
        </p>
      </motion.div>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 relative items-stretch z-10">

        {/* Code Execution Panel */}
        <div className="flex-1 min-w-[300px] bg-[#0d1117]/90 backdrop-blur-md rounded-2xl p-6 font-mono text-xs md:text-sm leading-relaxed border border-border shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold flex-1 text-center">Execution Context</span>
          </div>

          <div className="relative text-base h-full flex flex-col py-4 mt-2">
            {/* Active Highlight Background */}
            <motion.div
              className="absolute left-[-24px] right-[-24px] bg-orange-500/10 border-l-[3px] border-orange-500 pointer-events-none z-0"
              initial={{ top: 0, opacity: 0, height: 36 }}
              animate={{
                top: step === 0 ? 0 :
                     (step === 1 || step === 3) ? 16 + 36 * 1 :
                     step === 2 ? 16 + 36 * 3 :
                     step === 4 ? 16 + 36 * 3 :
                     16 + 36 * 6,
                height: (step === 1 || step === 3) ? 36 * 2 :
                        (step === 4) ? 36 * 3 :
                        (step === 5) ? 36 * 2 : 36,
                opacity: step === 0 ? 0 : 1,
                boxShadow: step > 0 ? "0 0 20px hsla(var(--orange-500), 0.2) inset" : "none"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />

            <div className="relative z-10 flex flex-col gap-[12px]">
              <div className="h-[24px] flex items-center text-foreground"><span className="text-purple-400">function</span> <span className="text-blue-400">insert</span>(key, value) {"{"}</div>
              <div className={`h-[24px] flex items-center pl-4 ${(step === 1 || step === 3) ? "text-orange-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">const</span> index = <span className="text-blue-400">hash</span>(key);</div>
              <div className={`h-[24px] flex items-center pl-4 ${(step === 1 || step === 3) ? "text-orange-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-muted-foreground">// index = key % 8</span></div>
              <div className={`h-[24px] flex items-center pl-4 ${(step === 2 || step === 4) ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">if</span> (!table[index]) {"{"}</div>
              <div className={`h-[24px] flex items-center pl-8 ${step === 2 ? "text-emerald-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}>table[index] = [value];</div>
              <div className={`h-[24px] flex items-center pl-4 ${step === 4 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}>{"}"} <span className="text-purple-400">else</span> {"{"}</div>
              <div className={`h-[24px] flex items-center pl-8 ${step === 5 ? "text-orange-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-muted-foreground">// Collision Resolution (Chaining)</span></div>
              <div className={`h-[24px] flex items-center pl-8 ${step === 5 ? "text-orange-500 font-bold shadow-[0_0_10px_currentColor] bg-orange-500/10 rounded px-2 w-max" : "text-muted-foreground/60 transition-opacity"}`}>table[index].<span className="text-emerald-400">push</span>(value);</div>
              <div className={`h-[24px] flex items-center pl-4 ${step === 5 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}>{"}"}</div>
              <div className="h-[24px] flex items-center text-foreground">{"}"}</div>
            </div>

             {/* Operation Indicator */}
             <div className="absolute bottom-4 right-4 px-4 py-2 bg-muted/60 text-[10px] font-black uppercase tracking-widest text-muted-foreground rounded-full border shadow-inner">
                {step === 0 && "Waiting..."}
                {(step === 1 || step === 2) && <span className="text-cyan-500">Processing: Insert(15)</span>}
                {(step >= 3) && <span className={step >= 4 ? "text-orange-500" : "text-cyan-500"}>Processing: Insert(23)</span>}
             </div>
          </div>
        </div>

        {/* Matrix Visualization Panel */}
        <div className="flex-[2] bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex flex-col items-center justify-start overflow-hidden min-h-[400px]">

          <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted px-4 py-1 rounded-full mb-8 z-10 border border-border shadow-inner">
            Hash Matrix (Modulo 8)
          </div>

          <div className="relative z-10 flex gap-12 items-start mt-8 w-full max-w-lg justify-center">

             {/* Calculation Box */}
             <div className="w-32 flex flex-col items-center">
                <div className="w-full aspect-square rounded-2xl bg-card border-2 border-dashed border-border flex flex-col items-center justify-center relative shadow-lg">
                   <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground absolute top-2">Hash Func</div>
                   <AnimatePresence mode="popLayout">
                      {step === 1 && (
                         <motion.div key="calc-15" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-2xl font-black text-cyan-500 drop-shadow-[0_0_10px_currentColor]">
                           15 % 8 = 7
                         </motion.div>
                      )}
                      {step >= 3 && (
                         <motion.div key="calc-23" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-2xl font-black text-orange-500 drop-shadow-[0_0_10px_currentColor]">
                           23 % 8 = 7
                         </motion.div>
                      )}
                   </AnimatePresence>
                </div>

                {/* Connecting arrow from Hash Func to Bucket 7 */}
                {(step === 1 || step >= 3) && (
                   <motion.div
                      className={`h-16 w-1 mt-2  ${step >= 4 ? 'bg-orange-500' : 'bg-cyan-500'}`}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      style={{ originY: 0, boxShadow: `0 0 10px ${step >= 4 ? 'hsl(var(--orange-500))' : 'hsl(var(--cyan-500))'}` }}
                   />
                )}
             </div>

             {/* Hash Table Buckets */}
             <div className="flex flex-col gap-2 relative">
                {buckets.map((b) => {
                   const isActiveBucket = b === 7;
                   const isTargetStep1 = isActiveBucket && step === 1;
                   const isTargetStep2 = isActiveBucket && step === 2;
                   const isTargetStep3 = isActiveBucket && step === 3;
                   const isCollsionStep4 = isActiveBucket && step === 4;
                   const isChainingStep5 = isActiveBucket && step === 5;

                   let bgColor = "hsl(var(--card)/0.8)";
                   let borderColor = "hsl(var(--border))";
                   let shadow = "none";

                   if (isTargetStep1 || isTargetStep3) {
                      borderColor = "hsl(var(--cyan-500))";
                      shadow = "0 0 15px hsla(var(--cyan-500), 0.4)";
                   } else if (isTargetStep2) {
                      bgColor = "hsl(var(--emerald-500)/0.2)";
                      borderColor = "hsl(var(--emerald-500))";
                      shadow = "0 0 20px hsla(var(--emerald-500), 0.4)";
                   } else if (isCollsionStep4 || isChainingStep5) {
                      borderColor = "hsl(var(--orange-500))";
                      shadow = "0 0 20px hsla(var(--orange-500), 0.4)";
                   }

                   return (
                      <div key={`bucket-${b}`} className="flex items-center gap-4 relative">
                         {/* Index Label */}
                         <div className={`w-6 text-right text-xs font-black ${isActiveBucket && step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>{b}</div>

                         {/* Bucket Container */}
                         <motion.div
                            className="flex items-center gap-2"
                            animate={{ x: (isTargetStep1 || isTargetStep3 || isCollsionStep4) ? [0, 5, -5, 0] : 0 }}
                            transition={{ duration: 0.3 }}
                         >
                            <motion.div
                               className="w-16 h-10 rounded-lg flex items-center justify-center font-black text-lg border-2 z-10 relative overflow-hidden"
                               animate={{ backgroundColor: bgColor, borderColor: borderColor, boxShadow: shadow }}
                            >
                                {/* Background alert ping on collision */}
                                <AnimatePresence>
                                  {isCollsionStep4 && (
                                     <motion.div className="absolute inset-0 bg-orange-500/30"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                         transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.4 }}
                                     />
                                  )}
                                </AnimatePresence>

                               {b === 7 && step >= 2 && <span className="relative z-10 text-emerald-500">15</span>}
                            </motion.div>

                            {/* Linked List Chain (Collision Resolution) */}
                            <AnimatePresence>
                               {b === 7 && step === 5 && (
                                  <motion.div
                                     initial={{ opacity: 0, x: -20 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     className="flex items-center gap-2"
                                  >
                                     <motion.div
                                        className="h-1 w-6 bg-orange-500"
                                        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }}
                                        transition={{ duration: 0.3 }}
                                     />
                                     <div className="w-16 h-10 rounded-lg flex items-center justify-center font-black text-lg border-2 border-orange-500 bg-orange-500/20 text-orange-500 shadow-[0_0_20px_hsla(var(--orange-500),0.4)]">
                                        23
                                     </div>
                                  </motion.div>
                               )}
                            </AnimatePresence>
                         </motion.div>
                      </div>
                   );
                })}
             </div>
          </div>

          {/* Status Overlay */}
          <AnimatePresence>
             {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  className="absolute bottom-12 px-6 py-2 bg-destructive/10 border border-destructive/50 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-[0_0_30px_hsla(var(--destructive),0.2)]"
                >
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                   <span className="text-sm font-black text-destructive uppercase tracking-widest">Hash Collision Detected</span>
                </motion.div>
             )}
             {step === 5 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute bottom-12 px-6 py-2 bg-orange-500/10 border border-orange-500/50 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-[0_0_30px_hsla(var(--orange-500),0.2)]"
                >
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--orange-500))" strokeWidth="3"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                   <span className="text-sm font-black text-orange-500 uppercase tracking-widest">Resolved via Separation Chaining</span>
                </motion.div>
             )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
