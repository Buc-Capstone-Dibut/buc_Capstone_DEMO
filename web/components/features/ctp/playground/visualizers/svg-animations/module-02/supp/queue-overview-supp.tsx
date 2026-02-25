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

function FIFOFairness() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        FIFO (First-In, First-Out) 공정성
      </text>

      {/* Queue Tunnel */}
      <g transform="translate(150, 150)" filter="url(#soft-shadow)">
         <rect width="500" height="80" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="4" />
         <path d="M 0 0 L 500 0" stroke="hsl(var(--background))" strokeWidth="4" />
         <path d="M 0 80 L 500 80" stroke="hsl(var(--background))" strokeWidth="4" />
      </g>

      {/* People / Elements */}
      <g transform="translate(0, 160)">
         {/* Enqueueing Elements */}
         <motion.g animate={{ x: [0, 90, 170] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
           <rect x="50" y="0" width="60" height="60" rx="30" fill="url(#primary-grad)" />
           <text x="80" y="36" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#fff">3</text>
         </motion.g>

         {/* Inside Queue */}
         <g transform="translate(250, 0)">
           <rect x="0" y="0" width="60" height="60" rx="30" fill="hsl(var(--muted-foreground))" />
           <text x="30" y="36" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#fff">2</text>
         </g>
         <g transform="translate(350, 0)">
           <rect x="0" y="0" width="60" height="60" rx="30" fill="url(#emerald-grad)" />
           <text x="30" y="36" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#fff">1</text>
         </g>

         {/* Dequeueing Elements */}
         <motion.g animate={{ x: [450, 550, 650], opacity: [1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
           <rect x="0" y="0" width="60" height="60" rx="30" fill="url(#destructive-grad)" />
           <text x="30" y="36" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#fff">0</text>
         </motion.g>
      </g>

      <g transform="translate(150, 100)">
        <text x="0" y="0" fontSize="18" fontWeight="bold" fill="#6366f1">Enqueue (입장)</text>
        <path d="M 0 15 L 0 35" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrow-head)" />
      </g>

      <g transform="translate(480, 100)">
        <text x="120" y="0" textAnchor="end" fontSize="18" fontWeight="bold" fill="#f43f5e">Dequeue (퇴장)</text>
        <path d="M 120 15 L 120 35" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow-head)" />
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        먼저 들어온 작업이 <tspan fill="#10b981" fontWeight="800">새치기 없이 가장 먼저 처리</tspan>되는 완벽한 공정성(Fairness) 구조입니다.
      </text>
    </svg>
  );
}

function FrontRearPointers() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
       <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        역할을 나눈 두 포인터 (Front / Rear)
      </text>

      <g transform="translate(100, 180)">
         {/* Array Slots */}
         {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={i * 80 + 20} y="0" width="70" height="70" rx="8" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" filter="url(#soft-shadow)" />
         ))}

         {/* Data */}
         {["A", "B", "C", "D"].map((val, i) => (
             <g key={val} transform={`translate(${(i + 1) * 80 + 20}, 0)`}>
                <rect width="70" height="70" rx="8" fill="hsl(var(--muted-foreground))" opacity="0.2" />
                <text x="35" y="45" textAnchor="middle" fontSize="28" fontWeight="bold" fill="hsl(var(--foreground))">{val}</text>
             </g>
         ))}

         {/* Front Pointer (Output) */}
         <motion.g animate={{ x: [80, 160, 160] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1], ease: "easeInOut" }}>
            <path d="M 55 90 L 55 130" stroke="#f43f5e" strokeWidth="4" />
            <polygon points="45,90 65,90 55,75" fill="#f43f5e" />
            <rect x="25" y="140" width="60" height="30" rx="6" fill="#f43f5e" />
            <text x="55" y="160" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">Front</text>
            <text x="55" y="195" textAnchor="middle" fontSize="12" fill="#f43f5e">Dequeue 지점</text>
         </motion.g>

         {/* Rear Pointer (Input) */}
         <motion.g animate={{ x: [400, 480, 480] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1], ease: "easeInOut" }}>
            <path d="M 55 -60 L 55 -20" stroke="#6366f1" strokeWidth="4" />
            <polygon points="45,-20 65,-20 55,-5" fill="#6366f1" />
            <rect x="25" y="-100" width="60" height="30" rx="6" fill="#6366f1" />
            <text x="55" y="-80" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">Rear</text>
            <text x="55" y="-115" textAnchor="middle" fontSize="12" fill="#6366f1">Enqueue 지점</text>
         </motion.g>

         {/* Operations Effect */}
         <motion.g animate={{ opacity: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1] }}>
            <rect x="420" y="0" width="70" height="70" rx="8" fill="url(#primary-grad)" opacity="0.3" filter="url(#glow)" />
            <text x="455" y="45" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#6366f1">E</text>
         </motion.g>

         <motion.g animate={{ opacity: [1, 0, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1] }}>
            <rect x="100" y="0" width="70" height="70" rx="8" fill="url(#destructive-grad)" opacity="0.3" filter="url(#glow)" />
         </motion.g>
      </g>

      <rect x="150" y="400" width="500" height="30" rx="15" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="420" textAnchor="middle" fontSize="14" fontWeight="600" fill="hsl(var(--foreground))">
        입력과 출력의 포인터가 분리되어 있어, 양쪽 끝에서 각각 <tspan fill="#6366f1" fontWeight="800">독립적인 연산</tspan>을 O(1)에 수행합니다.
      </text>
    </svg>
  );
}

