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
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="hsl(var(--border))" opacity="0.5" />
      </pattern>
    </defs>
  );
}

function VisualDebugging() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        시각적 흐름 추적 (Flowchart Tracing)
      </text>

      {/* Code Block */}
      <g transform="translate(100, 120)" filter="url(#soft-shadow)">
         <rect width="250" height="200" rx="16" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
         <rect x="0" y="0" width="250" height="40" rx="16" fill="hsl(var(--muted))" />
         <text x="20" y="25" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">코드 라인 단위 실행</text>

         {/* Animated Highlight code line */}
         <motion.rect x="10" y="60" width="230" height="25" rx="6" fill="#6366f1" opacity="0.2"
            animate={{ y: [60, 100, 140, 60] }} transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }} />

         <text x="20" y="78" fontSize="13" fontFamily="monospace" fill="hsl(var(--foreground))" fontWeight="600">
            <tspan fill="#6366f1">let</tspan> x = 5;
         </text>
         <text x="20" y="118" fontSize="13" fontFamily="monospace" fill="hsl(var(--foreground))" fontWeight="600">
            x = x * 2;
         </text>
         <text x="20" y="158" fontSize="13" fontFamily="monospace" fill="hsl(var(--foreground))" fontWeight="600">
            <tspan fill="#10b981">return</tspan> x;
         </text>
      </g>

      <path d="M 380 220 L 440 220" stroke="hsl(var(--muted-foreground))" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="6 6" />

      {/* Memory State Table */}
      <g transform="translate(480, 120)" filter="url(#soft-shadow)">
         <rect width="200" height="200" rx="16" fill="url(#surface-grad)" stroke="url(#primary-grad)" strokeWidth="3" />
         <rect x="0" y="0" width="200" height="40" rx="16" fill="url(#primary-grad)" />
         <text x="100" y="25" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">메모리 상태 테이블</text>

         <line x1="100" y1="40" x2="100" y2="200" stroke="hsl(var(--border))" strokeWidth="2" />

         <text x="50" y="70" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">변수</text>
         <text x="150" y="70" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">값 (Value)</text>

         <text x="50" y="120" textAnchor="middle" fontSize="20" fontWeight="900" fill="#6366f1">x</text>

         {/* Value updating */}
         <text x="150" y="120" textAnchor="middle" fontSize="24" fontWeight="900" fill="#10b981">10</text>
         <rect x="110" y="95" width="80" height="30" fill="hsl(var(--card))" /> {/* Overlayer trick for framer motion text swap issue avoiding heavy DOM */}

         <motion.text x="150" y="120" textAnchor="middle" fontSize="24" fontWeight="900" fill="#10b981"
            animate={{ opacity: [0, 1, 0, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}>5</motion.text>
         <motion.text x="150" y="120" textAnchor="middle" fontSize="24" fontWeight="900" fill="#10b981"
            animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}>10</motion.text>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        눈으로 변수가 변하는 것을 따라가는 것이 디버깅의 핵심입니다.
      </text>
    </svg>
  );
}

function BaseCaseIdentification() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        종료 조건 (Base/Exit Case) 식별
      </text>

      {/* Infinite Loop Danger */}
      <g transform="translate(150, 150)" filter="url(#soft-shadow)">
        <rect width="200" height="150" rx="16" fill="url(#surface-grad)" stroke="#f43f5e" strokeWidth="2" />
        <text x="100" y="30" textAnchor="middle" fontSize="16" fontWeight="800" fill="#f43f5e">종료 조건 누락</text>

        <motion.path d="M 100 60 A 30 30 0 1 1 99.9 60" stroke="#f43f5e" strokeWidth="4" fill="none"
           animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ originX: "100px", originY: "90px" }} />

        <text x="100" y="130" textAnchor="middle" fontSize="20" fontWeight="900" fill="#f43f5e">무한 루프 ☠️</text>
      </g>

      <path d="M 380 220 L 420 220" stroke="hsl(var(--muted-foreground))" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="6 6" />

      {/* Controlled Exit */}
      <g transform="translate(450, 150)" filter="url(#soft-shadow)">
        <rect width="200" height="150" rx="16" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="2" />
        <text x="100" y="30" textAnchor="middle" fontSize="16" fontWeight="800" fill="#10b981">명확한 Exit Case</text>

        {/* Loop Path */}
        <path d="M 100 50 A 30 30 0 1 1 40 50" stroke="#10b981" strokeWidth="3" fill="none" opacity="0.3" />

        <g transform="translate(60, 50)">
           <polygon points="40,0 80,20 40,40 0,20" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="2" />
           <text x="40" y="25" textAnchor="middle" fontSize="12" fontWeight="900" fill="#10b981">N 도착?</text>
        </g>

        {/* Escape Path */}
        <motion.path d="M 100 90 L 100 130" stroke="#6366f1" strokeWidth="4" markerEnd="url(#arrow-head)"
           initial={{ opacity: 0, y: -10 }} animate={{ opacity: [0, 1, 0], y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />

        <text x="140" y="115" textAnchor="middle" fontSize="14" fontWeight="800" fill="#6366f1">Yes (탈출)</text>
      </g>

      <rect x="150" y="350" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="380" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        반복과 재귀의 생명줄은 <tspan fill="#10b981" fontWeight="800">'언제 끝날 것인가(Base Case)'</tspan>를 설계하는 것입니다.
      </text>
    </svg>
  );
}

