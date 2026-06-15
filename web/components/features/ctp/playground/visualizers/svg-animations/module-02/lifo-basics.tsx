"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// ── Step model ───────────────────────────────────────────────────────────────
// 각 연산을 하나의 "스텝"으로 미리 스크립트화한다. 이렇게 해야 슬라이더로 임의
// 스텝에 점프하고(▶︎ 자동재생은 handlers.push 가 다음 스텝으로 전진) 재현 가능.
type LifoActionType = "IDLE" | "PUSH" | "POP" | "PEEK" | "ERROR";
type LifoStep = {
  stack: number[];
  action: { type: LifoActionType; val?: number; index?: number };
  maxSize: number;
  msg: string;
};

const DEFAULT_LIFO_SEED = [10, 20, 30];
const LIFO_MAX = 6;
// 시드 기반 시나리오: PUSH 로 가득 채워 오버플로까지 → PEEK → 연속 POP 으로 비움 →
// 빈 스택 POP 언더플로 시연. (random 하드코딩 제거: 결정적 값 사용)
const LIFO_PUSH_VALUES = [42, 17, 88, 9];

function buildLifoSteps(seed: number[], pushValues: number[], maxSize: number): LifoStep[] {
  const steps: LifoStep[] = [];
  let stack = [...seed].slice(0, maxSize);

  steps.push({
    stack: [...stack],
    action: { type: "IDLE" },
    maxSize,
    msg: `초기 스택: [${stack.join(", ")}] (크기 ${stack.length}/${maxSize})`,
  });

  // PUSH 시퀀스 (오버플로 시연 포함)
  for (const val of pushValues) {
    if (stack.length >= maxSize) {
      steps.push({
        stack: [...stack],
        action: { type: "ERROR" },
        maxSize,
        msg: `[오버플로] 스택이 가득 차(${maxSize}/${maxSize}) ${val} 을(를) PUSH 할 수 없습니다.`,
      });
      continue;
    }
    const index = stack.length;
    stack = [...stack, val];
    steps.push({
      stack: [...stack],
      action: { type: "PUSH", val, index },
      maxSize,
      msg: `[PUSH] ${val} → top(index ${index}). 크기 ${stack.length}/${maxSize}`,
    });
  }

  // PEEK: 변화 없이 top 확인
  if (stack.length > 0) {
    steps.push({
      stack: [...stack],
      action: { type: "PEEK", val: stack[stack.length - 1], index: stack.length - 1 },
      maxSize,
      msg: `[PEEK] 제거 없이 top 확인 → ${stack[stack.length - 1]}`,
    });
  }

  // POP 으로 전부 비우기 → 마지막에 언더플로 1회 시연
  while (stack.length > 0) {
    const val = stack[stack.length - 1];
    const index = stack.length - 1;
    steps.push({
      stack: [...stack],
      action: { type: "POP", val, index },
      maxSize,
      msg: `[POP] top(${val}) 제거. 입력 역순으로 반환되는 LIFO 불변식. 크기 ${stack.length - 1}/${maxSize}`,
    });
    stack = stack.slice(0, -1);
  }

  steps.push({
    stack: [],
    action: { type: "ERROR" },
    maxSize,
    msg: `[언더플로] 빈 스택에서 POP 시도 → 실패. isEmpty() 검사가 필요한 이유.`,
  });

  return steps;
}

