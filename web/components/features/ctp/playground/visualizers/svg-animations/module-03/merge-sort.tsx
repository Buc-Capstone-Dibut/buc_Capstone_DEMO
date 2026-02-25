"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";

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
};

const DEFAULT_MERGE_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];

// --- Hook ---
export function useMergeSortSim(initialData: number[] = DEFAULT_MERGE_DATA) {
  const [history, setHistory] = useState<SortState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const steps: SortState[] = [];
    const arr: SortElement[] = initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val }));
    const temp: (SortElement | null)[] = new Array(arr.length).fill(null);
    const sortedSet = new Set<number>();

    const record = (state: Partial<SortState>) => {
      steps.push({
        array: [...arr],
        tempArray: [...temp],
        left: null, right: null, mid: null, i: null, j: null, k: null,
        comparing: null, copying: null, sortedIndices: Array.from(sortedSet),
        ...state
      });
    };

    record({});

    const merge = (low: number, mid: number, high: number) => {
      let i = low;
      let j = mid + 1;
      let k = low;

      record({ left: low, mid, right: high, i, j, k });

      while (i <= mid && j <= high) {
        record({ left: low, mid, right: high, i, j, k, comparing: [i, j] });

        if (arr[i].val <= arr[j].val) {
          temp[k] = arr[i];
          record({ left: low, mid, right: high, i, j, k, copying: [i, k, 'toTemp'] });
          i++;
        } else {
          temp[k] = arr[j];
          record({ left: low, mid, right: high, i, j, k, copying: [j, k, 'toTemp'] });
          j++;
        }
        k++;
      }

      while (i <= mid) {
        temp[k] = arr[i];
        record({ left: low, mid, right: high, i, j, k, copying: [i, k, 'toTemp'] });
        i++;
        k++;
      }

      while (j <= high) {
         temp[k] = arr[j];
         record({ left: low, mid, right: high, i, j, k, copying: [j, k, 'toTemp'] });
         j++;
         k++;
      }

      for (let idx = low; idx <= high; idx++) {
        arr[idx] = temp[idx] as SortElement;
        temp[idx] = null; // Clear temp conceptually after copy
        sortedSet.add(idx); // In a way, this section is now sorted internally
        record({ left: low, mid, right: high, copying: [idx, idx, 'toReal'] });
      }
    };

    const mergeSort = (low: number, high: number) => {
      if (low < high) {
        const mid = Math.floor((low + high) / 2);

        // Visualize the split conceptually
        record({ left: low, mid, right: high });

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
    record({ sortedIndices: Array.from(sortedSet) });

    setHistory(steps);
    setStepIndex(0);
  }, [initialData]);

  const currentState = history[stepIndex] || {
    array: initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val })),
    tempArray: new Array(initialData.length).fill(null),
    left: null, right: null, mid: null, i: null, j: null, k: null,
    comparing: null, copying: null, sortedIndices: [],
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
export function MergeSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const state = data;
  const { array, tempArray, left, right, mid, i, j, k, comparing, copying, sortedIndices } = state;

  const maxVal = Math.max(...array.map((el: any) => el.val), 1);
  const svgWidth = 800;
  const svgHeight = 450;
  const chartHeight = 150; // Shorter bars to fit two rows

  const totalBarWidth = (svgWidth - 100) / array.length;
  const barWidth = Math.min(40, totalBarWidth * 0.8);
  const getX = (index: number) => 50 + index * totalBarWidth + (totalBarWidth - barWidth) / 2;

  let statusHTML = "초기화 중...";
  if (sortedIndices.length === array.length) {
    statusHTML = "정렬 완료!";
  } else if (copying) {
    statusHTML = copying[2] === 'toTemp' ? "임시 배열로 복사 중..." : "원본 배열로 반영 완료!";
  } else if (comparing) {
    statusHTML = "두 파티션 비교 중";
  } else if (left !== null && right !== null) {
    statusHTML = `분할 영역: [${left} ~ ${right}] 병합 대기`;
  }

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-4">
      <div className="relative w-full aspect-[16/9] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
          <defs>
             <filter id="glow-compare" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-copy" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Status Text overlay */}
          <text x="30" y="40" fill="#cbd5e1" fontSize="18" fontWeight="bold">Merge Sort</text>
           <text x="30" y="65" fill="#64748b" fontSize="14">{statusHTML}</text>

          {/* Main Array Label */}
          <text x="50" y="100" fill="#94a3b8" fontSize="12" fontWeight="bold">Main Array (원본)</text>

          {/* Main Array Background slots */}
           {array.map((_: SortElement, idx: number) => (
            <rect key={`slot-${idx}`} x={getX(idx)} y={260 - chartHeight} width={barWidth} height={chartHeight} fill="rgba(255,255,255,0.02)" rx="4"/>
          ))}

          {/* Draw Sub-array Backgrounds (Optional, helpful for visual grouping) */}
          <AnimatePresence>
            {array.map((_: SortElement, idx: number) => {
              // Determine active partition for background highlighting
              const inLeft = left !== null && mid !== null && idx >= left && idx <= mid;
              const inRight = mid !== null && right !== null && idx > mid && idx <= right;

              let bgColor = "transparent";
              if (inLeft) {
                bgColor = "rgba(59, 130, 246, 0.1)"; // blue-100
              } else if (inRight) {
                bgColor = "rgba(239, 68, 68, 0.1)"; // red-100
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

              let fillColor = "#334155";
              let opacity = 0.5;

              if (isSorted) {
                fillColor = "#10b981"; // green
                opacity = 0.9;
              } else if (isCopyingFrom || isCopyingTo) {
                fillColor = "#8b5cf6"; // purple
                opacity = 1;
              } else if (isComparing) {
                fillColor = "#eab308"; // yellow
                opacity = 1;
              } else if (inLeft) {
                fillColor = "#3b82f6"; // blue
                opacity = 0.8;
              } else if (inRight) {
                fillColor = "#ef4444"; // red
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
                    filter={isComparing ? "url(#glow-compare)" : (isCopyingFrom || isCopyingTo) ? "url(#glow-copy)" : ""}
                    animate={{ fill: fillColor, opacity }}
                    transition={{ duration: 0.3 }}
                  />
                  <text x={barWidth / 2} y={-10} fill={isSorted || opacity > 0.6 ? "#fff" : "#64748b"} fontSize="14" fontWeight="bold" textAnchor="middle">{item.val}</text>

                  {/* Pointers mapping to Original indices (i, j) */}
                  {idx === i && (
                    <motion.text x={barWidth / 2} y={height + 25} fill="#3b82f6" fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      i
                    </motion.text>
                  )}
                  {idx === j && (
                    <motion.text x={barWidth / 2} y={height + 25} fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      j
                    </motion.text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* Temp Array Label */}
          <text x="50" y="300" fill="#94a3b8" fontSize="12" fontWeight="bold">Temp Array (임시 메모리)</text>

          {/* Draw Temp Array Background slots */}
          {tempArray.map((_: SortElement | null, idx: number) => (
            <rect key={`temp-slot-${idx}`} x={getX(idx)} y={svgHeight - 10 - chartHeight} width={barWidth} height={chartHeight} fill="rgba(255,255,255,0.02)" rx="4"/>
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
                    fill="#8b5cf6"
                    opacity={0.8}
                    rx={4}
                    filter={isCopyingToTemp ? "url(#glow-copy)" : ""}
                  />
                  <text x={barWidth / 2} y={-10} fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle">{item.val}</text>
                </motion.g>
              );
            })}
          </AnimatePresence>

           {/* Pointers mapping to Temp indices (k) */}
           {k !== null && (
              <motion.text x={getX(k) + barWidth / 2} y={svgHeight - 5} fill="#a855f7" fontSize="14" fontWeight="bold" textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  k
              </motion.text>
            )}

        </svg>

      </div>
    </div>
  );
}
