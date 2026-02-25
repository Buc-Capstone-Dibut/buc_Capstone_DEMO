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

function ModuloMagic() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        모듈로(%) 연산의 수학적 마법
      </text>

      <g transform="translate(150, 100)">

        {/* Code Formula Box */}
        <g transform="translate(0, 0)" filter="url(#soft-shadow)">
           <rect width="500" height="60" rx="12" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="2" />
           <text x="250" y="38" textAnchor="middle" fontSize="22" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="1">
              next_index = (<tspan fill="#10b981">current</tspan> + 1) <tspan fill="#6366f1">% MAX_SIZE</tspan>
           </text>
        </g>

        {/* Transition Map */}
        <g transform="translate(0, 100)">
           {/* Normal Increment */}
           <g transform="translate(0, 0)">
              <rect width="80" height="80" rx="8" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
              <text x="40" y="48" textAnchor="middle" fontSize="24" fontWeight="bold" fill="hsl(var(--muted-foreground))">3</text>
              <path d="M 90 40 L 130 40" stroke="#10b981" strokeWidth="4" markerEnd="url(#arrow-head-emerald)" />
              <text x="110" y="30" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#10b981">+1</text>

              <rect x="140" y="0" width="80" height="80" rx="8" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
              <text x="180" y="48" textAnchor="middle" fontSize="24" fontWeight="bold" fill="hsl(var(--foreground))">4</text>
           </g>

           {/* Modulo Wrap-around Highlight */}
           <g transform="translate(280, 0)">
              <rect width="80" height="80" rx="8" fill="url(#primary-grad)" filter="url(#glow)" />
              <text x="40" y="48" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#fff">4 (끝)</text>

              <motion.path d="M 100 -20 Q 110 -60 140 40" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="6 6" markerEnd="url(#arrow-head)"
                 animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
              <text x="110" y="-30" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#6366f1">% 5</text>

              <rect x="140" y="0" width="80" height="80" rx="8" fill="url(#emerald-grad)" filter="url(#glow)" />
              <text x="180" y="48" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#fff">0 (처음)</text>
           </g>
        </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        나머지 연산을 통해 배열 인덱스가 끝에 도달하더라도 <tspan fill="#6366f1" fontWeight="800">0번 인덱스로 부드럽게 순환</tspan>합니다.
      </text>
    </svg>
  );
}

function EmptyFullDilemma() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        포화와 공백 판별의 딜레마 (1칸 비우기)
      </text>

      <g transform="translate(100, 100)">
         {/* Why 1 space empty? */}
         <g transform="translate(0, 0)" filter="url(#soft-shadow)">
            <rect width="260" height="230" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="130" y="35" textAnchor="middle" fontSize="18" fontWeight="900" fill="#f43f5e">문제: 구조적 충돌</text>

            <circle cx="130" cy="120" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
            {/* 4 elements filled exactly */}
            <path d="M 130 70 A 50 50 0 1 1 129.9 70" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="20" opacity="0.4" />

            <text x="50" y="125" textAnchor="end" fontSize="14" fontWeight="bold" fill="#6366f1">Front=0</text>
            <text x="210" y="125" textAnchor="start" fontSize="14" fontWeight="bold" fill="#f43f5e">Rear=0</text>
            <path d="M 55 120 L 75 120" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrow-head)" />
            <path d="M 205 120 L 185 120" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow-head)" />

            <text x="130" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--foreground))">비어있는지, 꽉 찼는지</text>
            <text x="130" y="220" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--foreground))">구분 불가상태 (F==R)</text>
         </g>

         <path d="M 280 130 L 320 130" stroke="hsl(var(--muted-foreground))" strokeWidth="4" strokeDasharray="6 6" markerEnd="url(#arrow-head)" />

         {/* Solution */}
         <g transform="translate(340, 0)" filter="url(#soft-shadow)">
            <rect width="260" height="230" rx="16" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
            <text x="130" y="35" textAnchor="middle" fontSize="18" fontWeight="900" fill="#10b981">해결: 1칸 비워두기</text>

            <circle cx="130" cy="120" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
            {/* 3 elements filled, 1 empty gap */}
            <path d="M 130 70 A 50 50 0 0 1 80 120" fill="none" stroke="#10b981" strokeWidth="20" opacity="0.6" />

            <text x="130" y="55" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#6366f1">Front (항상 빔)</text>
            <path d="M 130 60 L 130 75" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrow-head)" />

            <text x="40" y="125" textAnchor="end" fontSize="14" fontWeight="bold" fill="#f43f5e">Rear (마지막)</text>
            <path d="M 45 120 L 75 120" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow-head)" />

            <text x="130" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--foreground))">Full 조건 변경:</text>
            <text x="130" y="220" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#10b981">(Rear + 1) % M == Front</text>
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        상태 식별 모호성을 제거하기 위해 <tspan fill="#10b981" fontWeight="800">Front 포인터 위치를 더미(비워둠) 공간</tspan>으로 사용합니다.
      </text>
    </svg>
  );
}