function EdgeCaseSimulation() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        엣지 케이스 시뮬레이션
      </text>

      {/* Input variations */}
      <g transform="translate(100, 150)">
        <g transform="translate(0, 0)">
          <rect width="100" height="40" rx="6" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="2" />
          <text x="50" y="25" textAnchor="middle" fontSize="14" fontWeight="900" fill="#10b981">정상 데이터</text>
          <motion.path d="M 100 20 L 180 60" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)" strokeDasharray="4 4"
             animate={{ strokeDashoffset: -20 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </g>
        <g transform="translate(0, 80)">
          <rect width="100" height="40" rx="6" fill="#f43f5e" opacity="0.2" stroke="#f43f5e" strokeWidth="2" />
          <text x="50" y="25" textAnchor="middle" fontSize="14" fontWeight="900" fill="#f43f5e">빈 배열 [ ]</text>
          <motion.path d="M 100 20 L 180 -10" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow-head)" strokeDasharray="4 4"
             animate={{ strokeDashoffset: -20 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </g>
      </g>

      {/* Logic Gate */}
      <g transform="translate(300, 150)" filter="url(#soft-shadow)">
        <polygon points="60,0 120,40 60,80 0,40" fill="url(#surface-grad)" stroke="#6366f1" strokeWidth="3" />
        <text x="60" y="45" textAnchor="middle" fontSize="14" fontWeight="800" fill="#6366f1">데이터 있음?</text>
      </g>

      <path d="M 420 190 L 520 150" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)" />
      <path d="M 420 190 L 520 250" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow-head)" />

      <text x="470" y="160" fontSize="14" fontWeight="800" fill="#10b981">Yes</text>
      <text x="470" y="235" fontSize="14" fontWeight="800" fill="#f43f5e">No</text>

      {/* Outcomes */}
      <g transform="translate(540, 120)" filter="url(#soft-shadow)">
        <rect width="140" height="40" rx="8" fill="#10b981" />
        <text x="70" y="25" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">정상 로직 수행</text>
      </g>
      <g transform="translate(540, 230)" filter="url(#soft-shadow)">
        <rect width="140" height="40" rx="8" fill="#f43f5e" />
        <text x="70" y="25" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">예외 반환 (Null)</text>
      </g>

      <rect x="150" y="350" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="380" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        데이터가 비어있거나, 값이 음수일 때 등 극단적인 <tspan fill="#f43f5e" fontWeight="800">Edge Case</tspan>를 방어해야 합니다.
      </text>
    </svg>
  );
}

function VariableStateTimeline() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        변수 상태 타임라인 (Timeline Tracker)
      </text>

      <g transform="translate(150, 100)" filter="url(#soft-shadow)">
        <rect width="500" height="220" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

        {/* Timeline Axis */}
        <line x1="50" y1="180" x2="450" y2="180" stroke="hsl(var(--border))" strokeWidth="4" />
        <text x="450" y="210" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--muted-foreground))">시간 (Step)</text>

        {/* Lines */}
        <path d="M 50 150 L 150 150 L 250 120 L 350 90 L 450 40" fill="none" stroke="#f43f5e" strokeWidth="4" />
        <path d="M 50 120 L 150 90 L 250 70 L 350 60 L 450 50" fill="none" stroke="#3b82f6" strokeWidth="4" />

        {/* Nodes and Values */}
        {[0, 1, 2, 3, 4].map((i) => {
          const sumY = [150, 150, 120, 90, 40][i];
          const iY = [120, 90, 70, 60, 50][i];
          const sumVal = [0, 0, 3, 8, 15][i];

          return (
            <g key={`step-${i}`} transform={`translate(${50 + i * 100}, 0)`}>
              <circle cx="0" cy={sumY} r="6" fill="#f43f5e" />
              <text x="0" y={sumY - 15} textAnchor="middle" fontSize="14" fontWeight="900" fill="#f43f5e">{sumVal}</text>

              <circle cx="0" cy={iY} r="6" fill="#3b82f6" />
              <text x="0" y={iY - 15} textAnchor="middle" fontSize="14" fontWeight="900" fill="#3b82f6">{i}</text>

              <line x1="0" y1="175" x2="0" y2="185" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
              <text x="0" y="200" textAnchor="middle" fontSize="12" fill="hsl(var(--muted-foreground))">t={i}</text>
            </g>
          );
        })}

        {/* Legend */}
        <rect x="50" y="20" width="12" height="12" rx="2" fill="#f43f5e" />
        <text x="70" y="30" fontSize="14" fontWeight="800" fill="#f43f5e">sum</text>
        <rect x="120" y="20" width="12" height="12" rx="2" fill="#3b82f6" />
        <text x="140" y="30" fontSize="14" fontWeight="800" fill="#3b82f6">i (인덱스)</text>
      </g>

      <rect x="150" y="350" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="380" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        시간의 흐름에 따라 각 핵심 변수가 어떻게 변하는가를 추적합니다.
      </text>
    </svg>
  );
}

export const FlowTracingSupplementaryOptions = [
  VisualDebugging,
  BaseCaseIdentification,
  EdgeCaseSimulation,
  VariableStateTimeline,
];
