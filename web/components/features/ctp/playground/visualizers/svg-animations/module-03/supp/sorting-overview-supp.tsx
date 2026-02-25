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

// 1. 안정 정렬 (Stable Sort)
const StableSortSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      {/* 정렬 전 */}
      <text x="300" y="40" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold" textAnchor="middle">정렬 전 (Before)</text>
      <g transform="translate(100, 70)">
        <motion.rect width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="#a855f7" strokeWidth="2" />
        <text x="20" y="25" fill="#a855f7" fontSize="18" fontWeight="bold" textAnchor="middle">5</text>
        <text x="20" y="55" fill="#a855f7" fontSize="12" textAnchor="middle">a</text>

        <rect x="60" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="80" y="25" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">2</text>

        <motion.rect x="120" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="#f97316" strokeWidth="2" />
        <text x="140" y="25" fill="#f97316" fontSize="18" fontWeight="bold" textAnchor="middle">5</text>
        <text x="140" y="55" fill="#f97316" fontSize="12" textAnchor="middle">b</text>

        <rect x="180" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="200" y="25" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">3</text>

        <rect x="240" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="260" y="25" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">8</text>
      </g>

      <path d="M 300 130 L 300 150" stroke="hsl(var(--muted-foreground))" strokeWidth="2" markerEnd="url(#arrow)" />

      {/* 안정 정렬(Stable) */}
      <text x="150" y="170" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-emerald)">안정 정렬 (O)</text>
      <text x="150" y="190" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">상대적 순서 유지</text>
      <g transform="translate(50, 210)">
        <rect x="0" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="20" y="25" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">2</text>

        <rect x="50" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="70" y="25" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">3</text>

        <motion.rect x="100" y="0" width="40" height="40" rx="8" fill="rgba(168, 85, 247, 0.1)" stroke="#a855f7" strokeWidth="2" />
        <text x="120" y="25" fill="#a855f7" fontSize="18" fontWeight="bold" textAnchor="middle">5</text>
        <text x="120" y="55" fill="#a855f7" fontSize="12" textAnchor="middle">a</text>

        <motion.rect x="150" y="0" width="40" height="40" rx="8" fill="rgba(249, 115, 22, 0.1)" stroke="#f97316" strokeWidth="2" />
        <text x="170" y="25" fill="#f97316" fontSize="18" fontWeight="bold" textAnchor="middle">5</text>
        <text x="170" y="55" fill="#f97316" fontSize="12" textAnchor="middle">b</text>

        <rect x="200" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="220" y="25" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">8</text>
      </g>

      {/* 불안정 정렬(Unstable) */}
      <text x="450" y="170" fill="#f43f5e" fontSize="16" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-rose)">불안정 정렬 (X)</text>
      <text x="450" y="190" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">순서가 뒤바뀔 수 있음</text>
      <g transform="translate(350, 210)">
        <rect x="0" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="20" y="25" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">2</text>

        <rect x="50" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="70" y="25" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">3</text>

        <motion.rect x="100" y="0" width="40" height="40" rx="8" fill="rgba(249, 115, 22, 0.1)" stroke="#f97316" strokeWidth="2" />
        <text x="120" y="25" fill="#f97316" fontSize="18" fontWeight="bold" textAnchor="middle">5</text>
        <text x="120" y="55" fill="#f97316" fontSize="12" textAnchor="middle">b</text>

        <motion.rect x="150" y="0" width="40" height="40" rx="8" fill="rgba(168, 85, 247, 0.1)" stroke="#a855f7" strokeWidth="2" />
        <text x="170" y="25" fill="#a855f7" fontSize="18" fontWeight="bold" textAnchor="middle">5</text>
        <text x="170" y="55" fill="#a855f7" fontSize="12" textAnchor="middle">a</text>

        <rect x="200" y="0" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="220" y="25" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">8</text>
      </g>
    </svg>
  );
};

// 2. 외부 병합 vs 제자리 정렬
const InPlaceSortSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      {/* 내부(In-place) 정렬 */}
      <g transform="translate(150, 60)">
        <text x="0" y="0" fill="#06b6d4" fontSize="18" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-cyan)">제자리 정렬 (In-place)</text>
        <text x="0" y="20" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">추가 메모리 공간 O(1)</text>

        <rect x="-80" y="40" width="160" height="50" rx="8" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" strokeWidth="2" />
        <text x="-50" y="70" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold">9</text>
        <text x="-15" y="70" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold">4</text>
        <text x="20" y="70" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold">1</text>
        <text x="55" y="70" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold">7</text>

        <path d="M -50 90 A 20 20 0 0 0 -15 90" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4" />
        <text x="-32" y="115" fill="#f97316" fontSize="12" textAnchor="middle">교환 (Swap)</text>
        <text x="0" y="150" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">기존 배열 안에서 요소 위치만 바꿈</text>
      </g>

      {/* 외부(Out-of-place) 정렬 */}
      <g transform="translate(450, 60)">
        <text x="0" y="0" fill="#a855f7" fontSize="18" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-rose)">외부 정렬 (Out-of-place)</text>
        <text x="0" y="20" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">추가 배열 복사 메모리 O(N) 이상</text>

        <rect x="-80" y="40" width="160" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="0" y="60" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">원본 배열 [9, 4, 1, 7]</text>

        <path d="M 0 75 L 0 100" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" markerEnd="url(#arrow)" />

        <rect x="-80" y="110" width="160" height="30" rx="4" fill="rgba(168, 85, 247, 0.1)" stroke="#a855f7" strokeWidth="2" />
        <text x="0" y="130" fill="hsl(var(--foreground))" fontSize="12" fontWeight="bold" textAnchor="middle">새로운 배열 [1, 4, 7, 9]</text>

        <text x="0" y="165" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">정렬 결과를 담을 별도 메모리 필요</text>
      </g>

      <line x1="300" y1="40" x2="300" y2="260" stroke="hsl(var(--border))" strokeDasharray="6" />
    </svg>
  );
};

