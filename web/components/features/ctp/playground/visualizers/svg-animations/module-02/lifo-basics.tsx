"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useLifoBasicsSim() {
  const [stack, setStack] = useState<number[]>([10, 20, 30]);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Stack Data Structure — LIFO Protocol",
    "> [AWAITING COMMAND] >> Interact with the Stack using Push, Pop, or Peek."
  ]);
  const maxSize = 6;

  const appendLog = useCallback((msg: string) => {
    setLogs(l => [`> ${msg}`, ...l]);
  }, []);

  const push = useCallback(() => {
    setStack(prev => {
      if (prev.length >= maxSize) {
        appendLog("[OVERFLOW] Stack Overflow! Cannot push to a full stack.");
        return prev;
      }
      const val = Math.floor(Math.random() * 90) + 10;
      appendLog(`[PUSH] Pushing ${val} onto the top of the stack. New size: ${prev.length + 1}.`);
      return [...prev, val];
    });
  }, [appendLog]);

  const pop = useCallback(() => {
    setStack(prev => {
      if (prev.length === 0) {
        appendLog("[UNDERFLOW] Stack Underflow! Cannot pop from an empty stack.");
        return prev;
      }
      const val = prev[prev.length - 1];
      appendLog(`[POP] Popped ${val} from the top. New size: ${prev.length - 1}.`);
      return prev.slice(0, -1);
    });
  }, [appendLog]);

  const peek = useCallback(() => {
    setStack(prev => {
      if (prev.length === 0) {
        appendLog("[PEEK] Stack is empty. No top element.");
        return prev;
      }
      appendLog(`[PEEK] Top element = ${prev[prev.length - 1]}. Stack unchanged.`);
      return prev;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStack([10, 20, 30]);
    setLogs(["> SYSTEM RESET: Stack flushed. Initial state restored."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { stack },
      logs,
      handlers: { push, pop, peek, reset, clear: reset }
    }
  };
}

export function LifoBasicsVisualizer({ data }: { data: { stack: number[] } }) {
  const { stack } = data;
  const maxSize = 6;

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

      {/* Narrative Info Header */}
      <motion.div
        className="w-full max-w-4xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-[0_0_30px_hsla(var(--primary),0.05)]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          Stack operates on <span className="font-bold text-cyan-500">LIFO</span> — Last In, First Out. The last element pushed is always the first to be popped.
        </p>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground border border-border rounded px-3 py-1 bg-muted/40">
          <span>Size: {stack.length}/{maxSize}</span>
        </div>
      </motion.div>

      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 z-10 items-center justify-center">

        {/* Stack Visualization */}
        <div className="flex flex-col items-center gap-2 min-w-[180px]">

          {/* Top label and PUSH arrow */}
          <div className="flex flex-col items-center mb-2 text-cyan-500">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
             <span className="text-[10px] font-black uppercase tracking-widest">PUSH / POP (Top)</span>
          </div>

          {/* Stack Slots */}
          <div className="flex flex-col-reverse gap-1 relative">
            {/* Empty Slots */}
            {Array.from({ length: maxSize }).map((_, i) => {
               const val = stack[i];
               const isTop = val !== undefined && i === stack.length - 1;
               return (
                 <motion.div
                   key={`slot-${i}`}
                   className={`w-40 h-14 rounded-lg border-2 flex items-center justify-between px-4 relative overflow-hidden
                     ${val !== undefined ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-border/30 bg-card/20'}`}
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: i * 0.05 }}
                 >
                   {/* Scanning highlight for new top */}
                   {isTop && (
                     <motion.div className="absolute inset-0 bg-cyan-500/10" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                   )}

                   {val !== undefined ? (
                     <>
                       <span className="text-muted-foreground/60 text-[10px] font-mono">[{i}]</span>
                       <span className={`text-xl font-black z-10 ${isTop ? 'text-cyan-500' : 'text-foreground'}`}>{val}</span>
                       {isTop && <span className="text-[9px] font-black text-cyan-500 bg-cyan-500/20 px-1 py-0.5 rounded uppercase tracking-widest z-10">TOP</span>}
                     </>
                   ) : (
                     <span className="text-muted-foreground/30 text-xs w-full text-center uppercase tracking-widest">— empty —</span>
                   )}

                   {/* Stack boundary bar */}
                   <div className="absolute left-0 top-0 h-full w-1 bg-cyan-500/30 rounded-l-lg" />
                 </motion.div>
               );
             })}
          </div>

          {/* Stack Base Plate */}
          <div className="w-44 h-3 bg-card border-2 border-border rounded-b-lg shadow-inner" />
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Stack Base (Bottom)</span>
        </div>

        {/* Info Panel */}
        <div className="flex-1 flex flex-col gap-4 max-w-sm md:max-w-none">

          {/* Key Operations */}
          <div className="bg-[#0d1117]/80 backdrop-blur-md rounded-2xl p-6 border border-border shadow-2xl text-sm font-mono flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest">Stack Operations</span>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <code className="text-cyan-500 font-bold">push(val)</code>
                <span className="text-muted-foreground text-xs">Add to top — O(1)</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-orange-500/10 rounded-lg border border-orange-500/30">
                <code className="text-orange-500 font-bold">pop()</code>
                <span className="text-muted-foreground text-xs">Remove from top — O(1)</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <code className="text-purple-500 font-bold">peek()</code>
                <span className="text-muted-foreground text-xs">Read top — O(1)</span>
              </div>
            </div>
          </div>

          {/* LIFO Analogy */}
          <div className="bg-card/50 backdrop-blur rounded-2xl p-5 border border-border flex gap-3 items-start">
            <div className="text-2xl mt-1">📚</div>
            <div>
              <p className="text-sm font-bold text-foreground mb-1">Real-world Analogy</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Like a stack of plates — you can only add or remove from the <strong>top</strong>. Undo/Redo, browser history, and function call stacks all follow this pattern.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
