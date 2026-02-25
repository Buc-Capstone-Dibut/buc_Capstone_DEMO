"use client";

import React from "react";
import { motion } from "framer-motion";

// 1. 역순 비교 (Right-to-Left Comparison) SVG
export function RightToLeftCompareSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-bm-1" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-bm-1)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">뒤에서부터 비교하기</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">패턴은 오프셋(i)을 오른쪽으로 이동시키지만, 문자 비교(j)는 패턴의 맨 마지막 문자부터 역순으로 진행합니다.</text>

      <g transform="translate(100, 130)">
        <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Text</text>
        {['S', 'K', 'I', 'P', ' ', 'T', 'H', 'I', 'S'].map((char, i) => (
          <g key={i} transform={`translate(${i * 45}, 0)`}>
             <rect width="40" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
             <text x="20" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">{char}</text>
          </g>
        ))}

        <g transform="translate(90, 60)">
           <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Pattern</text>
           <rect x="0" y="0" width="40" height="40" fill="#3b82f6" rx="4" />
           <rect x="45" y="0" width="40" height="40" fill="#3b82f6" rx="4" />
           <rect x="90" y="0" width="40" height="40" fill="#3b82f6" rx="4" />
           <rect x="135" y="0" width="40" height="40" fill="#10b981" rx="4" />

           <text x="20" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">T</text>
           <text x="65" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">H</text>
           <text x="110" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">I</text>
           <text x="155" y="25" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle">S</text>

           {/* Backward Arrow */}
           <motion.path
              d="M 155 -15 L 20 -15"
              fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray="6"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, repeat: Infinity }}
           />
           <polygon points="15,-15 25,-22 25,-8" fill="#f43f5e" />
           <text x="90" y="-25" fill="#f43f5e" fontSize="14" fontWeight="bold" textAnchor="middle">역순(Right-to-Left) 비교</text>
        </g>
      </g>
    </svg>
  );
}

// 2. 나쁜 문자 규칙 (Bad Character Rule) SVG
export function BadCharacterRuleSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-bm-2" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-bm-2)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">나쁜 문자 규칙 (Bad Character Rule)</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">불일치한 텍스트의 문자(나쁜 문자)가 패턴 내에 없다면, 해당 문자를 완전히 건너뜁니다!</text>

      <g transform="translate(100, 100)">
        <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Text</text>
        {['F', 'I', 'N', 'D', ' ', 'H', 'E', 'R', 'E'].map((char, i) => (
          <g key={i} transform={`translate(${i * 45}, 0)`}>
             <rect width="40" height="40" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
             <text x="20" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="18" fontWeight="bold" textAnchor="middle">{char}</text>
          </g>
        ))}

        {/* Unmatched Character 'D' */}
        <motion.rect x="135" y="0" width="40" height="40" fill="none" stroke="#f43f5e" strokeWidth="4" rx="4" />
        <text x="155" y="-10" fill="#f43f5e" fontSize="14" fontWeight="bold" textAnchor="middle">나쁜 문자 'D'</text>

        {/* Pattern Stage 1 */}
        <g transform="translate(0, 60)">
           <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Pattern</text>
           <rect x="0" y="0" width="40" height="40" fill="#3b82f6" opacity="0.4" rx="4" />
           <rect x="45" y="0" width="40" height="40" fill="#3b82f6" opacity="0.4" rx="4" />
           <rect x="90" y="0" width="40" height="40" fill="#3b82f6" opacity="0.4" rx="4" />
           <rect x="135" y="0" width="40" height="40" fill="#f43f5e" opacity="0.8" rx="4" />

           <text x="20" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="0.5">H</text>
           <text x="65" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="0.5">E</text>
           <text x="110" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="0.5">R</text>
           <text x="155" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="1">E</text>
        </g>

        {/* Arrow Skip */}
        <motion.path
           d="M 155 110 Q 245 150 335 110"
           fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="4"
           initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1, duration: 1, repeat: Infinity, repeatDelay: 1 }}
        />
        <text x="245" y="160" fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle">패턴에 'D'가 없으므로 D 다음으로 대폭 점프!</text>

        {/* Pattern Stage 2 */}
        <motion.g
           transform="translate(180, 60)"
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
        >
           <rect x="0" y="0" width="40" height="40" fill="#10b981" rx="4" />
           <rect x="45" y="0" width="40" height="40" fill="#10b981" rx="4" />
           <rect x="90" y="0" width="40" height="40" fill="#10b981" rx="4" />
           <rect x="135" y="0" width="40" height="40" fill="#10b981" rx="4" />

           <text x="20" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">H</text>
           <text x="65" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">E</text>
           <text x="110" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">R</text>
           <text x="155" y="25" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">E</text>
        </motion.g>

      </g>
    </svg>
  );
}

