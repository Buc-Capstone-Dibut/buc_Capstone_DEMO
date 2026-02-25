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

// 1. Pivot Selection SVG
const PivotSelectionSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(40, 60)">
        {/* Title */}
        <text x="0" y="-10" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">1. 피벗(Pivot)의 선택</text>
        <text x="0" y="10" fill="hsl(var(--muted-foreground))" fontSize="14">배열의 기준점이 되는 하나의 원소를 잡습니다. 이 피벗이 운명을 결정합니다.</text>

        {/* Array */}
        <g transform="translate(60, 60)">
          {[8, 3, 9, 2, 5, 1, 6, 4].map((v, i) => (
            <g key={i} transform={`translate(${i * 50}, 0)`}>
              <rect x="0" y="0" width="40" height="50" fill={v === 5 ? "#10b981" : "hsl(var(--muted))"} rx="4" />
              <text x="20" y="30" fill={v === 5 ? "#fff" : "hsl(var(--foreground))"} fontSize="18" fontWeight="bold" textAnchor="middle">{v}</text>
            </g>
          ))}
          {/* Pivot Indicator */}
          <motion.path
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: -10, opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
            d="M 220 0 L 210 -15 L 230 -15 Z" fill="#10b981" />
          <text x="220" y="-25" fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-primary)">피벗 (Pivot)</text>
        </g>
      </g>
    </svg>
  );
};

// 2. Partitioning SVG
const PartitioningSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(40, 50)">
        {/* Title */}
        <text x="0" y="-10" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">2. 분할 (Partitioning)</text>
        <text x="0" y="10" fill="hsl(var(--muted-foreground))" fontSize="14">피벗을 기준으로 작은 값은 왼쪽, 큰 값은 오른쪽으로 모읍니다.</text>

        <g transform="translate(50, 40)">
          {/* Before Text */}
          <text x="-10" y="30" fill="currentColor" fontSize="12" opacity="0.5">혼재</text>

          {/* Pivot Box Container */}
          <rect x="190" y="80" width="60" height="80" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4" rx="8" />

          {/* Left Partition Container */}
          <rect x="0" y="80" width="180" height="80" fill="none" stroke="#3b82f6" strokeWidth="1" rx="8" opacity="0.5"/>
          <text x="90" y="180" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">피벗보다 작은 값</text>

          {/* Right Partition Container */}
          <rect x="260" y="80" width="180" height="80" fill="none" stroke="#ef4444" strokeWidth="1" rx="8" opacity="0.5"/>
          <text x="350" y="180" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">피벗보다 큰 값</text>

          {/* Elements Moving */}
          {[1, 3, 2, 4].map((v, i) => (
            <motion.g key={`L-${i}`} initial={{ x: 30 + i * 40, y: 0 }} animate={{ x: 10 + i * 42, y: 95 }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}>
              <rect width="36" height="50" fill="#3b82f6" rx="4" filter="url(#neon-glow-primary)"/>
              <text x="18" y="30" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">{v}</text>
            </motion.g>
          ))}

          <motion.g initial={{ x: 200, y: 0 }} animate={{ x: 200, y: 95 }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}>
            <rect width="40" height="50" fill="#10b981" rx="4" />
            <text x="20" y="30" fill="#fff" fontSize="18" fontWeight="bold" textAnchor="middle">5</text>
          </motion.g>

          {[8, 9, 6, 7].map((v, i) => (
            <motion.g key={`R-${i}`} initial={{ x: 260 + i * 40, y: 0 }} animate={{ x: 270 + i * 42, y: 95 }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}>
              <rect width="36" height="50" fill="#ef4444" rx="4" filter="url(#neon-glow-red)"/>
               <text x="18" y="30" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">{v}</text>
            </motion.g>
          ))}
        </g>
      </g>
    </svg>
  );
};

