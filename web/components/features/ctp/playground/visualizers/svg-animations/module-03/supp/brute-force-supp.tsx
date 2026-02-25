"use client";

import React from "react";
import { motion } from "framer-motion";

// 1. 단순 반복 (Brute Force Scan) SVG
export function BruteForceScanSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-bf-1" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-bf-1)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">브루트 포스 탐색</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">가능한 모든 시작 위치에서 패턴을 하나씩 대조해 보는 직관적인 방식입니다.</text>

      {/* Text Base */}
      <g transform="translate(100, 120)">
        <text x="-60" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Text</text>
        {['A', 'B', 'C', 'A', 'B', 'D'].map((char, i) => (
          <g key={i} transform={`translate(${i * 45}, 0)`}>
             <rect width="40" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
             <text x="20" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">{char}</text>
          </g>
        ))}
      </g>

      {/* Pattern Scanning */}
      <motion.g
         transform="translate(100, 180)"
         initial={{ x: 0 }}
         animate={{ x: [0, 45, 90, 135] }}
         transition={{ duration: 4, repeat: Infinity, times: [0, 0.33, 0.66, 1], ease: "linear" }}
      >
        <text x="-60" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Pattern</text>
        {['A', 'B', 'D'].map((char, i) => (
          <g key={i} transform={`translate(${i * 45}, 0)`}>
             <rect width="40" height="40" fill="#3b82f6" rx="4" />
             <text x="20" y="25" fill="#ffffff" fontSize="18" fontWeight="bold" textAnchor="middle">{char}</text>
          </g>
        ))}
      </motion.g>

    </svg>
  );
}

// 2. 인덱스 투 포인터 (Two Pointer Matching) SVG
export function TwoPointerMatchingSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-bf-2" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-bf-2)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">두 개의 포인터 (i, j)</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">텍스트를 가리키는 i 포인터와 패턴을 가리키는 j 포인터가 동시에 이동하며 대조합니다.</text>

      <g transform="translate(150, 120)">
        {/* Text */}
        <text x="-40" y="25" className="fill-slate-500" fontSize="16" fontWeight="bold">i</text>
        <rect x="0" y="0" width="40" height="40" fill="#10b981" rx="4" />
        <text x="20" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">X</text>

        <rect x="45" y="0" width="40" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
        <text x="65" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">Y</text>

        {/* Pointer Line */}
        <motion.line
           x1="20" y1="45" x2="20" y2="75"
           stroke="#f43f5e" strokeWidth="3" strokeDasharray="4"
        />

        {/* Pattern */}
        <g transform="translate(0, 80)">
           <text x="-40" y="25" className="fill-slate-500" fontSize="16" fontWeight="bold">j</text>
           <rect x="0" y="0" width="40" height="40" fill="#10b981" rx="4" />
           <text x="20" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">X</text>

           <rect x="45" y="0" width="40" height="40" fill="#3b82f6" rx="4" />
           <text x="65" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">Z</text>
        </g>

        <motion.path
            d="M 120 40 Q 150 60 120 80"
            fill="none" stroke="#10b981" strokeWidth="3"
        />
        <text x="160" y="65" fill="#10b981" fontSize="16" fontWeight="bold">일치! (i++, j++)</text>
      </g>
    </svg>
  );
}

// 3. 최악의 시나리오 (Worst Case) SVG
export function WorstCaseMatchSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-bf-3" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-bf-3)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">최악의 시나리오 O(NM)</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">패턴의 끝에서만 불일치가 발생하는 경우 불필요한 비교가 폭증합니다.</text>

      <g transform="translate(100, 100)">
        {/* Text: AAAAAAB */}
        {['A', 'A', 'A', 'A', 'A', 'A', 'B'].map((char, idx) => (
           <g key={idx} transform={`translate(${idx * 45}, 0)`}>
             <rect width="40" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
             <text x="20" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">{char}</text>
           </g>
        ))}

        {/* Pattern: AAAB */}
        <motion.g
           transform="translate(45, 60)"
           initial={{ y: 0 }}
           animate={{ y: [0, 40, 80] }}
           transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
           {['A', 'A', 'A', 'B'].map((char, idx) => {
              const matches = idx < 3;
              return (
                <g key={idx} transform={`translate(${idx * 45}, 0)`}>
                   <rect width="40" height="40" fill={matches ? "#10b981" : "#f43f5e"} rx="4" />
                   <text x="20" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">{char}</text>
                </g>
              )
           })}
           <text x="200" y="25" fill="#f43f5e" fontSize="14" fontWeight="bold">끝에서 실패!</text>
        </motion.g>
      </g>
    </svg>
  );
}

// 4. 백트래킹 (Backtracking) SVG
export function PatternBacktrackSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-bf-4" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-bf-4)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">i 포인터의 과격한 회귀</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">불일치가 발생하면 텍스트 포인터 i가 탐색을 시작했던 위치의 바로 다음 칸으로 되돌아갑니다.</text>

      <g transform="translate(100, 140)">
         <rect x="0" y="0" width="200" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
         <text x="100" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">Text Array</text>

         <rect x="80" y="-40" width="120" height="30" fill="#3b82f6" rx="4" />
         <text x="140" y="-20" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">Pattern</text>

         <circle cx="180" cy="0" r="10" fill="#f43f5e" />
         <text x="180" y="4" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">x</text>
         <text x="210" y="-5" fill="#f43f5e" fontSize="14" fontWeight="bold">불일치!</text>

         <motion.path
            d="M 180 50 Q 150 100 90 60 L 90 50"
            fill="none" stroke="#f43f5e" strokeWidth="3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "loop", repeatDelay: 1 }}
         />
         <circle cx="90" cy="45" r="4" fill="#f43f5e" />
         <text x="135" y="110" fill="#f43f5e" fontSize="14" fontWeight="bold" textAnchor="middle">시작점 + 1 위치로 되돌아감</text>
      </g>
    </svg>
  );
}
