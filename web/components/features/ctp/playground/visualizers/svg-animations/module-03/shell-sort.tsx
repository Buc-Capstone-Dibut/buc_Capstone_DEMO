"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";

// --- Types ---
export type SortElement = { id: string; val: number };

type SortState = {
  array: SortElement[];
  gap: number;
  i: number | null;
  j: number | null;
  comparing: [number, number] | null;
  swapping: [number, number] | null;
  isSorted: boolean;
};

const DEFAULT_SHELL_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];

// --- Hook ---
export function useShellSortSim(initialData: number[] = DEFAULT_SHELL_DATA) {
  const [history, setHistory] = useState<SortState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const steps: SortState[] = [];
    const arr: SortElement[] = initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val }));
    const n = arr.length;

    steps.push({ array: [...arr], gap: -1, i: null, j: null, comparing: null, swapping: null, isSorted: false });

    // Hibbard sequence (1, 3, 7, 15...) or simple n/2
    let gap = Math.floor(n / 2);

    while (gap > 0) {
      steps.push({ array: [...arr], gap, i: null, j: null, comparing: null, swapping: null, isSorted: false });

      for (let i = gap; i < n; i++) {
        steps.push({ array: [...arr], gap, i, j: null, comparing: null, swapping: null, isSorted: false });

        let temp = arr[i];
        let j = i;

        while (j >= gap) {
          steps.push({ array: [...arr], gap, i, j, comparing: [j - gap, j], swapping: null, isSorted: false });

          if (arr[j - gap].val > temp.val) {
             steps.push({ array: [...arr], gap, i, j, comparing: null, swapping: [j - gap, j], isSorted: false });
             arr[j] = arr[j - gap];
             j -= gap;
             arr[j] = temp; // effectively swap visualization
             steps.push({ array: [...arr], gap, i, j, comparing: null, swapping: null, isSorted: false });
          } else {
             break;
          }
        }
      }
      gap = Math.floor(gap / 2);
    }

    steps.push({ array: [...arr], gap: 0, i: null, j: null, comparing: null, swapping: null, isSorted: true });
    setHistory(steps);
    setStepIndex(0);
  }, [initialData]);

  const currentState = history[stepIndex] || {
    array: initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val })),
    gap: -1,
    i: null,
    j: null,
    comparing: null,
    swapping: null,
    isSorted: false,
  };

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep >= 0 && newStep < history.length) {
      setStepIndex(newStep);
    }
  }, [history.length]);

  const nextStep = useCallback(() => {
    setStepIndex((prev) => Math.min(prev + 1, history.length - 1));
  }, [history.length]);

  const reset = useCallback(() => {
    setStepIndex(0);
  }, []);

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
export function ShellSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const state = data;
  const { array, gap, i, j, comparing, swapping, isSorted } = state;

  const maxVal = Math.max(...array.map((el: any) => el.val), 1);
  const svgWidth = 800;
  const svgHeight = 400;
  const chartHeight = 250;

  // Calculate bar width based on data length to fit exactly
  const totalBarWidth = (svgWidth - 100) / array.length;
  // Make the actual bar slightly smaller to leave a gap
  const barWidth = Math.min(60, totalBarWidth * 0.8);
  const getX = (index: number) => 50 + index * totalBarWidth + (totalBarWidth - barWidth) / 2;

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
            <filter id="glow-gap" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Status Text overlay */}
          <text x="30" y="40" fill="#cbd5e1" fontSize="18" fontWeight="bold">Shell Sort</text>
          <text x="30" y="65" fill="#64748b" fontSize="14">
            {isSorted ? "정렬 완료!" : `현재 간격 (Gap): ${gap > 0 ? gap : '-'}`}
          </text>

          {/* Action indicator */}
          <g transform={`translate(${svgWidth - 200}, 40)`}>
            {comparing && <text x="170" y="0" fill="#eab308" fontSize="16" fontWeight="bold" textAnchor="end">비교 중...</text>}
            {swapping && <text x="170" y="0" fill="#f43f5e" fontSize="16" fontWeight="bold" textAnchor="end">교환 (Swap)!</text>}
            {!comparing && !swapping && gap > 0 && <text x="170" y="0" fill="#3b82f6" fontSize="16" fontWeight="bold" textAnchor="end">부분 리스트 탐색</text>}
          </g>

          {/* Draw Array Bars */}
          <AnimatePresence>
            {array.map((item: any, idx: number) => {
              const height = Math.max(20, (item.val / maxVal) * chartHeight);
              const yPos = svgHeight - 50 - height;
              const xPos = getX(idx);

              const isComparing = comparing?.includes(idx);
              const isSwapping = swapping?.includes(idx);
              const isCurrentI = i === idx;
              const isGapGroup = gap > 0 && i !== null && (idx % gap === i % gap) && idx <= i;

              let fillColor = "#334155"; // default muted
              let opacity = 0.5;

              if (isSorted) {
                fillColor = "#10b981"; // success green
                opacity = 1;
              } else if (isSwapping) {
                fillColor = "#f43f5e"; // swap red
                opacity = 1;
              } else if (isComparing) {
                fillColor = "#eab308"; // compare yellow
                opacity = 1;
              } else if (isCurrentI) {
                fillColor = "#3b82f6"; // pointer blue
                opacity = 1;
              } else if (isGapGroup) {
                fillColor = "#8b5cf6"; // gap group purple
                opacity = 0.8;
              }

              return (
                <motion.g
                  key={item.id} // Stable ID
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
                    filter={(isSwapping || isComparing) ? `url(#glow-${isSwapping ? 'swap' : 'compare'})` : isGapGroup ? "url(#glow-gap)" : ""}
                    animate={{ fill: fillColor, opacity }}
                    transition={{ duration: 0.3 }}
                  />
                  <text
                    x={barWidth / 2}
                    y={-10}
                    fill={isSorted || isSwapping || isComparing || isCurrentI || isGapGroup ? "#fff" : "#94a3b8"}
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

                  {/* Indicators below bars */}
                  {isCurrentI && (
                    <motion.text x={barWidth / 2} y={height + 40} fill="#3b82f6" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#glow-gap)" initial={{ opacity: 0, y: height + 50 }} animate={{ opacity: 1, y: height + 40 }}>
                      i
                    </motion.text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* Gap connection arc */}
          {gap > 0 && comparing && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              exit={{ opacity: 0 }}
              d={`M ${getX(comparing[0]) + barWidth/2} ${svgHeight - 10} Q ${getX(comparing[0]) + (getX(comparing[1]) - getX(comparing[0]))/2} ${svgHeight + 30}, ${getX(comparing[1]) + barWidth/2} ${svgHeight - 10}`}
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              strokeDasharray="4"
            />
          )}

        </svg>

      </div>
    </div>
  );
}
