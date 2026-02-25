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

function PointerStateTransition() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        포인터 상태 전이 추적
      </text>

      <g transform="translate(150, 150)">
         {/* Array Slots */}
         {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={i * 100} y="0" width="90" height="90" rx="12" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" filter="url(#soft-shadow)" />
         ))}

         {/* Data Elements */}
         <motion.g animate={{ x: [100, 100], opacity: [0, 1, 1, 0, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.1, 0.7, 0.8, 1] }}>
            <rect x="0" y="0" width="90" height="90" rx="12" fill="hsl(var(--muted-foreground))" opacity="0.2" />
            <text x="45" y="55" textAnchor="middle" fontSize="28" fontWeight="bold" fill="hsl(var(--foreground))">A</text>
         </motion.g>

         <motion.g animate={{ opacity: [0, 0, 1, 1, 1] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.2, 0.3, 1, 1] }}>
            <rect x="200" y="0" width="90" height="90" rx="12" fill="url(#emerald-grad)" opacity="0.5" filter="url(#glow)" />
            <text x="245" y="55" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#fff">B</text>
         </motion.g>

         {/* Front Pointer (moves right on dequeue) */}
         <motion.g animate={{ x: [145, 145, 245, 245, 145] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.6, 0.7, 1, 1], ease: "easeInOut" }}>
            <path d="M 0 110 L 0 150" stroke="#f43f5e" strokeWidth="4" />
            <polygon points="-10,110 10,110 0,95" fill="#f43f5e" />
            <rect x="-30" y="160" width="60" height="30" rx="6" fill="#f43f5e" />
            <text x="0" y="180" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">Front</text>
         </motion.g>

         {/* Rear Pointer (moves right on enqueue) */}
         <motion.g animate={{ x: [145, 245, 245, 245, 145] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.2, 0.3, 1, 1], ease: "easeInOut" }}>
            <path d="M 0 -20 L 0 20" stroke="#6366f1" strokeWidth="4" />
            <polygon points="-10,20 10,20 0,35" fill="#6366f1" />
            <rect x="-30" y="-60" width="60" height="30" rx="6" fill="#6366f1" />
            <text x="0" y="-40" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">Rear</text>
         </motion.g>

      </g>

      {/* Operation Log */}
      <g transform="translate(150, 50)" filter="url(#soft-shadow)">
         <motion.rect width="180" height="40" rx="8" fill="#6366f1" opacity="0.2" animate={{ opacity: [0, 0.8, 0, 0, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.2, 0.3, 1, 1] }} />
         <motion.text x="90" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#6366f1" animate={{ opacity: [0, 1, 0, 0, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.2, 0.3, 1, 1] }}>Enqueue(B) ➡️ Rear+1</motion.text>

         <motion.rect y="40" width="180" height="40" rx="8" fill="#f43f5e" opacity="0.2" animate={{ opacity: [0, 0, 0, 0.8, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.6, 0.7, 0.8, 1] }} />
         <motion.text x="90" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#f43f5e" animate={{ opacity: [0, 0, 0, 1, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.6, 0.7, 0.8, 1] }}>Dequeue(A) ➡️ Front+1</motion.text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        연산이 일어날 때마다 <tspan fill="#6366f1" fontWeight="800">Front</tspan>와 <tspan fill="#f43f5e" fontWeight="800">Rear</tspan>가 우측으로 계속 전진합니다.
      </text>
    </svg>
  );
}

function FalseOverflow() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        가짜 포화 (False Overflow)
      </text>

      <g transform="translate(150, 150)">
         {/* Array Slots */}
         {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={i * 100} y="0" width="90" height="90" rx="12" fill={i < 2 ? "url(#emerald-grad)" : "url(#surface-grad)"} opacity={i < 2 ? 0.1 : 1} stroke={i < 2 ? "#10b981" : "hsl(var(--border))"} strokeWidth="2" strokeDasharray={i < 2 ? "6 6" : "0"} filter="url(#soft-shadow)" />
         ))}
         <text x="45" y="50" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#10b981">빈 공간</text>
         <text x="145" y="50" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#10b981">빈 공간</text>

         {/* Data Elements (At the end) */}
         <rect x="200" y="0" width="90" height="90" rx="12" fill="hsl(var(--muted-foreground))" opacity="0.3" />
         <text x="245" y="55" textAnchor="middle" fontSize="28" fontWeight="bold" fill="hsl(var(--foreground))">X</text>

         <rect x="300" y="0" width="90" height="90" rx="12" fill="hsl(var(--muted-foreground))" opacity="0.3" />
         <text x="345" y="55" textAnchor="middle" fontSize="28" fontWeight="bold" fill="hsl(var(--foreground))">Y</text>

         <rect x="400" y="0" width="90" height="90" rx="12" fill="hsl(var(--muted-foreground))" opacity="0.3" />
         <text x="445" y="55" textAnchor="middle" fontSize="28" fontWeight="bold" fill="hsl(var(--foreground))">Z</text>

         {/* Rear Pointer (End of array) */}
         <path d="M 445 -20 L 445 20" stroke="#6366f1" strokeWidth="4" />
         <polygon points="435,20 455,20 445,35" fill="#6366f1" />
         <rect x="415" y="-60" width="60" height="30" rx="6" fill="#6366f1" />
         <text x="445" y="-40" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">Rear</text>

         {/* Attempting to Add */}
         <motion.g animate={{ x: [0, -20, 0] }} transition={{ duration: 1, repeat: Infinity }}>
            <rect x="520" y="20" width="100" height="50" rx="8" fill="url(#destructive-grad)" opacity="0.8" filter="url(#glow)" />
            <text x="570" y="50" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">새 데이터 삽입</text>
            <path d="M 520 45 L 490 45" stroke="#f43f5e" strokeWidth="4" markerEnd="url(#arrow-head)" />
         </motion.g>

         <motion.text x="445" y="-80" textAnchor="middle" fontSize="16" fontWeight="900" fill="#f43f5e"
            animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>배열 끝 도달! (실패)</motion.text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        앞쪽에 빈 공간이 있어도 <tspan fill="#f43f5e" fontWeight="800">Rear가 끝에 닿아</tspan> 더 이상 넣을 수 없는 한계가 옵니다.
      </text>
    </svg>
  );
}

