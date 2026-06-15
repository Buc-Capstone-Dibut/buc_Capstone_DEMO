"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

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
  // 이번 단계에서 사용할(또는 사용 중인) gap 수열 전체와 현재 gap 의 위치
  gapSeq: number[];
  gapSeqIdx: number;
  msg: string;
};

const DEFAULT_SHELL_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];

// Shell 의 원래 수열: N/2, N/4, ... , 1 (내림차순)
function buildShellSequence(n: number): number[] {
  const seq: number[] = [];
  let gap = Math.floor(n / 2);
  while (gap > 0) {
    seq.push(gap);
    gap = Math.floor(gap / 2);
  }
  return seq;
}

// --- Hook ---
export function useShellSortSim(initialData: number[] = DEFAULT_SHELL_DATA) {
  const [history, setHistory] = useState<SortState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const steps: SortState[] = [];
    const arr: SortElement[] = initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val }));
    const n = arr.length;
    const gapSeq = buildShellSequence(n);

    steps.push({ array: [...arr], gap: -1, i: null, j: null, comparing: null, swapping: null, isSorted: false, gapSeq, gapSeqIdx: -1, msg: `셸 정렬 시작. gap 수열(N/2 방식): [${gapSeq.join(", ")}]` });

    gapSeq.forEach((gap, gapSeqIdx) => {
      steps.push({ array: [...arr], gap, i: null, j: null, comparing: null, swapping: null, isSorted: false, gapSeq, gapSeqIdx, msg: `gap = ${gap} 로 부분 배열 정렬을 시작합니다. 같은 색이 한 부분 배열입니다.` });

      for (let i = gap; i < n; i++) {
        steps.push({ array: [...arr], gap, i, j: null, comparing: null, swapping: null, isSorted: false, gapSeq, gapSeqIdx, msg: `기준 원소 A[${i}] = ${arr[i].val} 를 같은 그룹 안에서 비교합니다.` });

        let temp = arr[i];
        let j = i;

        while (j >= gap) {
          steps.push({ array: [...arr], gap, i, j, comparing: [j - gap, j], swapping: null, isSorted: false, gapSeq, gapSeqIdx, msg: `비교: A[${j - gap}] = ${arr[j - gap].val} vs ${temp.val}` });

          if (arr[j - gap].val > temp.val) {
             steps.push({ array: [...arr], gap, i, j, comparing: null, swapping: [j - gap, j], isSorted: false, gapSeq, gapSeqIdx, msg: `${arr[j - gap].val} > ${temp.val} → ${gap}칸 떨어진 자리로 장거리 교환!` });
             arr[j] = arr[j - gap];
             j -= gap;
             arr[j] = temp; // effectively swap visualization
             steps.push({ array: [...arr], gap, i, j, comparing: null, swapping: null, isSorted: false, gapSeq, gapSeqIdx, msg: `교환 후 위치 갱신.` });
          } else {
             break;
          }
        }
      }
    });

    steps.push({ array: [...arr], gap: 0, i: null, j: null, comparing: null, swapping: null, isSorted: true, gapSeq, gapSeqIdx: gapSeq.length, msg: `gap = 1 까지 마쳐 정렬 완료!` });
    setHistory(steps);
    setStepIndex(0);
    setLogs(["> 시스템 초기화: 셸 정렬 대기 중... Step을 눌러 시작하세요."]);
  }, [initialData]);

  const currentState = history[stepIndex] || {
    array: initialData.map((val, idx) => ({ id: `id-${val}-${idx}`, val })),
    gap: -1,
    i: null,
    j: null,
    comparing: null,
    swapping: null,
    isSorted: false,
    gapSeq: buildShellSequence(initialData.length),
    gapSeqIdx: -1,
    msg: "",
  };

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= history.length) return;
    setStepIndex(newStep);
    const newLogs = ["> 시스템 초기화: 셸 정렬 대기 중... Step을 눌러 시작하세요."];
    for (let s = 1; s <= newStep; s++) {
      newLogs.unshift(`[Step ${s}] ${history[s].msg}`);
    }
    setLogs(newLogs);
  }, [history]);

  const nextStep = useCallback(() => {
    setStepIndex((prev) => {
      const next = prev >= history.length - 1 ? prev : prev + 1;
      if (next !== prev) handleSetStep(next);
      return next;
    });
  }, [history.length, handleSetStep]);

  const reset = useCallback(() => {
    handleSetStep(0);
  }, [handleSetStep]);

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
// gap 으로 나뉜 부분 배열(그룹)마다 뚜렷이 구분되는 색을 부여한다.
// idx % gap 이 그룹 번호이며, 순환 팔레트로 인접 그룹이 항상 다른 색이 되게 한다.
const GROUP_PALETTE = [
  colorTokens.primaryBlue,
  colorTokens.primaryHighlight,
  colorTokens.info,
  colorTokens.warning,
  colorTokens.success,
  colorTokens.destructive,
];

