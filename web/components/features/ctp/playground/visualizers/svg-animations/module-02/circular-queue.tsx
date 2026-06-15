"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

const CAPACITY = 6;

// ── Step model ───────────────────────────────────────────────────────────────
type CircularActionType = "IDLE" | "ENQUEUE" | "DEQUEUE" | "PEEK" | "ERROR";
type CircularStep = {
  items: (number | null)[];
  front: number;
  rear: number;
  size: number;
  action: { type: CircularActionType; val?: number; index?: number };
  capacity: number;
  msg: string;
  formula: string; // 화면에 표시할 모듈러 불변식 수치 (rear=(rear+1)%cap=...)
};

const DEFAULT_CIRCULAR_SEED = [10, 20];
// 시나리오 (capacity=6, seed=[10,20] → front=0,rear=1):
//   1) ENQUEUE 30,40,50,60 → rear 1→5, size 6 (FULL)
//   2) DEQUEUE ×2          → front 0→2, index 0·1 비움 (size 4)
//   3) ENQUEUE 70,80       → newRear=(5+1)%6=0, (0+1)%6=1 → wrap! 비워진 0·1번 재사용
// 이로써 rear 가 capacity-1 을 넘겨 0 으로 되돌아오는 wrap-around 가 실제로 발생한다.
const CIRCULAR_FILL_VALUES = [30, 40, 50, 60];
const CIRCULAR_WRAP_VALUES = [70, 80];

function buildCircularSteps(seed: number[], capacity: number): CircularStep[] {
  const steps: CircularStep[] = [];
  const items: (number | null)[] = Array.from({ length: capacity }, (_, i) => seed[i] ?? null);
  let front = 0;
  let rear = seed.length - 1;
  let size = seed.length;

  const snapshot = (action: CircularStep["action"], msg: string, formula: string): CircularStep => ({
    items: [...items],
    front,
    rear,
    size,
    action,
    capacity,
    msg,
    formula,
  });

  const enqueue = (val: number) => {
    if (size >= capacity) {
      steps.push(snapshot(
        { type: "ERROR" },
        `[오버플로] 링 버퍼가 가득 참(${size}/${capacity}). ${val} 삽입 불가.`,
        `size(${size}) == capacity(${capacity}) → FULL`
      ));
      return;
    }
    const newRear = (rear + 1) % capacity;
    const formula = `rear = (${rear} + 1) % ${capacity} = ${newRear}`;
    items[newRear] = val;
    const wrapped = newRear < rear; // 끝 → 0 으로 되돌아옴
    rear = newRear;
    size += 1;
    steps.push(snapshot(
      { type: "ENQUEUE", val, index: newRear },
      `[ENQUEUE] ${formula}. index ${newRear} 에 ${val} 저장${wrapped ? " (← wrap! 끝에서 0번으로 순환, 비워진 칸 재사용)" : ""}. 크기 ${size}/${capacity}`,
      formula
    ));
  };

  const dequeue = () => {
    if (size === 0) return;
    const val = items[front];
    items[front] = null;
    const newFront = (front + 1) % capacity;
    const formula = `front = (${front} + 1) % ${capacity} = ${newFront}`;
    const oldFront = front;
    front = newFront;
    size -= 1;
    steps.push(snapshot(
      { type: "DEQUEUE", val: val ?? undefined, index: oldFront },
      `[DEQUEUE] ${formula}. index ${oldFront} 의 ${val} 제거 → 그 칸은 재사용 가능. 크기 ${size}/${capacity}`,
      formula
    ));
  };

  steps.push(snapshot(
    { type: "IDLE" },
    `초기 링 버퍼: Front=${front}, Rear=${rear}, 크기=${size}/${capacity}.`,
    `rear = (rear + 1) % ${capacity}`
  ));

  // 1) ENQUEUE 로 끝까지 채워 FULL 도달 (rear 1→5)
  for (const val of CIRCULAR_FILL_VALUES) enqueue(val);

  // 2) DEQUEUE ×2 로 앞쪽 index 0·1 을 비워 재사용 가능 칸 확보 (front 0→2)
  dequeue();
  dequeue();

  // 3) ENQUEUE 로 wrap-around 발생: newRear=(5+1)%6=0, (0+1)%6=1 → 비워진 0·1번 재사용
  for (const val of CIRCULAR_WRAP_VALUES) enqueue(val);

  // PEEK 마무리
  if (size > 0) {
    steps.push(snapshot(
      { type: "PEEK", val: items[front] ?? undefined, index: front },
      `[PEEK] Front(index ${front}) = ${items[front]}, Rear=${rear}. 선형 큐와 달리 빈 앞 칸을 모듈로로 자동 재활용.`,
      `front = ${front}, rear = ${rear}, size = ${size}`
    ));
  }

  return steps;
}

