"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Simulation Hook ---
export type SortElement = { id: string; val: number };

type Step = {
  array: SortElement[];
  i: number;
  j: number;
  isSwapping: boolean;
  isSorted: boolean[]; // true if element is in its final sorted position
  msg: string;
};

const DEFAULT_BUBBLE_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];

function generateBubbleSortSteps(initialArray: number[]): Step[] {
  const steps: Step[] = [];
  // Build initial array of objects
  const arr: SortElement[] = initialArray.map((val, idx) => ({ id: `id-${val}-${idx}`, val }));
  const n = arr.length;
  const isSorted = new Array(n).fill(false);

  steps.push({
    array: [...arr],
    i: 0,
    j: -1,
    isSwapping: false,
    isSorted: [...isSorted],
    msg: "버블 정렬을 시작합니다.",
  });

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({
        array: [...arr],
        i: i,
        j: j, // Comparing j and j+1
        isSwapping: false,
        isSorted: [...isSorted],
        msg: `비교: ${arr[j].val} 와 ${arr[j+1].val}`,
      });

      if (arr[j].val > arr[j + 1].val) {
        steps.push({
          array: [...arr],
          i: i,
          j: j,
          isSwapping: true,
          isSorted: [...isSorted],
          msg: `${arr[j].val} > ${arr[j+1].val} 이므로 자리를 바꿉니다.`,
        });

        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
        swapped = true;

        steps.push({
          array: [...arr],
          i: i,
          j: j,
          isSwapping: false,
          isSorted: [...isSorted],
          msg: `교환 완료.`,
        });
      } else {
        steps.push({
          array: [...arr],
          i: i,
          j: j,
          isSwapping: false,
          isSorted: [...isSorted],
          msg: `${arr[j].val} <= ${arr[j+1].val} 이므로 넘어갑니다.`,
        });
      }
    }

    // The element at n - 1 - i is now sorted
    isSorted[n - 1 - i] = true;
    steps.push({
      array: [...arr],
      i: i + 1,
      j: -1,
      isSwapping: false,
      isSorted: [...isSorted],
      msg: `${arr[n - 1 - i].val} 이(가) 최종 위치에 확정되었습니다.`,
    });

    if (!swapped) {
      steps.push({
        array: [...arr],
        i: n,
        j: -1,
        isSwapping: false,
        isSorted: new Array(n).fill(true),
        msg: `이번 단계에서 교환이 한 번도 발생하지 않았습니다. 이미 정렬이 완료되었습니다! (Early Exit)`,
      });
      break;
    }
  }

  // Mark all as sorted if it completed naturally
  steps.push({
    array: [...arr],
    i: n,
    j: -1,
    isSwapping: false,
    isSorted: new Array(n).fill(true),
    msg: "모든 데이터가 정렬되었습니다!",
  });

  return steps;
}

