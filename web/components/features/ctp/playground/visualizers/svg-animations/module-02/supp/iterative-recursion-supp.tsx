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

function CallStackOverhead() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        함수 호출 비용 (Overhead) 비교
      </text>

      <g transform="translate(150, 100)">
         {/* Recursion Side */}
         <g transform="translate(0, 0)" filter="url(#soft-shadow)">
            <rect width="200" height="250" rx="16" fill="url(#surface-grad)" stroke="#f43f5e" strokeWidth="2" />
            <text x="100" y="30" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#f43f5e">순수 재귀 (Recursion)</text>

            <g transform="translate(40, 60)">
               <motion.rect y="0" width="120" height="35" rx="6" fill="#f43f5e" opacity="0.3" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
               <motion.rect y="45" width="120" height="35" rx="6" fill="#f43f5e" opacity="0.3" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
               <motion.rect y="90" width="120" height="35" rx="6" fill="#f43f5e" opacity="0.3" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
               <motion.rect y="135" width="120" height="35" rx="6" fill="#f43f5e" opacity="0.3" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.6 }} />

               <path d="M 60 -10 L 60 180" stroke="#f43f5e" strokeWidth="4" strokeDasharray="4 4" markerEnd="url(#arrow-head)" opacity="0.5" />
            </g>

            <text x="100" y="240" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">매 호출마다 메모리 프레임 할당/해제</text>
         </g>

         {/* Iteration Side */}
         <g transform="translate(300, 0)" filter="url(#soft-shadow)">
            <rect width="200" height="250" rx="16" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
            <text x="100" y="30" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#10b981">반복문 (Iteration)</text>

            <g transform="translate(40, 100)">
               <rect y="0" width="120" height="60" rx="6" fill="#10b981" opacity="0.2" />
               <text x="60" y="35" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#10b981">루프 블록</text>

               {/* Loop Animation */}
               <motion.path d="M -10 30 C -40 0, 160 0, 130 30" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)"
                  animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
               <motion.path d="M -10 30 C -40 60, 160 60, 130 30" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)"
                  animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.75 }} />
            </g>

            <text x="100" y="240" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">단일 프레임 내에서 변수값만 갱신</text>
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        재귀 호출은 함수 레지스터 백업 및 복구 작업 때문에 반복문보다 <tspan fill="#f43f5e" fontWeight="800">속도가 느립니다.</tspan>
      </text>
    </svg>
  );
}

function MemoryOptimization() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        공간 복잡도의 압도적 차이 ( O(N) vs O(1) )
      </text>

      <g transform="translate(150, 100)">
         {/* O(N) Space */}
         <g transform="translate(0, 0)">
            <text x="100" y="20" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#f43f5e">재귀 (O(N) Space)</text>
            <path d="M 50 40 L 50 200 L 150 200 L 150 40" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />

            {/* Stack Filling Animation */}
            <motion.rect x="55" y="160" width="90" height="30" fill="#f43f5e" opacity="0.8" animate={{ height: [30, 150, 30], y: [160, 40, 160] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            <rect x="55" y="160" width="90" height="30" fill="#f43f5e" />
            <text x="100" y="180" textAnchor="middle" fontSize="14" fill="#fff">Main</text>
            <text x="100" y="70" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">메모리 증식</text>
         </g>

         {/* Arrow representing optimization */}
         <motion.path d="M 220 120 L 280 120" stroke="#6366f1" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="6 6"
            animate={{ x: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />

         {/* O(1) Space */}
         <g transform="translate(300, 0)">
            <text x="100" y="20" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#10b981">반복 (O(1) Space)</text>
            <path d="M 50 40 L 50 200 L 150 200 L 150 40" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />

            {/* Static Single Frame Animation */}
            <rect x="55" y="160" width="90" height="30" fill="#10b981" />
            <text x="100" y="180" textAnchor="middle" fontSize="14" fill="#fff">Main</text>

            <motion.circle cx="100" cy="175" r="10" fill="none" stroke="#fff" strokeWidth="3"
               animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            <text x="100" y="120" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">단일 메모리 고정</text>
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        반복문은 아무리 많이 돌아도 <tspan fill="#10b981" fontWeight="800">단 하나의 스택 프레임(상수 공간)</tspan>만 소모합니다.
      </text>
    </svg>
  );
}

function TailRecursion() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        꼬리 재귀 (Tail Recursion) 최적화
      </text>

      <g transform="translate(100, 100)" filter="url(#soft-shadow)">
         <rect cx="0" cy="0" width="600" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

         <g transform="translate(50, 30)">
            <text x="0" y="0" fontSize="18" fontWeight="bold" fill="#f43f5e">일반 재귀 (돌아와서 할 일이 남음)</text>
            <text x="0" y="30" fontSize="16" fill="hsl(var(--foreground))" fontFamily="monospace">return <tspan fill="#f43f5e">n *</tspan> fact(n-1);</text>

            <g transform="translate(0, 60)">
               <rect width="80" height="30" rx="4" fill="#f43f5e" opacity="0.5" />
               <rect y="-10" width="80" height="30" rx="4" fill="#f43f5e" opacity="0.7" />
               <rect y="-20" width="80" height="30" rx="4" fill="#f43f5e" />
               <text x="90" y="-5" fontSize="12" fill="hsl(var(--muted-foreground))">결과를 반환받아 곱해야 하므로 자신을 메모리에서 지울 수 없음</text>
            </g>
         </g>

         <path d="M 50 120 L 550 120" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="6 6" />

         <g transform="translate(50, 150)">
            <text x="0" y="0" fontSize="18" fontWeight="bold" fill="#6366f1">꼬리 재귀 (돌아와서 할 일이 없음)</text>
            <text x="0" y="30" fontSize="16" fill="hsl(var(--foreground))" fontFamily="monospace">return fact(n-1, <tspan fill="#6366f1">n * acc</tspan>);</text>

            <g transform="translate(0, 60)">
               {/* Reusing the same frame animation */}
               <motion.rect width="80" height="30" rx="4" fill="#6366f1"
                  animate={{ scaleX: [1, 1.1, 1], fill: ["#6366f1", "#818cf8", "#6366f1"] }} transition={{ duration: 1, repeat: Infinity }} />

               <path d="M 90 15 C 150 -10 150 40 90 15" fill="none" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrow-head)" />
               <text x="170" y="20" fontSize="12" fill="hsl(var(--muted-foreground))">컴파일러가 다음 함수 호출 시 기존 프레임을 덮어씀 (메모리 절약)</text>
            </g>
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        재귀 호출을 맨 마지막에 단독으로 배치하면 <tspan fill="#6366f1" fontWeight="800">반복문과 동일한 효율</tspan>로 최적화가 가능합니다.
      </text>
    </svg>
  );
}