export function useLifoBasicsSim(seed: number[] = DEFAULT_LIFO_SEED) {
  const [steps, setSteps] = useState<LifoStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 스택(Stack) · LIFO (후입선출)",
    "> ▶︎ 또는 Push 버튼으로 시나리오를 한 스텝씩 진행하세요.",
  ]);

  useEffect(() => {
    const generated = buildLifoSteps(seed, LIFO_PUSH_VALUES, LIFO_MAX);
    setSteps(generated);
    setStepIdx(0);
    setLogs([
      "> 시스템 초기화: 스택(Stack) · LIFO (후입선출)",
      "> ▶︎ 또는 Push 버튼으로 시나리오를 한 스텝씩 진행하세요.",
    ]);
  }, [seed]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    const base = [
      "> 시스템 초기화: 스택(Stack) · LIFO (후입선출)",
    ];
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

export function LifoBasicsVisualizer({ data }: { data: LifoStep | null }) {
  if (!data) return null;
  const { stack, action, maxSize } = data;
  const isError = action.type === "ERROR";

  // viewBox 기준 상대 좌표
  const VB_W = 800;
  const VB_H = 500;
  const centerX = VB_W / 2;
  const baseY = 420;
  const slotWidth = 140;
  const slotHeight = 44;
  const gap = 8;
  const stackTopY = baseY - maxSize * (slotHeight + gap) - 10;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.gridLine} strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
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
      <text x="40" y="50" fill="hsl(189 94% 43%)" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-cyan)">LIFO 스택</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">Last-In, First-Out (후입선출) 메모리 구조</text>

      {/* Container Base & Borders (The "Stack" glass case) */}
      <motion.path
        d={`M ${centerX - slotWidth / 2 - 20} ${stackTopY} L ${centerX - slotWidth / 2 - 20} ${baseY + 10} L ${centerX + slotWidth / 2 + 20} ${baseY + 10} L ${centerX + slotWidth / 2 + 20} ${stackTopY}`}
        fill="none"
        stroke={isError ? "hsl(0 84% 60%)" : "hsl(var(--border))"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ stroke: isError ? "hsl(0 84% 60%)" : "hsl(var(--border))" }}
        transition={{ duration: 0.2 }}
      />
      <motion.rect
        x={centerX - slotWidth / 2 - 20}
        y={stackTopY}
        width={slotWidth + 40}
        height={baseY + 10 - stackTopY}
        fill={isError ? colorTokens.errorGhost : colorTokens.infoFaint}
        animate={{ fill: isError ? colorTokens.errorGhost : colorTokens.infoFaint }}
      />

      {/* Action Indicator Text */}
      <AnimatePresence>
        {action.type !== "IDLE" && (
          <motion.text
            key={`action-${action.type}-${action.val ?? "x"}`}
            initial={{ opacity: 0, y: stackTopY - 30 }}
            animate={{ opacity: 1, y: stackTopY - 20 }}
            exit={{ opacity: 0 }}
            x={centerX}
            y={stackTopY - 20}
            textAnchor="middle"
            fill={action.type === "PUSH" ? "hsl(189 94% 43%)" : action.type === "POP" ? "hsl(24 95% 53%)" : action.type === "PEEK" ? "hsl(271 91% 65%)" : "hsl(0 84% 60%)"}
            fontSize="18"
            fontWeight="bold"
            letterSpacing="2"
            filter={action.type === "PUSH" ? "url(#neon-glow-cyan)" : action.type === "POP" ? "url(#neon-glow-orange)" : undefined}
          >
            {action.type === "ERROR" ? "연산 실패" : `${action.type} ${action.val !== undefined ? `(${action.val})` : ""}`}
          </motion.text>
        )}
      </AnimatePresence>

      {/* Empty Slots Guidelines */}
      {Array.from({ length: maxSize }).map((_, i) => {
        const yPos = baseY - i * (slotHeight + gap) - slotHeight;
        return (
          <g key={`empty-${i}`}>
            <rect x={centerX - slotWidth / 2} y={yPos} width={slotWidth} height={slotHeight} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" rx="6" />
            <text x={centerX - slotWidth / 2 - 25} y={yPos + slotHeight / 2 + 4} fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end">[{i}]</text>
          </g>
        );
      })}

      {/* Stack Items */}
      <AnimatePresence>
        {stack.map((val, i) => {
          const yPos = baseY - i * (slotHeight + gap) - slotHeight;
          const isTop = i === stack.length - 1;
          const isActivelyPopping = action.type === "POP" && action.index === i;
          const isActivelyPushing = action.type === "PUSH" && action.index === i;
          const isPeeking = action.type === "PEEK" && action.index === i;

          return (
            <motion.g
              key={`item-${i}-${val}`}
              initial={{ opacity: 0, y: yPos - 50, scale: 0.9 }}
              animate={{ opacity: 1, y: yPos, scale: isPeeking ? 1.04 : 1 }}
              exit={{ opacity: 0, y: yPos - 50, scale: 1.1, filter: "blur(4px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.rect
                x={centerX - slotWidth / 2}
                y={0}
                width={slotWidth}
                height={slotHeight}
                rx="8"
                fill={isActivelyPopping ? colorTokens.warningSoft : isPeeking ? colorTokens.primaryHighlightSoft : (isTop || isActivelyPushing ? colorTokens.infoSoft : "hsl(var(--muted))")}
                stroke={isActivelyPopping ? "hsl(24 95% 53%)" : isPeeking ? "hsl(271 91% 65%)" : (isTop || isActivelyPushing ? "hsl(189 94% 43%)" : "hsl(var(--border))")}
                strokeWidth="2"
                filter={isActivelyPopping ? "url(#neon-glow-orange)" : (isTop ? "url(#neon-glow-cyan)" : undefined)}
              />
              <motion.text
                x={centerX}
                y={slotHeight / 2 + 6}
                fill={isActivelyPopping ? "hsl(24 95% 53%)" : (isTop ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))")}
                fontSize="18"
                fontWeight="bold"
                textAnchor="middle"
              >
                {val}
              </motion.text>

              {isTop && !isActivelyPopping && (
                <motion.g initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <path d={`M ${centerX + slotWidth / 2 + 25} ${slotHeight / 2} L ${centerX + slotWidth / 2 + 10} ${slotHeight / 2 - 5} L ${centerX + slotWidth / 2 + 10} ${slotHeight / 2 + 5} Z`} fill="hsl(189 94% 43%)" />
                  <text x={centerX + slotWidth / 2 + 35} y={slotHeight / 2 + 4} fill="hsl(189 94% 43%)" fontSize="12" fontWeight="bold" letterSpacing="1" filter="url(#neon-glow-cyan)">TOP</text>
                </motion.g>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Step narration (bottom) */}
      <text x="40" y={VB_H - 24} fill="hsl(var(--muted-foreground))" fontSize="13">{data.msg}</text>

      {/* Info Panel on the right */}
      <g transform="translate(580, 200)">
        <rect x="0" y="0" width="180" height="150" fill="hsl(var(--muted))" opacity="0.5" stroke="hsl(var(--border))" rx="8" />
        <text x="15" y="25" fill="hsl(var(--foreground))" fontSize="12" fontWeight="bold">공간 지표 (Space Metrics)</text>
        <line x1="15" y1="35" x2="165" y2="35" stroke="hsl(var(--border))" strokeWidth="1" />

        <text x="15" y="60" fill="hsl(var(--muted-foreground))" fontSize="11">최대 용량:</text>
        <text x="165" y="60" fill="hsl(var(--foreground))" fontSize="11" textAnchor="end">{maxSize}</text>

        <text x="15" y="80" fill="hsl(var(--muted-foreground))" fontSize="11">현재 크기:</text>
        <text x="165" y="80" fill="hsl(189 94% 43%)" fontSize="11" textAnchor="end" fontWeight="bold" filter="url(#neon-glow-cyan)">{stack.length}</text>

        <text x="15" y="100" fill="hsl(var(--muted-foreground))" fontSize="11">남은 공간:</text>
        <text x="165" y="100" fill="hsl(var(--foreground))" fontSize="11" textAnchor="end">{maxSize - stack.length}</text>

        <rect x="15" y="120" width="150" height="6" fill="hsl(var(--muted-foreground))" opacity="0.3" rx="3" />
        <motion.rect
          x="15"
          y="120"
          height="6"
          fill="hsl(189 94% 43%)"
          rx="3"
          filter="url(#neon-glow-cyan)"
          animate={{ width: 150 * (stack.length / maxSize) }}
          transition={{ type: "spring", stiffness: 100 }}
        />
      </g>
    </svg>
  );
}
