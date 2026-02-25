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

function RecursionTree() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        재귀 트리(Recursion Tree) 전개
      </text>

      <g transform="translate(400, 100)">
        {/* Edges */}
        <path d="M 0 20 L -150 100" stroke="#6366f1" strokeWidth="3" opacity="0.4" />
        <path d="M 0 20 L 150 100" stroke="#6366f1" strokeWidth="3" opacity="0.4" />
        <path d="M -150 120 L -220 200" stroke="#6366f1" strokeWidth="3" opacity="0.4" />
        <path d="M -150 120 L -80 200" stroke="#6366f1" strokeWidth="3" opacity="0.4" />
        <path d="M 150 120 L 80 200" stroke="#6366f1" strokeWidth="3" opacity="0.4" />
        <path d="M 150 120 L 220 200" stroke="#6366f1" strokeWidth="3" opacity="0.4" />

        {/* Level 0 */}
        <motion.g animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
           <rect x="-40" y="-10" width="80" height="40" rx="8" fill="url(#primary-grad)" filter="url(#glow)" />
           <text x="0" y="16" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">fib(4)</text>
        </motion.g>

        {/* Level 1 */}
        <rect x="-190" y="90" width="80" height="40" rx="8" fill="url(#surface-grad)" stroke="#a855f7" strokeWidth="2" />
        <text x="-150" y="116" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">fib(3)</text>

        <rect x="110" y="90" width="80" height="40" rx="8" fill="url(#surface-grad)" stroke="#a855f7" strokeWidth="2" />
        <text x="150" y="116" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">fib(2)</text>

        {/* Level 2 (Base cases & sub) */}
        <rect x="-260" y="190" width="80" height="40" rx="8" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="2" />
        <text x="-220" y="216" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">fib(2)</text>

        <rect x="-120" y="190" width="80" height="40" rx="8" fill="#10b981" opacity="0.8" />
        <text x="-80" y="216" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">fib(1)</text>

        <rect x="40" y="190" width="80" height="40" rx="8" fill="#10b981" opacity="0.8" />
        <text x="80" y="216" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">fib(1)</text>

        <rect x="180" y="190" width="80" height="40" rx="8" fill="#10b981" opacity="0.8" />
        <text x="220" y="216" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">fib(0)</text>

        {/* Highlights */}
        <text x="-310" y="20" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">Call Depth 0</text>
        <path d="M -310 30 L -120 30" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />

        <text x="-310" y="100" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">Call Depth 1</text>
        <path d="M -310 110 L -210 110" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />

        <text x="-310" y="200" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">Call Depth 2</text>
        <path d="M -310 210 L -280 210" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        복잡한 중첩 호출을 <tspan fill="#6366f1" fontWeight="800">나뭇가지 형태(Tree)</tspan>로 넓게 펼치면 얽힌 실행 흐름이 한눈에 들어옵니다.
      </text>
    </svg>
  );
}

