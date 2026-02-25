"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useLinearSearchSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Linear Search Protocol",
    "> [AWAITING COMMAND] >> Target constraint locked: 17. Awaiting scan execution."
  ]);
  const maxSteps = 6;

  const appendLog = useCallback((msg: string) => {
    setLogs(l => [`> ${msg}`, ...l]);
  }, []);

  const peek = useCallback(() => {
    setStep(p => {
      const next = p >= maxSteps ? 1 : p + 1;
      if (next === 1) appendLog("[PROBE] Index 0: Value (6) != Target (17). Advancing ptr...");
      if (next === 2) appendLog("[PROBE] Index 1: Value (13) != Target (17). Advancing ptr...");
      if (next === 3) appendLog("[PROBE] Index 2: Value (4) != Target (17). Advancing ptr...");
      if (next === 4) appendLog("[PROBE] Index 3: Value (17) == Target (17). Match confirmed.");
      if (next === 5) appendLog("[RETURN] Objective acquired at index 3. Returning pointer location.");
      if (next === 6) appendLog("[TERMINATE] Search sequence halted successfully.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> SYSTEM RESET: Search pointer relocated to Index 0."]);
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

export function LinearSearchVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const arr = [6, 13, 4, 17, 8];
  const target = 17;

  let activeIdx = -1;
  let isFound = false;
  if (step === 1) activeIdx = 0;
  if (step === 2) activeIdx = 1;
  if (step === 3) activeIdx = 2;
  if (step >= 4) { activeIdx = 3; isFound = true; }

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
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          {step === 0 && "Linear Search sequentially checks each element until a match is found."}
          {step === 1 && "Check index 0. Value is 6. Does not match 17."}
          {step === 2 && "Check index 1. Value is 13. Does not match 17."}
          {step === 3 && "Check index 2. Value is 4. Does not match 17."}
          {step === 4 && "Check index 3. Value is 17. Match found!"}
          {step === 5 && "Return the current index (3)."}
          {step === 6 && "Operation successfully terminated. O(N) worst-case time complexity."}
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
              className="absolute left-[-24px] right-[-24px] bg-blue-500/10 border-l-[3px] border-blue-500 pointer-events-none z-0"
              initial={{ top: 0, opacity: 0, height: 36 }}
              animate={{
                top: step === 0 ? 0 :
                     (step >= 1 && step <= 4) ? 16 + 36 * 1 :
                     step === 5 ? 16 + 36 * 3 :
                     step === 6 ? 16 + 36 * 6 :
                     16 + 36 * 5,
                 height: (step >= 1 && step <= 4) ? 36 * 2 : 36,
                opacity: step === 0 ? 0 : 1,
                boxShadow: step > 0 ? "0 0 20px hsla(var(--blue-500), 0.2) inset" : "none"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />

            <div className="relative z-10 flex flex-col gap-[12px]">
              <div className="h-[24px] flex items-center text-foreground"><span className="text-purple-400">function</span> <span className="text-blue-400">linearSearch</span>(arr, target) {"{"}</div>
              <div className={`h-[24px] flex items-center pl-4 ${(step >= 1 && step <= 4) ? "text-blue-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">for</span> (<span className="text-purple-400">let</span> i = <span className="text-yellow-300">0</span>; i &lt; arr.<span className="text-emerald-400">length</span>; i++) {"{"}</div>
              <div className={`h-[24px] flex items-center pl-8 ${(step >= 1 && step <= 4) ? "text-blue-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">if</span> (arr[i] === target) {"{"}</div>
              <div className={`h-[24px] flex items-center pl-12 ${step === 5 ? "text-emerald-500 font-bold shadow-[0_0_10px_currentColor] bg-emerald-500/10 rounded px-2 w-max" : "text-muted-foreground/60 transition-opacity"}`}><span className="text-purple-400">return</span> i;</div>
              <div className={`h-[24px] flex items-center pl-8 ${(step >= 1 && step <= 4) ? "text-blue-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}>{"}"}</div>
              <div className={`h-[24px] flex items-center pl-4 ${(step >= 1 && step <= 4) ? "text-blue-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}>{"}"}</div>
              <div className={`h-[24px] flex items-center pl-4 text-muted-foreground/60`}><span className="text-purple-400">return</span> -<span className="text-yellow-300">1</span>;</div>
              <div className="h-[24px] flex items-center text-foreground">{"}"}</div>
            </div>
          </div>
        </div>

        {/* Array Visualization Panel */}
        <div className="flex-[2] bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex flex-col items-center justify-center overflow-hidden min-h-[400px]">

          <div className="absolute top-6 left-6 flex items-center gap-3">
             <div className="px-3 py-1 rounded bg-card/60 border text-[10px] font-black uppercase text-blue-500 tracking-widest shadow-inner">
               Target Objective : {target}
             </div>
          </div>

          {/* Array Container */}
          <div className="relative z-10 w-full flex justify-center gap-2 mt-12 mb-16">
             {arr.map((val, i) => {
               const isCurrent = activeIdx === i;
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
                 <div key={`ls-cell-${i}`} className="flex flex-col items-center relative min-w-[50px] md:min-w-[64px] lg:min-w-[80px]">

                   {/* Scanning Pointer */}
                   <AnimatePresence>
                      {isCurrent && (
                        <motion.div initial={{ opacity: 0, scale: 0.5, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5, y: -20 }} className={`absolute -top-16 flex flex-col items-center ${isFound ? 'text-emerald-500' : 'text-blue-500'}`}>
                           <span className={`font-bold text-[10px] tracking-widest bg-card border px-2 py-0.5 rounded shadow-[0_0_10px_currentColor] ${isFound ? 'border-emerald-500/30' : 'border-blue-500/30'}`}>
                              SCAN PTR
                           </span>
                           <motion.div
                              className={`w-0.5 h-6 mt-1 rounded-full ${isFound ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              animate={{ scaleY: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                              style={{ transformOrigin: 'top' }}
                           />
                           {/* Scanner line indicator */}
                           <div className="absolute -bottom-16 w-[120px] h-[1px] bg-gradient-to-r from-transparent via-current to-transparent opacity-50 pointer-events-none" />
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
                       opacity: (step > 0 && i < activeIdx) ? 0.4 : 1 // Dim past elements
                     }}
                     transition={{ type: "spring", stiffness: 300, damping: 20 }}
                     className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center text-xl md:text-2xl lg:text-3xl font-black rounded-lg border-2 relative overflow-hidden`}
                   >
                     {/* Scanning Effect */}
                     {isCurrent && !isFound && (
                       <motion.div
                         className="absolute inset-x-0 h-1 bg-blue-400/60 blur-sm"
                         animate={{ top: ['-20%', '120%'] }}
                         transition={{ duration: 1, repeat: Infinity }}
                       />
                     )}

                     {/* Success Pulse */}
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

                   {/* Subscript Index */}
                   <div className="mt-4 text-xs font-mono font-bold text-muted-foreground/80">
                     idx: {i}
                   </div>

                 </div>
               );
             })}

             {/* Dimming overlay over past elements represented via individual component opacity */}
          </div>
        </div>
      </div>
    </div>
  );
}
