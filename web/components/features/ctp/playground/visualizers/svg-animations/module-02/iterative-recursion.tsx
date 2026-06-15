import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// One snapshot per step: the explicit (iterative) stack, the equivalent
// recursive call-stack frames, the visited result, and the node being popped.
type Step = {
  explicitStack: number[];
  callStack: number[]; // recursive frames currently open (deepest at top)
  result: number[];
  current: number | null;
  msg: string;
};

const TREE = [
  { id: 1, x: 200, y: 150, left: 2, right: 3 },
  { id: 2, x: 120, y: 230, left: 6, right: 7 },
  { id: 3, x: 280, y: 230, left: 4, right: 5 },
  { id: 6, x: 80, y: 310 },
  { id: 7, x: 160, y: 310 },
  { id: 4, x: 240, y: 310 },
  { id: 5, x: 320, y: 310 },
];

// Hand-traced DFS preorder (1,2,6,7,3,4,5). The explicit stack pushes Right then
// Left so Left pops first; the recursive call stack tracks the active ancestry.
const STEPS: Step[] = [
  { explicitStack: [], callStack: [], result: [], current: null, msg: "DFS 시작 대기. Step을 눌러 재귀와 반복을 동시에 추적하세요." },
  { explicitStack: [1], callStack: [1], result: [], current: null, msg: "[초기화] 루트(1)를 명시적 스택에 푸시 / 재귀: dfs(1) 진입." },
  { explicitStack: [3, 2], callStack: [1, 2], result: [1], current: 1, msg: "[방문] 1을 팝·방문. 자식 푸시: 오른쪽(3), 왼쪽(2) / 재귀: dfs(2) 호출." },
  { explicitStack: [3, 7, 6], callStack: [1, 2, 6], result: [1, 2], current: 2, msg: "[방문] 2를 팝·방문. 자식 푸시: 오른쪽(7), 왼쪽(6) / 재귀: dfs(6) 호출." },
  { explicitStack: [3, 7], callStack: [1, 2], result: [1, 2, 6], current: 6, msg: "[방문] 6을 팝·방문. 리프 → 반환 / 재귀: dfs(6) 반환, dfs(2)로 복귀." },
  { explicitStack: [3], callStack: [1], result: [1, 2, 6, 7], current: 7, msg: "[방문] 7을 팝·방문. 리프 → 반환 / 재귀: dfs(7),dfs(2) 반환, dfs(1)로 복귀." },
  { explicitStack: [5, 4], callStack: [1, 3], result: [1, 2, 6, 7, 3], current: 3, msg: "[방문] 3을 팝·방문. 자식 푸시: 오른쪽(5), 왼쪽(4) / 재귀: dfs(3) 호출." },
  { explicitStack: [], callStack: [], result: [1, 2, 6, 7, 3, 4, 5], current: null, msg: "[완료] 남은 노드 4,5 방문 후 모든 프레임 반환. DFS 완료!" },
];

export function useIterativeRecursionSim() {
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const baseLog = "> 시스템 초기화: 재귀 ↔ 반복 비교 (명시적 스택 DFS)";

  const rebuildLogs = useCallback((idx: number) => {
    const out = [baseLog];
    for (let i = 1; i <= idx; i++) out.unshift(`[Step ${i}/${STEPS.length - 1}] ${STEPS[i].msg}`);
    setLogs(out);
  }, []);

  useEffect(() => { rebuildLogs(0); }, [rebuildLogs]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= STEPS.length) return;
    setStepIdx(newStep);
    rebuildLogs(newStep);
  }, [rebuildLogs]);

  const nextStep = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= STEPS.length - 1 ? prev : prev + 1;
      if (next !== prev) rebuildLogs(next);
      return next;
    });
  }, [rebuildLogs]);

  const reset = useCallback(() => { setStepIdx(0); rebuildLogs(0); }, [rebuildLogs]);

  const s = STEPS[stepIdx];

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step: stepIdx, explicitStack: s.explicitStack, callStack: s.callStack, result: s.result, current: s.current },
      logs,
      handlers: { push: nextStep, clear: reset },
      currentStep: stepIdx,
      maxSteps: STEPS.length,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

