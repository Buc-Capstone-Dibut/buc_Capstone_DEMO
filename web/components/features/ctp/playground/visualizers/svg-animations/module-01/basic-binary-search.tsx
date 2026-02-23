"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useBinarySearchSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Binary Search Protocol",
    "> [AWAITING COMMAND] >> Target constraint locked: 11"
  ]);
  const maxSteps = 7;

  const appendLog = useCallback((msg: string) => {
    setLogs(l => [`> ${msg}`, ...l]);
  }, []);

  const peek = useCallback(() => {
    setStep(p => {
      const next = p >= maxSteps ? 1 : p + 1;
      if (next === 1) appendLog("[BOUNDS_INIT] Left index: 0, Right index: 6. Search space active.");
      if (next === 2) appendLog("[PROBE] Calculating midpoint. MID = floor((0 + 6) / 2) = 3. Value[3] = 7.");
      if (next === 3) appendLog("[EVALUATE] 7 < 11. Target exists in upper half. Adjusting bounds...");
      if (next === 4) appendLog("[BOUNDS_UPDATE] Left index shifted to MID + 1 (4). Right index: 6.");
      if (next === 5) appendLog("[PROBE] Calculating midpoint. MID = floor((4 + 6) / 2) = 5. Value[5] = 11.");
      if (next === 6) appendLog("[EVALUATE] 11 === 11. Match confirmed.");
      if (next === 7) appendLog("[TERMINATE] Objective acquired at index 5. Halting search sequence.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> SYSTEM RESET: Search bounds purged. Awaiting execution."]);
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

export function BinarySearchVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const arr = [1, 3, 5, 7, 9, 11, 13];
  const target = 11;

  let L = 0; let R = 6; let M = -1;
  let isFound = false;

  if (step === 0) { L = -1; R = -1; }
  else if (step === 1) { L = 0; R = 6; }
  else if (step === 2) { L = 0; R = 6; M = 3; }
  else if (step === 3) { L = 0; R = 6; M = 3; }
  else if (step === 4) { L = 4; R = 6; M = -1; }
  else if (step === 5) { L = 4; R = 6; M = 5; }
  else if (step >= 6) { L = 4; R = 6; M = 5; isFound = true; }

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
        <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          {step === 0 && "Binary Search: O(log N) time complexity. Halves search space each step."}
          {step === 1 && "Initialization: Left and Right bounds encompass the entire array."}
          {step === 2 && "Probe midpoint: Mid = floor((Left + Right) / 2). Value is 7."}
          {step === 3 && "Comparison: 7 is less than target 11. The answer must be to the right."}
          {step === 4 && "Shrink bounds: Update Left = Mid + 1. Left half is discarded."}
          {step === 5 && "Probe new midpoint: Mid = floor((4 + 6) / 2). Value is 11."}
          {step === 6 && "Comparison: 11 equals target 11. Match found."}
          {step >= 7 && "Return index 5. Search operation completed successfully."}
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
              className="absolute left-[-24px] right-[-24px] bg-cyan-500/10 border-l-[3px] border-cyan-500 pointer-events-none z-0"
              initial={{ top: 0, opacity: 0, height: 36 }}
              animate={{
                top: step === 0 ? 0 :
                     step === 1 ? 16 :
                     step === 2 ? 16 + 36 * 3 :
                     step === 3 ? 16 + 36 * 4 :
                     step === 4 ? 16 + 36 * 6 :
                     step === 5 ? 16 + 36 * 3 :
                     step === 6 ? 16 + 36 * 4 :
                     16 + 36 * 5,
                height: step === 1 ? 36 * 2 : step === 6 ? 36 * 2 : 36,
                opacity: step === 0 ? 0 : 1,
                boxShadow: step > 0 ? "0 0 20px hsla(var(--cyan-500), 0.2) inset" : "none"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />

            <div className="relative z-10 flex flex-col gap-[12px]">
              <div className={`h-[24px] flex items-center ${step === 1 ? "text-cyan-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">let</span> left = <span className="text-yellow-300">0</span>;</div>
              <div className={`h-[24px] flex items-center ${step === 1 ? "text-cyan-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">let</span> right = arr.<span className="text-emerald-400">length</span> - <span className="text-yellow-300">1</span>;</div>
              <div className={`h-[24px] flex items-center ${step >= 2 && step <= 5 ? "text-primary font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">while</span> (left &lt;= right) {"{"}</div>
              <div className={`h-[24px] flex items-center pl-4 ${step === 2 || step === 5 ? "text-cyan-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">let</span> mid = <span className="text-yellow-300">Math</span>.<span className="text-blue-400">floor</span>((left + right) / <span className="text-yellow-300">2</span>);</div>
              <div className={`h-[24px] flex items-center pl-4 ${step === 3 || step === 6 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">if</span> (arr[mid] === target) {"{"}</div>
              <div className={`h-[24px] flex items-center pl-8 ${step >= 6 ? "text-emerald-500 font-bold shadow-[0_0_10px_currentColor] bg-emerald-500/10 rounded px-2 w-max" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">return</span> mid;</div>
              <div className={`h-[24px] flex items-center pl-4 ${step === 4 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}>{"}"} <span className="text-purple-400">else</span> <span className="text-purple-400">if</span> (arr[mid] &lt; target) {"{"}</div>
              <div className={`h-[24px] flex items-center pl-8 ${step === 4 ? "text-orange-400 font-bold" : "text-muted-foreground/60 transition-opacity"}`}>left = mid + <span className="text-yellow-300">1</span>;</div>
              <div className={`h-[24px] flex items-center pl-4 ${step >= 2 && step <= 5 ? "text-primary font-bold" : "text-muted-foreground/60 transition-opacity"}`}>{"}"} <span className="text-purple-400">else</span> {"{"} right = mid - <span className="text-yellow-300">1</span>; {"}"}</div>
            </div>
          </div>
        </div>

        {/* Array Visualization Panel */}
        <div className="flex-[2] bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex flex-col items-center justify-center overflow-hidden min-h-[400px]">

          <div className="absolute top-6 left-6 flex items-center gap-3">
             <div className="px-3 py-1 rounded bg-card/60 border text-[10px] font-black uppercase text-cyan-500 tracking-widest shadow-inner">
               Target : 11
             </div>
             {M !== -1 && (
               <div className={`px-3 py-1 rounded border text-[10px] font-black uppercase tracking-widest transition-colors ${isFound ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : 'bg-card/60 text-muted-foreground'}`}>
                 Current MID : {arr[M]}
               </div>
             )}
          </div>

          {/* Array Container */}
          <div className="relative z-10 w-full flex justify-center gap-2 mt-12 mb-16">
             {arr.map((val, i) => {
               const isInRange = L !== -1 && i >= L && i <= R;
               const isMid = i === M;
               const isEliminated = L !== -1 && !isInRange;
               const isTargetNode = isFound && isMid;

               let bgColor = "hsl(var(--card)/0.8)";
               let borderColor = "hsl(var(--border))";
               let textColor = "hsl(var(--card-foreground))";
               let shadow = "none";
               let scale = 1;

               if (isTargetNode) {
                 bgColor = "hsl(var(--emerald-500)/0.2)";
                 borderColor = "hsl(var(--emerald-500))";
                 textColor = "hsl(var(--emerald-500))";
                 shadow = "0 0 20px hsla(var(--emerald-500), 0.4)";
                 scale = 1.1;
               } else if (isMid) {
                 bgColor = "hsl(var(--cyan-500)/0.2)";
                 borderColor = "hsl(var(--cyan-500))";
                 textColor = "hsl(var(--cyan-500))";
                 shadow = "0 0 20px hsla(var(--cyan-500), 0.4)";
                 scale = 1.05;
               } else if (isEliminated) {
                 bgColor = "hsl(var(--destructive)/0.05)";
                 borderColor = "hsl(var(--destructive)/0.2)";
                 textColor = "hsl(var(--muted-foreground)/0.3)";
               } else if (isInRange) {
                 borderColor = "hsl(var(--cyan-500)/0.3)";
               }

               return (
                 <div key={`bs-cell-${i}`} className="flex flex-col items-center relative min-w-[40px] md:min-w-[56px] lg:min-w-[70px]">

                   {/* Pointers: L, R, M */}
                   <AnimatePresence>
                      {L === i && (
                        <motion.div initial={{ opacity: 0, scale: 0.5, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5, y: -10 }} className="absolute -top-12 flex flex-col items-center text-orange-400">
                           <span className="font-bold text-[10px] tracking-widest bg-card border border-orange-400/30 px-2 py-0.5 rounded shadow-[0_0_10px_currentColor]">LEFT</span>
                           <div className="w-0.5 h-4 bg-current mt-1 rounded-full" />
                        </motion.div>
                      )}
                      {R === i && (
                        <motion.div initial={{ opacity: 0, scale: 0.5, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5, y: -10 }} className="absolute -top-12 flex flex-col items-center text-purple-400">
                           <span className="font-bold text-[10px] tracking-widest bg-card border border-purple-400/30 px-2 py-0.5 rounded shadow-[0_0_10px_currentColor]">RIGHT</span>
                           <div className="w-0.5 h-4 bg-current mt-1 rounded-full" />
                        </motion.div>
                      )}
                      {isMid && (
                         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute -bottom-14 flex flex-col items-center ${isFound ? 'text-emerald-500' : 'text-cyan-500'}`}>
                           <div className="w-0.5 h-4 bg-current mb-1 rounded-full" />
                           <span className="font-bold text-[10px] tracking-widest bg-card border px-2 py-0.5 rounded shadow-[0_0_10px_currentColor]">MID</span>
                         </motion.div>
                      )}
                   </AnimatePresence>

                   {/* Main Cell */}
                   <motion.div
                     animate={{
                       backgroundColor: bgColor,
                       borderColor: borderColor,
                       color: textColor,
                       boxShadow: shadow,
                       scale,
                       opacity: isEliminated ? 0.4 : 1
                     }}
                     transition={{ type: "spring", stiffness: 300, damping: 20 }}
                     className="w-10 h-10 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center text-lg md:text-xl lg:text-2xl font-black rounded-lg border-2 relative overflow-hidden"
                   >
                     {/* Scanning Effect for Mid */}
                     {isMid && !isTargetNode && (
                       <motion.div
                         className="absolute inset-y-0 w-1 bg-cyan-400/60 blur-sm"
                         animate={{ left: ['-50%', '150%'] }}
                         transition={{ duration: 1, repeat: Infinity }}
                       />
                     )}

                     {/* Success Pulse */}
                     {isTargetNode && (
                        <motion.div
                          className="absolute inset-0 bg-emerald-400/30"
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                     )}

                     <span className="relative z-10">{val}</span>
                   </motion.div>

                   {/* Subscript Index */}
                   <div className="mt-3 text-[10px] font-mono font-bold text-muted-foreground/60">
                     [{i}]
                   </div>

                 </div>
               );
             })}

             {/* Dimming overlay over eliminated segments */}
             {L !== -1 && (
                <div className="absolute inset-x-0 bottom-8 h-20 -z-10 pointer-events-none flex">
                   {L > 0 && <div className="bg-destructive/10 border-b-2 border-l-2 border-destructive/20 rounded-bl-lg" style={{ width: `${(L / arr.length) * 100}%` }} />}
                   <div className="flex-1" />
                   {R < arr.length - 1 && <div className="bg-destructive/10 border-b-2 border-r-2 border-destructive/20 rounded-br-lg" style={{ width: `${((arr.length - 1 - R) / arr.length) * 100}%` }} />}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
