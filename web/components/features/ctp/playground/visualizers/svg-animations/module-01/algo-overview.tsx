"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// --- Step model ---
type Step = {
  phase: 0 | 1 | 2 | 3 | 4; // 0 idle, 1 input, 2 transfer, 3 process, 4 output
  msg: string;
};

const STEPS: Step[] = [
  { phase: 0, msg: "알고리즘 코어 대기 중. Step을 눌러 입력→처리→출력 흐름을 추적하세요." },
  { phase: 1, msg: "[INPUT] 정렬되지 않은 원시 데이터가 입력 버퍼에 적재되었습니다." },
  { phase: 2, msg: "[TRANSFER] 데이터 패킷이 알고리즘 코어로 전송됩니다." },
  { phase: 3, msg: "[PROCESS] 정해진 절차(정렬 로직)가 데이터를 가공합니다." },
  { phase: 4, msg: "[OUTPUT] 유한 시간 안에 정렬된 결과가 메모리에 반환되었습니다." },
];

export function useAlgoOverviewSim() {
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> Algo_Core 엔진 준비 완료. Step을 눌러 시작하세요.",
  ]);

  const maxSteps = STEPS.length;

  const rebuildLogs = useCallback((target: number) => {
    const next = ["> Algo_Core 엔진 준비 완료. Step을 눌러 시작하세요."];
    for (let i = 1; i <= target; i++) next.unshift(`[Step ${i}] ${STEPS[i].msg}`);
    setLogs(next);
  }, []);

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= maxSteps) return;
    setStepIdx(newStep);
    rebuildLogs(newStep);
  }, [maxSteps, rebuildLogs]);

  const nextStep = useCallback(() => {
    setStepIdx((prev) => {
      const next = prev >= maxSteps - 1 ? prev : prev + 1;
      if (next !== prev) rebuildLogs(next);
      return next;
    });
  }, [maxSteps, rebuildLogs]);

  const reset = useCallback(() => handleSetStep(0), [handleSetStep]);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: STEPS[stepIdx],
      logs,
      handlers: {
        push: nextStep, // "Step / Next"
        clear: reset,
      },
      currentStep: stepIdx,
      maxSteps,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

// --- Visualizer (bare SVG, driven by props.data) ---
const RAW = [5, 2, 9, 1, 6];
const SORTED = [1, 2, 5, 6, 9];

