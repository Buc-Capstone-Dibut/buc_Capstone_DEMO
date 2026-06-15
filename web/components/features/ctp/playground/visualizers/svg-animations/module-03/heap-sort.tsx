"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";
import { colorTokens } from "../../shared/svg-primitives";

// --- Types ---
export type SortElement = { id: string; val: number };

type SortState = {
  array: SortElement[];
  heapSize: number;
  i: number | null; // Node currently being heapified
  j: number | null; // Child node being compared
  comparing: [number, number] | null;
  swapping: [number, number] | null;
  sortedIndices: number[];
  phase: string;
};

const DEFAULT_HEAP_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];

// --- Hook ---
export function useHeapSortSim(initialData: number[] = DEFAULT_HEAP_DATA) {
  const [history, setHistory] = useState<SortState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const steps: SortState[] = [];
    const arr: SortElement[] = initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val }));
    const n = arr.length;
    const sortedSet = new Set<number>();

    const record = (state: Partial<SortState>) => {
      steps.push({
        array: [...arr],
        heapSize: n,
        i: null, j: null,
        comparing: null, swapping: null,
        sortedIndices: Array.from(sortedSet),
        phase: "",
        ...state
      });
    };

    record({ phase: "초기 상태" });

    const heapify = (size: number, iIdx: number, phaseName: string) => {
      let largest = iIdx;
      const left = 2 * iIdx + 1;
      const right = 2 * iIdx + 2;

      record({ heapSize: size, i: iIdx, comparing: null, phase: phaseName });

      if (left < size) {
        record({ heapSize: size, i: iIdx, j: left, comparing: [largest, left], phase: phaseName });
        if (arr[left].val > arr[largest].val) {
          largest = left;
        }
      }

      if (right < size) {
        record({ heapSize: size, i: iIdx, j: right, comparing: [largest, right], phase: phaseName });
        if (arr[right].val > arr[largest].val) {
          largest = right;
        }
      }

      if (largest !== iIdx) {
        record({ heapSize: size, i: iIdx, j: largest, swapping: [iIdx, largest], phase: phaseName });
        const swap = arr[iIdx];
        arr[iIdx] = arr[largest];
        arr[largest] = swap;
        record({ heapSize: size, i: largest, phase: phaseName });

        // Recursively heapify the affected sub-tree
        heapify(size, largest, phaseName);
      }
    };

    // 1. Build Max Heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      heapify(n, i, "최대 힙 구성 (Build Max Heap)");
    }

    // 2. Extract elements one by one
    for (let i = n - 1; i > 0; i--) {
      record({ heapSize: i + 1, swapping: [0, i], phase: "루트(최댓값)와 마지막 노드 교환" });
      const temp = arr[0];
      arr[0] = arr[i];
      arr[i] = temp;

      sortedSet.add(i);
      record({ heapSize: i, phase: `요소 [${arr[i].val}] 정렬 완료, 힙 크기 감소` });

      heapify(i, 0, "힙 속성 복원 (Heapify)");
    }

    sortedSet.add(0);
    record({ heapSize: 0, phase: "정렬 완료!" });

    setHistory(steps);
    setStepIndex(0);
    setLogs(steps.length ? [`[Step 0] ${steps[0].phase}`] : []);
  }, [initialData]);

  const currentState = history[stepIndex] || {
    array: initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val })),
    heapSize: initialData.length,
    i: null, j: null, comparing: null, swapping: null,
    sortedIndices: [], phase: "로딩 중..."
  };

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep >= 0 && newStep < history.length) {
      setStepIndex(newStep);
      const newLogs: string[] = [];
      for (let s = newStep; s >= 0; s--) newLogs.push(`[Step ${s}] ${history[s].phase}`);
      setLogs(newLogs);
    }
  }, [history]);

  const nextStep = useCallback(() => {
    setStepIndex((p) => {
      const next = Math.min(p + 1, history.length - 1);
      if (next !== p) setLogs((prev) => [`[Step ${next}] ${history[next].phase}`, ...prev]);
      return next;
    });
  }, [history]);
  const reset = useCallback(() => {
    setStepIndex(0);
    setLogs(history.length ? [`[Step 0] ${history[0].phase}`] : []);
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
export function HeapSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const state = data;
  const { array, heapSize, i, j, comparing, swapping, sortedIndices, phase } = state;

  const maxVal = Math.max(...array.map((a: any) => a.val), 1);
  const svgWidth = 800;
  const svgHeight = 600; // Taller for tree + array
  const treeHeight = 350;
  const arrayHeightTop = 450;
  const chartHeight = 100;

  // Array layout
  const totalBarWidth = (svgWidth - 100) / array.length;
  const barWidth = Math.min(40, totalBarWidth * 0.8);
  const getX = (index: number) => 50 + index * totalBarWidth + (totalBarWidth - barWidth) / 2;

  // Tree layout — parent-relative recursive positioning so siblings never collide.
  // x(child) = x(parent) ± svgWidth / 2^(level+2)
  const getNodePos = (idx: number): { x: number; y: number } => {
    if (idx === 0) {
      return { x: svgWidth / 2, y: 80 };
    }
    const parentIdx = Math.floor((idx - 1) / 2);
    const parentPos = getNodePos(parentIdx);
    const parentLevel = Math.floor(Math.log2(parentIdx + 1));
    const offset = svgWidth / Math.pow(2, parentLevel + 2);
    const isLeftChild = idx === 2 * parentIdx + 1;
    const x = isLeftChild ? parentPos.x - offset : parentPos.x + offset;
    const y = parentPos.y + 80;
    return { x, y };
  };

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
      <defs>
         <filter id="hs-glow-compare" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="hs-glow-swap" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="hs-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.faintEdge} strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#hs-grid)" />

      {/* Status Text overlay */}
      <text x="30" y="40" fill="hsl(var(--muted-foreground))" fontSize="18" fontWeight="bold">Heap Sort</text>
      <text x="30" y="65" fill="hsl(var(--muted-foreground))" fontSize="14">{phase}</text>

      {/* Index-mapping legend: tree position ↔ array index. */}
      <g transform={`translate(${svgWidth - 250}, 26)`}>
        <text x="0" y="10" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="bold">트리 ↔ 배열 인덱스</text>
        <text x="0" y="26" fill={colorTokens.primaryBlue} fontSize="11">왼쪽 자식 = 2i+1</text>
        <text x="0" y="40" fill={colorTokens.warning} fontSize="11">오른쪽 자식 = 2i+2</text>
      </g>

      {/* --- Tree Visualization --- */}
          {/* Edges */}
          {array.map((_: any, idx: number) => {
            if (idx === 0) return null;
            const parentIdx = Math.floor((idx - 1) / 2);
            const pPos = getNodePos(parentIdx);
            const cPos = getNodePos(idx);

            const isComparingEdge = comparing && comparing.includes(idx) && comparing.includes(parentIdx);
            const isSwappingEdge = swapping && swapping.includes(idx) && swapping.includes(parentIdx);

            let strokeColor: string = colorTokens.faintEdge;
            let strokeWidth = 2;
            let strokeDash = "none";

            // If the child is sorted, the connection to parent is essentially broken conceptually
            if (sortedIndices.includes(idx)) {
               strokeColor = colorTokens.gridLine;
               strokeDash = "4";
            } else if (isSwappingEdge) {
               strokeColor = colorTokens.destructive;
               strokeWidth = 4;
            } else if (isComparingEdge) {
               strokeColor = colorTokens.warning;
               strokeWidth = 4;
            }

            return (
              <line
                key={`edge-${idx}`}
                x1={pPos.x} y1={pPos.y}
                x2={cPos.x} y2={cPos.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDash}
                style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
              />
            );
          })}

          {/* Nodes */}
          {array.map((item: any, idx: number) => {
             const pos = getNodePos(idx);
             const isSorted = sortedIndices.includes(idx);
             const isComparing = comparing?.includes(idx);
             const isSwapping = swapping?.includes(idx);
             const isCurrentI = idx === i && !isSorted;

             let fillColor = "hsl(var(--muted))";
             let opacity = 0.8;
             let filter = "";

             if (isSorted) {
               fillColor = colorTokens.primaryHighlight; // purple for sorted
               opacity = 0.3; // fade out nodes clearly removed from heap
             } else if (isSwapping) {
               fillColor = colorTokens.destructive;
               opacity = 1;
               filter = "url(#hs-glow-swap)";
             } else if (isComparing) {
               fillColor = colorTokens.warning;
               opacity = 1;
             } else if (isCurrentI) {
               fillColor = colorTokens.primaryBlue;
               opacity = 1;
             } else if (idx < heapSize) {
               fillColor = colorTokens.success; // In-heap nodes are green
               opacity = 0.9;
             }

             return (
               <motion.g
                 key={`tree-node-${item.id}`}
                 initial={false}
                 animate={{ x: pos.x, y: pos.y }}
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
               >
                 <motion.circle
                   r="20"
                   fill={fillColor}
                   opacity={opacity}
                   filter={filter}
                   animate={{ fill: fillColor, opacity }}
                 />
                 <text x="0" y="5" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold" textAnchor="middle" opacity={opacity > 0.5 ? 1 : 0.5}>{item.val}</text>
                 {/* Array index badge: makes the 2i+1 / 2i+2 mapping explicit. */}
                 <text x="0" y="-26" fill={isSorted ? colorTokens.primaryHighlight : colorTokens.coordinateLabel} fontSize="10" fontWeight="bold" textAnchor="middle">i={idx}</text>
               </motion.g>
             );
          })}

          {/* --- Array Visualization Below --- */}
          {/* Heap region (green) — nodes still part of the active max-heap. */}
          {heapSize > 0 && (
            <motion.rect
              initial={false}
              animate={{ x: getX(0) - 10, width: getX(heapSize - 1) - getX(0) + barWidth + 20 }}
              y={arrayHeightTop - 30}
              height={chartHeight + 50}
              fill={colorTokens.successGhost}
              stroke={colorTokens.successEdge}
              strokeWidth="2"
              strokeDasharray="4"
              rx={8}
            />
          )}
          {heapSize > 0 && (
            <text x={getX(0) - 6} y={arrayHeightTop - 38} fill={colorTokens.success} fontSize="11" fontWeight="bold">힙 구역 (Heap)</text>
          )}
          {/* Sorted region (purple) — extracted maxima, fixed at the tail. */}
          {heapSize < array.length && (
            <motion.rect
              initial={false}
              animate={{ x: getX(heapSize) - 10, width: getX(array.length - 1) - getX(heapSize) + barWidth + 20 }}
              y={arrayHeightTop - 30}
              height={chartHeight + 50}
              fill={colorTokens.primaryHighlightGhost}
              stroke={colorTokens.primaryHighlightEdge}
              strokeWidth="2"
              strokeDasharray="4"
              rx={8}
            />
          )}
          {heapSize < array.length && (
            <text x={getX(heapSize) - 6} y={arrayHeightTop - 38} fill={colorTokens.primaryHighlight} fontSize="11" fontWeight="bold">정렬 구역 (Sorted)</text>
          )}

          <AnimatePresence>
            {array.map((item: any, idx: number) => {
              const height = Math.max(20, (item.val / maxVal) * chartHeight);
              const yPos = arrayHeightTop + chartHeight - height;
              const xPos = getX(idx);

              const isSorted = sortedIndices.includes(idx);
              const isComparing = comparing?.includes(idx);
              const isSwapping = swapping?.includes(idx);
              const isCurrentI = idx === i;

              let fillColor = "hsl(var(--muted))";
              let opacity = 0.5;

              if (isSorted) {
                fillColor = colorTokens.primaryHighlight; // sorted purple
                opacity = 0.9;
              } else if (isSwapping) {
                fillColor = colorTokens.destructive; // swap red
                opacity = 1;
              } else if (isComparing) {
                fillColor = colorTokens.warning; // compare yellow
                opacity = 1;
              } else if (idx < heapSize) {
                fillColor = colorTokens.success; // active heap green
                opacity = 0.8;
              }

              return (
                <motion.g
                  key={`array-${item.id}`}
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
                    filter={isSwapping ? "url(#hs-glow-swap)" : isComparing ? "url(#hs-glow-compare)" : ""}
                    animate={{ fill: fillColor, opacity }}
                    transition={{ duration: 0.3 }}
                  />
                  <text
                    x={barWidth / 2}
                    y={-10}
                    fill={(isSorted || isSwapping || isComparing || idx < heapSize) ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                    fontSize="14"
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
                </motion.g>
              );
            })}
          </AnimatePresence>
    </svg>
  );
}
