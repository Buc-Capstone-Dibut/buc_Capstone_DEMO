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
      <marker id="arrow-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
      </marker>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="hsl(var(--border))" opacity="0.5" />
      </pattern>
    </defs>
  );
}

function SearchableDataStructures() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        구조에 따른 올바른 탐색 방법 선택
      </text>

      {/* Strategy 1: Linear Array */}
      <g transform="translate(80, 100)" filter="url(#soft-shadow)">
        <rect width="200" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="100" y="30" textAnchor="middle" fontSize="16" fontWeight="800" fill="#f43f5e">선형 탐색 (O(N))</text>
        <text x="100" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--muted-foreground))">정렬되지 않은 배열</text>

        <g transform="translate(40, 80)">
           {[15, 7, 22, 5].map((val, i) => (
             <g key={`lin-${i}`} transform={`translate(0, ${i * 35})`}>
                <rect width="120" height="28" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
                <text x="60" y="20" textAnchor="middle" fontSize="14" fontWeight="900" fill="hsl(var(--foreground))">{val}</text>
             </g>
           ))}
           <motion.rect x="-10" y="0" width="140" height="36" rx="8" fill="none" stroke="#f43f5e" strokeWidth="3" filter="url(#glow)"
              animate={{ y: [0, 35, 70, 105, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
        </g>
      </g>

      {/* Strategy 2: Sorted Array -> Binary Search */}
      <g transform="translate(300, 100)" filter="url(#soft-shadow)">
        <rect width="200" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="100" y="30" textAnchor="middle" fontSize="16" fontWeight="800" fill="#6366f1">이진 탐색 (O(log N))</text>
        <text x="100" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--muted-foreground))">정렬된 배열</text>

        <g transform="translate(40, 80)">
           {[5, 7, 15, 22].map((val, i) => (
             <g key={`bin-${i}`} transform={`translate(0, ${i * 35})`}>
                <rect width="120" height="28" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
                <text x="60" y="20" textAnchor="middle" fontSize="14" fontWeight="900" fill="hsl(var(--foreground))">{val}</text>
             </g>
           ))}
           {/* Center jump split animation */}
           <motion.rect x="-10" y="30" width="140" height="40" rx="8" fill="#6366f1" opacity="0.3" filter="url(#glow)"
              initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
           <motion.path d="M -20 50 L 140 50" stroke="#6366f1" strokeWidth="4" strokeDasharray="10 6"
              initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
        </g>
      </g>

      {/* Strategy 3: Hash Table */}
      <g transform="translate(520, 100)" filter="url(#soft-shadow)">
        <rect width="200" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="100" y="30" textAnchor="middle" fontSize="16" fontWeight="800" fill="#10b981">해시 탐색 (O(1))</text>
        <text x="100" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--muted-foreground))">키-값 매핑</text>

        <g transform="translate(30, 100)">
           <rect width="60" height="60" rx="12" fill="url(#primary-grad)" stroke="#fff" strokeWidth="2" />
           <text x="30" y="36" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">Key 15</text>

           <path d="M 60 30 C 80 10, 80 50, 100 30" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)" />

           <rect x="100" y="0" width="60" height="60" rx="12" fill="url(#emerald-grad)" stroke="#fff" strokeWidth="2" />
           <text x="130" y="36" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">Val</text>

           {/* Instense hit animation */}
           <motion.circle cx="130" cy="30" r="35" fill="none" stroke="#10b981" strokeWidth="4" filter="url(#glow)"
              animate={{ scale: [1, 1.4, 1], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
        </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        데이터의 <tspan fill="#6366f1" fontWeight="800">성질과 제약조건</tspan>에 맞는 최적의 알고리즘을 선택해야 합니다.
      </text>
    </svg>
  );
}