export function useBubbleSortSim(initialData: number[] = DEFAULT_BUBBLE_DATA) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const generated = generateBubbleSortSteps(initialData);
    setSteps(generated);
    setStepIdx(0);
    setLogs(["> 시스템 초기화: 버블 정렬 대기 중... Step을 눌러 시작하세요."]);
  }, [initialData]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    const newLogs = ["> 시스템 초기화: 버블 정렬 대기 중... Step을 눌러 시작하세요."];
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
    runSimulation: () => {}, // unused for stepping interface
    interactive: {
      visualData: currentState,
      logs,
      handlers: {
        push: nextStep, // using push as "Step"
        clear: reset,   // using clear as "Reset"
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
export function BubbleSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const { array, j, isSwapping, isSorted } = data as Step;

  const N = array.length;
  // Calculate block dimensions
  const BLOCK_WIDTH = 50;
  const BLOCK_SPACING = 20;
  const TOTAL_WIDTH = N * BLOCK_WIDTH + (N - 1) * BLOCK_SPACING;
  const START_X = (800 - TOTAL_WIDTH) / 2;

  // Find max value for bar heights
  const maxVal = Math.max(...array.map(item => item.val), 1);
  const MAX_BAR_HEIGHT = 160;
  const START_Y = 320;

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
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.2" />
        </pattern>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title */}
      <text x="40" y="50" fill="#06b6d4" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-cyan)">
        BUBBLE SORT
      </text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">
        인접한 두 원소를 비교하여 조건을 만족하면 교환합니다.
      </text>

      {/* Status Panel (Top Right) */}
      <g transform="translate(420, 25)">
        <rect width="340" height="60" fill="hsl(var(--card))" opacity="0.8" stroke="hsl(var(--border))" rx="8" />
        <text x="170" y="25" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">
          현재 상태
        </text>
        <text x="170" y="45" fill={isSwapping ? "#f43f5e" : (j !== -1 ? "#06b6d4" : "#10b981")} fontSize="14" fontWeight="bold" textAnchor="middle">
          {isSwapping ? "두 원소를 교환합니다!" : (j !== -1 ? "두 원소 크기 비교 중..." : "각 Pass가 끝나면 가장 큰 원소가 맨 뒤로 이동합니다.")}
        </text>
      </g>

      {/* Array Blocks */}
      <g transform="translate(0, 0)">
        {array.map((item, idx) => {
          const isComparing = idx === j || idx === j + 1;
          const isSortedBlock = isSorted[idx];
          const x = START_X + idx * (BLOCK_WIDTH + BLOCK_SPACING);

          const barHeight = Math.max(20, (item.val / maxVal) * MAX_BAR_HEIGHT);
          let y = START_Y - barHeight;

          // Add a slight lift if comparing
          if (isComparing && !isSwapping) y -= 15;

          let fill = "hsl(var(--card))";
          let stroke = "hsl(var(--border))";
          let textColor = "hsl(var(--foreground))";

          if (isSortedBlock) {
            fill = "rgba(16, 185, 129, 0.1)";
            stroke = "#10b981";
            textColor = "#10b981";
          } else if (isComparing) {
            if (isSwapping) {
              fill = "rgba(244, 63, 94, 0.1)";
              stroke = "#f43f5e";
              textColor = "#f43f5e";
            } else {
              fill = "rgba(6, 182, 212, 0.1)";
              stroke = "#06b6d4";
              textColor = "#06b6d4";
            }
          }

          return (
            <motion.g
              key={item.id}
              initial={false}
              animate={{ x, y }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <rect
                x={0} y={0}
                width={BLOCK_WIDTH} height={barHeight}
                rx="4"
                fill={fill}
                stroke={stroke}
                strokeWidth={isComparing || isSortedBlock ? 3 : 2}
              />
              <text x={BLOCK_WIDTH / 2} y={barHeight / 2 + 6} fill={textColor} fontSize="16" fontWeight="bold" textAnchor="middle">
                {item.val}
              </text>
              <text x={BLOCK_WIDTH / 2} y={barHeight + 20} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">
                [{idx}]
              </text>
            </motion.g>
          );
        })}

        {/* Comparison Line / Icon */}
        <AnimatePresence>
          {j !== -1 && (
            <motion.g
              key={`comparison-box-${j}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Box framing the two elements */}
              <rect
                x={START_X + j * (BLOCK_WIDTH + BLOCK_SPACING) - 10}
                y={START_Y - MAX_BAR_HEIGHT - 40}
                width={BLOCK_WIDTH * 2 + BLOCK_SPACING + 20}
                height={MAX_BAR_HEIGHT + 80}
                rx="12"
                fill="none"
                stroke={isSwapping ? "#f43f5e" : "#06b6d4"}
                strokeWidth="2"
                strokeDasharray="4"
              />

              <text
                x={START_X + j * (BLOCK_WIDTH + BLOCK_SPACING) + BLOCK_WIDTH + BLOCK_SPACING / 2}
                y={START_Y - MAX_BAR_HEIGHT - 55}
                fill={isSwapping ? "#f43f5e" : "#06b6d4"}
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                filter={isSwapping ? "url(#neon-glow-rose)" : "url(#neon-glow-cyan)"}
              >
                {isSwapping ? "SWAP!" : "COMPARE"}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </g>

      {/* Legend */}
      <g transform="translate(40, 420)">
        <rect width="250" height="50" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <circle cx="20" cy="25" r="5" fill="#06b6d4" />
        <text x="35" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">비교 중</text>

        <circle cx="95" cy="25" r="5" fill="#f43f5e" />
        <text x="110" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">교환</text>

        <circle cx="155" cy="25" r="5" fill="#10b981" />
        <text x="170" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">정렬 확정</text>
      </g>
    </svg>
  );
}
