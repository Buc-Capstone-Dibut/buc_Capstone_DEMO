"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// --- Utility Components ---
const SVGDefs = () => (
  <defs>
    <filter id="neon-glow-primary" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="neon-glow-red" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
    </pattern>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
    </marker>
  </defs>
);

// 1. Gap Sequence SVG
const GapSequenceSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(30, 80)">
        {/* Title */}
        <text x="0" y="-30" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">1. 간격(Gap) 시퀀스의 마법</text>
        <text x="0" y="-10" fill="hsl(var(--muted-foreground))" fontSize="14">배열을 N/2, N/4 간격의 여러 그룹으로 논리적으로 나눕니다.</text>

        {/* Array Bars */}
        {[8, 3, 9, 2, 7, 1, 6, 4].map((v, i) => (
          <g key={i} transform={`translate(${i * 65 + 30}, 0)`}>
            <rect x="0" y={100 - v * 10} width="40" height={v * 10} fill={i % 4 === 0 ? "#3b82f6" : i % 4 === 1 ? "#ef4444" : "hsl(var(--muted))"} rx="4" />
            <text x="20" y={115} fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">{v}</text>
            <text x="20" y={135} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">[{i}]</text>
          </g>
        ))}

        {/* Gap Lines representing Group 1 (blue) and Group 2 (red) */}
        <path d="M 50 145 L 50 160 L 310 160 L 310 145" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <text x="180" y="175" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">그룹 1 (Gap = 4)</text>

        <path d="M 115 145 L 115 185 L 375 185 L 375 145" fill="none" stroke="#ef4444" strokeWidth="2" />
        <text x="245" y="200" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">그룹 2 (Gap = 4)</text>
      </g>
    </svg>
  );
};

// 2. Far Exchange SVG
const FarExchangeSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(30, 80)">
        {/* Title */}
        <text x="0" y="-30" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">2. 장거리 원소 교환</text>
        <text x="0" y="-10" fill="hsl(var(--muted-foreground))" fontSize="14">멀리 떨어진 원소를 단번에 교환하여 데이터 이동 거리를 획기적으로 줄입니다.</text>

        {/* Array Bars - Group 1 Sorting */}
        <g transform="translate(80, 0)">
          {/* Before */}
          <rect x="0" y={100 - 80} width="40" height={80} fill="#3b82f6" opacity="0.3" rx="4" />
          <text x="20" y={115} fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">8</text>

          <rect x="260" y={100 - 70} width="40" height={70} fill="#3b82f6" opacity="0.3" rx="4" />
          <text x="280" y={115} fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">7</text>

          {/* After (Animation) */}
          <motion.rect
            initial={{ x: 0, y: 100 - 80, height: 80 }}
            animate={{ x: [0, 130, 260], y: [100 - 80, -20, 100 - 80] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            width="40" fill="#10b981" rx="4" filter="url(#neon-glow-primary)" />

          <motion.rect
            initial={{ x: 260, y: 100 - 70, height: 70 }}
            animate={{ x: [260, 130, 0], y: [100 - 70, -20, 100 - 70] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            width="40" fill="#3b82f6" rx="4" filter="url(#neon-glow-primary)" />

          <path d="M 20 -30 Q 150 -80 280 -30" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          <text x="150" y="-55" fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-primary)">단 1번의 교환으로 대이동!</text>
        </g>
      </g>
    </svg>
  );
};

// 3. Diminishing Increment SVG
const DiminishingIncrementSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(50, 40)">
        {/* Title */}
        <text x="0" y="0" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">3. 간격 축소 (Diminishing Increment)</text>
        <text x="0" y="20" fill="hsl(var(--muted-foreground))" fontSize="14">Gap을 점차 줄여가며, 마지막에는 Gap=1인 삽입 정렬을 수행합니다.</text>

        {/* Funnel/Pyramid representing decreasing gaps */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity }}
          d="M 100 80 L 400 80" fill="none" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" />
        <text x="250" y="70" fill="#3b82f6" fontSize="14" fontWeight="bold" textAnchor="middle">Gap = 4 (거친 정렬)</text>

        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
          d="M 150 130 L 350 130" fill="none" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" />
        <text x="250" y="120" fill="#8b5cf6" fontSize="14" fontWeight="bold" textAnchor="middle">Gap = 2 (중간 정렬)</text>

        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 1, repeat: Infinity }}
          d="M 200 180 L 300 180" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" filter="url(#neon-glow-primary)"/>
        <text x="250" y="170" fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle">Gap = 1 (미세 조정)</text>
        <text x="250" y="205" fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">이미 거의 정렬되어 순식간에 끝납니다!</text>
      </g>
    </svg>
  );
};

// 4. Optimization Complexity SVG
const OptimizationComplexitySVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(50, 60)">
        {/* Title */}
        <text x="0" y="-10" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">4. 한계를 넘는 최적화</text>
        <text x="0" y="10" fill="hsl(var(--muted-foreground))" fontSize="14">단순 O(N²) 삽입 정렬을 Gap 수열에 따라 O(N^1.5) 등 비약적으로 개선합니다.</text>

        {/* Complexity Graph */}
        <path d="M 50 180 L 50 50" fill="none" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.5" />
        <path d="M 50 180 L 400 180" fill="none" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" opacity="0.5" />
        <text x="35" y="60" fill="currentColor" fontSize="12" opacity="0.5">시간</text>
        <text x="380" y="195" fill="currentColor" fontSize="12" opacity="0.5">데이터 양 (N)</text>

        {/* O(N^2) Curve */}
        <path d="M 50 180 Q 200 180, 250 50" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
        <text x="255" y="60" fill="#ef4444" fontSize="14" fontWeight="bold">일반 삽입 정렬 O(N²)</text>

        {/* O(N^1.5) Curve */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity }}
          d="M 50 180 Q 250 170, 350 70" fill="none" stroke="#10b981" strokeWidth="3" filter="url(#neon-glow-primary)"/>
        <text x="360" y="80" fill="#10b981" fontSize="14" fontWeight="bold">셸 정렬 (Hibbard) O(N^1.5)</text>

        {/* Equation Badge */}
        <rect x="50" y="210" width="400" height="40" fill="hsl(var(--primary))" fillOpacity="0.1" stroke="hsl(var(--primary))" strokeWidth="1" rx="6" />
        <text x="250" y="235" fill="hsl(var(--primary))" fontSize="14" fontWeight="bold" textAnchor="middle">
          최적의 Gap 시퀀스가 성능을 결정짓는 핵심 열쇠!
        </text>
      </g>
    </svg>
  );
};

export const ShellSortSupplementaryOptions = [
  GapSequenceSVG,
  FarExchangeSVG,
  DiminishingIncrementSVG,
  OptimizationComplexitySVG,
];
