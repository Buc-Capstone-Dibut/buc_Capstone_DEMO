import { useState, useCallback } from "react";
import { motion } from "framer-motion";

// Tower of Hanoi visualizer
type Disk = { id: number; size: number };

const INITIAL_STATE: [Disk[], Disk[], Disk[]] = [
  [{ id: 3, size: 3 }, { id: 2, size: 2 }, { id: 1, size: 1 }],
  [],
  []
];

type TowerState = [Disk[], Disk[], Disk[]];

// Pre-computed moves for Hanoi(3)
const MOVES_N3 = [
  [0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2] // 7 moves for N=3
];

export function useTowerOfHanoiSim() {
  const [towers, setTowers] = useState<TowerState>([[{ id: 3, size: 3 }, { id: 2, size: 2 }, { id: 1, size: 1 }], [], []]);
  const [moveIndex, setMoveIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 하노이의 탑 — N=3 디스크",
    "> [대기] f(N) = 2^N - 1 = 7 번의 이동 시뮬레이션. Step을 눌러 재귀를 추적하세요."
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
      appendLog(`[이동 ${nextIdx + 1}/${maxMoves}] 디스크 ${disk?.size} : 기둥 ${PEG_NAMES[from]} → 기둥 ${PEG_NAMES[to]}`);
      return next;
    });
    setMoveIndex(nextIdx);
  }, [appendLog, moveIndex, maxMoves]);

  const reset = useCallback(() => {
    setTowers([[{ id: 3, size: 3 }, { id: 2, size: 2 }, { id: 1, size: 1 }], [], []]);
    setMoveIndex(-1);
    setLogs(["> 시스템 리셋: 디스크가 기둥 A로 돌아갔습니다."]);
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
  const PEG_NAMES = ['기둥 A (시작)', '기둥 B (보조)', '기둥 C (목표)'];
  const DISK_COLORS = ['#ef4444', '#f97316', '#10b981', '#06b6d4', '#a855f7']; // Mapping to red, orange, emerald, cyan, purple

  const getPegX = (pegIndex: number) => 150 + pegIndex * 250;
  const getDiskY = (diskIndex: number) => 380 - (diskIndex * 30);
  const getDiskWidth = (size: number) => 60 + size * 25;

  const allDisks = towers.flatMap((tower, pegIdx) =>
    tower.map((disk, idx) => ({ ...disk, pegIdx, idx }))
  );

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
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
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

      {/* Title */}
      <text x="40" y="50" fill={isComplete ? "#10b981" : "#f97316"} fontSize="24" fontWeight="bold" letterSpacing="2" filter={`url(#neon-glow-${isComplete ? 'emerald' : 'orange'})`}>
        하노이의 탑 (TOWER OF HANOI)
      </text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">
        분할 정복 (Divide and Conquer): N개의 디스크 이동
      </text>

      {/* Status Box */}
      <g transform="translate(430, 25)">
        <rect width="330" height="60" fill="hsl(var(--card))" opacity="0.8" stroke="hsl(var(--border))" rx="8" />
        <text x="165" y="25" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle" letterSpacing="1">
          {isComplete ? "완료 (SUCCESS)" : moveIndex === -1 ? "시작 대기 중 (AWAITING START)" : `${maxMoves}번 중 ${moveIndex + 1}번째 이동`}
        </text>
        <text x="165" y="45" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle" fontWeight="bold">
          {isComplete ? "모든 디스크가 목표 기둥으로 이동함" : `f(N) = 2^N - 1 = 총 7번 이동`}
        </text>
      </g>

      {/* Pegs and Bases */}
      {[0, 1, 2].map(pegIndex => {
        const cx = getPegX(pegIndex);
        return (
          <g key={`peg-${pegIndex}`}>
            {/* Base */}
            <rect x={cx - 100} y="390" width="200" height="15" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" rx="4" />

            {/* Pole */}
            <rect x={cx - 6} y="180" width="12" height="210" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" rx="6" />

            {/* Label */}
            <rect x={cx - 60} y="415" width="120" height="25" fill="hsl(var(--card))" stroke="hsl(var(--border))" rx="4" />
            <text x={cx} y="432" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="1">{PEG_NAMES[pegIndex]}</text>
          </g>
        );
      })}

      {/* Disks */}
      {allDisks.map(disk => {
        const w = getDiskWidth(disk.size);
        const x = getPegX(disk.pegIdx) - w / 2;
        const y = getDiskY(disk.idx);
        const color = DISK_COLORS[disk.size - 1]; // using size strictly for color mapping (1->red, 2->orange, 3->emerald)

        return (
          <motion.g
            key={`disk-${disk.id}`}
            animate={{ x, y }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <rect
              width={w}
              height="25"
              fill={`${color}33`}
              stroke={color}
              strokeWidth="2"
              rx="6"
              style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
            />
            <text
              x={w/2}
              y="17"
              fill={color}
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              Disk {disk.size}
            </text>
          </motion.g>
        );
      })}

      {/* Complexity Annotations */}
      <g transform="translate(100, 470)">
        <text x="0" y="0" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="monospace">
          알고리즘: <tspan fill="#a855f7" fontWeight="bold">hanoi(n, src, aux, tgt)</tspan>
        </text>
        <text x="300" y="0" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="monospace">
          시간 복잡도: <tspan fill="#ef4444" fontWeight="bold">O(2^N)</tspan>
        </text>
        <text x="500" y="0" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="monospace">
          공간 복잡도: <tspan fill="#06b6d4" fontWeight="bold">O(N)</tspan> 호출 스택 깊이
        </text>
      </g>
    </svg>
  );
}
