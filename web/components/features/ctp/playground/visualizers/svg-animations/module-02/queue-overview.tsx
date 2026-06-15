"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// ── Step model ───────────────────────────────────────────────────────────────
type QueueActionType = "IDLE" | "ENQUEUE" | "DEQUEUE" | "PEEK" | "ERROR";
type QueueStep = {
  queue: number[];
  action: { type: QueueActionType; val?: number; index?: number };
  maxSize: number;
  msg: string;
};

const DEFAULT_QUEUE_SEED = [10, 20, 30];
const QUEUE_MAX = 6;
const QUEUE_ENQUEUE_VALUES = [40, 55, 70, 12];

// FIFO 시나리오: 후단 ENQUEUE 로 채워 오버플로 → 전단 PEEK → 전단 DEQUEUE 로 비워
// "넣은 순서 == 나가는 순서" 를 명확히 보여줌 → 빈 큐 DEQUEUE 언더플로 시연.
function buildQueueSteps(seed: number[], enqueueValues: number[], maxSize: number): QueueStep[] {
  const steps: QueueStep[] = [];
  let queue = [...seed].slice(0, maxSize);

  steps.push({
    queue: [...queue],
    action: { type: "IDLE" },
    maxSize,
    msg: `초기 큐 [front → rear]: [${queue.join(", ")}] (크기 ${queue.length}/${maxSize})`,
  });

  for (const val of enqueueValues) {
    if (queue.length >= maxSize) {
      steps.push({
        queue: [...queue],
        action: { type: "ERROR" },
        maxSize,
        msg: `[오버플로] 큐가 가득 차(${maxSize}/${maxSize}) ${val} 을(를) ENQUEUE 할 수 없습니다.`,
      });
      continue;
    }
    const index = queue.length;
    queue = [...queue, val];
    steps.push({
      queue: [...queue],
      action: { type: "ENQUEUE", val, index },
      maxSize,
      msg: `[ENQUEUE] 후단(rear)에 ${val} 추가 → index ${index}. 입력은 항상 rear 에서. 크기 ${queue.length}/${maxSize}`,
    });
  }

  if (queue.length > 0) {
    steps.push({
      queue: [...queue],
      action: { type: "PEEK", val: queue[0], index: 0 },
      maxSize,
      msg: `[PEEK] 제거 없이 front 확인 → ${queue[0]} (다음에 나갈 데이터)`,
    });
  }

  while (queue.length > 0) {
    const val = queue[0];
    steps.push({
      queue: [...queue],
      action: { type: "DEQUEUE", val, index: 0 },
      maxSize,
      msg: `[DEQUEUE] 전단(front)에서 ${val} 제거. 먼저 들어온 값이 먼저 나가는 FIFO. 크기 ${queue.length - 1}/${maxSize}`,
    });
    queue = queue.slice(1);
  }

  steps.push({
    queue: [],
    action: { type: "ERROR" },
    maxSize,
    msg: `[언더플로] 빈 큐에서 DEQUEUE 시도 → 실패. isEmpty() 검사가 필요한 이유.`,
  });

  return steps;
}