type VData = { step: number; explicitStack: number[]; callStack: number[]; result: number[]; current: number | null };

export function IterativeRecursionVisualizer({ data }: { data?: VData }) {
  if (!data) return null;
  const { explicitStack, callStack, result, current } = data;

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.gridLine} strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-blue" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neon-glow-red" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neon-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title */}
      <text x="40" y="50" fill="hsl(217 91% 60%)" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-blue)">비재귀적 표현 (RECURSION ↔ ITERATION)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">같은 DFS를 재귀 호출 스택과 명시적 스택으로 나란히 비교</text>

      {/* ===================== ZONE 1: TREE ===================== */}
      <rect x="30" y="100" width="280" height="360" fill="none" stroke="hsl(var(--border))" rx="12" />
      <text x="170" y="122" fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="2" textAnchor="middle" fontWeight="bold">입력 트리 (INPUT TREE)</text>

      {/* Edges */}
      <g>
        <line x1="200" y1="150" x2="120" y2="230" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="200" y1="150" x2="280" y2="230" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="120" y1="230" x2="80" y2="310" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="120" y1="230" x2="160" y2="310" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="280" y1="230" x2="240" y2="310" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="280" y1="230" x2="320" y2="310" stroke="hsl(var(--border))" strokeWidth="2" />
      </g>

      {/* Nodes */}
      {TREE.map(n => {
        const isVisited = result.includes(n.id);
        const isInStack = explicitStack.includes(n.id);
        const isCurrent = current === n.id;
        return (
          <motion.g key={`tr-${n.id}`}>
            <motion.circle
              cx={n.x} cy={n.y} r={20}
              fill={isVisited ? colorTokens.successSoft : isInStack ? colorTokens.primaryBlueSoft : "hsl(var(--card))"}
              stroke={isCurrent ? "hsl(0 84% 60%)" : isVisited ? "hsl(160 84% 39%)" : isInStack ? "hsl(217 91% 60%)" : "hsl(var(--border))"}
              strokeWidth={isInStack || isVisited || isCurrent ? 3 : 2}
              style={{ filter: isCurrent ? 'url(#neon-glow-red)' : isInStack ? 'url(#neon-glow-blue)' : isVisited ? 'url(#neon-glow-emerald)' : 'none' }}
              initial={false}
              animate={{ scale: isCurrent ? 1.2 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14" fontWeight="bold"
              fill={isVisited ? "hsl(160 84% 39%)" : isInStack ? "hsl(217 91% 60%)" : "hsl(var(--muted-foreground))"}>{n.id}</text>
          </motion.g>
        );
      })}

      {/* ===================== ZONE 2: RECURSIVE CALL STACK ===================== */}
      <rect x="330" y="100" width="150" height="360" fill="none" stroke="hsl(271 91% 65%)" strokeOpacity="0.4" rx="12" />
      <text x="405" y="122" fill="hsl(271 91% 65%)" fontSize="11" letterSpacing="1" textAnchor="middle" fontWeight="bold">재귀 (CALL STACK)</text>
      <text x="405" y="138" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">OS가 암묵적으로 관리</text>
      <path d="M 348 160 L 348 445 L 462 445 L 462 160" fill="none" stroke="hsl(271 91% 65%)" strokeOpacity="0.3" strokeWidth="2" />
      {callStack.length === 0 && <text x="405" y="305" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">비어있음</text>}
      <AnimatePresence>
        {callStack.map((nodeId, index) => {
          const slotH = 36, gap = 5, yBottom = 440;
          const y = yBottom - (index * (slotH + gap)) - slotH;
          const isTop = index === callStack.length - 1;
          return (
            <motion.g key={`cs-${nodeId}-${index}`}
              initial={{ opacity: 0, x: -20, y }} animate={{ opacity: 1, x: 0, y }} exit={{ opacity: 0, y: y - 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}>
              <rect x="356" y={0} width="98" height={slotH} fill={colorTokens.primaryHighlightSoft} stroke="hsl(271 91% 65%)" strokeWidth="2" rx="6"
                style={{ filter: isTop ? 'url(#neon-glow-purple)' : 'none' }} />
              <text x="405" y="23" fill="hsl(271 91% 65%)" fontSize="13" fontWeight="bold" textAnchor="middle">dfs({nodeId})</text>
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* ===================== ZONE 3: EXPLICIT STACK ===================== */}
      <rect x="500" y="100" width="150" height="360" fill="none" stroke="hsl(217 91% 60%)" strokeOpacity="0.4" rx="12" />
      <text x="575" y="122" fill="hsl(217 91% 60%)" fontSize="11" letterSpacing="1" textAnchor="middle" fontWeight="bold">반복 (EXPLICIT)</text>
      <text x="575" y="138" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">개발자가 직접 관리</text>
      <path d="M 518 160 L 518 445 L 632 445 L 632 160" fill="none" stroke="hsl(217 91% 60%)" strokeOpacity="0.3" strokeWidth="2" />
      {explicitStack.length === 0 && <text x="575" y="305" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">비어있음</text>}
      <AnimatePresence>
        {explicitStack.map((nodeId, index) => {
          const slotH = 36, gap = 5, yBottom = 440;
          const y = yBottom - (index * (slotH + gap)) - slotH;
          const isTop = index === explicitStack.length - 1;
          return (
            <motion.g key={`es-${nodeId}`}
              initial={{ opacity: 0, x: -20, y }} animate={{ opacity: 1, x: 0, y }} exit={{ opacity: 0, y: y - 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}>
              <rect x="526" y={0} width="98" height={slotH} fill={colorTokens.primaryBlueSoft} stroke="hsl(217 91% 60%)" strokeWidth="2" rx="6"
                style={{ filter: isTop ? 'url(#neon-glow-blue)' : 'none' }} />
              <text x="575" y="23" fill="hsl(217 91% 60%)" fontSize="13" fontWeight="bold" textAnchor="middle">노드 {nodeId}</text>
              {isTop && <text x="530" y="11" fill="hsl(217 91% 60%)" fontSize="8" fontWeight="bold" letterSpacing="1">TOP</text>}
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Equivalence bridge between the two stacks */}
      <text x="490" y="475" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">
        <tspan fill="hsl(271 91% 65%)" fontWeight="bold">재귀</tspan> ≡ <tspan fill="hsl(217 91% 60%)" fontWeight="bold">명시적 스택</tspan> (동일한 LIFO 흐름)
      </text>

      {/* ===================== ZONE 4: RESULT ===================== */}
      <rect x="670" y="100" width="110" height="360" fill="none" stroke="hsl(160 84% 39%)" strokeOpacity="0.4" rx="12" />
      <text x="725" y="122" fill="hsl(160 84% 39%)" fontSize="11" letterSpacing="1" textAnchor="middle" fontWeight="bold">방문 결과</text>
      <g transform="translate(680, 150)">
        {result.length === 0 && <text x="45" y="150" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">없음</text>}
        <AnimatePresence>
          {result.map((nodeId, index) => {
            const y = index * 38;
            return (
              <motion.g key={`res-${nodeId}`}
                initial={{ opacity: 0, scale: 0.8, x: -15, y }} animate={{ opacity: 1, scale: 1, x: 0, y }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                <rect x="0" y={0} width="90" height="30" fill={colorTokens.successTrace} stroke="hsl(160 84% 39%)" strokeWidth="2" rx="6" />
                <text x="45" y="20" fill="hsl(160 84% 39%)" fontSize="13" fontWeight="bold" textAnchor="middle">{index + 1}. 노드 {nodeId}</text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </g>
    </svg>
  );
}
