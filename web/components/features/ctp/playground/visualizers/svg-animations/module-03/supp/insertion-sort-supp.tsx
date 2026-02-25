"use client";

import React from "react";
import { motion } from "framer-motion";

// SVG 필터 (공통)
const NeonGlowFilters = () => (
  <defs>
    <filter id="neon-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="neon-glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="neon-glow-rose" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="neon-glow-orange" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" opacity="0.2" />
    </pattern>
  </defs>
);

// 1. 적절한 위치 탐색 (Target Position Search)
const TargetSearchSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="50" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold" textAnchor="middle">이미 정렬된 구역에서 내 자리를 찾는다</text>

      <g transform="translate(150, 80)">
        {/* 정렬된 구역 */}
        <text x="40" y="-15" fill="#10b981" fontSize="14" fontWeight="bold">정렬된 구역 (Sorted)</text>

        <rect x="0" y="0" width="50" height="50" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="25" y="32" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">2</text>

        <rect x="60" y="0" width="50" height="50" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="85" y="32" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">7</text>

        <rect x="120" y="0" width="50" height="50" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="145" y="32" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">9</text>

        {/* 현재 타겟 */}
        <rect x="180" y="-40" width="50" height="50" rx="8" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" strokeWidth="2" />
        <text x="205" y="-8" fill="#06b6d4" fontSize="20" fontWeight="bold" textAnchor="middle">4</text>
        <text x="205" y="-55" fill="#06b6d4" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-cyan)">현재 값 (target)</text>

        {/* 탐색 화살표 */}
        <path d="M 180 -15 C 160 -15, 150 15, 145 15" fill="none" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="4" />
        <text x="180" y="25" fill="#f97316" fontSize="12" textAnchor="middle">9 &gt; 4 ? (O)</text>

        <path d="M 120 -15 C 100 -15, 90 15, 85 15" fill="none" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="4" />
        <text x="110" y="5" fill="#f97316" fontSize="12" textAnchor="middle">7 &gt; 4 ? (O)</text>

        <path d="M 60 -15 C 40 -15, 30 15, 25 15" fill="none" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="4" />
        <text x="45" y="-2" fill="#10b981" fontSize="12" textAnchor="middle">2 &gt; 4 ? (X)</text>

        {/* 삽입 위치 */}
        <path d="M 205 -40 L 205 -120 L 55 -120 L 55 -10" fill="none" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#arrow)" />
        <text x="130" y="-130" fill="#06b6d4" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-cyan)">여기가 내 자리다!</text>
      </g>
    </svg>
  );
};

// 2. 데이터 밀어내기 (Shifting Elements)
const ShiftingElementsSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="50" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold" textAnchor="middle">자리를 만들기 위해 오른쪽으로 한 칸씩 밀어내기</text>

      <g transform="translate(150, 120)">
        <rect x="-10" y="-20" width="250" height="90" rx="12" fill="none" stroke="hsl(var(--border))" strokeDasharray="4" />

        <rect x="0" y="0" width="50" height="50" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="25" y="32" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">2</text>

        {/* 이동하는 요소들 */}
        <rect x="60" y="0" width="50" height="50" rx="8" fill="rgba(249, 115, 22, 0.1)" stroke="#f97316" strokeWidth="2" />
        <text x="85" y="32" fill="#f97316" fontSize="20" fontWeight="bold" textAnchor="middle">7</text>
        <path d="M 85 -5 C 95 -30, 135 -30, 145 -5" fill="none" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrow)" />

        <rect x="120" y="0" width="50" height="50" rx="8" fill="rgba(249, 115, 22, 0.1)" stroke="#f97316" strokeWidth="2" />
        <text x="145" y="32" fill="#f97316" fontSize="20" fontWeight="bold" textAnchor="middle">9</text>
        <path d="M 145 -5 C 155 -30, 195 -30, 205 -5" fill="none" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrow)" />

        <rect x="180" y="0" width="50" height="50" rx="8" fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4" />
        <text x="205" y="32" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">빈 칸</text>

        <rect x="180" y="80" width="50" height="50" rx="8" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" strokeWidth="2" />
        <text x="205" y="112" fill="#06b6d4" fontSize="20" fontWeight="bold" textAnchor="middle">4</text>

        <path d="M 180 105 L 85 105 L 85 60" fill="none" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#arrow)" />
        <text x="140" y="125" fill="#06b6d4" fontSize="14" fontWeight="bold" filter="url(#neon-glow-cyan)">Shift 후 빈자리에 삽입</text>
      </g>
    </svg>
  );
};