function SearchKeyCriteria() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        키(Key)를 이용한 데이터 식별
      </text>

      {/* Target Key Scanner */}
      <g transform="translate(300, 100)" filter="url(#soft-shadow)">
        <rect width="200" height="60" rx="30" fill="url(#primary-grad)" stroke="#fff" strokeWidth="3" />
        <text x="100" y="36" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff" letterSpacing="1">Target = 15</text>
        <motion.ellipse cx="100" cy="30" rx="100" ry="30" fill="none" stroke="#fff" strokeWidth="4" opacity="0.5" filter="url(#glow)"
           animate={{ rx: [90, 110, 90], ry: [20, 40, 20] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
      </g>

      {/* Dataset Nodes */}
      <g transform="translate(100, 240)">
        {[5, 12, 15, 27, 8].map((val, i) => {
          const isMatch = val === 15;
          return (
            <g key={`data-${i}`} transform={`translate(${i * 125}, 0)`}>
              <motion.rect width="100" height="100" rx="20"
                fill={isMatch ? "url(#emerald-grad)" : "url(#surface-grad)"}
                stroke={isMatch ? "#fff" : "hsl(var(--border))"}
                strokeWidth={isMatch ? 4 : 2}
                filter={isMatch ? "url(#soft-shadow)" : ""}
                animate={isMatch ? { y: [0, -10, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />

              <text x="50" y="25" textAnchor="middle" fontSize="12" fontWeight="700" fill={isMatch ? "#fff" : "hsl(var(--muted-foreground))"}>User Data</text>
              <line x1="20" y1="35" x2="80" y2="35" stroke={isMatch ? "#fff" : "hsl(var(--border))"} strokeWidth="2" opacity="0.5" />
              <text x="50" y="65" textAnchor="middle" fontSize="24" fontWeight="900" fill={isMatch ? "#fff" : "hsl(var(--foreground))"}>{val}</text>

              {/* Scan Beam */}
              <motion.path d={`M ${200 - i * 125 + 100} -50 L 50 -10`} stroke={isMatch ? "#10b981" : "#f43f5e"} strokeWidth="3" strokeDasharray="6 6" opacity="0.6"
                 initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
            </g>
          );
        })}
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        복잡한 객체 덩어리에서, 우리는 찾고자 하는 특정 조건인 <tspan fill="#6366f1" fontWeight="800">키(Key)</tspan>에 집중합니다.
      </text>
    </svg>
  );
}

function ConditionCombination() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        복합 조건 (Multiple Search Criteria)
      </text>

      {/* Filter Pipeline */}
      <g transform="translate(150, 100)" filter="url(#soft-shadow)">
        <rect width="500" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

        {/* Raw Data */}
        <text x="60" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">전체 데이터</text>
        <g transform="translate(40, 60)">
           <rect width="40" height="140" fill="#6366f1" opacity="0.4" rx="8" />
           <text x="20" y="80" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff">100%</text>
        </g>

        {/* Filter 1 */}
        <motion.path d="M 90 130 L 140 130" stroke="#f43f5e" strokeWidth="4" markerEnd="url(#arrow-head)" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1, delay:1}} />
        <g transform="translate(150, 70)">
           <path d="M 0 0 L 80 0 L 60 40 L 40 120 L 20 120 L 0 40 z" fill="url(#destructive-grad)" />
           <text x="40" y="-10" textAnchor="middle" fontSize="14" fontWeight="800" fill="#f43f5e">나이 &gt; 20</text>
        </g>

        {/* Filtered Data 1 */}
        <motion.path d="M 240 130 L 290 130" stroke="#f43f5e" strokeWidth="4" markerEnd="url(#arrow-head)" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1, delay:1.5}} />
        <g transform="translate(300, 100)">
           <rect width="40" height="60" fill="#6366f1" opacity="0.7" rx="8" />
           <text x="20" y="40" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">40%</text>
        </g>

        {/* Filter 2 */}
        <motion.path d="M 350 130 L 400 130" stroke="#10b981" strokeWidth="4" markerEnd="url(#arrow-head)" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1, delay:2}} />
        <g transform="translate(410, 85)">
           <path d="M 0 0 L 60 0 L 45 30 L 30 90 L 15 90 L 0 30 z" fill="url(#emerald-grad)" />
           <text x="30" y="-10" textAnchor="middle" fontSize="14" fontWeight="800" fill="#10b981">지역 = '서울'</text>
        </g>

        {/* Final Data */}
        <motion.path d="M 480 130 L 480 160 L 250 160 L 250 190" stroke="#10b981" strokeWidth="3" fill="none"
           initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, repeat: Infinity, delay: 2 }}
           markerEnd="url(#arrow-head)" strokeDasharray="6 6" />

        <g transform="translate(230, 200)" filter="url(#glow)">
           <rect width="40" height="20" fill="#6366f1" rx="4" />
           <text x="20" y="15" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">5%</text>
        </g>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        복잡한 탐색은 여러 개의 <tspan fill="#f43f5e" fontWeight="800">조건문(필터)</tspan>을 중첩하여 <tspan fill="#6366f1" fontWeight="800">교집합(AND)</tspan>을 구하는 과정입니다.
      </text>
    </svg>
  );
}

