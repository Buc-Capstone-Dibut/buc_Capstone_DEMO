"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";
import { colorTokens } from "../../shared/svg-primitives";

// --- Types ---
export type SortElement = { id: string; val: number };

type SortState = {
  array: SortElement[];
  tempArray: (SortElement | null)[];
  left: number | null;
  right: number | null;
  mid: number | null;
  i: number | null;
  j: number | null;
  k: number | null;
  comparing: [number, number] | null;
  copying: [number, number, string] | null; // [srcIdx, destIdx, 'toTemp' | 'toReal']
  sortedIndices: number[];
  tempUsed: number;       // peak temp slots in use → highlights O(N) aux memory
  stableTie: boolean;     // true when a comparison hit equal values (stability)
  msg: string;
};

const DEFAULT_MERGE_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];

// Original input order, encoded in the element id (`id-<val>-<origIdx>`), so the
// visualizer can show a subscript on duplicate values to demonstrate stability.
export function mergeOrigIndex(el: SortElement): number {
  const m = /-(\d+)$/.exec(el.id);
  return m ? Number(m[1]) : -1;
}

// --- Hook ---
export function useMergeSortSim(initialData: number[] = DEFAULT_MERGE_DATA) {
  const [history, setHistory] = useState<SortState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const steps: SortState[] = [];
    const arr: SortElement[] = initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val }));
    const temp: (SortElement | null)[] = new Array(arr.length).fill(null);
    const sortedSet = new Set<number>();

    const record = (state: Partial<SortState>, msg: string) => {
      const tempUsed = temp.reduce((acc, t) => acc + (t !== null ? 1 : 0), 0);
      steps.push({
        array: [...arr],
        tempArray: [...temp],
        left: null, right: null, mid: null, i: null, j: null, k: null,
        comparing: null, copying: null, sortedIndices: Array.from(sortedSet),
        tempUsed, stableTie: false, msg,
        ...state
      });
    };

    record({}, "병합 정렬 시작 — 배열을 절반씩 재귀로 쪼갭니다.");

    const merge = (low: number, mid: number, high: number) => {
      let i = low;
      let j = mid + 1;
      let k = low;

      record({ left: low, mid, right: high, i, j, k }, `병합 [${low}~${mid}] + [${mid + 1}~${high}] → 보조 배열에 모읍니다.`);

      while (i <= mid && j <= high) {
        const tie = arr[i].val === arr[j].val;
        record({ left: low, mid, right: high, i, j, k, comparing: [i, j], stableTie: tie }, tie
          ? `동일값 ${arr[i].val}: 왼쪽(i)을 먼저 → 입력 순서 유지 (안정 정렬)`
          : `비교: 왼쪽 ${arr[i].val} vs 오른쪽 ${arr[j].val}`);

        if (arr[i].val <= arr[j].val) {
          // '<=' keeps the left (earlier) element first on ties → stable.
          temp[k] = arr[i];
          record({ left: low, mid, right: high, i, j, k, copying: [i, k, 'toTemp'] }, `왼쪽 ${arr[i].val} 를 보조 배열[${k}]로 복사.`);
          i++;
        } else {
          temp[k] = arr[j];
          record({ left: low, mid, right: high, i, j, k, copying: [j, k, 'toTemp'] }, `오른쪽 ${arr[j].val} 를 보조 배열[${k}]로 복사.`);
          j++;
        }
        k++;
      }

      while (i <= mid) {
        temp[k] = arr[i];
        record({ left: low, mid, right: high, i, j, k, copying: [i, k, 'toTemp'] }, `왼쪽 잔여 ${arr[i].val} 를 보조 배열[${k}]로 복사.`);
        i++;
        k++;
      }

      while (j <= high) {
         temp[k] = arr[j];
         record({ left: low, mid, right: high, i, j, k, copying: [j, k, 'toTemp'] }, `오른쪽 잔여 ${arr[j].val} 를 보조 배열[${k}]로 복사.`);
         j++;
         k++;
      }

      for (let idx = low; idx <= high; idx++) {
        arr[idx] = temp[idx] as SortElement;
        temp[idx] = null; // Clear temp conceptually after copy
        sortedSet.add(idx); // In a way, this section is now sorted internally
        record({ left: low, mid, right: high, copying: [idx, idx, 'toReal'] }, `보조 배열[${idx}] → 원본[${idx}] 반영. (사용한 임시 공간 회수)`);
      }
    };

    const mergeSort = (low: number, high: number) => {
      if (low < high) {
        const mid = Math.floor((low + high) / 2);

        // Visualize the split conceptually
        record({ left: low, mid, right: high }, `분할: [${low}~${high}] → [${low}~${mid}] | [${mid + 1}~${high}]`);

        mergeSort(low, mid);
        mergeSort(mid + 1, high);
        merge(low, mid, high);
      } else if (low === high) {
         // Single element is trivially sorted, but for overall sorted Set we wait till merges.
      }
    };

    mergeSort(0, arr.length - 1);

    // Final state
    for (let k = 0; k < arr.length; k++) sortedSet.add(k);
    record({ sortedIndices: Array.from(sortedSet) }, `정렬 완료! 보조 배열에 O(N) 메모리를 빌려 안정 정렬을 보장했습니다.`);

    setHistory(steps);
    setStepIndex(0);
    setLogs(steps.length ? [`[Step 0] ${steps[0].msg}`] : []);
  }, [initialData]);

  const fallbackState: SortState = {
    array: initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val })),
    tempArray: new Array(initialData.length).fill(null),
    left: null, right: null, mid: null, i: null, j: null, k: null,
    comparing: null, copying: null, sortedIndices: [],
    tempUsed: 0, stableTie: false, msg: "로딩 중...",
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
      if (next !== p) setLogs((prev) => [`[Step ${next}] ${history[next].msg}`, ...prev]);
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
export function MergeSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const state = data;
  const { array, tempArray, left, right, mid, i, j, k, comparing, copying, sortedIndices, tempUsed = 0, stableTie = false } = state;

  const maxVal = Math.max(...array.map((el: any) => el.val), 1);
  const svgWidth = 800;
  const svgHeight = 450;
  const chartHeight = 150; // Shorter bars to fit two rows

  const totalBarWidth = (svgWidth - 100) / array.length;
  const barWidth = Math.min(40, totalBarWidth * 0.8);
  const getX = (index: number) => 50 + index * totalBarWidth + (totalBarWidth - barWidth) / 2;

  // Stability: a value is a duplicate iff it appears more than once. We show a
  // subscript with the element's ORIGINAL input index so learners can verify the
  // relative order of equal keys is preserved end to end.
  const valueCounts: Record<number, number> = {};
  array.forEach((el: SortElement) => { valueCounts[el.val] = (valueCounts[el.val] || 0) + 1; });

  let statusHTML = "초기화 중...";
  if (sortedIndices.length === array.length) {
    statusHTML = "정렬 완료!";
  } else if (copying) {
    statusHTML = copying[2] === 'toTemp' ? "임시 배열로 복사 중..." : "원본 배열로 반영 완료!";
  } else if (comparing) {
    statusHTML = stableTie ? "동일값 → 왼쪽 우선 (안정성 유지)" : "두 파티션 비교 중";
  } else if (left !== null && right !== null) {
    statusHTML = `분할 영역: [${left} ~ ${right}] 병합 대기`;
  }

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
      <defs>
         <filter id="ms-glow-compare" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="ms-glow-copy" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="ms-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.faintEdge} strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#ms-grid)" />

      {/* Status Text overlay */}
      <text x="30" y="40" fill="hsl(var(--muted-foreground))" fontSize="18" fontWeight="bold">Merge Sort</text>
       <text x="30" y="65" fill={stableTie ? colorTokens.success : "hsl(var(--muted-foreground))"} fontSize="14">{statusHTML}</text>

      {/* O(N) auxiliary-memory meter — how much extra space the algorithm borrows. */}
      <g transform={`translate(${svgWidth - 260}, 26)`}>
        <text x="0" y="10" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="bold">보조 메모리 O(N)</text>
        {array.map((_: SortElement, idx: number) => (
          <rect
            key={`mem-${idx}`}
            x={idx * 24} y={18}
            width={20} height={14}
            rx={2}
            fill={idx < tempUsed ? colorTokens.primaryHighlight : colorTokens.faintFill}
            stroke={idx < tempUsed ? colorTokens.primaryHighlightEdge : colorTokens.faintEdge}
            strokeWidth="1"
          />
        ))}
        <text x={0} y={46} fill="hsl(var(--muted-foreground))" fontSize="10">사용 중 {tempUsed} / {array.length} 슬롯</text>
      </g>

      {/* Main Array Label */}
      <text x="50" y="100" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="bold">Main Array (원본)</text>

          {/* Main Array Background slots */}
           {array.map((_: SortElement, idx: number) => (
            <rect key={`slot-${idx}`} x={getX(idx)} y={260 - chartHeight} width={barWidth} height={chartHeight} fill={colorTokens.faintFill} rx="4"/>
          ))}

          {/* Draw Sub-array Backgrounds (Optional, helpful for visual grouping) */}
          <AnimatePresence>
            {array.map((_: SortElement, idx: number) => {
              // Determine active partition for background highlighting
              const inLeft = left !== null && mid !== null && idx >= left && idx <= mid;
              const inRight = mid !== null && right !== null && idx > mid && idx <= right;

              let bgColor = "transparent";
              if (inLeft) {
                bgColor = colorTokens.primaryBlueDim; // blue-100
              } else if (inRight) {
                bgColor = colorTokens.destructiveTrace; // red-100
              }

              if (bgColor === "transparent") return null;

              return (
                <motion.rect
                  key={`sub-array-bg-${idx}`}
                  x={getX(idx)}
                  y={260 - chartHeight}
                  width={barWidth}
                  height={chartHeight}
                  fill={bgColor}
                  rx={4}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              );
            })}
          </AnimatePresence>

          {/* Draw Main Array Bars */}
          <AnimatePresence>
            {array.map((item: SortElement, idx: number) => {
              const height = Math.max(20, (item.val / maxVal) * chartHeight);
              const yPos = 260 - height;
              const xPos = getX(idx);

              const isSorted = sortedIndices.includes(idx);
              const isComparing = comparing?.includes(idx);
              const isCopyingFrom = copying?.[2] === 'toTemp' && copying?.[0] === idx;
              const isCopyingTo = copying?.[2] === 'toReal' && copying?.[1] === idx;

              // Determine active partition
              const inLeft = left !== null && mid !== null && idx >= left && idx <= mid;
              const inRight = mid !== null && right !== null && idx > mid && idx <= right;

              let fillColor = "hsl(var(--muted))";
              let opacity = 0.5;

              if (isSorted) {
                fillColor = colorTokens.success; // green
                opacity = 0.9;
              } else if (isCopyingFrom || isCopyingTo) {
                fillColor = colorTokens.primaryHighlight; // purple
                opacity = 1;
              } else if (isComparing) {
                fillColor = colorTokens.warning; // yellow
                opacity = 1;
              } else if (inLeft) {
                fillColor = colorTokens.primaryBlue; // blue
                opacity = 0.8;
              } else if (inRight) {
                fillColor = colorTokens.errorRed; // red
                opacity = 0.8;
              }

              // Hide if it's currently logically moved to temp
              // To make it simple visually, just lower opacity
              if (tempArray[idx] !== null && copying?.[2] !== 'toReal') {
                  opacity = 0.1;
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
                    filter={isComparing ? "url(#ms-glow-compare)" : (isCopyingFrom || isCopyingTo) ? "url(#ms-glow-copy)" : ""}
                    animate={{ fill: fillColor, opacity }}
                    transition={{ duration: 0.3 }}
                  />
                  <text x={barWidth / 2} y={-10} fill={isSorted || opacity > 0.6 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"} fontSize="14" fontWeight="bold" textAnchor="middle">
                    {item.val}
                    {/* Stability subscript: original input index on duplicate values. */}
                    {valueCounts[item.val] > 1 && (
                      <tspan fontSize="9" dy="3" fill={colorTokens.primaryHighlight}>#{mergeOrigIndex(item)}</tspan>
                    )}
                  </text>

                  {/* Pointers mapping to Original indices (i, j).
                      i and j can briefly target the same index — stack the
                      labels on different rows so they never overlap. */}
                  {idx === i && (
                    <motion.text x={barWidth / 2} y={height + 25} fill={colorTokens.primaryBlue} fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      i
                    </motion.text>
                  )}
                  {idx === j && (
                    <motion.text x={barWidth / 2} y={height + 45} fill={colorTokens.errorRed} fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      j
                    </motion.text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* Temp Array Label */}
          <text x="50" y="300" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="bold">Temp Array (임시 메모리)</text>

          {/* Draw Temp Array Background slots */}
          {tempArray.map((_: SortElement | null, idx: number) => (
            <rect key={`temp-slot-${idx}`} x={getX(idx)} y={svgHeight - 10 - chartHeight} width={barWidth} height={chartHeight} fill={colorTokens.faintFill} rx="4"/>
          ))}

          {/* Draw Temp Array Bars */}
          <AnimatePresence>
            {tempArray.map((item: SortElement | null, idx: number) => {
              if (item === null) return null; // Only draw populated temp slots
              const height = Math.max(20, (item.val / maxVal) * chartHeight);
              const yPos = svgHeight - 10 - height;
              const xPos = getX(idx);

              const isCopyingToTemp = copying?.[2] === 'toTemp' && copying?.[1] === idx;

              return (
                <motion.g
                  key={`temp-${item.id}`}
                  initial={{ opacity: 0, y: yPos - 50 }}
                  animate={{ opacity: 1, x: xPos, y: yPos }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <rect
                    width={barWidth}
                    height={height}
                    fill={colorTokens.primaryHighlight}
                    opacity={0.8}
                    rx={4}
                    filter={isCopyingToTemp ? "url(#ms-glow-copy)" : ""}
                  />
                  <text x={barWidth / 2} y={-10} fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold" textAnchor="middle">
                    {item.val}
                    {valueCounts[item.val] > 1 && (
                      <tspan fontSize="9" dy="3" fill={colorTokens.primaryHighlightEdge}>#{mergeOrigIndex(item)}</tspan>
                    )}
                  </text>
                </motion.g>
              );
            })}
          </AnimatePresence>

           {/* Pointers mapping to Temp indices (k) */}
           {k !== null && (
              <motion.text x={getX(k) + barWidth / 2} y={svgHeight - 5} fill={colorTokens.primaryHighlight} fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  k
              </motion.text>
            )}

    </svg>
  );
}