function ThroughputLatency() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        처리량과 대기 지연(Latency)의 딜레마
      </text>

      <g transform="translate(150, 100)">
         {/* Axis */}
         <polyline points="50,220 50,50" fill="none" stroke="hsl(var(--foreground))" strokeWidth="3" markerEnd="url(#arrow-head)" />
         <polyline points="50,220 400,220" fill="none" stroke="hsl(var(--foreground))" strokeWidth="3" markerEnd="url(#arrow-head)" />
         <text x="250" y="250" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--muted-foreground))">큐의 길이 (대기 중인 요청 수)</text>
         <text x="30" y="140" textAnchor="middle" transform="rotate(-90 30 140)" fontSize="16" fontWeight="bold" fill="hsl(var(--muted-foreground))">지연 시간 (Latency)</text>

         {/* Latency Curve (Exponential curve showing congestion) */}
         <motion.path d="M 50 200 Q 250 180 380 60" fill="none" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" filter="url(#glow)"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />

         {/* Processing Rate Line (Constant) */}
         <path d="M 50 100 L 400 100" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="8 8" />
         <text x="320" y="90" fontSize="14" fontWeight="bold" fill="#10b981">서버 최대 처리량</text>

         {/* Bottleneck Point */}
         <circle cx="280" cy="115" r="8" fill="#f43f5e" />
         <text x="280" y="140" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#f43f5e">병목 지점</text>
      </g>

      {/* Explanation blocks */}
      <g transform="translate(560, 100)" filter="url(#soft-shadow)">
        <rect width="200" height="150" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
        <rect width="200" height="40" rx="16" fill="hsl(var(--muted))" />
        <text x="100" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">성능 Trade-off</text>

        <text x="20" y="70" fontSize="12" fill="hsl(var(--muted-foreground))">큐 길이가 길어지면?</text>
        <rect x="20" y="80" width="160" height="4" fill="#6366f1" />
        <text x="20" y="105" fontSize="13" fontWeight="bold" fill="hsl(var(--foreground))">✅ 데이터 유실 방지율 상승</text>
        <text x="20" y="130" fontSize="13" fontWeight="bold" fill="#f43f5e">❌ 평균 대기 시간(지연) 폭증</text>
      </g>

      <rect x="150" y="380" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="410" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        무작정 큐를 길게 만들면 데이터는 안전하지만, 서비스 <tspan fill="#f43f5e" fontWeight="800">응답 시간(Latency)</tspan>이 치명적으로 느려집니다.
      </text>
    </svg>
  );
}

