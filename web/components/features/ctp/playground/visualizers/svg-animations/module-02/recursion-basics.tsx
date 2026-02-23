"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CallFrame = { id: number; n: number; status: 'active' | 'returning' | 'done' };

export function useRecursionBasicsSim() {
  const [step, setStep] = useState(0);
  const [callStack, setCallStack] = useState<CallFrame[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Recursion Call Stack Inspector",
    "> [AWAIT] Simulating: factorial(4). Each step pushes/pops a call frame."
  ]);
  const maxSteps = 8;

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const peek = useCallback(() => {
    setStep(prev => {
      const next = prev >= maxSteps ? 1 : prev + 1;
      if (next === 1) { setCallStack([{ id: 1, n: 4, status: 'active' }]); appendLog("[CALL] factorial(4) → Evaluating... Needs factorial(3)."); }
      if (next === 2) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'active' }]); appendLog("[CALL] factorial(3) → Evaluating... Needs factorial(2)."); }
      if (next === 3) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'active' }, { id: 3, n: 2, status: 'active' }]); appendLog("[CALL] factorial(2) → Evaluating... Needs factorial(1)."); }
      if (next === 4) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'active' }, { id: 3, n: 2, status: 'active' }, { id: 4, n: 1, status: 'active' }]); appendLog("[BASE] factorial(1) → BASE CASE REACHED! Returns 1."); }
      if (next === 5) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'active' }, { id: 3, n: 2, status: 'returning' }]); appendLog("[RETURN] factorial(2): 2 × 1 = 2. Frame popped. Returning 2 to factorial(3)."); }
      if (next === 6) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'returning' }]); appendLog("[RETURN] factorial(3): 3 × 2 = 6. Frame popped. Returning 6 to factorial(4)."); }
      if (next === 7) { setCallStack([{ id: 1, n: 4, status: 'done' }]); appendLog("[RETURN] factorial(4): 4 × 6 = 24. Final result: 24."); }
      if (next === 8) { setCallStack([]); appendLog("[COMPLETE] All frames resolved. factorial(4) = 24 ✓."); }
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0); setCallStack([]);
    setLogs(["> SYSTEM RESET: Call stack cleared. Ready for new execution."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step, callStack },
      logs,
      handlers: { peek, reset, clear: reset }
    }
  };
}

export function RecursionBasicsVisualizer({ data }: { data: { step: number, callStack: CallFrame[] } }) {
  const { step, callStack } = data;

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono rounded-xl py-8 gap-8 px-4">
      <CyberGrid />

      <motion.div className="w-full max-w-4xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          {step === 0 && "Recursion requires a base case and a recursive case. Each call creates a new stack frame."}
          {step >= 1 && step <= 4 && <><span className="text-purple-500 font-bold">Winding Phase:</span> Recursive calls accumulate on the call stack.</>}
          {step >= 5 && step <= 7 && <><span className="text-emerald-500 font-bold">Unwinding Phase:</span> Base case hit — frames resolve and return values propagate back.</>}
          {step === 8 && <><span className="text-cyan-500 font-bold">Complete!</span> factorial(4) = 24. All frames resolved.</>}
        </p>
      </motion.div>

      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 z-10 items-stretch">

        {/* Code Panel */}
        <div className="flex-1 bg-[#0d1117]/90 backdrop-blur-md rounded-2xl p-6 border border-border shadow-2xl font-mono text-sm flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-3 h-3 rounded-full bg-destructive/80" /><div className="w-3 h-3 rounded-full bg-yellow-500/80" /><div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest">stack_frame.py</span>
          </div>
          <div className="flex flex-col gap-2 relative">
            {/* Highlight bar */}
            <motion.div className="absolute left-[-24px] right-[-24px] h-[28px] bg-purple-500/10 border-l-[3px] border-purple-500 z-0 pointer-events-none"
              initial={{ top: 0, opacity: 0 }}
              animate={{
                top: step >= 1 && step <= 4 ? 0 : step >= 5 ? 28 * 3 : 0,
                opacity: step > 0 ? 1 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <div className={`h-7 flex items-center text-foreground relative z-10`}><span className="text-purple-400">def</span> <span className="text-blue-400">factorial</span>(n):</div>
            <div className={`h-7 flex items-center pl-4 relative z-10 ${step >= 1 && step <= 4 ? 'text-purple-400 font-bold' : 'text-muted-foreground/60'}`}><span className="text-purple-400">if</span> n == 1: <span className="text-emerald-400">{"  # BASE CASE"}</span></div>
            <div className={`h-7 flex items-center pl-8 relative z-10 ${step === 4 ? 'text-emerald-500 font-bold' : 'text-muted-foreground/60'}`}><span className="text-purple-400">return</span> 1</div>
            <div className={`h-7 flex items-center pl-4 relative z-10 ${step >= 5 && step <= 7 ? 'text-cyan-500 font-bold' : 'text-muted-foreground/60'}`}><span className="text-purple-400">return</span> n * <span className="text-blue-400">factorial</span>(n - 1)</div>
          </div>

          <div className="mt-auto pt-4 border-t border-border/50">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-2">Call Result</div>
            {step >= 7 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-3xl font-black text-cyan-500 drop-shadow-[0_0_15px_currentColor]">
                factorial(4) = 24
              </motion.div>
            )}
            {step === 0 && <div className="text-muted-foreground text-xs">Awaiting execution...</div>}
          </div>
        </div>

        {/* Call Stack Panel */}
        <div className="flex flex-col items-center min-w-[200px]">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-4 bg-muted px-4 py-1 rounded-full border border-border">Call Stack (Runtime)</div>

          {/* TOP label */}
          <div className="flex flex-col items-center text-muted-foreground/50 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            <span className="text-[9px] uppercase tracking-widest">PUSH / POP</span>
          </div>

          {/* Stack frames */}
          <div className="flex flex-col-reverse gap-1.5 w-full">
            <AnimatePresence>
              {callStack.map((frame) => (
                <motion.div key={`frame-${frame.id}`}
                  initial={{ opacity: 0, x: 40, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -40, scale: 0.9 }}
                  className={`w-full h-14 rounded-lg border-2 flex items-center justify-between px-4 relative overflow-hidden
                    ${frame.status === 'active' ? 'border-purple-500/60 bg-purple-500/10' :
                      frame.status === 'returning' ? 'border-emerald-500/60 bg-emerald-500/10' :
                      'border-cyan-500/60 bg-cyan-500/10'}`}
                >
                  <span className="font-bold text-sm">factorial({frame.n})</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded
                    ${frame.status === 'active' ? 'text-purple-500 bg-purple-500/20' :
                      frame.status === 'returning' ? 'text-emerald-500 bg-emerald-500/20' :
                      'text-cyan-500 bg-cyan-500/20'}`}>
                    {frame.status === 'active' ? 'Running' : frame.status === 'returning' ? '← Return' : 'Done'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {callStack.length === 0 && step > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground text-xs mt-2 py-4 px-4 border border-border/30 rounded-lg">
              Stack empty — all frames resolved!
            </motion.div>
          )}
          {step === 0 && <div className="text-center text-muted-foreground/30 text-xs mt-2">Stack empty</div>}

          {/* Bottom plate */}
          <div className="w-full h-2 bg-card border-2 border-border rounded-b mt-1" />
        </div>
      </div>
    </div>
  );
}
