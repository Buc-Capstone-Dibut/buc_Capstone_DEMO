"use client";

import { motion } from "framer-motion";

function SharedDefs() {
  return (
    <defs>
      <linearGradient id="primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(239 84% 67%)" />
        <stop offset="100%" stopColor="hsl(271 91% 65%)" />
      </linearGradient>
      <linearGradient id="emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(160 84% 39%)" />
        <stop offset="100%" stopColor="hsl(161 94% 30%)" />
      </linearGradient>
      <linearGradient id="destructive-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(347 89% 60%)" />
        <stop offset="100%" stopColor="hsl(347 77% 50%)" />
      </linearGradient>
      <linearGradient id="surface-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="1" />
        <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
      </linearGradient>
      <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="hsl(0 0% 0%)" floodOpacity="0.1" />
      </filter>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="hsl(var(--border))" opacity="0.5" />
      </pattern>
      <marker id="arrow-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(239 84% 67%)" />
      </marker>
      <marker id="arrow-head-emerald" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(160 84% 39%)" />
      </marker>
    </defs>
  );
}

// 스텝화: 정적 3→4 / 4→0 전이 맵을 실제 포인터가 0→1→…→5→0 으로 한 칸씩
// 회전하며 (current+1)%CAP 의 수치 계산을 매 스텝 갱신해 보여주는 루프로 교체.
const MOD_CAP = 6;

