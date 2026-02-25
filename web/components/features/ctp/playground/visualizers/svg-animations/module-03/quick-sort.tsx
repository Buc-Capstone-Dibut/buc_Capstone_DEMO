"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";

// --- Types ---
export type SortElement = { id: string; val: number };

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
};

const DEFAULT_QUICK_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];

// --- Hook ---
export function useQuickSortSim(initialData: number[] = DEFAULT_QUICK_DATA) {
  const [history, setHistory] = useState<SortState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const steps: SortState[] = [];
    const arr: SortElement[] = initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val }));
    const sortedSet = new Set<number>();

    const record = (state: Partial<SortState>) => {
      steps.push({
        array: [...arr],
        low: null, high: null, pivotIdx: null, i: null, j: null,
        comparing: null, swapping: null, sortedIndices: Array.from(sortedSet),
        ...state
      });
    };

    record({});

    const partition = (low: number, high: number) => {
      const pivot = arr[high];
      let i = low - 1;

      record({ low, high, pivotIdx: high, i, j: low });

      for (let j = low; j < high; j++) {
        record({ low, high, pivotIdx: high, i, j, comparing: [j, high] });

        if (arr[j].val < pivot.val) {
          i++;
          record({ low, high, pivotIdx: high, i, j, swapping: [i, j] });
          // Swap
          const temp = arr[i];
          arr[i] = arr[j];
          arr[j] = temp;
          record({ low, high, pivotIdx: high, i, j });
        }
      }

      // Swap pivot into place
      record({ low, high, pivotIdx: high, i: i + 1, j: high, swapping: [i + 1, high] });
      const temp = arr[i + 1];
      arr[i + 1] = arr[high];
      arr[high] = temp;

      record({ low, high, pivotIdx: i + 1, i: i + 1, j: high });
      return i + 1;
    };

    const quickSort = (low: number, high: number) => {
      if (low < high) {
        const pi = partition(low, high);
        sortedSet.add(pi);
        record({ sortedIndices: Array.from(sortedSet) });

        quickSort(low, pi - 1);
        quickSort(pi + 1, high);
      } else if (low === high) {
        sortedSet.add(low);
        record({ sortedIndices: Array.from(sortedSet) });
      }
    };

    quickSort(0, arr.length - 1);

    // Final state
    for (let k = 0; k < arr.length; k++) sortedSet.add(k);
    record({ sortedIndices: Array.from(sortedSet) });

    setHistory(steps);
    setStepIndex(0);
  }, [initialData]);

  const currentState = history[stepIndex] || {
    array: initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val })),
    low: null, high: null, pivotIdx: null,
    i: null, j: null, comparing: null, swapping: null, sortedIndices: [],
  };

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep >= 0 && newStep < history.length) {
      setStepIndex(newStep);
    }
  }, [history.length]);

  const nextStep = useCallback(() => setStepIndex(p => Math.min(p + 1, history.length - 1)), [history.length]);
  const reset = useCallback(() => { setStepIndex(0); }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: currentState,
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
  const { array, low, high, pivotIdx, i, j, comparing, swapping, sortedIndices } = state;

  const maxVal = Math.max(...array.map((el: any) => el.val), 1);
  const svgWidth = 800;
  const svgHeight = 400;
  const chartHeight = 250;

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

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-4">
      <div className="relative w-full aspect-[2/1] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
          <defs>
            <filter id="glow-compare" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-swap" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-pivot" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Status Text overlay */}
          <text x="30" y="40" fill="#cbd5e1" fontSize="18" fontWeight="bold">Quick Sort</text>
          <text x="30" y="65" fill="#64748b" fontSize="14">{statusHTML}</text>

          {/* Action indicator */}
          <g transform={`translate(${svgWidth - 200}, 40)`}>
            {pivotIdx !== null && <text x="170" y="0" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="end">피벗(Pivot) 선택</text>}
          </g>

          {/* Draw Sub-array Range Indicator */}
          {low !== null && high !== null && low <= high && (
            <motion.rect
              initial={false}
              animate={{ x: getX(low) - 10, width: getX(high) - getX(low) + barWidth + 20 }}
              y={svgHeight - chartHeight - 70}
              height={chartHeight + 60}
              fill="rgba(59, 130, 246, 0.05)"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="2"
              strokeDasharray="4"
              rx={8}
            />
          )}

          {/* Draw Array Bars */}
          <AnimatePresence>
            {array.map((item: any, idx: number) => {
              const height = Math.max(20, (item.val / maxVal) * chartHeight);
              const yPos = svgHeight - 50 - height;
              const xPos = getX(idx);

              const isSorted = sortedIndices.includes(idx);
              const isComparing = comparing?.includes(idx);
              const isSwapping = swapping?.includes(idx);
              const isPivot = idx === pivotIdx;

              let fillColor = "#334155"; // default muted
              let opacity = 0.5;

              if (isSorted) {
                fillColor = "#8b5cf6"; // sorted purple
                opacity = 0.9;
              } else if (isSwapping) {
                fillColor = "#f43f5e"; // swap red
                opacity = 1;
              } else if (isPivot) {
                fillColor = "#10b981"; // pivot green
                opacity = 1;
              } else if (isComparing) {
                fillColor = "#eab308"; // compare yellow
                opacity = 1;
              } else if (low !== null && high !== null && idx >= low && idx <= high) {
                fillColor = "#3b82f6"; // active range blue
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
                    filter={isSwapping ? "url(#glow-swap)" : isPivot ? "url(#glow-pivot)" : isComparing ? "url(#glow-compare)" : ""}
                    animate={{ fill: fillColor, opacity }}
                    transition={{ duration: 0.3 }}
                  />
                  <text
                    x={barWidth / 2}
                    y={-10}
                    fill={(isSorted || isSwapping || isComparing || isPivot || (low !== null && high !== null && idx >= low && idx <= high)) ? "#fff" : "#94a3b8"}
                    fontSize="16"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {item.val}
                  </text>
                  <text
                    x={barWidth / 2}
                    y={height + 20}
                    fill="#64748b"
                    fontSize="12"
                    textAnchor="middle"
                  >
                    [{idx}]
                  </text>

                  {/* Pointers: i boundary of smaller elements, j current checking */}
                  {idx === i && (
                    <motion.text x={barWidth / 2} y={height + 40} fill="#f43f5e" fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      i
                    </motion.text>
                  )}
                  {idx === j && (
                    <motion.text x={barWidth / 2} y={height + 40} fill="#eab308" fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      j
                    </motion.text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>

      </div>
    </div>
  );
}