export function ShellSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const state = data;
  const { array, gap, i, j, comparing, swapping, isSorted, gapSeq = [], gapSeqIdx = -1 } = state;

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
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.faintEdge} strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Status Text overlay */}
          <text x="30" y="40" fill="hsl(var(--muted-foreground))" fontSize="18" fontWeight="bold">Shell Sort</text>
          <text x="30" y="65" fill="hsl(var(--muted-foreground))" fontSize="14">
            {isSorted ? "정렬 완료!" : `현재 간격 (Gap): ${gap > 0 ? gap : '-'}`}
          </text>

          {/* Action indicator */}
          <g transform={`translate(${svgWidth - 200}, 40)`}>
            {comparing && <text x="170" y="0" fill={colorTokens.warning} fontSize="16" fontWeight="bold" textAnchor="end">비교 중...</text>}
            {swapping && <text x="170" y="0" fill={colorTokens.destructive} fontSize="16" fontWeight="bold" textAnchor="end">교환 (Swap)!</text>}
            {!comparing && !swapping && gap > 0 && <text x="170" y="0" fill={colorTokens.primaryBlue} fontSize="16" fontWeight="bold" textAnchor="end">부분 리스트 탐색</text>}
          </g>

          {/* gap 수열 선택 리본: N/2 → ... → 1 진행 상황을 한눈에. 현재 gap 이 활성 칩으로 표시됨 */}
          {gapSeq.length > 0 && (
            <g transform="translate(30, 84)">
              <text x="0" y="-2" fill="hsl(var(--muted-foreground))" fontSize="11">gap 수열 (N/2 방식)</text>
              {gapSeq.map((g: number, k: number) => {
                const chipW = 34;
                const x = k * (chipW + 24);
                const active = k === gapSeqIdx;
                const done = gapSeqIdx > k || isSorted;
                const chipColor = active ? colorTokens.primaryBlue : done ? colorTokens.success : colorTokens.muted;
                return (
                  <g key={k} transform={`translate(${x}, 6)`}>
                    <motion.rect
                      width={chipW} height="22" rx="11"
                      fill={active ? colorTokens.primaryBlueDim : done ? colorTokens.successDim : "hsl(var(--card))"}
                      stroke={chipColor}
                      strokeWidth={active ? 2.5 : 1.5}
                      animate={{ scale: active ? 1.08 : 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      style={{ transformOrigin: "center" }}
                      filter={active ? "url(#glow-gap)" : ""}
                    />
                    <text x={chipW / 2} y="15" fill={chipColor} fontSize="12" fontWeight="bold" textAnchor="middle">{g}</text>
                    {k < gapSeq.length - 1 && (
                      <text x={chipW + 12} y="16" fill="hsl(var(--muted-foreground))" fontSize="13" textAnchor="middle">›</text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Draw Array Bars */}
          <AnimatePresence>
            {array.map((item: any, idx: number) => {
              const height = Math.max(20, (item.val / maxVal) * chartHeight);
              const yPos = svgHeight - 50 - height;
              const xPos = getX(idx);

              const isComparing = comparing?.includes(idx);
              const isSwapping = swapping?.includes(idx);
              const isCurrentI = i === idx;
              // 현재 gap 기준, 모든 원소가 속한 그룹 번호 (idx % gap)
              const groupId = gap > 0 ? idx % gap : -1;
              // 지금 활성화된(=기준 i 가 속한) 그룹인지
              const isActiveGroup = gap > 0 && i !== null && groupId === (i % gap);

              let fillColor = "hsl(var(--muted))"; // default muted
              let opacity = 0.5;

              if (isSorted) {
                fillColor = colorTokens.success; // success green
                opacity = 1;
              } else if (isSwapping) {
                fillColor = colorTokens.destructive; // swap red
                opacity = 1;
              } else if (isComparing) {
                fillColor = colorTokens.warning; // compare yellow
                opacity = 1;
              } else if (isCurrentI) {
                fillColor = colorTokens.primaryBlue; // pointer blue
                opacity = 1;
              } else if (gap > 0) {
                // 모든 부분 배열을 그룹별 고유 색으로 칠해 구조를 한눈에 보이게 한다.
                fillColor = GROUP_PALETTE[groupId % GROUP_PALETTE.length];
                opacity = isActiveGroup ? 0.85 : 0.4;
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
                    filter={(isSwapping || isComparing) ? `url(#glow-${isSwapping ? 'swap' : 'compare'})` : isActiveGroup ? "url(#glow-gap)" : ""}
                    animate={{ fill: fillColor, opacity }}
                    transition={{ duration: 0.3 }}
                  />
                  <text
                    x={barWidth / 2}
                    y={-10}
                    fill={isSorted || isSwapping || isComparing || isCurrentI || gap > 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
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

                  {/* Indicators below bars */}
                  {isCurrentI && (
                    <motion.text x={barWidth / 2} y={height + 40} fill={colorTokens.primaryBlue} fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#glow-gap)" initial={{ opacity: 0, y: height + 50 }} animate={{ opacity: 1, y: height + 40 }}>
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
              stroke={colorTokens.warning}
              strokeWidth="2"
              strokeDasharray="4"
            />
          )}

        </svg>

      </div>
    </div>
  );
}
