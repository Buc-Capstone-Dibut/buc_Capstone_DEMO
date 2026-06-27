"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { NeonGlowFilters } from '@/components/features/ctp/playground/visualizers/shared/svg-primitives';
import { colorTokens } from "../../shared/svg-primitives";

// --- Simulation Hook ---
// `lowerBound` carries the comparison-based lower-bound proof state so the
// decision-tree panel can be revealed progressively as the user steps through.
type Step = {
  array: number[];
  msg: string;
  status: 'input' | 'processing' | 'sorted';
  // 0 = hidden, 1 = leaves (N!), 2 = height (log2 N!), 3 = conclusion (N log N)
  lowerBound: 0 | 1 | 2 | 3;
};

function generateSortingOverviewSteps(): Step[] {
  const steps: Step[] = [];
  const initial = [8, 3, 5, 1, 9, 2, 7, 4, 6];

  steps.push({
    array: initial,
    msg: "컴퓨터 과학의 영원한 숙제, '정렬(Sorting)'입니다.",
    status: 'input',
    lowerBound: 0,
  });

  steps.push({
    array: initial,
    msg: "수많은 데이터가 무작위로 흩어져 있을 때, 원하는 데이터를 찾기란 쉽지 않습니다.",
    status: 'input',
    lowerBound: 0,
  });

  // Just simulate generic processing phases (like scanning)
  const partiallySorted1 = [3, 5, 1, 8, 2, 7, 4, 6, 9];
  steps.push({
    array: partiallySorted1,
    msg: "정렬 알고리즘은 특정한 기준(오름차순, 내림차순 등)에 따라 데이터를 재배치합니다.",
    status: 'processing',
    lowerBound: 0,
  });

  const partiallySorted2 = [1, 3, 5, 2, 4, 6, 7, 8, 9];
  steps.push({
    array: partiallySorted2,
    msg: "어떤 방법을 선택하느냐에 따라 걸리는 시간과 메모리 사용량이 극적으로 차이 납니다.",
    status: 'processing',
    lowerBound: 0,
  });

  const finalSorted = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  steps.push({
    array: finalSorted,
    msg: "정렬이 완료되면 데이터의 검색, 최댓값/최솟값 확인이 매우 빠르고 쉬워집니다!",
    status: 'sorted',
    lowerBound: 0,
  });

  // --- 비교 기반 정렬의 하한(Lower Bound) 증명 ---
  steps.push({
    array: finalSorted,
    msg: "그렇다면 '비교'만으로 정렬하는 알고리즘은 얼마나 빨라질 수 있을까요? 이론적 하한을 따져봅니다.",
    status: 'sorted',
    lowerBound: 1,
  });
  steps.push({
    array: finalSorted,
    msg: "N개의 서로 다른 원소가 만들 수 있는 순서는 N! 가지. 결정 트리의 잎(leaf)이 최소 N!개 필요합니다.",
    status: 'sorted',
    lowerBound: 1,
  });
  steps.push({
    array: finalSorted,
    msg: "비교 한 번은 트리에서 한 단계 내려가는 분기입니다. 잎이 N!개면 트리 높이는 최소 log₂(N!) 입니다.",
    status: 'sorted',
    lowerBound: 2,
  });
  steps.push({
    array: finalSorted,
    msg: "스털링 근사로 log₂(N!) = Θ(N log N). 즉 어떤 비교 기반 정렬도 O(N log N)보다 빠를 수 없습니다.",
    status: 'sorted',
    lowerBound: 3,
  });

  return steps;
}

export function useSortingOverviewSim() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const generated = generateSortingOverviewSteps();
    setSteps(generated);
    setStepIdx(0);
    setLogs(["> 시스템 초기화: 정렬의 개념 소개 대기 중... Step을 눌러 진행하세요."]);
  }, []);

  // Rebuild the log stack from scratch for any target step so that the slider
  // (which can jump backwards) keeps the learning note consistent with the view.
  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    const newLogs = ["> 시스템 초기화: 정렬의 개념 소개 대기 중... Step을 눌러 진행하세요."];
    for (let i = 1; i <= newStep; i++) {
      newLogs.unshift(`[Step ${i}] ${steps[i].msg}`);
    }
    setLogs(newLogs);
  }, [steps]);

  const nextStep = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= steps.length - 1 ? prev : prev + 1;
      if (next !== prev) {
        handleSetStep(next);
      }
      return next;
    });
  }, [steps.length, handleSetStep]);

  const reset = useCallback(() => {
    handleSetStep(0);
  }, [handleSetStep]);

  const currentState = steps[stepIdx] || null;

  return {
    runSimulation: () => {},
    interactive: {
      visualData: currentState,
      logs,
      handlers: {
        push: nextStep,
        clear: reset,
      },
      currentStep: stepIdx,
      maxSteps: steps.length,
      setStep: handleSetStep,
      nextStep,
      reset
    }
  };
}

