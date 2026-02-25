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

function LIFOMechanism() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        LIFO (Last-In, First-Out) 불변식
      </text>

      {/* Stack Container */}
      <g transform="translate(300, 100)" filter="url(#soft-shadow)">
        <path d="M 0 0 L 0 240 L 200 240 L 200 0" fill="none" stroke="hsl(var(--border))" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="0" y="240" width="200" height="10" fill="hsl(var(--border))" rx="5" />
        <rect x="-10" y="-10" width="10" height="260" fill="hsl(var(--border))" rx="5" />
        <rect x="200" y="-10" width="10" height="260" fill="hsl(var(--border))" rx="5" />
      </g>

      {/* Box elements */}
      <g transform="translate(320, 100)">
        <g transform="translate(0, 180)">
           <rect width="160" height="50" rx="8" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" filter="url(#soft-shadow)" />
           <text x="80" y="32" textAnchor="middle" fontSize="20" fontWeight="900" fill="hsl(var(--muted-foreground))">1 (First In)</text>
        </g>
        <g transform="translate(0, 120)">
           <rect width="160" height="50" rx="8" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" filter="url(#soft-shadow)" />
           <text x="80" y="32" textAnchor="middle" fontSize="20" fontWeight="900" fill="hsl(var(--foreground))">2</text>
        </g>
        {/* Animated Last-In, First-Out Element */}
        <motion.g animate={{ y: [-80, 60, 60, -80, -80], opacity: [0, 1, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.3, 0.7, 1] }}>
           <rect width="160" height="50" rx="8" fill="url(#primary-grad)" stroke="#fff" strokeWidth="2" filter="url(#soft-shadow)" />
           <text x="80" y="32" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff">3 (Last In)</text>
        </motion.g>
      </g>

      {/* Push/Pop annotations */}
      <g transform="translate(180, 100)">
         <motion.path d="M 0 0 C 80 -40 120 -20 180 20" fill="none" stroke="#6366f1" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="6 6"
            animate={{ opacity: [1, 1, 0, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.3, 0.4, 1] }} />
         <motion.text x="30" y="-20" fontSize="18" fontWeight="bold" fill="#6366f1"
            animate={{ opacity: [1, 1, 0, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.3, 0.4, 1] }}>Push</motion.text>
      </g>

      <g transform="translate(500, 120)">
         <motion.path d="M 40 40 C 90 20 120 0 160 20" fill="none" stroke="#f43f5e" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="6 6"
            animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.6, 0.7, 1] }} />
         <motion.text x="100" y="10" fontSize="18" fontWeight="bold" fill="#f43f5e"
            animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.6, 0.7, 1] }}>Pop (First Out)</motion.text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        나중에 들어간 데이터가 가장 먼저 나오는 <tspan fill="#6366f1" fontWeight="800">역순 반환 구조</tspan>입니다.
      </text>
    </svg>
  );
}

