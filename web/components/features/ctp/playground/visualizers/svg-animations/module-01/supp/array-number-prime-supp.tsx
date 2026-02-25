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
    </defs>
  );
}

function SieveOfEratosthenes() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        에라토스테네스의 체: O(N log log N)
      </text>

      <g transform="translate(140, 120)">
        {[
          [2, 3, 4, 5, 6, 7],
          [8, 9, 10, 11, 12, 13]
        ].map((row, r) => (
          <g key={`row-${r}`}>
            {row.map((val, c) => {
              const isPrime = [2, 3, 5, 7, 11, 13].includes(val);
              const isMultipleOf2 = [4, 6, 8, 10, 12].includes(val);
              const isMultipleOf3 = val === 9;

              return (
                <g key={`cell-${val}`} transform={`translate(${c * 90}, ${r * 100})`}>
                  <rect width="70" height="70" rx="16" fill={isPrime ? "url(#primary-grad)" : "url(#surface-grad)"}
                        stroke={isPrime ? "#fff" : "hsl(var(--border))"} strokeWidth={isPrime ? 2 : 1} filter={isPrime ? "url(#soft-shadow)" : ""} />

                  <text x="35" y="44" textAnchor="middle" fontSize="26" fontWeight="900" fill={isPrime ? "#fff" : "hsl(var(--muted-foreground))"}>{val}</text>

                  {/* Strike through for multiples */}
                  {isMultipleOf2 && (
                    <motion.line x1="10" y1="60" x2="60" y2="10" stroke="#f43f5e" strokeWidth="6" strokeLinecap="round" filter="url(#glow)"
                       initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0.1, 0.4, 0.8, 1] }} />
                  )}

                  {isMultipleOf3 && (
                    <motion.line x1="10" y1="60" x2="60" y2="10" stroke="#10b981" strokeWidth="6" strokeLinecap="round" filter="url(#glow)"
                       initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0.3, 0.6, 0.8, 1] }} />
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        가장 먼저 만나는 소수의 <tspan fill="#f43f5e" fontWeight="800">배수를 지우는 과정</tspan>을 반복하여 소수만 남깁니다.
      </text>
    </svg>
  );
}

function MemoizationCache() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        동적 계획법 (Memoization Cache)
      </text>

      {/* Without Cache */}
      <g transform="translate(120, 120)">
        <rect width="250" height="200" rx="20" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" filter="url(#soft-shadow)" />
        <rect x="0" y="0" width="250" height="40" rx="20" fill="url(#destructive-grad)" />
        <text x="125" y="25" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">캐시 없음 (중복 연산)</text>

        <g transform="translate(125, 70)">
          <circle cx="0" cy="0" r="18" fill="url(#surface-grad)" stroke="#f43f5e" strokeWidth="2" />
          <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="900" fill="hsl(var(--foreground))">F(4)</text>

          <path d="M -10 16 L -35 45" stroke="hsl(var(--border))" strokeWidth="2" />
          <path d="M 10 16 L 35 45" stroke="hsl(var(--border))" strokeWidth="2" />

          <circle cx="-40" cy="60" r="16" fill="url(#surface-grad)" stroke="#f43f5e" strokeWidth="2" />
          <text x="-40" y="65" textAnchor="middle" fontSize="12" fontWeight="900" fill="hsl(var(--foreground))">F(3)</text>

          {/* Redundant Node */}
          <circle cx="40" cy="60" r="16" fill="hsl(var(--destructive)/0.2)" stroke="#f43f5e" strokeWidth="3" filter="url(#glow)" />
          <text x="40" y="65" textAnchor="middle" fontSize="12" fontWeight="900" fill="#f43f5e">F(2)</text>

          {/* F(3) Children */}
          <path d="M -50 74 L -65 95" stroke="hsl(var(--border))" strokeWidth="2" />
          <path d="M -30 74 L -15 95" stroke="hsl(var(--border))" strokeWidth="2" />

          <circle cx="-75" cy="110" r="14" fill="hsl(var(--destructive)/0.2)" stroke="#f43f5e" strokeWidth="3" filter="url(#glow)" />
          <text x="-75" y="114" textAnchor="middle" fontSize="10" fontWeight="900" fill="#f43f5e">F(2)</text>

          <circle cx="-15" cy="110" r="14" fill="url(#surface-grad)" stroke="#f43f5e" strokeWidth="2" />
          <text x="-15" y="114" textAnchor="middle" fontSize="10" fontWeight="900" fill="hsl(var(--foreground))">F(1)</text>
        </g>
      </g>

      <path d="M 390 220 L 420 220" stroke="hsl(var(--muted-foreground))" strokeWidth="4" strokeDasharray="6 6" markerEnd="url(#arrow-head)" />

      {/* With Cache Array */}
      <g transform="translate(440, 120)">
        <rect width="250" height="200" rx="20" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" filter="url(#soft-shadow)" />
        <rect x="0" y="0" width="250" height="40" rx="20" fill="url(#primary-grad)" />
        <text x="125" y="25" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">캐시 배열 활용 (O(1) 반환)</text>

        {/* Cache Array visualization */}
        <g transform="translate(25, 60)">
          <text x="-5" y="20" fontSize="12" fontWeight="800" fill="#6366f1">dp[]</text>
          {[0, 1, 1, 2, 3].map((val, i) => (
             <g key={`dp-${i}`} transform={`translate(${i * 35 + 30}, 0)`}>
                <rect width="30" height="30" rx="6" fill="#fff" stroke="#6366f1" strokeWidth="2" filter="url(#soft-shadow)" />
                <text x="15" y="20" textAnchor="middle" fontSize="14" fontWeight="800" fill="#6366f1">{val}</text>
             </g>
          ))}
        </g>

        {/* Tree using cache */}
        <g transform="translate(125, 120)">
          <circle cx="0" cy="0" r="18" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
          <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="900" fill="hsl(var(--foreground))">F(4)</text>

          <path d="M -10 16 L -35 45" stroke="hsl(var(--border))" strokeWidth="2" />
          <path d="M 10 16 L 35 45" stroke="hsl(var(--border))" strokeWidth="2" />

          {/* Cache hits */}
          <circle cx="-40" cy="60" r="16" fill="url(#emerald-grad)" filter="url(#glow)" />
          <text x="-40" y="64" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">dp[3]</text>

          <circle cx="40" cy="60" r="16" fill="url(#emerald-grad)" filter="url(#glow)" />
          <text x="40" y="64" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">dp[2]</text>
        </g>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        한 번 계산한 결과는 <tspan fill="#6366f1" fontWeight="800">배열에 저장</tspan>하여 거대한 트리의 중복 연산을 막습니다.
      </text>
    </svg>
  );
}

function BaseConversionStorage() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        진법 변환 저장 (나머지 역순 배열)
      </text>

      <g transform="translate(100, 100)" filter="url(#soft-shadow)">
        <rect width="600" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

        {/* Division Process */}
        <g transform="translate(60, 40)">
           <text x="0" y="20" fontSize="18" fontWeight="800" fill="#6366f1">10진수 13을 2진수로 변환</text>

           <g transform="translate(20, 60)" fontSize="16" fontWeight="bold">
              <text x="0" y="0" fill="hsl(var(--foreground))">13 ÷ 2 = 6 ... <tspan fill="#f43f5e" fontWeight="900">1</tspan></text>
              <text x="0" y="30" fill="hsl(var(--foreground))">6 ÷ 2 = 3 ... <tspan fill="#f43f5e" fontWeight="900">0</tspan></text>
              <text x="0" y="60" fill="hsl(var(--foreground))">3 ÷ 2 = 1 ... <tspan fill="#f43f5e" fontWeight="900">1</tspan></text>
              <text x="0" y="90" fill="hsl(var(--foreground))">1 ÷ 2 = 0 ... <tspan fill="#f43f5e" fontWeight="900">1</tspan></text>
           </g>

           {/* Arrow to array */}
           <motion.path d="M 180 150 Q 250 150 280 120" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow-head)" strokeDasharray="6 6" fill="none"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
        </g>

        {/* Array Storage */}
        <g transform="translate(380, 80)">
           <text x="80" y="-15" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#6366f1">나머지 배열 저장</text>
           <rect width="160" height="50" rx="8" fill="#f43f5e" opacity="0.1" stroke="#f43f5e" strokeWidth="2" />
           <text x="80" y="32" textAnchor="middle" fontSize="24" fontWeight="900" fill="#f43f5e">[ 1, 0, 1, 1 ]</text>

           <path d="M 160 80 Q 220 120 120 140" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)" fill="none" />
           <text x="210" y="100" fontSize="14" fontWeight="bold" fill="#10b981">역순 뒤집기</text>

           <rect x="-20" y="140" width="200" height="50" rx="8" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="2" />
           <text x="80" y="172" textAnchor="middle" fontSize="26" fontWeight="900" fill="#10b981">1  1  0  1</text>
        </g>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        계산되어 나오는 나머지를 <tspan fill="#f43f5e" fontWeight="800">배열에 순차 저장</tspan>한 뒤 역순으로 읽어 완성합니다.
      </text>
    </svg>
  );
}