export function useQueueOverviewSim(seed: number[] = DEFAULT_QUEUE_SEED) {
  const [steps, setSteps] = useState<QueueStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 큐(Queue) · FIFO (선입선출)",
    "> ▶︎ 또는 Push 버튼으로 ENQUEUE → DEQUEUE 흐름을 한 스텝씩 진행하세요.",
  ]);

  useEffect(() => {
    const generated = buildQueueSteps(seed, QUEUE_ENQUEUE_VALUES, QUEUE_MAX);
    setSteps(generated);
    setStepIdx(0);
    setLogs([
      "> 시스템 초기화: 큐(Queue) · FIFO (선입선출)",
      "> ▶︎ 또는 Push 버튼으로 ENQUEUE → DEQUEUE 흐름을 한 스텝씩 진행하세요.",
    ]);
  }, [seed]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    const base = ["> 시스템 초기화: 큐(Queue) · FIFO (선입선출)"];
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
        push: nextStep, // ▶︎ 자동재생 & Push 버튼 = 다음 스텝 전진
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

export function QueueOverviewVisualizer({ data }: { data: QueueStep | null }) {
  if (!data) return null;
  const { queue, action, maxSize } = data;
  const isError = action.type === "ERROR";

  // viewBox 기준 상대 좌표
  const VB_W = 800;
  const VB_H = 500;
  const centerY = 250;
  const slotWidth = 70;
  const slotHeight = 70;
  const gap = 12;
  const totalWidth = maxSize * slotWidth + (maxSize - 1) * gap;
  const startX = VB_W / 2 - totalWidth / 2 + slotWidth / 2;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.gridLine} strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-destructive" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={VB_W} height={VB_H} fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="hsl(160 84% 39%)" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-emerald)">FIFO 큐 (Queue)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">First-In, First-Out (선입선출) 데이터 파이프라인</text>

      {/* Container Pipeline (The "Pipe") */}
      <motion.path
        d={`M ${startX - slotWidth / 2 - 20} ${centerY - slotHeight / 2 - 20} L ${startX + totalWidth - slotWidth / 2 + 20} ${centerY - slotHeight / 2 - 20}`}
        fill="none"
        stroke={isError ? "hsl(0 84% 60%)" : "hsl(var(--border))"}
        strokeWidth="4"
        strokeLinecap="round"
        animate={{ stroke: isError ? "hsl(0 84% 60%)" : "hsl(var(--border))" }}
        transition={{ duration: 0.2 }}
      />
      <motion.path
        d={`M ${startX - slotWidth / 2 - 20} ${centerY + slotHeight / 2 + 20} L ${startX + totalWidth - slotWidth / 2 + 20} ${centerY + slotHeight / 2 + 20}`}
        fill="none"
        stroke={isError ? "hsl(0 84% 60%)" : "hsl(var(--border))"}
        strokeWidth="4"
        strokeLinecap="round"
        animate={{ stroke: isError ? "hsl(0 84% 60%)" : "hsl(var(--border))" }}
        transition={{ duration: 0.2 }}
      />
      <motion.rect
        x={startX - slotWidth / 2 - 20}
        y={centerY - slotHeight / 2 - 20}
        width={totalWidth + 40}
        height={slotHeight + 40}
        fill={isError ? colorTokens.errorGhost : colorTokens.successFaint}
        animate={{ fill: isError ? colorTokens.errorGhost : colorTokens.successFaint }}
      />

      {/* Direction Flow Arrows */}
      <g opacity="0.4">
        <path d={`M ${startX - slotWidth / 2 - 60} ${centerY} L ${startX - slotWidth / 2 - 30} ${centerY}`} stroke="hsl(0 84% 60%)" strokeWidth="2" strokeDasharray="4 4" />
        <path d={`M ${startX - slotWidth / 2 - 35} ${centerY - 5} L ${startX - slotWidth / 2 - 30} ${centerY} L ${startX - slotWidth / 2 - 35} ${centerY + 5}`} fill="none" stroke="hsl(0 84% 60%)" strokeWidth="2" />

        <path d={`M ${startX + totalWidth - slotWidth / 2 + 30} ${centerY} L ${startX + totalWidth - slotWidth / 2 + 60} ${centerY}`} stroke="hsl(160 84% 39%)" strokeWidth="2" strokeDasharray="4 4" />
        <path d={`M ${startX + totalWidth - slotWidth / 2 + 55} ${centerY - 5} L ${startX + totalWidth - slotWidth / 2 + 60} ${centerY} L ${startX + totalWidth - slotWidth / 2 + 55} ${centerY + 5}`} fill="none" stroke="hsl(160 84% 39%)" strokeWidth="2" />
      </g>

      {/* Front and Rear Labels */}
      <text x={startX - slotWidth / 2 - 10} y={centerY - slotHeight / 2 - 30} fill="hsl(0 84% 60%)" fontSize="12" fontWeight="bold" letterSpacing="2" textAnchor="end" filter="url(#neon-glow-destructive)">[전단/FRONT] DEQUEUE &lt;&lt;</text>
      <text x={startX + totalWidth - slotWidth / 2 + 10} y={centerY - slotHeight / 2 - 30} fill="hsl(160 84% 39%)" fontSize="12" fontWeight="bold" letterSpacing="2" textAnchor="start" filter="url(#neon-glow-emerald)">&lt;&lt; ENQUEUE [후단/REAR]</text>

      {/* Action Indicator Text */}
      <AnimatePresence>
        {action.type !== "IDLE" && (
          <motion.text
            key={`action-${action.type}-${action.val ?? "x"}`}
            initial={{ opacity: 0, y: centerY + slotHeight / 2 + 60 }}
            animate={{ opacity: 1, y: centerY + slotHeight / 2 + 40 }}
            exit={{ opacity: 0 }}
            x={VB_W / 2}
            y={centerY + slotHeight / 2 + 40}
            textAnchor="middle"
            fill={action.type === "ENQUEUE" ? "hsl(160 84% 39%)" : action.type === "DEQUEUE" ? "hsl(0 84% 60%)" : action.type === "PEEK" ? "hsl(271 91% 65%)" : "hsl(0 84% 60%)"}
            fontSize="18"
            fontWeight="bold"
            letterSpacing="2"
            filter={action.type === "ENQUEUE" ? "url(#neon-glow-emerald)" : action.type === "DEQUEUE" ? "url(#neon-glow-destructive)" : undefined}
          >
            {action.type === "ERROR" ? "연산 실패" : `${action.type} ${action.val !== undefined ? `(${action.val})` : ""}`}
          </motion.text>
        )}
      </AnimatePresence>

      {/* Empty Slots Guidelines */}
      {Array.from({ length: maxSize }).map((_, i) => {
        const xPos = startX + i * (slotWidth + gap);
        return (
          <g key={`empty-${i}`}>
            <rect x={xPos - slotWidth / 2} y={centerY - slotHeight / 2} width={slotWidth} height={slotHeight} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" rx="6" />
            <text x={xPos} y={centerY + slotHeight / 2 + 16} fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="middle">[{i}]</text>
          </g>
        );
      })}

      {/* Queue Items */}
      <AnimatePresence>
        {queue.map((val, i) => {
          const xPos = startX + i * (slotWidth + gap);
          const isFront = i === 0;
          const isRear = i === queue.length - 1;
          const isActivelyDequeuing = action.type === "DEQUEUE" && action.index === i;
          const isActivelyEnqueuing = action.type === "ENQUEUE" && action.index === i;
          const isPeeking = action.type === "PEEK" && action.index === i;
          const initialX = isActivelyEnqueuing ? xPos + 100 : xPos;

          return (
            <motion.g
              key={`item-${val}-${i}`}
              initial={{ opacity: 0, x: initialX, y: centerY, scale: 0.9 }}
              animate={{ opacity: 1, x: xPos, y: centerY, scale: isPeeking ? 1.06 : 1 }}
              exit={{ opacity: 0, x: xPos - 100, y: centerY, scale: 1.1, filter: "blur(4px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.rect
                x={-slotWidth / 2}
                y={-slotHeight / 2}
                width={slotWidth}
                height={slotHeight}
                rx="8"
                fill={isActivelyDequeuing ? colorTokens.errorSoft : (isActivelyEnqueuing ? colorTokens.successSoft : (isPeeking ? colorTokens.primaryHighlightSoft : "hsl(var(--muted))"))}
                stroke={isActivelyDequeuing ? "hsl(0 84% 60%)" : (isPeeking ? "hsl(271 91% 65%)" : (isFront ? "hsl(0 84% 60%)" : (isRear ? "hsl(160 84% 39%)" : "hsl(var(--border))")))}
                strokeWidth="2"
                filter={isActivelyDequeuing ? "url(#neon-glow-destructive)" : (isActivelyEnqueuing ? "url(#neon-glow-emerald)" : undefined)}
              />
              <motion.text
                x={0}
                y={6}
                fill={isActivelyDequeuing ? "hsl(0 84% 60%)" : (isFront ? "hsl(0 84% 60%)" : (isRear ? "hsl(160 84% 39%)" : "hsl(var(--foreground))"))}
                fontSize="18"
                fontWeight="bold"
                textAnchor="middle"
              >
                {val}
              </motion.text>
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Step narration (bottom) */}
      <text x="40" y={VB_H - 18} fill="hsl(var(--muted-foreground))" fontSize="13">{data.msg}</text>

      {/* Info Panel on bottom */}
      <g transform="translate(60, 400)">
        <rect x="0" y="0" width="200" height="60" fill="hsl(var(--muted))" opacity="0.5" stroke="hsl(var(--border))" rx="8" />
        <text x="15" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">최대 용량: {maxSize}</text>
        <text x="15" y="45" fill="hsl(var(--muted-foreground))" fontSize="11">현재 크기: <tspan fill="hsl(160 84% 39%)" fontWeight="bold">{queue.length}</tspan></text>

        <rect x="110" y="38" width="70" height="6" fill="hsl(var(--muted-foreground))" opacity="0.3" rx="3" />
        <motion.rect
          x="110"
          y="38"
          height="6"
          fill="hsl(160 84% 39%)"
          rx="3"
          filter="url(#neon-glow-emerald)"
          animate={{ width: 70 * (queue.length / maxSize) }}
          transition={{ type: "spring", stiffness: 100 }}
        />
      </g>
    </svg>
  );
}