function ModuloMagic() {
  // CAP+1 프레임: 각 인덱스에서 1초씩 머문 뒤 마지막에 wrap(5→0) 강조.
  const cells = Array.from({ length: MOD_CAP }, (_, i) => i);
  const cellW = 70;
  const cellGap = 14;
  const rowW = MOD_CAP * cellW + (MOD_CAP - 1) * cellGap;
  const rowX = 400 - rowW / 2;
  const rowY = 150;

  const frameTimes = cells.map((_, i) => i / MOD_CAP); // 0, 1/6, …
  const keyframes = cells.map((c) => rowX + c * (cellW + cellGap) + cellW / 2);

  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        모듈로(%) 연산: 인덱스 한 칸씩 회전
      </text>

      {/* Code Formula Box (live numeric per step) */}
      <g transform="translate(150, 80)" filter="url(#soft-shadow)">
        <rect width="500" height="50" rx="12" fill="url(#surface-grad)" stroke="hsl(239 84% 67%)" strokeWidth="2" />
        <text x="250" y="32" textAnchor="middle" fontSize="20" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="1">
          next = (<tspan fill="hsl(160 84% 39%)">current</tspan> + 1) <tspan fill="hsl(239 84% 67%)">% {MOD_CAP}</tspan>
        </text>
      </g>

      {/* Index cells 0..5 */}
      {cells.map((c) => {
        const x = rowX + c * (cellW + cellGap);
        const isWrapCell = c === 0;
        return (
          <g key={`mod-cell-${c}`} transform={`translate(${x}, ${rowY})`}>
            <rect
              width={cellW}
              height={cellW}
              rx="10"
              fill={isWrapCell ? "url(#emerald-grad)" : "url(#surface-grad)"}
              opacity={isWrapCell ? 0.25 : 1}
              stroke={isWrapCell ? "hsl(160 84% 39%)" : "hsl(var(--border))"}
              strokeWidth="2"
            />
            <text x={cellW / 2} y={cellW / 2 + 9} textAnchor="middle" fontSize="26" fontWeight="bold" fill="hsl(var(--foreground))">{c}</text>
            {c === MOD_CAP - 1 && (
              <text x={cellW / 2} y={cellW + 22} textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(239 84% 67%)">끝</text>
            )}
            {isWrapCell && (
              <text x={cellW / 2} y={cellW + 22} textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(160 84% 39%)">처음 (wrap)</text>
            )}
          </g>
        );
      })}

      {/* Wrap-around arc from last cell back to index 0 */}
      <motion.path
        d={`M ${rowX + (MOD_CAP - 1) * (cellW + cellGap) + cellW / 2} ${rowY - 8} Q 400 ${rowY - 90} ${rowX + cellW / 2} ${rowY - 8}`}
        fill="none"
        stroke="hsl(239 84% 67%)"
        strokeWidth="3"
        strokeDasharray="7 7"
        markerEnd="url(#arrow-head)"
        animate={{ opacity: [0.15, 0.15, 0.15, 0.15, 0.15, 1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear", times: [...frameTimes, 1] }}
      />

      {/* Stepping pointer that hops 0→1→…→5→0 */}
      <motion.g
        animate={{ x: [...keyframes, keyframes[0]] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [...frameTimes, 1] }}
      >
        <path d={`M 0 ${rowY - 16} L -8 ${rowY - 34} L 8 ${rowY - 34} Z`} fill="hsl(347 89% 60%)" />
        <rect x="-26" y={rowY - 66} width="52" height="28" rx="6" fill="hsl(347 89% 60%)" />
        <text x="0" y={rowY - 47} textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(0 0% 100%)">idx</text>
      </motion.g>

      {/* Live numeric computation, swapped per step */}
      <g transform="translate(220, 290)">
        <rect width="360" height="50" rx="10" fill="url(#surface-grad)" stroke="hsl(271 91% 65%)" strokeWidth="2" filter="url(#soft-shadow)" />
        {cells.map((c) => {
          const next = (c + 1) % MOD_CAP;
          return (
            <motion.text
              key={`calc-${c}`}
              x="180"
              y="32"
              textAnchor="middle"
              fontSize="18"
              fontWeight="800"
              fontFamily="monospace"
              fill="hsl(271 91% 65%)"
              animate={{ opacity: cells.map((s) => (s === c ? 1 : 0)) }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear", times: frameTimes }}
            >
              ({c} + 1) % {MOD_CAP} = {next}{next === 0 ? "  ↩ wrap" : ""}
            </motion.text>
          );
        })}
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        포인터가 끝(5)에 닿으면 <tspan fill="hsl(160 84% 39%)" fontWeight="800">(5+1)%6 = 0</tspan> 으로 다시 0번 인덱스로 순환합니다.
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
            <text x="130" y="35" textAnchor="middle" fontSize="18" fontWeight="900" fill="hsl(347 89% 60%)">문제: 구조적 충돌</text>

            <circle cx="130" cy="120" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
            {/* 4 elements filled exactly */}
            <path d="M 130 70 A 50 50 0 1 1 129.9 70" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="20" opacity="0.4" />

            <text x="50" y="125" textAnchor="end" fontSize="14" fontWeight="bold" fill="hsl(239 84% 67%)">Front=0</text>
            <text x="210" y="125" textAnchor="start" fontSize="14" fontWeight="bold" fill="hsl(347 89% 60%)">Rear=0</text>
            <path d="M 55 120 L 75 120" stroke="hsl(239 84% 67%)" strokeWidth="3" markerEnd="url(#arrow-head)" />
            <path d="M 205 120 L 185 120" stroke="hsl(347 89% 60%)" strokeWidth="3" markerEnd="url(#arrow-head)" />

            <text x="130" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--foreground))">비어있는지, 꽉 찼는지</text>
            <text x="130" y="220" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--foreground))">구분 불가상태 (F==R)</text>
         </g>

         <path d="M 280 130 L 320 130" stroke="hsl(var(--muted-foreground))" strokeWidth="4" strokeDasharray="6 6" markerEnd="url(#arrow-head)" />

         {/* Solution */}
         <g transform="translate(340, 0)" filter="url(#soft-shadow)">
            <rect width="260" height="230" rx="16" fill="url(#surface-grad)" stroke="hsl(160 84% 39%)" strokeWidth="2" />
            <text x="130" y="35" textAnchor="middle" fontSize="18" fontWeight="900" fill="hsl(160 84% 39%)">해결: 1칸 비워두기</text>

            <circle cx="130" cy="120" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
            {/* 3 elements filled, 1 empty gap */}
            <path d="M 130 70 A 50 50 0 0 1 80 120" fill="none" stroke="hsl(160 84% 39%)" strokeWidth="20" opacity="0.6" />

            <text x="130" y="55" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(239 84% 67%)">Front (항상 빔)</text>
            <path d="M 130 60 L 130 75" stroke="hsl(239 84% 67%)" strokeWidth="3" markerEnd="url(#arrow-head)" />

            <text x="40" y="125" textAnchor="end" fontSize="14" fontWeight="bold" fill="hsl(347 89% 60%)">Rear (마지막)</text>
            <path d="M 45 120 L 75 120" stroke="hsl(347 89% 60%)" strokeWidth="3" markerEnd="url(#arrow-head)" />

            <text x="130" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--foreground))">Full 조건 변경:</text>
            <text x="130" y="220" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(160 84% 39%)">(Rear + 1) % M == Front</text>
         </g>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        상태 식별 모호성을 제거하기 위해 <tspan fill="hsl(160 84% 39%)" fontWeight="800">Front 포인터 위치를 더미(비워둠) 공간</tspan>으로 사용합니다.
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
              <tspan fill="hsl(347 89% 60%)" fontWeight="800">Linear Queue</tspan>: Rear가 배열 끝이면 무조건 삽입 실패
            </text>
         </g>

         <rect y="40" width="500" height="80" rx="12" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" filter="url(#soft-shadow)" />
         <path d="M 0 40 L 0 120" stroke="hsl(var(--border))" strokeWidth="4" strokeDasharray="6 6" />
         <path d="M 500 40 L 500 120" stroke="hsl(var(--border))" strokeWidth="4" strokeDasharray="6 6" />

         {/* Empty spots in ring */}
         <rect x="10" y="50" width="90" height="60" rx="6" fill="url(#emerald-grad)" opacity="0.1" stroke="hsl(160 84% 39%)" strokeWidth="2" strokeDasharray="4 4" />
         <rect x="110" y="50" width="90" height="60" rx="6" fill="url(#emerald-grad)" opacity="0.1" stroke="hsl(160 84% 39%)" strokeWidth="2" strokeDasharray="4 4" />

         {/* Occupied spots */}
         <rect x="210" y="50" width="90" height="60" rx="6" fill="hsl(var(--muted-foreground))" opacity="0.4" />
         <text x="255" y="86" textAnchor="middle" fontSize="20" fontWeight="bold" fill="hsl(var(--foreground))">Data</text>

         <rect x="310" y="50" width="90" height="60" rx="6" fill="hsl(var(--muted-foreground))" opacity="0.4" />
         <text x="355" y="86" textAnchor="middle" fontSize="20" fontWeight="bold" fill="hsl(var(--foreground))">Data</text>

         {/* Rear Pointer At End */}
         <rect x="410" y="50" width="90" height="60" rx="6" fill="hsl(var(--muted-foreground))" opacity="0.4" />
         <text x="455" y="86" textAnchor="middle" fontSize="20" fontWeight="bold" fill="hsl(var(--foreground))">Data</text>

         <path d="M 455 140 L 455 120" stroke="hsl(239 84% 67%)" strokeWidth="4" markerEnd="url(#arrow-head)" />
         <text x="455" y="160" textAnchor="middle" fontSize="14" fontWeight="900" fill="hsl(239 84% 67%)">Rear</text>

         {/* Circular Wrap Animation */}
         <motion.path d="M 455 -20 Q 250 -80 55 40" fill="none" stroke="hsl(160 84% 39%)" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" markerEnd="url(#arrow-head-emerald)"
            animate={{ pathLength: [0, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />

         <motion.circle cx="55" cy="80" r="20" fill="hsl(160 84% 39%)" filter="url(#glow)"
            animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
         <motion.text x="55" y="86" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(0 0% 100%)"
            animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}>NEW</motion.text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        끝에 도달한 Rear 포인터가 <tspan fill="hsl(160 84% 39%)" fontWeight="800">다시 앞쪽 빈 공간으로 턴(Wrap-around)</tspan>하여 저장합니다.
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
           <rect width="100" height="40" rx="8" fill="hsl(239 84% 67%)" opacity="0.2" />
           <text x="50" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(239 84% 67%)">1. 서버 다운로드</text>
           <path d="M 0 20 L -30 20" stroke="hsl(239 84% 67%)" strokeWidth="2" markerEnd="url(#arrow-head)" strokeDasharray="4 4" />
        </g>

        {/* Output Process */}
        <g transform="translate(350, 140)">
           <rect width="100" height="40" rx="8" fill="hsl(347 89% 60%)" opacity="0.2" />
           <text x="50" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(347 89% 60%)">2. 스피커 재생</text>
           <path d="M -30 20 L 0 20" stroke="hsl(347 89% 60%)" strokeWidth="2" markerEnd="url(#arrow-head)" />
        </g>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        데이터 크기가 무한에 가까운 스트리밍 환경에서 <tspan fill="hsl(239 84% 67%)" fontWeight="800">고정된 메모리로 무한 처리</tspan>를 가능하게 합니다.
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
