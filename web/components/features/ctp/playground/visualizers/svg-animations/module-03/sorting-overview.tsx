"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// --- Simulation Hook ---
type Step = {
  array: number[];
  msg: string;
  status: 'input' | 'processing' | 'sorted';
};

function generateSortingOverviewSteps(): Step[] {
  const steps: Step[] = [];
  const initial = [8, 3, 5, 1, 9, 2, 7, 4, 6];

  steps.push({
    array: initial,
    msg: "컴퓨터 과학의 영원한 숙제, '정렬(Sorting)'입니다.",
    status: 'input'
  });

  steps.push({
    array: initial,
    msg: "수많은 데이터가 무작위로 흩어져 있을 때, 원하는 데이터를 찾기란 쉽지 않습니다.",
    status: 'input'
  });

  // Just simulate generic processing phases (like scanning)
  const partiallySorted1 = [3, 5, 1, 8, 2, 7, 4, 6, 9];
  steps.push({
    array: partiallySorted1,
    msg: "정렬 알고리즘은 특정한 기준(오름차순, 내림차순 등)에 따라 데이터를 재배치합니다.",
    status: 'processing'
  });

  const partiallySorted2 = [1, 3, 5, 2, 4, 6, 7, 8, 9];
  steps.push({
    array: partiallySorted2,
    msg: "어떤 방법을 선택하느냐에 따라 걸리는 시간과 메모리 사용량이 극적으로 차이 납니다.",
    status: 'processing'
  });

  const finalSorted = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  steps.push({
    array: finalSorted,
    msg: "정렬이 완료되면 데이터의 검색, 최댓값/최솟값 확인이 매우 빠르고 쉬워집니다!",
    status: 'sorted'
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

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const nextStep = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= steps.length - 1 ? prev : prev + 1;
      if (next !== prev) {
        appendLog(`[Step ${next}] ${steps[next].msg}`);
      }
      return next;
    });
  }, [steps, appendLog]);

  const reset = useCallback(() => {
    setStepIdx(0);
    setLogs(["> 리셋: 초기 상태로 돌아갑니다."]);
  }, []);

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
      nextStep,
      reset
    }
  };
}

// --- Visualizer Component ---
export function SortingOverviewVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const { array, status } = data as Step;

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
      <defs>
        <filter id="neon-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-rose" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-orange" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.2" />
        </pattern>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title */}
      <text x="40" y="50" fill="#06b6d4" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-cyan)">
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
            fill = "rgba(16, 185, 129, 0.2)";
            stroke = "#10b981";
            glow = "url(#neon-glow-emerald)";
          } else if (status === 'processing') {
            fill = "rgba(6, 182, 212, 0.2)";
            stroke = "#06b6d4";
          } else {
            fill = "rgba(244, 63, 94, 0.1)";
            stroke = "#f43f5e";
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
              <text x={BAR_WIDTH / 2} y={height + 20} fill={status === 'sorted' ? "#10b981" : "hsl(var(--foreground))"} fontSize="14" fontWeight="bold" textAnchor="middle">
                {val}
              </text>
            </motion.g>
          );
        })}
      </g>

      {/* Central Status Message */}
      <g transform="translate(400, 150)" style={{ pointerEvents: 'none' }}>
        <motion.text
          key={status} // Change key to trigger re-animation on status change
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          x="0" y="0"
          fill={status === 'sorted' ? "#10b981" : (status === 'processing' ? "#06b6d4" : "hsl(var(--foreground))")}
          fontSize="24"
          fontWeight="bold"
          textAnchor="middle"
          filter={status === 'sorted' ? "url(#neon-glow-emerald)" : (status === 'processing' ? "url(#neon-glow-cyan)" : "")}
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
      </g>
    </svg>
  );
}
