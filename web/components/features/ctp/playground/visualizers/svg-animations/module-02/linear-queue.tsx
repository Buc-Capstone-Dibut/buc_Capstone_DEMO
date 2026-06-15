"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

const MAX_SIZE = 6;

// ── Step model ───────────────────────────────────────────────────────────────
type LinearActionType = "IDLE" | "ENQUEUE" | "DEQUEUE" | "PEEK" | "ERROR";
type LinearStep = {
  items: (number | null)[];
  front: number;
  rear: number; // 마지막으로 채워진 인덱스
  action: { type: LinearActionType; val?: number; index?: number };
  maxSize: number;
  msg: string;
  falseOverflow: boolean; // 앞쪽 빈 칸이 있는데 rear 가 끝에 닿아 삽입 실패
};

const DEFAULT_LINEAR_SEED = [10, 20];

// 결정적 시나리오로 가짜 오버플로(False Overflow)를 자동 시연한다.
// 초기: [10,20,_,_,_,_], front=0, rear=1
//  1) ENQUEUE 로 rear 를 배열 끝(5)까지 밀어 채운다 → 배열이 끝까지 점유.
//  2) DEQUEUE 를 두 번 → front 가 0→2 로 이동, 인덱스 0·1 이 비지만 회수 불가(선형 큐).
//  3) ENQUEUE 시도 → rear 가 이미 끝(5). 앞쪽이 비어도 삽입 실패 = 가짜 오버플로.
const LINEAR_ENQUEUE_VALUES = [30, 40, 50, 60]; // rear 1→5 까지 채움

function buildLinearSteps(seed: number[], maxSize: number): LinearStep[] {
  const steps: LinearStep[] = [];
  const items: (number | null)[] = Array.from({ length: maxSize }, (_, i) => seed[i] ?? null);
  let front = 0;
  let rear = seed.length - 1; // 마지막 채워진 인덱스

  const snapshot = (
    action: LinearStep["action"],
    msg: string,
    falseOverflow = false
  ): LinearStep => ({
    items: [...items],
    front,
    rear,
    action,
    maxSize,
    msg,
    falseOverflow,
  });

  steps.push(snapshot({ type: "IDLE" }, `초기 선형 큐: Front=${front}, Rear=${rear}. 배열 끝 인덱스=${maxSize - 1}.`));

  // 1) rear 를 배열 끝까지 ENQUEUE
  for (const val of LINEAR_ENQUEUE_VALUES) {
    const newRear = rear + 1;
    if (newRear >= maxSize) {
      // 이 시나리오에선 도달하지 않지만 안전 처리
      steps.push(snapshot({ type: "ERROR" }, `[오버플로] Rear 가 배열 끝(${maxSize - 1})에 도달. 삽입 불가.`, front > 0));
      continue;
    }
    items[newRear] = val;
    rear = newRear;
    steps.push(snapshot({ type: "ENQUEUE", val, index: newRear }, `[ENQUEUE] index ${newRear} 에 ${val} 삽입. Rear → ${newRear}.`));
  }

  // 2) DEQUEUE 두 번 → front 이동, 앞쪽 슬롯 낭비
  for (let k = 0; k < 2; k++) {
    const val = items[front];
    items[front] = null;
    const oldFront = front;
    front = front + 1;
    steps.push(snapshot(
      { type: "DEQUEUE", val: val ?? undefined, index: oldFront },
      `[DEQUEUE] index ${oldFront} 의 ${val} 제거. Front → ${front}. (index ${oldFront} 는 다시 못 씀)`
    ));
  }

  // 3) 가짜 오버플로: 앞쪽 비었는데 rear 가 끝 → ENQUEUE 실패
  steps.push(snapshot(
    { type: "ERROR" },
    `[가짜 오버플로] index 0·1 이 비었지만 Rear=${rear}(배열 끝)라 ENQUEUE 실패! 공간이 남아도 못 넣는 선형 큐의 한계.`,
    true
  ));

  // PEEK 으로 마무리 (현재 front 데이터 확인)
  if (items[front] !== null && items[front] !== undefined) {
    steps.push(snapshot(
      { type: "PEEK", val: items[front] ?? undefined, index: front },
      `[PEEK] Front(index ${front}) 데이터 = ${items[front]}. → 해결책은 원형 큐(Circular Queue).`
    ));
  }

  return steps;
}

