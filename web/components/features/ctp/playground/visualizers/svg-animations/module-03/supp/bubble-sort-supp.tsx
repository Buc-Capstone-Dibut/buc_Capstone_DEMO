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

// 1. 인접 교환 (Adjacent Swap)
const AdjacentSwapSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="50" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold" textAnchor="middle">인접한 두 원소의 끈질긴 비교</text>

      <g transform="translate(150, 100)">
        <rect x="0" y="0" width="80" height="80" rx="12" fill="hsl(var(--card))" stroke="#f97316" strokeWidth="2" />
        <text x="40" y="50" fill="#f97316" fontSize="28" fontWeight="bold" textAnchor="middle">8</text>
        <text x="40" y="110" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">index: i</text>

        <rect x="100" y="0" width="80" height="80" rx="12" fill="hsl(var(--card))" stroke="#06b6d4" strokeWidth="2" />
        <text x="140" y="50" fill="#06b6d4" fontSize="28" fontWeight="bold" textAnchor="middle">3</text>
        <text x="140" y="110" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">index: i+1</text>

        <rect x="200" y="0" width="80" height="80" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="240" y="50" fill="hsl(var(--foreground))" fontSize="28" fontWeight="bold" textAnchor="middle">5</text>
        <text x="240" y="110" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">대기 중</text>

        {/* 비교 기호 */}
        <text x="90" y="45" fill="hsl(var(--foreground))" fontSize="24" fontWeight="bold" textAnchor="middle">&gt;</text>

        {/* 덮어씌우는 교환 화살표 */}
        <path d="M 40 -15 C 60 -40, 120 -40, 140 -15" fill="none" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow)" strokeDasharray="4" />
        <path d="M 140 95 C 120 120, 60 120, 40 95" fill="none" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow)" strokeDasharray="4" />
        <text x="90" y="-45" fill="#f43f5e" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-rose)">크면 자리 바꿈 (Swap)</text>
      </g>
    </svg>
  );
};

// 2. 가장 큰 값이 맨 뒤로 (Bubbling Up)
const BubblingUpSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="40" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">가장 무거운 거품이 끝까지 밀려가는 과정 (1 Pass)</text>

      <g transform="translate(100, 80)">
        {/* State 1 */}
        <rect x="0" y="0" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="#f97316" strokeWidth="2" />
        <text x="15" y="20" fill="#f97316" fontSize="14" fontWeight="bold" textAnchor="middle">9</text>
        <rect x="40" y="0" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="55" y="20" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">2</text>
        <rect x="80" y="0" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="95" y="20" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">7</text>
        <rect x="120" y="0" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="135" y="20" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">1</text>
        <path d="M 15 35 C 25 50, 45 50, 55 35" fill="none" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* State 2 */}
        <rect x="180" y="40" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="195" y="60" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">2</text>
        <rect x="220" y="40" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="#f97316" strokeWidth="2" />
        <text x="235" y="60" fill="#f97316" fontSize="14" fontWeight="bold" textAnchor="middle">9</text>
        <rect x="260" y="40" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="275" y="60" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">7</text>
        <rect x="300" y="40" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="315" y="60" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">1</text>
        <path d="M 235 75 C 245 90, 265 90, 275 75" fill="none" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* State 3 */}
        <rect x="0" y="100" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="15" y="120" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">2</text>
        <rect x="40" y="100" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="55" y="120" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">7</text>
        <rect x="80" y="100" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="#f97316" strokeWidth="2" />
        <text x="95" y="120" fill="#f97316" fontSize="14" fontWeight="bold" textAnchor="middle">9</text>
        <rect x="120" y="100" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="135" y="120" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">1</text>
        <path d="M 95 135 C 105 150, 125 150, 135 135" fill="none" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* State 4 (Final for pass) */}
        <rect x="180" y="140" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="195" y="160" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">2</text>
        <rect x="220" y="140" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="235" y="160" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">7</text>
        <rect x="260" y="140" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="275" y="160" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">1</text>
        <rect x="300" y="140" width="30" height="30" rx="4" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="315" y="160" fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle">9</text>

        <text x="360" y="160" fill="#10b981" fontSize="14" fontWeight="bold" filter="url(#neon-glow-emerald)">1개 자리 확정!</text>
      </g>
    </svg>
  );
};

