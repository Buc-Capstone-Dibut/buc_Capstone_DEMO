"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

// --- Types ---
type SearchState = {
  text: string;
  pattern: string;
  i: number; // Text pointer (start of current match window)
  j: number; // Pattern pointer (current character being compared)
  comparing: boolean;
  matchFound: boolean;
  matchIndex: number | null;
  phase: string;
};

// 의미있는 실제 TEXT/PATTERN — 숫자 배열이 아닌 실제 문자열을 사용합니다.
const BRUTE_FORCE_TEXT = "ABABCABABCABCABABA";
const BRUTE_FORCE_PATTERN = "ABABCAB";

// --- Step Generator (bubble-sort의 generateBubbleSortSteps 방식) ---
function generateBruteForceSteps(text: string, pattern: string): SearchState[] {
  const steps: SearchState[] = [];
  const t = text || BRUTE_FORCE_TEXT;
  const p = pattern || BRUTE_FORCE_PATTERN;
  const n = t.length;
  const m = p.length;

  const record = (state: Partial<SearchState>) => {
    steps.push({
      text: t,
      pattern: p,
      i: 0,
      j: 0,
      comparing: false,
      matchFound: false,
      matchIndex: null,
      phase: "",
      ...state,
    });
  };

  record({ phase: "초기 상태: 텍스트와 패턴 준비" });

  let matchIdx = -1;

  for (let i = 0; i <= n - m; i++) {
    record({ i, j: 0, phase: `텍스트 인덱스 [${i}]에서 탐색 시작` });

    let j = 0;
    while (j < m) {
      record({ i, j, comparing: true, phase: `'${t[i + j]}' 와 '${p[j]}' 비교 중...` });
      if (t[i + j] === p[j]) {
        record({ i, j, comparing: false, phase: `일치! 다음 문자 확인` });
        j++;
      } else {
        record({ i, j, comparing: false, phase: `불일치. 패턴을 한 칸 오른쪽으로 이동` });
        break;
      }
    }

    if (j === m) {
      matchIdx = i;
      record({ i, j: m - 1, matchFound: true, matchIndex: i, phase: `탐색 성공! 인덱스 [${i}]에서 패턴 발견` });
      break; // Stop after first match for simplicity
    }
  }

  if (matchIdx === -1) {
    record({ i: n - m, j: 0, phase: "탐색 실패: 텍스트 끝까지 패턴을 찾지 못함" });
  }

  return steps;
}

