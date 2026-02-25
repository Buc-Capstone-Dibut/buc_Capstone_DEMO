"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Simulation Hook ---
export type SortElement = { id: string; val: number };

type Step = {
  array: SortElement[];
  i: number; // 1 to N-1 (Boundary between sorted and unsorted)
  j: number; // Iterator going back
  key: SortElement | null; // Value being inserted
  isInserting: boolean; // True when `key` finds its spot and is being written
  msg: string;
};

const DEFAULT_INSERTION_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];

// Note: Insertion sort operates slightly differently. It extracts array[i] as `key`,
// shifts elements that are > key to the right, and then inserts `key`.
function generateInsertionSortSteps(initialArray: number[]): Step[] {
  const steps: Step[] = [];
  // Build initial array of objects
  const arr: SortElement[] = initialArray.map((val, idx) => ({ id: `id-${val}-${idx}`, val }));
  const n = arr.length;

  steps.push({
    array: [...arr],
    i: 0,
    j: -1,
    key: null,
    isInserting: false,
    msg: "삽입 정렬을 시작합니다. 첫 번째 원소는 이미 정렬된 것으로 간주합니다.",
  });

  for (let i = 1; i < n; i++) {
    const key = arr[i];

    // Copy for visualization to show "hole" implicitly, but we keep arr full.
    // Instead of actually shifting everything in memory until the end,
    // we trace the algorithm exactly.
    let j = i - 1;

    steps.push({
      array: [...arr],
      i: i,
      j: j,
      key: key,
      isInserting: false,
      msg: `[Pass ${i}] 삽입할 기준 값(key)을 ${key.val} 로 설정합니다. 정렬된 구역과 역순으로 비교 시작.`,
    });

    while (j >= 0 && arr[j].val > key.val) {
      steps.push({
        array: [...arr],
        i: i,
        j: j,
        key: key,
        isInserting: false,
        msg: `비교: ${arr[j].val} > ${key.val} 이므로, ${arr[j].val}를 오른쪽으로 한 칸 옮깁니다.`,
      });

      arr[j + 1] = arr[j];
      j = j - 1;

      steps.push({
        array: [...arr],
        i: i,
        j: j, // Looking at next element or -1
        key: key,
        isInserting: false,
        msg: `자리 이동 완료. 다음 비교 대상 파악.`,
      });
    }

    if (j >= 0) {
      steps.push({
        array: [...arr],
        i: i,
        j: j,
        key: key,
        isInserting: false,
        msg: `비교: ${arr[j].val} <= ${key.val} 이므로 이동이 중단됩니다.`,
      });
    } else {
      steps.push({
        array: [...arr],
        i: i,
        j: j,
        key: key,
        isInserting: false,
        msg: `배열의 맨 앞까지 확인했습니다.`,
      });
    }

    steps.push({
      array: [...arr],
      i: i,
      j: j,
      key: key,
      isInserting: true,
      msg: `찾은 빈 자리(인덱스 ${j + 1})에 key 값(${key.val})을 삽입합니다.`,
    });

    arr[j + 1] = key;

    steps.push({
      array: [...arr],
      i: i,
      j: -1,
      key: null,
      isInserting: false,
      msg: `삽입 완료. 정렬된 구역이 한 칸 늘어났습니다.`,
    });
  }

  steps.push({
    array: [...arr],
    i: n,
    j: -1,
    key: null,
    isInserting: false,
    msg: "모든 데이터의 삽입이 완료되어 정렬 종료!",
  });

  return steps;
}

