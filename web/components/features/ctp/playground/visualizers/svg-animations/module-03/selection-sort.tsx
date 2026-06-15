"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colorTokens } from "../../shared/svg-primitives";

// --- Simulation Hook ---
// `tag` 은 동일 값(중복) 원소를 구분하기 위한 라벨(a, b, ...). 안정성(stability)
// 시각화에 쓰인다. `origIdx` 는 입력 배열에서의 원래 위치로, 정렬이 끝난 뒤
// 같은 값끼리의 상대 순서가 보존됐는지(=안정성) 판정하는 근거다.
export type SortElement = { id: string; val: number; origIdx: number; tag?: string };

type Step = {
  array: SortElement[];
  i: number;
  j: number;
  minIndex: number;
  isSwapping: boolean;
  isSorted: boolean[];
  msg: string;
  // 직전 swap 으로 같은 값의 상대 순서가 뒤집힌 원소들의 id (불안정성 강조용)
  instabilityIds?: string[];
};

const DEFAULT_SELECTION_DATA = [15, 8, 20, 2, 11, 8, 5, 18, 9, 14];

// 같은 값이 2번 이상 등장하면 a, b, c... 라벨을 붙여 시각적으로 구분한다.
function tagDuplicates(values: number[]): SortElement[] {
  const counts = new Map<number, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  const seen = new Map<number, number>();
  return values.map((val, idx) => {
    const total = counts.get(val) ?? 1;
    let tag: string | undefined;
    if (total > 1) {
      const order = seen.get(val) ?? 0;
      seen.set(val, order + 1);
      tag = String.fromCharCode(97 + order); // a, b, c ...
    }
    return { id: `id-${val}-${idx}`, val, origIdx: idx, tag };
  });
}

// 같은 값끼리의 상대 순서가 입력 대비 뒤집힌 원소들의 id 집합을 찾는다.
function detectInstability(arr: SortElement[]): string[] {
  const bad = new Set<string>();
  for (let a = 0; a < arr.length; a++) {
    for (let b = a + 1; b < arr.length; b++) {
      if (arr[a].val === arr[b].val && arr[a].origIdx > arr[b].origIdx) {
        bad.add(arr[a].id);
        bad.add(arr[b].id);
      }
    }
  }
  return [...bad];
}

