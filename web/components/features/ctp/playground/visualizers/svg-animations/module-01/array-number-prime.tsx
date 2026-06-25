"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

const NUMS = Array.from({ length: 19 }, (_, i) => i + 2); // 2..20

type CellState = "idle" | "prime" | "crossed" | "scanning";
type RemRow = { dividend: number; quotient: number; remainder: number };

type Step = {
  section: "sieve" | "radix";
  p: number | null; // current prime under processing (sieve)
  crossed: number[]; // numbers crossed out so far
  primesLocked: boolean;
  // radix
  rem: RemRow[]; // remainder rows computed so far
  base: number;
  value: number;
  reading: boolean; // reading remainders bottom-up
  msg: string;
};

function buildSteps(): Step[] {
  const steps: Step[] = [];
  steps.push({ section: "sieve", p: null, crossed: [], primesLocked: false, rem: [], base: 2, value: 13, reading: false,
    msg: "에라토스테네스의 체로 소수를 찾고, 같은 배열 사고로 정수를 n진수로 변환합니다." });

  // Section A: sieve for primes 2,3,5 over 2..20
  const crossed = new Set<number>();
  const cross = (prime: number) => {
    for (let k = prime * prime; k <= 20; k += prime) crossed.add(k);
  };
  // p=2
  cross(2);
  steps.push({ section: "sieve", p: 2, crossed: [...crossed], primesLocked: false, rem: [], base: 2, value: 13, reading: false,
    msg: "P=2는 소수. 2의 배수(4,6,8,...)를 모두 지웁니다." });
  // p=3
  cross(3);
  steps.push({ section: "sieve", p: 3, crossed: [...crossed], primesLocked: false, rem: [], base: 2, value: 13, reading: false,
    msg: "P=3는 지워지지 않았으니 소수. 3의 배수를 지웁니다." });
  // p=4 skip
  steps.push({ section: "sieve", p: 4, crossed: [...crossed], primesLocked: false, rem: [], base: 2, value: 13, reading: false,
    msg: "P=4는 이미 지워졌으므로 건너뜁니다." });
  // p=5
  cross(5);
  steps.push({ section: "sieve", p: 5, crossed: [...crossed], primesLocked: false, rem: [], base: 2, value: 13, reading: false,
    msg: "P=5는 소수. 5의 배수를 지웁니다." });
  // done
  steps.push({ section: "sieve", p: null, crossed: [...crossed], primesLocked: true, rem: [], base: 2, value: 13, reading: false,
    msg: "√20 까지 처리 완료. 남은 수가 모두 소수입니다." });

  // Section B: base conversion 13 -> binary by repeated division, remainder array read in reverse
  const base = 2;
  let v = 13;
  const rows: RemRow[] = [];
  steps.push({ section: "radix", p: null, crossed: [...crossed], primesLocked: true, rem: [], base, value: 13, reading: false,
    msg: `n진수 변환 시작: 13을 ${base}진수로. 몫이 0이 될 때까지 ${base}로 나눈 나머지를 배열에 쌓습니다.` });
  while (v > 0) {
    const q = Math.floor(v / base);
    const r = v % base;
    rows.push({ dividend: v, quotient: q, remainder: r });
    steps.push({ section: "radix", p: null, crossed: [...crossed], primesLocked: true, rem: rows.map((x) => ({ ...x })), base, value: 13, reading: false,
      msg: `${v} ÷ ${base} = 몫 ${q}, 나머지 ${r}. 나머지 ${r}을(를) 배열에 추가.` });
    v = q;
  }
  steps.push({ section: "radix", p: null, crossed: [...crossed], primesLocked: true, rem: rows.map((x) => ({ ...x })), base, value: 13, reading: true,
    msg: `나머지 배열을 역순으로 읽으면 13 = ${rows.map((r) => r.remainder).reverse().join("")}₍₂₎ = 1101.` });
  return steps;
}

const STEPS = buildSteps();

