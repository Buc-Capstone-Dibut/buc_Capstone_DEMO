"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";

// --- Types ---
export type SortElement = { id: string; val: number };

type SortState = {
  array: SortElement[];
  counts: number[];
  output: (SortElement | null)[];
  phase: string;
  i: number | null; // pointer for input array
  cIdx: number | null; // pointer for counts array
  outIdx: number | null; // pointer for output array
};

const DEFAULT_COUNTING_DATA = [5, 2, 8, 3, 9, 1, 5, 4, 2, 7];

// --- Hook ---
export function useCountingSortSim(initialData: number[] = DEFAULT_COUNTING_DATA) {
  const [history, setHistory] = useState<SortState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const steps: SortState[] = [];
    const arr: SortElement[] = initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val }));
    const maxVal = Math.max(...initialData, 0); // ensuring at least 0
    const counts = new Array(maxVal + 1).fill(0);
    const output: (SortElement | null)[] = new Array(arr.length).fill(null);

    const record = (state: Partial<SortState>) => {
      steps.push({
        array: [...arr],
        counts: [...counts],
        output: [...output],
        phase: "",
        i: null, cIdx: null, outIdx: null,
        ...state
      });
    };

    record({ phase: "초기 상태 (Input 배열 로드)" });

    // 1. Frequency count
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const val = item.val;
        record({ phase: `1단계: 도수 분포표 생성 - [${val}] 카운트 증가 준비`, i, cIdx: val });
        counts[val]++;
        record({ phase: `1단계: 도수 분포표 생성 - Counts[${val}] = ${counts[val]}`, i, cIdx: val });
    }

    // 2. Cumulative sum
    record({ phase: "2단계: 누적 도수 계산 시작 - 시작", cIdx: 0 });
    for (let i = 1; i <= maxVal; i++) {
        record({ phase: `2단계: 누적 도수 계산 - Counts[${i}] += Counts[${i-1}]`, cIdx: i });
        counts[i] += counts[i - 1];
        record({ phase: `2단계: 누적 도수 계산 완료 - Counts[${i}] = ${counts[i]}`, cIdx: i });
    }

    // 3. Place into output array (stable sorting: iterate backwards)
    record({ phase: "3단계: 원소 배치 시작 (뒤에서부터 순회)" });
    for (let i = arr.length - 1; i >= 0; i--) {
        const item = arr[i];
        const val = item.val;
        record({ phase: `3단계: 값 [${val}] 확인`, i, cIdx: val });

        counts[val]--;
        const destIdx = counts[val];
        record({ phase: `3단계: [${val}]의 들어갈 위치 갱신 (누적도수-1) = ${destIdx}`, i, cIdx: val, outIdx: destIdx });

        output[destIdx] = item;
        record({ phase: `3단계: 결과 배열의 [${destIdx}] 인덱스에 [${val}] 배치 완료!`, i, cIdx: null, outIdx: destIdx });
    }

    record({ phase: "정렬 완료!" });

    setHistory(steps);
    setStepIndex(0);
  }, [initialData]);

  const currentState = history[stepIndex] || {
    array: initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val })),
    counts: new Array(Math.max(...initialData, 0) + 1).fill(0),
    output: new Array(initialData.length).fill(null),
    phase: "로딩 중...",
    i: null, cIdx: null, outIdx: null
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
export function CountingSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const state = data;
  const { array, counts, output, phase, i, cIdx, outIdx } = state;

  const svgWidth = 800;
  const svgHeight = 750;
  const maxVal = Math.max(...array.map((a: any) => a.val), 1);
  const maxCount = Math.max(...counts, 1);
  const chartHeight = 120;

  const row1BaseY = 200;
  const row2BaseY = 420;
  const row3BaseY = 640;

  // Layout calculations
  const totalInputBarWidth = (svgWidth - 100) / array.length;
  const inputBarWidth = Math.min(40, totalInputBarWidth * 0.8);
  const getInputX = (index: number) => 50 + index * totalInputBarWidth + (totalInputBarWidth - inputBarWidth) / 2;

  const totalCountsBarWidth = (svgWidth - 100) / counts.length;
  const countsBarWidth = Math.min(40, totalCountsBarWidth * 0.8);
  const getCountsX = (index: number) => 50 + index * totalCountsBarWidth + (totalCountsBarWidth - countsBarWidth) / 2;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-4">
      <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
          <defs>
             <filter id="glow-active" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Status Text overlay */}
          <text x="30" y="40" fill="#cbd5e1" fontSize="18" fontWeight="bold">Counting Sort</text>
          <text x="30" y="65" fill="#64748b" fontSize="14">{phase}</text>

          {/* --- Input Array (Row 1) --- */}
          <text x="50" y={row1BaseY - chartHeight - 20} fill="#94a3b8" fontSize="12" fontWeight="bold">Input Array (입력 데이터)</text>
          <AnimatePresence>
            {array.map((item: any, idx: number) => {
              const xPos = getInputX(idx);
              const height = Math.max(20, (item.val / maxVal) * chartHeight);
              const yPos = row1BaseY - height;
              const isActive = i === idx;
              const opacity = isActive ? 1 : 0.6;
              const fillColor = isActive ? "#3b82f6" : "#334155";

              return (
                <motion.g
                  key={`input-${item.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                   <motion.rect
                     x={xPos} y={yPos}
                     width={inputBarWidth} height={height}
                     fill={fillColor} opacity={opacity} rx={4}
                     filter={isActive ? "url(#glow-active)" : ""}
                   />
                   <text x={xPos + inputBarWidth / 2} y={yPos - 10} fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">{item.val}</text>
                   <text x={xPos + inputBarWidth / 2} y={row1BaseY + 20} fill="#64748b" fontSize="12" textAnchor="middle">[{idx}]</text>
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* --- Counts Array (Row 2) --- */}
          <text x="50" y={row2BaseY - chartHeight - 20} fill="#94a3b8" fontSize="12" fontWeight="bold">Counts Array (도수 분포표)</text>
          <AnimatePresence>
            {counts.map((val: number, idx: number) => {
              const xPos = getCountsX(idx);
              const height = Math.max(20, (val / maxCount) * chartHeight);
              const yPos = row2BaseY - height;
              const isActive = cIdx === idx;
              const isTargeting = phase.includes("3단계") && cIdx === idx;
              const opacity = isActive ? 1 : 0.7;

              let fillColor = "#334155";
              if (isActive) fillColor = "#10b981"; // green
              if (isTargeting) fillColor = "#f43f5e"; // red when modifying in phase 3

              const isCumulativePhase = phase.includes("2단계") && (isActive || cIdx === idx + 1);

              return (
                <motion.g
                  key={`count-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                   <motion.rect
                     x={xPos} y={yPos}
                     width={countsBarWidth} height={height}
                     fill={fillColor} opacity={opacity} rx={4}
                     filter={isActive ? "url(#glow-active)" : ""}
                   />
                   <text x={xPos + countsBarWidth / 2} y={yPos - 10} fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">{val}</text>
                   <text x={xPos + countsBarWidth / 2} y={row2BaseY + 20} fill="#64748b" fontSize="12" textAnchor="middle">Val {idx}</text>

                   {/* Cumulative link arrow */}
                   {isCumulativePhase && idx > 0 && cIdx === idx && (
                     <motion.path
                        d={`M ${getCountsX(idx-1) + countsBarWidth/2} ${row2BaseY + 40} Q ${getCountsX(idx-1) + countsBarWidth/2 + (xPos - getCountsX(idx-1))/2} ${row2BaseY + 80} ${xPos + countsBarWidth/2} ${row2BaseY + 40}`}
                        fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                     />
                   )}
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* --- Output Array (Row 3) --- */}
          <text x="50" y={row3BaseY - chartHeight - 20} fill="#94a3b8" fontSize="12" fontWeight="bold">Output Array (정렬 결과)</text>
          <AnimatePresence>
            {output.map((item: any, idx: number) => {
              const xPos = getInputX(idx); // uses same layout as input
              const height = item ? Math.max(20, (item.val / maxVal) * chartHeight) : 20;
              const yPos = row3BaseY - height;
              const isActive = outIdx === idx;
              const isSorted = item !== null && !isActive;

              let fillColor = "transparent";
              let stroke = "#334155";

              if (isActive) {
                 fillColor = "#8b5cf6"; // purple placed
                 stroke = "#8b5cf6";
              } else if (isSorted) {
                 fillColor = "#3b82f6";
                 stroke = "#3b82f6";
              }

              return (
                <motion.g
                  key={item ? `output-${item.id}` : `output-empty-${idx}`}
                  initial={item ? { opacity: 0, y: yPos - 50 } : false}
                  animate={item ? { opacity: 1, y: 0 } : false}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                   <motion.rect
                     x={xPos} y={yPos}
                     width={inputBarWidth} height={item ? height : 40}
                     fill={fillColor}
                     stroke={stroke}
                     strokeWidth="2"
                     rx={4}
                     filter={isActive ? "url(#glow-active)" : ""}
                   />
                   {item !== null && (
                      <motion.text
                         x={xPos + inputBarWidth / 2} y={yPos - 10}
                         fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle"
                      >
                         {item.val}
                      </motion.text>
                   )}
                   <text x={xPos + inputBarWidth / 2} y={row3BaseY + 20} fill="#64748b" fontSize="12" textAnchor="middle">[{idx}]</text>
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* Dynamic Link Line (Phase 3) */}
          {i !== null && cIdx !== null && phase.includes("3단계") && !phase.includes("완료") && outIdx === null && (
             <motion.path
                d={`M ${getInputX(i) + inputBarWidth/2} ${row1BaseY + 10} C ${getInputX(i) + inputBarWidth/2} ${row1BaseY + 60}, ${getCountsX(cIdx) + countsBarWidth/2} ${row2BaseY - chartHeight - 50}, ${getCountsX(cIdx) + countsBarWidth/2} ${row2BaseY - Math.max(20, (counts[cIdx] / maxCount) * chartHeight)}`}
                fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
             />
          )}

          {outIdx !== null && cIdx !== null && phase.includes("3단계") && (
             <motion.path
                d={`M ${getCountsX(cIdx) + countsBarWidth/2} ${row2BaseY + 10} C ${getCountsX(cIdx) + countsBarWidth/2} ${row2BaseY + 60}, ${getInputX(outIdx) + inputBarWidth/2} ${row3BaseY - chartHeight - 50}, ${getInputX(outIdx) + inputBarWidth/2} ${row3BaseY - Math.max(20, ((output[outIdx]?.val || 0) / maxVal) * chartHeight)}`}
                fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
             />
          )}
        </svg>

      </div>
    </div>
  );
}