export function AlgoOverviewVisualizer({ data }: { data: Step | null }) {
  const phase = data?.phase ?? 0;

  const cellH = 22;
  const inputX = 70;
  const coreX = 330;
  const outputX = 610;
  const stackTop = 120;

  const PhaseChip = ({ x, label, active }: { x: number; label: string; active: boolean }) => (
    <g transform={`translate(${x}, 96)`}>
      <rect width="120" height="22" rx="11" x="-60"
        fill={active ? colorTokens.infoDim : colorTokens.faintFill}
        stroke={active ? colorTokens.info : colorTokens.border} strokeWidth="1" />
      <text x="0" y="15" textAnchor="middle" fontSize="11" fontWeight="bold"
        fill={active ? colorTokens.info : colorTokens.muted}>{label}</text>
    </g>
  );

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <filter id="ao-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="ao-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.muted} strokeWidth="0.5" opacity="0.15" />
        </pattern>
      </defs>

      <rect width="800" height="500" fill="url(#ao-grid)" />

      <text x="40" y="46" fill={colorTokens.info} fontSize="22" fontWeight="bold" letterSpacing="1" filter="url(#ao-glow)">
        ALGORITHM = INPUT → 절차 → OUTPUT
      </text>
      <text x="40" y="68" fill={colorTokens.muted} fontSize="12">
        동일 입력은 항상 동일 출력. 입력 N이 커질 때의 연산 증가가 곧 시간복잡도입니다.
      </text>

      <PhaseChip x={inputX + 60} label="INPUT" active={phase === 1} />
      <PhaseChip x={coreX + 60} label="PROCESS" active={phase === 3} />
      <PhaseChip x={outputX + 60} label="OUTPUT" active={phase === 4} />

      {/* Input buffer */}
      <g transform={`translate(${inputX}, ${stackTop})`}>
        <rect width="120" height={cellH * RAW.length + 40} rx="12"
          fill={colorTokens.card} stroke={phase === 1 ? colorTokens.info : colorTokens.border}
          strokeWidth={phase === 1 ? 3 : 1.5} strokeDasharray="5 4" />
        <text x="60" y="22" textAnchor="middle" fontSize="11" fontWeight="bold" fill={colorTokens.muted}>RAW BUFFER</text>
        {RAW.map((v, i) => (
          <motion.g key={`in-${i}`}
            initial={false}
            animate={{ opacity: phase >= 1 ? (phase >= 2 ? 0.25 : 1) : 0.3, x: phase >= 2 ? 18 : 0 }}
            transition={{ delay: phase === 1 ? i * 0.05 : 0, type: "spring", stiffness: 220, damping: 22 }}>
            <rect x="20" y={32 + i * cellH} width="80" height={cellH - 5} rx="4"
              fill={colorTokens.infoDim} stroke={colorTokens.infoEdge} strokeWidth="1" />
            <text x="60" y={32 + i * cellH + 13} textAnchor="middle" fontSize="13" fontWeight="bold" fill={colorTokens.info}>{v}</text>
          </motion.g>
        ))}
      </g>

      {/* transfer line in -> core */}
      <line x1={inputX + 120} y1="200" x2={coreX} y2="200" stroke={colorTokens.border} strokeWidth="2" strokeDasharray="4 4" />
      <motion.line x1={inputX + 120} y1="200" x2={coreX} y2="200" stroke={colorTokens.info} strokeWidth="3"
        initial={false}
        animate={{ pathLength: phase >= 2 ? 1 : 0, opacity: phase >= 2 && phase < 4 ? 1 : 0.3 }}
        transition={{ duration: 0.6 }} />
      <AnimatePresence>
        {phase === 2 && (
          <motion.circle r="6" cy="200" fill={colorTokens.info} filter="url(#ao-glow)"
            initial={{ cx: inputX + 120, opacity: 0 }}
            animate={{ cx: coreX, opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, repeat: Infinity }} />
        )}
      </AnimatePresence>

      {/* Algo core */}
      <g transform={`translate(${coreX}, 130)`}>
        <motion.rect width="160" height="140" rx="20"
          initial={false}
          animate={{
            stroke: phase === 3 ? colorTokens.info : colorTokens.border,
            strokeWidth: phase === 3 ? 3 : 1.5,
          }}
          fill={colorTokens.card} />
        <motion.g initial={false} animate={{ rotate: phase === 3 ? 360 : 0 }}
          transition={{ duration: 3, repeat: phase === 3 ? Infinity : 0, ease: "linear" }}
          style={{ transformOrigin: "80px 58px" }}>
          <circle cx="80" cy="58" r="30" fill="none" stroke={phase === 3 ? colorTokens.info : colorTokens.muted} strokeWidth="4" strokeDasharray="8 12" />
          <circle cx="80" cy="58" r="16" fill="none" stroke={phase === 3 ? colorTokens.infoEdge : colorTokens.muted} strokeWidth="2" strokeDasharray="3 6" />
        </motion.g>
        <text x="80" y="115" textAnchor="middle" fontSize="14" fontWeight="bold" letterSpacing="2"
          fill={phase === 3 ? colorTokens.info : colorTokens.text}>ALGO_CORE</text>
      </g>

      {/* transfer line core -> out */}
      <line x1={coreX + 160} y1="200" x2={outputX} y2="200" stroke={colorTokens.border} strokeWidth="2" strokeDasharray="4 4" />
      <AnimatePresence>
        {phase === 4 && (
          <motion.circle r="6" cy="200" fill={colorTokens.success} filter="url(#ao-glow)"
            initial={{ cx: coreX + 160, opacity: 0 }}
            animate={{ cx: outputX, opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }} />
        )}
      </AnimatePresence>

      {/* Output buffer */}
      <g transform={`translate(${outputX}, ${stackTop})`}>
        <rect width="120" height={cellH * SORTED.length + 40} rx="12"
          fill={colorTokens.card} stroke={phase === 4 ? colorTokens.success : colorTokens.border}
          strokeWidth={phase === 4 ? 3 : 1.5} />
        <text x="60" y="22" textAnchor="middle" fontSize="11" fontWeight="bold" fill={colorTokens.muted}>RESULT MEM</text>
        {SORTED.map((v, i) => (
          <motion.g key={`out-${i}`}
            initial={false}
            animate={{ opacity: phase >= 4 ? 1 : 0.12, scale: phase >= 4 ? 1 : 0.9 }}
            transition={{ delay: phase === 4 ? 0.4 + i * 0.08 : 0, type: "spring", stiffness: 200, damping: 18 }}
            style={{ transformOrigin: `60px ${32 + i * cellH + 8}px` }}>
            <rect x="20" y={32 + i * cellH} width="80" height={cellH - 5} rx="4"
              fill={colorTokens.successDim} stroke={colorTokens.successEdge} strokeWidth="1" />
            <text x="60" y={32 + i * cellH + 13} textAnchor="middle" fontSize="13" fontWeight="bold" fill={colorTokens.success}>{v}</text>
          </motion.g>
        ))}
      </g>

      {/* ── Big-O panel integrated into main SVG (defect 1) ── */}
      <g transform="translate(40, 320)">
        <rect width="720" height="120" rx="12" fill={colorTokens.card} stroke={colorTokens.border} strokeWidth="1.5" />
        <text x="16" y="26" fontSize="13" fontWeight="bold" fill={colorTokens.text}>시간복잡도 비교 — 입력 N이 커질 때 연산량 증가</text>

        {/* axes */}
        <g transform="translate(40, 40)">
          <line x1="0" y1="64" x2="300" y2="64" stroke={colorTokens.muted} strokeWidth="1.5" />
          <line x1="0" y1="64" x2="0" y2="4" stroke={colorTokens.muted} strokeWidth="1.5" />
          <text x="304" y="68" fontSize="10" fill={colorTokens.muted}>N</text>
          <text x="-4" y="2" fontSize="10" fill={colorTokens.muted} textAnchor="end">연산</text>
          {/* O(1) */}
          <path d="M 0 60 L 300 58" fill="none" stroke={colorTokens.success} strokeWidth="3" />
          <text x="240" y="50" fontSize="11" fontWeight="bold" fill={colorTokens.success}>O(1)</text>
          {/* O(N) */}
          <path d="M 0 64 L 300 14" fill="none" stroke={colorTokens.primaryBlue} strokeWidth="3" />
          <text x="240" y="22" fontSize="11" fontWeight="bold" fill={colorTokens.primaryBlue}>O(N)</text>
          {/* O(N^2) */}
          <path d="M 0 64 Q 220 64 270 4" fill="none" stroke={colorTokens.destructive} strokeWidth="3" filter="url(#ao-glow)" />
          <text x="150" y="16" fontSize="11" fontWeight="bold" fill={colorTokens.destructive}>O(N²)</text>
        </g>

        <g transform="translate(380, 44)">
          <text x="0" y="6" fontSize="11" fill={colorTokens.muted}>N = 100,000 일 때</text>
          <text x="0" y="30" fontSize="12" fill={colorTokens.success}>● O(1) — 즉시 (1회)</text>
          <text x="0" y="50" fontSize="12" fill={colorTokens.primaryBlue}>● O(N) — 10만 회</text>
          <text x="0" y="70" fontSize="12" fill={colorTokens.destructive}>● O(N²) — 100억 회 (서버 정지)</text>
        </g>
      </g>

      {/* status caption */}
      <text x="40" y="470" fontSize="13" fill={colorTokens.text}>{data?.msg ?? STEPS[0].msg}</text>
    </svg>
  );
}
