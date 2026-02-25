"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, StepBack } from "lucide-react";

// --- Types ---
type KMPState = {
  text: string;
  pattern: string;
  lps: number[];
  phase: "BUILD_LPS" | "SEARCH" | "DONE";
  phaseText: string;

  // For BUILD_LPS phase
  len: number; // length of previous longest prefix suffix
  lpsIndex: number; // iterating through pattern (i)

  // For SEARCH phase
  i: number; // text pointer
  j: number; // pattern pointer
  matchFound: boolean;
  matchIndex: number | null;
  comparing: boolean;
};

// --- Hook ---
export function useKMPSim(text: string, pattern: string) {
  const [history, setHistory] = useState<KMPState[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const steps: KMPState[] = [];
    const t = text || "ABABDABACDABABCABAB";
    const p = pattern || "ABABCABAB";
    const m = p.length;
    const n = t.length;
    const lps = new Array(m).fill(0);

    const record = (state: Partial<KMPState>) => {
      const lastState = steps[steps.length - 1];
      steps.push({
        ...(lastState || {
          text: t, pattern: p, lps: [...lps],
          phase: "BUILD_LPS", phaseText: "초기화",
          len: 0, lpsIndex: 1, i: 0, j: 0,
          matchFound: false, matchIndex: null, comparing: false
        }),
        ...state,
        lps: [...lps] // always copy current LPS
      });
    };

    record({ phaseText: "1단계: 패턴의 LPS 배열 생성 시작" });

    // 1. Build LPS array
    let len = 0;
    let lA = 1;
    lps[0] = 0;

    record({ lpsIndex: 1, len: 0, phaseText: `LPS[0]은 항상 0입니다.` });

    while (lA < m) {
      record({ phase: "BUILD_LPS", lpsIndex: lA, len, comparing: true, phaseText: `'${p[lA]}' 와 '${p[len]}' 비교` });
      if (p[lA] === p[len]) {
        len++;
        lps[lA] = len;
        record({ lpsIndex: lA, len, comparing: false, phaseText: `일치! LPS[${lA}] = ${len}` });
        lA++;
      } else {
        record({ lpsIndex: lA, len, comparing: false, phaseText: `불일치.` });
        if (len !== 0) {
          len = lps[len - 1];
          record({ lpsIndex: lA, len, phaseText: `이전 접두사 길이(len)를 ${len}로 줄여 다시 검사` });
        } else {
          lps[lA] = 0;
          record({ lpsIndex: lA, len: 0, phaseText: `더 이상 줄일 수 없어 LPS[${lA}] = 0` });
          lA++;
        }
      }
    }

    record({ phase: "SEARCH", phaseText: "2단계: LPS 배열을 이용한 텍스트 탐색 시작", i: 0, j: 0 });

    // 2. Search
    let i = 0;
    let j = 0;
    let matchIdx = -1;

    while ((n - i) >= (m - j)) {
      record({ phase: "SEARCH", i, j, comparing: true, phaseText: `텍스트 '${t[i]}' 와 패턴 '${p[j]}' 비교` });
      if (p[j] === t[i]) {
        record({ phase: "SEARCH", i, j, comparing: false, phaseText: `일치! 다음 문자로 포인터 이동 (i++, j++)` });
        j++;
        i++;
      }

      if (j === m) {
        matchIdx = i - j;
        record({ phase: "SEARCH", i, j: m-1, matchFound: true, matchIndex: matchIdx, phaseText: `탐색 성공! 인덱스 [${matchIdx}] 에서 매칭` });
        // IF we wanted to find all matches, we'd do j = lps[j - 1] here, but we stop at first match
        break;
      } else if (i < n && p[j] !== t[i]) {
        record({ phase: "SEARCH", i, j, comparing: false, phaseText: `불일치 발생!` });
        if (j !== 0) {
          j = lps[j - 1];
          record({ phase: "SEARCH", i, j, phaseText: `패턴 포인터 j를 LPS[${j}]로 점프하여 건너뜀 (Skip)` });
        } else {
          record({ phase: "SEARCH", i, j, phaseText: `제자리 불일치, 텍스트 포인터 i만 전진` });
          i++;
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
    text: text || "", pattern: pattern || "", lps: [],
    phase: "BUILD_LPS", phaseText: "로딩 중...",
    len: 0, lpsIndex: 1, i: 0, j: 0,
    matchFound: false, matchIndex: null, comparing: false
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
export function KMPSearchVisualizer({ data }: { data: number[] }) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // Convert numbers to text, create a predictable scenario for KMP
  const mappedText = data.map(n => chars[(n % 3) + 1]).join("") + "BABC"; // Only A,B,C mostly
  // For educational purposes, a fixed pattern is better, but we will derive it
  const patternExtracted = "ABABC";
  const searchPattern = mappedText.includes(patternExtracted) ? patternExtracted : mappedText.substring(2, 7) || "ABABC";

  const { state, controls, progress, isFinished } = useKMPSim(mappedText, searchPattern);
  const { text, pattern, lps, phase, phaseText, len, lpsIndex, i, j, matchFound, comparing } = state;

  const svgWidth = 840;
  const svgHeight = 500;

  const boxSize = 36;
  const gap = 8;
  const totalBoxWidth = boxSize + gap;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-4">
      <div className="relative w-full aspect-[16/9] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full font-sans">
          <defs>
             <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          <text x="30" y="40" fill="#cbd5e1" fontSize="20" fontWeight="bold">KMP (Knuth-Morris-Pratt)</text>
          <text x="30" y="65" fill="#64748b" fontSize="14">{phaseText}</text>

          {/* LPS Building Section */}
          <g transform="translate(50, 110)">
            <text x="0" y="0" fill={phase === "BUILD_LPS" ? "#cbd5e1" : "#475569"} fontSize="14" fontWeight="bold">LPS Array</text>

            {pattern.split('').map((char, idx) => {
               const x = idx * totalBoxWidth;
               const isActive = phase === "BUILD_LPS" && idx === lpsIndex;
               const isComparingLen = phase === "BUILD_LPS" && comparing && idx === len;

               let pFill = "#1e293b";
               let pStroke = "rgba(255,255,255,0.1)";
               let tColor = "#94a3b8";

               if (isActive) {
                 pFill = "#3b82f6"; pStroke = "#60a5fa"; tColor = "#fff";
               } else if (isComparingLen) {
                 pFill = "#10b981"; pStroke = "#34d399"; tColor = "#fff";
               } else if (phase === "SEARCH" && idx < j && !matchFound) {
                 pFill = "rgba(16, 185, 129, 0.2)"; // Soft green
               }

               return (
                  <g key={`lps-p-${idx}`} transform={`translate(${x}, 15)`}>
                     <rect width={boxSize} height={boxSize} fill={pFill} stroke={pStroke} rx="4" />
                     <text x={boxSize/2} y={boxSize/2 + 5} fill={tColor} fontSize="16" fontWeight="bold" textAnchor="middle">{char}</text>

                     {/* LPS Value Box */}
                     <rect y={boxSize + 10} width={boxSize} height={boxSize} fill="none" stroke="#475569" rx="4" />
                     <text x={boxSize/2} y={boxSize + 10 + boxSize/2 + 5} fill="#cbd5e1" fontSize="16" fontWeight="bold" textAnchor="middle">
                       {lps[idx] !== undefined && (idx < lpsIndex || phase !== "BUILD_LPS") ? lps[idx] : ""}
                     </text>
                     <text x={boxSize/2} y={boxSize * 2 + 25} fill="#475569" fontSize="10" textAnchor="middle">{idx}</text>
                  </g>
               );
            })}

            {/* Pointers for LPS Phase */}
            {phase === "BUILD_LPS" && (
              <motion.g
                 initial={false}
                 animate={{ x: len * totalBoxWidth }}
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                  <path d={`M ${boxSize/2} 0 L ${boxSize/2 + 5} -8 L ${boxSize/2 - 5} -8 Z`} fill="#10b981" />
                  <text x={boxSize/2} y="-12" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle">len</text>
              </motion.g>
            )}
            {phase === "BUILD_LPS" && lpsIndex < pattern.length && (
              <motion.g
                 initial={false}
                 animate={{ x: lpsIndex * totalBoxWidth }}
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                 <path d={`M ${boxSize/2} 115 L ${boxSize/2 + 5} 123 L ${boxSize/2 - 5} 123 Z`} fill="#3b82f6" />
                 <text x={boxSize/2} y="135" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">i</text>
              </motion.g>
            )}
          </g>

          {/* Search Section */}
          <g transform="translate(50, 320)" opacity={phase === "BUILD_LPS" ? 0.3 : 1}>
            <text x="0" y="0" fill={phase === "SEARCH" ? "#cbd5e1" : "#475569"} fontSize="14" fontWeight="bold">Text Search</text>

            {/* Text Array */}
            {text.split('').map((char, idx) => {
               const x = idx * totalBoxWidth;
               const isMatchArea = matchFound && idx >= i - j && idx < i - j + pattern.length;
               let tFill = "#1e293b";
               let filter = "";

               if (isMatchArea) {
                 tFill = "#10b981"; filter = "url(#glow)";
               } else if (phase === "SEARCH" && comparing && idx === i) {
                 tFill = "#3b82f6";
               }

               return (
                 <g key={`t-${idx}`} transform={`translate(${x}, 15)`}>
                    <rect width={boxSize} height={boxSize} fill={tFill} stroke="rgba(255,255,255,0.05)" rx="4" filter={filter} />
                    <text x={boxSize/2} y={boxSize/2 + 5} fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">{char}</text>
                    <text x={boxSize/2} y={boxSize + 15} fill="#475569" fontSize="10" textAnchor="middle">{idx}</text>
                 </g>
               )
            })}

            {/* Moving Pattern Array */}
            {phase !== "BUILD_LPS" && (
            <motion.g
               initial={false}
               animate={{ x: (i - j) * totalBoxWidth, y: 80 }}
               transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
               {pattern.split('').map((char, idx) => {
                  const x = idx * totalBoxWidth;
                  const isMatchedSoFar = idx < j && !matchFound;
                  const isCompareTarget = comparing && idx === j;

                  let pFill = "#334155";
                  if (matchFound) pFill = "#10b981";
                  else if (isMatchedSoFar) pFill = "#10b981";
                  else if (isCompareTarget) pFill = "#3b82f6";

                  return (
                     <g key={`sp-${idx}`} transform={`translate(${x}, 0)`}>
                        <rect width={boxSize} height={boxSize} fill={pFill} rx="4" />
                        <text x={boxSize/2} y={boxSize/2 + 5} fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">{char}</text>
                     </g>
                  )
               })}

               {/* Pointer j */}
               {!matchFound && j < pattern.length && (
                  <motion.g
                     initial={false}
                     animate={{ x: j * totalBoxWidth }}
                  >
                     <path d={`M ${boxSize/2} -5 L ${boxSize/2 + 5} -13 L ${boxSize/2 - 5} -13 Z`} fill="#f43f5e" />
                     <text x={boxSize/2} y="-18" fill="#f43f5e" fontSize="12" fontWeight="bold" textAnchor="middle">j</text>
                  </motion.g>
               )}
            </motion.g>
            )}

            {/* Pointer i (Global Text Pointer) */}
            {phase !== "BUILD_LPS" && !matchFound && i < text.length && (
              <motion.g
                 initial={false}
                 animate={{ x: i * totalBoxWidth }}
                 transition={{ type: "spring", stiffness: 200, damping: 25 }}
              >
                  <path d={`M ${boxSize/2} 0 L ${boxSize/2 + 5} -8 L ${boxSize/2 - 5} -8 Z`} fill="#ef4444" />
                  <text x={boxSize/2} y="-12" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">i</text>
              </motion.g>
            )}

            {/* Visual link for matching */}
            {phase === "SEARCH" && comparing && (
               <motion.line
                  x1={i * totalBoxWidth + boxSize/2} y1="51"
                  x2={i * totalBoxWidth + boxSize/2} y2="80"
                  stroke="#3b82f6" strokeWidth="2" strokeDasharray="4"
               />
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