function generateSelectionSortSteps(initialArray: number[]): Step[] {
  const steps: Step[] = [];
  // Build initial array of objects (중복 값에 a/b 태그 부여)
  const arr: SortElement[] = tagDuplicates(initialArray);
  const n = arr.length;
  const isSorted = new Array(n).fill(false);

  steps.push({
    array: [...arr],
    i: 0,
    j: -1,
    minIndex: -1,
    isSwapping: false,
    isSorted: [...isSorted],
    msg: "선택 정렬을 시작합니다.",
  });

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;

    steps.push({
      array: [...arr],
      i: i,
      j: i,
      minIndex: minIdx,
      isSwapping: false,
      isSorted: [...isSorted],
      msg: `[Pass ${i+1}] 시작 위치: 인덱스 ${i}. 현재 최소값으로 가정: ${arr[minIdx].val} (인덱스 ${minIdx})`,
    });

    for (let j = i + 1; j < n; j++) {
      steps.push({
        array: [...arr],
        i: i,
        j: j,
        minIndex: minIdx,
        isSwapping: false,
        isSorted: [...isSorted],
        msg: `탐색: 현재 최소값(${arr[minIdx].val})과 데이터(${arr[j].val}) 비교.`,
      });

      if (arr[j].val < arr[minIdx].val) {
        minIdx = j;
        steps.push({
          array: [...arr],
          i: i,
          j: j,
          minIndex: minIdx,
          isSwapping: false,
          isSorted: [...isSorted],
          msg: `새로운 최소값 발견! 값: ${arr[minIdx].val}, 인덱스: ${minIdx} 로 갱신합니다.`,
        });
      }
    }

    if (minIdx !== i) {
      steps.push({
        array: [...arr],
        i: i,
        j: minIdx,
        minIndex: minIdx,
        isSwapping: true,
        isSorted: [...isSorted],
        msg: `탐색 완료. 최솟값인 ${arr[minIdx].val} (인덱스 ${minIdx})를 시작 위치인 ${arr[i].val} (인덱스 ${i})와 교환합니다.`,
      });

      const temp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = temp;

      const flipped = detectInstability(arr);
      steps.push({
        array: [...arr],
        i: i,
        j: minIdx,
        minIndex: minIdx,
        isSwapping: false,
        isSorted: [...isSorted],
        msg: flipped.length > 0
          ? `교환 완료. ⚠️ 멀리 떨어진 자리와 바꾸면서 같은 값의 순서가 뒤집혔습니다 (불안정).`
          : `교환 완료.`,
        instabilityIds: flipped,
      });
    } else {
      steps.push({
        array: [...arr],
        i: i,
        j: -1,
        minIndex: minIdx,
        isSwapping: false,
        isSorted: [...isSorted],
        msg: `시작 위치 값이 최소값이므로 교환하지 않습니다.`,
      });
    }

    isSorted[i] = true;
    steps.push({
      array: [...arr],
      i: i + 1,
      j: -1,
      minIndex: -1,
      isSwapping: false,
      isSorted: [...isSorted],
      msg: `인덱스 ${i} 위치가 정렬 확정되었습니다.`,
    });
  }

  isSorted[n - 1] = true;
  const finalFlipped = detectInstability(arr);
  steps.push({
    array: [...arr],
    i: n,
    j: -1,
    minIndex: -1,
    isSwapping: false,
    isSorted: [...isSorted],
    msg: finalFlipped.length > 0
      ? "정렬 완료! 단, 같은 값(8a·8b)의 상대 순서가 입력과 달라졌습니다 → 선택 정렬은 불안정(Unstable) 정렬입니다."
      : "모든 데이터가 정렬되었습니다!",
    instabilityIds: finalFlipped,
  });

  return steps;
}