export function useLinearQueueSim(seed: number[] = DEFAULT_LINEAR_SEED) {
  const [steps, setSteps] = useState<LinearStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 배열 기반 선형 큐(Linear Queue)",
    "> ▶︎ 또는 Push 버튼으로 진행 — 가짜 오버플로(False Overflow)를 자동 시연합니다.",
  ]);

  useEffect(() => {
    const generated = buildLinearSteps(seed, MAX_SIZE);
    setSteps(generated);
    setStepIdx(0);
    setLogs([
      "> 시스템 초기화: 배열 기반 선형 큐(Linear Queue)",
      "> ▶︎ 또는 Push 버튼으로 진행 — 가짜 오버플로(False Overflow)를 자동 시연합니다.",
    ]);
  }, [seed]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    const base = ["> 시스템 초기화: 배열 기반 선형 큐(Linear Queue)"];
    const collected: string[] = [];
    for (let i = 1; i <= newStep; i++) {
      collected.unshift(`> [Step ${i}] ${steps[i].msg}`);
    }
    setLogs([...collected, ...base]);
  }, [steps]);

  const nextStep = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= steps.length - 1 ? prev : prev + 1;
      if (next !== prev) handleSetStep(next);
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
      reset,
    },
  };
}

export function LinearQueueVisualizer({ data }: { data: LinearStep | null }) {
  if (!data) return null;
  const { items, front, rear, action, maxSize, falseOverflow } = data;
  const isError = action.type === "ERROR";

  const VB_W = 800;
  const VB_H = 500;
  const centerY = 240;
  const slotWidth = 80;
  const slotHeight = 80;
  const gap = 12;
  const totalWidth = maxSize * slotWidth + (maxSize - 1) * gap;
  const startX = VB_W / 2 - totalWidth / 2 + slotWidth / 2;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.gridLine} strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-destructive" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={VB_W} height={VB_H} fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="hsl(24 95% 53%)" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-orange)">선형 큐 (Linear Queue)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">배열 기반 고정 크기 구조 (Array-Based Fixed Structure)</text>

      {/* Container Background Base */}
      <motion.rect
        x={startX - slotWidth / 2 - 15}
        y={centerY - slotHeight / 2 - 15}
        width={totalWidth + 30}
        height={slotHeight + 30}
        fill={isError ? colorTokens.errorGhost : "hsl(var(--card))"}
        opacity={0.5}
        rx="12"
        stroke={isError ? "hsl(0 84% 60%)" : "hsl(var(--border))"}
        strokeWidth="2"
        animate={{ stroke: isError ? "hsl(0 84% 60%)" : "hsl(var(--border))" }}
        transition={{ duration: 0.2 }}
      />

      {/* Action Indicator Text */}
      <AnimatePresence>
        {action.type !== "IDLE" && (
          <motion.text
            key={`action-${action.type}-${action.val ?? "x"}`}
            initial={{ opacity: 0, y: centerY + slotHeight / 2 + 80 }}
            animate={{ opacity: 1, y: centerY + slotHeight / 2 + 60 }}
            exit={{ opacity: 0, y: centerY + slotHeight / 2 + 50 }}
            x={VB_W / 2}
            y={centerY + slotHeight / 2 + 60}
            textAnchor="middle"
            fill={action.type === "ENQUEUE" ? "hsl(160 84% 39%)" : action.type === "DEQUEUE" ? "hsl(0 84% 60%)" : action.type === "PEEK" ? "hsl(271 91% 65%)" : "hsl(0 84% 60%)"}
            fontSize="18"
            fontWeight="bold"
            letterSpacing="2"
            filter={action.type === "ENQUEUE" ? "url(#neon-glow-emerald)" : action.type === "DEQUEUE" ? "url(#neon-glow-destructive)" : undefined}
          >
            {action.type === "ERROR" ? (falseOverflow ? "가짜 오버플로 (FALSE OVERFLOW)" : "연산 실패") : `${action.type} ${action.val !== undefined ? `(${action.val})` : ""}`}
          </motion.text>
        )}
      </AnimatePresence>

      {/* False overflow warning banner */}
      <AnimatePresence>
        {falseOverflow && (
          <motion.g
            key="false-overflow-banner"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <rect x="170" y="372" width="460" height="34" fill={colorTokens.warningDim} stroke={colorTokens.warningEdgeSubtle} rx="8" />
            <text x={VB_W / 2} y="394" fill="hsl(24 95% 53%)" fontSize="13" fontWeight="bold" textAnchor="middle">
              WARNING: 앞쪽 슬롯이 비었지만 Rear 가 끝에 닿아 삽입 실패 (가짜 오버플로)
            </text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Array Slots & Items */}
      <AnimatePresence>
        {items.map((val, i) => {
          const xPos = startX + i * (slotWidth + gap);
          const isFront = i === front && val !== null;
          const isRear = i === rear && val !== null;
          const isEmpty = val === null;
          const isWasted = i < front; // dequeue 로 비워진 회수 불가 슬롯
          const isActivelyDequeuing = action.type === "DEQUEUE" && action.index === i;
          const isActivelyEnqueuing = action.type === "ENQUEUE" && action.index === i;
          // 가짜 오버플로 시점에 "끝(rear)" 칸을 강조
          const highlightWasted = isWasted && falseOverflow;

          return (
            <motion.g
              key={`item-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.rect
                x={xPos - slotWidth / 2}
                y={centerY - slotHeight / 2}
                width={slotWidth}
                height={slotHeight}
                rx="8"
                fill={isActivelyDequeuing ? colorTokens.errorSoft : (isActivelyEnqueuing ? colorTokens.successSoft : (isWasted ? colorTokens.wastedSlot : "hsl(var(--card))"))}
                stroke={isActivelyDequeuing ? "hsl(0 84% 60%)" : (isActivelyEnqueuing ? "hsl(160 84% 39%)" : (highlightWasted ? "hsl(24 95% 53%)" : (isEmpty && !isWasted ? "hsl(var(--border))" : (isWasted ? "hsl(var(--border))" : "hsl(189 94% 43%)"))))}
                strokeWidth={isActivelyDequeuing || isActivelyEnqueuing || highlightWasted ? "3" : "2"}
                strokeDasharray={(isEmpty && !isWasted) || isWasted ? "4 4" : "0"}
                filter={isActivelyDequeuing ? "url(#neon-glow-destructive)" : (isActivelyEnqueuing ? "url(#neon-glow-emerald)" : (highlightWasted ? "url(#neon-glow-orange)" : undefined))}
              />
              <motion.text
                x={xPos}
                y={centerY + 6}
                fill={isActivelyDequeuing ? "hsl(0 84% 60%)" : (isWasted ? "hsl(24 95% 53%)" : (isEmpty ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))"))}
                fontSize="20"
                fontWeight="bold"
                textAnchor="middle"
              >
                {val !== null ? val : (isWasted ? "✗" : "—")}
              </motion.text>
              <text x={xPos} y={centerY + slotHeight / 2 + 20} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">[{i}]</text>

              {/* Pointers Top Label */}
              <AnimatePresence>
                {isFront && !isRear && (
                  <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <path d={`M ${xPos} ${centerY - slotHeight / 2 - 5} L ${xPos - 5} ${centerY - slotHeight / 2 - 15} L ${xPos + 5} ${centerY - slotHeight / 2 - 15} Z`} fill="hsl(0 84% 60%)" />
                    <text x={xPos} y={centerY - slotHeight / 2 - 25} fill="hsl(0 84% 60%)" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-destructive)">F</text>
                  </motion.g>
                )}
                {isRear && !isFront && (
                  <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <path d={`M ${xPos} ${centerY - slotHeight / 2 - 5} L ${xPos - 5} ${centerY - slotHeight / 2 - 15} L ${xPos + 5} ${centerY - slotHeight / 2 - 15} Z`} fill="hsl(160 84% 39%)" />
                    <text x={xPos} y={centerY - slotHeight / 2 - 25} fill="hsl(160 84% 39%)" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-emerald)">R</text>
                  </motion.g>
                )}
                {isFront && isRear && (
                  <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <path d={`M ${xPos} ${centerY - slotHeight / 2 - 5} L ${xPos - 5} ${centerY - slotHeight / 2 - 15} L ${xPos + 5} ${centerY - slotHeight / 2 - 15} Z`} fill="hsl(38 92% 50%)" />
                    <text x={xPos} y={centerY - slotHeight / 2 - 25} fill="hsl(38 92% 50%)" fontSize="12" fontWeight="bold" textAnchor="middle">F=R</text>
                  </motion.g>
                )}
              </AnimatePresence>
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Step narration (bottom) */}
      <text x="40" y={VB_H - 14} fill="hsl(var(--muted-foreground))" fontSize="12">{data.msg}</text>

      {/* Info Panel on bottom right */}
      <g transform="translate(600, 420)">
        <rect x="0" y="0" width="160" height="60" fill="hsl(var(--card))" opacity="0.6" stroke="hsl(var(--border))" rx="8" />
        <text x="15" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">Front:</text>
        <text x="55" y="25" fill="hsl(0 84% 60%)" fontSize="12" fontWeight="bold" filter="url(#neon-glow-destructive)">{front}</text>
        <text x="15" y="45" fill="hsl(var(--muted-foreground))" fontSize="11">Rear:</text>
        <text x="55" y="45" fill="hsl(160 84% 39%)" fontSize="12" fontWeight="bold" filter="url(#neon-glow-emerald)">{rear}</text>
        <text x="90" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">최대:</text>
        <text x="130" y="25" fill="hsl(var(--foreground))" fontSize="11">{maxSize}</text>
      </g>
    </svg>
  );
}
