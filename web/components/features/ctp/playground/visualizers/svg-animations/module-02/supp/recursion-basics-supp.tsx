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
      <marker id="arrow-head-destructive" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
      </marker>
    </defs>
  );
}

function CallStackAccumulation() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        콜 스택(Call Stack)의 시각화
      </text>

      {/* Code Block */}
      <g transform="translate(80, 100)" filter="url(#soft-shadow)">
         <rect width="250" height="220" rx="12" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
         <text x="20" y="30" fontSize="16" fontWeight="bold" fill="#f43f5e" fontFamily="monospace">function fact(n) {"{"}</text>
         <text x="40" y="60" fontSize="16" fill="hsl(var(--muted-foreground))" fontFamily="monospace">if (n === 1)</text>
         <text x="60" y="90" fontSize="16" fill="hsl(var(--foreground))" fontFamily="monospace">return 1;</text>
         <text x="40" y="120" fontSize="16" fill="hsl(var(--foreground))" fontFamily="monospace">return n * </text>
         <text x="40" y="150" fontSize="16" fontWeight="bold" fill="#6366f1" fontFamily="monospace">  fact(n-1)</text>
         <text x="20" y="180" fontSize="16" fontWeight="bold" fill="#f43f5e" fontFamily="monospace">{"}"}</text>
      </g>

      {/* Call Stack Tower */}
      <g transform="translate(480, 80)">
         <path d="M 0 0 L 0 260 L 200 260 L 200 0" fill="none" stroke="hsl(var(--border))" strokeWidth="6" strokeLinecap="round" />

         <g transform="translate(20, 20)">
            {/* fact(1) */}
            <motion.g animate={{ y: [0, 0, 0, 0, 0], opacity: [0, 0, 0, 1, 1] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.2, 0.4, 0.6, 1] }}>
               <rect x="0" y="10" width="160" height="40" rx="6" fill="#10b981" opacity="0.8" />
               <text x="80" y="35" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">fact(1)</text>
               <text x="-40" y="35" fontSize="14" fontWeight="bold" fill="#10b981">Top</text>
               <path d="M -8 30 L 12 30" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)" />
            </motion.g>

            {/* fact(2) */}
            <motion.g animate={{ y: [0, 0, 0, 0, 0], opacity: [0, 0, 1, 1, 1] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.2, 0.4, 0.6, 1] }}>
               <rect x="0" y="70" width="160" height="40" rx="6" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
               <text x="80" y="95" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">fact(2)</text>
            </motion.g>

            {/* fact(3) */}
            <motion.g animate={{ y: [0, 0, 0, 0, 0], opacity: [0, 1, 1, 1, 1] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.2, 0.4, 0.6, 1] }}>
               <rect x="0" y="130" width="160" height="40" rx="6" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
               <text x="80" y="155" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">fact(3)</text>
            </motion.g>

            {/* Main */}
            <rect x="0" y="190" width="160" height="40" rx="6" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="80" y="215" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--muted-foreground))">main()</text>
         </g>
      </g>

      {/* Connecting Arrow */}
      <motion.path d="M 330 200 Q 400 150 480 200" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="6 6" markerEnd="url(#arrow-head)"
         animate={{ pathLength: [0, 1, 1, 1, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.2, 0.4, 0.8, 1] }} />

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        함수가 호출될 때마다 <tspan fill="#6366f1" fontWeight="800">스택 메모리 단위(Frame)</tspan>가 계속 위로 쌓이는 구조입니다.
      </text>
    </svg>
  );
}

