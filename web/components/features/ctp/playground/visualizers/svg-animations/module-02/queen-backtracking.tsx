import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

const DEFAULT_N = 4;

type QueenState = {
  n: number;
  board: (boolean | null)[][]; // true = queen, null = blocked/attacked, false = empty
  queens: number[];            // column per row, -1 if not placed
  currentRow: number;
  attemptCol: number;
  isBacktracking: boolean;
  isSolved: boolean;
  removed: { row: number; col: number } | null; // cell vacated by the most recent undo
  nodesVisited: number;        // search-tree nodes touched so far (pruning metric)
};

function safe(queens: number[], row: number, col: number): boolean {
  for (let r = 0; r < row; r++) {
    const c = queens[r];
    if (c === col) return false;
    if (Math.abs(c - col) === Math.abs(r - row)) return false;
  }
  return true;
}

// Run real backtracking for N, recording a snapshot at every decision so the
// slider can scrub the whole search — including the undo (backtrack) frames.
function generateQueenSteps(n: number): QueenState[] {
  const steps: QueenState[] = [];
  const queens = new Array(n).fill(-1);
  let nodes = 0;

  const emptyBoard = (): (boolean | null)[][] => Array.from({ length: n }, () => Array(n).fill(false));

  // Build the visible board from the current `queens` placement, optionally
  // marking the cells in `blockedRow` that are attacked (the conflict frame).
  const renderBoard = (placedRows: number, blockedRow?: number): (boolean | null)[][] => {
    const b = emptyBoard();
    for (let r = 0; r < placedRows; r++) if (queens[r] >= 0) b[r][queens[r]] = true;
    if (blockedRow !== undefined) {
      for (let c = 0; c < n; c++) if (!safe(queens, blockedRow, c)) b[blockedRow][c] = null;
    }
    return b;
  };

  steps.push({
    n, board: emptyBoard(), queens: [...queens], currentRow: 0, attemptCol: 0,
    isBacktracking: false, isSolved: false, removed: null, nodesVisited: 0,
  });

  let solved = false;
  const solve = (row: number): boolean => {
    if (row === n) { solved = true; return true; }
    let anySafe = false;
    for (let col = 0; col < n; col++) {
      nodes++;
      if (safe(queens, row, col)) {
        anySafe = true;
        queens[row] = col;
        const willSolve = row + 1 === n;
        steps.push({
          n, board: renderBoard(row + 1), queens: [...queens], currentRow: row + 1, attemptCol: col,
          isBacktracking: false, isSolved: willSolve, removed: null, nodesVisited: nodes,
        });
        if (solve(row + 1)) return true;
        // backtrack: undo this placement (distinct frame so the undo motion shows)
        const removedCol = queens[row];
        queens[row] = -1;
        steps.push({
          n, board: renderBoard(row), queens: [...queens], currentRow: row, attemptCol: removedCol,
          isBacktracking: true, isSolved: false, removed: { row, col: removedCol }, nodesVisited: nodes,
        });
      }
    }
    if (!anySafe) {
      // dead end: show the row fully blocked before unwinding to the parent
      steps.push({
        n, board: renderBoard(row, row), queens: [...queens], currentRow: row, attemptCol: 0,
        isBacktracking: true, isSolved: false, removed: null, nodesVisited: nodes,
      });
    }
    return false;
  };

  solve(0);

  if (solved) {
    steps.push({
      n, board: renderBoard(n), queens: [...queens], currentRow: n, attemptCol: 0,
      isBacktracking: false, isSolved: true, removed: null, nodesVisited: nodes,
    });
  }
  return steps;
}