function SearchSpaceNarrowing() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        탐색 공간 축소 (Search Space Narrowing)
      </text>

      <g transform="translate(200, 220)">
        {/* Full Space */}
        <circle cx="0" cy="0" r="120" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="8 8" />
        <text x="0" y="-130" textAnchor="middle" fontSize="14" fontWeight="700" fill="hsl(var(--muted-foreground))">초기 탐색 공간 (N)</text>

        {/* Slicing animations */}
        <motion.path d="M 0 -120 L 0 120" stroke="#f43f5e" strokeWidth="4"
           initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: [0, 1, 1], pathLength: [0, 1, 1] }} transition={{ duration: 3, repeat: Infinity }} />

        {/* Remaining Space */}
        <motion.path d="M 0 -120 A 120 120 0 0 1 0 120 L 0 -120" fill="#6366f1" opacity="0.2"
           initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 1] }} />

        <motion.text x="50" y="0" textAnchor="middle" fontSize="18" fontWeight="900" fill="#6366f1"
           initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 1] }}>1/2</motion.text>

        {/* Second Slice */}
        <motion.path d="M 0 0 L 120 0" stroke="#f43f5e" strokeWidth="4"
           initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: [0, 0, 1], pathLength: [0, 0, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.5, 1] }} />

        {/* Narrowed Target */}
        <motion.path d="M 0 0 A 120 120 0 0 1 120 0 L 0 0" fill="#10b981" opacity="0.4"
           initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.5, 0.6, 1] }} />

        <motion.text x="45" y="-40" textAnchor="middle" fontSize="18" fontWeight="900" fill="#10b981"
           initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.5, 0.6, 1] }}>1/4</motion.text>

        {/* Target Finder */}
        <motion.circle cx="45" cy="-40" r="10" fill="none" stroke="#fff" strokeWidth="3" filter="url(#glow)"
           initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 2, 1], opacity: [0, 1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.7, 1] }} />
      </g>

      {/* Logic Sidebar */}
      <g transform="translate(500, 120)" filter="url(#soft-shadow)">
        <rect width="200" height="180" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
        <rect x="0" y="0" width="200" height="40" rx="16" fill="hsl(var(--card))" />
        <text x="100" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">공간 축소 전략</text>

        <text x="20" y="70" fontSize="13" fontWeight="800" fill="#f43f5e">1. 기준값 비교</text>
        <text x="20" y="90" fontSize="12" fill="hsl(var(--muted-foreground))">불필요한 절반 버림 (Cut)</text>

        <text x="20" y="130" fontSize="13" fontWeight="800" fill="#10b981">2. 범위 재설정</text>
        <text x="20" y="150" fontSize="12" fill="hsl(var(--muted-foreground))">남은 절반에서 재탐색</text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        고급 탐색 기법은 데이터를 모두 보지 않고 <tspan fill="#f43f5e" fontWeight="800">정답이 없는 공간을 빠르게 버리는</tspan> 전략입니다.
      </text>
    </svg>
  );
}

export const ProblemKeySupplementaryOptions = [
  SearchableDataStructures,
  SearchKeyCriteria,
  ConditionCombination,
  SearchSpaceNarrowing,
];
