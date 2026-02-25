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

// 1. 최솟값 탐색 (Finding Minimum)
const FindingMinSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="50" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold" textAnchor="middle">미정렬 영역에서 가장 작은 값 찾기</text>

      <g transform="translate(100, 100)">
        <rect x="0" y="0" width="60" height="60" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="30" y="38" fill="hsl(var(--foreground))" fontSize="24" textAnchor="middle">8</text>

        <rect x="80" y="0" width="60" height="60" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="110" y="38" fill="hsl(var(--foreground))" fontSize="24" textAnchor="middle">5</text>

        <rect x="160" y="0" width="60" height="60" rx="8" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" strokeWidth="2" />
        <text x="190" y="38" fill="#06b6d4" fontSize="24" fontWeight="bold" textAnchor="middle">2</text>
        <text x="190" y="80" fill="#06b6d4" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-cyan)">현재 최소 (min)</text>
        <path d="M 190 60 L 190 85" stroke="#06b6d4" strokeWidth="2" />

        <rect x="240" y="0" width="60" height="60" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="270" y="38" fill="hsl(var(--foreground))" fontSize="24" textAnchor="middle">9</text>

        <rect x="320" y="0" width="60" height="60" rx="8" fill="rgba(249, 115, 22, 0.1)" stroke="#f97316" strokeWidth="2" />
        <text x="350" y="38" fill="#f97316" fontSize="24" textAnchor="middle">4</text>
        <text x="350" y="-15" fill="#f97316" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-orange)">탐색 중...</text>
        <path d="M 350 -5 L 350 0" stroke="#f97316" strokeWidth="2" markerStart="url(#arrow)" />

        <path d="M 190 -30 C 250 -60, 300 -60, 350 -30" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow)" />
        <text x="270" y="-55" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">크기 비교: 4 &gt; 2 (유지)</text>
      </g>
    </svg>
  );
};

// 2. 영역 분리 (Separating Regions)
const SeparatingRegionsSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="50" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold" textAnchor="middle">배열을 '정렬된 구역'과 '미정렬 구역'으로 나눔</text>

      <g transform="translate(100, 100)">
        {/* 정렬된 영역 */}
        <rect x="-10" y="-10" width="160" height="80" rx="12" fill="rgba(16, 185, 129, 0.05)" stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
        <text x="70" y="-20" fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-emerald)">정렬 완료 영역 (Sorted)</text>

        <rect x="0" y="0" width="60" height="60" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="30" y="35" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">1</text>
        <rect x="80" y="0" width="60" height="60" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="110" y="35" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">3</text>

        {/* 미정렬 영역 */}
        <rect x="150" y="-10" width="250" height="80" rx="12" fill="rgba(244, 63, 94, 0.05)" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4" />
        <text x="275" y="-20" fill="#f43f5e" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-rose)">미정렬 영역 (Unsorted)</text>

        <rect x="160" y="0" width="60" height="60" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="190" y="35" fill="hsl(var(--foreground))" fontSize="20" textAnchor="middle">8</text>
        <rect x="240" y="0" width="60" height="60" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="270" y="35" fill="hsl(var(--foreground))" fontSize="20" textAnchor="middle">4</text>
        <rect x="320" y="0" width="60" height="60" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="350" y="35" fill="hsl(var(--foreground))" fontSize="20" textAnchor="middle">9</text>

        <path d="M 145 90 L 145 110" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
        <text x="145" y="130" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">경계선(i) 이동</text>
        <path d="M 180 125 L 210 125" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" markerEnd="url(#arrow)" />
      </g>
    </svg>
  );
};