function TradeoffGuide() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        재귀 vs 반복 선택 가이드라인
      </text>

      <g transform="translate(150, 100)">
         {/* Recursion Pros/Cons */}
         <g transform="translate(0, 0)" filter="url(#soft-shadow)">
            <rect width="220" height="240" rx="16" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="2" />
            <text x="110" y="40" textAnchor="middle" fontSize="22" fontWeight="900" fill="#6366f1">재귀 (Recursion)</text>

            <text x="20" y="90" fontSize="16" fontWeight="bold" fill="#10b981">👍 장점</text>
            <text x="20" y="115" fontSize="14" fill="hsl(var(--foreground))">- 코드가 간결하고 우아함</text>
            <text x="20" y="135" fontSize="14" fill="hsl(var(--foreground))">- 점화식, 트리 탐색에 직관적</text>

            <text x="20" y="175" fontSize="16" fontWeight="bold" fill="#f43f5e">👎 단점</text>
            <text x="20" y="200" fontSize="14" fill="hsl(var(--foreground))">- 높은 메모리 차지 (O(N))</text>
            <text x="20" y="220" fontSize="14" fill="hsl(var(--foreground))">- 스택 오버플로우 위험</text>
         </g>

         {/* Iteration Pros/Cons */}
         <g transform="translate(280, 0)" filter="url(#soft-shadow)">
            <rect width="220" height="240" rx="16" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
            <text x="110" y="40" textAnchor="middle" fontSize="22" fontWeight="900" fill="#10b981">반복문 (Iteration)</text>

            <text x="20" y="90" fontSize="16" fontWeight="bold" fill="#10b981">👍 장점</text>
            <text x="20" y="115" fontSize="14" fill="hsl(var(--foreground))">- 압도적인 성능과 속도</text>
            <text x="20" y="135" fontSize="14" fill="hsl(var(--foreground))">- 메모리 안정성 (O(1))</text>

            <text x="20" y="175" fontSize="16" fontWeight="bold" fill="#f43f5e">👎 단점</text>
            <text x="20" y="200" fontSize="14" fill="hsl(var(--foreground))">- 상태 변수 관리가 김</text>
            <text x="20" y="220" fontSize="14" fill="hsl(var(--foreground))">- 복잡한 구조 시 가독성 최악</text>
         </g>

         {/* Scales Icon/Animation in middle */}
         <motion.g transform="translate(250, 120)" animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <path d="M -15 0 L 15 0" stroke="hsl(var(--foreground))" strokeWidth="4" />
            <polygon points="-5,0 5,0 0,15" fill="hsl(var(--foreground))" />
         </motion.g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        <tspan fill="#6366f1" fontWeight="800">가독성(유지보수)</tspan>이냐 <tspan fill="#10b981" fontWeight="800">극한의 성능</tspan>이냐에 따라 현명하게 선택해야 합니다.
      </text>
    </svg>
  );
}

export const IterativeRecursionSupplementaryOptions = [
  CallStackOverhead,
  MemoryOptimization,
  TailRecursion,
  TradeoffGuide,
];
