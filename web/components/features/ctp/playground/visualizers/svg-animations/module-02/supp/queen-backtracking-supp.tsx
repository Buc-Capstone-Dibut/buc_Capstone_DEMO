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
    </defs>
  );
}

function StateSpaceTree() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        상태 공간 트리(State-Space Tree) 탐색
      </text>

      <g transform="translate(400, 100)">
         {/* Edges */}
         <path d="M 0 20 L -200 100" stroke="#6366f1" strokeWidth="3" opacity="0.4" />
         <path d="M 0 20 L 0 100" stroke="#6366f1" strokeWidth="3" opacity="0.4" />
         <path d="M 0 20 L 200 100" stroke="#6366f1" strokeWidth="3" opacity="0.4" />

         <path d="M -200 120 L -280 200" stroke="#6366f1" strokeWidth="3" opacity="0.4" />
         <path d="M -200 120 L -120 200" stroke="#6366f1" strokeWidth="3" opacity="0.4" />

         {/* Root */}
         <circle cx="0" cy="10" r="25" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="2" filter="url(#soft-shadow)" />
         <text x="0" y="15" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">시작</text>

         {/* Level 1 (Row 1) */}
         <g transform="translate(-200, 110)">
            <circle cx="0" cy="0" r="25" fill="#6366f1" filter="url(#glow)" />
            <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">(1,1)</text>
         </g>
         <g transform="translate(0, 110)">
            <circle cx="0" cy="0" r="25" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">(1,2)</text>
         </g>
         <g transform="translate(200, 110)">
            <circle cx="0" cy="0" r="25" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">...</text>
         </g>

         {/* Level 2 (Row 2) under (1,1) */}
         <g transform="translate(-280, 210)">
            <motion.circle cx="0" cy="0" r="25" fill="#f43f5e" filter="url(#glow)"
               animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">(2,1)</text>
         </g>
         <g transform="translate(-120, 210)">
            <motion.circle cx="0" cy="0" r="25" fill="#f43f5e" filter="url(#glow)"
               animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.5 }} />
            <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">(2,2)</text>
         </g>

         {/* Crosses for Pruning */}
         <motion.path d="M -290 200 L -270 220 M -270 200 L -290 220" stroke="#fff" strokeWidth="4"
            animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
         <motion.path d="M -130 200 L -110 220 M -110 200 L -130 220" stroke="#fff" strokeWidth="4"
            animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }} />

         {/* Annotations */}
         <text x="-370" y="115" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">1행 퀸 배치</text>
         <path d="M -370 125 L -250 125" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />

         <text x="-370" y="215" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">2행 퀸 배치</text>
         <path d="M -370 225 L -320 225" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        모든 가능한 배치를 <tspan fill="#6366f1" fontWeight="800">거대한 트리 구조</tspan>로 생각하고 루트부터 탐색해 내려갑니다.
      </text>
    </svg>
  );
}

