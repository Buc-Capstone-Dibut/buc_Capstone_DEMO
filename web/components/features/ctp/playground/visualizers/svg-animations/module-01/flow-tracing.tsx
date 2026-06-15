"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// Trace of: sum = 0; for (i=1; i<=3; i++) sum += i; console.log(sum)
type Row = { i: string; sum: string; note: string; line: number };
type Step = {
  line: number; // active source line (1..5), 0 = idle
  rows: Row[]; // cumulative trace timeline up to this step
  msg: string;
};

const CODE = [
  "let sum = 0;",
  "for (let i = 1; i <= 3; i++) {",
  "  sum += i;",
  "}",
  "console.log(sum);",
];

// Build the full cumulative trace once.
const TRACE: Row[] = [
  { line: 1, i: "—", sum: "0", note: "sum 초기화" },
  { line: 2, i: "1", sum: "0", note: "1<=3 TRUE" },
  { line: 3, i: "1", sum: "1", note: "sum += 1" },
  { line: 2, i: "2", sum: "1", note: "2<=3 TRUE" },
  { line: 3, i: "2", sum: "3", note: "sum += 2" },
  { line: 2, i: "3", sum: "3", note: "3<=3 TRUE" },
  { line: 3, i: "3", sum: "6", note: "sum += 3" },
  { line: 2, i: "4", sum: "6", note: "4<=3 FALSE → exit" },
  { line: 5, i: "4", sum: "6", note: "출력: 6" },
].map((r) => ({ ...r }));

const STEPS: Step[] = [
  { line: 0, rows: [], msg: "흐름 추적 대기 중. Step을 눌러 한 줄씩 실행하며 변수 변화를 추적하세요." },
  ...TRACE.map((_, idx) => ({
    line: TRACE[idx].line,
    rows: TRACE.slice(0, idx + 1),
    msg: TRACE[idx].note,
  })),
];