// 3. 패턴 내 위치로 맞추기 (Aligning Bad Character) SVG
export function AlignBadCharacterSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-bm-3" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-bm-3)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">나쁜 문자가 패턴에 있는 경우</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">해당 나쁜 문자가 패턴 내의 가장 오른쪽 위치와 일치하도록 패턴을 이동시킵니다.</text>

      <g transform="translate(100, 110)">
        <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Text</text>
        {['S', 'U', 'M', 'M', 'E', 'R', 'T', 'I', 'M', 'E'].map((char, i) => (
          <g key={i} transform={`translate(${i * 40}, 0)`}>
             <rect width="36" height="36" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
             <text x="18" y="23" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">{char}</text>
          </g>
        ))}

        {/* Unmatched Character 'M' */}
        <motion.rect x="120" y="0" width="36" height="36" fill="none" stroke="#f59e0b" strokeWidth="4" rx="4" />
        <text x="138" y="-10" fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">나쁜 문자 'M'</text>
        <text x="338" y="80" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle">'M'을 일치시킴</text>

        {/* Pattern Stage 1 */}
        <g transform="translate(0, 50)">
           <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Pattern</text>
           <rect x="0" y="0" width="36" height="36" fill="#3b82f6" opacity="0.4" rx="4" />
           <rect x="40" y="0" width="36" height="36" fill="#3b82f6" opacity="0.4" rx="4" />
           <rect x="80" y="0" width="36" height="36" fill="#f59e0b" opacity="0.8" rx="4" />
           <rect x="120" y="0" width="36" height="36" fill="#f43f5e" opacity="0.8" rx="4" />

           <text x="18" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="0.5">T</text>
           <text x="58" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="0.5">I</text>
           <text x="98" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="1">M</text>
           <text x="138" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="1">E</text>
        </g>

        {/* Arrow Align */}
        <motion.path
           d="M 138 95 Q 158 130 178 95"
           fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4"
           initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1, duration: 1, repeat: Infinity, repeatDelay: 1 }}
        />

        {/* Pattern Stage 2 (Aligned) */}
        <motion.g
           transform="translate(40, 50)"
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
        >
           <rect x="0" y="0" width="36" height="36" fill="#3b82f6" rx="4" />
           <rect x="40" y="0" width="36" height="36" fill="#3b82f6" rx="4" />
           <rect x="80" y="0" width="36" height="36" fill="#10b981" rx="4" />
           <rect x="120" y="0" width="36" height="36" fill="#3b82f6" rx="4" />

           <text x="18" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">T</text>
           <text x="58" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">I</text>
           <text x="98" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">M</text>
           <text x="138" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">E</text>
        </motion.g>

      </g>
    </svg>
  );
}

// 4. 착한 접미사 규칙 (Good Suffix Rule) SVG
export function GoodSuffixRuleSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans bg-slate-50 dark:bg-slate-900 rounded-xl">
      <defs>
        <pattern id="grid-bm-4" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-bm-4)" />

      <text x="30" y="40" className="fill-slate-800 dark:fill-slate-200" fontSize="24" fontWeight="bold">착한 접미사 규칙 (지식 플러스+)</text>
      <text x="30" y="65" className="fill-slate-600 dark:fill-slate-400" fontSize="14">이미 일치함을 확인한 "착한 접미사" 패턴이 다시 나오도록 안전하게 건너뜁니다.</text>

      <g transform="translate(100, 110)">
        {/* Text */}
        <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Text</text>
        {['T', 'O', 'M', 'A', 'T', 'O', 'B', 'M', 'A', 'T', 'O'].map((char, i) => (
          <g key={i} transform={`translate(${i * 40}, 0)`}>
             <rect width="36" height="36" fill="#e2e8f0" className="dark:fill-slate-800" rx="4" />
             <text x="18" y="23" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold" textAnchor="middle">{char}</text>
          </g>
        ))}

        {/* Pattern Stage 1 */}
        <g transform="translate(0, 50)">
           <text x="-40" y="25" className="fill-slate-700 dark:fill-slate-300" fontSize="16" fontWeight="bold">Pattern</text>
           <rect x="0" y="0" width="36" height="36" fill="#3b82f6" opacity="0.4" rx="4" />
           <rect x="40" y="0" width="36" height="36" fill="#3b82f6" opacity="0.4" rx="4" />
           <rect x="80" y="0" width="36" height="36" fill="#f43f5e" opacity="0.8" rx="4" />
           <rect x="120" y="0" width="36" height="36" fill="#10b981" opacity="1" rx="4" />
           <rect x="160" y="0" width="36" height="36" fill="#10b981" opacity="1" rx="4" />
           <rect x="200" y="0" width="36" height="36" fill="#10b981" opacity="1" rx="4" />

           <text x="18" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="0.5">P</text>
           <text x="58" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="0.5">O</text>
           <text x="98" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="1">M</text>
           <text x="138" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="1">A</text>
           <text x="178" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="1">T</text>
           <text x="218" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="1">O</text>
        </g>
        <text x="178" y="105" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle">이미 일치한 접미사 "ATO"</text>

        {/* Arrow Match */}
        <motion.path
           d="M 178 115 Q 260 160 340 100"
           fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="4"
           initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1, duration: 1, repeat: Infinity, repeatDelay: 1 }}
        />

        {/* Pattern Stage 2 */}
        <motion.g
           transform="translate(160, 50)"
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
        >
           <rect x="0" y="0" width="36" height="36" fill="#3b82f6" rx="4" />
           <rect x="40" y="0" width="36" height="36" fill="#3b82f6" rx="4" />
           <rect x="80" y="0" width="36" height="36" fill="#3b82f6" rx="4" />
           <rect x="120" y="0" width="36" height="36" fill="#10b981" rx="4" />
           <rect x="160" y="0" width="36" height="36" fill="#10b981" rx="4" />
           <rect x="200" y="0" width="36" height="36" fill="#10b981" rx="4" />

           <text x="18" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">P</text>
           <text x="58" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">O</text>
           <text x="98" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">M</text>
           <text x="138" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">A</text>
           <text x="178" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">T</text>
           <text x="218" y="23" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">O</text>
        </motion.g>

      </g>
    </svg>
  );
}