// 3. 교환 최소화 (Swap Minimization)
const SwapMinimizationSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="50" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold" textAnchor="middle">교환 연산의 낭비를 줄임 (1 Pass당 딱 1번의 Swap)</text>

      <g transform="translate(100, 100)">
        <rect x="100" y="0" width="200" height="60" rx="8" fill="rgba(6, 182, 212, 0.05)" stroke="#06b6d4" strokeWidth="2" />
        <text x="200" y="25" fill="#06b6d4" fontSize="16" fontWeight="bold" textAnchor="middle">버블 정렬: 조건 맞을 때마다 Swap</text>
        <text x="200" y="45" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">최대 O(N²)번의 Swap 발생</text>

        <path d="M 200 70 L 200 90" stroke="hsl(var(--muted-foreground))" strokeWidth="2" markerEnd="url(#arrow)" />

        <rect x="50" y="100" width="300" height="80" rx="8" fill="rgba(16, 185, 129, 0.05)" stroke="#10b981" strokeWidth="2" />
        <text x="200" y="130" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-emerald)">선택 정렬: 최소값의 '인덱스'만 기억</text>
        <text x="200" y="150" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">인덱스 검색 후 마지막에 딱 한 번만 Swap 실행</text>
        <text x="200" y="170" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">Swap 연산 비용: O(N)</text>
      </g>
    </svg>
  );
};

// 4. 불안정 정렬 (Unstable Nature)
const UnstableNatureSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="40" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">선택 정렬은 불안정(Unstable) 정렬입니다</text>

      <g transform="translate(150, 80)">
        <text x="-50" y="25" fill="hsl(var(--muted-foreground))" fontSize="14">배열 상태:</text>

        <rect x="40" y="0" width="50" height="50" rx="8" fill="hsl(var(--card))" stroke="#a855f7" strokeWidth="2" />
        <text x="65" y="25" fill="#a855f7" fontSize="20" fontWeight="bold" textAnchor="middle">5</text>
        <text x="65" y="40" fill="#a855f7" fontSize="10" textAnchor="middle">a</text>

        <rect x="100" y="0" width="50" height="50" rx="8" fill="hsl(var(--card))" stroke="#f97316" strokeWidth="2" />
        <text x="125" y="25" fill="#f97316" fontSize="20" fontWeight="bold" textAnchor="middle">5</text>
        <text x="125" y="40" fill="#f97316" fontSize="10" textAnchor="middle">b</text>

        <rect x="160" y="0" width="50" height="50" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="185" y="30" fill="hsl(var(--foreground))" fontSize="20" textAnchor="middle">1</text>

        <rect x="220" y="0" width="50" height="50" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="245" y="30" fill="hsl(var(--foreground))" fontSize="20" textAnchor="middle">9</text>

        <path d="M 185 60 C 135 90, 115 90, 65 60" fill="none" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="4" />
        <text x="125" y="110" fill="#f43f5e" fontSize="12" textAnchor="middle">최소값 1과 맨 앞의 5a를 교환</text>

        <g transform="translate(0, 140)">
          <text x="-50" y="25" fill="hsl(var(--muted-foreground))" fontSize="14">결과:</text>

          <rect x="40" y="0" width="50" height="50" rx="8" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
          <text x="65" y="30" fill="#10b981" fontSize="20" fontWeight="bold" textAnchor="middle">1</text>

          <rect x="100" y="0" width="50" height="50" rx="8" fill="hsl(var(--card))" stroke="#f97316" strokeWidth="2" />
          <text x="125" y="25" fill="#f97316" fontSize="20" fontWeight="bold" textAnchor="middle">5</text>
          <text x="125" y="40" fill="#f97316" fontSize="10" textAnchor="middle">b</text>

          <rect x="160" y="0" width="50" height="50" rx="8" fill="hsl(var(--card))" stroke="#a855f7" strokeWidth="2" />
          <text x="185" y="25" fill="#a855f7" fontSize="20" fontWeight="bold" textAnchor="middle">5</text>
          <text x="185" y="40" fill="#a855f7" fontSize="10" textAnchor="middle">a</text>

          <rect x="220" y="0" width="50" height="50" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
          <text x="245" y="30" fill="hsl(var(--foreground))" fontSize="20" textAnchor="middle">9</text>

          <text x="142" y="-15" fill="#f43f5e" fontSize="14" fontWeight="bold" filter="url(#neon-glow-rose)">5a와 5b의 순서가 뒤집힘!</text>
        </g>
      </g>
    </svg>
  );
};

export const SelectionSortSupplementaryOptions = [
  FindingMinSVG,
  SeparatingRegionsSVG,
  SwapMinimizationSVG,
  UnstableNatureSVG,
];