// 3. 조기 종료 (Early Exit)
const EarlyExitSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="50" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold" textAnchor="middle">바꾼 적이 없다면 이미 정렬된 상태!</text>

      <g transform="translate(100, 100)">
        {/* Pass 1 - Swap occur */}
        <text x="-40" y="20" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="end">Pass 1</text>
        <rect x="0" y="0" width="40" height="40" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="20" y="25" fill="hsl(var(--foreground))" fontSize="16" textAnchor="middle">1</text>
        <rect x="50" y="0" width="40" height="40" rx="6" fill="hsl(var(--card))" stroke="#a855f7" strokeWidth="2" />
        <text x="70" y="25" fill="#a855f7" fontSize="16" textAnchor="middle">3</text>
        <rect x="100" y="0" width="40" height="40" rx="6" fill="hsl(var(--card))" stroke="#f97316" strokeWidth="2" />
        <text x="120" y="25" fill="#f97316" fontSize="16" textAnchor="middle">2</text>
        <rect x="150" y="0" width="40" height="40" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="170" y="25" fill="hsl(var(--foreground))" fontSize="16" textAnchor="middle">5</text>

        <path d="M 70 -5 C 90 -20, 100 -20, 120 -5" fill="none" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="220" y="25" fill="#f97316" fontSize="14" fontWeight="bold" filter="url(#neon-glow-orange)">교환 발생 (isSwapped = true)</text>

        {/* Pass 2 - No swap */}
        <text x="-40" y="100" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="end">Pass 2</text>
        <rect x="0" y="80" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="20" y="105" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">1</text>
        <rect x="50" y="80" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="70" y="105" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">2</text>
        <rect x="100" y="80" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="120" y="105" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">3</text>
        <rect x="150" y="80" width="40" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" />
        <text x="170" y="105" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">5</text>

        <text x="220" y="105" fill="#10b981" fontSize="14" fontWeight="bold" filter="url(#neon-glow-emerald)">교환 없음! 정렬 완료 선언</text>
        <path d="M 220 120 L 400 120" stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
        <text x="220" y="140" fill="hsl(var(--muted-foreground))" fontSize="12">불필요한 Pass 3, Pass 4를 스킵하여 최상의 경우 O(N) 달성</text>
      </g>
    </svg>
  );
};

// 4. 비효율성 (O(N^2) Inefficiency)
const InefficiencySVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-mono bg-transparent">
      <NeonGlowFilters />
      <rect width="600" height="300" fill="url(#grid)" />

      <text x="300" y="40" fill="hsl(var(--foreground))" fontSize="18" fontWeight="bold" textAnchor="middle">최악의 경우 (역순 배열): 거북이처럼 느린 O(N²)</text>

      <g transform="translate(100, 80)">
        <rect x="0" y="0" width="30" height="30" rx="4" fill="rgba(244, 63, 94, 0.1)" stroke="#f43f5e" strokeWidth="2" />
        <text x="15" y="20" fill="#f43f5e" fontSize="14" fontWeight="bold" textAnchor="middle">5</text>
        <rect x="40" y="0" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="55" y="20" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">4</text>
        <rect x="80" y="0" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="95" y="20" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">3</text>
        <rect x="120" y="0" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="135" y="20" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">2</text>
        <rect x="160" y="0" width="30" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="175" y="20" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">1</text>

        <path d="M 15 35 Q 45 60 75 35" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow)" />
        <path d="M 75 35 Q 105 60 135 35" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow)" />
        <path d="M 135 35 Q 165 60 175 35" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow)" />

        <text x="210" y="20" fill="#f43f5e" fontSize="14" fontWeight="bold" filter="url(#neon-glow-rose)">모든 원소가 n-1번씩 교환되어야 함!</text>
        <text x="210" y="40" fill="hsl(var(--muted-foreground))" fontSize="12">Σ (i=1 to n-1) i = n(n-1)/2 ≈ O(N²)</text>
      </g>

      <g transform="translate(100, 180)">
        <rect x="0" y="0" width="400" height="60" rx="8" fill="rgba(6, 182, 212, 0.05)" stroke="#06b6d4" strokeWidth="1" />
        <text x="20" y="25" fill="#06b6d4" fontSize="14" fontWeight="bold">교육용, 소규모 데이터 외에는 사용 불가</text>
        <text x="20" y="45" fill="hsl(var(--muted-foreground))" fontSize="12">10만 개의 데이터 정렬 시, 퀵 정렬이 수 밀리초일 때 버블 정렬은 수십 초 이상 소요</text>
      </g>
    </svg>
  );
};

export const BubbleSortSupplementaryOptions = [
  AdjacentSwapSVG,
  BubblingUpSVG,
  EarlyExitSVG,
  InefficiencySVG,
];
