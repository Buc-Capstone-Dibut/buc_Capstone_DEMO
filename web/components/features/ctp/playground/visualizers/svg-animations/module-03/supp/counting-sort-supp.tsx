"use client";

import React from "react";
import { motion } from "framer-motion";

// 1. 도수 배열 생성 (Frequency Array) SVG
export function FrequencyArraySVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-counting-1" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-counting-1)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">도수 분포표 생성</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">배열의 각 값(Value)이 몇 번 등장하는지 카운트합니다.</text>

      {/* Input Array */}
      <g transform="translate(100, 100)">
        <text x="-70" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Input</text>
        <rect x="0" y="0" width="40" height="40" fill="#3b82f6" rx="4" />
        <text x="20" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">1</text>
        <rect x="50" y="0" width="40" height="40" fill="#10b981" rx="4" />
        <text x="70" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">3</text>
        <rect x="100" y="0" width="40" height="40" fill="#3b82f6" rx="4" />
        <text x="120" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">1</text>
        <rect x="150" y="0" width="40" height="40" fill="#f43f5e" rx="4" />
        <text x="170" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">0</text>
        <rect x="200" y="0" width="40" height="40" fill="#8b5cf6" rx="4" />
        <text x="220" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">2</text>
        <rect x="250" y="0" width="40" height="40" fill="#10b981" rx="4" />
        <text x="270" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">3</text>
      </g>

      {/* Animated Count Arrows */}
      <motion.path
        d="M 120 145 C 120 180, 200 180, 200 215"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "loop" }}
      />
      <motion.path
        d="M 220 145 C 220 180, 200 180, 200 215"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "loop", delay: 0.2 }}
      />

      {/* Count Array */}
      <g transform="translate(100, 220)">
        <text x="-70" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Counts</text>

        {/* Indices */}
        <text x="20" y="-10" className="fill-slate-500" fontSize="12" textAnchor="middle">0</text>
        <text x="70" y="-10" className="fill-slate-500" fontSize="12" textAnchor="middle">1</text>
        <text x="120" y="-10" className="fill-slate-500" fontSize="12" textAnchor="middle">2</text>
        <text x="170" y="-10" className="fill-slate-500" fontSize="12" textAnchor="middle">3</text>

        {/* Values */}
        <rect x="0" y="0" width="40" height="40" fill="none" stroke="#f43f5e" strokeWidth="2" rx="4" />
        <text x="20" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">1</text>

        <rect x="50" y="0" width="40" height="40" fill="none" stroke="#3b82f6" strokeWidth="2" rx="4" />
        <text x="70" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">2</text>

        <rect x="100" y="0" width="40" height="40" fill="none" stroke="#8b5cf6" strokeWidth="2" rx="4" />
        <text x="120" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">1</text>

        <rect x="150" y="0" width="40" height="40" fill="none" stroke="#10b981" strokeWidth="2" rx="4" />
        <text x="170" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">2</text>
      </g>

      {/* Explanation */}
      <g transform="translate(450, 160)">
         <text x="0" y="-20" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">인덱스 = 입력 값</text>
         <text x="0" y="10" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">배열 값 = 개수</text>
         <text x="0" y="40" className="fill-slate-500" fontSize="14" textAnchor="middle">값 '1'이 2개 있으므로</text>
         <text x="0" y="60" className="fill-slate-500" fontSize="14" textAnchor="middle">Counts[1] = 2</text>
      </g>
    </svg>
  );
}

// 2. 누적 도수 (Cumulative Sum) SVG
export function CumulativeSumSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-counting-2" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-counting-2)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">누적 도수 분포</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">배열 값을 누적하여 더하면 해당 값이 정렬될 '마지막 위치(순위)'를 알 수 있습니다.</text>

      <g transform="translate(100, 120)">
        <text x="-70" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Counts</text>
        <rect x="0" y="0" width="50" height="40" fill="none" stroke="#94a3b8" rx="4" />
        <text x="25" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">1</text>
        <rect x="60" y="0" width="50" height="40" fill="none" stroke="#94a3b8" rx="4" />
        <text x="85" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">2</text>
        <rect x="120" y="0" width="50" height="40" fill="none" stroke="#94a3b8" rx="4" />
        <text x="145" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">1</text>
        <rect x="180" y="0" width="50" height="40" fill="none" stroke="#94a3b8" rx="4" />
        <text x="205" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">2</text>

        <circle cx="55" cy="20" r="10" fill="#f43f5e" />
        <text x="55" y="25" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">+</text>
      </g>

      <motion.path
        d="M 125 165 C 125 190, 165 190, 165 215"
         fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeDasharray="5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop" }}
      />
      <motion.path
         d="M 185 165 C 185 190, 165 190, 165 215"
         fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeDasharray="5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop", delay: 0.5 }}
      />

      <g transform="translate(100, 220)">
        <text x="-70" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Result</text>

        {/* Cumulative Sum */}
        <rect x="0" y="0" width="50" height="40" fill="none" stroke="#3b82f6" strokeWidth="2" rx="4" />
        <text x="25" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">1</text>

        <rect x="60" y="0" width="50" height="40" fill="#10b981" rx="4" />
        <text x="85" y="25" className="fill-white" fontSize="18" fontWeight="bold" textAnchor="middle">3</text>
        <text x="85" y="-10" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle">1 + 2 = 3</text>

        <rect x="120" y="0" width="50" height="40" fill="none" stroke="#3b82f6" strokeWidth="2" rx="4" />
        <text x="145" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">4</text>

        <rect x="180" y="0" width="50" height="40" fill="none" stroke="#3b82f6" strokeWidth="2" rx="4" />
        <text x="205" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">6</text>
      </g>

      <g transform="translate(450, 180)">
         <text x="0" y="-30" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">의미</text>
         <text x="0" y="0" className="fill-slate-500" fontSize="14" textAnchor="middle">값 '1'은 배열에서</text>
         <text x="0" y="20" className="fill-slate-500" fontSize="14" textAnchor="middle">총 3번째 요소까지만</text>
         <text x="0" y="40" className="fill-slate-500" fontSize="14" textAnchor="middle">시작될 수 있습니다.</text>
      </g>
    </svg>
  );
}

