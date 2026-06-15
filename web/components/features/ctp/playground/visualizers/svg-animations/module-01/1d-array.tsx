"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

const ARR = ["A", "B", "C", "D", "E", "F"];

// Each step is a directly-addressable array operation. The slider scrubs
// across operations (= direct manipulation of which index/slice is shown).
type Op =
  | { kind: "idle" }
  | { kind: "access"; index: number }
  | { kind: "slice"; from: number; to: number } // [from, to)
  | { kind: "oob"; index: number };

type Step = { op: Op; code: string; msg: string };

const STEPS: Step[] = [
  { op: { kind: "idle" }, code: "const arr = ['A','B','C','D','E','F'];", msg: "1차원 배열은 연속된 메모리 블록입니다. Step / 슬라이더로 인덱스·슬라이싱을 조작하세요." },
  { op: { kind: "access", index: 0 }, code: "arr[0]            // 'A'", msg: "인덱스 0 접근. 오프셋을 직접 계산 → O(1)." },
  { op: { kind: "access", index: 5 }, code: "arr[arr.length-1] // 'F'", msg: "마지막 인덱스 5 접근. 위치와 무관하게 O(1)." },
  { op: { kind: "access", index: 2 }, code: "arr[2]            // 'C'", msg: "임의 인덱스 2 접근. 모든 인덱스 접근 비용은 동일." },
  { op: { kind: "slice", from: 1, to: 4 }, code: "arr.slice(1, 4)   // ['B','C','D']", msg: "슬라이싱 [1,4): 새 배열로 복사 → O(N)." },
  { op: { kind: "slice", from: 3, to: 6 }, code: "arr.slice(3, 6)   // ['D','E','F']", msg: "슬라이싱 [3,6): 끝까지 복사." },
  { op: { kind: "oob", index: 6 }, code: "arr[6]            // out of bounds", msg: "범위(0~5)를 벗어난 인덱스 6 접근 → undefined / 경계 오류." },
];

