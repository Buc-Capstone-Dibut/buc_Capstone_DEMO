"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";

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

// --- Hook ---
export function useBoyerMooreSim(text: string, pattern: string) {
  const [history, setHistory] = useState<BMState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const steps: BMState[] = [];
    const t = text || "FIND THE NAIVE PATTERN HERE AND THERE"; // Longer text
    const p = pattern || "PATTERN";
    const m = p.length;
    const n = t.length;
    const badCharTable: Record<string, number> = {};

    const record = (state: Partial<BMState>) => {
      const lastState = steps[steps.length - 1];
      steps.push({
        ...(lastState || {
          text: t, pattern: p, badCharTable: { ...badCharTable },
          phase: "BUILD_TABLE", phaseText: "초기화",
          i: 0, j: m - 1, matchFound: false, matchIndex: null, comparing: false,
          badCharIndex: -1, skipDistance: 0
        }),
        ...state,
        badCharTable: { ...badCharTable } // copy table dict
      });
    };

    record({ phaseText: "1단계: 나쁜 문자(Bad Character) 이동 표 생성" });

    // 1. Build Bad Character Table
    // Record rightmost occurrence of each character in pattern
    for (let k = 0; k < m; k++) {
      badCharTable[p[k]] = k;
      record({ phaseText: `패턴 문자 '${p[k]}'의 가장 오른쪽 등장 인덱스를 [${k}]로 기록` });
    }

    record({ phase: "SEARCH", phaseText: "2단계: 텍스트 탐색 시작 (비교는 뒤에서 앞으로 진행)", i: 0, j: m - 1 });

    // 2. Search (using only Bad Character Heuristic for simplicity)
    let s = 0; // s is shift of the pattern
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

      // If pattern is present
      if (j < 0) {
        matchIdx = s;
        record({ phase: "SEARCH", i: s, j: 0, matchFound: true, matchIndex: s, phaseText: `탐색 성공! 인덱스 [${s}] 에서 패턴 발견` });
        break; // Stop at first match
      } else {
        // Find bad character shift
        const badChar = t[s + j];
        const lastOccur = badCharTable[badChar] !== undefined ? badCharTable[badChar] : -1;

        let shift = Math.max(1, j - lastOccur);
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

    setHistory(steps);
    setStepIndex(0);
    setIsPlaying(false);
  }, [text, pattern]);

  const currentState = history[stepIndex] || {
    text: text || "", pattern: pattern || "", badCharTable: {},
    phase: "BUILD_TABLE", phaseText: "로딩 중...",
    i: 0, j: 0, matchFound: false, matchIndex: null, comparing: false,
    badCharIndex: -1, skipDistance: 0
  };

  const nextStep = useCallback(() => setStepIndex(p => Math.min(p + 1, history.length - 1)), [history.length]);
  const prevStep = useCallback(() => setStepIndex(p => Math.max(p - 1, 0)), []);
  const reset = useCallback(() => { setStepIndex(0); setIsPlaying(false); }, []);
  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

  useEffect(() => {
    if (isPlaying) {
      if (stepIndex >= history.length - 1) { setIsPlaying(false); return; }
      playIntervalRef.current = setTimeout(nextStep, 800);
    }
    return () => clearTimeout(playIntervalRef.current as NodeJS.Timeout);
  }, [isPlaying, stepIndex, history.length, nextStep]);

  return { state: currentState, controls: { nextStep, prevStep, reset, togglePlay, isPlaying }, progress: history.length > 0 ? stepIndex / (history.length - 1) : 0, isFinished: stepIndex === history.length - 1 };
}

