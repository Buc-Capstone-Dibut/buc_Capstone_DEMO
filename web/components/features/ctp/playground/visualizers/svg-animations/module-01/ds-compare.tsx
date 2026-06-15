"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// 0 idle, 1 array access O(1), 2 LL access O(N), 3 array insert O(N),
// 4 LL insert O(1), 5 tuple immutability (write rejected)
type Phase = 0 | 1 | 2 | 3 | 4 | 5;
type Step = { phase: Phase; msg: string };

const STEPS: Step[] = [
  { phase: 0, msg: "배열 · 연결 리스트 · 튜플의 핵심 연산 비용을 비교합니다." },
  { phase: 1, msg: "배열 접근: 인덱스로 메모리 오프셋을 직접 계산 → O(1)." },
  { phase: 2, msg: "연결 리스트 접근: HEAD부터 포인터를 따라가야 함 → O(N)." },
  { phase: 3, msg: "배열 삽입: 뒤 원소를 모두 밀어야 함 → O(N)." },
  { phase: 4, msg: "연결 리스트 삽입: 포인터만 재연결 → O(1)." },
  { phase: 5, msg: "튜플: 생성 후 수정 불가(불변). 쓰기 시도는 거부됩니다." },
];

export function useDsCompareSim() {
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>(["> 자료구조 비교 엔진 준비 완료. Step을 눌러 시작하세요."]);
  const maxSteps = STEPS.length;

  const rebuild = useCallback((t: number) => {
    const arr = ["> 자료구조 비교 엔진 준비 완료. Step을 눌러 시작하세요."];
    for (let i = 1; i <= t; i++) arr.unshift(`[Step ${i}] ${STEPS[i].msg}`);
    setLogs(arr);
  }, []);

  const handleSetStep = useCallback((s: number) => {
    if (s < 0 || s >= maxSteps) return;
    setStepIdx(s);
    rebuild(s);
  }, [maxSteps, rebuild]);

  const nextStep = useCallback(() => {
    setStepIdx((p) => {
      const n = p >= maxSteps - 1 ? p : p + 1;
      if (n !== p) rebuild(n);
      return n;
    });
  }, [maxSteps, rebuild]);

  const reset = useCallback(() => handleSetStep(0), [handleSetStep]);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: STEPS[stepIdx],
      logs,
      handlers: { push: nextStep, clear: reset },
      currentStep: stepIdx,
      maxSteps,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

const ARR = [10, 20, 30, 40];
const LL = [10, 20, 30];
const TUP = ["x", "y", "z"];

function CostBadge({ x, y, label, active, color }: { x: number; y: number; label: string; active: boolean; color: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width="92" height="20" rx="10" fill={active ? color : colorTokens.faintFill} opacity={active ? 0.18 : 1} />
      <rect width="92" height="20" rx="10" fill="none" stroke={active ? color : colorTokens.border} strokeWidth="1" />
      <text x="46" y="14" textAnchor="middle" fontSize="10" fontWeight="bold" fill={active ? color : colorTokens.muted}>{label}</text>
    </g>
  );
}

export function DsCompareVisualizer({ data }: { data: Step | null }) {
  const phase = data?.phase ?? 0;
  const cell = 44;
  const gap = 8;

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <filter id="ds-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="ds-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={colorTokens.primaryHighlight} />
        </marker>
      </defs>

      <text x="40" y="36" fontSize="16" fontWeight="bold" fill={colorTokens.info}>자료구조 비교: 배열 · 연결 리스트 · 튜플</text>

      {/* ── Panel 1: Contiguous Array ── */}
      <g transform="translate(40, 70)">
        <rect width="720" height="120" rx="12" fill={colorTokens.card} stroke={colorTokens.border} strokeWidth="1.5" />
        <text x="16" y="26" fontSize="13" fontWeight="bold" fill={colorTokens.info}>Contiguous Array</text>
        <CostBadge x={560} y={12} label="Access O(1)" active={phase === 1} color={colorTokens.info} />
        <CostBadge x={620} y={36} label="Insert O(N)" active={phase === 3} color={colorTokens.destructive} />
        {ARR.map((v, i) => {
          const shifted = phase === 3 && i >= 2;
          const targeted = phase === 1 && i === 1;
          const x = 40 + i * (cell + gap) + (shifted ? cell + gap : 0);
          return (
            <motion.g key={`a-${i}`} initial={false} animate={{ x }} transition={{ type: "spring", stiffness: 240, damping: 22 }}>
              <rect y="54" width={cell} height={cell} rx="6"
                fill={targeted ? colorTokens.infoDim : colorTokens.faintFill}
                stroke={targeted ? colorTokens.info : colorTokens.border} strokeWidth={targeted ? 2.5 : 1} />
              <text x={cell / 2} y={54 + cell / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="bold"
                fill={targeted ? colorTokens.info : colorTokens.text}>{v}</text>
              <text x={cell / 2} y={54 + cell + 14} textAnchor="middle" fontSize="9" fill={colorTokens.muted}>[{i}]</text>
            </motion.g>
          );
        })}
        <AnimatePresence>
          {phase === 1 && (
            <motion.g initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <text x={40 + 1 * (cell + gap) + cell / 2} y="48" textAnchor="middle" fontSize="10" fontWeight="bold" fill={colorTokens.info}>arr[1] ↓</text>
            </motion.g>
          )}
          {phase === 3 && (
            <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <rect x={40 + 2 * (cell + gap)} y="54" width={cell} height={cell} rx="6"
                fill={colorTokens.successDim} stroke={colorTokens.success} strokeWidth="2.5" filter="url(#ds-glow)" />
              <text x={40 + 2 * (cell + gap) + cell / 2} y={54 + cell / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="bold" fill={colorTokens.success}>25</text>
              <text x="560" y="100" fontSize="11" fontWeight="bold" fill={colorTokens.destructive}>→ 뒤 원소 모두 이동 (Shift)</text>
            </motion.g>
          )}
        </AnimatePresence>
      </g>

      {/* ── Panel 2: Linked List ── */}
      <g transform="translate(40, 210)">
        <rect width="720" height="120" rx="12" fill={colorTokens.card} stroke={colorTokens.border} strokeWidth="1.5" />
        <text x="16" y="26" fontSize="13" fontWeight="bold" fill={colorTokens.primaryHighlight}>Linked List</text>
        <CostBadge x={560} y={12} label="Access O(N)" active={phase === 2} color={colorTokens.destructive} />
        <CostBadge x={620} y={36} label="Insert O(1)" active={phase === 4} color={colorTokens.primaryHighlight} />
        {LL.map((v, i) => {
          const targeted = phase === 2 && i === 1;
          const x = 60 + i * 150;
          return (
            <g key={`l-${i}`}>
              <rect x={x} y="58" width={cell} height={cell} rx="8"
                fill={targeted ? colorTokens.primaryHighlightDim : colorTokens.faintFill}
                stroke={targeted ? colorTokens.primaryHighlight : colorTokens.primaryHighlightEdge} strokeWidth={targeted ? 2.5 : 1} />
              <text x={x + cell / 2} y={58 + cell / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="bold"
                fill={targeted ? colorTokens.primaryHighlight : colorTokens.text}>{v}</text>
              {i < LL.length - 1 && (
                <line x1={x + cell} y1={58 + cell / 2} x2={x + 150} y2={58 + cell / 2}
                  stroke={colorTokens.primaryHighlightEdge} strokeWidth="2" markerEnd="url(#ds-arrow)" />
              )}
            </g>
          );
        })}
        {/* traversal cursor */}
        <AnimatePresence>
          {phase === 2 && (
            <motion.circle r="8" cy="48" fill="none" stroke={colorTokens.primaryHighlight} strokeWidth="2" filter="url(#ds-glow)"
              initial={{ cx: 60 + cell / 2, opacity: 0 }}
              animate={{ cx: 60 + 1 * 150 + cell / 2, opacity: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeInOut" }} />
          )}
          {phase === 4 && (
            <motion.g initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <rect x={60 + 0 * 150 + 75} y="58" width={cell} height={cell} rx="8"
                fill={colorTokens.successDim} stroke={colorTokens.success} strokeWidth="2.5" filter="url(#ds-glow)" />
              <text x={60 + 75 + cell / 2} y={58 + cell / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="bold" fill={colorTokens.success}>15</text>
              <text x="540" y="100" fontSize="11" fontWeight="bold" fill={colorTokens.primaryHighlight}>→ 포인터 2개만 재연결 (O(1))</text>
            </motion.g>
          )}
        </AnimatePresence>
      </g>

      {/* ── Panel 3: Tuple (immutability) — NEW (defect 4) ── */}
      <g transform="translate(40, 350)">
        <rect width="720" height="120" rx="12" fill={colorTokens.card}
          stroke={phase === 5 ? colorTokens.warning : colorTokens.border} strokeWidth={phase === 5 ? 2.5 : 1.5} />
        <text x="16" y="26" fontSize="13" fontWeight="bold" fill={colorTokens.warning}>Tuple (불변)</text>
        <CostBadge x={560} y={12} label="Read O(1)" active={phase === 5} color={colorTokens.info} />
        <CostBadge x={620} y={36} label="Write ✕" active={phase === 5} color={colorTokens.destructive} />
        {TUP.map((v, i) => {
          const x = 40 + i * (cell + gap);
          return (
            <g key={`t-${i}`}>
              <rect x={x} y="54" width={cell} height={cell} rx="6"
                fill={colorTokens.warningDim} stroke={colorTokens.warningEdgeSubtle} strokeWidth="1.5" />
              <text x={x + cell / 2} y={54 + cell / 2 + 5} textAnchor="middle" fontSize="15" fontWeight="bold" fill={colorTokens.warning}>{v}</text>
              <text x={x + cell / 2} y={54 + cell + 14} textAnchor="middle" fontSize="9" fill={colorTokens.muted}>[{i}]</text>
            </g>
          );
        })}
        {/* lock icon */}
        <g transform="translate(220, 60)">
          <rect x="0" y="10" width="28" height="22" rx="4" fill={colorTokens.warningDim} stroke={colorTokens.warning} strokeWidth="1.5" />
          <path d="M 6 10 L 6 6 A 8 8 0 0 1 22 6 L 22 10" fill="none" stroke={colorTokens.warning} strokeWidth="2" />
        </g>
        <AnimatePresence>
          {phase === 5 && (
            <motion.g initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -4, 4, -4, 0] }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}>
              <text x="280" y="80" fontSize="12" fill={colorTokens.text}>{'t[0] = "Q"'}</text>
              <text x="370" y="80" fontSize="12" fontWeight="bold" fill={colorTokens.destructive} filter="url(#ds-glow)">✕ TypeError: 불변 객체는 수정 불가</text>
            </motion.g>
          )}
          {phase !== 5 && (
            <text x="280" y="80" fontSize="11" fill={colorTokens.muted}>생성 후 값을 바꿀 수 없어 안전하게 공유됩니다.</text>
          )}
        </AnimatePresence>
      </g>

      <text x="40" y="492" fontSize="12" fill={colorTokens.text}>{data?.msg ?? STEPS[0].msg}</text>
    </svg>
  );
}