// 3. Divide and Conquer SVG
const DivideAndConquerSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(40, 40)">
        {/* Title */}
        <text x="0" y="0" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">3. 분할 정복 (Divide & Conquer)</text>
        <text x="0" y="20" fill="hsl(var(--muted-foreground))" fontSize="14">나뉘어진 파티션에 대해 동일한 작업을 쪼갤 수 없을 때까지 재귀적으로 반복합니다.</text>

        {/* Tree structure */}
        <g transform="translate(250, 60)">
          <rect x="-60" y="0" width="120" height="30" fill="hsl(var(--muted))" rx="4"/>
          <text x="0" y="20" fill="currentColor" fontSize="12" textAnchor="middle">전체 배열 (N개)</text>

          {/* Branch 1 */}
          <path d="M -20 30 L -100 70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" markerEnd="url(#arrow)" />
          <path d="M 20 30 L 100 70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" markerEnd="url(#arrow)" />

          {/* Level 1 Nodes */}
          <rect x="-160" y="70" width="100" height="30" fill="#3b82f6" fillOpacity="0.2" rx="4" stroke="#3b82f6" strokeWidth="1"/>
          <text x="-110" y="90" fill="#3b82f6" fontSize="12" textAnchor="middle">좌측 분할 (~N/2)</text>

          <rect x="60" y="70" width="100" height="30" fill="#ef4444" fillOpacity="0.2" rx="4" stroke="#ef4444" strokeWidth="1"/>
          <text x="110" y="90" fill="#ef4444" fontSize="12" textAnchor="middle">우측 분할 (~N/2)</text>

          {/* Branch 2 (Animated pulses) */}
          <motion.path d="M -130 100 L -170 140" fill="none" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, repeat: Infinity }} />
          <motion.path d="M -90 100 L -50 140" fill="none" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, repeat: Infinity }} />

          {/* Level 2 Nodes Representation */}
          <rect x="-200" y="140" width="50" height="20" fill="hsl(var(--muted))" rx="2"/>
          <rect x="-80" y="140" width="50" height="20" fill="hsl(var(--muted))" rx="2"/>

          {/* Depth Label */}
          <text x="-200" y="15" fill="hsl(var(--muted-foreground))" fontSize="12" fontStyle="italic">Height ≈ log N</text>
          <path d="M -220 0 L -220 160" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4" opacity="0.3" markerEnd="url(#arrow)" markerStart="url(#arrow)"/>

        </g>
      </g>
    </svg>
  );
};

// 4. Worst Case O(N^2) SVG
const WorstCaseSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(40, 50)">
        {/* Title */}
        <text x="0" y="0" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">4. 치명적인 약점 O(N²)</text>
        <text x="0" y="20" fill="hsl(var(--muted-foreground))" fontSize="14">이미 정렬된 상태에서 최솟값/최댓값을 피벗으로 잡으면 트리가 한쪽으로 쏠립니다.</text>

        {/* Skewed Tree */}
        <g transform="translate(100, 60)">
          <rect x="0" y="0" width="80" height="25" fill="#ef4444" rx="4" />
          <text x="40" y="17" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">Pivot: 최소값</text>

          <path d="M 40 25 L 40 50" fill="none" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow)" />

          <rect x="20" y="50" width="80" height="25" fill="#ef4444" rx="4" opacity="0.8"/>
          <text x="60" y="67" fill="#fff" fontSize="12" textAnchor="middle">Pivot: 그 다음</text>

          <path d="M 60 75 L 60 100" fill="none" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow)" />

          <rect x="40" y="100" width="80" height="25" fill="#ef4444" rx="4" opacity="0.6"/>
          <text x="80" y="117" fill="#fff" fontSize="12" textAnchor="middle">Pivot: 다음...</text>

          <path d="M 80 125 L 80 150" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrow)" />

          {/* Label */}
          <text x="180" y="90" fill="#ef4444" fontSize="14" fontWeight="bold" filter="url(#neon-glow-red)">트리 높이가 N이 되어 분할의 이점 증발!</text>
          <text x="180" y="110" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold" opacity="0.8">T(N) = O(N²)</text>
        </g>
      </g>
    </svg>
  );
};

export const QuickSortSupplementaryOptions = [
  PivotSelectionSVG,
  PartitioningSVG,
  DivideAndConquerSVG,
  WorstCaseSVG,
];
