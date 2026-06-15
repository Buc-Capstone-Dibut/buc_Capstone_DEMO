"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";
import { colorTokens } from "../../shared/svg-primitives";

// --- Types ---
export type SortElement = { id: string; val: number };

// A node in the recursion call tree, so learners can see HOW the array is
// being divided (balanced → log N depth, skewed → N depth = worst case).
type CallNode = {
  id: string;
  low: number;
  high: number;
  depth: number;
  pivotIdx: number | null; // resolved once partition finishes
  active: boolean;         // currently on the call stack
  done: boolean;           // partition finished
};

type SortState = {
  array: SortElement[];
  low: number | null;
  high: number | null;
  pivotIdx: number | null;
  i: number | null;
  j: number | null;
  comparing: [number, number] | null;
  swapping: [number, number] | null;
  sortedIndices: number[];
  callTree: CallNode[];
  maxDepth: number;
  msg: string;
};

const DEFAULT_QUICK_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];
// 최악의 경우 O(N²) 프리셋: 이미 정렬된 입력 + 끝 피벗 → 한쪽으로 쏠린 트리.
export const QUICK_WORST_CASE_DATA = [2, 5, 8, 9, 11, 14, 15, 18, 20];

// --- Hook ---
export function useQuickSortSim(initialData: number[] = DEFAULT_QUICK_DATA) {
  const [history, setHistory] = useState<SortState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const steps: SortState[] = [];

    // 하나의 입력 배열에 대해 퀵 정렬 전 과정을 steps 에 누적한다.
    // phaseTag 로 각 단계 메시지에 [균형]/[편향] 접두를 달아 2-phase 데모를
    // 구분한다. id 에 phaseTag 를 섞어 두 페이즈의 원소 key 가 충돌하지 않게 한다.
    const runPhase = (input: number[], phaseTag: string, label: string) => {
      const arr: SortElement[] = input.map((val, idx) => ({ id: `${phaseTag}-${val}-${idx}`, val }));
      const sortedSet = new Set<number>();
      const tree: CallNode[] = [];
      let maxDepth = 0;

      const snapshotTree = (): CallNode[] => tree.map((n) => ({ ...n }));

      const record = (state: Partial<SortState>, msg: string) => {
        steps.push({
          array: [...arr],
          low: null, high: null, pivotIdx: null, i: null, j: null,
          comparing: null, swapping: null, sortedIndices: Array.from(sortedSet),
          callTree: snapshotTree(), maxDepth, msg: `${label} ${msg}`,
          ...state
        });
      };

      record({}, "퀵 정렬 시작 — 전체 배열에서 첫 파티션을 호출합니다.");

      const partition = (low: number, high: number) => {
        const pivot = arr[high];
        let i = low - 1;

        record({ low, high, pivotIdx: high, i, j: low }, `partition([${low}~${high}]): 끝 원소 ${pivot.val} 를 피벗으로 선택.`);

        for (let j = low; j < high; j++) {
          record({ low, high, pivotIdx: high, i, j, comparing: [j, high] }, `비교: ${arr[j].val} 와 피벗 ${pivot.val}`);

          if (arr[j].val < pivot.val) {
            i++;
            record({ low, high, pivotIdx: high, i, j, swapping: [i, j] }, `${arr[j].val} < ${pivot.val} → 경계 i 를 늘리고 [${i}]↔[${j}] 교환`);
            // Swap
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            record({ low, high, pivotIdx: high, i, j }, `교환 완료. 작은 값 구역이 한 칸 늘었습니다.`);
          }
        }

        // Swap pivot into place
        record({ low, high, pivotIdx: high, i: i + 1, j: high, swapping: [i + 1, high] }, `피벗을 제자리(${i + 1})로: [${i + 1}]↔[${high}] 교환`);
        const temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;

        record({ low, high, pivotIdx: i + 1, i: i + 1, j: high }, `피벗 ${arr[i + 1].val} 확정. 왼쪽<피벗<오른쪽 분할 성립.`);
        return i + 1;
      };

      const quickSort = (low: number, high: number, depth: number) => {
        if (low < high) {
          maxDepth = Math.max(maxDepth, depth);
          const node: CallNode = { id: `${phaseTag}-n-${low}-${high}-${depth}`, low, high, depth, pivotIdx: null, active: true, done: false };
          tree.push(node);
          record({ low, high }, `재귀 호출 quickSort([${low}~${high}]) — 깊이 ${depth}`);

          const pi = partition(low, high);
          node.pivotIdx = pi;
          node.active = false;
          node.done = true;
          sortedSet.add(pi);
          record({ sortedIndices: Array.from(sortedSet) }, `피벗 위치 [${pi}] 정렬 확정. 좌/우 부분배열로 재귀합니다.`);

          quickSort(low, pi - 1, depth + 1);
          quickSort(pi + 1, high, depth + 1);
        } else if (low === high) {
          sortedSet.add(low);
          record({ sortedIndices: Array.from(sortedSet) }, `원소 1개 [${low}] 는 자명하게 정렬됨.`);
        }
      };

      quickSort(0, arr.length - 1, 0);

      // Final state
      for (let k = 0; k < arr.length; k++) sortedSet.add(k);
      // 끝 피벗 Lomuto 가 한쪽으로만 쪼개지면(편향) 깊이는 [0~1] 2원소 슬라이스의
      // 호출인 N-2 까지 내려간다(반대편은 매번 빈 슬라이스). 따라서 편향 판정 기준은
      // N-1 이 아니라 N-2 다. (균형 분할은 깊이가 log N 수준으로 훨씬 얕다.)
      const isSkewed = arr.length > 2 && maxDepth >= arr.length - 2;
      record(
        { sortedIndices: Array.from(sortedSet) },
        isSkewed
          ? `정렬 완료! 트리 깊이=${maxDepth} ≈ N → 한쪽으로 쏠린 최악의 경우 O(N²).`
          : `정렬 완료! 트리 깊이=${maxDepth} ≈ log N → 균형 분할 O(N log N).`
      );
    };

    // Phase 1: 균형 분할(랜덤 입력 + 끝 피벗) → 깊이 ≈ log N.
    runPhase(initialData, "qsA", "[1/2 균형]");

    // Phase 2: 콘텐츠가 약속한 '편향 → 한쪽 쏠림 depth≈N'을 실제로 보여 준다.
    // 이미 정렬된 입력에 끝 피벗을 쓰면 매번 빈 왼쪽/N-1 오른쪽으로 갈려 트리가
    // 한쪽으로만 cascade 한다. 커스텀 입력이 들어온 경우엔 phase 1 만 돈다.
    if (initialData === DEFAULT_QUICK_DATA) {
      runPhase(QUICK_WORST_CASE_DATA, "qsB", "[2/2 편향]");
    }

    setHistory(steps);
    setStepIndex(0);
    setLogs(steps.length ? [`[Step 0] ${steps[0].msg}`] : []);
  }, [initialData]);

  const fallbackState: SortState = {
    array: initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val })),
    low: null, high: null, pivotIdx: null,
    i: null, j: null, comparing: null, swapping: null, sortedIndices: [],
    callTree: [], maxDepth: 0, msg: "로딩 중...",
  };
  const currentState = history[stepIndex] || fallbackState;

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep >= 0 && newStep < history.length) {
      setStepIndex(newStep);
      const newLogs: string[] = [];
      for (let s = newStep; s >= 0; s--) newLogs.push(`[Step ${s}] ${history[s].msg}`);
      setLogs(newLogs);
    }
  }, [history]);

  const nextStep = useCallback(() => {
    setStepIndex((p) => {
      const next = Math.min(p + 1, history.length - 1);
      if (next !== p) {
        setLogs((prev) => [`[Step ${next}] ${history[next].msg}`, ...prev]);
      }
      return next;
    });
  }, [history]);
  const reset = useCallback(() => {
    setStepIndex(0);
    setLogs(history.length ? [`[Step 0] ${history[0].msg}`] : []);
  }, [history]);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: currentState,
      logs,
      handlers: {
        push: nextStep,
        clear: reset,
      },
      currentStep: stepIndex,
      maxSteps: history.length,
      setStep: handleSetStep,
      nextStep,
      reset
    }
  };
}

