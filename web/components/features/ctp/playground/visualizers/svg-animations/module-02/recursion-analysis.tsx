import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { colorTokens, edgeAt } from "../../shared/svg-primitives";

const NODE_R = 25;

type TreeNode = { id: number; label: string; value: number; depth: number; x: number; y: number; left?: number; right?: number };

// Fibonacci call tree for fib(4) scaled for 800x500.
// Coordinates spread out so sibling nodes don't visually clip
// (radius 25 + DUPLICATE bubble at -50/-30 requires >= ~140 horizontal gap).
const TREE_NODES: TreeNode[] = [
  { id: 0, label: 'fib(4)', value: 3, depth: 0, x: 400, y: 130, left: 1, right: 2 },
  { id: 1, label: 'fib(3)', value: 2, depth: 1, x: 240, y: 220, left: 3, right: 4 },
  { id: 2, label: 'fib(2)', value: 1, depth: 1, x: 560, y: 220, left: 5, right: 6 },
  { id: 3, label: 'fib(2)', value: 1, depth: 2, x: 140, y: 310, left: 7, right: 8 },
  { id: 4, label: 'fib(1)', value: 1, depth: 2, x: 340, y: 310 },
  { id: 5, label: 'fib(1)', value: 1, depth: 2, x: 480, y: 310 },
  { id: 6, label: 'fib(0)', value: 0, depth: 2, x: 640, y: 310 },
  { id: 7, label: 'fib(1)', value: 1, depth: 3, x: 60, y: 400 },
  { id: 8, label: 'fib(0)', value: 0, depth: 3, x: 220, y: 400 },
];

// node id 2 (fib(2)) is the redundant recomputation already evaluated at node 3.
const DUP_ROOT = 2;
const DUP_SUBTREE = [2, 5, 6]; // fib(2) at depth 1 and its two children

// Pre-order activation sequence (node id lit at each step).
const NAIVE_ORDER = [0, 1, 3, 7, 8, 4, 2, 5, 6];
// With memoization, the whole duplicate fib(2) subtree is a single cache hit:
// we stop after lighting node 2 (no children expanded).
const MEMO_ORDER = [0, 1, 3, 7, 8, 4, 2];

function logFor(nodeId: number, memo: boolean): string {
  const n = TREE_NODES[nodeId];
  if (nodeId === DUP_ROOT) {
    return memo
      ? "[캐시 적중] fib(2) → 이미 계산됨! 저장된 값 1을 즉시 반환합니다. 하위 호출 생략."
      : "[중복 호출] fib(2) → fib(1) + fib(0)을 다시 계산합니다. (낭비!)";
  }
  if (n.label.startsWith('fib(4)')) return "[호출] fib(4) → 확장 중... fib(3) + fib(2)가 필요합니다.";
  if (n.label.startsWith('fib(3)')) return "[호출] fib(3) → fib(2) + fib(1)이 필요합니다.";
  if (n.label === 'fib(2)') return "[호출] fib(2) → fib(1) + fib(0)이 필요합니다. (이 값이 캐시에 저장됩니다)";
  if (n.label.startsWith('fib(1)')) return `[기저 조건] ${n.label} = 1. 즉시 반환합니다.`;
  return `[기저 조건] ${n.label} = 0. 즉시 반환합니다.`;
}

export function useRecursionAnalysisSim() {
  const [memo, setMemo] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const order = memo ? MEMO_ORDER : NAIVE_ORDER;
  const maxSteps = order.length + 1; // +1 for the idle step

  const baseLog = "> 시스템 초기화: 재귀 호출 트리 분석기 (Recursive Call Tree)";

  const rebuildLogs = useCallback((idx: number, useMemo: boolean) => {
    const ord = useMemo ? MEMO_ORDER : NAIVE_ORDER;
    const out = [baseLog,
      useMemo
        ? "> [메모이제이션 ON] 중복 부분 문제를 캐시로 차단합니다."
        : "> [메모이제이션 OFF] fib(4)의 단순 재귀 트리를 추적합니다."];
    for (let i = 1; i <= idx; i++) out.unshift(`[Step ${i}/${ord.length}] ${logFor(ord[i - 1], useMemo)}`);
    setLogs(out);
  }, []); // baseLog is constant

  useEffect(() => { rebuildLogs(0, false); }, [rebuildLogs]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= maxSteps) return;
    setStepIdx(newStep);
    rebuildLogs(newStep, memo);
  }, [maxSteps, memo, rebuildLogs]);

  const nextStep = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= maxSteps - 1 ? prev : prev + 1;
      if (next !== prev) rebuildLogs(next, memo);
      return next;
    });
  }, [maxSteps, memo, rebuildLogs]);

  const reset = useCallback(() => { setStepIdx(0); rebuildLogs(0, memo); }, [memo, rebuildLogs]);

  // Memoization toggle — wired to the `pop` button slot. Resets the trace so the
  // two regimes are compared from the same starting point.
  const toggleMemo = useCallback(() => {
    setMemo(prev => {
      const nextMemo = !prev;
      setStepIdx(0);
      rebuildLogs(0, nextMemo);
      return nextMemo;
    });
  }, [rebuildLogs]);

  const activeNodes = order.slice(0, stepIdx);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: {
        activeNodes,
        step: stepIdx,
        memo,
        callCount: stepIdx,            // calls expanded so far
        naiveTotal: NAIVE_ORDER.length, // 9
        memoTotal: MEMO_ORDER.length,   // 7
      },
      logs,
      handlers: { push: nextStep, clear: reset, pop: toggleMemo },
      currentStep: stepIdx,
      maxSteps,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

