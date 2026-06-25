"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

const GRID = [
  [1, 4, 2],
  [5, 9, 3],
  [8, 6, 7],
];

// Two sections under one concept (matches title: 2D 탐색 + 1D 역순 two-pointer):
//   Section A: nested-loop max scan over the matrix (rows 0..2)
//   Section B: reverse a 1D array in place with two-pointer swaps
type Step = {
  section: "matrix" | "reverse";
  activeRow: number; // for matrix, -1 = done
  runningMax: number | null;
  arr: number[]; // for reverse section
  lo: number; // two-pointer left
  hi: number; // two-pointer right
  swapping: boolean;
  msg: string;
};

function buildSteps(): Step[] {
  const steps: Step[] = [];
  // idle
  steps.push({ section: "matrix", activeRow: -1, runningMax: null, arr: [], lo: -1, hi: -1, swapping: false,
    msg: "2D 행렬 최댓값 탐색(중첩 루프) 후, 1D 배열을 two-pointer로 역순 정렬합니다." });

  // Section A: scan each row, track global max
  let gmax = -Infinity;
  GRID.forEach((row, i) => {
    const rowMax = Math.max(...row);
    const before = gmax;
    gmax = Math.max(gmax, rowMax);
    const changed = gmax !== before;
    steps.push({
      section: "matrix", activeRow: i, runningMax: gmax, arr: [], lo: -1, hi: -1, swapping: false,
      msg: `행 ${i} 스캔 → 행 최댓값 ${rowMax}. 전역 MAX ${changed ? `갱신: ${gmax}` : `유지: ${gmax}`}.`,
    });
  });

  // Section B: reverse [2,7,1,9] with two pointers
  const arr = [2, 7, 1, 9];
  let lo = 0, hi = arr.length - 1;
  steps.push({ section: "reverse", activeRow: -1, runningMax: gmax, arr: [...arr], lo, hi, swapping: false,
    msg: `1D 역순 정렬 시작. 양 끝 포인터 lo=${lo}, hi=${hi}.` });
  while (lo < hi) {
    // highlight pair
    steps.push({ section: "reverse", activeRow: -1, runningMax: gmax, arr: [...arr], lo, hi, swapping: true,
      msg: `arr[${lo}]=${arr[lo]} ↔ arr[${hi}]=${arr[hi]} 교환.` });
    [arr[lo], arr[hi]] = [arr[hi], arr[lo]];
    steps.push({ section: "reverse", activeRow: -1, runningMax: gmax, arr: [...arr], lo, hi, swapping: false,
      msg: `교환 완료. 포인터를 안쪽으로 이동.` });
    lo++; hi--;
  }
  steps.push({ section: "reverse", activeRow: -1, runningMax: gmax, arr: [...arr], lo, hi, swapping: false,
    msg: `lo >= hi 이므로 역순 정렬 완료: [${arr.join(", ")}].` });
  return steps;
}

const STEPS = buildSteps();