// 3. 안정 정렬 유지 (Stable Sorting) SVG
export function StableSortingSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-counting-3" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-counting-3)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">역순 탐색과 안전 정렬</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">원본 배열의 뒤에서부터 순회하며 자리를 배치하면 기존 순서(안정성)가 보장됩니다.</text>

      <g transform="translate(150, 100)">
         {/* Original Array */}
         <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="14" fontWeight="bold">원본</text>
         <rect x="0" y="0" width="50" height="40" fill="#3b82f6" rx="4" />
         <text x="25" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">1_a</text>

         <rect x="60" y="0" width="50" height="40" fill="#10b981" rx="4" />
         <text x="85" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">2</text>

         <rect x="120" y="0" width="50" height="40" fill="#3b82f6" rx="4" />
         <text x="145" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">1_b</text>

         {/* Arrow scanning from behind */}
         <motion.path
           d="M 145 60 L 145 90 L 85 90 L 85 120"
           fill="none"
           stroke="#f43f5e"
           strokeWidth="3"
           initial={{ pathLength: 0 }}
           animate={{ pathLength: 1 }}
           transition={{ duration: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
         />
         <text x="170" y="60" fill="#f43f5e" fontSize="14" fontWeight="bold">뒤에서부터 읽음</text>

         {/* Placed Array */}
         <g transform="translate(0, 120)">
           <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="14" fontWeight="bold">배치</text>
           <rect x="0" y="0" width="50" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />

           <rect x="60" y="0" width="50" height="40" fill="#3b82f6" rx="4" />
           <text x="85" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">1_b</text>

           <rect x="120" y="0" width="50" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
         </g>
      </g>

      <g transform="translate(450, 150)">
         <text x="0" y="-10" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">1_b가 1_a보다</text>
         <text x="0" y="15" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">먼저 배치되어</text>
         <text x="0" y="40" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">뒤쪽 공간을 차지함</text>
      </g>

    </svg>
  );
}

// 4. 범위의 한계 (Range Restriction) SVG
export function RangeRestrictionSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-counting-4" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-counting-4)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">도수 정렬의 메모리 한계</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">배열의 최대값(K)에 비례하는 메모리가 필요하므로 값의 범위가 매우 크면 비효율적입니다.</text>

      <g transform="translate(100, 120)">
         {/* Small Array */}
         <text x="25" y="-10" className="fill-slate-700 dark:fill-slate-300" fontSize="14" fontWeight="bold" textAnchor="middle">Input</text>
         <rect x="0" y="0" width="50" height="40" fill="#3b82f6" rx="4" />
         <text x="25" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">5</text>

         <rect x="60" y="0" width="50" height="40" fill="#3b82f6" rx="4" />
         <text x="85" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">99999</text>

         {/* Memory allocation issue */}
         <g transform="translate(150, 0)">
            <motion.path
              d="M -20 20 L 20 20"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="4"
              strokeDasharray="4"
            />

            <rect x="40" y="-10" width="300" height="60" fill="none" stroke="#f43f5e" strokeWidth="2" rx="4" strokeDasharray="5" />
            <text x="190" y="15" fill="#f43f5e" fontSize="16" fontWeight="bold" textAnchor="middle">필요한 Counts 배열의 길이: 100,000</text>
            <text x="190" y="35" className="fill-slate-500" fontSize="12" textAnchor="middle">데이터는 2개분인데 낭비가 심함!</text>
         </g>
      </g>
    </svg>
  );
}
