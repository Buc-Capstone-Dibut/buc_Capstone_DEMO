"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

// Tower of Hanoi visualizer
type Disk = { id: number; size: number };

const INITIAL_STATE: [Disk[], Disk[], Disk[]] = [
  [{ id: 5, size: 5 }, { id: 4, size: 4 }, { id: 3, size: 3 }, { id: 2, size: 2 }, { id: 1, size: 1 }],
  [],
  []
];

type TowerState = [Disk[], Disk[], Disk[]];

// Pre-computed moves for Hanoi(5)
const MOVES_N3 = [
  [0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2] // 7 moves for N=3
];

export function useTowerOfHanoiSim() {
  const [towers, setTowers] = useState<TowerState>([[{ id: 3, size: 3 }, { id: 2, size: 2 }, { id: 1, size: 1 }], [], []]);
  const [moveIndex, setMoveIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Tower of Hanoi — N=3 Disks",
    "> [AWAIT] Simulating f(N) = 2^N - 1 = 7 moves. Press Step to trace recursion."
  ]);
  const maxMoves = MOVES_N3.length;

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const PEG_NAMES = ['A', 'B', 'C'];

  const peek = useCallback(() => {
    if (moveIndex >= maxMoves - 1) return;
    const nextIdx = moveIndex + 1;
    const [from, to] = MOVES_N3[nextIdx];
    setTowers(prev => {
      const next: TowerState = [prev[0].slice(), prev[1].slice(), prev[2].slice()];
      const disk = next[from].pop();
      if (disk) next[to].push(disk);
      appendLog(`[MOVE ${nextIdx + 1}/${maxMoves}] Disk ${disk?.size} : Peg ${PEG_NAMES[from]} → Peg ${PEG_NAMES[to]}`);
      return next;
    });
    setMoveIndex(nextIdx);
  }, [appendLog, moveIndex, maxMoves]);

  const reset = useCallback(() => {
    setTowers([[{ id: 3, size: 3 }, { id: 2, size: 2 }, { id: 1, size: 1 }], [], []]);
    setMoveIndex(-1);
    setLogs(["> SYSTEM RESET: Disks returned to Peg A."]);
  }, []);

  const isComplete = moveIndex === maxMoves - 1;

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { towers, moveIndex, isComplete, maxMoves },
      logs,
      handlers: { peek: !isComplete ? peek : reset, reset, clear: reset }
    }
  };
}

export function TowerOfHanoiVisualizer({ data }: { data: { towers: TowerState, moveIndex: number, isComplete: boolean, maxMoves: number } }) {
  const { towers, moveIndex, isComplete, maxMoves } = data;
  const PEG_NAMES = ['Peg A (Source)', 'Peg B (Helper)', 'Peg C (Target)'];
  const MAX_SIZE = 5;
  const DISK_COLORS = ['hsl(var(--purple-500))', 'hsl(var(--cyan-500))', 'hsl(var(--emerald-500))', 'hsl(var(--orange-500))', 'hsl(var(--destructive))'];

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-10">
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono rounded-xl py-6 gap-6 px-4">
      <CyberGrid />

      <motion.div className="w-full max-w-4xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className={`h-2 w-2 rounded-full animate-pulse ${isComplete ? 'bg-emerald-500' : 'bg-orange-500'}`} />
        <p className="text-sm font-medium tracking-wide">
          {isComplete ? <><span className="text-emerald-500 font-bold">Complete!</span> All 3 disks moved to Peg C in {maxMoves} moves. Complexity: O(2^N - 1).</> :
           moveIndex === -1 ? <>Tower of Hanoi: Move all disks from <span className="text-purple-500 font-bold">Peg A → Peg C</span> using Peg B. N disks = 2^N-1 moves. </> :
           `Move ${moveIndex + 1} of ${maxMoves} — Recursion divides problem: move N-1 disks, move largest disk, move N-1 disks back.`}
        </p>
        <div className="ml-auto text-xs text-muted-foreground border border-border rounded px-3 py-1 bg-muted/40">
          {moveIndex + 1}/{maxMoves}
        </div>
      </motion.div>

      {/* Towers */}
      <div className="w-full max-w-4xl z-10 flex gap-4 items-end justify-center">
        {towers.map((tower, ti) => (
          <div key={`tower-${ti}`} className="flex-1 flex flex-col items-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 bg-muted px-2 py-0.5 rounded-full border border-border text-center">
              {PEG_NAMES[ti]}
            </div>

            {/* Disk slots (MAX_SIZE) */}
            <div className="relative flex flex-col-reverse gap-1 items-center min-h-[180px] justify-start">
              {/* Peg pole */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-full bg-card border border-border/50 rounded" />

              {Array.from({ length: 3 }).map((_, si) => {
                const disk = tower[si];
                if (!disk) return (
                  <div key={`empty-${si}`} className="w-full h-10 opacity-0" />
                );
                const widthPct = 30 + disk.size * 14;
                const color = DISK_COLORS[(disk.size - 1) % DISK_COLORS.length];
                return (
                  <motion.div key={`disk-${disk.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="h-10 rounded-lg flex items-center justify-center relative z-10 font-black text-sm border-2"
                    style={{ width: `${widthPct}%`, backgroundColor: color + '33', borderColor: color, color, boxShadow: `0 0 10px ${color}44` }}
                  >
                    D{disk.size}
                  </motion.div>
                );
              })}
            </div>

            {/* Base */}
            <div className="w-full h-3 bg-card border-2 border-border rounded mt-1" />
          </div>
        ))}
      </div>

      {/* Complexity note */}
      <div className="flex gap-4 z-10">
        <div className="bg-card/50 border border-border rounded-xl px-5 py-2 text-xs font-mono">
          <span className="text-muted-foreground">T(N) = </span><span className="text-orange-500 font-black">2^N - 1</span><span className="text-muted-foreground"> moves</span>
        </div>
        <div className="bg-card/50 border border-border rounded-xl px-5 py-2 text-xs font-mono">
          <span className="text-muted-foreground">N=3 → </span><span className="text-orange-500 font-black">7</span><span className="text-muted-foreground"> moves</span>
        </div>
        <div className="bg-card/50 border border-border rounded-xl px-5 py-2 text-xs font-mono">
          <span className="text-muted-foreground">Complexity: </span><span className="text-destructive font-black">O(2^N)</span>
        </div>
      </div>
    </div>
  );
}
