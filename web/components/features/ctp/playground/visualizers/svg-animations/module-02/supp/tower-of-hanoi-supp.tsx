"use client";

import { motion } from "framer-motion";

function SharedDefs() {
  return (
    <defs>
      <linearGradient id="primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="destructive-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="100%" stopColor="#e11d48" />
      </linearGradient>
      <linearGradient id="surface-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="1" />
        <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
      </linearGradient>
      <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.1" />
      </filter>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="hsl(var(--border))" opacity="0.5" />
      </pattern>
      <marker id="arrow-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
      </marker>
      <marker id="arrow-head-emerald" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
      </marker>
    </defs>
  );
}

function PillarRoles() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        기둥 3개의 역할 보존 (시작, 임시, 목표)
      </text>

      <g transform="translate(150, 250)">
         {/* Base */}
         <rect x="0" y="0" width="500" height="20" rx="10" fill="hsl(var(--border))" filter="url(#soft-shadow)" />

         {/* Start Pillar */}
         <g transform="translate(80, -150)">
            <rect x="-8" y="0" width="16" height="150" rx="8" fill="hsl(var(--border))" />
            <rect x="-40" y="100" width="80" height="20" rx="6" fill="#6366f1" />
            <rect x="-60" y="125" width="120" height="20" rx="6" fill="#6366f1" />

            <rect x="-60" y="170" width="120" height="30" rx="6" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="2" />
            <text x="0" y="190" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#6366f1">A (시작)</text>
         </g>

         {/* Temp (Auxiliary) Pillar */}
         <g transform="translate(250, -150)">
            <rect x="-8" y="0" width="16" height="150" rx="8" fill="hsl(var(--border))" />

            <rect x="-60" y="170" width="120" height="30" rx="6" fill="url(#surface-grad)" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
            <text x="0" y="190" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--muted-foreground))">B (임시)</text>

            <motion.path d="M 0 0 L 0 -40 L -170 -40 L -170 30" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="3" markerEnd="url(#arrow-head)" strokeDasharray="4 4"
               animate={{ opacity: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
         </g>

         {/* Target Pillar */}
         <g transform="translate(420, -150)">
            <rect x="-8" y="0" width="16" height="150" rx="8" fill="hsl(var(--border))" />

            <rect x="-60" y="170" width="120" height="30" rx="6" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
            <text x="0" y="190" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#10b981">C (목표)</text>

             <motion.path d="M -340 70 L -340 -80 L 0 -80 L 0 10" fill="none" stroke="#10b981" strokeWidth="4" markerEnd="url(#arrow-head-emerald)"
               animate={{ opacity: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} />
             <motion.rect x="-20" y="15" width="40" height="20" rx="6" fill="#10b981" opacity="0.6" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} />
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        재귀 호출 시마다 <tspan fill="#6366f1" fontWeight="800">A, B, C 세 기둥의 역할(파라미터)</tspan>이 동적으로 순환하며 바뀝니다.
      </text>
    </svg>
  );
}

