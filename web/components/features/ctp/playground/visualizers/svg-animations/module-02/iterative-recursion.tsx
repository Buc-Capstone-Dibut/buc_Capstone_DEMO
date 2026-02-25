import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useIterativeRecursionSim() {
  const [step, setStep] = useState(0);
  const [explicitStack, setExplicitStack] = useState<number[]>([]);
  const [result, setResult] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 재귀 → 반복문 변환",
    "> [대기] 명시적 스택을 사용하여 재귀적인 DFS 순회를 반복문으로 변환합니다."
  ]);
  const maxSteps = 7;

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const peek = useCallback(() => {
    setStep(prev => {
      const next = prev >= maxSteps ? 1 : prev + 1;
      if (next === 1) { setExplicitStack([1]); setResult([]); appendLog("[초기화] 루트 노드(1)를 명시적 스택에 푸시합니다."); }
      if (next === 2) { setExplicitStack([3, 2]); setResult([1]); appendLog("[팝] 1을 팝하고 방문합니다. 자식 노드 푸시: 오른쪽(3), 왼쪽(2)."); }
      if (next === 3) { setExplicitStack([3, 7, 6]); setResult([1, 2]); appendLog("[팝] 2를 팝하고 방문. 자식 노드 푸시: 오른쪽(7), 왼쪽(6)."); }
      if (next === 4) { setExplicitStack([3, 7]); setResult([1, 2, 6]); appendLog("[팝] 6을 팝합니다. 자식이 없습니다. 6을 방문합니다."); }
      if (next === 5) { setExplicitStack([3]); setResult([1, 2, 6, 7]); appendLog("[팝] 7을 팝합니다. 자식이 없습니다. 7을 방문합니다."); }
      if (next === 6) { setExplicitStack([5, 4]); setResult([1, 2, 6, 7, 3]); appendLog("[팝] 3을 팝하고 방문. 자식 노드 푸시: 오른쪽(5), 왼쪽(4)."); }
      if (next === 7) { setExplicitStack([]); setResult([1, 2, 6, 7, 3, 4, 5]); appendLog("[완료] 남은 노드들이 모두 팝되고 방문되었습니다. DFS 완료!"); }
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0); setExplicitStack([]); setResult([]);
    setLogs(["> 시스템 리셋: 스택과 결과가 초기화되었습니다."]);
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
  const { explicitStack, result, step } = data;

  // Simple tree for display (DFS Preorder: 1 -> 2 -> 6 -> 7 -> 3 -> 4 -> 5)
  // To get this order iteratively, we push Right then Left!
  const TREE = [
    { id: 1, x: 200, y: 150, left: 2, right: 3 },
    { id: 2, x: 120, y: 230, left: 6, right: 7 },
    { id: 3, x: 280, y: 230, left: 4, right: 5 },
    { id: 6, x: 80,  y: 310 },
    { id: 7, x: 160, y: 310 },
    { id: 4, x: 240, y: 310 },
    { id: 5, x: 320, y: 310 },
  ];

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-blue" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-red" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title */}
      <text x="40" y="50" fill="#3b82f6" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-blue)">비재귀적 표현 (ITERATIVE RECURSION)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">명시적 스택을 사용한 깊이 우선 탐색(DFS) 시뮬레이션</text>

      {/* Info Panel */}
      <g transform="translate(400, 25)">
        <rect width="360" height="60" fill="rgba(59, 130, 246, 0.1)" stroke="rgba(59, 130, 246, 0.3)" rx="8" />
        <text x="180" y="25" fill="#fff" fontSize="11" textAnchor="middle">
          재귀는 OS 콜 스택을 사용합니다. 이를 반복문으로 변환하려면
        </text>
        <text x="180" y="45" fill="#fff" fontSize="11" textAnchor="middle">
          직접 <tspan fill="#3b82f6" fontWeight="bold">명시적 스택 (Explicit Stack)</tspan>(LIFO)을 관리해야 합니다!
        </text>
      </g>

      {/* Zone Borders */}
      <rect x="30" y="110" width="340" height="360" fill="none" stroke="hsl(var(--border))" rx="12" />
      <text x="200" y="130" fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="2" textAnchor="middle" fontWeight="bold">입력 트리 (INPUT TREE)</text>

      <rect x="390" y="110" width="180" height="360" fill="none" stroke="hsl(var(--border))" rx="12" />
      <text x="480" y="130" fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="2" textAnchor="middle" fontWeight="bold">명시적 스택 (STACK)</text>

      <rect x="590" y="110" width="180" height="360" fill="none" stroke="hsl(var(--border))" rx="12" />
      <text x="680" y="130" fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="2" textAnchor="middle" fontWeight="bold">방문 결과 (RESULT)</text>

      {/* ===================== TREE ===================== */}
      {/* Edges */}
      <g>
        <line x1="200" y1="150" x2="120" y2="230" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="200" y1="150" x2="280" y2="230" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="120" y1="230" x2="80"  y2="310" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="120" y1="230" x2="160" y2="310" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="280" y1="230" x2="240" y2="310" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="280" y1="230" x2="320" y2="310" stroke="hsl(var(--border))" strokeWidth="2" />
      </g>

      {/* Nodes */}
      {TREE.map(n => {
        const isVisited = result.includes(n.id);
        const isInStack = explicitStack.includes(n.id);
        const isCurrent = step > 0 && ((step === 1 && n.id === 1) || (step === 2 && n.id === 1) || (step === 3 && n.id === 2) || (step === 4 && n.id === 6) || (step === 5 && n.id === 7) || (step === 6 && n.id === 3));

        return (
          <motion.g key={`tr-${n.id}`}>
            <motion.circle
              cx={n.x} cy={n.y} r={20}
              fill={isVisited ? "rgba(16, 185, 129, 0.2)" : isInStack ? "rgba(59, 130, 246, 0.2)" : "hsl(var(--card))"}
              stroke={isCurrent ? "#ef4444" : isVisited ? "#10b981" : isInStack ? "#3b82f6" : "hsl(var(--border))"}
              strokeWidth={isInStack || isVisited || isCurrent ? 3 : 2}
              style={{ filter: isCurrent ? 'url(#neon-glow-red)' : isInStack ? 'url(#neon-glow-blue)' : isVisited ? 'url(#neon-glow-emerald)' : 'none' }}
              animate={{
                scale: isCurrent ? 1.2 : 1,
                rotate: isCurrent ? 360 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14" fontWeight="bold"
              fill={isVisited ? "#10b981" : isInStack ? "#3b82f6" : "hsl(var(--muted-foreground))"}>
              {n.id}
            </text>
          </motion.g>
        );
      })}

      {/* Legend inside tree area */}
      <g transform="translate(45, 430)">
        <circle cx="10" cy="10" r="6" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
        <text x="25" y="14" fill="hsl(var(--muted-foreground))" fontSize="11">스택 대기 (In Stack)</text>

        <circle cx="130" cy="10" r="6" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" />
        <text x="145" y="14" fill="hsl(var(--muted-foreground))" fontSize="11">방문 완료 (Visited)</text>

        <circle cx="250" cy="10" r="6" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="2" />
        <text x="265" y="14" fill="hsl(var(--muted-foreground))" fontSize="11">현재 팝 (Current)</text>
      </g>


      {/* ===================== STACK ===================== */}
      <path d="M 405 150 L 405 450 L 555 450 L 555 150" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />

      {explicitStack.length === 0 && (
        <text x="480" y="300" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">스택 비어있음</text>
      )}

      <AnimatePresence>
        {explicitStack.map((nodeId, index) => {
          const slotHeight = 40;
          const gap = 5;
          const yBottom = 445;
          const y = yBottom - (index * (slotHeight + gap)) - slotHeight;
          const isTop = index === explicitStack.length - 1;

          return (
            <motion.g
              key={`es-${nodeId}`}
              initial={{ opacity: 0, x: -30, y }}
              animate={{ opacity: 1, x: 0, y }}
              exit={{ opacity: 0, y: y - 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <rect x="415" y={0} width="130" height={slotHeight} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" rx="6" />
              <text x="480" y="25" fill="#3b82f6" fontSize="14" fontWeight="bold" textAnchor="middle">노드 {nodeId}</text>
              {isTop && (
                <text x="420" y="12" fill="#3b82f6" fontSize="9" fontWeight="bold" letterSpacing="1">TOP</text>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>


      {/* ===================== RESULT ===================== */}
      <g transform="translate(600, 150)">
        {result.length === 0 && (
          <text x="80" y="150" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">방문한 노드 없음</text>
        )}

        <AnimatePresence>
          {result.map((nodeId, index) => {
            const y = index * 42; // layout top to bottom
            return (
              <motion.g
                key={`res-${nodeId}`}
                initial={{ opacity: 0, scale: 0.8, x: -20, y }}
                animate={{ opacity: 1, scale: 1, x: 0, y }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <rect x="0" y={0} width="160" height="35" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="2" rx="6" />
                <text x="80" y="22" fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle">노드 {nodeId}</text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </g>

    </svg>
  );
}