function TimeComplexity() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        핵심 연산의 시간복잡도 O(1)
      </text>

      <g transform="translate(150, 120)">
        {/* Stack Structure */}
        <path d="M 0 0 L 0 200 L 160 200 L 160 0" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />

        {/* Top Pointer */}
        <motion.g animate={{ y: [0, 40, 40, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
           <path d="M -80 0 L -20 0" stroke="#f43f5e" strokeWidth="4" markerEnd="url(#arrow-head)" />
           <rect x="-140" y="-15" width="50" height="30" rx="6" fill="#f43f5e" />
           <text x="-115" y="5" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">Top</text>
        </motion.g>

        {/* Elements */}
        <g transform="translate(20, 40)">
           <rect width="120" height="40" rx="6" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
           <text x="60" y="25" textAnchor="middle" fontSize="18" fontWeight="bold" fill="hsl(var(--muted-foreground))">데이터 3</text>
        </g>
        <g transform="translate(20, 90)">
           <rect width="120" height="40" rx="6" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
           <text x="60" y="25" textAnchor="middle" fontSize="18" fontWeight="bold" fill="hsl(var(--muted-foreground))">데이터 2</text>
        </g>
        <g transform="translate(20, 140)">
           <rect width="120" height="40" rx="6" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
           <text x="60" y="25" textAnchor="middle" fontSize="18" fontWeight="bold" fill="hsl(var(--muted-foreground))">데이터 1</text>
        </g>

        {/* Operation Panel */}
        <g transform="translate(300, 20)">
           <rect width="250" height="150" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" filter="url(#soft-shadow)" />

           <g transform="translate(20, 30)">
              <text x="0" y="0" fontSize="18" fontWeight="800" fill="#6366f1">1. Push(Data)</text>
              <text x="140" y="0" fontSize="18" fontWeight="900" fill="hsl(var(--foreground))">O(1)</text>
              <text x="0" y="25" fontSize="13" fill="hsl(var(--muted-foreground))">Top 포인터 위치에 즉시 삽입</text>
           </g>

           <g transform="translate(20, 80)">
              <text x="0" y="0" fontSize="18" fontWeight="800" fill="#f43f5e">2. Pop()</text>
              <text x="140" y="0" fontSize="18" fontWeight="900" fill="hsl(var(--foreground))">O(1)</text>
              <text x="0" y="25" fontSize="13" fill="hsl(var(--muted-foreground))">Top 위치의 데이터 즉시 반환</text>
           </g>

           <g transform="translate(20, 130)">
              <text x="0" y="0" fontSize="18" fontWeight="800" fill="#10b981">3. Peek()</text>
              <text x="140" y="0" fontSize="18" fontWeight="900" fill="hsl(var(--foreground))">O(1)</text>
              <text x="0" y="25" fontSize="13" fill="hsl(var(--muted-foreground))">제거 없이 확인만 수행</text>
           </g>
        </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        가장 위쪽의 요소만 조작하므로 데이터 수에 상관없이 항상 <tspan fill="#6366f1" fontWeight="800">일정한 성능</tspan>을 냅니다.
      </text>
    </svg>
  );
}

function BoundaryHandling() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        오버플로(Overflow) & 언더플로(Underflow)
      </text>

      {/* Overflow Scenario */}
      <g transform="translate(150, 120)">
        <text x="80" y="-15" textAnchor="middle" fontSize="18" fontWeight="800" fill="#f43f5e">Stack Overflow</text>
        <path d="M 0 0 L 0 160 L 160 160 L 160 0" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <rect x="20" y="110" width="120" height="40" rx="6" fill="hsl(var(--muted))" />
        <rect x="20" y="60" width="120" height="40" rx="6" fill="hsl(var(--muted))" />
        <rect x="20" y="10" width="120" height="40" rx="6" fill="hsl(var(--muted))" />

        {/* Pushing to full stack */}
        <motion.g animate={{ y: [-40, -10, -40] }} transition={{ duration: 2, repeat: Infinity }}>
           <rect x="20" y="-40" width="120" height="40" rx="6" fill="url(#destructive-grad)" filter="url(#glow)" />
           <text x="80" y="-15" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">NEW (실패)</text>
        </motion.g>

        <rect x="-10" y="200" width="180" height="50" rx="8" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="80" y="222" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">꽉 찬 상태에서 Push 시발생</text>
      </g>

      {/* Underflow Scenario */}
      <g transform="translate(480, 120)">
        <text x="80" y="-15" textAnchor="middle" fontSize="18" fontWeight="800" fill="#6366f1">Stack Underflow</text>
        <path d="M 0 0 L 0 160 L 160 160 L 160 0" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <text x="80" y="90" textAnchor="middle" fontSize="16" fill="hsl(var(--muted-foreground))">비어있음 (Empty)</text>

        {/* Popping empty stack */}
        <motion.g animate={{ x: [0, 20, -20, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}>
           <rect x="40" y="-80" width="80" height="40" rx="6" fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray="4 4" />
           <text x="80" y="-55" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#6366f1">POP (실패)</text>
           <motion.path d="M 80 0 L 80 -40" stroke="#6366f1" strokeWidth="4" markerEnd="url(#arrow-head)"
              animate={{ opacity: [1, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} />
        </motion.g>

        <rect x="-10" y="200" width="180" height="50" rx="8" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="80" y="222" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">빈 상태에서 Pop 시발생</text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        스택의 한계를 넘는 요청을 방어하기 위해 <tspan fill="#f43f5e" fontWeight="800">isFull(), isEmpty()</tspan> 검사가 필수적입니다.
      </text>
    </svg>
  );
}

function PracticalUsage() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        실무 사용 패턴 (괄호 검사 등)
      </text>

      <g transform="translate(150, 100)" filter="url(#soft-shadow)">
        <rect width="500" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

        <text x="250" y="40" textAnchor="middle" fontSize="22" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="2">
           {"{  [  (  a  )  ]  }"}
        </text>

        {/* Validation Target */}
        <motion.rect x="300" y="10" width="40" height="40" fill="none" stroke="#6366f1" strokeWidth="3" rx="4"
           animate={{ x: [0, 60, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />

        {/* Stack Container inside card */}
        <g transform="translate(180, 80)">
           <path d="M 0 0 L 0 120 L 140 120 L 140 0" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />

           <motion.g animate={{ y: [0, 40, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
             <rect x="20" y="60" width="100" height="30" rx="6" fill="#10b981" opacity="0.8" />
             <text x="70" y="80" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff"> ( </text>
             <path d="M 125 75 L 160 75" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)" strokeDasharray="4 4" />
             <text x="210" y="80" fontSize="14" fontWeight="bold" fill="#10b981">짝이 맞으면 Pop</text>
           </motion.g>

           <rect x="20" y="85" width="100" height="30" rx="6" fill="#6366f1" opacity="0.8" />
           <text x="70" y="105" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff"> [ </text>
        </g>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        최근 상태나 연산을 <tspan fill="#6366f1" fontWeight="800">임시 기억하고 역순으로 되돌릴 때</tspan> (실행취소, DFS, 괄호 검사) 사용합니다.
      </text>
    </svg>
  );
}

export const LifoBasicsSupplementaryOptions = [
  LIFOMechanism,
  TimeComplexity,
  BoundaryHandling,
  PracticalUsage,
];