function SpaceRecycling() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        공간 재활용 증명 (가짜 포화 극복)
      </text>

      <g transform="translate(150, 150)">
         {/* Circular representation flattened for sequence */}
         <g transform="translate(0, -60)" filter="url(#soft-shadow)">
            <rect width="500" height="60" rx="8" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="250" y="35" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">
              <tspan fill="#f43f5e" fontWeight="800">Linear Queue</tspan>: Rear가 배열 끝이면 무조건 삽입 실패
            </text>
         </g>

         <rect y="40" width="500" height="80" rx="12" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" filter="url(#soft-shadow)" />
         <path d="M 0 40 L 0 120" stroke="hsl(var(--border))" strokeWidth="4" strokeDasharray="6 6" />
         <path d="M 500 40 L 500 120" stroke="hsl(var(--border))" strokeWidth="4" strokeDasharray="6 6" />

         {/* Empty spots in ring */}
         <rect x="10" y="50" width="90" height="60" rx="6" fill="url(#emerald-grad)" opacity="0.1" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
         <rect x="110" y="50" width="90" height="60" rx="6" fill="url(#emerald-grad)" opacity="0.1" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />

         {/* Occupied spots */}
         <rect x="210" y="50" width="90" height="60" rx="6" fill="hsl(var(--muted-foreground))" opacity="0.4" />
         <text x="255" y="86" textAnchor="middle" fontSize="20" fontWeight="bold" fill="hsl(var(--foreground))">Data</text>

         <rect x="310" y="50" width="90" height="60" rx="6" fill="hsl(var(--muted-foreground))" opacity="0.4" />
         <text x="355" y="86" textAnchor="middle" fontSize="20" fontWeight="bold" fill="hsl(var(--foreground))">Data</text>

         {/* Rear Pointer At End */}
         <rect x="410" y="50" width="90" height="60" rx="6" fill="hsl(var(--muted-foreground))" opacity="0.4" />
         <text x="455" y="86" textAnchor="middle" fontSize="20" fontWeight="bold" fill="hsl(var(--foreground))">Data</text>

         <path d="M 455 140 L 455 120" stroke="#6366f1" strokeWidth="4" markerEnd="url(#arrow-head)" />
         <text x="455" y="160" textAnchor="middle" fontSize="14" fontWeight="900" fill="#6366f1">Rear</text>

         {/* Circular Wrap Animation */}
         <motion.path d="M 455 -20 Q 250 -80 55 40" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" markerEnd="url(#arrow-head-emerald)"
            animate={{ pathLength: [0, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />

         <motion.circle cx="55" cy="80" r="20" fill="#10b981" filter="url(#glow)"
            animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
         <motion.text x="55" y="86" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff"
            animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}>NEW</motion.text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        끝에 도달한 Rear 포인터가 <tspan fill="#10b981" fontWeight="800">다시 앞쪽 빈 공간으로 턴(Wrap-around)</tspan>하여 저장합니다.
      </text>
    </svg>
  );
}

function RingBufferRealWorld() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        실무 적용: 오디오 스트리밍 / 링 버퍼
      </text>

      <g transform="translate(150, 100)" filter="url(#soft-shadow)">
        <rect width="500" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

        {/* Infinite Buffer Ring */}
        <g transform="translate(150, 120)">
           <circle cx="0" cy="0" r="80" fill="none" stroke="hsl(var(--muted))" strokeWidth="40" />
           <motion.path d="M 0 -80 A 80 80 0 0 1 80 0" fill="none" stroke="url(#primary-grad)" strokeWidth="40"
              animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />

           <text x="0" y="-5" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">Audio Data</text>
           <text x="0" y="15" textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))">Streaming</text>
        </g>

        {/* Input Process */}
        <g transform="translate(350, 80)">
           <rect width="100" height="40" rx="8" fill="#6366f1" opacity="0.2" />
           <text x="50" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#6366f1">1. 서버 다운로드</text>
           <path d="M 0 20 L -30 20" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrow-head)" strokeDasharray="4 4" />
        </g>

        {/* Output Process */}
        <g transform="translate(350, 140)">
           <rect width="100" height="40" rx="8" fill="#f43f5e" opacity="0.2" />
           <text x="50" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#f43f5e">2. 스피커 재생</text>
           <path d="M -30 20 L 0 20" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow-head)" />
        </g>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        데이터 크기가 무한에 가까운 스트리밍 환경에서 <tspan fill="#6366f1" fontWeight="800">고정된 메모리로 무한 처리</tspan>를 가능하게 합니다.
      </text>
    </svg>
  );
}

export const CircularQueueSupplementaryOptions = [
  ModuloMagic,
  EmptyFullDilemma,
  SpaceRecycling,
  RingBufferRealWorld,
];