function PromisingAndPruning() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        유망성 검사(Promising)와 가지치기(Pruning)
      </text>

      {/* Mini Board */}
      <g transform="translate(150, 100)">
         {/* 4x4 Grid */}
         {[0, 1, 2, 3].map(row =>
            [0, 1, 2, 3].map(col => (
               <rect key={`cell-${row}-${col}`} x={col * 50} y={row * 50} width="50" height="50" fill={(row + col) % 2 === 0 ? "hsl(var(--muted))" : "hsl(var(--background))"} stroke="hsl(var(--border))" />
            ))
         )}

         {/* Queen 1 */}
         <circle cx="25" cy="25" r="15" fill="#6366f1" filter="url(#glow)" />
         <text x="25" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">Q</text>

         {/* Attack Lines from Q1 */}
         <motion.path d="M 25 50 L 25 200" stroke="#f43f5e" strokeWidth="4" strokeDasharray="4 4" animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
         <motion.path d="M 50 50 L 200 200" stroke="#f43f5e" strokeWidth="4" strokeDasharray="4 4" animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 2, repeat: Infinity }} />

         {/* Q2 attempts */}
         {/* Attempt (2,1) - Fail */}
         <g transform="translate(25, 75)">
            <circle cx="0" cy="0" r="15" fill="#f43f5e" opacity="0.6" />
            <path d="M -10 -10 L 10 10 M 10 -10 L -10 10" stroke="#fff" strokeWidth="3" />
            <text x="25" y="5" fontSize="12" fontWeight="bold" fill="#f43f5e">유망하지 않음 (Pruning!)</text>
         </g>

         {/* Attempt (2,2) - Fail */}
         <g transform="translate(75, 75)">
            <circle cx="0" cy="0" r="15" fill="#f43f5e" opacity="0.6" />
            <path d="M -10 -10 L 10 10 M 10 -10 L -10 10" stroke="#fff" strokeWidth="3" />
         </g>

         {/* Attempt (2,3) - Success */}
         <motion.g transform="translate(125, 75)" animate={{ scale: [0.8, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <circle cx="0" cy="0" r="18" fill="#10b981" filter="url(#glow)" />
            <text x="0" y="5" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">Q</text>
            <text x="30" y="5" fontSize="12" fontWeight="bold" fill="#10b981">유망함! (다음 행 진행)</text>
         </motion.g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        틀린 길임을 감지하면 <tspan fill="#f43f5e" fontWeight="800">더 이상 깊이 탐색하지 않고(Pruning)</tspan> 즉시 포기합니다.
      </text>
    </svg>
  );
}

function BacktrackingRecovery() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        상태 복구(Backtracking)의 프로세스
      </text>

      <g transform="translate(150, 100)" filter="url(#soft-shadow)">
         <rect width="500" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

         <g transform="translate(50, 40)">
            <text x="0" y="0" fontSize="18" fontWeight="bold" fill="#6366f1">1. 상태 변경 (배치)</text>
            <rect x="0" y="10" width="400" height="30" rx="4" fill="#6366f1" opacity="0.2" />
            <text x="10" y="30" fontSize="14" fill="hsl(var(--foreground))" fontFamily="monospace">board[row] = col;</text>
         </g>

         <g transform="translate(50, 90)">
            <text x="0" y="0" fontSize="18" fontWeight="bold" fill="#10b981">2. 재귀 호출 (다음 단계 진입)</text>
            <rect x="0" y="10" width="400" height="30" rx="4" fill="#10b981" opacity="0.2" />
            <text x="10" y="30" fontSize="14" fill="hsl(var(--foreground))" fontFamily="monospace">solve(row + 1);</text>
         </g>

         <motion.g transform="translate(50, 140)" animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <text x="0" y="0" fontSize="18" fontWeight="bold" fill="#f43f5e">3. 상태 복구 (Backtrack)</text>
            <rect x="0" y="10" width="400" height="30" rx="4" fill="#f43f5e" opacity="0.2" />
            <text x="10" y="30" fontSize="14" fill="hsl(var(--foreground))" fontFamily="monospace">board[row] = -1; // 또는 덮어쓰기로 생략</text>
            <path d="M 420 25 C 450 25 450 -25 420 -25" fill="none" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow-head)" />
         </motion.g>

         <text x="150" y="210" textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))" fontWeight="bold">실패하여 돌아오면, 시도했던 흔적을 반드시 지워야 합니다.</text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        다음 형제 노드 탐색을 위해 <tspan fill="#f43f5e" fontWeight="800">이전 상태로 되돌리는(Undo)</tspan> 것이 핵심 패턴입니다.
      </text>
    </svg>
  );
}

function DiagonalThreatCalculation() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        체스판 대각선 위협 수학적 논리
      </text>

      <g transform="translate(100, 100)">
         {/* 5x5 Grid representing a larger board */}
         <g transform="translate(0, 0)">
            {[0, 1, 2, 3, 4].map(row =>
               [0, 1, 2, 3, 4].map(col => (
                  <rect key={`cell-${row}-${col}`} x={col * 40} y={row * 40} width="40" height="40" fill={(row + col) % 2 === 0 ? "hsl(var(--muted))" : "hsl(var(--background))"} stroke="hsl(var(--border))" />
               ))
            )}

            {/* Placed Queen at (1, 1) */}
            <circle cx="60" cy="60" r="14" fill="#6366f1" filter="url(#glow)" />
            <text x="60" y="65" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">Q</text>
            <text x="-30" y="65" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">r=1</text>
            <text x="60" y="-10" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">c=1</text>

            {/* Target Cell checking Threat at (3, 3) */}
            <motion.circle cx="140" cy="140" r="14" fill="#10b981" opacity="0.6"
               animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <text x="140" y="145" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">?</text>
            <text x="-30" y="145" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">i=3</text>
            <text x="140" y="-10" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">j=3</text>

            {/* Line connecting */}
            <motion.path d="M 60 60 L 140 140" stroke="#f43f5e" strokeWidth="4" strokeDasharray="6 6"
               animate={{ pathLength: [0, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
         </g>

         {/* Math Explanation Box */}
         <g transform="translate(250, 40)" filter="url(#soft-shadow)">
            <rect width="320" height="150" rx="16" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="2" />

            <text x="20" y="30" fontSize="16" fontWeight="bold" fill="#6366f1">대각선 위협 판별식</text>

            <rect x="20" y="45" width="280" height="40" rx="6" fill="#f43f5e" opacity="0.1" />
            <text x="160" y="72" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))" fontFamily="monospace">
               | r - i | == | c - j |
            </text>

            <text x="20" y="110" fontSize="14" fill="hsl(var(--muted-foreground))">
               행의 차이의 절댓값과
            </text>
            <text x="20" y="130" fontSize="14" fill="hsl(var(--muted-foreground))">
               열의 차이의 절댓값이 같다면 <tspan fill="#f43f5e" fontWeight="bold">대각선상에 존재</tspan>
            </text>
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        기울기가 1 또는 -1인 직선 방정식의 원리를 통해 <tspan fill="#6366f1" fontWeight="800">O(1) 수식 하나로 판별</tspan>합니다.
      </text>
    </svg>
  );
}

export const QueenBacktrackingSupplementaryOptions = [
  StateSpaceTree,
  PromisingAndPruning,
  BacktrackingRecovery,
  DiagonalThreatCalculation,
];
