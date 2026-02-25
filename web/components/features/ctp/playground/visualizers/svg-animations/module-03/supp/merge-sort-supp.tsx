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
    <filter id="neon-glow-yellow" x="-20%" y="-20%" width="140%" height="140%">
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

// 1. Divide SVG
const DivideSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(40, 50)">
        {/* Title */}
        <text x="0" y="-10" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">1. 무자비한 분할 (Divide)</text>
        <text x="0" y="10" fill="hsl(var(--muted-foreground))" fontSize="14">배열의 크기가 1이 될 때까지 무조건 정확히 반으로 쪼갭니다.</text>

        {/* Splitting Array Animation */}
        <g transform="translate(140, 50)">
          {/* Level 0 */}
          <rect x="0" y="0" width="240" height="30" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" strokeWidth="2" rx="4" />
          <text x="120" y="20" fill="hsl(var(--foreground))" fontSize="14" textAnchor="middle">8개의 원소</text>

          {/* Animation arrows */}
          <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }} d="M 100 35 L 60 65" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" markerEnd="url(#arrow)" />
          <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }} d="M 140 35 L 180 65" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" markerEnd="url(#arrow)" />

          {/* Level 1 */}
          <rect x="-10" y="70" width="110" height="30" fill="#6366f1" fillOpacity="0.3" stroke="#6366f1" strokeWidth="2" rx="4" />
          <text x="45" y="90" fill="hsl(var(--foreground))" fontSize="12" textAnchor="middle">4개</text>

          <rect x="140" y="70" width="110" height="30" fill="#6366f1" fillOpacity="0.3" stroke="#6366f1" strokeWidth="2" rx="4" />
          <text x="195" y="90" fill="hsl(var(--foreground))" fontSize="12" textAnchor="middle">4개</text>

          {/* Arrow Level 2 */}
           <path d="M 30 105 L 10 135" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.1" markerEnd="url(#arrow)" />
           <path d="M 60 105 L 80 135" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.1" markerEnd="url(#arrow)" />

          {/* Level 2 ... */}
          <rect x="-20" y="140" width="45" height="25" fill="#a855f7" fillOpacity="0.4" stroke="#a855f7" strokeWidth="2" rx="4" />
          <rect x="65" y="140" width="45" height="25" fill="#a855f7" fillOpacity="0.4" stroke="#a855f7" strokeWidth="2" rx="4" />

          <text x="210" y="160" fill="hsl(var(--muted-foreground))" fontSize="14" fontStyle="italic">... 크기가 1이 될 때까지!</text>
        </g>
      </g>
    </svg>
  );
};

// 2. Merge SVG
const MergeSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(40, 50)">
        {/* Title */}
        <text x="0" y="-10" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">2. 체계적인 병합 (Merge)</text>
        <text x="0" y="10" fill="hsl(var(--muted-foreground))" fontSize="14">정렬된 두 부분 배열의 맨 앞만 비교하며 하나로 합칩니다.</text>

        <g transform="translate(80, 50)">
          {/* Output buffer */}
          <rect x="100" y="100" width="200" height="40" fill="hsl(var(--muted))" rx="4" stroke="currentColor" strokeOpacity="0.3"/>
          <text x="200" y="125" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">병합된 배열 배열 (보조 공간)</text>

          {/* Left Array */}
          <g transform="translate(50, 0)">
            <rect width="30" height="40" fill="#3b82f6" rx="4" opacity="0.8"/>
            <text x="15" y="25" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle">2</text>
            <rect x="35" y="0" width="30" height="40" fill="#3b82f6" rx="4" opacity="0.4"/>
            <text x="50" y="25" fill="#fff" fontSize="14" textAnchor="middle">5</text>
             <text x="35" y="-15" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">L 포인터</text>
             <path d="M 35 -10 L 15 0" fill="none" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)" />
          </g>

          {/* Right Array */}
          <g transform="translate(250, 0)">
            <rect width="30" height="40" fill="#ef4444" rx="4" opacity="0.8"/>
            <text x="15" y="25" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle">3</text>
            <rect x="35" y="0" width="30" height="40" fill="#ef4444" rx="4" opacity="0.4"/>
            <text x="50" y="25" fill="#fff" fontSize="14" textAnchor="middle">7</text>
             <text x="-5" y="-15" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle">R 포인터</text>
             <path d="M -5 -10 L 15 0" fill="none" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow)" />
          </g>

          {/* Comparison and moving animation */}
          <motion.path
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            d="M 65 45 Q 120 70 120 90" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow)" filter="url(#neon-glow-primary)"/>
          <text x="200" y="60" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle">작은 값 먼저 쏙!</text>
        </g>
      </g>
    </svg>
  );
};

