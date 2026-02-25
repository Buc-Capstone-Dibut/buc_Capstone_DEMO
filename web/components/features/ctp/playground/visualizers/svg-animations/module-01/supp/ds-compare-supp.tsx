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
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="hsl(var(--border))" opacity="0.5" />
      </pattern>
    </defs>
  );
}

function ArrayMemoryAccess() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        배열(Array)의 본질: 연속된 메모리와 O(1) 접근
      </text>

      <g transform="translate(100, 160)" filter="url(#soft-shadow)">
        {/* Contiguous Blocks */}
        <rect x="0" y="0" width="600" height="120" rx="20" fill="url(#surface-grad)" stroke="url(#primary-grad)" strokeWidth="3" />
        <text x="80" y="-15" fontSize="16" fontWeight="bold" fill="#6366f1">메모리 (RAM)</text>

        {/* Index numbers */}
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <text key={`txt-${idx}`} x={50 + idx * 100} y="30" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--muted-foreground))">
            idx {idx}
          </text>
        ))}

        {/* Value cells */}
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <g key={`cell-${idx}`} transform={`translate(${10 + idx * 100}, 45)`}>
            <rect width="80" height="60" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
            <text x="40" y="38" textAnchor="middle" fontSize="24" fontWeight="900" fill="hsl(var(--foreground))">
              {[10, 20, 30, 40, 50, 60][idx]}
            </text>
          </g>
        ))}

        {/* Flash access animation */}
        <motion.rect x="310" y="45" width="80" height="60" rx="10" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="4"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: [0, 1, 0], scale: [0.9, 1.1, 0.9] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />

        <motion.path d="M 350 -40 L 350 30" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: [0, 1, 0], y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />

        <motion.text x="350" y="-50" textAnchor="middle" fontSize="16" fontWeight="900" fill="#10b981"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}>
          빠른 접근 arr[3]
        </motion.text>
      </g>

      <rect x="150" y="350" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="380" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        데이터가 다닥다닥 붙어있어 인덱스 계산만으로 단숨에 데이터를 찾을 수 있습니다.
      </text>
    </svg>
  );
}

function StaticVsDynamic() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        크기 확장의 제약 (Static vs Dynamic)
      </text>

      {/* Static Array limitation */}
      <g transform="translate(100, 100)">
        <text x="0" y="20" fontSize="16" fontWeight="bold" fill="#f43f5e">정적 배열 (크기 초과 시)</text>

        {/* Memory slots */}
        {[0, 1, 2].map((i) => (
          <rect key={`old-${i}`} x={i * 70} y="40" width="60" height="60" rx="8" fill="url(#surface-grad)" stroke={i === 2 ? "#f43f5e" : "hsl(var(--border))"} strokeWidth="2" />
        ))}
        {/* Blocked wall symbol */}
        <rect x="210" y="30" width="10" height="80" rx="4" fill="#f43f5e" />
        <text x="260" y="75" fontSize="14" fontWeight="800" fill="#f43f5e">다른 데이터 공간 (확장 불가)</text>
      </g>

      <path d="M 350 170 L 350 250" stroke="hsl(var(--muted-foreground))" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="8 8" opacity="0.6" />
      <text x="360" y="215" fontSize="14" fontWeight="700" fill="hsl(var(--foreground))">새로운 공간 할당 + 전체 복사 발생 (Overhead)</text>

      {/* Dynamic Array / Relocation */}
      <g transform="translate(100, 270)">
        <text x="0" y="20" fontSize="16" fontWeight="bold" fill="#10b981">동적 배열 (Re-allocation)</text>

        {/* New larger memory slots */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`new-${i}`} x={i * 70} y="40" width="60" height="60" rx="8" fill="url(#surface-grad)" stroke={i < 3 ? "#10b981" : "hsl(var(--border))"} strokeWidth="2" />
        ))}

        {/* Copy animations */}
        {[0, 1, 2].map((i) => (
          <motion.path key={`arch-${i}`} d={`M ${i * 70 + 30} -70 Q ${i * 70 + 80} -20 ${i * 70 + 30} 40`} stroke="#10b981" strokeWidth="3" fill="none"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: [0, 1, 0], pathLength: [0, 1, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }} />
        ))}

        <motion.circle cx="240" cy="70" r="15" fill="#10b981" filter="url(#glow)"
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
      </g>
    </svg>
  );
}