export function useArrayPrimeSim() {
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>(["> Number 엔진 준비 완료. Step을 눌러 시작하세요."]);
  const maxSteps = STEPS.length;

  const rebuild = useCallback((t: number) => {
    const arr = ["> Number 엔진 준비 완료. Step을 눌러 시작하세요."];
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

export function ArrayPrimeVisualizer({ data }: { data: Step | null }) {
  const s = data ?? STEPS[0];
  const sieve = s.section === "sieve";

  const cellState = (n: number): CellState => {
    if (s.crossed.includes(n)) return "crossed";
    if (s.p === n) return "scanning";
    if (s.primesLocked) return "prime";
    // primes already confirmed during scan
    if ([2, 3, 5].includes(n) && s.p !== null && n <= s.p) return "prime";
    return "idle";
  };

  const cols = 7;
  const cw = 56, ch = 48, cgap = 8;
  const gridX = 50, gridY = 130;

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <filter id="ap-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <text x="40" y="36" fontSize="16" fontWeight="bold" fill={colorTokens.success}>소수 판별(체) + n진수 변환</text>

      {/* tabs */}
      <g transform="translate(40, 52)">
        <rect width="180" height="26" rx="13" fill={sieve ? colorTokens.successDim : colorTokens.faintFill} stroke={sieve ? colorTokens.success : colorTokens.border} />
        <text x="90" y="18" textAnchor="middle" fontSize="11" fontWeight="bold" fill={sieve ? colorTokens.success : colorTokens.muted}>A. SIEVE (소수)</text>
        <rect x="190" width="200" height="26" rx="13" fill={!sieve ? colorTokens.infoDim : colorTokens.faintFill} stroke={!sieve ? colorTokens.info : colorTokens.border} />
        <text x="290" y="18" textAnchor="middle" fontSize="11" fontWeight="bold" fill={!sieve ? colorTokens.info : colorTokens.muted}>B. RADIX (n진수 변환)</text>
      </g>

      {/* ── Sieve grid ── */}
      <g opacity={sieve ? 1 : 0.3}>
        <text x={gridX} y={gridY - 12} fontSize="11" fontWeight="bold" fill={colorTokens.muted}>정수 배열 [2 .. 20]</text>
        {NUMS.map((n, idx) => {
          const r = Math.floor(idx / cols), c = idx % cols;
          const x = gridX + c * (cw + cgap);
          const y = gridY + r * (ch + cgap);
          const st = cellState(n);
          let fill: string = colorTokens.faintFill, stroke: string = colorTokens.border, txt: string = colorTokens.text, sw = 1.5;
          if (st === "prime") { fill = colorTokens.successDim; stroke = colorTokens.success; txt = colorTokens.success; sw = 2; }
          else if (st === "crossed") { fill = colorTokens.destructiveTrace; stroke = colorTokens.destructiveEdge; txt = colorTokens.muted; }
          else if (st === "scanning") { fill = colorTokens.primaryHighlightDim; stroke = colorTokens.primaryHighlight; txt = colorTokens.primaryHighlight; sw = 3; }
          return (
            <g key={n}>
              <motion.rect x={x} y={y} width={cw} height={ch} rx="8" initial={false}
                animate={{ scale: st === "scanning" ? 1.08 : 1, opacity: st === "crossed" ? 0.7 : 1 }}
                style={{ transformOrigin: `${x + cw / 2}px ${y + ch / 2}px` }}
                fill={fill} stroke={stroke} strokeWidth={sw} filter={st === "scanning" ? "url(#ap-glow)" : undefined} />
              <text x={x + cw / 2} y={y + ch / 2 + 6} textAnchor="middle" fontSize="18" fontWeight="bold" fill={txt}>{n}</text>
              {st === "crossed" && (
                <g stroke={colorTokens.destructiveEdge} strokeWidth="2">
                  <line x1={x + 8} y1={y + 8} x2={x + cw - 8} y2={y + ch - 8} />
                  <line x1={x + cw - 8} y1={y + 8} x2={x + 8} y2={y + ch - 8} />
                </g>
              )}
            </g>
          );
        })}
      </g>

      {/* ── Radix conversion ── */}
      <g opacity={!sieve ? 1 : 0.3}>
        <text x="430" y={gridY - 12} fontSize="11" fontWeight="bold" fill={colorTokens.muted}>13 → {s.base}진수 (반복 나눗셈)</text>
        {/* division rows */}
        {s.rem.map((row, i) => {
          const y = gridY + i * 34;
          return (
            <motion.g key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
              <text x="430" y={y + 14} fontSize="13" fill={colorTokens.text}>{row.dividend} ÷ {s.base} =</text>
              <text x="540" y={y + 14} fontSize="13" fill={colorTokens.muted}>몫 {row.quotient}</text>
              <text x="620" y={y + 14} fontSize="13" fontWeight="bold" fill={colorTokens.info}>나머지 {row.remainder}</text>
            </motion.g>
          );
        })}
        {/* remainder array */}
        <g transform={`translate(430, ${gridY + Math.max(1, s.rem.length) * 34 + 16})`}>
          <text x="0" y="-6" fontSize="11" fontWeight="bold" fill={colorTokens.info}>나머지 배열 (쌓인 순서)</text>
          {s.rem.map((row, i) => {
            const x = i * 44;
            return (
              <g key={i}>
                <rect x={x} y="0" width="38" height="38" rx="6" fill={colorTokens.infoDim} stroke={colorTokens.info} strokeWidth="1.5" />
                <text x={x + 19} y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill={colorTokens.info}>{row.remainder}</text>
                <text x={x + 19} y="52" textAnchor="middle" fontSize="9" fill={colorTokens.muted}>[{i}]</text>
              </g>
            );
          })}
          {/* reverse-read result */}
          {s.reading && s.rem.length > 0 && (
            <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <text x="0" y="86" fontSize="12" fill={colorTokens.muted}>역순으로 읽으면:</text>
              <text x="120" y="86" fontSize="18" fontWeight="bold" fill={colorTokens.success}>
                {s.rem.map((r) => r.remainder).reverse().join("")}₍{s.base}₎
              </text>
              <path d={`M ${(s.rem.length - 1) * 44 + 19} -8 L 19 -8`} fill="none" stroke={colorTokens.success} strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#ap-glow)" />
            </motion.g>
          )}
        </g>
      </g>

      <text x="40" y="490" fontSize="12" fill={colorTokens.text}>{s.msg}</text>
    </svg>
  );
}
