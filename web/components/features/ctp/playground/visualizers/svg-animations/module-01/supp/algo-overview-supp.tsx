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
      <linearGradient id="rose-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="100%" stopColor="#e11d48" />
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
      <marker id="arrow-head-primary" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
      </marker>
      <marker id="arrow-head-emerald" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
      </marker>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="hsl(var(--border))" opacity="0.5" />
      </pattern>
    </defs>
  );
}

function InputOutputDefinition() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        입력과 출력의 변환 (Transformation)
      </text>

      {/* Input Section */}
      <g transform="translate(100, 160)" filter="url(#soft-shadow)">
        <rect width="140" height="120" rx="20" fill="url(#surface-grad)" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="6 6" />
        <text x="70" y="30" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--muted-foreground))">입력 (Input)</text>

        {/* Raw Data */}
        <text x="70" y="70" textAnchor="middle" fontSize="28" fontWeight="900" fill="hsl(var(--foreground))">["B", "A", "C"]</text>
        <text x="70" y="100" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--muted-foreground))">정렬되지 않은 데이터</text>
      </g>

      <path d="M 260 220 L 330 220" stroke="url(#primary-grad)" strokeWidth="4" markerEnd="url(#arrow-head-primary)" strokeDasharray="8 6" />

      {/* Algorithm Box */}
      <g transform="translate(350, 140)" filter="url(#soft-shadow)">
        <rect width="100" height="160" rx="24" fill="url(#primary-grad)" stroke="#fff" strokeWidth="2" />
        <text x="50" y="85" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff" letterSpacing="2">ALGO</text>
        <text x="50" y="105" textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(255,255,255,0.7)">문제 해결 절차</text>

        {/* Processing Waves effect */}
        <motion.rect x="10" y="120" width="80" height="6" rx="3" fill="#fff" opacity="0.4"
           animate={{ width: [10, 80, 10], x: [45, 10, 45] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
        <motion.rect x="10" y="135" width="80" height="6" rx="3" fill="#fff" opacity="0.4"
           animate={{ width: [80, 10, 80], x: [10, 45, 10] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
      </g>

      <path d="M 470 220 L 540 220" stroke="url(#emerald-grad)" strokeWidth="4" markerEnd="url(#arrow-head-emerald)" strokeDasharray="8 6" />

      {/* Output Section */}
      <g transform="translate(560, 160)" filter="url(#soft-shadow)">
        <rect width="140" height="120" rx="20" fill="url(#surface-grad)" stroke="url(#emerald-grad)" strokeWidth="3" />
        <text x="70" y="30" textAnchor="middle" fontSize="14" fontWeight="800" fill="#10b981">출력 (Output)</text>

        {/* Formatted Data */}
        <text x="70" y="70" textAnchor="middle" fontSize="28" fontWeight="900" fill="#10b981">["A", "B", "C"]</text>
        <text x="70" y="100" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--muted-foreground))">정렬된 데이터 🎯</text>
      </g>

      {/* Code Text Underneath */}
      <rect x="200" y="340" width="400" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="370" textAnchor="middle" fontSize="15" fontFamily="monospace" fontWeight="600" fill="hsl(var(--foreground))">
        <tspan fill="#6366f1">function</tspan> algorithm(input) =&gt; <tspan fill="#10b981">output</tspan>;
      </text>

      {/* Flying Code Elements */}
      <motion.text x="0" y="0" fontSize="20" fontWeight="900" fill="#6366f1" filter="url(#glow)"
         animate={{ x: [160, 380, 600], y: [160, 100, 160], opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
         transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>{`[?]`}</motion.text>
    </svg>
  );
}

function RealWorldAnalogy() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        실생활 비유: 요리 레시피 (Recipe)
      </text>

      <g transform="translate(180, 130)">
        {/* Ingredients */}
        <g transform="translate(0, 0)" filter="url(#soft-shadow)">
           <circle cx="40" cy="40" r="40" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
           <text x="40" y="44" textAnchor="middle" fontSize="24">🍅</text>
           <text x="40" y="100" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--foreground))">재료 (Input)</text>
        </g>

        <path d="M 120 40 L 170 40" stroke="hsl(var(--muted-foreground))" strokeWidth="3" markerEnd="url(#arrow-head)" opacity="0.5" />

        {/* Recipe */}
        <g transform="translate(190, -20)" filter="url(#soft-shadow)">
           <rect width="140" height="120" rx="16" fill="url(#primary-grad)" />
           <text x="70" y="30" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">레시피 (Algo)</text>
           <line x1="20" y1="50" x2="80" y2="50" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
           <line x1="20" y1="70" x2="110" y2="70" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
           <line x1="20" y1="90" x2="60" y2="90" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
           <text x="70" y="150" textAnchor="middle" fontSize="14" fontWeight="800" fill="#6366f1">정확한 순서 파악</text>
        </g>

        <path d="M 370 40 L 420 40" stroke="url(#emerald-grad)" strokeWidth="4" markerEnd="url(#arrow-head-emerald)" />

        {/* Dish */}
        <g transform="translate(440, 0)" filter="url(#soft-shadow)">
           <circle cx="40" cy="40" r="40" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="3" />
           <text x="40" y="44" textAnchor="middle" fontSize="24">🥗</text>
           <text x="40" y="100" textAnchor="middle" fontSize="14" fontWeight="800" fill="#10b981">요리 (Output)</text>
        </g>
      </g>

      <rect x="150" y="340" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="370" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        누가 만들어도 동일한 결과를 보장하는 명확한 절차가 바로 <tspan fill="#6366f1" fontWeight="800">알고리즘</tspan>입니다.
      </text>
    </svg>
  );
}