function TupleImmutability() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        튜플(Tuple)의 불변성 (Immutability)
      </text>

      {/* Mutable List Box */}
      <g transform="translate(150, 150)" filter="url(#soft-shadow)">
        <rect width="200" height="150" rx="16" fill="url(#surface-grad)" stroke="#3b82f6" strokeWidth="3" strokeDasharray="10 5" />
        <text x="100" y="30" textAnchor="middle" fontSize="18" fontWeight="800" fill="#3b82f6">수정 가능 (List)</text>

        <rect x="40" y="60" width="120" height="60" rx="8" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="2" />
        <text x="100" y="96" textAnchor="middle" fontSize="24" fontWeight="900" fill="hsl(var(--foreground))">[ 1, 2, <tspan fill="#f43f5e" textDecoration="line-through">3</tspan>, 4 ]</text>
        <motion.text x="145" y="70" fontSize="24" fontWeight="900" fill="#10b981"
           initial={{ opacity: 0, y: -20 }} animate={{ opacity: [0, 1, 0], y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
           9
        </motion.text>
      </g>

      {/* Immutable Tuple Safe */}
      <g transform="translate(450, 150)" filter="url(#soft-shadow)">
        <rect width="200" height="150" rx="16" fill="url(#surface-grad)" stroke="#10b981" strokeWidth="4" />
        <text x="100" y="30" textAnchor="middle" fontSize="18" fontWeight="800" fill="#10b981">수정 불가 (Tuple)</text>

        {/* Padlock icon base */}
        <rect x="85" y="-10" width="30" height="20" rx="4" fill="#10b981" />
        <path d="M 90 -10 A 10 10 0 0 1 110 -10" fill="none" stroke="#10b981" strokeWidth="4" />

        <rect x="40" y="60" width="120" height="60" rx="8" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="2" />
        <text x="100" y="96" textAnchor="middle" fontSize="24" fontWeight="900" fill="hsl(var(--foreground))">( 1, 2, 3, 4 )</text>

        {/* Reject animation */}
        <motion.line x1="120" y1="50" x2="150" y2="20" stroke="#f43f5e" strokeWidth="4"
           initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
        <motion.line x1="150" y1="50" x2="120" y2="20" stroke="#f43f5e" strokeWidth="4"
           initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
      </g>

      <rect x="150" y="350" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="380" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        데이터가 변조되지 않음을 <tspan fill="#10b981" fontWeight="800">시스템 레벨에서 보장</tspan>하여 동시성 오류를 예방합니다.
      </text>
    </svg>
  );
}

function OperationCostTable() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        배열 vs 연결 리스트: 연산 비용 비교
      </text>

      <g transform="translate(100, 100)" filter="url(#soft-shadow)">
        <rect width="600" height="260" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

        {/* Table Headers */}
        <line x1="0" y1="50" x2="600" y2="50" stroke="hsl(var(--border))" strokeWidth="2" opacity="0.5" />
        <line x1="200" y1="0" x2="200" y2="260" stroke="hsl(var(--border))" strokeWidth="2" opacity="0.5" />
        <line x1="400" y1="0" x2="400" y2="260" stroke="hsl(var(--border))" strokeWidth="2" opacity="0.5" />

        <text x="100" y="32" textAnchor="middle" fontSize="16" fontWeight="800" fill="hsl(var(--foreground))">연산 종류</text>
        <text x="300" y="32" textAnchor="middle" fontSize="18" fontWeight="900" fill="#6366f1">배열 (Array)</text>
        <text x="500" y="32" textAnchor="middle" fontSize="18" fontWeight="900" fill="#10b981">연결 리스트 (Linked List)</text>

        {/* Row 1: Access */}
        <line x1="0" y1="102" x2="600" y2="102" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2" />
        <text x="100" y="82" textAnchor="middle" fontSize="15" fontWeight="700" fill="hsl(var(--foreground))">조회 (Access)</text>
        <g transform="translate(230, 65)">
           <rect width="140" height="30" rx="6" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="1" />
           <text x="70" y="20" textAnchor="middle" fontSize="15" fontWeight="900" fill="#10b981">O(1) (매우빠름)</text>
        </g>
        <text x="500" y="82" textAnchor="middle" fontSize="15" fontWeight="700" fill="#f43f5e">O(N) (탐색필요)</text>

        {/* Row 2: Search */}
        <line x1="0" y1="154" x2="600" y2="154" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2" />
        <text x="100" y="134" textAnchor="middle" fontSize="15" fontWeight="700" fill="hsl(var(--foreground))">검색 (Search)</text>
        <text x="300" y="134" textAnchor="middle" fontSize="15" fontWeight="700" fill="#f43f5e">O(N)</text>
        <text x="500" y="134" textAnchor="middle" fontSize="15" fontWeight="700" fill="#f43f5e">O(N)</text>

        {/* Row 3: Insert Last */}
        <line x1="0" y1="206" x2="600" y2="206" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2" />
        <text x="100" y="186" textAnchor="middle" fontSize="15" fontWeight="700" fill="hsl(var(--foreground))">끝에 삽입 (Append)</text>
        <text x="300" y="186" textAnchor="middle" fontSize="15" fontWeight="700" fill="#10b981">O(1)</text>
        <text x="500" y="186" textAnchor="middle" fontSize="15" fontWeight="700" fill="#10b981">O(1)</text>

        {/* Row 4: Insert Middle */}
        <text x="100" y="238" textAnchor="middle" fontSize="15" fontWeight="700" fill="hsl(var(--foreground))">중간 삽입/삭제</text>
        <text x="300" y="238" textAnchor="middle" fontSize="15" fontWeight="700" fill="#f43f5e">O(N) (이동발생)</text>
        <g transform="translate(430, 221)">
           <rect width="140" height="30" rx="6" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="1" />
           <text x="70" y="20" textAnchor="middle" fontSize="15" fontWeight="900" fill="#10b981">O(1) (참조만변경)</text>
        </g>
      </g>

      <rect x="150" y="380" width="500" height="40" rx="20" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="405" textAnchor="middle" fontSize="14" fontWeight="600" fill="hsl(var(--foreground))">
        "조회가 잦으면 배열", "중간 데이터 변화가 심하면 리스트"를 선택합니다.
      </text>
    </svg>
  );
}

export const DsCompareSupplementaryOptions = [
  ArrayMemoryAccess,
  StaticVsDynamic,
  TupleImmutability,
  OperationCostTable,
];