export function use2DArraySim() {
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>(["> Matrix 엔진 준비 완료. Step을 눌러 시작하세요."]);
  const maxSteps = STEPS.length;

  const rebuild = useCallback((t: number) => {
    const arr = ["> Matrix 엔진 준비 완료. Step을 눌러 시작하세요."];
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

export function TwoDArrayVisualizer({ data }: { data: Step | null }) {
  const s = data ?? STEPS[0];
  const section = s.section;
  const cell = 60;
  const gap = 12;

  // matrix layout
  const mStartX = 90, mStartY = 150;
  // reverse layout
  const rStartX = 470, rStartY = 230;

  const matrixActive = section === "matrix";
  const rowMaxCell = (i: number) => {
    const row = GRID[i];
    const m = Math.max(...row);
    return row.indexOf(m);
  };

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <filter id="td-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <text x="40" y="36" fontSize="16" fontWeight="bold" fill={colorTokens.info}>2D 탐색(중첩 루프) + 1D 역순(two-pointer)</text>

      {/* section tabs */}
      <g transform="translate(40, 52)">
        <rect width="180" height="26" rx="13" fill={matrixActive ? colorTokens.infoDim : colorTokens.faintFill} stroke={matrixActive ? colorTokens.info : colorTokens.border} />
        <text x="90" y="18" textAnchor="middle" fontSize="11" fontWeight="bold" fill={matrixActive ? colorTokens.info : colorTokens.muted}>A. 2D MAX SCAN</text>
        <rect x="190" width="200" height="26" rx="13" fill={!matrixActive ? colorTokens.primaryHighlightDim : colorTokens.faintFill} stroke={!matrixActive ? colorTokens.primaryHighlight : colorTokens.border} />
        <text x="290" y="18" textAnchor="middle" fontSize="11" fontWeight="bold" fill={!matrixActive ? colorTokens.primaryHighlight : colorTokens.muted}>B. 1D REVERSE (two-pointer)</text>
      </g>

      {/* ── Matrix ── */}
      <g opacity={matrixActive ? 1 : 0.35}>
        <text x={mStartX} y={mStartY - 18} fontSize="11" fontWeight="bold" fill={colorTokens.muted}>nested loop: max of grid[i][j]</text>
        {GRID.map((row, i) => {
          const y = mStartY + i * (cell + gap);
          const isActiveRow = matrixActive && s.activeRow === i;
          const isPast = matrixActive && s.activeRow > i;
          const maxJ = rowMaxCell(i);
          return (
            <g key={i}>
              <text x={mStartX - 20} y={y + cell / 2 + 5} textAnchor="end" fontSize="11" fontWeight="bold"
                fill={isActiveRow ? colorTokens.info : colorTokens.muted}>i={i}</text>
              {isActiveRow && (
                <motion.rect x={mStartX - 6} y={y - 6} width={3 * (cell + gap) - gap + 12} height={cell + 12} rx="8"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} fill={colorTokens.infoDim} stroke={colorTokens.infoEdge} />
              )}
              {row.map((v, j) => {
                const x = mStartX + j * (cell + gap);
                const isRunMax = (isActiveRow || isPast) && j === maxJ && Math.max(...row) === s.runningMax;
                let fill: string = colorTokens.faintFill, stroke: string = colorTokens.border, txt: string = colorTokens.text;
                if (isActiveRow) { fill = colorTokens.infoTrace; stroke = colorTokens.info; txt = colorTokens.info; }
                else if (isPast) { txt = colorTokens.muted; }
                if (isRunMax) { stroke = colorTokens.success; txt = colorTokens.success; }
                return (
                  <g key={j}>
                    <rect x={x} y={y} width={cell} height={cell} rx="8" fill={fill} stroke={stroke} strokeWidth={isRunMax ? 3 : isActiveRow ? 2.5 : 1.5}
                      filter={isRunMax ? "url(#td-glow)" : undefined} />
                    <text x={x + cell / 2} y={y + cell / 2 + 7} textAnchor="middle" fontSize="22" fontWeight="bold" fill={txt}>{v}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
        <g transform={`translate(${mStartX}, ${mStartY + 3 * (cell + gap) + 6})`}>
          <rect width="220" height="30" rx="8" fill={colorTokens.card} stroke={colorTokens.border} />
          <text x="12" y="20" fontSize="12" fill={colorTokens.muted}>GLOBAL MAX =</text>
          <text x="208" y="20" textAnchor="end" fontSize="16" fontWeight="bold" fill={colorTokens.success}>{s.runningMax === null ? "-∞" : s.runningMax}</text>
        </g>
      </g>

      {/* ── Reverse (two-pointer) ── */}
      <g opacity={!matrixActive ? 1 : 0.35}>
        <text x={rStartX} y={rStartY - 30} fontSize="11" fontWeight="bold" fill={colorTokens.muted}>two-pointer: swap(lo, hi)</text>
        {(s.section === "reverse" ? s.arr : [2, 7, 1, 9]).map((v, i) => {
          const x = rStartX + i * (cell + gap);
          const isLo = s.section === "reverse" && i === s.lo && s.lo < s.hi;
          const isHi = s.section === "reverse" && i === s.hi && s.lo < s.hi;
          const isPair = isLo || isHi;
          const swapping = s.section === "reverse" && s.swapping && isPair;
          let fill: string = colorTokens.faintFill, stroke: string = colorTokens.border, txt: string = colorTokens.text;
          if (swapping) { fill = colorTokens.destructiveTrace; stroke = colorTokens.destructive; txt = colorTokens.destructive; }
          else if (isPair) { fill = colorTokens.primaryHighlightDim; stroke = colorTokens.primaryHighlight; txt = colorTokens.primaryHighlight; }
          return (
            <g key={i}>
              {isLo && <text x={x + cell / 2} y={rStartY - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill={colorTokens.primaryHighlight}>lo</text>}
              {isHi && <text x={x + cell / 2} y={rStartY - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill={colorTokens.primaryHighlight}>hi</text>}
              <motion.rect x={x} y={rStartY} width={cell} height={cell} rx="8" initial={false}
                animate={{ stroke, scale: swapping ? 1.06 : 1 }} style={{ transformOrigin: `${x + cell / 2}px ${rStartY + cell / 2}px` }}
                fill={fill} strokeWidth={isPair ? 3 : 1.5} filter={swapping ? "url(#td-glow)" : undefined} />
              <text x={x + cell / 2} y={rStartY + cell / 2 + 7} textAnchor="middle" fontSize="22" fontWeight="bold" fill={txt}>{v}</text>
              <text x={x + cell / 2} y={rStartY + cell + 18} textAnchor="middle" fontSize="11" fill={colorTokens.muted}>[{i}]</text>
            </g>
          );
        })}
        {/* swap arc */}
        {s.section === "reverse" && s.swapping && s.lo < s.hi && (
          <motion.path
            d={`M ${rStartX + s.lo * (cell + gap) + cell / 2} ${rStartY - 4} Q ${rStartX + ((s.lo + s.hi) / 2) * (cell + gap) + cell / 2} ${rStartY - 60} ${rStartX + s.hi * (cell + gap) + cell / 2} ${rStartY - 4}`}
            fill="none" stroke={colorTokens.destructive} strokeWidth="2" strokeDasharray="4 3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
        )}
      </g>

      <text x="40" y="490" fontSize="12" fill={colorTokens.text}>{s.msg}</text>
    </svg>
  );
}