function TopDownIntuition() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        하향식(Top-Down) 의사코드 흐름
      </text>

      <g transform="translate(150, 100)">
         {/* Top Down Box */}
         <g transform="translate(0, 0)" filter="url(#soft-shadow)">
            <rect width="220" height="240" rx="16" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="2" />
            <text x="110" y="30" textAnchor="middle" fontSize="20" fontWeight="900" fill="#6366f1">1. 하향식 진입</text>

            <rect x="20" y="50" width="180" height="40" rx="6" fill="#6366f1" opacity="0.1" />
            <text x="110" y="75" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">A(4) 호출</text>

            <rect x="20" y="100" width="180" height="40" rx="6" fill="#6366f1" opacity="0.3" />
            <text x="110" y="125" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">A(3) 호출</text>

            <rect x="20" y="150" width="180" height="40" rx="6" fill="#6366f1" opacity="0.5" />
            <text x="110" y="175" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">A(2) 호출</text>

            <rect x="20" y="200" width="180" height="30" rx="6" fill="#10b981" />
            <text x="110" y="220" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">A(1) - Base Case 도달</text>
         </g>

         <path d="M 250 120 L 290 120" stroke="hsl(var(--muted-foreground))" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="6 6" />

         <g transform="translate(320, 0)" filter="url(#soft-shadow)">
            <rect width="250" height="240" rx="16" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
            <text x="125" y="30" textAnchor="middle" fontSize="20" fontWeight="900" fill="#10b981">2. 연산 보류(Pending)</text>

            <text x="20" y="70" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">A(4): 4 * <tspan fill="#f43f5e">A(3) 대기 중...</tspan></text>
            <text x="20" y="120" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">A(3): 3 * <tspan fill="#f43f5e">A(2) 대기 중...</tspan></text>
            <text x="20" y="170" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">A(2): 2 * <tspan fill="#f43f5e">A(1) 대기 중...</tspan></text>

            <motion.path d="M 125 50 L 125 150" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow-head)"
               animate={{ y: [0, 20, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        가장 깊은 곳까지 내려가기 전에는 <tspan fill="#f43f5e" fontWeight="800">모든 이전 연산이 미완성 상태로 대기(Pending)</tspan>합니다.
      </text>
    </svg>
  );
}

function BottomUpExecution() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        상향식(Bottom-Up) 반환과 조립
      </text>

      <g transform="translate(200, 100)">
         {/* Bottom Up Block Flow */}

         <g transform="translate(0, 180)">
            <rect width="180" height="40" rx="8" fill="#10b981" filter="url(#glow)" />
            <text x="90" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">A(1) = 1 완료!</text>
         </g>

         <motion.path d="M 90 170 L 90 140" stroke="#10b981" strokeWidth="4" markerEnd="url(#arrow-head-emerald)"
            animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 0.5 }} />

         <motion.g transform="translate(0, 90)" animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 1 }}>
            <rect width="180" height="40" rx="8" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
            <text x="90" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">A(2) = 2 * <tspan fill="#10b981">1</tspan> = 2</text>
         </motion.g>

         <motion.path d="M 90 80 L 90 50" stroke="#10b981" strokeWidth="4" markerEnd="url(#arrow-head-emerald)"
            animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 1.5 }} />

         <motion.g transform="translate(0, 0)" animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 2 }}>
            <rect width="180" height="40" rx="8" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
            <text x="90" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">A(3) = 3 * <tspan fill="#10b981">2</tspan> = 6</text>
         </motion.g>

         {/* Arrow curving out to Final */}
         <motion.path d="M 190 20 Q 250 20 250 -40 Q 250 -80 320 -80" fill="none" stroke="#6366f1" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="6 6"
            animate={{ pathLength: [0, 1] }} transition={{ duration: 1, delay: 3 }} />

         <motion.g transform="translate(330, -100)" filter="url(#glow)" animate={{ opacity: [0, 1], scale: [0.8, 1.1, 1] }} transition={{ duration: 1, delay: 4 }}>
            <rect width="160" height="50" rx="12" fill="url(#primary-grad)" />
            <text x="80" y="32" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff">최종 6 도출!</text>
         </motion.g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        밑바닥(Base)에서 구한 확실한 값을 토대로, <tspan fill="#10b981" fontWeight="800">대기 중이던 식들을 거슬러 올라가며 도축</tspan>합니다.
      </text>
    </svg>
  );
}

function EquationSubstitution() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        등식의 치환(Substitution) 과정
      </text>

      <g transform="translate(150, 100)" filter="url(#soft-shadow)">
         <rect cx="0" cy="0" width="500" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

         <g transform="translate(80, 50)">
            <text x="0" y="0" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" fontFamily="monospace">
              f(3) = 3 + <tspan fill="#f43f5e">f(2)</tspan>
            </text>

            {/* Substitution step 1 */}
            <motion.path d="M 120 15 L 120 40 L 70 40 L 70 55" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />

            <motion.text x="30" y="80" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" fontFamily="monospace"
               animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 1 }}>
              = 3 + ( <tspan fill="#f43f5e">2 + f(1)</tspan> )
            </motion.text>

            {/* Substitution step 2 */}
            <motion.path d="M 180 95 L 180 120 L 130 120 L 130 135" fill="none" stroke="hsl(var(--border))" strokeWidth="2"
               animate={{ opacity: [0, 1] }} transition={{ duration: 0.1, delay: 2.1 }} />

            <motion.text x="30" y="160" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" fontFamily="monospace"
               animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 3 }}>
              = 3 + ( 2 + ( <tspan fill="#10b981">1</tspan> ) )
            </motion.text>
         </g>

         {/* Final Result Slide In */}
         <motion.g transform="translate(380, 160)" animate={{ opacity: [0, 1], x: [20, 0] }} transition={{ duration: 1, delay: 4.5 }}>
            <rect y="-35" width="80" height="50" rx="8" fill="url(#primary-grad)" filter="url(#glow)" />
            <text x="40" y="-3" textAnchor="middle" fontSize="26" fontWeight="900" fill="#fff">= 6</text>
         </motion.g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        수학에서 변수에 값을 대입하듯, <tspan fill="#6366f1" fontWeight="800">미지수 함수를 점진적으로 풀어서 식을 완성</tspan>하는 논리입니다.
      </text>
    </svg>
  );
}

export const RecursionAnalysisSupplementaryOptions = [
  RecursionTree,
  TopDownIntuition,
  BottomUpExecution,
  EquationSubstitution,
];