function TimeComplexityThought() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        효율성(시간 복잡도) 고민
      </text>

      {/* Axis */}
      <g transform="translate(150, 100)">
        <path d="M 50 220 L 50 30" stroke="hsl(var(--muted-foreground))" strokeWidth="3" markerEnd="url(#arrow-head)" opacity="0.5" />
        <path d="M 50 220 L 450 220" stroke="hsl(var(--muted-foreground))" strokeWidth="3" markerEnd="url(#arrow-head)" opacity="0.5" />
        <text x="10" y="40" textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))" fontWeight="700">연산량</text>
        <text x="460" y="240" textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))" fontWeight="700">데이터 (N)</text>

        {/* Growth Curves */}
        <motion.path d="M 50 220 Q 300 220 400 30" fill="none" stroke="#f43f5e" strokeWidth="4" filter="url(#glow)"
           initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }} />

        <motion.path d="M 50 220 L 400 100" fill="none" stroke="#3b82f6" strokeWidth="4" filter="url(#glow)"
           initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }} />

        <circle cx="200" cy="180" r="8" fill="#3b82f6" />
        <text x="215" y="175" fontSize="14" fontWeight="800" fill="#3b82f6">O(N)</text>

        <circle cx="320" cy="90" r="8" fill="#f43f5e" />
        <text x="335" y="85" fontSize="14" fontWeight="800" fill="#f43f5e">O(N²)</text>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        가파르게 솟구치는 <tspan fill="#f43f5e" fontWeight="800">붉은 곡선</tspan>을 완만한 <tspan fill="#3b82f6" fontWeight="800">파란 선</tspan>으로 눕히는 것이 엔지니어링입니다.
      </text>
    </svg>
  );
}

function BigOComparison() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="40" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        Big-O 복잡도 극단적 비교
      </text>

      <g transform="translate(100, 80)">
        {/* O(1) */}
        <g transform="translate(0, 0)" filter="url(#soft-shadow)">
          <rect width="180" height="220" rx="16" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
          <text x="90" y="30" textAnchor="middle" fontSize="20" fontWeight="900" fill="#10b981">O(1)</text>
          <text x="90" y="55" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--muted-foreground))">상수 시간</text>

          <rect x="40" y="80" width="100" height="30" rx="6" fill="#10b981" opacity="0.2" />
          <rect x="40" y="120" width="100" height="30" rx="6" fill="#10b981" opacity="0.2" />
          <rect x="40" y="160" width="100" height="30" rx="6" fill="#10b981" opacity="0.2" />
          <line x1="90" y1="80" x2="90" y2="190" stroke="#10b981" strokeWidth="4" />

          <text x="90" y="210" textAnchor="middle" fontSize="12" fontWeight="700" fill="#10b981">항상 1초</text>
        </g>

        {/* O(N) */}
        <g transform="translate(210, 0)" filter="url(#soft-shadow)">
          <rect width="180" height="220" rx="16" fill="url(#surface-grad)" stroke="#3b82f6" strokeWidth="2" />
          <text x="90" y="30" textAnchor="middle" fontSize="20" fontWeight="900" fill="#3b82f6">O(N)</text>
          <text x="90" y="55" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--muted-foreground))">선형 시간</text>

          <motion.path d="M 40 180 L 140 80" stroke="#3b82f6" strokeWidth="4" fill="none"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} />

          <text x="90" y="210" textAnchor="middle" fontSize="12" fontWeight="700" fill="#3b82f6">데이터 비례 (10초)</text>
        </g>

        {/* O(N^2) */}
        <g transform="translate(420, 0)" filter="url(#soft-shadow)">
          <rect width="180" height="220" rx="16" fill="url(#surface-grad)" stroke="#f43f5e" strokeWidth="2" />
          <text x="90" y="30" textAnchor="middle" fontSize="20" fontWeight="900" fill="#f43f5e">O(N²)</text>
          <text x="90" y="55" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--muted-foreground))">제곱 시간</text>

          <motion.path d="M 40 180 Q 120 180 140 80" stroke="#f43f5e" strokeWidth="4" fill="none"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} />

          <text x="90" y="210" textAnchor="middle" fontSize="12" fontWeight="700" fill="#f43f5e">기하급수 폭발 (100초)</text>
        </g>
      </g>

      <rect x="150" y="340" width="500" height="60" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="365" textAnchor="middle" fontSize="14" fontWeight="600" fill="hsl(var(--foreground))">
        N = 10만일 때, <tspan fill="#10b981" fontWeight="800">O(1)</tspan>은 즉시 완료되지만
      </text>
      <text x="400" y="385" textAnchor="middle" fontSize="14" fontWeight="600" fill="hsl(var(--foreground))">
        <tspan fill="#f43f5e" fontWeight="800">O(N²)</tspan>은 무려 100억 번의 연산으로 서버를 정지시킬 수 있습니다.
      </text>
    </svg>
  );
}

export const AlgoOverviewSupplementaryOptions = [
  InputOutputDefinition,
  RealWorldAnalogy,
  TimeComplexityThought,
  BigOComparison,
];
