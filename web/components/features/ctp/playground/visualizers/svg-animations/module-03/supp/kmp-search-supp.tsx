"use client";

import React from "react";
import { motion } from "framer-motion";

// 1. 접두사와 접미사 (Prefix & Suffix) SVG
export function PrefixSuffixSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
         <pattern id="grid-kmp-1" width="40" height="40" patternUnits="userSpaceOnUse">
           <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
         </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-kmp-1)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">접두사와 접미사</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">문자열의 앞부분(Prefix)과 뒷부분(Suffix)이 얼마나 일치하는지 파악하는 것이 KMP의 핵심입니다.</text>

      <g transform="translate(100, 150)">
         <text x="-60" y="-15" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Pattern</text>
         {['A', 'B', 'A', 'B', 'A', 'C'].map((char, i) => (
           <g key={i} transform={`translate(${i * 45}, -40)`}>
              <rect width="40" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
              <text x="20" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">{char}</text>
           </g>
         ))}

         {/* Prefix Highlight */}
         <motion.rect
            x="-2" y="-42" width="134" height="44"
            fill="none" stroke="#3b82f6" strokeWidth="3" rx="6" strokeDasharray="4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
         />
         <text x="65" y="25" fill="#3b82f6" fontSize="14" fontWeight="bold" textAnchor="middle">Prefix "ABA"</text>

         {/* Suffix Highlight */}
         <motion.rect
            x="88" y="-42" width="134" height="44"
            fill="none" stroke="#f43f5e" strokeWidth="3" rx="6" strokeDasharray="4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
         />
         <text x="155" y="45" fill="#f43f5e" fontSize="14" fontWeight="bold" textAnchor="middle">Suffix "ABA"</text>
      </g>

      <g transform="translate(420, 140)">
         <text x="0" y="-10" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">길이 5인 부분 "ABABA"에서</text>
         <text x="0" y="15" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">접두사와 접미사가</text>
         <text x="0" y="40" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">최대 3("ABA") 일치!</text>
      </g>
    </svg>
  );
}

// 2. LPS 테이블 (LPS Table) SVG
export function LPSTableSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
         <pattern id="grid-kmp-2" width="40" height="40" patternUnits="userSpaceOnUse">
           <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
         </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-kmp-2)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">LPS 테이블</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">각 인덱스까지의 문자열에서 일치하는 최대 Prefix-Suffix 길이를 미리 계산해 둡니다.</text>

      <g transform="translate(140, 110)">
         <text x="-60" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">패턴</text>
         {['A', 'B', 'A', 'B', 'A', 'C'].map((char, i) => (
           <g key={i} transform={`translate(${i * 50}, 0)`}>
              <rect width="45" height="40" fill="#3b82f6" rx="4" />
              <text x="22.5" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">{char}</text>
           </g>
         ))}

         <text x="-60" y="85" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">LPS</text>
         {[0, 0, 1, 2, 3, 0].map((val, i) => (
           <g key={i} transform={`translate(${i * 50}, 60)`}>
              <rect width="45" height="40" fill="none" stroke="#94a3b8" strokeWidth="2" rx="4" />
              <text x="22.5" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">{val}</text>
           </g>
         ))}
      </g>

      {/* Explanation Arrow */}
      <motion.path
         d="M 330 180 Q 380 230 460 210"
         fill="none" stroke="#10b981" strokeWidth="3"
         initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, repeat: Infinity }}
      />
      <text x="400" y="240" fill="#10b981" fontSize="14" fontWeight="bold">A B A B A 일 때</text>
      <text x="400" y="260" fill="#10b981" fontSize="14" fontWeight="bold">A B A // A B A 일치 (길이 3)</text>
    </svg>
  );
}