export function useFlowTracingSim() {
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>(["> Debugger 준비 완료. Step을 눌러 추적을 시작하세요."]);
  const maxSteps = STEPS.length;

  const rebuild = useCallback((t: number) => {
    const arr = ["> Debugger 준비 완료. Step을 눌러 추적을 시작하세요."];
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

export function FlowTracingVisualizer({ data }: { data: Step | null }) {
  const activeLine = data?.line ?? 0;
  const rows = data?.rows ?? [];

  const codeX = 40;
  const codeY = 90;
  const lineH = 34;

  // timeline table layout
  const tableX = 360;
  const tableY = 70;
  const colW = [60, 90, 90, 150]; // step#, i, sum, note
  const rowH = 30;
  const headerH = 30;
  const maxVisible = 9;

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <filter id="ft-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <text x="40" y="40" fontSize="16" fontWeight="bold" fill={colorTokens.info}>흐름 추적 — 변수 타임라인</text>

      {/* ── Code panel ── */}
      <rect x={codeX - 14} y={codeY - 28} width="300" height={lineH * CODE.length + 40} rx="10"
        fill={colorTokens.card} stroke={colorTokens.border} strokeWidth="1.5" />
      <text x={codeX} y={codeY - 8} fontSize="11" fontWeight="bold" fill={colorTokens.muted}>algo.js</text>
      {CODE.map((src, idx) => {
        const ln = idx + 1;
        const on = ln === activeLine;
        const y = codeY + 20 + idx * lineH;
        return (
          <g key={ln}>
            {on && (
              <motion.rect x={codeX - 14} y={y - lineH / 2} width="300" height={lineH} initial={false}
                animate={{ opacity: 1 }} fill={colorTokens.infoDim} />
            )}
            <text x={codeX - 4} y={y + 5} fontSize="11" fill={colorTokens.muted} textAnchor="end">{ln}</text>
            <text x={codeX + 8} y={y + 5} fontSize="13" fontWeight={on ? "bold" : "normal"}
              fill={on ? colorTokens.info : colorTokens.text}>{src}</text>
            {on && <circle cx={codeX - 26} cy={y} r="4" fill={colorTokens.info} filter="url(#ft-glow)" />}
          </g>
        );
      })}

      {/* ── Cumulative timeline table (defect 3) ── */}
      <text x={tableX} y={tableY - 10} fontSize="11" fontWeight="bold" fill={colorTokens.muted}>변수 추적 타임라인 (누적)</text>
      {/* header */}
      <rect x={tableX} y={tableY} width={colW.reduce((a, b) => a + b, 0)} height={headerH} rx="4" fill={colorTokens.infoDim} stroke={colorTokens.border} />
      {["step", "i", "sum", "note"].map((h, ci) => {
        const x = tableX + colW.slice(0, ci).reduce((a, b) => a + b, 0);
        return (
          <text key={h} x={x + colW[ci] / 2} y={tableY + 20} textAnchor="middle" fontSize="12" fontWeight="bold" fill={colorTokens.info}>{h}</text>
        );
      })}
      {/* rows */}
      {rows.slice(-maxVisible).map((r, idx) => {
        const realIdx = Math.max(0, rows.length - maxVisible) + idx;
        const y = tableY + headerH + idx * rowH;
        const isLast = realIdx === rows.length - 1;
        const cells = [`${realIdx + 1}`, r.i, r.sum, r.note];
        const isFalse = r.note.includes("FALSE");
        return (
          <motion.g key={realIdx} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
            <rect x={tableX} y={y} width={colW.reduce((a, b) => a + b, 0)} height={rowH}
              fill={isLast ? colorTokens.infoTrace : "transparent"} stroke={colorTokens.border} strokeWidth="0.5" />
            {cells.map((c, ci) => {
              const x = tableX + colW.slice(0, ci).reduce((a, b) => a + b, 0);
              let fill: string = colorTokens.text;
              if (ci === 3 && isFalse) fill = colorTokens.destructive;
              else if (ci === 2 && isLast) fill = colorTokens.success;
              return (
                <text key={ci} x={ci === 3 ? x + 8 : x + colW[ci] / 2} y={y + 20}
                  textAnchor={ci === 3 ? "start" : "middle"} fontSize="12"
                  fontWeight={isLast ? "bold" : "normal"} fill={fill}>{c}</text>
              );
            })}
          </motion.g>
        );
      })}
      {rows.length === 0 && (
        <text x={tableX + 12} y={tableY + headerH + 22} fontSize="12" fill={colorTokens.muted}>아직 추적된 단계가 없습니다.</text>
      )}

      {/* ── current variable chips ── */}
      <g transform="translate(40, 380)">
        <rect width="300" height="80" rx="10" fill={colorTokens.card} stroke={colorTokens.border} strokeWidth="1.5" />
        <text x="14" y="24" fontSize="11" fontWeight="bold" fill={colorTokens.muted}>현재 메모리 상태</text>
        <g transform="translate(20, 36)">
          <rect width="120" height="32" rx="6" fill={colorTokens.successDim} stroke={colorTokens.successEdge} />
          <text x="12" y="21" fontSize="13" fill={colorTokens.text}>sum =</text>
          <text x="108" y="21" textAnchor="end" fontSize="16" fontWeight="bold" fill={colorTokens.success}>{rows.length ? rows[rows.length - 1].sum : "—"}</text>
        </g>
        <g transform="translate(160, 36)">
          <rect width="120" height="32" rx="6" fill={colorTokens.warningDim} stroke={colorTokens.warningEdge} />
          <text x="12" y="21" fontSize="13" fill={colorTokens.text}>i =</text>
          <text x="108" y="21" textAnchor="end" fontSize="16" fontWeight="bold" fill={colorTokens.warning}>{rows.length ? rows[rows.length - 1].i : "—"}</text>
        </g>
      </g>

      <text x="40" y="490" fontSize="12" fill={colorTokens.text}>{data?.msg ?? STEPS[0].msg}</text>
    </svg>
  );
}