// --- Hook (신규 계약: { runSimulation, interactive }) ---
export function useBruteForceSearchSim(
  text: string = BRUTE_FORCE_TEXT,
  pattern: string = BRUTE_FORCE_PATTERN
) {
  const [steps, setSteps] = useState<SearchState[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const initialLog = "> 브루트 포스 탐색 대기 중... Step을 눌러 시작하세요.";

  useEffect(() => {
    const generated = generateBruteForceSteps(text, pattern);
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
        newLogs.unshift(`[Step ${i}] ${steps[i].phase}`);
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
export function BruteForceSearchVisualizer({ data }: { data?: SearchState | null }) {
  if (!data) return null;
  const { text, pattern, i, j, comparing, matchFound, phase } = data;

  const svgWidth = 800;
  const svgHeight = 400;

  // Sized so 18-char text fits the 800-wide viewBox: 18 * 34 = 612 px.
  const boxSize = 30;
  const gap = 4;
  const totalBoxWidth = boxSize + gap;

  // Center alignment offset
  const textStartX = (svgWidth - text.length * totalBoxWidth) / 2;
  const patternStartX = textStartX + i * totalBoxWidth;

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
      <defs>
        <filter id="glow-compare" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-match" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.faintEdge} strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Status Text overlay */}
      <text x="30" y="40" fill="hsl(var(--muted-foreground))" fontSize="18" fontWeight="bold">Brute Force Search</text>
      <text x="30" y="65" fill="hsl(var(--muted-foreground))" fontSize="14">{phase}</text>

      {/* Text Array */}
      <text x="50" y="140" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="bold">Text</text>
      {text.split("").map((char, idx) => {
        const x = textStartX + idx * totalBoxWidth;
        const isMatchArea = matchFound && idx >= i && idx < i + pattern.length;
        const isComparing = comparing && idx === i + j;

        let strokeColor: string = colorTokens.gridMid;
        let fillColor = "hsl(var(--muted))";
        let textColor = "hsl(var(--muted-foreground))";
        let filter = "";

        if (isMatchArea) {
          fillColor = colorTokens.success;
          strokeColor = colorTokens.success;
          textColor = "hsl(var(--foreground))";
          filter = "url(#glow-match)";
        } else if (isComparing) {
          fillColor = colorTokens.primaryBlue;
          strokeColor = colorTokens.primaryBlue;
          textColor = "hsl(var(--foreground))";
          filter = "url(#glow-compare)";
        }

        return (
          <g key={`text-${idx}`} transform={`translate(${x}, 160)`}>
            <rect width={boxSize} height={boxSize} fill={fillColor} stroke={strokeColor} strokeWidth="2" rx="6" filter={filter} />
            <text x={boxSize / 2} y={boxSize / 2 + 6} fill={textColor} fontSize="20" fontWeight="bold" textAnchor="middle">{char}</text>
            <text x={boxSize / 2} y={boxSize + 15} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">{idx}</text>
          </g>
        );
      })}

      {/* Pattern Array */}
      <text x="50" y="260" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="bold">Pattern</text>

      <motion.g
        initial={false}
        animate={{ x: patternStartX }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {pattern.split("").map((char, idx) => {
          const isMatchedSoFar = !comparing && idx < j && !matchFound;
          const isComparing = comparing && idx === j;
          const isFailed = !comparing && idx === j && !matchFound && j < pattern.length;

          let fillColor = "hsl(var(--muted))";
          let textColor = "hsl(var(--muted-foreground))";
          let filter = "";

          if (matchFound) {
            fillColor = colorTokens.success;
            textColor = "hsl(var(--foreground))";
            filter = "url(#glow-match)";
          } else if (isFailed) {
            fillColor = colorTokens.errorRed;
            textColor = "hsl(var(--foreground))";
          } else if (isMatchedSoFar) {
            fillColor = colorTokens.success; // Darker green for matching prefix
            textColor = "hsl(var(--foreground))";
          } else if (isComparing) {
            fillColor = colorTokens.primaryBlue;
            textColor = "hsl(var(--foreground))";
            filter = "url(#glow-compare)";
          }

          return (
            <g key={`pattern-${idx}`} transform={`translate(${idx * totalBoxWidth}, 240)`}>
              <rect width={boxSize} height={boxSize} fill={fillColor} rx="6" filter={filter} />
              <text x={boxSize / 2} y={boxSize / 2 + 6} fill={textColor} fontSize="20" fontWeight="bold" textAnchor="middle">{char}</text>
              <text x={boxSize / 2} y={boxSize + 15} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">{idx}</text>
            </g>
          );
        })}

        {/* Pointer i (Base of Pattern) */}
        <motion.path
          d={`M ${boxSize / 2} -15 L ${boxSize / 2 + 5} -25 L ${boxSize / 2 - 5} -25 Z`}
          fill={colorTokens.errorRed}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
        <text x={boxSize / 2} y="-30" fill={colorTokens.errorRed} fontSize="14" fontWeight="bold" textAnchor="middle">i</text>

        {/* Pointer j (Current match pos) */}
        {!matchFound && j < pattern.length && (
          <motion.g initial={false} animate={{ x: j * totalBoxWidth }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
            <path d={`M ${boxSize / 2} -10 L ${boxSize / 2 + 5} -20 L ${boxSize / 2 - 5} -20 Z`} fill={colorTokens.primaryBlue} />
            <text x={boxSize / 2} y="-25" fill={colorTokens.primaryBlue} fontSize="14" fontWeight="bold" textAnchor="middle">j</text>
          </motion.g>
        )}
      </motion.g>

      {/* Connection lines during comparison */}
      {comparing && (
        <motion.line
          x1={patternStartX + j * totalBoxWidth + boxSize / 2}
          y1="240"
          x2={textStartX + (i + j) * totalBoxWidth + boxSize / 2}
          y2="200"
          stroke={colorTokens.primaryBlue}
          strokeWidth="2"
          strokeDasharray="4"
        />
      )}
    </svg>
  );
}
