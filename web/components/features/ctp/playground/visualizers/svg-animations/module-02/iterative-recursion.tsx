"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useIterativeRecursionSim() {
  const [step, setStep] = useState(0);
  const [explicitStack, setExplicitStack] = useState<number[]>([]);
  const [result, setResult] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Recursive → Iterative Conversion",
    "> [AWAIT] Converting recursive DFS traversal to iterative with an explicit stack."
  ]);
  const maxSteps = 7;

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const peek = useCallback(() => {
    setStep(prev => {
      const next = prev >= maxSteps ? 1 : prev + 1;
      if (next === 1) { setExplicitStack([1]); setResult([]); appendLog("[INIT] Push root node (1) onto explicit stack."); }
      if (next === 2) { setExplicitStack([2, 3]); setResult([1]); appendLog("[POP] Pop 1, visit it. Push children: [2, 3]."); }
      if (next === 3) { setExplicitStack([2, 4, 5]); setResult([1, 3]); appendLog("[POP] Pop 3 (LIFO!), visit. Push children: [4, 5]."); }
      if (next === 4) { setExplicitStack([2, 4]); setResult([1, 3, 5]); appendLog("[POP] Pop 5. No children. Visit 5."); }
      if (next === 5) { setExplicitStack([2]); setResult([1, 3, 5, 4]); appendLog("[POP] Pop 4. No children. Visit 4."); }
      if (next === 6) { setExplicitStack([6, 7]); setResult([1, 3, 5, 4, 2]); appendLog("[POP] Pop 2, visit it. Push children: [6, 7]."); }
      if (next === 7) { setExplicitStack([]); setResult([1, 3, 5, 4, 2, 7, 6]); appendLog("[DONE] Stack empty. DFS complete. Result order matches recursive DFS!"); }
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0); setExplicitStack([]); setResult([]);
    setLogs(["> SYSTEM RESET: Stack and result cleared."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step, explicitStack, result },
      logs,
      handlers: { peek, reset, clear: reset }
    }
  };
}

export function IterativeRecursionVisualizer({ data }: { data: { step: number, explicitStack: number[], result: number[] } }) {
  const { step, explicitStack, result } = data;

  // Simple tree for display
  const TREE = [
    { id: 1, x: 200, y: 40, left: 2, right: 3 },
    { id: 2, x: 120, y: 100, left: 6, right: 7 },
    { id: 3, x: 280, y: 100, left: 4, right: 5 },
    { id: 6, x: 90, y: 160 },
    { id: 7, x: 150, y: 160 },
    { id: 4, x: 250, y: 160 },
    { id: 5, x: 310, y: 160 },
  ];

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-10">
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono rounded-xl py-6 gap-6 px-4">
      <CyberGrid />

      <motion.div className="w-full max-w-4xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          Recursive DFS can be converted to iterative using an <span className="text-blue-500 font-bold">explicit stack</span>. This avoids call stack overflow for deep trees and makes the stack usage explicit.
        </p>
      </motion.div>

      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 z-10 items-center justify-center">

        {/* Tree SVG */}
        <div className="bg-card/40 rounded-2xl border border-border p-4 flex-1 flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-3">Input Tree</div>
          <svg width="100%" viewBox="0 0 400 200" className="max-w-xs">
            {/* Edges */}
            <line x1="200" y1="52" x2="120" y2="88" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <line x1="200" y1="52" x2="280" y2="88" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <line x1="120" y1="112" x2="90" y2="148" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <line x1="120" y1="112" x2="150" y2="148" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <line x1="280" y1="112" x2="250" y2="148" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <line x1="280" y1="112" x2="310" y2="148" stroke="hsl(var(--border))" strokeWidth="1.5" />

            {TREE.map(n => {
              const isVisited = result.includes(n.id);
              const isInStack = explicitStack.includes(n.id);
              return (
                <g key={`tr-${n.id}`}>
                  <circle cx={n.x} cy={n.y} r={16}
                    fill={isVisited ? "hsl(var(--emerald-500)/0.25)" : isInStack ? "hsl(var(--blue-500)/0.2)" : "hsl(var(--card))"}
                    stroke={isVisited ? "hsl(var(--emerald-500))" : isInStack ? "hsl(var(--blue-500))" : "hsl(var(--border))"}
                    strokeWidth={isInStack || isVisited ? 2.5 : 1.5}
                    style={{ filter: isInStack ? 'drop-shadow(0 0 6px hsl(var(--blue-500)))' : isVisited ? 'drop-shadow(0 0 4px hsl(var(--emerald-500)))' : 'none' }}
                  />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="10" fontWeight="bold"
                    fill={isVisited ? "hsl(var(--emerald-500))" : isInStack ? "hsl(var(--blue-500))" : "hsl(var(--muted-foreground))"}>
                    {n.id}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="flex gap-4 mt-2 text-xs font-bold text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-blue-500/20" /><span>In stack</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-emerald-500/20" /><span>Visited</span></div>
          </div>
        </div>

        {/* Explicit Stack display */}
        <div className="flex flex-col items-center gap-3 min-w-[160px]">
          <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">Explicit Stack</div>

          <div className="flex flex-col-reverse gap-1 w-full min-h-[160px]">
            <AnimatePresence>
              {explicitStack.map((n, i) => (
                <motion.div key={`es-${n}`}
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  className="h-10 rounded-lg border-2 border-blue-500/60 bg-blue-500/10 flex items-center justify-between px-4"
                >
                  <span className="text-blue-500 font-black">Node {n}</span>
                  {i === explicitStack.length - 1 && <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/20 px-1.5 rounded">TOP</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {explicitStack.length === 0 && step > 0 && <div className="text-xs text-muted-foreground/40">Empty</div>}
          <div className="w-full h-2 bg-card border-2 border-border rounded" />
        </div>

        {/* Traversal Result */}
        <div className="flex flex-col items-center gap-3 min-w-[160px]">
          <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">Visit Order</div>

          <div className="flex flex-col gap-1 w-full">
            <AnimatePresence>
              {result.map((n, i) => (
                <motion.div key={`res-${i}-${n}`}
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="h-10 rounded-lg border-2 border-emerald-500/60 bg-emerald-500/10 flex items-center justify-between px-4"
                >
                  <span className="text-emerald-500 font-black">Node {n}</span>
                  <span className="text-[9px] font-black text-emerald-500/60">#{i + 1}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {result.length === 0 && <div className="text-xs text-muted-foreground/40">No visits yet</div>}
        </div>
      </div>
    </div>
  );
}
