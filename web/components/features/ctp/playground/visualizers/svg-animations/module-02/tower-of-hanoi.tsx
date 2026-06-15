import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// Tower of Hanoi visualizer — N variable, full slider/autoplay contract.
type Disk = { id: number; size: number };
type TowerState = [Disk[], Disk[], Disk[]];
type Move = { from: number; to: number; size: number; depth: number; sub: 'A' | 'B' | 'C' };

const PEG_NAMES = ['A', 'B', 'C'];
const DEFAULT_N = 3;

function makeInitial(n: number): TowerState {
  // Largest disk (size n) at the bottom, smallest (size 1) on top of peg A.
  const a: Disk[] = [];
  for (let s = n; s >= 1; s--) a.push({ id: s, size: s });
  return [a, [], []];
}

// Recursive solver records each move plus which of the 3 sub-phases it belongs to:
//   'A' = move(n-1) src→aux, 'B' = move largest src→dst, 'C' = move(n-1) aux→dst.
function solveHanoi(n: number): Move[] {
  const moves: Move[] = [];
  const rec = (k: number, src: number, aux: number, dst: number, depth: number, sub: Move['sub']) => {
    if (k === 0) return;
    rec(k - 1, src, dst, aux, depth + 1, 'A');
    moves.push({ from: src, to: dst, size: k, depth, sub });
    rec(k - 1, aux, src, dst, depth + 1, 'C');
  };
  rec(n, 0, 1, 2, 0, 'B');
  return moves;
}

// Replay the first `count` moves from the initial state.
function towersAfter(n: number, moves: Move[], count: number): TowerState {
  const t = makeInitial(n);
  for (let i = 0; i < count; i++) {
    const m = moves[i];
    const disk = t[m.from].pop();
    if (disk) t[m.to].push(disk);
  }
  return t;
}

export function useTowerOfHanoiSim(initial: number | number[] = DEFAULT_N) {
  // sampleData arrives as number[] (the disk sizes) — its length is N.
  const n = Array.isArray(initial)
    ? Math.max(2, Math.min(5, initial.length || DEFAULT_N))
    : Math.max(2, Math.min(5, initial));

  const [moves, setMoves] = useState<Move[]>([]);
  const [stepIdx, setStepIdx] = useState(0); // 0 = initial, k = after k-th move
  const [logs, setLogs] = useState<string[]>([]);

  const total = (1 << n) - 1; // 2^n - 1
  const baseLog = `> 시스템 초기화: 하노이의 탑 — N=${n} 디스크`;

  useEffect(() => {
    setMoves(solveHanoi(n));
    setStepIdx(0);
    setLogs([baseLog, `> [대기] f(N) = 2^N - 1 = ${total}번 이동. Step을 눌러 재귀 분해를 추적하세요.`]);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  const rebuildLogs = useCallback((idx: number) => {
    const out = [baseLog];
    for (let i = 1; i <= idx; i++) {
      const m = moves[i - 1];
      out.unshift(`[이동 ${i}/${total}] 디스크 ${m.size} : 기둥 ${PEG_NAMES[m.from]} → 기둥 ${PEG_NAMES[m.to]} (깊이 ${m.depth})`);
    }
    setLogs(out);
  }, [moves, total, baseLog]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep > total) return;
    setStepIdx(newStep);
    rebuildLogs(newStep);
  }, [total, rebuildLogs]);

  const nextStep = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= total ? prev : prev + 1;
      if (next !== prev) rebuildLogs(next);
      return next;
    });
  }, [total, rebuildLogs]);

  const reset = useCallback(() => { setStepIdx(0); rebuildLogs(0); }, [rebuildLogs]);

  const towers = towersAfter(n, moves, stepIdx);
  const isComplete = stepIdx === total && total > 0;
  const lastMove = stepIdx > 0 ? moves[stepIdx - 1] : null;

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { towers, n, moveIndex: stepIdx - 1, isComplete, maxMoves: total, lastMove },
      logs,
      handlers: { push: nextStep, clear: reset },
      currentStep: stepIdx,
      maxSteps: total + 1, // include the initial state as step 0
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

// Lift height for the 3-stage move keyframe (up → across → down).
const LIFT_Y = 150;

type DiskRenderProps = { id: number; size: number; x: number; y: number; w: number; color: string };

function HanoiDisk({ id, size, x, y, w, color }: DiskRenderProps) {
  const prevRef = useRef<{ x: number; y: number } | null>(null);
  const prev = prevRef.current;
  prevRef.current = { x, y };

  const animateProp =
    prev === null
      ? { x, y }
      : { x: [prev.x, prev.x, x, x], y: [prev.y, LIFT_Y, LIFT_Y, y] };

  return (
    <motion.g
      key={`disk-${id}`}
      animate={animateProp}
      transition={{ duration: 0.7, times: [0, 0.35, 0.65, 1], ease: "easeInOut" }}
    >
      <rect width={w} height="22" fill={`${color}33`} stroke={color} strokeWidth="2" rx="6" style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
      <text x={w / 2} y="16" fill={color} fontSize="11" fontWeight="bold" textAnchor="middle">{size}</text>
    </motion.g>
  );
}

type VData = { towers: TowerState; n: number; moveIndex: number; isComplete: boolean; maxMoves: number; lastMove: Move | null };