// --- Visualizer Component ---
export function BoyerMooreSearchVisualizer({ data }: { data: number[] }) {
  // Use meaningful strings for Boyer-Moore demonstration
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const mappedText = data.map(n => chars[(n % 3) + 1]).join("") + "TEST STRING FIND HERE";
  const searchPattern = "STRING";
  const { state, controls, progress, isFinished } = useBoyerMooreSim(mappedText, searchPattern);
  const { text, pattern, badCharTable, phase, phaseText, i, j, matchFound, comparing, skipDistance, badCharIndex } = state;

  const svgWidth = 840;
  const svgHeight = 500;

  const boxSize = 32;
  const gap = 6;
  const totalBoxWidth = boxSize + gap;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-4">
      <div className="relative w-full aspect-[16/9] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
          <defs>
             <filter id="glow-bm" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="grid-bm" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid-bm)" />

          <text x="30" y="40" fill="#cbd5e1" fontSize="20" fontWeight="bold">Boyer-Moore Search (Bad Character Rule)</text>
          <text x="30" y="65" fill="#64748b" fontSize="14">{phaseText}</text>

          {/* Bad Character Table Visualizer */}
          <g transform="translate(40, 110)">
             <text x="0" y="-10" fill="#94a3b8" fontSize="12" fontWeight="bold">Bad Character Table (나쁜 문자 표)</text>
             <g transform="translate(0, 5)">
               {Object.keys(badCharTable).map((char, idx) => (
                 <g key={idx} transform={`translate(${idx * 45}, 0)`}>
                    <rect width="36" height="36" fill="#1e293b" stroke="#334155" rx="4" />
                    <text x="18" y="24" fill="#cbd5e1" fontSize="14" fontWeight="bold" textAnchor="middle">{char} = {badCharTable[char]}</text>
                 </g>
               ))}
               {Object.keys(badCharTable).length === 0 && (
                 <text x="20" y="24" fill="#64748b" fontSize="14" fontStyle="italic">비어 있음</text>
               )}
             </g>
          </g>

          {/* Text Section */}
          <g transform="translate(40, 260)" opacity={phase === "BUILD_TABLE" ? 0.3 : 1}>
            <text x="0" y="0" fill="#94a3b8" fontSize="12" fontWeight="bold">Text</text>
            {text.split('').map((char, idx) => {
               const x = idx * totalBoxWidth;
               const isMatchArea = matchFound && idx >= i && idx < i + pattern.length;

               let tFill = "#1e293b";
               let filter = "";

               if (isMatchArea) {
                 tFill = "#10b981"; filter = "url(#glow-bm)";
               } else if (phase === "SEARCH" && comparing && idx === i + j) {
                 tFill = "#3b82f6";
               } else if (phase === "SEARCH" && !comparing && skipDistance > 0 && idx === i + j) {
                 tFill = "#ef4444"; // Bad Character
               }

               return (
                 <g key={`bm-t-${idx}`} transform={`translate(${x}, 10)`}>
                    <rect width={boxSize} height={boxSize} fill={tFill} stroke="rgba(255,255,255,0.05)" rx="4" filter={filter} />
                    <text x={boxSize/2} y={boxSize/2 + 5} fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle">{char}</text>
                    <text x={boxSize/2} y={boxSize + 15} fill="#475569" fontSize="9" textAnchor="middle">{idx}</text>
                 </g>
               )
            })}
          </g>

          {/* Pattern Section */}
          <g transform="translate(40, 360)" opacity={phase === "BUILD_TABLE" ? 0.3 : 1}>
            <text x="0" y="-10" fill="#94a3b8" fontSize="12" fontWeight="bold">Pattern (비교 방향 ←)</text>

            <motion.g
               initial={false}
               animate={{ x: i * totalBoxWidth }}
               transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
               {pattern.split('').map((char, idx) => {
                  const x = idx * totalBoxWidth;
                  const isMatchedSoFar = idx > j && !matchFound && phase === "SEARCH";
                  const isCompareTarget = comparing && idx === j;

                  let pFill = "#334155";
                  if (matchFound) pFill = "#10b981";
                  else if (isMatchedSoFar) pFill = "#10b981";
                  else if (isCompareTarget) pFill = "#3b82f6";

                  return (
                     <g key={`bm-p-${idx}`} transform={`translate(${x}, 0)`}>
                        <rect width={boxSize} height={boxSize} fill={pFill} rx="4" />
                        <text x={boxSize/2} y={boxSize/2 + 5} fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle">{char}</text>
                        <text x={boxSize/2} y={boxSize + 15} fill="#475569" fontSize="9" textAnchor="middle">{idx}</text>
                     </g>
                  )
               })}

               {/* Pointer j */}
               {phase === "SEARCH" && !matchFound && j >= 0 && j < pattern.length && (
                  <motion.g
                     initial={false}
                     animate={{ x: j * totalBoxWidth }}
                  >
                     <path d={`M ${boxSize/2} -5 L ${boxSize/2 + 5} -13 L ${boxSize/2 - 5} -13 Z`} fill="#f43f5e" />
                     <text x={boxSize/2} y="-18" fill="#f43f5e" fontSize="12" fontWeight="bold" textAnchor="middle">j</text>
                  </motion.g>
               )}
            </motion.g>

            {/* Visual feedback for Skip Distance */}
            {skipDistance > 0 && !comparing && (
               <motion.g
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                 transform={`translate(${i * totalBoxWidth}, -40)`}
               >
                 {badCharIndex !== -1 ? (
                    <text x={boxSize/2} y="-10" fill="#f59e0b" fontSize="12" fontWeight="bold">+ {skipDistance}칸 점프 (문자 매칭)</text>
                 ) : (
                    <text x={boxSize/2} y="-10" fill="#ef4444" fontSize="12" fontWeight="bold">+ {skipDistance}칸 대폭 점프! (문자 없음)</text>
                 )}
               </motion.g>
            )}

          </g>

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
