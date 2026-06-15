"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// --- Types ---
type BMState = {
  text: string;
  pattern: string;
  badCharTable: Record<string, number>;
  phase: "BUILD_TABLE" | "SEARCH" | "DONE";
  phaseText: string;

  // For SEARCH phase
  i: number; // Global text window pointer (start index of pattern in text)
  j: number; // Pattern pointer (current character being compared, moving right to left)
  matchFound: boolean;
  matchIndex: number | null;
  comparing: boolean;

  // Skip info
  badCharIndex: number;
  skipDistance: number;
};

// 의미있는 실제 TEXT/PATTERN — 숫자 배열이 아닌 실제 문자열을 사용합니다.
const BOYER_MOORE_TEXT = "HERE IS A SIMPLE EXAMPLE";
const BOYER_MOORE_PATTERN = "EXAMPLE";

// --- Step Generator (bubble-sort의 generateBubbleSortSteps 방식) ---
function generateBoyerMooreSteps(text: string, pattern: string): BMState[] {
  const steps: BMState[] = [];
  const t = text || BOYER_MOORE_TEXT;
  const p = pattern || BOYER_MOORE_PATTERN;
  const m = p.length;
  const n = t.length;
  const badCharTable: Record<string, number> = {};

  const record = (state: Partial<BMState>) => {
    const lastState = steps[steps.length - 1];
    steps.push({
      ...(lastState || {
        text: t,
        pattern: p,
        badCharTable: { ...badCharTable },
        phase: "BUILD_TABLE",
        phaseText: "초기화",
        i: 0,
        j: m - 1,
        matchFound: false,
        matchIndex: null,
        comparing: false,
        badCharIndex: -1,
        skipDistance: 0,
      }),
      ...state,
      badCharTable: { ...badCharTable }, // copy table dict
    });
  };

  record({ phaseText: "1단계: 나쁜 문자(Bad Character) 이동 표 생성" });

  // 1. Build Bad Character Table (record rightmost occurrence of each character)
  for (let k = 0; k < m; k++) {
    badCharTable[p[k]] = k;
    record({ phaseText: `패턴 문자 '${p[k]}'의 가장 오른쪽 등장 인덱스를 [${k}]로 기록` });
  }

  record({ phase: "SEARCH", phaseText: "2단계: 텍스트 탐색 시작 (비교는 뒤에서 앞으로 진행)", i: 0, j: m - 1 });

  // 2. Search (using only Bad Character Heuristic for simplicity)
  let s = 0; // shift of the pattern
  let matchIdx = -1;

  while (s <= n - m) {
    let j = m - 1;

    // Keep comparing backwards while pattern matches text
    while (j >= 0) {
      record({ phase: "SEARCH", i: s, j, comparing: true, phaseText: `문자 비교: 텍스트 '${t[s + j]}' 와 패턴 '${p[j]}'`, skipDistance: 0 });
      if (p[j] === t[s + j]) {
        record({ phase: "SEARCH", i: s, j, comparing: false, phaseText: `일치! 앞쪽 문자(j--) 검사 진행`, skipDistance: 0 });
        j--;
      } else {
        break;
      }
    }

    if (j < 0) {
      matchIdx = s;
      record({ phase: "SEARCH", i: s, j: 0, matchFound: true, matchIndex: s, phaseText: `탐색 성공! 인덱스 [${s}] 에서 패턴 발견` });
      break; // Stop at first match
    } else {
      // Bad character shift
      const badChar = t[s + j];
      const lastOccur = badCharTable[badChar] !== undefined ? badCharTable[badChar] : -1;

      const shift = Math.max(1, j - lastOccur);
      record({ phase: "SEARCH", i: s, j, comparing: false, badCharIndex: lastOccur, skipDistance: shift, phaseText: `불일치 ('${badChar}'). 오른쪽 끝 등장 인덱스: ${lastOccur}. ${shift}칸 점프 계산.` });

      s += shift;
      if (s <= n - m) {
        record({ phase: "SEARCH", i: s, j: m - 1, comparing: false, phaseText: `패턴을 ${shift}칸 밀어서 인덱스 [${s}] 위치에서 다시 탐색 시작` });
      }
    }
  }

  if (matchIdx === -1) {
    record({ phase: "DONE", phaseText: "탐색 종료: 패턴을 찾지 못했습니다." });
  } else {
    record({ phase: "DONE", phaseText: "탐색 종료: 매칭 완료!" });
  }

  return steps;
}

