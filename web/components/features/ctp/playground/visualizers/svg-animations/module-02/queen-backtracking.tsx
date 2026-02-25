import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const N = 4; // 4-Queens problem

type QueenState = {
  board: (boolean | null)[][]; // true = queen, null = attacking, false = empty
  queens: number[]; // column per row, -1 if not placed
  currentRow: number;
  attemptCol: number;
  isBacktracking: boolean;
  isSolved: boolean;
};

// Pre-computed solution steps for 4-Queens
const STEPS: QueenState[] = [
  { board: Array.from({ length: N }, () => Array(N).fill(false)), queens: [-1, -1, -1, -1], currentRow: 0, attemptCol: 0, isBacktracking: false, isSolved: false },
  { board: (() => { const b = Array.from({ length: N }, () => Array(N).fill(false)); b[0][0] = true; return b; })(), queens: [0, -1, -1, -1], currentRow: 1, attemptCol: 0, isBacktracking: false, isSolved: false },
  { board: (() => { const b = Array.from({ length: N }, () => Array(N).fill(false)); b[0][0] = true; b[1][2] = true; return b; })(), queens: [0, 2, -1, -1], currentRow: 2, attemptCol: 0, isBacktracking: false, isSolved: false },
  { board: (() => { const b = Array.from({ length: N }, () => Array(N).fill(false)); b[0][0] = true; b[1][2] = true; b[2][0] = null; b[2][1] = null; return b; })(), queens: [0, 2, -1, -1], currentRow: 2, attemptCol: 3, isBacktracking: true, isSolved: false },
  { board: (() => { const b = Array.from({ length: N }, () => Array(N).fill(false)); b[0][0] = true; b[1][3] = true; return b; })(), queens: [0, 3, -1, -1], currentRow: 2, attemptCol: 0, isBacktracking: false, isSolved: false },
  { board: (() => { const b = Array.from({ length: N }, () => Array(N).fill(false)); b[0][0] = true; b[1][3] = true; b[2][1] = true; return b; })(), queens: [0, 3, 1, -1], currentRow: 3, attemptCol: 0, isBacktracking: false, isSolved: false },
  { board: (() => { const b = Array.from({ length: N }, () => Array(N).fill(false)); b[0][1] = true; b[1][3] = true; b[2][0] = true; b[3][2] = true; return b; })(), queens: [1, 3, 0, 2], currentRow: 3, attemptCol: 2, isBacktracking: false, isSolved: true },
];

export function useQueenBacktrackingSim() {
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: N-Queen 백트래킹 (N=4)",
    "> [대기] 충돌 없이 4개의 퀸을 배치할 위치를 찾습니다. Step을 눌러 추적하세요."
  ]);

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const peek = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= STEPS.length - 1 ? 0 : prev + 1;
      const s = STEPS[next];
      if (s.isSolved) appendLog("[해결] 모든 4개의 퀸이 안전하게 배치되었습니다! 보드 [열]: " + s.queens.join(', '));
      else if (s.isBacktracking) appendLog(`[백트래킹] 행 ${s.currentRow}: 안전한 열이 없습니다. 행 ${s.currentRow - 1}의 퀸을 제거하고 다음 열을 시도합니다.`);
      else if (s.queens.every(q => q === -1)) appendLog("[시작] 행 0, 열 0에 퀸을 배치합니다.");
      else appendLog(`[배치] 퀸이 행 ${s.currentRow - 1}, 열 ${s.queens[s.currentRow - 1]}에 배치되었습니다. 행 ${s.currentRow}로 이동합니다.`);
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStepIdx(0);
    setLogs(["> 시스템 리셋: 보드가 초기화되었습니다."]);
  }, []);

  const currentState = STEPS[stepIdx];

  return {
    runSimulation: () => {},
    interactive: {
      visualData: currentState,
      logs,
      handlers: { peek, reset, clear: reset }
    }
  };
}