function RecursiveRule() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        핵심 논리: N-1 덩어리 치우기
      </text>

      <g transform="translate(100, 120)">
         {/* Step 1: Move N-1 to Temp */}
         <g transform="translate(0, 0)" filter="url(#soft-shadow)">
            <rect width="180" height="220" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="90" y="35" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#6366f1">1. 밑판 빼고 다 치우기</text>

            {/* Visuals */}
            <g transform="translate(90, 80)">
               <rect x="-40" y="80" width="80" height="15" rx="4" fill="#6366f1" opacity="0.3" />{/* original base */}

               {/* moving group */}
               <motion.g animate={{ x: [0, 0, 40], y: [0, -30, 40] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                  <rect x="-20" y="40" width="40" height="15" rx="4" fill="#f43f5e" />
                  <rect x="-30" y="60" width="60" height="15" rx="4" fill="#f43f5e" />
                  <path d="M 0 -10 A 30 50 0 0 1 40 10" fill="none" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow-head)" strokeDasharray="4 4" />
               </motion.g>
            </g>

            <text x="90" y="180" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">맨 아래 N번 판을</text>
            <text x="90" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">꺼내기 위해 N-1개를 통째로</text>
         </g>

         {/* Step 2: Move N to Target */}
         <g transform="translate(210, 0)" filter="url(#soft-shadow)">
            <rect width="180" height="220" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="90" y="35" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#10b981">2. 밑판을 목적지로</text>

            <g transform="translate(90, 80)">
               {/* other piled left */}
               <rect x="25" y="80" width="60" height="15" rx="4" fill="#f43f5e" opacity="0.3" />
               <rect x="35" y="60" width="40" height="15" rx="4" fill="#f43f5e" opacity="0.3" />

               {/* moving base */}
               <motion.g animate={{ x: [0, 0, -50], y: [0, -40, 20] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                  <rect x="-40" y="80" width="80" height="15" rx="4" fill="#6366f1" />
                  <path d="M -40 70 A 40 50 0 0 0 -50 90" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow-head)" strokeDasharray="4 4" />
               </motion.g>
            </g>

            <text x="90" y="180" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">드디어 자유로워진</text>
            <text x="90" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">가장 큰 N판을 목표로 이동</text>
         </g>

         {/* Step 3: Move N-1 to Target */}
         <g transform="translate(420, 0)" filter="url(#soft-shadow)">
            <rect width="180" height="220" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="90" y="35" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#a855f7">3. 치웠던 N-1 다시 덮기</text>

            <g transform="translate(90, 80)">
               <rect x="-80" y="100" width="80" height="15" rx="4" fill="#6366f1" opacity="0.8" />

               {/* moving group */}
               <motion.g animate={{ x: [40, 40, -40], y: [30, -30, 20] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                  <rect x="-20" y="40" width="40" height="15" rx="4" fill="#f43f5e" />
                  <rect x="-30" y="60" width="60" height="15" rx="4" fill="#f43f5e" />
                  <path d="M -30 30 A 30 30 0 0 0 -60 50" fill="none" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow-head)" strokeDasharray="4 4" />
               </motion.g>
            </g>

            <text x="90" y="180" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">임시 기둥에 치워뒀던 N-1판을</text>
            <text x="90" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">N판 위로 얹어 완성</text>
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        복잡해 보이지만 사실상 <tspan fill="#f43f5e" fontWeight="800">단 3개의 논리적 블록</tspan>으로 완벽히 분할되는 문제입니다.
      </text>
    </svg>
  );
}

function PowerOfTwoMath() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        수학적 증명: T(N) = 2^N - 1
      </text>

      <g transform="translate(150, 100)">
         {/* Graph Outline */}
         <polyline points="50,220 50,50" fill="none" stroke="hsl(var(--foreground))" strokeWidth="3" markerEnd="url(#arrow-head)" />
         <polyline points="50,220 400,220" fill="none" stroke="hsl(var(--foreground))" strokeWidth="3" markerEnd="url(#arrow-head)" />
         <text x="250" y="250" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--muted-foreground))">원반의 개수 (N)</text>
         <text x="20" y="140" textAnchor="middle" transform="rotate(-90 20 140)" fontSize="16" fontWeight="bold" fill="hsl(var(--muted-foreground))">이동 횟수</text>

         {/* Exponential Curve */}
         <motion.path d="M 50 220 Q 250 200 350 30" fill="none" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" filter="url(#glow)"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 3, repeat: Infinity, ease: "easeIn" }} />

         {/* Data Points */}
         <circle cx="100" cy="210" r="5" fill="#f43f5e" />
         <text x="100" y="200" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">3개 (7회)</text>

         <circle cx="200" cy="180" r="5" fill="#f43f5e" />
         <text x="200" y="170" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">4개 (15회)</text>

         <circle cx="350" cy="30" r="5" fill="#f43f5e" />
         <text x="350" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">N (2^N - 1)</text>

      </g>

      {/* Recurrence Relation Formula */}
      <g transform="translate(450, 100)" filter="url(#soft-shadow)">
         <rect width="250" height="150" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
         <text x="125" y="30" textAnchor="middle" fontSize="16" fontWeight="900" fill="#6366f1">점화식 도출</text>

         <text x="125" y="70" textAnchor="middle" fontSize="18" fontWeight="bold" fill="hsl(var(--foreground))" fontFamily="monospace">
            T(N) = <tspan fill="#f43f5e">2</tspan> * T(N-1) + <tspan fill="#10b981">1</tspan>
         </text>

         <circle cx="70" cy="100" r="4" fill="#f43f5e" />
         <text x="80" y="105" fontSize="12" fill="hsl(var(--muted-foreground))">N-1 덩어리 이동 (2번)</text>

         <circle cx="70" cy="120" r="4" fill="#10b981" />
         <text x="80" y="125" fontSize="12" fill="hsl(var(--muted-foreground))">제일 큰 N 밑판 이동 (1번)</text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        각 단계마다 횟수가 정확히 2배+1 씩 늘어나는 완벽한 <tspan fill="#f43f5e" fontWeight="800">지수 시간(Exponential Time)</tspan> 복잡도입니다.
      </text>
    </svg>
  );
}