type VData = {
  activeNodes: number[];
  step: number;
  memo: boolean;
  callCount: number;
  naiveTotal: number;
  memoTotal: number;
};

export function RecursionAnalysisVisualizer({ data }: { data?: VData }) {
  if (!data) return null;
  const { activeNodes, memo, callCount, naiveTotal, memoTotal } = data;

  const isPruned = (id: number) => memo && id !== DUP_ROOT && DUP_SUBTREE.includes(id);

  const edges = TREE_NODES.flatMap(n => {
    const res: Array<{ x1: number; y1: number; x2: number; y2: number; isDuplicate: boolean; childId: number }> = [];
    if (n.left !== undefined) {
      const child = TREE_NODES[n.left];
      const ep = edgeAt({ x: n.x, y: n.y }, { x: child.x, y: child.y }, NODE_R, NODE_R);
      res.push({ ...ep, isDuplicate: child.id === DUP_ROOT, childId: child.id });
    }
    if (n.right !== undefined) {
      const child = TREE_NODES[n.right];
      const ep = edgeAt({ x: n.x, y: n.y }, { x: child.x, y: child.y }, NODE_R, NODE_R);
      res.push({ ...ep, isDuplicate: child.id === DUP_ROOT, childId: child.id });
    }
    return res;
  });

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.gridLine} strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neon-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="hsl(24 95% 53%)" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-orange)">재귀 분석 (Recursion Analysis)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">점화식 ↔ 호출 트리 · 중복 부분 문제 (Overlapping Subproblems)</text>

      {/* Recurrence + memo status box — links the formula to the tree */}
      <g transform="translate(420, 25)">
        <rect width="340" height="74" fill={memo ? colorTokens.successDim : colorTokens.warningDim} stroke={memo ? colorTokens.successEdge : colorTokens.warningEdgeSubtle} rx="8" />
        <text x="14" y="22" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="bold" letterSpacing="1">점화식 (RECURRENCE)</text>
        <text x="14" y="42" fill="hsl(0 0% 100%)" fontSize="13" fontFamily="monospace">
          T(n) = T(n-1) + T(n-2) + 1
        </text>
        <text x="14" y="63" fontSize="12" fill="hsl(var(--muted-foreground))">
          호출 수:&nbsp;
          <tspan fill={memo ? "hsl(160 84% 39%)" : "hsl(24 95% 53%)"} fontWeight="bold">{callCount}</tspan>
          <tspan fill="hsl(var(--muted-foreground))">&nbsp;/&nbsp;{memo ? memoTotal : naiveTotal}</tspan>
          <tspan fill="hsl(var(--muted-foreground))">&nbsp;&nbsp;|&nbsp;&nbsp;단순:</tspan>
          <tspan fill="hsl(24 95% 53%)" fontWeight="bold">&nbsp;O(2ⁿ)</tspan>
          <tspan fill="hsl(var(--muted-foreground))">&nbsp;→&nbsp;메모:</tspan>
          <tspan fill="hsl(160 84% 39%)" fontWeight="bold">&nbsp;O(n)</tspan>
        </text>
      </g>

      {/* Memoization toggle pill (state mirror of the `pop` button) */}
      <g transform="translate(40, 90)">
        <rect width="200" height="26" rx="13"
          fill={memo ? colorTokens.successSoft : colorTokens.faintFill}
          stroke={memo ? "hsl(160 84% 39%)" : "hsl(var(--border))"} strokeWidth="1.5" />
        <circle cx={memo ? 184 : 16} cy="13" r="9" fill={memo ? "hsl(160 84% 39%)" : "hsl(var(--muted-foreground))"} style={{ transition: "cx 0.2s" }} />
        <text x="100" y="17" textAnchor="middle" fontSize="11" fontWeight="bold"
          fill={memo ? "hsl(160 84% 39%)" : "hsl(var(--muted-foreground))"}>
          메모이제이션 {memo ? "ON" : "OFF"} (Pop 토글)
        </text>
      </g>

      {/* Edges */}
      {edges.map((e, i) => {
        const pruned = isPruned(e.childId);
        return (
          <line
            key={`edge-${i}`}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={pruned ? "hsl(160 84% 39%)" : e.isDuplicate ? "hsl(24 95% 53%)" : "hsl(0 0% 27%)"}
            strokeWidth="2"
            strokeDasharray={e.isDuplicate || pruned ? "6 6" : "0"}
            opacity={pruned ? 0.35 : 1}
          />
        );
      })}

      {/* Nodes */}
      {TREE_NODES.map(n => {
        const isActive = activeNodes.includes(n.id);
        const isDuplicate = n.id === DUP_ROOT;
        const pruned = isPruned(n.id);
        const cacheHit = memo && isDuplicate && isActive;

        let fill = "hsl(var(--card))";
        let stroke = "hsl(var(--border))";
        let textFill = "hsl(var(--muted-foreground))";
        if (cacheHit) { fill = colorTokens.successSoft; stroke = "hsl(160 84% 39%)"; textFill = "hsl(160 84% 39%)"; }
        else if (isActive && isDuplicate) { fill = colorTokens.warningSoft; stroke = "hsl(24 95% 53%)"; textFill = "hsl(24 95% 53%)"; }
        else if (isActive) { fill = colorTokens.infoSoft; stroke = "hsl(189 94% 43%)"; textFill = "hsl(189 94% 43%)"; }

        return (
          <motion.g key={`node-${n.id}`}>
            <motion.circle
              cx={n.x} cy={n.y} r={NODE_R}
              fill={fill} stroke={stroke} strokeWidth={isActive ? 3 : 2}
              initial={false}
              animate={{ scale: pruned ? 0.7 : isActive ? 1 : 0.8, opacity: pruned ? 0.3 : isActive ? 1 : 0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ filter: cacheHit ? 'url(#neon-glow-emerald)' : isActive ? `url(#neon-glow-${isDuplicate ? 'orange' : 'cyan'})` : 'none' }}
            />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill={textFill}>{n.label}</text>

            {cacheHit && (
              <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <rect x={n.x - 50} y={n.y - 50} width="100" height="20" fill={colorTokens.successSoft} stroke="hsl(160 84% 39%)" rx="4" />
                <text x={n.x} y={n.y - 36} textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(160 84% 39%)">캐시 적중 (CACHE HIT)</text>
              </motion.g>
            )}
            {!memo && isDuplicate && isActive && (
              <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <rect x={n.x - 45} y={n.y - 50} width="90" height="20" fill={colorTokens.warningSoft} stroke="hsl(24 95% 53%)" rx="4" />
                <text x={n.x} y={n.y - 36} textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(24 95% 53%)">중복 (DUPLICATE!)</text>
              </motion.g>
            )}
          </motion.g>
        );
      })}

      {/* Legend */}
      <g transform="translate(40, 440)">
        <rect x="0" y="0" width="400" height="40" fill="hsl(var(--card))" opacity="0.6" stroke="hsl(var(--border))" rx="8" />
        <circle cx="20" cy="20" r="6" fill={colorTokens.infoSoft} stroke="hsl(189 94% 43%)" strokeWidth="2" />
        <text x="33" y="24" fill="hsl(var(--muted-foreground))" fontSize="11">정상 호출</text>
        <circle cx="125" cy="20" r="6" fill={colorTokens.warningSoft} stroke="hsl(24 95% 53%)" strokeWidth="2" />
        <text x="138" y="24" fill="hsl(var(--muted-foreground))" fontSize="11">중복 호출</text>
        <circle cx="230" cy="20" r="6" fill={colorTokens.successSoft} stroke="hsl(160 84% 39%)" strokeWidth="2" />
        <text x="243" y="24" fill="hsl(var(--muted-foreground))" fontSize="11">캐시 적중 / 가지치기</text>
      </g>
    </svg>
  );
}
