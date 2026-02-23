"use client";

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
    "> SYSTEM INITIALIZED: N-Queens Backtracking (N=4)",
    "> [AWAIT] Find positions for 4 queens with no conflicts. Press Step to trace."
  ]);

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const peek = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= STEPS.length - 1 ? 0 : prev + 1;
      const s = STEPS[next];
      if (s.isSolved) appendLog("[SOLUTION FOUND] All 4 queens placed safely! Board [col]: " + s.queens.join(', '));
      else if (s.isBacktracking) appendLog(`[BACKTRACK] Row ${s.currentRow}: No safe column. Removing queen from Row ${s.currentRow - 1}, trying next column.`);
      else if (s.queens.every(q => q === -1)) appendLog("[START] Placing queen in Row 0, Column 0.");
      else appendLog(`[PLACE] Queen placed at Row ${s.currentRow - 1}, Col ${s.queens[s.currentRow - 1]}. Moving to Row ${s.currentRow}.`);
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStepIdx(0);
    setLogs(["> SYSTEM RESET: Board cleared."]);
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

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-10">
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono rounded-xl py-6 gap-6 px-4">
      <CyberGrid />

      <motion.div className={`w-full max-w-4xl z-10 flex gap-4 items-center px-4 py-3 backdrop-blur-md border rounded-xl ${isSolved ? 'bg-emerald-500/10 border-emerald-500/30' : isBacktracking ? 'bg-orange-500/10 border-orange-500/30' : 'bg-card/60 border-border'}`} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className={`h-2 w-2 rounded-full animate-pulse ${isSolved ? 'bg-emerald-500' : isBacktracking ? 'bg-orange-500' : 'bg-purple-500'}`} />
        <p className="text-sm font-medium tracking-wide">
          {isSolved ? <><span className="text-emerald-500 font-bold">✓ Solution Found!</span> All 4 queens placed with no attacks.</> :
           isBacktracking ? <><span className="text-orange-500 font-bold">⟵ Backtracking!</span> No valid position in this row. Retreating to try next column.</> :
           <><span className="text-purple-500 font-bold">N-Queens Backtracking:</span> Try placing a queen. If conflict — remove it (backtrack) and try the next position.</>}
        </p>
      </motion.div>

      <div className="w-full max-w-4xl z-10 flex flex-col lg:flex-row gap-8 items-center justify-center">

        {/* Chess Board */}
        <div className="bg-card/40 backdrop-blur rounded-2xl border border-border p-6 flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-4">Chessboard (4×4)</div>

          <div className="grid grid-cols-4 gap-1">
            {board.map((row, ri) =>
              row.map((cell, ci) => {
                const isQueen = cell === true;
                const isBlocked = cell === null;
                const isLightSq = (ri + ci) % 2 === 0;
                const isActiveRow = ri === currentRow && !isSolved;

                return (
                  <motion.div key={`sq-${ri}-${ci}`}
                    className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl relative overflow-hidden border-2 transition-all duration-300
                      ${isQueen ? (isSolved ? 'border-emerald-500 bg-emerald-500/20' : 'border-cyan-500 bg-cyan-500/20') :
                        isBlocked ? 'border-orange-500/40 bg-orange-500/10' :
                        isActiveRow ? 'border-border bg-muted/30' :
                        'border-border/30 ' + (isLightSq ? 'bg-card/40' : 'bg-card/20')}`}
                    animate={{ scale: isQueen ? 1.05 : 1 }}
                  >
                    {isBlocked && <div className="absolute inset-0 flex items-center justify-center text-orange-500/40 text-xl font-black">✗</div>}
                    {isQueen && (
                      <motion.span
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className={`text-2xl z-10 ${isSolved ? 'text-emerald-500 drop-shadow-[0_0_8px_currentColor]' : 'text-cyan-500 drop-shadow-[0_0_8px_currentColor]'}`}
                      >
                        {QUEEN_EMOJI}
                      </motion.span>
                    )}
                    {isActiveRow && !isQueen && !isBlocked && (
                      <motion.div className="absolute inset-0 bg-purple-500/10" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} />
                    )}
                    <span className="absolute bottom-0.5 right-1 text-[7px] text-muted-foreground/30">{ri},{ci}</span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Status Column */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <div className="bg-[#0d1117]/80 rounded-2xl p-5 border border-border text-sm font-mono flex flex-col gap-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Placement Status</div>
            {queens.map((col, row) => (
              <div key={`q-status-${row}`} className={`flex justify-between items-center p-2 rounded-lg border
                ${col >= 0 ? 'border-cyan-500/30 bg-cyan-500/5' : row === currentRow ? 'border-purple-500/30 bg-purple-500/5' : 'border-border/30 bg-card/20'}`}>
                <span className="text-muted-foreground text-xs">Row {row}:</span>
                {col >= 0 ? (
                  <span className="text-cyan-500 font-black text-xs">{QUEEN_EMOJI} at Col {col}</span>
                ) : row === currentRow ? (
                  <span className="text-purple-500 font-black text-xs">← Current</span>
                ) : (
                  <span className="text-muted-foreground/30 text-xs">—</span>
                )}
              </div>
            ))}
          </div>

          <div className="bg-card/50 rounded-xl border border-border p-4 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Key Concept:</strong> Backtracking prunes the search tree by abandoning paths the moment a constraint is violated — drastically reducing the search space.
          </div>
        </div>
      </div>
    </div>
  );
}