function TotalProcessOverview() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        N=3 전체 수행 과정 (7-Step)
      </text>

      <g transform="translate(100, 100)" filter="url(#soft-shadow)">
         <rect width="600" height="240" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />

         <g transform="translate(60, 40)">
            <rect width="40" height="40" rx="6" fill="#10b981" />
            <text x="20" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">A</text>
            <text x="60" y="25" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">1을 C로</text>
         </g>
         <g transform="translate(240, 40)">
            <rect width="40" height="40" rx="6" fill="#10b981" />
            <text x="20" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">B</text>
            <text x="60" y="25" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">2를 B로</text>
         </g>
         <g transform="translate(420, 40)">
            <rect width="40" height="40" rx="6" fill="#10b981" />
            <text x="20" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">C</text>
            <text x="60" y="25" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">1을 B로</text>
         </g>

         {/* D: The Core Movement! */}
         <g transform="translate(200, 100)">
            <rect width="40" height="40" rx="6" fill="#6366f1" filter="url(#glow)" />
            <text x="20" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">D</text>
            <text x="60" y="25" fontSize="18" fontWeight="900" fill="#6366f1">3을 C로 (가장 큰 판 이동!)</text>
         </g>

         <g transform="translate(60, 160)">
            <rect width="40" height="40" rx="6" fill="#f43f5e" />
            <text x="20" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">E</text>
            <text x="60" y="25" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">1을 A로</text>
         </g>
         <g transform="translate(240, 160)">
            <rect width="40" height="40" rx="6" fill="#f43f5e" />
            <text x="20" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">F</text>
            <text x="60" y="25" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">2를 C로</text>
         </g>
         <g transform="translate(420, 160)">
            <rect width="40" height="40" rx="6" fill="#f43f5e" />
            <text x="20" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">G</text>
            <text x="60" y="25" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">1을 C로</text>
         </g>

         <path d="M 60 70 L 220 110" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4 4" />
         <path d="M 240 70 L 220 110" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4 4" />
         <path d="M 420 70 L 220 110" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4 4" />

      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        A~C (N-1을 B로), <tspan fill="#6366f1" fontWeight="800">D (큰판 N을 C로)</tspan>, E~G (N-1을 C로) 의 대칭 구조입니다.
      </text>
    </svg>
  );
}

export const TowerOfHanoiSupplementaryOptions = [
  PillarRoles,
  RecursiveRule,
  PowerOfTwoMath,
  TotalProcessOverview,
];