// --- Visualizer Component ---
export function QuickSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const state = data;
  const { array, low, high, pivotIdx, i, j, comparing, swapping, sortedIndices, callTree = [], maxDepth = 0 } = state;

  const maxVal = Math.max(...array.map((el: any) => el.val), 1);
  const svgWidth = 800;
  // Reserve a bottom band for the recursion call tree.
  const treeBandHeight = 150;
  const svgHeight = 470;
  const chartHeight = 210;
  const chartBaseY = svgHeight - treeBandHeight - 40; // baseline of bars

  const totalBarWidth = (svgWidth - 100) / array.length;
  const barWidth = Math.min(50, totalBarWidth * 0.8);
  const getX = (index: number) => 50 + index * totalBarWidth + (totalBarWidth - barWidth) / 2;

  // Derive status message
  let statusHTML = "초기화 중...";
  if (sortedIndices.length === array.length) {
    statusHTML = "정렬 완료!";
  } else if (swapping) {
    statusHTML = "원소 교환 (Swap)";
  } else if (comparing) {
    statusHTML = "피벗(Pivot)과 비교 중";
  } else if (pivotIdx !== null && low !== null && high !== null) {
    statusHTML = `파티션 분할 중 [${low} ~ ${high}]`;
  }

  // Recursion-tree layout: each call node spans its [low,high] slice on the
  // x-axis and sits at a y proportional to its depth. A skewed tree (worst
  // case) visibly cascades down one side; a balanced tree stays shallow.
  const depthShown = Math.max(maxDepth, 1);
  const treeTop = svgHeight - treeBandHeight + 24;
  const rowH = Math.min(28, (treeBandHeight - 36) / (depthShown + 1));
  const nodeX = (lo: number, hi: number) => getX(lo) - barWidth / 2;
  const nodeW = (lo: number, hi: number) => getX(hi) + barWidth + barWidth / 2 - getX(lo);

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
      <defs>
        <filter id="qs-glow-compare" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="qs-glow-swap" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="qs-glow-pivot" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="qs-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.faintEdge} strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#qs-grid)" />

      {/* Status Text overlay */}
      <text x="30" y="40" fill="hsl(var(--muted-foreground))" fontSize="18" fontWeight="bold">Quick Sort</text>
      <text x="30" y="65" fill="hsl(var(--muted-foreground))" fontSize="14">{statusHTML}</text>

      {/* Action indicator */}
      <g transform={`translate(${svgWidth - 200}, 40)`}>
        {pivotIdx !== null && <text x="170" y="0" fill={colorTokens.success} fontSize="16" fontWeight="bold" textAnchor="end">피벗(Pivot) 선택</text>}
      </g>

      {/* Draw Sub-array Range Indicator */}
      {low !== null && high !== null && low <= high && (
        <motion.rect
          initial={false}
          animate={{ x: getX(low) - 10, width: getX(high) - getX(low) + barWidth + 20 }}
          y={chartBaseY - chartHeight - 30}
          height={chartHeight + 60}
          fill={colorTokens.primaryBlueGhost}
          stroke={colorTokens.primaryBlueEdge}
          strokeWidth="2"
          strokeDasharray="4"
          rx={8}
        />
      )}

          {/* Draw Array Bars */}
          <AnimatePresence>
            {array.map((item: any, idx: number) => {
              const height = Math.max(20, (item.val / maxVal) * chartHeight);
              const yPos = chartBaseY - height;
              const xPos = getX(idx);

              const isSorted = sortedIndices.includes(idx);
              const isComparing = comparing?.includes(idx);
              const isSwapping = swapping?.includes(idx);
              const isPivot = idx === pivotIdx;

              let fillColor = "hsl(var(--muted))"; // default muted
              let opacity = 0.5;

              if (isSorted) {
                fillColor = colorTokens.primaryHighlight; // sorted purple
                opacity = 0.9;
              } else if (isSwapping) {
                fillColor = colorTokens.destructive; // swap red
                opacity = 1;
              } else if (isPivot) {
                fillColor = colorTokens.success; // pivot green
                opacity = 1;
              } else if (isComparing) {
                fillColor = colorTokens.warning; // compare yellow
                opacity = 1;
              } else if (low !== null && high !== null && idx >= low && idx <= high) {
                fillColor = colorTokens.primaryBlue; // active range blue
                opacity = 0.7;
              }

              return (
                <motion.g
                  key={item.id}
                  initial={false}
                  animate={{ x: xPos, y: yPos }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <motion.rect
                    width={barWidth}
                    height={height}
                    fill={fillColor}
                    opacity={opacity}
                    rx={4}
                    filter={isSwapping ? "url(#qs-glow-swap)" : isPivot ? "url(#qs-glow-pivot)" : isComparing ? "url(#qs-glow-compare)" : ""}
                    animate={{ fill: fillColor, opacity }}
                    transition={{ duration: 0.3 }}
                  />
                  <text
                    x={barWidth / 2}
                    y={-10}
                    fill={(isSorted || isSwapping || isComparing || isPivot || (low !== null && high !== null && idx >= low && idx <= high)) ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                    fontSize="16"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {item.val}
                  </text>
                  <text
                    x={barWidth / 2}
                    y={height + 20}
                    fill="hsl(var(--muted-foreground))"
                    fontSize="12"
                    textAnchor="middle"
                  >
                    [{idx}]
                  </text>

                  {/* Pointers: i boundary of smaller elements, j current checking.
                      i and j can coincide (when partition first starts) — stack
                      the labels vertically so they never overlap. */}
                  {idx === i && (
                    <motion.text x={barWidth / 2} y={height + 40} fill={colorTokens.destructive} fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      i
                    </motion.text>
                  )}
                  {idx === j && (
                    <motion.text x={barWidth / 2} y={height + 60} fill={colorTokens.warning} fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      j
                    </motion.text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>

      {/* --- Recursion Call Tree --- */}
      <line x1={30} y1={svgHeight - treeBandHeight + 6} x2={svgWidth - 30} y2={svgHeight - treeBandHeight + 6} stroke={colorTokens.faintEdge} strokeWidth="1" />
      <text x={30} y={svgHeight - treeBandHeight - 2} fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="bold">
        재귀 호출 트리 (Divide &amp; Conquer) · 깊이 {maxDepth} {array.length > 2 && maxDepth >= array.length - 2 ? "≈ N → 편향, 최악 O(N²)" : "≈ log N → 균형, O(N log N)"}
      </text>
      <AnimatePresence>
        {callTree.map((n: CallNode) => {
          const x = nodeX(n.low, n.high);
          const w = Math.max(barWidth, nodeW(n.low, n.high));
          const y = treeTop + n.depth * rowH;
          let fill: string = colorTokens.primaryBlueTrace;
          let stroke: string = colorTokens.primaryBlueEdge;
          if (n.done) { fill = colorTokens.successTrace; stroke = colorTokens.successEdge; }
          if (n.active) { fill = colorTokens.warningTrace; stroke = colorTokens.warningEdge; }
          return (
            <motion.g key={n.id} initial={{ opacity: 0, y: y - 6 }} animate={{ opacity: 1, y }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <rect x={x} width={w} height={rowH - 6} rx={4} fill={fill} stroke={stroke} strokeWidth={n.active ? 2 : 1} />
              <text x={x + w / 2} y={(rowH - 6) / 2 + 4} fill="hsl(var(--foreground))" fontSize="10" fontWeight="bold" textAnchor="middle">
                [{n.low}~{n.high}]{n.pivotIdx !== null ? ` ▸p${n.pivotIdx}` : ""}
              </text>
            </motion.g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}