function SpaceTimeTradeoff() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        공간-시간 트레이드오프 (Space-Time Tradeoff)
      </text>

      <g transform="translate(100, 100)">
        {/* Memory Heavy Option */}
        <g transform="translate(0, 0)" filter="url(#soft-shadow)">
           <rect width="250" height="220" rx="16" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="3" />
           <rect x="0" y="0" width="250" height="40" rx="16" fill="#10b981" opacity="0.2" />
           <text x="125" y="25" textAnchor="middle" fontSize="16" fontWeight="800" fill="#10b981">메모리(공간)를 희생</text>

           <rect x="50" y="80" width="150" height="60" rx="8" fill="url(#emerald-grad)" />
           <text x="125" y="115" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff">거대한 배열 캐시</text>

           <text x="125" y="180" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--foreground))">연산 시 <tspan fill="#3b82f6">O(1)</tspan>로 즉시 획득</text>
        </g>

        {/* SeeSaw Pivot */}
        <g transform="translate(250, 60)">
           <motion.path d="M 50 100 L 100 80 L 100 120 z" fill="hsl(var(--muted-foreground))"
              animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ originX: "75px", originY: "100px" }} />
           <text x="75" y="150" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--muted-foreground))">균형(Tradeoff)</text>
        </g>

        {/* CPU Heavy Option */}
        <g transform="translate(350, 0)" filter="url(#soft-shadow)">
           <rect width="250" height="220" rx="16" fill="url(#surface-grad)" stroke="#f43f5e" strokeWidth="3" />
           <rect x="0" y="0" width="250" height="40" rx="16" fill="#f43f5e" opacity="0.2" />
           <text x="125" y="25" textAnchor="middle" fontSize="16" fontWeight="800" fill="#f43f5e">CPU(시간)를 희생</text>

           <circle cx="125" cy="110" r="30" fill="url(#destructive-grad)" />
           <text x="125" y="115" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">연산</text>

           <motion.path d="M 80 110 A 45 45 0 1 1 79.9 110" fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray="20 10"
              animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} style={{ originX: "125px", originY: "110px" }} />

           <text x="125" y="180" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--foreground))">공간 절약 대신 계산 <tspan fill="#f43f5e">지연</tspan></text>
        </g>
      </g>

      <rect x="150" y="350" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="380" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        배열을 이용해 미리 계산해두는 것(캐싱)은 전형적인 <tspan fill="#10b981" fontWeight="800">공간-시간 트레이드오프</tspan> 전략입니다.
      </text>
    </svg>
  );
}

export const ArrayPrimeSupplementaryOptions = [
  SieveOfEratosthenes,
  BaseConversionStorage,
  SpaceTimeTradeoff,
  MemoizationCache,
];