// 3. 시간 복잡도 (Time Complexity Scale)
const TimeComplexitySVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="40" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">데이터 크기(N)에 따른 연산 횟수 증가량</text>

      {/* 축 */}
      <line x1="100" y1="260" x2="500" y2="260" stroke="hsl(var(--foreground))" strokeWidth="2" />
      <line x1="100" y1="260" x2="100" y2="60" stroke="hsl(var(--foreground))" strokeWidth="2" />
      <text x="510" y="265" fill="hsl(var(--muted-foreground))" fontSize="12">n (데이터 크기)</text>
      <text x="95" y="55" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="end">시간(T)</text>

      {/* O(N^2) 곡선 */}
      <path d="M 100 260 Q 250 240 300 80" fill="none" stroke="#f43f5e" strokeWidth="3" filter="url(#neon-glow-rose)" />
      <text x="320" y="90" fill="#f43f5e" fontSize="16" fontWeight="bold">O(N²)</text>
      <text x="330" y="110" fill="hsl(var(--muted-foreground))" fontSize="11">선택, 버블, 삽입</text>

      {/* O(N log N) 곡선 */}
      <path d="M 100 260 Q 300 240 480 180" fill="none" stroke="#06b6d4" strokeWidth="3" filter="url(#neon-glow-cyan)" />
      <text x="490" y="185" fill="#06b6d4" fontSize="16" fontWeight="bold">O(N log N)</text>
      <text x="490" y="205" fill="hsl(var(--muted-foreground))" fontSize="11">퀵, 병합, 힙</text>

      {/* O(N) 곡선 */}
      <path d="M 100 260 L 480 230" fill="none" stroke="#10b981" strokeWidth="3" filter="url(#neon-glow-emerald)" />
      <text x="490" y="240" fill="#10b981" fontSize="16" fontWeight="bold">O(N)</text>
      <text x="490" y="260" fill="hsl(var(--muted-foreground))" fontSize="11">도수 정렬</text>
    </svg>
  );
};

// 4. 교환(Swap) 모델링
const SwapModelSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="50" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">정렬의 두 가지 기본 연산: 비교(Compare)와 교환(Swap)</text>

      <g transform="translate(180, 100)">
        <rect x="0" y="0" width="80" height="80" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="40" y="50" fill="#f97316" fontSize="28" fontWeight="bold" textAnchor="middle">8</text>
        <text x="40" y="100" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">A[i]</text>

        <rect x="160" y="0" width="80" height="80" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="200" y="50" fill="#06b6d4" fontSize="28" fontWeight="bold" textAnchor="middle">3</text>
        <text x="200" y="100" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">A[j]</text>

        {/* 비교 기호 */}
        <text x="120" y="55" fill="hsl(var(--foreground))" fontSize="32" fontWeight="bold" textAnchor="middle">&gt;</text>
        <text x="120" y="12" fill="#a855f7" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-rose)">Step 1. 비교</text>

        {/* 교환 애니메이션 화살표 */}
        <motion.path
          d="M 40 -10 C 80 -40, 160 -40, 200 -10"
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeDasharray="5"
          animate={{ strokeDashoffset: [20, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M 200 90 C 160 120, 80 120, 40 90"
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeDasharray="5"
          animate={{ strokeDashoffset: [20, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <text x="120" y="-35" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-emerald)">Step 2. 교환 (Swap)</text>

        <rect x="60" y="140" width="120" height="60" rx="8" fill="rgba(6, 182, 212, 0.1)" stroke="#06b6d4" strokeWidth="2" />
        <text x="120" y="165" fill="#06b6d4" fontSize="14" fontWeight="bold" textAnchor="middle">임시 변수 (temp)</text>
        <text x="120" y="185" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">temp = A; A = B; B = temp;</text>
      </g>
    </svg>
  );
};

export const SortingOverviewSupplementaryOptions = [
  StableSortSVG,
  InPlaceSortSVG,
  TimeComplexitySVG,
  SwapModelSVG,
];