export function use1DArraySim() {
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>(["> 1D Array 준비 완료. Step을 눌러 메모리 접근을 추적하세요."]);
  const maxSteps = STEPS.length;

  const rebuild = useCallback((t: number) => {
    const arr = ["> 1D Array 준비 완료. Step을 눌러 메모리 접근을 추적하세요."];
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

export function OneDArrayVisualizer({ data }: { data: Step | null }) {
  const op = data?.op ?? { kind: "idle" as const };

  const cell = 70;
  const gap = 14;
  const startX = 70;
  const rowY = 210;

  const sliceMembers =
    op.kind === "slice"
      ? Array.from({ length: op.to - op.from }, (_, k) => op.from + k)
      : [];

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <filter id="oa-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <text x="40" y="40" fontSize="16" fontWeight="bold" fill={colorTokens.info}>1차원 배열 — 인덱스 접근 & 슬라이싱</text>

      {/* code line */}
      <rect x="40" y="62" width="720" height="40" rx="8" fill={colorTokens.card} stroke={colorTokens.border} strokeWidth="1.5" />
      <text x="56" y="87" fontSize="14" fill={colorTokens.text}>{data?.code ?? STEPS[0].code}</text>

      {/* slice bracket */}
      <AnimatePresence>
        {op.kind === "slice" && (
          <motion.g initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <rect x={startX + op.from * (cell + gap) - 6} y={rowY - 56} rx="8"
              width={(op.to - op.from) * (cell + gap) - gap + 12} height="44"
              fill={colorTokens.successDim} stroke={colorTokens.success} strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={startX + op.from * (cell + gap)} y={rowY - 64} fontSize="11" fontWeight="bold" fill={colorTokens.success}>
              new array sub[] = slice({op.from}, {op.to})
            </text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* main array */}
      {ARR.map((ch, i) => {
        const x = startX + i * (cell + gap);
        const isAccess = (op.kind === "access" && op.index === i);
        const inSlice = sliceMembers.includes(i);
        let fill: string = colorTokens.faintFill, stroke: string = colorTokens.border, txt: string = colorTokens.text, sw = 1.5;
        if (isAccess) { fill = colorTokens.infoDim; stroke = colorTokens.info; txt = colorTokens.info; sw = 3; }
        else if (inSlice) { fill = colorTokens.successDim; stroke = colorTokens.success; txt = colorTokens.success; sw = 2.5; }
        return (
          <g key={i}>
            {isAccess && (
              <motion.g initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <text x={x + cell / 2} y={rowY - 18} textAnchor="middle" fontSize="11" fontWeight="bold" fill={colorTokens.info}>INDEX {i} ↓</text>
              </motion.g>
            )}
            <motion.rect x={x} y={rowY} width={cell} height={cell} rx="10" initial={false}
              animate={{ y: inSlice ? rowY - 6 : rowY }}
              fill={fill} stroke={stroke} strokeWidth={sw}
              filter={isAccess ? "url(#oa-glow)" : undefined} />
            <text x={x + cell / 2} y={rowY + cell / 2 + 8} textAnchor="middle" fontSize="26" fontWeight="bold" fill={txt}>{ch}</text>
            <text x={x + cell / 2} y={rowY + cell + 22} textAnchor="middle" fontSize="12" fill={colorTokens.muted}>[{i}]</text>
            <text x={x + cell / 2} y={rowY + cell + 38} textAnchor="middle" fontSize="9" fill={colorTokens.muted}>0x{(0x1000 + i * 4).toString(16).toUpperCase()}</text>
          </g>
        );
      })}

      {/* out of bounds ghost cell */}
      {(() => {
        const i = ARR.length;
        const x = startX + i * (cell + gap) + 10;
        const isOob = op.kind === "oob";
        return (
          <g>
            <line x1={x - 12} y1={rowY - 8} x2={x - 12} y2={rowY + cell + 8} stroke={colorTokens.border} strokeWidth="1.5" strokeDasharray="4 4" />
            {isOob && (
              <motion.text x={x + cell / 2} y={rowY - 18} textAnchor="middle" fontSize="11" fontWeight="bold" fill={colorTokens.destructive}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>INDEX 6 ↓</motion.text>
            )}
            <motion.rect x={x} y={rowY} width={cell} height={cell} rx="10" initial={false}
              animate={{
                stroke: isOob ? colorTokens.destructive : colorTokens.border,
                rotate: isOob ? [0, -3, 3, 0] : 0,
              }}
              style={{ transformOrigin: `${x + cell / 2}px ${rowY + cell / 2}px` }}
              fill={isOob ? colorTokens.destructiveTrace : "transparent"} strokeWidth="2" strokeDasharray="5 4"
              filter={isOob ? "url(#oa-glow)" : undefined} />
            <text x={x + cell / 2} y={rowY + cell / 2 + 8} textAnchor="middle" fontSize={isOob ? 16 : 26} fontWeight="bold"
              fill={isOob ? colorTokens.destructive : colorTokens.muted}>{isOob ? "ERR" : "?"}</text>
            <text x={x + cell / 2} y={rowY + cell + 22} textAnchor="middle" fontSize="12" fill={isOob ? colorTokens.destructive : colorTokens.muted}>[6]</text>
          </g>
        );
      })()}

      {/* slice extraction preview (copied out) */}
      <AnimatePresence>
        {op.kind === "slice" && (
          <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <text x="70" y="360" fontSize="11" fontWeight="bold" fill={colorTokens.success}>복사된 새 배열 (별도 메모리):</text>
            {sliceMembers.map((idx, k) => {
              const x = 70 + k * (cell + gap);
              return (
                <g key={k}>
                  <rect x={x} y="372" width={cell} height={cell} rx="10" fill={colorTokens.successDim} stroke={colorTokens.success} strokeWidth="2" />
                  <text x={x + cell / 2} y={372 + cell / 2 + 8} textAnchor="middle" fontSize="24" fontWeight="bold" fill={colorTokens.success}>{ARR[idx]}</text>
                  <text x={x + cell / 2} y={372 + cell + 18} textAnchor="middle" fontSize="11" fill={colorTokens.muted}>[{k}]</text>
                </g>
              );
            })}
          </motion.g>
        )}
      </AnimatePresence>

      <text x="40" y="485" fontSize="12" fill={colorTokens.text}>{data?.msg ?? STEPS[0].msg}</text>
    </svg>
  );
}