// --- Hook (신규 계약: { runSimulation, interactive }) ---
export function useBoyerMooreSearchSim(
  text: string = BOYER_MOORE_TEXT,
  pattern: string = BOYER_MOORE_PATTERN
) {
  const [steps, setSteps] = useState<BMState[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const initialLog = "> 보이어-무어 탐색 대기 중... Step을 눌러 시작하세요.";

  useEffect(() => {
    const generated = generateBoyerMooreSteps(text, pattern);
    setSteps(generated);
    setStepIdx(0);
    setLogs([initialLog]);
  }, [text, pattern]);

  const handleSetStep = useCallback(
    (newStep: number) => {
      if (newStep < 0 || newStep >= steps.length) return;
      setStepIdx(newStep);
      const newLogs = [initialLog];
      for (let i = 1; i <= newStep; i++) {
        newLogs.unshift(`[Step ${i}] ${steps[i].phaseText}`);
      }
      setLogs(newLogs);
    },
    [steps]
  );

  const nextStep = useCallback(() => {
    setStepIdx((prev) => {
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
        push: nextStep, // "Step"
        clear: reset, // "Reset"
      },
      currentStep: stepIdx,
      maxSteps: steps.length,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

// --- Visualizer Component (props.data에서 현재 step 상태를 읽음) ---
export function BoyerMooreSearchVisualizer({ data }: { data?: BMState | null }) {
  if (!data) return null;
  const { text, pattern, badCharTable, phase, phaseText, i, j, matchFound, comparing, skipDistance, badCharIndex } = data;

  const svgWidth = 840;
  const svgHeight = 500;

  // Sized so 24-char text fits the 840-wide viewBox: 24 * 32 = 768 px.
  const boxSize = 28;
  const gap = 4;
  const totalBoxWidth = boxSize + gap;

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
      <defs>
        <filter id="glow-bm" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="grid-bm" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.faintEdge} strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#grid-bm)" />

      <text x="30" y="40" fill="hsl(var(--muted-foreground))" fontSize="20" fontWeight="bold">Boyer-Moore Search (Bad Character Rule)</text>
      <text x="30" y="65" fill="hsl(var(--muted-foreground))" fontSize="14">{phaseText}</text>

      {/* Bad Character Table Visualizer */}
      <g transform="translate(40, 110)">
        <text x="0" y="-10" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="bold">Bad Character Table (나쁜 문자 표)</text>
        <g transform="translate(0, 5)">
          {Object.keys(badCharTable).map((char, idx) => (
            <g key={idx} transform={`translate(${idx * 80}, 0)`}>
              <rect width="70" height="36" fill="hsl(var(--muted))" stroke="hsl(var(--muted))" rx="4" />
              <text x="35" y="24" fill="hsl(var(--muted-foreground))" fontSize="14" fontWeight="bold" textAnchor="middle">{char} = {badCharTable[char]}</text>
            </g>
          ))}
          {Object.keys(badCharTable).length === 0 && (
            <text x="20" y="24" fill="hsl(var(--muted-foreground))" fontSize="14" fontStyle="italic">비어 있음</text>
          )}
        </g>
      </g>

      {/* Text Section */}
      <g transform="translate(40, 260)" opacity={phase === "BUILD_TABLE" ? 0.3 : 1}>
        <text x="0" y="0" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="bold">Text</text>
        {text.split("").map((char, idx) => {
          const x = idx * totalBoxWidth;
          const isMatchArea = matchFound && idx >= i && idx < i + pattern.length;

          let tFill = "hsl(var(--muted))";
          let filter = "";

          if (isMatchArea) {
            tFill = colorTokens.success;
            filter = "url(#glow-bm)";
          } else if (phase === "SEARCH" && comparing && idx === i + j) {
            tFill = colorTokens.primaryBlue;
          } else if (phase === "SEARCH" && !comparing && skipDistance > 0 && idx === i + j) {
            tFill = colorTokens.errorRed; // Bad Character
          }

          return (
            <g key={`bm-t-${idx}`} transform={`translate(${x}, 10)`}>
              <rect width={boxSize} height={boxSize} fill={tFill} stroke={colorTokens.gridLine} rx="4" filter={filter} />
              <text x={boxSize / 2} y={boxSize / 2 + 5} fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold" textAnchor="middle">{char}</text>
              <text x={boxSize / 2} y={boxSize + 15} fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">{idx}</text>
            </g>
          );
        })}
      </g>

      {/* Pattern Section */}
      <g transform="translate(40, 360)" opacity={phase === "BUILD_TABLE" ? 0.3 : 1}>
        <text x="0" y="-10" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="bold">Pattern (비교 방향 ←)</text>

        <motion.g initial={false} animate={{ x: i * totalBoxWidth }} transition={{ type: "spring", stiffness: 200, damping: 25 }}>
          {pattern.split("").map((char, idx) => {
            const x = idx * totalBoxWidth;
            const isMatchedSoFar = idx > j && !matchFound && phase === "SEARCH";
            const isCompareTarget = comparing && idx === j;

            let pFill = "hsl(var(--muted))";
            if (matchFound) pFill = colorTokens.success;
            else if (isMatchedSoFar) pFill = colorTokens.success;
            else if (isCompareTarget) pFill = colorTokens.primaryBlue;

            return (
              <g key={`bm-p-${idx}`} transform={`translate(${x}, 0)`}>
                <rect width={boxSize} height={boxSize} fill={pFill} rx="4" />
                <text x={boxSize / 2} y={boxSize / 2 + 5} fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold" textAnchor="middle">{char}</text>
                <text x={boxSize / 2} y={boxSize + 15} fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">{idx}</text>
              </g>
            );
          })}

          {/* Pointer j */}
          {phase === "SEARCH" && !matchFound && j >= 0 && j < pattern.length && (
            <motion.g initial={false} animate={{ x: j * totalBoxWidth }}>
              <path d={`M ${boxSize / 2} -5 L ${boxSize / 2 + 5} -13 L ${boxSize / 2 - 5} -13 Z`} fill={colorTokens.destructive} />
              <text x={boxSize / 2} y="-18" fill={colorTokens.destructive} fontSize="12" fontWeight="bold" textAnchor="middle">j</text>
            </motion.g>
          )}
        </motion.g>

        {/* Visual feedback for Skip Distance */}
        {skipDistance > 0 && !comparing && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transform={`translate(${i * totalBoxWidth}, -40)`}>
            {badCharIndex !== -1 ? (
              <text x={boxSize / 2} y="-10" fill={colorTokens.warning} fontSize="12" fontWeight="bold">+ {skipDistance}칸 점프 (문자 매칭)</text>
            ) : (
              <text x={boxSize / 2} y="-10" fill={colorTokens.errorRed} fontSize="12" fontWeight="bold">+ {skipDistance}칸 대폭 점프! (문자 없음)</text>
            )}
          </motion.g>
        )}
      </g>
    </svg>
  );
}