export function useSelectionSortSim(initialData: number[] = DEFAULT_SELECTION_DATA) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const generated = generateSelectionSortSteps(initialData);
    setSteps(generated);
    setStepIdx(0);
    setLogs(["> 시스템 초기화: 선택 정렬 대기 중... Step을 눌러 시작하세요."]);
  }, [initialData]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    const newLogs = ["> 시스템 초기화: 선택 정렬 대기 중... Step을 눌러 시작하세요."];
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
export function SelectionSortVisualizer({ data }: { data: any }) {
  if (!data) return null;
  const { array, i, j, minIndex, isSwapping, isSorted, instabilityIds = [] } = data as Step;
  const flippedSet = new Set(instabilityIds);
  const hasInstability = flippedSet.size > 0;

  const N = array.length;
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
        <filter id="neon-glow-orange" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-purple" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.2" />
        </pattern>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title */}
      <text x="40" y="50" fill={colorTokens.primaryHighlight} fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-purple)">
        SELECTION SORT
      </text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">
        미정렬 구역에서 최솟값을 찾아 정렬된 구역 끝으로 이동시킵니다.
      </text>

      {/* Status Panel (Top Right) */}
      <g transform="translate(420, 25)">
        <rect width="340" height="60" fill="hsl(var(--card))" opacity="0.8" stroke="hsl(var(--border))" rx="8" />
        <text x="170" y="25" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">
          현재 타겟 범위 (시작: Index {i})
        </text>
        <text x="170" y="45" fill={isSwapping ? colorTokens.warning : (j !== -1 ? colorTokens.info : colorTokens.success)} fontSize="14" fontWeight="bold" textAnchor="middle">
          {isSwapping ? `가장 작은 값(${array[i] ? array[i].val : ''})을 자리에 배치합니다!` : (j !== -1 && minIndex !== -1 ? `최솟값 후보 변경됨, 계속 탐색을 진행합니다.` : "다음 사이클을 시작합니다.")}
        </text>
      </g>

      {/* Area Marker for Sorted/Unsorted */}
      {i < N && (
        <g>
          <rect x={START_X - 10} y={START_Y - MAX_BAR_HEIGHT - 30} width={(i) * (BLOCK_WIDTH + BLOCK_SPACING)} height={MAX_BAR_HEIGHT + 70} rx="8" fill={colorTokens.successGhost} stroke={colorTokens.success} strokeDasharray="4" />
          <text x={START_X} y={START_Y - MAX_BAR_HEIGHT - 40} fill={colorTokens.success} fontSize="12" fontWeight="bold">정렬 완료 구역</text>

          <rect x={START_X + i * (BLOCK_WIDTH + BLOCK_SPACING) - 10} y={START_Y - MAX_BAR_HEIGHT - 30} width={(N - i) * (BLOCK_WIDTH + BLOCK_SPACING)} height={MAX_BAR_HEIGHT + 70} rx="8" fill={colorTokens.destructiveGhost} stroke={colorTokens.destructive} strokeDasharray="4" />
          <text x={START_X + i * (BLOCK_WIDTH + BLOCK_SPACING)} y={START_Y - MAX_BAR_HEIGHT - 40} fill={colorTokens.destructive} fontSize="12" fontWeight="bold">미정렬 구역 (최솟값 탐색 대상)</text>
        </g>
      )}

      {/* Array Blocks */}
      <g transform="translate(0, 0)">
        {array.map((item, idx) => {
          const isSortedBlock = isSorted[idx];
          const isCurrentMin = idx === minIndex;
          const isComparing = idx === j && !isSwapping;
          const isSwapTarget = isSwapping && (idx === i || idx === minIndex);
          const isFlipped = flippedSet.has(item.id);

          const x = START_X + idx * (BLOCK_WIDTH + BLOCK_SPACING);

          const barHeight = Math.max(20, (item.val / maxVal) * MAX_BAR_HEIGHT);
          let y = START_Y - barHeight;

          // Lift current minimum
          if (isCurrentMin && !isSwapping) y -= 15;
          if (isSwapTarget) y -= 20;
          if (isComparing) y -= 10;

          let fill = "hsl(var(--card))";
          let stroke = "hsl(var(--border))";
          let textColor = "hsl(var(--foreground))";

          if (isSortedBlock) {
            fill = colorTokens.successDim;
            stroke = colorTokens.success;
            textColor = colorTokens.success;
          } else if (isSwapTarget) {
            fill = colorTokens.warningDim;
            stroke = colorTokens.warning;
            textColor = colorTokens.warning;
          } else if (isCurrentMin) {
            fill = colorTokens.infoDim;
            stroke = colorTokens.info;
            textColor = colorTokens.info;
          } else if (isComparing) {
            fill = colorTokens.primaryHighlightDim;
            stroke = colorTokens.primaryHighlight;
            textColor = colorTokens.primaryHighlight;
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
                strokeWidth={isComparing || isSortedBlock || isCurrentMin || isSwapTarget ? 3 : 2}
              />
              <text x={BLOCK_WIDTH / 2} y={barHeight / 2 + 6} fill={textColor} fontSize="16" fontWeight="bold" textAnchor="middle">
                {item.val}
              </text>
              {/* 중복 값 구분 라벨 (a/b) — 안정성 추적용 */}
              {item.tag && (
                <text
                  x={BLOCK_WIDTH / 2}
                  y={barHeight / 2 + 22}
                  fill={isFlipped ? colorTokens.destructive : "hsl(var(--muted-foreground))"}
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {item.val}{item.tag}
                </text>
              )}
              <text x={BLOCK_WIDTH / 2} y={barHeight + 20} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">
                [{idx}]
              </text>

              {/* 불안정성: 같은 값의 상대 순서가 뒤집힌 원소를 빨간 점선 링으로 강조 */}
              <AnimatePresence>
                {isFlipped && (
                  <motion.rect
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.5, 1, 0.5], scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    x={-5}
                    y={-5}
                    width={BLOCK_WIDTH + 10}
                    height={barHeight + 10}
                    rx="6"
                    fill="none"
                    stroke={colorTokens.destructive}
                    strokeWidth="2.5"
                    strokeDasharray="5"
                    style={{ transformOrigin: 'center' }}
                  />
                )}
              </AnimatePresence>

              {/* Min tag */}
              <AnimatePresence>
                {isCurrentMin && !isSwapping && (
                  <motion.text
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    x={BLOCK_WIDTH / 2}
                    y={-25}
                    fill={colorTokens.info}
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    filter="url(#neon-glow-cyan)"
                  >
                    Min!
                  </motion.text>
                )}
              </AnimatePresence>

              {/* Pointer for current check */}
              <AnimatePresence>
                {isComparing && (
                  <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    d={`M ${BLOCK_WIDTH / 2} -35 L ${BLOCK_WIDTH / 2} -10`}
                    stroke={colorTokens.primaryHighlight}
                    strokeWidth="3"
                    markerEnd="url(#arrow)"
                  />
                )}
              </AnimatePresence>
            </motion.g>
          );
        })}

        {/* Swap Arch */}
        <AnimatePresence>
          {isSwapping && i !== minIndex && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              d={`M ${START_X + i * (BLOCK_WIDTH + BLOCK_SPACING) + BLOCK_WIDTH/2} ${START_Y - MAX_BAR_HEIGHT - 30} C ${START_X + i * (BLOCK_WIDTH + BLOCK_SPACING) + BLOCK_WIDTH/2} ${START_Y - MAX_BAR_HEIGHT - 90}, ${START_X + minIndex * (BLOCK_WIDTH + BLOCK_SPACING) + BLOCK_WIDTH/2} ${START_Y - MAX_BAR_HEIGHT - 90}, ${START_X + minIndex * (BLOCK_WIDTH + BLOCK_SPACING) + BLOCK_WIDTH/2} ${START_Y - MAX_BAR_HEIGHT - 30}`}
              fill="none"
              stroke={colorTokens.warning}
              strokeWidth="4"
              strokeDasharray="6"
              filter="url(#neon-glow-orange)"
            />
          )}
        </AnimatePresence>
      </g>

      {/* 불안정 정렬 경고 배너 — 같은 값의 순서가 뒤집힌 순간 표시 */}
      <AnimatePresence>
        {hasInstability && (
          <motion.g
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transform="translate(470, 420)"
          >
            <rect width="290" height="50" rx="8" fill={colorTokens.destructiveGhost} stroke={colorTokens.destructive} strokeWidth="2" />
            <text x="16" y="22" fill={colorTokens.destructive} fontSize="13" fontWeight="bold" filter="url(#neon-glow-orange)">
              ⚠ 불안정 정렬 (Unstable)
            </text>
            <text x="16" y="40" fill="hsl(var(--muted-foreground))" fontSize="11">
              같은 값 8a · 8b 의 상대 순서가 뒤집혔습니다
            </text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Legend */}
      <g transform="translate(40, 420)">
        <rect width="400" height="50" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <circle cx="20" cy="25" r="5" fill={colorTokens.primaryHighlight} />
        <text x="35" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">탐색</text>

        <circle cx="85" cy="25" r="5" fill={colorTokens.info} />
        <text x="100" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">현재 최소값</text>

        <circle cx="185" cy="25" r="5" fill={colorTokens.warning} />
        <text x="200" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">교환</text>

        <circle cx="255" cy="25" r="5" fill={colorTokens.success} />
        <text x="270" y="29" fill="hsl(var(--muted-foreground))" fontSize="12">정렬 확정</text>
      </g>
    </svg>
  );
}