function BaseCaseImportance() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        종료 조건(Base Case)의 절대적 중요성
      </text>

      {/* Without Base Case */}
      <g transform="translate(100, 120)">
         <rect width="250" height="220" rx="16" fill="url(#destructive-grad)" opacity="0.1" stroke="#f43f5e" strokeWidth="2" filter="url(#soft-shadow)" />
         <text x="125" y="30" textAnchor="middle" fontSize="16" fontWeight="900" fill="#f43f5e">Base Case가 없을 때</text>

         <path d="M 125 50 L 125 240" stroke="#f43f5e" strokeWidth="4" strokeDasharray="4 4" />

         {[1, 2, 3, 4, 5].map((i) => (
            <motion.rect key={i} x="65" y={40 + i * 30} width="120" height="25" rx="4" fill="#f43f5e" opacity={1 - i * 0.15}
               animate={{ y: [-10, 0] }} transition={{ duration: 0.5, delay: i * 0.2, repeat: Infinity, repeatType: "reverse" }} />
         ))}

         <text x="125" y="115" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">loop()</text>
         <text x="125" y="145" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">loop()</text>

         <rect x="25" y="180" width="200" height="30" rx="4" fill="#f43f5e" filter="url(#glow)" />
         <text x="125" y="200" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">Maximum Call Stack Exceeded!</text>
      </g>

      {/* With Base Case */}
      <g transform="translate(450, 120)">
         <rect width="250" height="220" rx="16" fill="url(#emerald-grad)" opacity="0.1" stroke="#10b981" strokeWidth="2" filter="url(#soft-shadow)" />
         <text x="125" y="30" textAnchor="middle" fontSize="16" fontWeight="900" fill="#10b981">Base Case가 있을 때</text>

         {/* Downward calls */}
         <g transform="translate(65, 50)">
            <rect width="120" height="30" rx="6" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="60" y="20" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">fact(3)</text>
            <path d="M 60 30 L 60 45" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow-head)" />

            <rect y="50" width="120" height="30" rx="6" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="60" y="70" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">fact(2)</text>
            <path d="M 60 80 L 60 95" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow-head)" />

            <rect y="100" width="120" height="30" rx="6" fill="#10b981" filter="url(#glow)" />
            <text x="60" y="120" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">fact(1) [BASE]</text>

            {/* Return Arrow */}
            <motion.path d="M 130 115 Q 180 80 130 15" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head-emerald)" strokeDasharray="4 4"
               animate={{ pathLength: [0, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />
         </g>

         <text x="125" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">바닥을 치고 연산 결과를</text>
         <text x="125" y="215" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">위로 반환하기 시작</text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        재귀 함수는 반드시 자신을 호출하지 않고 <tspan fill="#f43f5e" fontWeight="800">멈추는 명확한 탈출구</tspan>가 있어야 동작합니다.
      </text>
    </svg>
  );
}

function SelfReferencePattern() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        자기 참조 (거울 속의 거울)
      </text>

      <g transform="translate(150, 100)">
         {/* Matryoshka Doll Metaphor using squares */}
         <g transform="translate(0, 0)" filter="url(#soft-shadow)">
            <rect width="250" height="250" rx="16" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="4" />
            <text x="125" y="30" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#6366f1">큰 문제 (N)</text>

            <motion.g animate={{ scale: [1, 0.95, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
               <rect x="25" y="50" width="200" height="180" rx="12" fill="url(#surface-grad)" stroke="#a855f7" strokeWidth="3" />
               <text x="125" y="75" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#a855f7">동일한 규칙의 작아진 문제</text>

               <rect x="50" y="90" width="150" height="120" rx="8" fill="url(#surface-grad)" stroke="#f43f5e" strokeWidth="2" />
               <text x="125" y="115" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#f43f5e">(N-1)</text>

               <rect x="85" y="130" width="80" height="60" rx="4" fill="#10b981" opacity="0.8" />
               <text x="125" y="165" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#fff">Base(1)</text>
            </motion.g>
         </g>

         {/* Arrow representing solving */}
         <motion.path d="M 280 200 Q 350 220 420 180" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="6 6" markerEnd="url(#arrow-head-emerald)"
            animate={{ pathLength: [0, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />
         <text x="350" y="240" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#10b981">가장 안쪽부터 해결되어</text>
         <text x="350" y="260" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#10b981">바깥으로 병합</text>

         <rect x="360" y="50" width="160" height="80" rx="12" fill="url(#primary-grad)" stroke="#fff" strokeWidth="2" filter="url(#glow)" />
         <text x="440" y="90" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff">최종 정답 도출</text>

      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        크기만 작아졌을 뿐 <tspan fill="#6366f1" fontWeight="800">완전히 동일한 논리 규칙</tspan>을 본인 스스로에게 다시 적용합니다.
      </text>
    </svg>
  );
}

function TopDownDivideConquer() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        하향식(Top-Down) 분할 정복 흐름
      </text>

      <g transform="translate(150, 80)">
         {/* Divide Tree */}
         <motion.g animate={{ opacity: [0, 1] }} transition={{ duration: 1 }}>
            <rect x="150" y="0" width="80" height="40" rx="8" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="190" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">5!</text>
         </motion.g>

         <path d="M 190 40 L 190 70" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow-head)" />
         <text x="210" y="60" fontSize="12" fontWeight="bold" fill="#6366f1">5 * ?</text>

         <motion.g animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 1 }}>
            <rect x="150" y="70" width="80" height="40" rx="8" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="190" y="95" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">4!</text>
         </motion.g>

         <path d="M 190 110 L 190 140" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow-head)" />
         <text x="210" y="130" fontSize="12" fontWeight="bold" fill="#6366f1">4 * ?</text>

         <motion.g animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 2 }}>
            <rect x="150" y="140" width="80" height="40" rx="8" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="190" y="165" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">3!</text>
         </motion.g>

         <path d="M 190 180 L 190 210" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow-head)" />
         <text x="210" y="200" fontSize="12" fontWeight="bold" fill="#6366f1">3 * ?</text>

         <motion.g animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 3 }}>
            <rect x="150" y="210" width="80" height="40" rx="8" fill="url(#emerald-grad)" filter="url(#glow)" />
            <text x="190" y="235" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">1 (Base)</text>
         </motion.g>

         {/* Return Results Path */}
         <motion.path d="M 240 230 C 350 200 350 150 240 160" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head-emerald)" strokeDasharray="4 4"
            animate={{ opacity: [0, 1], pathLength: [0, 1] }} transition={{ duration: 1, delay: 4 }} />
         <motion.text x="320" y="200" fontSize="12" fontWeight="bold" fill="#10b981" animate={{ opacity: [0, 1] }} transition={{ delay: 4 }}>결과 1 전달</motion.text>

         <motion.path d="M 240 160 C 350 130 350 80 240 90" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head-emerald)" strokeDasharray="4 4"
            animate={{ opacity: [0, 1], pathLength: [0, 1] }} transition={{ duration: 1, delay: 5 }} />
         <motion.text x="320" y="130" fontSize="12" fontWeight="bold" fill="#10b981" animate={{ opacity: [0, 1] }} transition={{ delay: 5 }}>결과 6 전달</motion.text>

         <motion.path d="M 240 90 C 350 60 350 10 240 20" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head-emerald)" strokeDasharray="4 4"
            animate={{ opacity: [0, 1], pathLength: [0, 1] }} transition={{ duration: 1, delay: 6 }} />
         <motion.text x="320" y="60" fontSize="12" fontWeight="bold" fill="#10b981" animate={{ opacity: [0, 1] }} transition={{ delay: 6 }}>결과 24 전달</motion.text>

         <motion.rect x="40" y="0" width="80" height="40" rx="8" fill="url(#primary-grad)" filter="url(#glow)"
            animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 7 }} />
         <motion.text x="80" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff"
            animate={{ opacity: [0, 1] }} transition={{ duration: 1, delay: 7 }}>120 계산!</motion.text>

      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        가장 큰 문제에서 출발하여 구멍을 파고 내려간 뒤, <tspan fill="#10b981" fontWeight="800">바닥(Base)부터 조립하며 위로</tspan> 올라옵니다.
      </text>
    </svg>
  );
}

export const RecursionBasicsSupplementaryOptions = [
  CallStackAccumulation,
  BaseCaseImportance,
  SelfReferencePattern,
  TopDownDivideConquer,
];