function ApplicationExamples() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        대표 응용 시스템
      </text>

      <g transform="translate(100, 100)">
         {/* BFS */}
         <g transform="translate(0, 0)" filter="url(#soft-shadow)">
            <rect width="180" height="220" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="90" y="40" textAnchor="middle" fontSize="18" fontWeight="900" fill="#6366f1">BFS 최단 거리</text>

            <g transform="translate(90, 100)">
               <circle cx="0" cy="-30" r="15" fill="none" stroke="#6366f1" strokeWidth="2" />
               <circle cx="-30" cy="10" r="15" fill="none" stroke="#6366f1" strokeWidth="2" />
               <circle cx="30" cy="10" r="15" fill="none" stroke="#6366f1" strokeWidth="2" />
               <path d="M 0 -15 L -20 -15" fill="none" stroke="#6366f1" strokeWidth="2" />
            </g>

            {/* Ripple Effect corresponding to level order */}
            <motion.circle cx="90" cy="70" r="10" fill="none" stroke="#6366f1" strokeWidth="4" filter="url(#glow)"
               animate={{ r: [10, 50, 80], opacity: [1, 0, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }} />

            <text x="90" y="180" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">시작점부터 거리가</text>
            <text x="90" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">가까운 순서대로 탐색</text>
         </g>

         {/* Job Scheduler */}
         <g transform="translate(210, 0)" filter="url(#soft-shadow)">
            <rect width="180" height="220" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="90" y="40" textAnchor="middle" fontSize="18" fontWeight="900" fill="#f43f5e">작업 스케줄링</text>

            <g transform="translate(30, 80)">
               <rect width="30" height="40" rx="4" fill="url(#destructive-grad)" />
               <rect x="40" width="30" height="40" rx="4" fill="#f43f5e" opacity="0.6" />
               <rect x="80" width="30" height="40" rx="4" fill="#f43f5e" opacity="0.3" />

               <motion.path d="M -20 20 L 140 20" stroke="#f43f5e" strokeWidth="3" strokeDasharray="4 4" markerEnd="url(#arrow-head)"
                  animate={{ x: [-20, 0, -20] }} transition={{ duration: 2, repeat: Infinity }} />
            </g>

            <text x="90" y="180" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">먼저 도착한 프린터/CPU</text>
            <text x="90" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">명령을 순차적으로 처리</text>
         </g>

         {/* Message Queue */}
         <g transform="translate(420, 0)" filter="url(#soft-shadow)">
            <rect width="180" height="220" rx="16" fill="url(#surface-grad)" stroke={ "hsl(var(--border))" } strokeWidth="2" />
            <text x="90" y="40" textAnchor="middle" fontSize="18" fontWeight="900" fill="#10b981">멀티스레드 메시지</text>

            <g transform="translate(20, 100)">
               <rect x="0" y="-15" width="40" height="30" rx="4" fill="#10b981" />
               <path d="M 50 0 L 90 0 L 90 -40 L 140 -40" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)" strokeDasharray="6 6" />

               <text x="20" y="5" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#fff">Thread</text>
               <text x="120" y="-50" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#10b981">Process Queue</text>
            </g>

            <text x="90" y="180" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">비동기 이벤트 발생을</text>
            <text x="90" y="200" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">유실 없이 버퍼링 보관</text>
         </g>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        <tspan fill="#6366f1" fontWeight="800">순서를 절대적으로 보존</tspan>해야 하는 시스템의 뼈대로 널리 활용됩니다.
      </text>
    </svg>
  );
}

export const QueueOverviewSupplementaryOptions = [
  FIFOFairness,
  FrontRearPointers,
  ThroughputLatency,
  ApplicationExamples,
];