export function TowerOfHanoiVisualizer({ data }: { data?: VData }) {
  if (!data) return null;
  const { towers, n, moveIndex, isComplete, maxMoves, lastMove } = data;
  const PEG_FULL = ['기둥 A (시작)', '기둥 B (보조)', '기둥 C (목표)'];
  // size-keyed palette wraps for larger N: index = (n - size) so the biggest disk is always red.
  const DISK_COLORS = ['hsl(0 84% 60%)', 'hsl(24 95% 53%)', 'hsl(45 93% 47%)', 'hsl(160 84% 39%)', 'hsl(189 94% 43%)', 'hsl(271 91% 65%)'];

  const getPegX = (pegIndex: number) => 150 + pegIndex * 250;
  const getDiskY = (diskIndex: number) => 380 - (diskIndex * 26);
  // Width scales down a touch as N grows so a 5-disk stack fits the peg span.
  const widthSpan = Math.min(140, 60 + (5 - n) * 12);
  const getDiskWidth = (size: number) => 40 + (size / n) * widthSpan;

  const allDisks = towers.flatMap((tower, pegIdx) => tower.map((disk, idx) => ({ ...disk, pegIdx, idx })));

  // Recursive-decomposition phase label for the current move.
  const subLabel = lastMove
    ? lastMove.sub === 'A' ? 'move(n-1): 출발 → 보조'
      : lastMove.sub === 'C' ? 'move(n-1): 보조 → 목표'
        : 'move(1): 가장 큰 원판 이동'
    : null;

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.gridLine} strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neon-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title */}
      <text x="40" y="50" fill={isComplete ? "hsl(160 84% 39%)" : "hsl(24 95% 53%)"} fontSize="24" fontWeight="bold" letterSpacing="2" filter={`url(#neon-glow-${isComplete ? 'emerald' : 'orange'})`}>
        하노이의 탑 (TOWER OF HANOI)
      </text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">
        분할 정복 (Divide and Conquer): N={n} 디스크 · 재귀 분해
      </text>

      {/* Status Box — shows live exponential count and the recursion sub-phase */}
      <g transform="translate(430, 25)">
        <rect width="330" height="60" fill="hsl(var(--card))" opacity="0.8" stroke="hsl(var(--border))" rx="8" />
        <text x="165" y="24" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle" letterSpacing="1">
          {isComplete ? "완료 (SUCCESS)" : moveIndex === -1 ? "시작 대기 중 (AWAITING START)" : `${maxMoves}번 중 ${moveIndex + 1}번째 이동`}
        </text>
        <text x="165" y="44" fill="hsl(var(--foreground))" fontSize="13" textAnchor="middle" fontWeight="bold">
          {isComplete ? "모든 디스크가 목표 기둥으로 이동함" : subLabel ? subLabel : `f(N) = 2^N - 1 = ${maxMoves}번 이동`}
        </text>
      </g>

      {/* Pegs and Bases */}
      {[0, 1, 2].map(pegIndex => {
        const cx = getPegX(pegIndex);
        return (
          <g key={`peg-${pegIndex}`}>
            <rect x={cx - 100} y="390" width="200" height="15" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" rx="4" />
            <rect x={cx - 6} y="180" width="12" height="210" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" rx="6" />
            <rect x={cx - 60} y="415" width="120" height="25" fill="hsl(var(--card))" stroke="hsl(var(--border))" rx="4" />
            <text x={cx} y="432" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="1">{PEG_FULL[pegIndex]}</text>
          </g>
        );
      })}

      {/* Disks */}
      {allDisks.map(disk => {
        const w = getDiskWidth(disk.size);
        const x = getPegX(disk.pegIdx) - w / 2;
        const y = getDiskY(disk.idx);
        const color = DISK_COLORS[(n - disk.size) % DISK_COLORS.length];
        return <HanoiDisk key={`disk-${disk.id}`} id={disk.id} size={disk.size} x={x} y={y} w={w} color={color} />;
      })}

      {/* Recursive decomposition template (3-step structure) */}
      <g transform="translate(40, 455)">
        <text x="0" y="0" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="monospace">
          hanoi(n): <tspan fill={lastMove?.sub === 'A' ? "hsl(24 95% 53%)" : "hsl(var(--muted-foreground))"} fontWeight="bold">move(n-1)</tspan>
          <tspan> → </tspan>
          <tspan fill={lastMove?.sub === 'B' ? "hsl(0 84% 60%)" : "hsl(var(--muted-foreground))"} fontWeight="bold">move(1)</tspan>
          <tspan> → </tspan>
          <tspan fill={lastMove?.sub === 'C' ? "hsl(160 84% 39%)" : "hsl(var(--muted-foreground))"} fontWeight="bold">move(n-1)</tspan>
        </text>
      </g>

      {/* Exponential growth annotation */}
      <g transform="translate(420, 455)">
        <text x="0" y="0" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="monospace">
          T(n) = 2T(n-1) + 1
        </text>
        <text x="170" y="0" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="monospace">
          시간:<tspan fill="hsl(0 84% 60%)" fontWeight="bold"> O(2^N)</tspan>
        </text>
        <text x="280" y="0" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="monospace">
          공간:<tspan fill="hsl(189 94% 43%)" fontWeight="bold"> O(N)</tspan>
        </text>
      </g>
    </svg>
  );
}