function StateConditionRules() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        상태 판별 규칙 정교화
      </text>

      <g transform="translate(150, 120)" filter="url(#soft-shadow)">
         <rect cx="0" cy="0" width="500" height="220" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

         <g transform="translate(50, 40)">
            <rect width="40" height="40" rx="6" fill="#10b981" />
            <text x="20" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">1</text>
            <text x="60" y="25" fontSize="18" fontWeight="800" fill="#10b981">초기 상태 (Empty)</text>

            <text x="60" y="60" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">front === -1, rear === -1</text>
            <text x="60" y="80" fontSize="14" fill="hsl(var(--muted-foreground))">(구현에 따라 0으로 시작하기도 함)</text>
         </g>

         <path d="M 50 140 L 450 140" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />

         <g transform="translate(50, 160)">
            <rect width="40" height="40" rx="6" fill="#f43f5e" />
            <text x="20" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">2</text>
            <text x="60" y="25" fontSize="18" fontWeight="800" fill="#f43f5e">포화 상태 (Full)</text>

            <text x="60" y="60" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">rear === MAX_SIZE - 1</text>
            <text x="60" y="80" fontSize="14" fill="hsl(var(--muted-foreground))">배열의 마지막 인덱스에 도달</text>
         </g>

         {/* Warning Indicator */}
         <motion.g transform="translate(360, 60)" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <rect width="100" height="100" rx="50" fill="url(#destructive-grad)" opacity="0.1" />
            <path d="M 50 20 L 50 60" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="75" r="4" fill="#f43f5e" />
            <text x="50" y="95" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#f43f5e">front &gt; rear 시</text>
            <text x="50" y="110" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#f43f5e">Empty 판별 주의</text>
         </motion.g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        구현 방법에 따라 <tspan fill="#6366f1" fontWeight="800">조건식이 미세하게 달라지므로</tspan> 경계값을 명확히 정의해야 합니다.
      </text>
    </svg>
  );
}

function UpgradePreview() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        개선 방향: 원형 큐(Circular Queue)로의 진화
      </text>

      <g transform="translate(150, 150)">
         {/* Linear Broken Pipe */}
         <g transform="translate(0, 0)">
            <rect width="200" height="60" rx="4" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="100" y="15" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#f43f5e">선형 큐의 한계</text>
            <rect x="10" y="30" width="180" height="20" rx="4" fill="#f43f5e" opacity="0.3" />
            <path d="M 190 30 L 220 30" stroke="#f43f5e" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="4 4" />
            <text x="100" y="45" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#f43f5e">버려진 앞 공간</text>
         </g>

         {/* Evolution Arrow */}
         <motion.path d="M 230 30 Q 250 -40 300 30" fill="none" stroke="#6366f1" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="6 6"
            animate={{ pathLength: [0, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
         <text x="265" y="-10" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#6366f1">구부리기</text>

         {/* Circular Pipe */}
         <g transform="translate(360, 0)">
            <circle cx="60" cy="30" r="70" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" filter="url(#soft-shadow)" />
            <circle cx="60" cy="30" r="40" fill="hsl(var(--background))" stroke={ "hsl(var(--border))" } strokeWidth="2" />

            <text x="60" y="35" textAnchor="middle" fontSize="16" fontWeight="900" fill="#10b981">원형 큐</text>

            <motion.path d="M 60 -10 A 40 40 0 1 1 59.9 -10" fill="none" stroke="#10b981" strokeWidth="15" strokeDasharray="30 20"
               animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} style={{ originX: "60px", originY: "30px" }} />
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        배열의 양 끝을 동그랗게 이어붙여 <tspan fill="#10b981" fontWeight="800">낭비되는 메모리 슬롯을 무한 재활용</tspan>합니다.
      </text>
    </svg>
  );
}

export const LinearQueueSupplementaryOptions = [
  PointerStateTransition,
  FalseOverflow,
  StateConditionRules,
  UpgradePreview,
];
