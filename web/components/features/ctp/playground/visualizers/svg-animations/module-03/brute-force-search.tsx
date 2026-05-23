"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";
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

// --- Hook ---
export function useBruteForceSearchSim(text: string, pattern: string) {
  const [history, setHistory] = useState<SearchState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const steps: SearchState[] = [];

    // Ensure inputs are valid
    const t = text || "ABCABDEF";
    const p = pattern || "ABD";
    const n = t.length;
    const m = p.length;

    const record = (state: Partial<SearchState>) => {
      steps.push({
        text: t,
        pattern: p,
        i: 0, j: 0,
        comparing: false,
        matchFound: false,
        matchIndex: null,
        phase: "",
        ...state
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

    setHistory(steps);
    setStepIndex(0);
    setIsPlaying(false);
  }, [text, pattern]);

  const currentState = history[stepIndex] || {
    text: text || "ABCABDEF", pattern: pattern || "ABD",
    i: 0, j: 0, comparing: false, matchFound: false, matchIndex: null, phase: "로딩 중..."
  };

  const nextStep = useCallback(() => setStepIndex(p => Math.min(p + 1, history.length - 1)), [history.length]);
  const prevStep = useCallback(() => setStepIndex(p => Math.max(p - 1, 0)), []);
  const reset = useCallback(() => { setStepIndex(0); setIsPlaying(false); }, []);
  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

  useEffect(() => {
    if (isPlaying) {
      if (stepIndex >= history.length - 1) { setIsPlaying(false); return; }
      playIntervalRef.current = setTimeout(nextStep, 600);
    }
    return () => clearTimeout(playIntervalRef.current as NodeJS.Timeout);
  }, [isPlaying, stepIndex, history.length, nextStep]);

  return { state: currentState, controls: { nextStep, prevStep, reset, togglePlay, isPlaying }, progress: history.length > 0 ? stepIndex / (history.length - 1) : 0, isFinished: stepIndex === history.length - 1 };
}

// --- Visualizer Component ---
// 입력값은 ConceptSpec.simulation.initialState와 정확히 일치시킵니다.
const BRUTE_FORCE_TEXT = "ABABCABABCABCABABA";
const BRUTE_FORCE_PATTERN = "ABABCAB";

export function BruteForceSearchVisualizer(_props: { data?: unknown }) {
  const { state, controls, progress, isFinished } = useBruteForceSearchSim(BRUTE_FORCE_TEXT, BRUTE_FORCE_PATTERN);
  const { text, pattern, i, j, comparing, matchFound, phase } = state;

  const svgWidth = 800;
  const svgHeight = 400;

  // Sized so 18-char text fits the 800-wide viewBox: 18 * 34 = 612 px.
  const boxSize = 30;
  const gap = 4;
  const totalBoxWidth = boxSize + gap;

  // Center alignment offset
  const textStartX = (svgWidth - (text.length * totalBoxWidth)) / 2;
  const patternStartX = textStartX + (i * totalBoxWidth);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-4">
      <div className="relative w-full aspect-[2/1] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
          <defs>
             <filter id="glow-compare" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-match" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
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
          {text.split('').map((char, idx) => {
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
                <text x={boxSize/2} y={boxSize/2 + 6} fill={textColor} fontSize="20" fontWeight="bold" textAnchor="middle">{char}</text>
                <text x={boxSize/2} y={boxSize + 15} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">{idx}</text>
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
            {pattern.split('').map((char, idx) => {
              const rectX = idx * totalBoxWidth;
              const isMatchedSoFar = !comparing && idx < j && !matchFound;
              const isComparing = comparing && idx === j;
              const isFailed = !comparing && idx === j && !matchFound && j < pattern.length && progress > 0;

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
                <g key={`pattern-${idx}`} transform={`translate(${rectX}, 240)`}>
                  <rect width={boxSize} height={boxSize} fill={fillColor} rx="6" filter={filter} />
                  <text x={boxSize/2} y={boxSize/2 + 6} fill={textColor} fontSize="20" fontWeight="bold" textAnchor="middle">{char}</text>
                  <text x={boxSize/2} y={boxSize + 15} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">{idx}</text>
                </g>
              );
            })}

            {/* Pointer i (Base of Pattern) */}
            <motion.path
              d={`M ${boxSize/2} -15 L ${boxSize/2 + 5} -25 L ${boxSize/2 - 5} -25 Z`}
              fill={colorTokens.errorRed}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <text x={boxSize/2} y="-30" fill={colorTokens.errorRed} fontSize="14" fontWeight="bold" textAnchor="middle">i</text>

            {/* Pointer j (Current match pos) */}
            {!matchFound && j < pattern.length && (
              <motion.g
                 initial={false}
                 animate={{ x: j * totalBoxWidth }}
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <path d={`M ${boxSize/2} -10 L ${boxSize/2 + 5} -20 L ${boxSize/2 - 5} -20 Z`} fill={colorTokens.primaryBlue} />
                <text x={boxSize/2} y="-25" fill={colorTokens.primaryBlue} fontSize="14" fontWeight="bold" textAnchor="middle">j</text>
              </motion.g>
            )}
          </motion.g>

          {/* Connection lines during comparison */}
          {comparing && (
             <motion.line
                x1={patternStartX + j * totalBoxWidth + boxSize/2}
                y1="240"
                x2={textStartX + (i + j) * totalBoxWidth + boxSize/2}
                y2="200"
                stroke={colorTokens.primaryBlue} strokeWidth="2" strokeDasharray="4"
             />
          )}

        </svg>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full">
          <motion.div className="h-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg w-full justify-between">
        <button onClick={controls.reset} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors focus:ring-2 ring-slate-500" title="처음으로"><RotateCcw className="w-5 h-5" /></button>
        <div className="flex items-center gap-2">
          <button onClick={controls.prevStep} disabled={progress === 0} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors disabled:opacity-30" title="이전 단계"><StepBack className="w-5 h-5" /></button>
          <button onClick={controls.togglePlay} disabled={isFinished} className={`p-4 rounded-full transition-all focus:ring-2 ring-offset-2 ring-offset-slate-900 ${isFinished ? 'bg-slate-800 text-slate-500' : controls.isPlaying ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 ring-amber-500' : 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 ring-blue-500'}`} title={controls.isPlaying ? "일시정지" : "자동 재생"}>{controls.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}</button>
          <button onClick={controls.nextStep} disabled={isFinished} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors disabled:opacity-30" title="다음 단계"><StepForward className="w-5 h-5" /></button>
        </div>
        <div className="text-sm font-medium text-slate-500 min-w-[3rem] text-right">{Math.round(progress * 100)}%</div>
      </div>
    </div>
  );
}