// 3. 점진적 확장 (Incremental Expansion)
const IncrementalExpansionSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="40" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">정렬된 구역이 왼쪽부터 한 칸씩 커진다 (마치 카드 정리)</text>

      <g transform="translate(150, 70)">
        <text x="-40" y="25" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="end">Step 1</text>
        <rect x="0" y="0" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="20" y="25" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">5</text>
        <rect x="50" y="0" width="40" height="40" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="70" y="25" fill="hsl(var(--foreground))" fontSize="16" textAnchor="middle">2</text>
        <rect x="100" y="0" width="40" height="40" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="120" y="25" fill="hsl(var(--foreground))" fontSize="16" textAnchor="middle">8</text>
        <text x="160" y="25" fill="hsl(var(--muted-foreground))" fontSize="12">1개 정렬됨</text>

        <text x="-40" y="85" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="end">Step 2</text>
        <rect x="0" y="60" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="20" y="85" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">2</text>
        <rect x="50" y="60" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="70" y="85" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">5</text>
        <rect x="100" y="60" width="40" height="40" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="120" y="85" fill="hsl(var(--foreground))" fontSize="16" textAnchor="middle">8</text>
        <text x="160" y="85" fill="hsl(var(--muted-foreground))" fontSize="12">2개 정렬됨</text>

        <text x="-40" y="145" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="end">Step 3</text>
        <rect x="0" y="120" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="20" y="145" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">2</text>
        <rect x="50" y="120" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="70" y="145" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">5</text>
        <rect x="100" y="120" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="120" y="145" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">8</text>
        <text x="160" y="145" fill="#10b981" fontSize="14" fontWeight="bold" filter="url(#neon-glow-emerald)">모두 완료!</text>
      </g>
    </svg>
  );
};

// 4. O(N) 최적화 (O(N) Best Case)
const ONBestCaseSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="50" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">거의 정렬된 데이터에서는 로켓처럼 빠르다 (O(N) Best Case)</text>

      <g transform="translate(100, 100)">
        {/* 이미 정렬된 배열 */}
        <rect x="0" y="0" width="50" height="50" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="25" y="32" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">1</text>

        <rect x="60" y="0" width="50" height="50" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="85" y="32" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">2</text>

        <rect x="120" y="0" width="50" height="50" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="145" y="32" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">3</text>

        {/* 현재 타겟 */}
        <rect x="180" y="-20" width="50" height="50" rx="8" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" strokeWidth="2" />
        <text x="205" y="12" fill="#06b6d4" fontSize="20" fontWeight="bold" textAnchor="middle">4</text>
        <text x="205" y="-35" fill="#06b6d4" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-cyan)">현재 삽입할 값</text>

        <path d="M 180 5 C 160 5, 150 35, 145 35" fill="none" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="4" />
        <text x="180" y="45" fill="#f43f5e" fontSize="12" textAnchor="middle">3 &gt; 4 ? (X)</text>

        <rect x="50" y="90" width="350" height="50" rx="8" fill="rgba(249, 115, 22, 0.05)" stroke="#f97316" strokeWidth="2" />
        <text x="225" y="115" fill="#f97316" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-orange)">앞의 원소들을 검사할 필요 없이 1번의 비교 후 바로 통과!</text>
        <text x="225" y="130" fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle">각 원소당 1번씩만 비교하면 끝 → O(N)</text>
      </g>
    </svg>
  );
};

export const InsertionSortSupplementaryOptions = [
  TargetSearchSVG,
  ShiftingElementsSVG,
  IncrementalExpansionSVG,
  ONBestCaseSVG,
];
