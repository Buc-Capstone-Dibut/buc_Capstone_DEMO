"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

type TreeNode = { id: number; label: string; depth: number; x: number; y: number; left?: number; right?: number; status: 'idle' | 'active' | 'done' };

// Fibonacci call tree for fib(4)
const TREE_NODES: TreeNode[] = [
  { id: 0, label: 'fib(4)', depth: 0, x: 200, y: 30,  left: 1, right: 2, status: 'idle' },
  { id: 1, label: 'fib(3)', depth: 1, x: 100, y: 90,  left: 3, right: 4, status: 'idle' },
  { id: 2, label: 'fib(2)', depth: 1, x: 300, y: 90,  left: 5, right: 6, status: 'idle' },
  { id: 3, label: 'fib(2)', depth: 2, x: 50,  y: 150, left: 7, right: 8, status: 'idle' },
  { id: 4, label: 'fib(1)', depth: 2, x: 150, y: 150, status: 'idle' },
  { id: 5, label: 'fib(1)', depth: 2, x: 250, y: 150, status: 'idle' },
  { id: 6, label: 'fib(0)', depth: 2, x: 350, y: 150, status: 'idle' },
  { id: 7, label: 'fib(1)', depth: 3, x: 20,  y: 210, status: 'idle' },
  { id: 8, label: 'fib(0)', depth: 3, x: 80,  y: 210, status: 'idle' },
];

// Step sequence (node id to light up)
const STEPS = [0, 1, 3, 7, 8, 4, 2, 5, 6];

export function useRecursionAnalysisSim() {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Recursive Call Tree Analysis",
    "> [AWAIT] Tracing fib(4) call tree. Visualizing redundant sub-calls."
  ]);

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const peek = useCallback(() => {
    setStep(prev => {
      const next = prev >= STEPS.length ? 1 : prev + 1;
      const nodeId = STEPS[next - 1];
      setActiveNodes(an => [...an, nodeId]);
      const n = TREE_NODES[nodeId];
      if (n.label.startsWith('fib(4)')) appendLog("[CALL] fib(4) → expanding.. requires fib(3) + fib(2).");
      else if (n.label.startsWith('fib(3)')) appendLog("[CALL] fib(3) → requires fib(2) + fib(1).");
      else if (n.label === 'fib(2)' && nodeId === 2) appendLog("[CALL] fib(2) [DUPLICATE] → requires fib(1) + fib(0). Already solved above!");
      else if (n.label === 'fib(2)' && nodeId === 3) appendLog("[CALL] fib(2) → requires fib(1) + fib(0).");
      else if (n.label.startsWith('fib(1)')) appendLog(`[BASE] ${n.label} = 1. Returns immediately.`);
      else if (n.label.startsWith('fib(0)')) appendLog(`[BASE] ${n.label} = 0. Returns immediately.`);
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0); setActiveNodes([]);
    setLogs(["> SYSTEM RESET: Call tree cleared."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { activeNodes, step },
      logs,
      handlers: { peek, reset, clear: reset }
    }
  };
}

export function RecursionAnalysisVisualizer({ data }: { data: { activeNodes: number[], step: number } }) {
  const { activeNodes, step } = data;

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-10">
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
    </div>
  );

  const edges = TREE_NODES.flatMap(n => {
    const res = [];
    if (n.left !== undefined) {
      const child = TREE_NODES[n.left];
      res.push({ x1: n.x, y1: n.y + 12, x2: child.x, y2: child.y - 12, isDuplicate: child.label === 'fib(2)' && child.id === 2 });
    }
    if (n.right !== undefined) {
      const child = TREE_NODES[n.right];
      res.push({ x1: n.x, y1: n.y + 12, x2: child.x, y2: child.y - 12, isDuplicate: false });
    }
    return res;
  });

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono rounded-xl py-6 gap-6 px-4">
      <CyberGrid />

      <motion.div className="w-full max-w-4xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          The plain recursive Fibonacci performs <span className="text-orange-500 font-bold">redundant calculations</span> — fib(2) is computed twice! This demonstrates why memoization is critical for exponential-time recursion.
        </p>
      </motion.div>

      {/* Call Tree SVG */}
      <div className="flex-1 w-full max-w-4xl z-10 bg-card/40 backdrop-blur rounded-2xl border border-border p-4 flex flex-col items-center">
        <svg width="100%" viewBox="0 0 400 240" className="w-full max-w-lg">
          {/* Edges */}
          {edges.map((e, i) => (
            <line key={`edge-${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray={e.isDuplicate ? "4 4" : "0"} />
          ))}

          {/* Nodes */}
          {TREE_NODES.map(n => {
            const isActive = activeNodes.includes(n.id);
            const isDuplicate = n.label === 'fib(2)' && n.id === 2;
            return (
              <g key={`node-${n.id}`}>
                <motion.circle cx={n.x} cy={n.y} r={18}
                  fill={!isActive ? "hsl(var(--card))" : isDuplicate ? "hsl(var(--orange-500)/0.25)" : "hsl(var(--cyan-500)/0.25)"}
                  stroke={!isActive ? "hsl(var(--border))" : isDuplicate ? "hsl(var(--orange-500))" : "hsl(var(--cyan-500))"}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: isActive ? 1 : 0.8, opacity: isActive ? 1 : 0.4 }}
                  style={{ filter: isActive ? `drop-shadow(0 0 8px ${isDuplicate ? 'hsl(var(--orange-500))' : 'hsl(var(--cyan-500))'})` : 'none' }}
                />
                <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="7" fontWeight="bold"
                  fill={!isActive ? "hsl(var(--muted-foreground))" : isDuplicate ? "hsl(var(--orange-500))" : "hsl(var(--cyan-500))"}>
                  {n.label}
                </text>
                {isDuplicate && isActive && (
                  <text x={n.x} y={n.y - 24} textAnchor="middle" fontSize="7" fontWeight="bold" fill="hsl(var(--orange-500))">DUPLICATE!</text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex gap-6 mt-2 text-xs font-bold text-muted-foreground">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-500/50 border border-cyan-500" /><span>Normal call</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500/50 border border-orange-500" /><span>Redundant call (can be memoized)</span></div>
        </div>
      </div>
    </div>
  );
}
