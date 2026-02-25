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
      <linearGradient id="amber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="surface-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="1" />
        <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.1" />
      </filter>
      <marker id="arrow-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
      </marker>
      <marker id="arrow-head-emerald" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
      </marker>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.3" />
      </pattern>
    </defs>
  );
}

function ControlFlowBranching() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      {/* Main Title */}
      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        제어 흐름: if / else 분기점
      </text>

      {/* Connecting Paths */}
      <path d="M 160 220 L 300 220" stroke="url(#primary-grad)" strokeWidth="4" fill="none" />

      {/* True Path */}
      <path d="M 460 220 C 520 220, 520 130, 600 130" stroke="url(#emerald-grad)" strokeWidth="4" fill="none" markerEnd="url(#arrow-head-emerald)" />

      {/* False Path */}
      <path d="M 460 220 C 520 220, 520 310, 600 310" stroke="hsl(var(--muted-foreground))" strokeWidth="3" strokeDasharray="8 6" fill="none" opacity="0.6" />

      {/* Node: INPUT */}
      <g transform="translate(60, 180)" filter="url(#soft-shadow)">
        <rect width="100" height="80" rx="16" fill="url(#surface-grad)" stroke="url(#primary-grad)" strokeWidth="2" />
        <text x="50" y="35" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--muted-foreground))" opacity="0.8">입력 점수</text>
        <text x="50" y="60" textAnchor="middle" fontSize="22" fontWeight="900" fill="url(#primary-grad)">85</text>
      </g>

      {/* Node: CONDITION (Diamondish but rounded) */}
      <g transform="translate(290, 150)" filter="url(#soft-shadow)">
        <polygon points="80,0 160,70 80,140 0,70" fill="url(#surface-grad)" stroke="url(#primary-grad)" strokeWidth="3" />
        <text x="80" y="60" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--foreground))">점수 &gt;= 80 ?</text>
        <rect x="50" y="75" width="60" height="24" rx="12" fill="url(#primary-grad)" opacity="0.1" />
        <text x="80" y="92" textAnchor="middle" fontSize="12" fontWeight="800" fill="#6366f1">Condition</text>
      </g>

      {/* Node: TRUE */}
      <g transform="translate(615, 90)" filter="url(#soft-shadow)">
        <rect width="140" height="80" rx="16" fill="url(#surface-grad)" stroke="url(#emerald-grad)" strokeWidth="3" />
        <text x="70" y="46" textAnchor="middle" fontSize="20" fontWeight="900" fill="#10b981">합격 (Pass)</text>
        <circle cx="20" cy="20" r="10" fill="#10b981" filter="url(#glow)" />
        <path d="M 15 20 L 19 24 L 25 16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Node: FALSE */}
      <g transform="translate(615, 270)" filter="url(#soft-shadow)">
        <rect width="140" height="80" rx="16" fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
        <text x="70" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill="hsl(var(--muted-foreground))">불합격 (Fail)</text>
      </g>

      {/* Animated Glowing Packet representing Data/Execution */}
      <motion.circle r="8" fill="#fff" filter="url(#glow)"
        animate={{
           cx: [50, 200, 360, 460, 500, 600],
           cy: [220, 220, 220, 220, 130, 130],
           scale: [0, 1, 1, 1, 1, 0],
           opacity: [0, 1, 1, 1, 1, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle r="12" fill="none" stroke="#10b981" strokeWidth="2" filter="url(#glow)"
        animate={{
           cx: [50, 200, 360, 460, 500, 600],
           cy: [220, 220, 220, 220, 130, 130],
           scale: [0, 1.5, 1.5, 1.5, 1.5, 0],
           opacity: [0, 1, 1, 1, 1, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Code Summary Overlay */}
      <g transform="translate(250, 340)">
        <rect width="300" height="70" rx="20" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
        <text x="150" y="32" textAnchor="middle" fontSize="14" fontFamily="monospace" fontWeight="600" fill="hsl(var(--foreground))">
          <tspan fill="#6366f1">if</tspan> (점수 &gt;= 80) {"{"} <tspan fill="#10b981">return "합격";</tspan> {"}"}
        </text>
        <text x="150" y="52" textAnchor="middle" fontSize="14" fontFamily="monospace" fontWeight="600" fill="hsl(var(--foreground))">
          <tspan fill="#6366f1">else</tspan> {"{"} <tspan fill="hsl(var(--muted-foreground))">return "불합격";</tspan> {"}"}
        </text>
      </g>
    </svg>
  );
}

function IterationAccumulation() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        상태의 누적과 반복 (for 루프)
      </text>

      {/* Central Accumulator Box */}
      <g transform="translate(180, 135)" filter="url(#soft-shadow)">
        <rect width="180" height="180" rx="30" fill="url(#surface-grad)" stroke="url(#primary-grad)" strokeWidth="3" />
        <rect x="40" y="-15" width="100" height="30" rx="15" fill="#6366f1" />
        <text x="90" y="4" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#fff" letterSpacing="1">누적 변수 (sum)</text>

        {/* Animated Sum Value */}
        <motion.text x="90" y="110" textAnchor="middle" fontSize="64" fontWeight="900" fill="url(#primary-grad)"
          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        >
          Σ
        </motion.text>
      </g>

      {/* Infinity Orbit / Loop path */}
      <g transform="translate(560, 225)">
        <path d="M -80 0 A 70 70 0 1 1 80 0 A 70 70 0 1 1 -80 0" fill="none" stroke="hsl(var(--border))" strokeWidth="6" strokeDasharray="8 8" opacity="0.5" />

        <motion.path
          d="M -80 0 A 70 70 0 1 1 80 0 A 70 70 0 1 1 -80 0"
          fill="none"
          stroke="url(#emerald-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="140 300"
          animate={{ strokeDashoffset: [300, -140] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        <text x="0" y="-10" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">i = 0 ~ N</text>
        <text x="0" y="20" textAnchor="middle" fontSize="24" fontWeight="900" fill="#10b981">반복</text>
      </g>

      {/* Connecting Pipe */}
      <path d="M 480 225 L 360 225" stroke="url(#primary-grad)" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="6 6" />

      {/* Feeding Data Packets */}
      <motion.g
        initial={{ x: 480, y: 225, opacity: 0, scale: 0.5 }}
        animate={{ x: [480, 420, 360], scale: [0.5, 1, 0.5], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="-30" y="-20" width="60" height="40" rx="10" fill="#fff" filter="url(#glow)" stroke="#6366f1" strokeWidth="2" />
        <text x="0" y="5" textAnchor="middle" fontSize="16" fontWeight="800" fill="#6366f1">+arr[i]</text>
      </motion.g>

      {/* Bottom Explainer */}
      <g transform="translate(150, 370)">
         <rect width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" />
         <text x="250" y="30" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
           반복문은 동일한 로직을 수행하며, 주로 <tspan fill="#6366f1" fontWeight="800">합계/결과를 누적</tspan>합니다.
         </text>
      </g>
    </svg>
  );
}

function CombiningPatterns() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        실전 패턴: 반복문(for) 안의 조건문(if)
      </text>

      {/* Outer Loop Frame */}
      <rect x="60" y="100" width="680" height="240" rx="30" fill="none" stroke="url(#emerald-grad)" strokeWidth="3" strokeDasharray="12 12" opacity="0.5" />
      <rect x="100" y="85" width="180" height="30" rx="15" fill="#10b981" />
      <text x="190" y="105" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">for: 매 원소마다 반복</text>

      {/* Array Element Incoming */}
      <g transform="translate(100, 180)" filter="url(#soft-shadow)">
        <rect width="80" height="80" rx="20" fill="url(#surface-grad)" stroke="url(#primary-grad)" strokeWidth="2" />
        <text x="40" y="35" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">arr[i]</text>
        <text x="40" y="65" textAnchor="middle" fontSize="28" fontWeight="900" fill="url(#primary-grad)">7</text>
      </g>

      <path d="M 180 220 L 280 220" stroke="hsl(var(--border))" strokeWidth="4" markerEnd="url(#arrow-head)" />

      {/* Filter Gate (IF Condition) */}
      <g transform="translate(290, 150)" filter="url(#soft-shadow)">
        <polygon points="100,0 200,70 100,140 0,70" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="4" />
        <rect x="60" y="30" width="80" height="24" rx="12" fill="#10b981" opacity="0.1" />
        <text x="100" y="46" textAnchor="middle" fontSize="12" fontWeight="800" fill="#10b981">IF 필터링</text>
        <text x="100" y="85" textAnchor="middle" fontSize="18" fontWeight="900" fill="hsl(var(--foreground))">조건(짝수?)</text>
      </g>

      <path d="M 490 220 L 610 220" stroke="url(#primary-grad)" strokeWidth="4" markerEnd="url(#arrow-head)" />

      {/* Downward False Path */}
      <path d="M 390 290 L 390 350" stroke="hsl(var(--muted-foreground))" strokeWidth="3" strokeDasharray="6 6" fill="none" />
      <text x="390" y="370" textAnchor="middle" fontSize="14" fontWeight="700" fill="hsl(var(--muted-foreground))">조건 불만족시 건너뜀 (Skip)</text>

      {/* Executed Action */}
      <g transform="translate(620, 180)" filter="url(#soft-shadow)">
        <rect width="100" height="80" rx="20" fill="url(#primary-grad)" />
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff">동작 실행</text>
      </g>

      {/* Animated Flow Packet */}
      <motion.circle r="10" fill="#fff" filter="url(#glow)"
        animate={{
          cx: [140, 240, 390, 550, 670],
          cy: [220, 220, 220, 220, 220],
          opacity: [0, 1, 1, 1, 0],
          scale: [0, 1, 1, 1, 0]
        }}
        transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.25, 0.5, 0.75, 1], ease: "linear" }}
      />
    </svg>
  );
}

