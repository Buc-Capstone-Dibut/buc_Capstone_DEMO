import { useState, useCallback } from "react";
import { motion } from "framer-motion";

type TreeNode = { id: number; label: string; depth: number; x: number; y: number; left?: number; right?: number; status: 'idle' | 'active' | 'done' };

// Fibonacci call tree for fib(4) scaled for 800x500
const TREE_NODES: TreeNode[] = [
  { id: 0, label: 'fib(4)', depth: 0, x: 400, y: 130,  left: 1, right: 2, status: 'idle' },
  { id: 1, label: 'fib(3)', depth: 1, x: 250, y: 220,  left: 3, right: 4, status: 'idle' },
  { id: 2, label: 'fib(2)', depth: 1, x: 550, y: 220,  left: 5, right: 6, status: 'idle' },
  { id: 3, label: 'fib(2)', depth: 2, x: 140, y: 310,  left: 7, right: 8, status: 'idle' },
  { id: 4, label: 'fib(1)', depth: 2, x: 360, y: 310, status: 'idle' },
  { id: 5, label: 'fib(1)', depth: 2, x: 470, y: 310, status: 'idle' },
  { id: 6, label: 'fib(0)', depth: 2, x: 630, y: 310, status: 'idle' },
  { id: 7, label: 'fib(1)', depth: 3, x: 80,  y: 400, status: 'idle' },
  { id: 8, label: 'fib(0)', depth: 3, x: 200, y: 400, status: 'idle' },
];

// Step sequence (node id to light up)
const STEPS = [0, 1, 3, 7, 8, 4, 2, 5, 6];

export function useRecursionAnalysisSim() {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 재귀 호출 트리 분석기(Recursive Call Tree Analysis)",
    "> [대기] fib(4) 호출 트리 추적 중. 중복 호출을 시각화합니다."
  ]);

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const peek = useCallback(() => {
    setStep(prev => {
      const next = prev >= STEPS.length ? 1 : prev + 1;
      const nodeId = STEPS[next - 1];
      setActiveNodes(an => [...an, nodeId]);
      const n = TREE_NODES[nodeId];
      if (n.label.startsWith('fib(4)')) appendLog("[호출] fib(4) → 확장 중.. fib(3) + fib(2)가 필요합니다.");
      else if (n.label.startsWith('fib(3)')) appendLog("[호출] fib(3) → fib(2) + fib(1)이 필요합니다.");
      else if (n.label === 'fib(2)' && nodeId === 2) appendLog("[호출] fib(2) [중복] → fib(1) + fib(0)이 필요합니다. 이미 위에서 계산되었습니다!");
      else if (n.label === 'fib(2)' && nodeId === 3) appendLog("[호출] fib(2) → fib(1) + fib(0)이 필요합니다.");
      else if (n.label.startsWith('fib(1)')) appendLog(`[기저 조건] ${n.label} = 1. 즉시 반환합니다.`);
      else if (n.label.startsWith('fib(0)')) appendLog(`[기저 조건] ${n.label} = 0. 즉시 반환합니다.`);
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0); setActiveNodes([]);
    setLogs(["> 시스템 리셋: 호출 트리 초기화 완료."]);
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

  const edges = TREE_NODES.flatMap(n => {
    const res = [];
    if (n.left !== undefined) {
      const child = TREE_NODES[n.left];
      res.push({ x1: n.x, y1: n.y + 25, x2: child.x, y2: child.y - 25, isDuplicate: child.label === 'fib(2)' && child.id === 2 });
    }
    if (n.right !== undefined) {
      const child = TREE_NODES[n.right];
      res.push({ x1: n.x, y1: n.y + 25, x2: child.x, y2: child.y - 25, isDuplicate: false });
    }
    return res;
  });

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="#f97316" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-orange)">재귀 분석 (Recursion Analysis)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">피보나치 수열의 중복 부분 문제 (Overlapping Subproblems)</text>

      {/* Context info box */}
      <g transform="translate(420, 30)">
        <rect width="340" height="50" fill="rgba(249, 115, 22, 0.1)" stroke="rgba(249, 115, 22, 0.3)" rx="8" />
        <text x="170" y="22" fill="#fff" fontSize="11" textAnchor="middle">단순 재귀 피보나치는 <tspan fill="#f97316" fontWeight="bold">불필요한 중복 계산</tspan>을 수행합니다.</text>
        <text x="170" y="40" fill="#fff" fontSize="11" textAnchor="middle"><tspan fontWeight="bold" fill="#f97316">fib(2)</tspan>가 두 번 계산됩니다! 메모이제이션(Memoization)이 필요합니다.</text>
      </g>

      {/* Edges */}
      {edges.map((e, i) => (
        <line
          key={`edge-${i}`}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={e.isDuplicate ? "#f97316" : "#444"}
          strokeWidth="2"
          strokeDasharray={e.isDuplicate ? "6 6" : "0"}
        />
      ))}

      {/* Nodes */}
      {TREE_NODES.map(n => {
        const isActive = activeNodes.includes(n.id);
        const isDuplicate = n.label === 'fib(2)' && n.id === 2;

        return (
          <motion.g key={`node-${n.id}`}>
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={25}
              fill={!isActive ? "hsl(var(--card))" : isDuplicate ? "rgba(249, 115, 22, 0.2)" : "rgba(6, 182, 212, 0.2)"}
              stroke={!isActive ? "hsl(var(--border))" : isDuplicate ? "#f97316" : "#06b6d4"}
              strokeWidth={isActive ? 3 : 2}
              initial={{ scale: 0.8 }}
              animate={{
                scale: isActive ? 1 : 0.8,
                opacity: isActive ? 1 : 0.5
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ filter: isActive ? `url(#neon-glow-${isDuplicate ? 'orange' : 'cyan'})` : 'none' }}
            />

            <motion.text
              x={n.x}
              y={n.y + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill={!isActive ? "hsl(var(--muted-foreground))" : isDuplicate ? "#f97316" : "#06b6d4"}
            >
              {n.label}
            </motion.text>

            {isDuplicate && isActive && (
              <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <rect x={n.x - 45} y={n.y - 50} width="90" height="20" fill="rgba(249, 115, 22, 0.2)" stroke="#f97316" rx="4" />
                <text x={n.x} y={n.y - 36} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f97316">중복 (DUPLICATE!)</text>
              </motion.g>
            )}
          </motion.g>
        );
      })}

      {/* Legend */}
      <g transform="translate(40, 440)">
        <rect x="0" y="0" width="300" height="40" fill="hsl(var(--card))" opacity="0.6" stroke="hsl(var(--border))" rx="8" />

        <circle cx="20" cy="20" r="6" fill="rgba(6, 182, 212, 0.2)" stroke="#06b6d4" strokeWidth="2" />
        <text x="35" y="24" fill="hsl(var(--muted-foreground))" fontSize="11">정상 호출 (Normal Call)</text>

        <circle cx="150" cy="20" r="6" fill="rgba(249, 115, 22, 0.2)" stroke="#f97316" strokeWidth="2" />
        <text x="165" y="24" fill="hsl(var(--muted-foreground))" fontSize="11">중복 호출 (Redundant Call)</text>
      </g>
    </svg>
  );
}