// 3. 점프 탐색 (Skip Logic) SVG
export function KMPSkipSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
         <pattern id="grid-kmp-3" width="40" height="40" patternUnits="userSpaceOnUse">
           <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
         </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-kmp-3)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">KMP의 점프 (Skip)</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">불일치가 발생하면, 일치했던 부분의 LPS를 이용해 중간 검사를 건너뜁니다.</text>

      <g transform="translate(60, 110)">
         <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="14" fontWeight="bold">Text</text>
         {['A', 'B', 'A', 'B', 'A', 'B', 'C'].map((char, i) => (
           <g key={i} transform={`translate(${i * 45}, 0)`}>
              <rect width="40" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
              <text x="20" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">{char}</text>
           </g>
         ))}

         {/* Pattern Initially */}
         <g transform="translate(0, 50)">
            <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="14" fontWeight="bold">Pattern</text>
            <rect width="40" height="40" fill="#10b981" rx="4" />
            <rect x="45" y="0" width="40" height="40" fill="#10b981" rx="4" />
            <rect x="90" y="0" width="40" height="40" fill="#10b981" rx="4" />
            <rect x="135" y="0" width="40" height="40" fill="#10b981" rx="4" />
            <rect x="180" y="0" width="40" height="40" fill="#10b981" rx="4" />
            <rect x="225" y="0" width="40" height="40" fill="#f43f5e" rx="4" />

            <text x="20" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">A</text>
            <text x="65" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">B</text>
            <text x="110" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">A</text>
            <text x="155" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">B</text>
            <text x="200" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">A</text>
            <text x="245" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">C</text>
         </g>

         <text x="235" y="110" fill="#f43f5e" fontSize="12" fontWeight="bold" textAnchor="middle">C ≠ B 불일치!</text>

         {/* Arrow representing jump */}
         <motion.path
            d="M 90 95 Q 135 150 180 95"
            fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="4"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1, duration: 1, repeat: Infinity, repeatDelay: 1 }}
         />
         <text x="135" y="165" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">LPS[4] = 3 즉, 앞의 3개("ABA")는 이미 일치함!</text>

         <motion.g
            transform="translate(90, 110)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
         >
            <rect width="40" height="40" fill="#3b82f6" opacity="0.3" rx="4" />
            <rect x="45" y="0" width="40" height="40" fill="#3b82f6" opacity="0.3" rx="4" />
            <rect x="90" y="0" width="40" height="40" fill="#3b82f6" opacity="0.3" rx="4" />

            <text x="20" y="25" fill="#3b82f6" fontSize="16" fontWeight="bold" textAnchor="middle">A</text>
            <text x="65" y="25" fill="#3b82f6" fontSize="16" fontWeight="bold" textAnchor="middle">B</text>
            <text x="110" y="25" fill="#3b82f6" fontSize="16" fontWeight="bold" textAnchor="middle">A</text>
            <text x="160" y="25" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">이어서 시작!</text>
         </motion.g>
      </g>
    </svg>
  );
}

// 4. 선형 시간 O(N+M) SVG
export function LinearTimeEfficiencySVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
         <pattern id="grid-kmp-4" width="40" height="40" patternUnits="userSpaceOnUse">
           <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
         </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-kmp-4)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">후진 없는 텍스트 포인터</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">KMP에서 텍스트를 순회하는 i 포인터는 절대 뒤로 돌아가지 않으므로 선형 시간을 보장합니다.</text>

      <g transform="translate(80, 140)">
         <rect width="400" height="10" fill="#e2e8f0" className="dark:fill-slate-800" rx="5" />
         <text x="200" y="-10" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">Text Array</text>

         <motion.g
            initial={{ x: 0 }}
            animate={{ x: 350 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
         >
            <polygon points="20,-20 30,-5 10,-5" fill="#3b82f6" />
            <text x="20" y="-25" fill="#3b82f6" fontSize="14" fontWeight="bold" textAnchor="middle">i</text>

            <circle cx="20" cy="5" r="8" fill="#10b981" />
         </motion.g>

         <text x="200" y="40" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">오직 직진만! (백트래킹 없음)</text>
         <text x="200" y="60" className="fill-slate-500" fontSize="14" textAnchor="middle">전체 시간 복잡도: O(N + M)</text>
      </g>
    </svg>
  );
}