export function useCircularQueueSim(seed: number[] = DEFAULT_CIRCULAR_SEED) {
  const [steps, setSteps] = useState<CircularStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 원형 큐(Circular Ring Buffer)",
    "> ▶︎ 또는 Push 버튼으로 진행 — (rear+1)%capacity 모듈러 회전을 수치로 확인하세요.",
  ]);

  useEffect(() => {
    const generated = buildCircularSteps(seed, CAPACITY);
    setSteps(generated);
    setStepIdx(0);
    setLogs([
      "> 시스템 초기화: 원형 큐(Circular Ring Buffer)",
      "> ▶︎ 또는 Push 버튼으로 진행 — (rear+1)%capacity 모듈러 회전을 수치로 확인하세요.",
    ]);
  }, [seed]);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    const base = ["> 시스템 초기화: 원형 큐(Circular Ring Buffer)"];
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

export function CircularQueueVisualizer({ data }: { data: CircularStep | null }) {
  if (!data) return null;
  const { items, front, rear, size, action, capacity, formula } = data;
  const isError = action.type === "ERROR";

  const VB_W = 800;
  const VB_H = 500;
  const cx = VB_W / 2;
  const cy = 250;
  const r = 130;
  const angleStep = (2 * Math.PI) / capacity;
  const cellPositions = Array.from({ length: capacity }, (_, i) => {
    const angle = i * angleStep - Math.PI / 2; // top start, clockwise
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), angle };
  });

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
        <filter id="neon-glow-destructive" x="-20%" y="-20%" width="140%" height="140%">
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
        <filter id="neon-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arr-circ" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(271 91% 65%)" />
        </marker>
        <marker id="arr-circ-err" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(0 84% 60%)" />
        </marker>
      </defs>

      {/* Background */}
      <rect width={VB_W} height={VB_H} fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="hsl(271 91% 65%)" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-purple)">원형 큐 (Circular Queue)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">모듈러(%) 연산을 활용한 링 버퍼 (Ring Buffer)</text>

      {/* Action Indicator Text */}
      <AnimatePresence>
        {action.type !== "IDLE" && (
          <motion.text
            key={`action-${action.type}-${action.val ?? "x"}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            x={cx}
            y={cy - 50}
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

      {/* Center size display */}
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">크기 (SIZE)</text>
      <text x={cx} y={cy + 50} textAnchor="middle" fontSize="24" fontWeight="bold" fill="hsl(271 91% 65%)" filter="url(#neon-glow-purple)">{size}/{capacity}</text>

      {/* Inner Circle Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" opacity="0.5" strokeWidth="60" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" />

      {/* Rotation direction arrow */}
      <path
        d={`M ${cx + r + 40},${cy - 25} A ${r + 40} ${r + 40} 0 0 1 ${cx + r + 40},${cy + 25}`}
        fill="none"
        stroke={isError ? "hsl(0 84% 60%)" : "hsl(271 91% 65%)"}
        strokeWidth="2"
        markerEnd={isError ? "url(#arr-circ-err)" : "url(#arr-circ)"}
        opacity="0.8"
      />

      {/* Array Slots & Items */}
      <AnimatePresence>
        {cellPositions.map(({ x, y, angle }, i) => {
          const val = items[i];
          const isFront = i === front && val !== null;
          const isRear = i === rear && val !== null;
          const isEmpty = val === null;
          const isActivelyDequeuing = action.type === "DEQUEUE" && action.index === i;
          const isActivelyEnqueuing = action.type === "ENQUEUE" && action.index === i;

          return (
            <motion.g
              key={`circ-${i}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.circle
                cx={x}
                cy={y}
                r="30"
                fill={isActivelyDequeuing ? colorTokens.errorSoft : (isActivelyEnqueuing ? colorTokens.successSoft : (isEmpty ? "hsl(var(--card))" : "hsl(var(--muted))"))}
                stroke={isActivelyDequeuing ? "hsl(0 84% 60%)" : (isActivelyEnqueuing ? "hsl(160 84% 39%)" : (isEmpty ? "hsl(var(--border))" : "hsl(189 94% 43%)"))}
                strokeWidth={isActivelyDequeuing || isActivelyEnqueuing ? "3" : "2"}
                strokeDasharray={isEmpty ? "4 4" : "0"}
                filter={isActivelyDequeuing ? "url(#neon-glow-destructive)" : (isActivelyEnqueuing ? "url(#neon-glow-emerald)" : (!isEmpty ? "url(#neon-glow-cyan)" : undefined))}
              />
              <motion.text
                x={x}
                y={y + 6}
                fill={isActivelyDequeuing ? "hsl(0 84% 60%)" : (isEmpty ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))")}
                fontSize="18"
                fontWeight="bold"
                textAnchor="middle"
              >
                {val !== null ? val : "·"}
              </motion.text>

              {/* Index Outline Label */}
              <text
                x={cx + (r + 75) * Math.cos(angle)}
                y={cy + (r + 75) * Math.sin(angle) + 4}
                fill="hsl(var(--muted-foreground))"
                fontSize="12"
                textAnchor="middle"
              >
                [{i}]
              </text>

              {/* Pointers */}
              <AnimatePresence>
                {isFront && !isRear && (
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <text x={cx + (r + 30) * Math.cos(angle)} y={cy + (r + 30) * Math.sin(angle) + 4} fill="hsl(0 84% 60%)" fontSize="13" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-destructive)">F</text>
                  </motion.g>
                )}
                {isRear && !isFront && (
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <text x={cx + (r + 30) * Math.cos(angle)} y={cy + (r + 30) * Math.sin(angle) + 4} fill="hsl(160 84% 39%)" fontSize="13" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-emerald)">R</text>
                  </motion.g>
                )}
                {isFront && isRear && (
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <text x={cx + (r + 30) * Math.cos(angle)} y={cy + (r + 30) * Math.sin(angle) + 4} fill="hsl(38 92% 50%)" fontSize="13" fontWeight="bold" textAnchor="middle">F=R</text>
                  </motion.g>
                )}
              </AnimatePresence>
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Modulo invariant panel — 현재 스텝의 수치 계산을 그대로 노출 */}
      <g transform="translate(40, 380)">
        <rect x="0" y="0" width="300" height="80" fill="hsl(var(--card))" opacity="0.7" stroke={isError ? "hsl(0 84% 60%)" : "hsl(271 91% 65%)"} strokeWidth="1.5" rx="8" />
        <text x="15" y="24" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="bold" letterSpacing="1">모듈러 불변식 (MODULO INVARIANT)</text>
        <rect x="15" y="34" width="270" height="30" fill="hsl(var(--muted))" rx="4" />
        <motion.text
          key={`formula-${formula}`}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          x="28"
          y="54"
          fill="hsl(271 91% 65%)"
          fontSize="13"
          fontWeight="bold"
          fontFamily="monospace"
          filter="url(#neon-glow-purple)"
        >
          {formula}
        </motion.text>
      </g>

      {/* Front/Rear/Size panel */}
      <g transform="translate(600, 390)">
        <rect x="0" y="0" width="160" height="70" fill="hsl(var(--card))" opacity="0.7" stroke="hsl(var(--border))" rx="8" />
        <text x="15" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">Front:</text>
        <text x="55" y="25" fill="hsl(0 84% 60%)" fontSize="12" fontWeight="bold" filter="url(#neon-glow-destructive)">{front}</text>
        <text x="15" y="45" fill="hsl(var(--muted-foreground))" fontSize="11">Rear:</text>
        <text x="55" y="45" fill="hsl(160 84% 39%)" fontSize="12" fontWeight="bold" filter="url(#neon-glow-emerald)">{rear}</text>
        <text x="90" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">용량:</text>
        <text x="130" y="25" fill="hsl(var(--foreground))" fontSize="11">{capacity}</text>
        <text x="90" y="45" fill="hsl(var(--muted-foreground))" fontSize="11">크기:</text>
        <text x="130" y="45" fill="hsl(271 91% 65%)" fontSize="11" fontWeight="bold">{size}</text>
      </g>

      {/* Step narration (very bottom) */}
      <text x="40" y={VB_H - 8} fill="hsl(var(--muted-foreground))" fontSize="11">{data.msg}</text>
    </svg>
  );
}
