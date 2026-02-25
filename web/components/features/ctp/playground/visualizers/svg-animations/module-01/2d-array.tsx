"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function use2DArraySim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: 2D Matrix memory allocated. Dimensions: 3x3",
    "> [AWAITING COMMAND] >> initiating parallel row scan for MAX_VALUE extraction."
  ]);
  const maxSteps = 4;

  const appendLog = useCallback((msg: string) => setLogs(p => [`> ${msg}`, ...p]), []);

  const peek = useCallback(() => {
    setStep(p => {
      const next = p >= maxSteps ? 1 : p + 1;
      if (next === 1) appendLog("[SCAN] Row 0 processing... Local MAX: 4. Global MAX updated: 4.");
      if (next === 2) appendLog("[SCAN] Row 1 processing... Local MAX: 9. Global MAX updated: 9.");
      if (next === 3) appendLog("[SCAN] Row 2 processing... Local MAX: 8. Global MAX unchanged: 9.");
      if (next === 4) appendLog("[TERMINATE] Matrix sweep complete. Final MAX_VALUE constraint confirmed at 9.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> SYSTEM RESET: Matrix scanner deactivated. Global MAX purged."]);
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

export function TwoDArrayVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const gridData = [
    [1, 4, 2],
    [5, 9, 3],
    [8, 6, 7]
  ];

  let currentMax = -Infinity;
  if (step >= 1) currentMax = 4;
  if (step >= 2) currentMax = 9;

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
          {step === 0 && "2D Arrays require nested loops (O(N*M)) to visit every cell."}
          {step === 1 && "Outer loop: row 0. Inner loop scans cols 0-2. Max found: 4."}
          {step === 2 && "Outer loop: row 1. Inner loop finds 9, which replaces 4 as the new max."}
          {step === 3 && "Outer loop: row 2. Inner loop finds 8, but 9 remains the highest."}
          {step === 4 && "Traversal finished. The nested routines exit and return the max value."}
        </p>
      </motion.div>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 relative items-stretch z-10 w-full overflow-x-auto min-w-0">

        {/* Code Execution Panel */}
        <div className="flex-[3] min-w-[300px] bg-[#0d1117]/90 backdrop-blur-md rounded-2xl p-6 font-mono text-xs md:text-sm leading-relaxed border border-border shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold flex-1 text-center">Execution Context</span>
          </div>

          <div className="relative text-base h-full flex flex-col justify-center">
             {/* Active Highlight Background */}
             <motion.div
              className="absolute left-[-24px] right-[-24px] bg-primary/10 border-l-[3px] border-primary pointer-events-none z-0"
              initial={{ top: 0, opacity: 0, height: 36 }}
              animate={{
                top: step === 0 ? 0 : step === 4 ? 208 : 36 * 1.5,
                height: step === 0 ? 0 : step === 4 ? 36 : 36 * 4,
                opacity: step === 0 ? 0 : 1,
                boxShadow: step > 0 ? "0 0 20px hsla(var(--primary), 0.2) inset" : "none"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />

            <div className="relative z-10 flex flex-col gap-3">
              <div className="text-muted-foreground/60">
                <span className="text-blue-400">let</span> max = <span className="text-yellow-300">-Infinity</span>;
              </div>
              <div className={step >= 1 && step <= 3 ? "text-primary font-bold" : "text-muted-foreground/60 transition-opacity"}>
                <span className="text-purple-400">for</span> (<span className="text-blue-400">let</span> i = 0; i &lt; grid.length; i++) {"{"}
              </div>
              <div className={`pl-4 ${step >= 1 && step <= 3 ? "text-emerald-400 font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                <span className="text-purple-400">for</span> (<span className="text-blue-400">let</span> j = 0; j &lt; grid[i].length; j++) {"{"}
              </div>
              <div className={`pl-8 ${step >= 1 && step <= 3 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                 <span className="text-purple-400">if</span> (grid[i][j] &gt; max) max = grid[i][j];
              </div>
              <div className={`pl-4 ${step >= 1 && step <= 3 ? "text-emerald-400 font-bold" : "text-muted-foreground/60 transition-opacity"}`}>{"}"}</div>
              <div className={step >= 1 && step <= 3 ? "text-primary font-bold" : "text-muted-foreground/60 transition-opacity"}>{"}"}</div>
              <div className={step === 4 ? "text-emerald-400 font-bold" : "text-muted-foreground/60 transition-opacity"}>
                <span className="text-purple-400">return</span> max; <span className="text-muted-foreground text-xs ml-2">// Returns {step === 4 ? currentMax : '-Infinity'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Visualization Panel */}
        <div className="flex-[4] bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex gap-6 md:gap-12 items-center justify-center overflow-hidden min-h-[350px]">
          {/* Decorative Matrix Lines */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             {[...Array(10)].map((_, i) => (
                <div key={i} className="absolute h-[1px] bg-primary w-full" style={{ top: `${i * 10}%` }} />
             ))}
             {[...Array(10)].map((_, i) => (
                <div key={`v${i}`} className="absolute w-[1px] bg-primary h-full" style={{ left: `${i * 10}%` }} />
             ))}
          </div>

          <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted px-4 py-1 rounded-full absolute top-6 right-6 z-10 border border-border shadow-inner">
            ADDR: 0x9F00
          </div>

          <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted px-4 py-1 rounded-full absolute bottom-6 left-6 z-10 border border-border shadow-inner">
             GLOBAL MAX: <span className={step > 0 ? "text-primary" : "text-muted-foreground"}>{step === 0 ? '-∞' : currentMax}</span>
          </div>

          <div className="relative z-10 flex flex-col gap-2">
            {/* Column Headers */}
            <div className="flex pl-8 md:pl-10 mb-2 gap-2">
               {[0, 1, 2].map(j => (
                  <div key={`col-${j}`} className="w-12 h-6 md:w-16 flex justify-center text-[10px] font-black text-muted-foreground/60">
                    col {j}
                  </div>
               ))}
            </div>

            {gridData.map((row, i) => {
              const isActiveRow = step === i + 1;
              const isPastRow = step > i + 1;

              return (
                <div key={`row-${i}`} className="flex items-center gap-2 md:gap-4 relative">
                  {/* Row Header */}
                  <div className="w-6 md:w-10 flex justify-center">
                     <span className={`text-[10px] font-black uppercase ${isActiveRow ? "text-primary" : "text-muted-foreground/60"}`}>i={i}</span>
                  </div>

                  {/* Row Highlight Box */}
                  <AnimatePresence>
                     {isActiveRow && (
                        <motion.div
                           initial={{ opacity: 0, scaleY: 0.8 }}
                           animate={{ opacity: 1, scaleY: 1 }}
                           exit={{ opacity: 0, scaleY: 0.8 }}
                           className="absolute left-8 lg:left-10 md:left-14 right-[-10px] top-[-5px] bottom-[-5px] bg-primary/10 border border-primary/30 rounded-lg pointer-events-none z-0"
                        />
                     )}
                  </AnimatePresence>

                  <div className="flex gap-2 relative z-10">
                    {row.map((val, j) => {
                      let bgColor = "hsl(var(--card)/0.8)";
                      let borderColor = "hsl(var(--border))";
                      let textColor = "hsl(var(--card-foreground))";
                      let shadow = "none";
                      let isMaxHighlight = false;

                      if (isActiveRow) {
                         bgColor = "hsl(var(--primary)/0.2)";
                         borderColor = "hsl(var(--primary))";
                         textColor = "hsl(var(--primary))";
                      } else if (isPastRow) {
                         bgColor = "hsl(var(--muted)/0.5)";
                         textColor = "hsl(var(--muted-foreground)/0.5)";
                      }

                      // Highlight current max cell in the historical view too
                      if ((step === 1 && i===0 && j===1) ||
                          (step >= 2 && i===1 && j===1)) {
                          isMaxHighlight = true;
                          borderColor = "hsl(var(--emerald-500))";
                          textColor = "hsl(var(--emerald-500))";
                          shadow = "0 0 20px hsla(var(--emerald-500), 0.4)";
                      }

                      return (
                        <motion.div
                          key={`cell-${i}-${j}`}
                          animate={{
                            backgroundColor: bgColor,
                            borderColor: borderColor,
                            color: textColor,
                            boxShadow: shadow,
                            scale: isMaxHighlight && (step === i + 1) ? 1.1 : 1
                          }}
                          transition={{ duration: 0.4 }}
                          className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-xl md:text-2xl font-black rounded-lg border-2 relative overflow-hidden`}
                        >
                          {/* Scan line effect inside active row cells */}
                          {isActiveRow && (
                             <motion.div
                               className="absolute inset-y-0 w-1 bg-primary/40 blur-sm"
                               animate={{ left: ['-20%', '120%'] }}
                               transition={{ duration: 1.5, repeat: Infinity, delay: j * 0.2 }}
                             />
                          )}
                          {val}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