function NestedFlowCodePattern() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        중첩 흐름의 실전 코드 패턴 (For + If)
      </text>

      {/* Code Editor Window */}
      <g transform="translate(150, 100)" filter="url(#soft-shadow)">
        <rect width="500" height="260" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
        {/* Mac OS window dots */}
        <circle cx="20" cy="20" r="6" fill="#f43f5e" />
        <circle cx="40" cy="20" r="6" fill="#facc15" />
        <circle cx="60" cy="20" r="6" fill="#10b981" />
        <line x1="0" y1="40" x2="500" y2="40" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />

        {/* Code Lines */}
        <g transform="translate(40, 70)" fontSize="16" fontFamily="monospace" fontWeight="600" fill="hsl(var(--foreground))">
          {/* For loop */}
          <text x="0" y="20"><tspan fill="#6366f1">for</tspan> (<tspan fill="#6366f1">let</tspan> i = <tspan fill="#f59e0b">0</tspan>; i &lt; arr.length; i++) {'{'}</text>

          {/* Highlight for loop block */}
          <rect x="10" y="28" width="410" height="150" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" rx="8" opacity="0.4" />
          <text x="425" y="50" fontSize="12" fill="#6366f1" opacity="0.8">Outer Loop</text>

          {/* If condition */}
          <text x="40" y="60"><tspan fill="#ec4899">if</tspan> (arr[i] === <tspan fill="#f59e0b">target</tspan>) {'{'}</text>

          {/* Highlight if block */}
          <rect x="50" y="68" width="350" height="70" fill="none" stroke="#ec4899" strokeWidth="2" strokeDasharray="4 4" rx="8" opacity="0.4" />
          <text x="405" y="90" fontSize="12" fill="#ec4899" opacity="0.8">Inner Filter</text>

          {/* Action */}
          <text x="80" y="100">console.<tspan fill="#3b82f6">log</tspan>(<tspan fill="#10b981">"Found at "</tspan> + i);</text>
          <text x="80" y="125"><tspan fill="#f43f5e">break</tspan>; <tspan fill="hsl(var(--muted-foreground))">// 조기 종료</tspan></text>

          <text x="40" y="150">{'}'}</text>
          <text x="0" y="190">{'}'}</text>
        </g>
      </g>

      <rect x="150" y="380" width="500" height="40" rx="20" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="405" textAnchor="middle" fontSize="14" fontWeight="600" fill="hsl(var(--foreground))">
        가장 강력하게 쓰이는 <tspan fill="#6366f1" fontWeight="800">탐색(루프)</tspan>과 <tspan fill="#ec4899" fontWeight="800">필터링(분기)</tspan>의 조합입니다.
      </text>
    </svg>
  );
}

export const ConditionLoopSupplementaryOptions = [
  ControlFlowBranching,
  IterationAccumulation,
  CombiningPatterns,
  NestedFlowCodePattern,
];