export function QueenBacktrackingVisualizer({ data }: { data: QueenState }) {
  const { board, queens, currentRow, isBacktracking, isSolved } = data;
  const QUEEN_EMOJI = '♛';

  const CELL_SIZE = 60;
  const BOARD_X = 100;
  const BOARD_Y = 160;

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
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
        <filter id="neon-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
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
      <text x="40" y="50" fill={isSolved ? "#10b981" : isBacktracking ? "#f97316" : "#06b6d4"} fontSize="24" fontWeight="bold" letterSpacing="2" filter={`url(#neon-glow-${isSolved ? 'emerald' : isBacktracking ? 'orange' : 'cyan'})`}>
        {isSolved ? "해결 완료!" : isBacktracking ? "백트래킹 중" : "N-QUEEN 백트래킹"}
      </text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">
        퀸 배치를 시도하고 충돌 시 이전으로 돌아가서(백트래킹) 다른 경로를 찾습니다.
      </text>

      {/* Status Panel */}
      <g transform="translate(420, 25)">
        <rect width="340" height="60" fill="hsl(var(--card))" opacity="0.8" stroke="hsl(var(--border))" rx="8" />
        <text x="170" y="25" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">
          {isSolved ? "모든 4개의 퀸이 공격받지 않는 위치에 배치되었습니다." : isBacktracking ? "이 행에는 가능한 위치가 없습니다. 이전 행으로 돌아갑니다." : "유망하지 않은 경로를 가지치기하며 탐색 공간을 줄입니다."}
        </text>
        <text x="170" y="45" fill={isSolved ? "#10b981" : isBacktracking ? "#f97316" : "#06b6d4"} fontSize="13" fontWeight="bold" textAnchor="middle">
          {isSolved ? "성공!" : isBacktracking ? "이전 행으로 되돌아가는 중..." : "안전한 위치 탐색 중..."}
        </text>
      </g>

      {/* Chess Board Area */}
      <rect x={BOARD_X - 10} y={BOARD_Y - 10} width={N * CELL_SIZE + 20} height={N * CELL_SIZE + 20} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" rx="8" />
      <text x={BOARD_X + (N * CELL_SIZE) / 2} y={BOARD_Y - 20} fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="2" textAnchor="middle" fontWeight="bold">체스보드 (4x4)</text>

      {/* Grid Cells */}
      {board.map((row, ri) =>
        row.map((cell, ci) => {
          const isQueen = cell === true;
          const isBlocked = cell === null;
          const isLightSq = (ri + ci) % 2 === 0;
          const isActiveRow = ri === currentRow && !isSolved;

          const cx = BOARD_X + ci * CELL_SIZE;
          const cy = BOARD_Y + ri * CELL_SIZE;

          return (
            <motion.g
              key={`cell-${ri}-${ci}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: (ri * N + ci) * 0.02 }}
            >
              {/* Cell Background */}
              <rect
                x={cx + 2} y={cy + 2}
                width={CELL_SIZE - 4} height={CELL_SIZE - 4}
                fill={isQueen ? (isSolved ? "rgba(16, 185, 129, 0.2)" : "rgba(6, 182, 212, 0.2)") : isBlocked ? "rgba(249, 115, 22, 0.1)" : isActiveRow ? "rgba(168, 85, 247, 0.1)" : isLightSq ? "hsl(var(--muted))" : "hsl(var(--card))"}
                stroke={isQueen ? (isSolved ? "#10b981" : "#06b6d4") : isBlocked ? "rgba(249, 115, 22, 0.4)" : isActiveRow ? "#a855f7" : "transparent"}
                strokeWidth={isQueen ? 2 : 1}
                rx="6"
              />

              {/* Coordinates */}
              <text x={cx + CELL_SIZE - 6} y={cy + CELL_SIZE - 6} fill="rgba(255,255,255,0.15)" fontSize="8" textAnchor="end">{ri},{ci}</text>

              {/* Blocked Marker */}
              {isBlocked && (
                <text x={cx + CELL_SIZE/2} y={cy + CELL_SIZE/2 + 8} fill="rgba(249, 115, 22, 0.4)" fontSize="24" fontWeight="bold" textAnchor="middle">✗</text>
              )}

              {/* Queen Icon */}
              {isQueen && (
                <motion.text
                  x={cx + CELL_SIZE/2} y={cy + CELL_SIZE/2 + 12}
                  fill={isSolved ? "#10b981" : "#06b6d4"}
                  fontSize="32"
                  textAnchor="middle"
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  style={{ filter: isSolved ? 'url(#neon-glow-emerald)' : 'url(#neon-glow-cyan)' }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {QUEEN_EMOJI}
                </motion.text>
              )}
            </motion.g>
          );
        })
      )}

      {/* Placement Status Area */}
      <rect x="450" y="150" width="300" height="260" fill="none" stroke="hsl(var(--border))" rx="12" />
      <text x="600" y="130" fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="2" textAnchor="middle" fontWeight="bold">배치 상태 (PLACEMENT STATUS)</text>

      {/* Row Statuses */}
      {queens.map((col, row) => {
        const y = 180 + row * 50;
        const isActive = row === currentRow && !isSolved;
        const isPlaced = col >= 0;
        return (
          <g key={`status-${row}`}>
            {/* Box */}
            <rect
              x="470" y={y}
              width="260" height="40"
              fill={isPlaced ? "rgba(6, 182, 212, 0.05)" : isActive ? "rgba(168, 85, 247, 0.05)" : "rgba(255,255,255,0.02)"}
              stroke={isPlaced ? "rgba(6, 182, 212, 0.3)" : isActive ? "rgba(168, 85, 247, 0.3)" : "rgba(255,255,255,0.1)"}
              strokeWidth="1"
              rx="6"
            />

            <text x="485" y={y + 24} fill="hsl(var(--muted-foreground))" fontSize="12">행 {row}:</text>

            <AnimatePresence mode="wait">
              {isPlaced ? (
                <text x="715" y={y + 24} fill="#06b6d4" fontSize="12" fontWeight="bold" textAnchor="end">
                  열(Col) {col}에 {QUEEN_EMOJI}
                </text>
              ) : isActive ? (
                <text x="715" y={y + 24} fill="#a855f7" fontSize="12" fontWeight="bold" textAnchor="end">
                  ← 현재 (Current)
                </text>
              ) : (
                <text x="715" y={y + 24} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="end">
                  —
                </text>
              )}
            </AnimatePresence>
          </g>
        );
      })}

      {/* Key Concept Note */}
      <g transform="translate(450, 440)">
        <text x="0" y="0" fill="#f97316" fontSize="12" fontWeight="bold">핵심 개념:</text>
        <text x="70" y="0" fill="hsl(var(--muted-foreground))" fontSize="12">백트래킹은 제약 조건을 위반하는</text>
        <text x="0" y="18" fill="hsl(var(--muted-foreground))" fontSize="12">순간 그 경로를 포기하여(가지치기),</text>
        <text x="0" y="36" fill="hsl(var(--muted-foreground))" fontSize="12">탐색 공간(Search Space)을 기하급수적으로 줄입니다.</text>
      </g>

    </svg>
  );
}