// 3. Guarantee N log N SVG
const GuaranteeNLogNSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(40, 50)">
        {/* Title */}
        <text x="0" y="0" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">3. 흔들리지 않는 편안함 O(N log N)</text>
        <text x="0" y="20" fill="hsl(var(--muted-foreground))" fontSize="14">초기 상태가 극악이라도 트리의 깊이는 항상 일정합니다.</text>

        {/* stable N log N graph representation */}
        <g transform="translate(100, 60)">
          <rect x="0" y="0" width="300" height="100" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4" rx="8" opacity="0.5"/>
          <text x="150" y="40" fill="#10b981" fontSize="18" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-primary)">최선, 평균, 최악</text>
          <text x="150" y="70" fill="hsl(var(--foreground))" fontSize="24" fontWeight="bold" textAnchor="middle">항상 O(N log N)</text>

          {/* stable properties */}
          <rect x="0" y="120" width="140" height="30" fill="hsl(var(--primary))" fillOpacity="0.1" rx="4"/>
          <text x="70" y="140" fill="hsl(var(--primary))" fontSize="12" fontWeight="bold" textAnchor="middle">안정 정렬 (Stable)</text>

          <rect x="160" y="120" width="140" height="30" fill="hsl(var(--primary))" fillOpacity="0.1" rx="4"/>
          <text x="230" y="140" fill="hsl(var(--primary))" fontSize="12" fontWeight="bold" textAnchor="middle">일관된 성능</text>
        </g>
      </g>
    </svg>
  );
};

// 4. Memory Constraint SVG
const MemoryConstraintSVG = () => {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full font-sans">
      <SVGDefs />
      <rect width="600" height="300" fill="hsl(var(--background))" />
      <rect width="600" height="300" fill="url(#grid-pattern)" />

      <g transform="translate(40, 50)">
        {/* Title */}
        <text x="0" y="0" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">4. 메모리의 대가 O(N)</text>
        <text x="0" y="20" fill="hsl(var(--muted-foreground))" fontSize="14">데이터를 합칠 때 원래 배열 크기만큼의 추가 도화지(배열)가 반드시 필요합니다.</text>

        {/* Arrays comparison */}
        <g transform="translate(100, 60)">
          <text x="-20" y="30" fill="currentColor" fontSize="14" opacity="0.7">원본 배열</text>
          <rect x="80" y="10" width="240" height="30" fill="#3b82f6" rx="4" />

           {/* arrow down */}
           <path d="M 200 50 L 200 80" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" markerEnd="url(#arrow)"/>
           <text x="220" y="70" fill="#ef4444" fontSize="14" fontWeight="bold" filter="url(#neon-glow-red)">N만큼의 공간 추가 복사!</text>

          <text x="-20" y="110" fill="currentColor" fontSize="14" opacity="0.7">임시 배열</text>
          <motion.rect
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
            x="80" y="90" width="240" height="30" fill="#ef4444" rx="4" />

          <rect x="80" y="150" width="240" height="40" fill="transparent" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4" rx="4" />
          <text x="200" y="175" fill="#f59e0b" fontSize="14" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-yellow)">In-Place 정렬 실패의 원인</text>
        </g>
      </g>
    </svg>
  );
};

export const MergeSortSupplementaryOptions = [
  DivideSVG,
  MergeSVG,
  GuaranteeNLogNSVG,
  MemoryConstraintSVG,
];