export function useInsertionSortSim(initialData: number[] = DEFAULT_INSERTION_DATA) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const generated = generateInsertionSortSteps(initialData);
    setSteps(generated);
    setStepIdx(0);
    setLogs(["> 시스템 초기화: 삽입 정렬 대기 중... Step을 눌러 시작하세요."]);
  }, [initialData]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    const newLogs = ["> 시스템 초기화: 삽입 정렬 대기 중... Step을 눌러 시작하세요."];
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
export function InsertionSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const { array, i, j, key, isInserting } = data as Step;

  const N = array.length;
  const BLOCK_WIDTH = 50;
  const BLOCK_SPACING = 20;
  const TOTAL_WIDTH = N * BLOCK_WIDTH + (N - 1) * BLOCK_SPACING;
  const START_X = (800 - TOTAL_WIDTH) / 2;

  // Find max value for bar heights
  const maxVal = Math.max(...array.map(item => item.val), 1);
  const MAX_BAR_HEIGHT = 160;
  const START_Y = 320;

  // We need to determine exactly what to display per index
  // A 'hole' is conceptually at j+1 when we are actively shifting.
  // In `array`, arr[j+1] might hold a duplicate value while shifting,
  // but we can visually dim it or replace it with the floating `key`.
  const isKeyActive = key !== null;
  const holeIndex = isKeyActive ? j + 1 : -1;

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
      <text x="40" y="50" fill="#f97316" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-orange)">
        INSERTION SORT
      </text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">
        정렬된 구역에서 자신의 위치를 찾아 삽입하여 구역을 넓혀갑니다.
      </text>

      {/* Status Panel (Top Right) */}
      <g transform="translate(420, 25)">
        <rect width="340" height="60" fill="hsl(var(--card))" opacity="0.8" stroke="hsl(var(--border))" rx="8" />
        <text x="170" y="25" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">
          현재 타겟 범위 (1 ~ {i < N ? i : N - 1})
        </text>
        <text x="170" y="45" fill={isInserting ? "#10b981" : (isKeyActive ? "#06b6d4" : "hsl(var(--foreground))")} fontSize="14" fontWeight="bold" textAnchor="middle">
          {isInserting ? `빈 공간에 Key값(${key ? key.val : ''}) 삽입!` : (isKeyActive ? `Key값(${key ? key.val : ''})와 정렬된 원소 비교 중...` : "새로운 값을 기준으로 설정합니다.")}
        </text>
      </g>

      {/* Sorted Area Indicator */}
      {i > 0 && i <= N && (
        <rect
          x={START_X - 10}
          y={START_Y - MAX_BAR_HEIGHT - 30}
          width={(i) * (BLOCK_WIDTH + BLOCK_SPACING)}
          height={MAX_BAR_HEIGHT + 70}
          rx="8"
          fill="rgba(16, 185, 129, 0.05)"
          stroke="#10b981"
          strokeDasharray="4"
        />
      )}
      <text x={START_X} y={START_Y - MAX_BAR_HEIGHT - 40} fill="#10b981" fontSize="12" fontWeight="bold">
        {i === 0 ? "초기 상태" : (i <= N ? "정렬된 구역 (사이즈 확장 중)" : "모두 정렬됨")}
      </text>

      {/* Current Key Indicator Floating */}
      <AnimatePresence>
        {isKeyActive && (
          <motion.g
            initial={{ opacity: 0, scale: 0.5, y: -50 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: isInserting ? 0 : -80, // Drop down if inserting
              x: isInserting ? START_X + holeIndex * (BLOCK_WIDTH + BLOCK_SPACING) : START_X + i * (BLOCK_WIDTH + BLOCK_SPACING)
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              transformOrigin: "center center",
            }}
          >
            <rect
              x={0}
              y={START_Y - Math.max(20, (key ? key.val / maxVal : 0) * MAX_BAR_HEIGHT)}
              width={BLOCK_WIDTH}
              height={Math.max(20, (key ? key.val / maxVal : 0) * MAX_BAR_HEIGHT)}
              rx="4"
              fill="rgba(6, 182, 212, 0.1)"
              stroke="#06b6d4"
              strokeWidth="3"
            />
            <text x={BLOCK_WIDTH / 2} y={START_Y - Math.max(20, (key ? key.val / maxVal : 0) * MAX_BAR_HEIGHT) / 2 + 6} fill="#06b6d4" fontSize="16" fontWeight="bold" textAnchor="middle">
              {key ? key.val : ''}
            </text>
            <text x={BLOCK_WIDTH / 2} y={START_Y - Math.max(20, (key ? key.val / maxVal : 0) * MAX_BAR_HEIGHT) - 15} fill="#06b6d4" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-cyan)">
              Key
            </text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Array Blocks */}
      <g transform="translate(0, 0)">
        {array.map((item, idx) => {
          const isSortedBlock = idx <= i - 1; // It is historically in the sorted zone
          const isCurrentlyComparing = idx === j;
          const isHole = isKeyActive && idx === holeIndex && !isInserting; // The physical spot waiting to be overridden or key replaced
          const isOriginalKeyPos = isKeyActive && idx === i && !isInserting; // Where the key came from

          const barHeight = Math.max(20, (item.val / maxVal) * MAX_BAR_HEIGHT);
          let y = START_Y - barHeight;

          let fill = "hsl(var(--card))";
          let stroke = "hsl(var(--border))";
          let textColor = "hsl(var(--foreground))";
          let opacity = 1;

          if (isHole) {
            // Visual hole, hide the actual text/content because we're imagining it moved or is empty
            fill = "none";
            stroke = "hsl(var(--border))";
            textColor = "transparent";
            opacity = 0.5;
          } else if (isOriginalKeyPos) {
            // It's lifted up
            opacity = 0;
          } else if (isCurrentlyComparing) {
            fill = "rgba(244, 63, 94, 0.1)";
            stroke = "#f43f5e";
            textColor = "#f43f5e";
            y -= 10;
          } else if (isSortedBlock) {
            fill = "rgba(16, 185, 129, 0.1)";
            stroke = "#10b981";
            textColor = "#10b981";
          }

          const x = START_X + idx * (BLOCK_WIDTH + BLOCK_SPACING);

          return (
            <motion.g
              key={item.id}
              initial={false}
              animate={{ x, y, opacity }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <rect
                x={0} y={0}
                width={BLOCK_WIDTH} height={barHeight}
                rx="4"
                fill={fill}
                stroke={isHole ? stroke : stroke}
                strokeWidth={isCurrentlyComparing || isSortedBlock ? 3 : 2}
                strokeDasharray={isHole ? "4" : "0"}
              />
              <text x={BLOCK_WIDTH / 2} y={barHeight / 2 + 6} fill={textColor} fontSize="16" fontWeight="bold" textAnchor="middle">
                {item.val}
              </text>
              <text x={BLOCK_WIDTH / 2} y={barHeight + 20} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">
                [{idx}]
              </text>

              {/* Pointer indication */}
              <AnimatePresence>
                {isCurrentlyComparing && (
                  <motion.text
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    x={BLOCK_WIDTH / 2}
                    y={barHeight + 40}
                    fill="#f43f5e"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    비교 대상
                  </motion.text>
                )}
              </AnimatePresence>
            </motion.g>
          );
        })}
      </g>

      {/* Legend */}
      <g transform="translate(40, 420)">
        <rect width="320" height="50" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <circle cx="20" cy="25" r="5" fill="#06b6d4" />
        <text x="35" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">Key(삽입값)</text>

        <circle cx="105" cy="25" r="5" fill="#10b981" />
        <text x="120" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">정렬 구역</text>

        <circle cx="195" cy="25" r="5" fill="#f43f5e" />
        <text x="210" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">비교 대상(Shift검사)</text>
      </g>
    </svg>
  );
}