export function useQueenBacktrackingSim(initial: number | number[] = DEFAULT_N) {
  const n = Array.isArray(initial)
    ? Math.max(4, Math.min(6, initial.length || DEFAULT_N))
    : Math.max(4, Math.min(6, initial));

  const [steps, setSteps] = useState<QueenState[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const baseLog = `> 시스템 초기화: N-Queen 백트래킹 (N=${n})`;

  const buildMsg = useCallback((s: QueenState, prev: QueenState | undefined): string => {
    if (s.isSolved && s.currentRow === s.n) return `[해결] ${s.n}개의 퀸이 모두 안전하게 배치됨! 열: ${s.queens.join(', ')} · 방문 노드 ${s.nodesVisited}`;
    if (s.removed) return `[백트래킹·UNDO] 행 ${s.removed.row}, 열 ${s.removed.col}의 퀸을 제거하고 다음 열을 시도합니다.`;
    if (s.isBacktracking) return `[막다른 길] 행 ${s.currentRow}: 안전한 열이 없습니다(모두 공격받음). 이전 행으로 되돌아갑니다.`;
    if (prev && s.currentRow > 0) return `[배치] 행 ${s.currentRow - 1}, 열 ${s.attemptCol}에 퀸 배치. 행 ${s.currentRow}로 전진. (방문 ${s.nodesVisited})`;
    return `[시작] 행 0, 열 ${s.attemptCol}에 퀸 배치를 시도합니다.`;
  }, []);

  const rebuildLogs = useCallback((idx: number, src: QueenState[]) => {
    const out = [baseLog, "> [대기] 충돌 없이 퀸을 배치하고, 막히면 즉시 가지치기·백트래킹합니다."];
    for (let i = 1; i <= idx; i++) out.unshift(`[Step ${i}/${src.length - 1}] ${buildMsg(src[i], src[i - 1])}`);
    setLogs(out);
  }, [baseLog, buildMsg]);

  useEffect(() => {
    const generated = generateQueenSteps(n);
    setSteps(generated);
    setStepIdx(0);
    rebuildLogs(0, generated);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    rebuildLogs(newStep, steps);
  }, [steps, rebuildLogs]);

  const nextStep = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= steps.length - 1 ? prev : prev + 1;
      if (next !== prev) rebuildLogs(next, steps);
      return next;
    });
  }, [steps, rebuildLogs]);

  const reset = useCallback(() => { setStepIdx(0); rebuildLogs(0, steps); }, [steps, rebuildLogs]);

  const current = steps[stepIdx];

  return {
    runSimulation: () => {},
    interactive: {
      visualData: current,
      logs,
      handlers: { push: nextStep, clear: reset },
      currentStep: stepIdx,
      maxSteps: steps.length,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

export function QueenBacktrackingVisualizer({ data }: { data?: QueenState }) {
  if (!data) return null;
  const { n, board, queens, currentRow, isBacktracking, isSolved, removed, nodesVisited } = data;
  const QUEEN_LABEL = 'Q';

  // Board fits a fixed ~280px square regardless of N.
  const BOARD_SPAN = 280;
  const CELL_SIZE = BOARD_SPAN / n;
  const BOARD_X = 90;
  const BOARD_Y = 150;
  const qFont = Math.max(14, Math.min(22, CELL_SIZE * 0.45));
  const qRadius = Math.max(10, CELL_SIZE * 0.3);

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.gridLine} strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neon-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title */}
      <text x="40" y="50" fill={isSolved ? "hsl(160 84% 39%)" : isBacktracking ? "hsl(24 95% 53%)" : "hsl(189 94% 43%)"} fontSize="24" fontWeight="bold" letterSpacing="2" filter={`url(#neon-glow-${isSolved ? 'emerald' : isBacktracking ? 'orange' : 'cyan'})`}>
        {isSolved ? "해결 완료!" : isBacktracking ? "백트래킹 (UNDO)" : "N-QUEEN 백트래킹"}
      </text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">
        N={n} · 충돌 시 즉시 되돌아가(백트래킹) 가지치기로 탐색 공간을 줄입니다.
      </text>

      {/* Status Panel */}
      <g transform="translate(420, 25)">
        <rect width="340" height="60" fill="hsl(var(--card))" opacity="0.8" stroke="hsl(var(--border))" rx="8" />
        <text x="170" y="24" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">
          {isSolved ? `모든 ${n}개의 퀸이 공격받지 않는 위치에 배치되었습니다.` : isBacktracking ? "이 경로는 막다른 길 — 이전 행으로 되돌립니다 (Undo)." : "유망하지 않은 경로를 가지치기하며 탐색 공간을 줄입니다."}
        </text>
        <text x="170" y="46" fill={isSolved ? "hsl(160 84% 39%)" : isBacktracking ? "hsl(24 95% 53%)" : "hsl(189 94% 43%)"} fontSize="13" fontWeight="bold" textAnchor="middle">
          {isSolved ? `성공! · 방문 노드 ${nodesVisited}` : isBacktracking ? "되돌아가는 중 (Backtrack)..." : `안전한 위치 탐색 중... · 방문 노드 ${nodesVisited}`}
        </text>
      </g>

      {/* Chess Board Area */}
      <rect x={BOARD_X - 10} y={BOARD_Y - 10} width={BOARD_SPAN + 20} height={BOARD_SPAN + 20} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" rx="8" />
      <text x={BOARD_X + BOARD_SPAN / 2} y={BOARD_Y - 20} fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="2" textAnchor="middle" fontWeight="bold">체스보드 ({n}×{n})</text>

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
            <motion.g key={`cell-${ri}-${ci}`}
              initial={false}
              animate={{ opacity: 1 }}>
              <rect
                x={cx + 2} y={cy + 2} width={CELL_SIZE - 4} height={CELL_SIZE - 4}
                fill={isQueen ? (isSolved ? colorTokens.successSoft : colorTokens.infoSoft) : isBlocked ? colorTokens.warningDim : isActiveRow ? colorTokens.primaryHighlightDim : isLightSq ? "hsl(var(--muted))" : "hsl(var(--card))"}
                stroke={isQueen ? (isSolved ? "hsl(160 84% 39%)" : "hsl(189 94% 43%)") : isBlocked ? colorTokens.warningEdge : isActiveRow ? "hsl(271 91% 65%)" : "transparent"}
                strokeWidth={isQueen ? 2 : 1} rx="6"
              />
              <text x={cx + 4} y={cy + 11} fill={colorTokens.coordinateLabel} fontSize="8" textAnchor="start">{ri},{ci}</text>

              {/* Blocked marker (diagonal X) */}
              {isBlocked && (
                <g>
                  <line x1={cx + 12} y1={cy + 12} x2={cx + CELL_SIZE - 12} y2={cy + CELL_SIZE - 12} stroke={colorTokens.warningEdge} strokeWidth="3" strokeLinecap="round" />
                  <line x1={cx + CELL_SIZE - 12} y1={cy + 12} x2={cx + 12} y2={cy + CELL_SIZE - 12} stroke={colorTokens.warningEdge} strokeWidth="3" strokeLinecap="round" />
                </g>
              )}

              {/* Queen marker */}
              {isQueen && (
                <motion.g
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ filter: isSolved ? 'url(#neon-glow-emerald)' : 'url(#neon-glow-cyan)' }}>
                  <circle cx={cx + CELL_SIZE / 2} cy={cy + CELL_SIZE / 2} r={qRadius}
                    fill={isSolved ? colorTokens.successSoft : colorTokens.infoSoft}
                    stroke={isSolved ? colorTokens.success : colorTokens.info} strokeWidth="2" />
                  <text x={cx + CELL_SIZE / 2} y={cy + CELL_SIZE / 2 + qFont * 0.35}
                    fill={isSolved ? colorTokens.success : colorTokens.info} fontSize={qFont} fontWeight="900" textAnchor="middle">{QUEEN_LABEL}</text>
                </motion.g>
              )}
            </motion.g>
          );
        })
      )}

      {/* Undo ghost — the queen just removed by a backtrack, fading out in place */}
      <AnimatePresence>
        {removed && (
          <motion.g key={`undo-${removed.row}-${removed.col}`}
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.6, y: -18 }}
            transition={{ duration: 0.6, ease: "easeOut" }}>
            <circle cx={BOARD_X + removed.col * CELL_SIZE + CELL_SIZE / 2} cy={BOARD_Y + removed.row * CELL_SIZE + CELL_SIZE / 2} r={qRadius}
              fill="none" stroke="hsl(24 95% 53%)" strokeWidth="2.5" strokeDasharray="3 3" />
            <text x={BOARD_X + removed.col * CELL_SIZE + CELL_SIZE / 2} y={BOARD_Y + removed.row * CELL_SIZE + CELL_SIZE / 2 + 5}
              fill="hsl(24 95% 53%)" fontSize={qFont} fontWeight="900" textAnchor="middle">{QUEEN_LABEL}</text>
            <text x={BOARD_X + removed.col * CELL_SIZE + CELL_SIZE / 2} y={BOARD_Y + removed.row * CELL_SIZE - 4}
              fill="hsl(24 95% 53%)" fontSize="9" fontWeight="bold" textAnchor="middle">UNDO ✕</text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Placement Status Area */}
      <rect x="430" y="150" width="320" height={Math.max(240, n * 44 + 20)} fill="none" stroke="hsl(var(--border))" rx="12" />
      <text x="590" y="130" fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="2" textAnchor="middle" fontWeight="bold">배치 상태 (PLACEMENT STATUS)</text>

      {queens.map((col, row) => {
        const rowH = Math.min(44, (Math.max(240, n * 44 + 20) - 30) / n);
        const y = 162 + row * rowH;
        const isActive = row === currentRow && !isSolved;
        const isPlaced = col >= 0;
        return (
          <g key={`status-${row}`}>
            <rect x="448" y={y} width="284" height={rowH - 6}
              fill={isPlaced ? colorTokens.infoGhost : isActive ? colorTokens.primaryHighlightGhost : colorTokens.faintFill}
              stroke={isPlaced ? colorTokens.infoEdge : isActive ? colorTokens.primaryHighlightEdge : colorTokens.faintEdge}
              strokeWidth="1" rx="6" />
            <text x="462" y={y + (rowH - 6) / 2 + 4} fill="hsl(var(--muted-foreground))" fontSize="12">행 {row}:</text>
            <AnimatePresence mode="wait">
              {isPlaced ? (
                <text x="718" y={y + (rowH - 6) / 2 + 4} fill="hsl(189 94% 43%)" fontSize="12" fontWeight="bold" textAnchor="end">열(Col) {col}에 {QUEEN_LABEL}</text>
              ) : isActive ? (
                <text x="718" y={y + (rowH - 6) / 2 + 4} fill="hsl(271 91% 65%)" fontSize="12" fontWeight="bold" textAnchor="end">{isBacktracking ? "↩ 되돌리는 중" : "← 현재 (Current)"}</text>
              ) : (
                <text x="718" y={y + (rowH - 6) / 2 + 4} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="end">—</text>
              )}
            </AnimatePresence>
          </g>
        );
      })}

      {/* Key Concept Note */}
      <g transform="translate(40, 460)">
        <text x="0" y="0" fill="hsl(24 95% 53%)" fontSize="12" fontWeight="bold">핵심:</text>
        <text x="42" y="0" fill="hsl(var(--muted-foreground))" fontSize="12">제약 위반 순간 경로를 포기(가지치기)하고 상태를 복원(Undo)해</text>
        <text x="0" y="18" fill="hsl(var(--muted-foreground))" fontSize="12">탐색 공간을 기하급수적으로 줄입니다. N이 커질수록 가지치기 효과가 커집니다.</text>
      </g>
    </svg>
  );
}