// --- Visualizer Component ---
export function SortingOverviewVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const { array, status, lowerBound = 0 } = data as Step;
  const showBound = lowerBound > 0;

  const N = array.length;
  // Use a bar chart visualization
  const BAR_WIDTH = 40;
  const BAR_SPACING = 10;
  const TOTAL_WIDTH = N * BAR_WIDTH + (N - 1) * BAR_SPACING;
  const START_X = (800 - TOTAL_WIDTH) / 2;

  // Max value is 9 in our preset
  const MAX_VAL = 9;
  const BAR_BASE_HEIGHT = 20;
  const HEIGHT_MULTIPLIER = 15;

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <NeonGlowFilters />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.2" />
        </pattern>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={colorTokens.warning} />
        </marker>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title */}
      <text x="40" y="50" fill={colorTokens.info} fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-primary)">
        SORTING ALGORITHMS
      </text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">
        데이터를 효율적으로 구성하기 위한 가장 기초적이고 중요한 방법
      </text>

      {/* Main visualization area */}
      <g transform="translate(0, 350)">
        {/* Base line */}
        <line x1="150" y1="0" x2="650" y2="0" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4" opacity="0.5" />

        {array.map((val, idx) => {
          const x = START_X + idx * (BAR_WIDTH + BAR_SPACING);
          const height = BAR_BASE_HEIGHT + val * HEIGHT_MULTIPLIER;
          const y = -height;

          let fill = "hsl(var(--card))";
          let stroke = "hsl(var(--border))";
          let glow = "";

          if (status === 'sorted') {
            fill = colorTokens.successSoft;
            stroke = colorTokens.success;
            glow = "url(#neon-glow-success)";
          } else if (status === 'processing') {
            fill = colorTokens.infoSoft;
            stroke = colorTokens.info;
          } else {
            fill = colorTokens.destructiveTrace;
            stroke = colorTokens.destructive;
          }

          return (
            <motion.g
              key={`bar-${val}`} // Using val as key makes them shuffle visibly!
              initial={false}
              animate={{ x, y }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {/* The bar */}
              <rect
                x={0} y={0}
                width={BAR_WIDTH} height={height}
                rx="4"
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
              />
              {/* Highlight drop at top of bar */}
              <rect
                x={0} y={0}
                width={BAR_WIDTH} height="4"
                rx="2"
                fill={stroke}
                filter={glow}
              />
              {/* Internal value text */}
              <text x={BAR_WIDTH / 2} y={height + 20} fill={status === 'sorted' ? colorTokens.success : "hsl(var(--foreground))"} fontSize="14" fontWeight="bold" textAnchor="middle">
                {val}
              </text>
            </motion.g>
          );
        })}
      </g>

      {/* Central Status Message (hidden while the lower-bound proof is on stage) */}
      <motion.g
        transform="translate(400, 150)"
        style={{ pointerEvents: 'none' }}
        animate={{ opacity: showBound ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.text
          key={status} // Change key to trigger re-animation on status change
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          x="0" y="0"
          fill={status === 'sorted' ? colorTokens.success : (status === 'processing' ? colorTokens.info : "hsl(var(--foreground))")}
          fontSize="24"
          fontWeight="bold"
          textAnchor="middle"
          filter={status === 'sorted' ? "url(#neon-glow-success)" : (status === 'processing' ? "url(#neon-glow-primary)" : "")}
        >
          {status === 'input' && "무작위로 섞인 데이터 (Unsorted)"}
          {status === 'processing' && "정렬 중... O(N²) ~ O(N log N) 소요"}
          {status === 'sorted' && "정렬 완료! 검색 효율 극대화 (Sorted)"}
        </motion.text>
        <text x="0" y="30" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">
          {status === 'input' && "O(N) 이진 탐색 불가, 순차 탐색 필수"}
          {status === 'processing' && "원소간 크기 비교 및 메모리 내 자리 교환 발생"}
          {status === 'sorted' && "O(log N) 탐색 가능, 최댓값/최솟값 O(1)에 확인"}
        </text>
      </motion.g>

      {/* 비교 기반 정렬의 하한 O(N log N) — 결정 트리(Decision Tree) 증명 패널 */}
      {showBound && (
        <motion.g
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ pointerEvents: 'none' }}
        >
          <text x="400" y="120" fill={colorTokens.primaryHighlight} fontSize="20" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-primary)">
            비교 기반 정렬의 이론적 하한
          </text>

          {/* 결정 트리: 비교가 분기, 잎 = 가능한 순열 */}
          <g transform="translate(400, 150)">
            {/* root */}
            <circle cx="0" cy="0" r="14" fill={colorTokens.infoDim} stroke={colorTokens.info} strokeWidth="2" />
            <text x="0" y="4" fill={colorTokens.info} fontSize="11" fontWeight="bold" textAnchor="middle">a&lt;b?</text>

            {/* level-1 branches */}
            <line x1="-7" y1="11" x2="-70" y2="44" stroke={colorTokens.info} strokeWidth="2" opacity={lowerBound >= 2 ? 1 : 0.4} />
            <line x1="7" y1="11" x2="70" y2="44" stroke={colorTokens.info} strokeWidth="2" opacity={lowerBound >= 2 ? 1 : 0.4} />
            <circle cx="-70" cy="55" r="12" fill={colorTokens.infoDim} stroke={colorTokens.info} strokeWidth="2" />
            <circle cx="70" cy="55" r="12" fill={colorTokens.infoDim} stroke={colorTokens.info} strokeWidth="2" />

            {/* level-2 → leaves */}
            {[-110, -40, 40, 110].map((lx, k) => {
              const parent = lx < 0 ? -70 : 70;
              return (
                <g key={k}>
                  <line x1={parent} y1="66" x2={lx} y2="98" stroke={colorTokens.primaryHighlight} strokeWidth="2" opacity={lowerBound >= 1 ? 1 : 0.3} />
                  <motion.rect
                    x={lx - 13} y="100" width="26" height="22" rx="4"
                    fill={colorTokens.primaryHighlightDim}
                    stroke={colorTokens.primaryHighlight}
                    strokeWidth="2"
                    initial={false}
                    animate={{ opacity: lowerBound >= 1 ? 1 : 0.25 }}
                  />
                </g>
              );
            })}
            <text x="0" y="140" fill={colorTokens.primaryHighlight} fontSize="13" fontWeight="bold" textAnchor="middle">
              잎(leaf) ≥ N! 가지의 순열
            </text>

            {/* 높이 = 비교 횟수 = 트리 깊이 */}
            <motion.g animate={{ opacity: lowerBound >= 2 ? 1 : 0.15 }}>
              <line x1="-150" y1="0" x2="-150" y2="100" stroke={colorTokens.warning} strokeWidth="2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
              <text x="-160" y="55" fill={colorTokens.warning} fontSize="12" fontWeight="bold" textAnchor="end">
                높이 h
              </text>
              <text x="-160" y="72" fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end">
                = 최악 비교 횟수
              </text>
            </motion.g>
          </g>

          {/* 결론 수식 배지 */}
          <motion.g animate={{ opacity: lowerBound >= 3 ? 1 : 0.2, scale: lowerBound >= 3 ? 1 : 0.96 }} style={{ transformOrigin: 'center' }}>
            <rect x="230" y="300" width="340" height="64" rx="10" fill={colorTokens.successGhost} stroke={colorTokens.success} strokeWidth="2" />
            <text x="400" y="326" fill={colorTokens.success} fontSize="16" fontWeight="bold" textAnchor="middle" filter={lowerBound >= 3 ? "url(#neon-glow-success)" : ""}>
              2ʰ ≥ N!  ⟹  h ≥ log₂(N!)
            </text>
            <text x="400" y="350" fill={colorTokens.success} fontSize="15" fontWeight="bold" textAnchor="middle">
              h = Ω(N log N)  ·  하한 달성
            </text>
          </motion.g>
        </motion.g>
      )}
    </svg>
  );
}
