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
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.1" />
      </filter>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="hsl(var(--border))" opacity="0.5" />
      </pattern>
    </defs>
  );
}

function ZeroBased() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        배열의 임의 접근 (Random Access: O(1))
      </text>

      {/* Main Base Pointer */}
      <g transform="translate(100, 150)">
        <path d="M 40 -40 L 40 10" stroke="#6366f1" strokeWidth="4" markerEnd="url(#arrow-head)" />
        <text x="40" y="-55" textAnchor="middle" fontSize="16" fontWeight="900" fill="#6366f1">Base (0x100)</text>
      </g>

      {/* Array Container */}
      <g transform="translate(140, 160)" filter="url(#soft-shadow)">
        <rect width="520" height="100" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

        {/* Cells */}
        {[10, 20, 30, 40].map((val, i) => (
          <g key={i} transform={`translate(${20 + i * 120}, 15)`}>
            <rect width="100" height="70" rx="12" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
            <text x="50" y="45" textAnchor="middle" fontSize="28" fontWeight="900" fill="hsl(var(--foreground))">{val}</text>
            <text x="50" y="105" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--muted-foreground))">idx {i}</text>
          </g>
        ))}

        {/* Pointer Math animation for arr[3] */}
        <motion.rect x="380" y="15" width="100" height="70" rx="12" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="3"
          animate={{ opacity: [0, 0.2, 0] }} transition={{ duration: 2.5, repeat: Infinity }} />

        <motion.path d="M 0 0 C 100 -50, 300 -50, 430 0" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="10 10"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }} />
      </g>

      {/* Formula Box */}
      <rect x="150" y="340" width="500" height="55" rx="27.5" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="373" textAnchor="middle" fontSize="16" fontWeight="600" fill="hsl(var(--foreground))">
        주소 = <tspan fill="#6366f1" fontWeight="800">Base</tspan> + (<tspan fill="#10b981" fontWeight="800">Index * 타입 크기</tspan>)
      </text>
    </svg>
  );
}

function Slicing() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        배열 슬라이싱 (Array Slicing [1:4])
      </text>

      {/* Original Array */}
      <g transform="translate(100, 120)">
        <text x="-20" y="45" fontSize="20" fontWeight="900" fill="hsl(var(--muted-foreground))">arr</text>
        {[10, 20, 30, 40, 50].map((val, i) => {
          const isTarget = i >= 1 && i < 4;
          return (
            <g key={i} transform={`translate(${40 + i * 110}, 0)`}>
              <motion.rect width="90" height="70" rx="12" fill={isTarget ? "url(#surface-grad)" : "hsl(var(--muted))"}
                stroke={isTarget ? "url(#primary-grad)" : "hsl(var(--border))"} strokeWidth={isTarget ? 3 : 1}
                animate={{ y: isTarget ? [0, -5, 0] : 0 }} transition={{ duration: 2, repeat: Infinity, delay: i*0.2 }} />
              <text x="45" y="45" textAnchor="middle" fontSize="26" fontWeight="900" fill={isTarget ? "#6366f1" : "hsl(var(--muted-foreground))"}>{val}</text>
              <text x="45" y="-12" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--muted-foreground))">{i}</text>
            </g>
          );
        })}
      </g>

      {/* Sliced Copy Creation */}
      <motion.g transform="translate(250, 260)" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 0.9] }} transition={{ duration: 4, repeat: Infinity, times: [0.2, 0.4, 0.8, 1] }}>
        <text x="-40" y="45" fontSize="20" fontWeight="900" fill="#10b981">slice</text>
        {[20, 30, 40].map((val, i) => (
          <g key={i} transform={`translate(${i * 110}, 0)`}>
            <rect width="90" height="70" rx="12" fill="url(#primary-grad)" stroke="#fff" strokeWidth="2" filter="url(#soft-shadow)" />
            <text x="45" y="45" textAnchor="middle" fontSize="26" fontWeight="900" fill="#fff">{val}</text>
          </g>
        ))}
      </motion.g>

      <motion.path d="M 295 190 L 295 240" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head-emerald)" strokeDasharray="6 6"
        animate={{ opacity: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0.1, 0.3, 0.4] }} />
      <motion.path d="M 515 190 L 515 240" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head-emerald)" strokeDasharray="6 6"
        animate={{ opacity: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0.1, 0.3, 0.4] }} />

      <rect x="150" y="380" width="500" height="40" rx="20" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="405" textAnchor="middle" fontSize="14" fontWeight="600" fill="hsl(var(--foreground))">
        슬라이싱은 새로운 메모리를 할당받아 데이터를 <tspan fill="#10b981" fontWeight="800">복사(Copy)</tspan>합니다.
      </text>
    </svg>
  );
}

function OutOfBounds() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        배열의 경계 이탈 에러 (Out-of-Bounds)
      </text>

      <g transform="translate(180, 150)">
        {/* Valid Array elements */}
        {[5, 12, 8].map((val, i) => (
          <g key={i} transform={`translate(${i * 120}, 0)`}>
            <rect width="100" height="80" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" filter="url(#soft-shadow)" />
            <text x="50" y="50" textAnchor="middle" fontSize="32" fontWeight="900" fill="hsl(var(--foreground))">{val}</text>
            <text x="50" y="-15" textAnchor="middle" fontSize="16" fontWeight="800" fill="hsl(var(--muted-foreground))">idx {i}</text>
          </g>
        ))}

        {/* Invalid Out of Bounds area */}
        <g transform="translate(360, 0)">
          <motion.rect width="100" height="80" rx="16" fill="url(#destructive-grad)" stroke="#fff" strokeWidth="3" filter="url(#glow)"
            animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <text x="50" y="50" textAnchor="middle" fontSize="32" fontWeight="900" fill="#fff">???</text>
          <text x="50" y="-15" textAnchor="middle" fontSize="16" fontWeight="900" fill="#f43f5e">idx 3</text>
        </g>
      </g>

      {/* Exception Alert Banner */}
      <motion.g transform="translate(150, 320)"
        initial={{ y: 20, opacity: 0 }} animate={{ y: [0, -5, 0], opacity: [0, 1, 1, 0] }} transition={{ duration: 3, repeat: Infinity, times: [0.1, 0.2, 0.8, 1] }}>
        <rect width="500" height="60" rx="16" fill="url(#destructive-grad)" filter="url(#glow)" stroke="#fff" strokeWidth="2" />
        <text x="250" y="36" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff" letterSpacing="1">
          EXCEPTION: Index Out Of Range
        </text>
      </motion.g>
    </svg>
  );
}

function ArrayTraversal() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        배열 순회와 경계 조건 (Array Traversal)
      </text>

      <g transform="translate(150, 150)" filter="url(#soft-shadow)">
        <rect width="500" height="150" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

        {/* Array Elements */}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={`elem-${i}`} transform={`translate(${50 + i * 80}, 50)`}>
            <rect width="60" height="60" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
            <text x="30" y="38" textAnchor="middle" fontSize="20" fontWeight="800" fill="hsl(var(--foreground))">{[5, 12, 8, 20, 7][i]}</text>
            <text x="30" y="80" textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))" fontWeight="600">idx {i}</text>
          </g>
        ))}

        {/* Traversal Pointer */}
        <motion.g
          animate={{ x: [80, 160, 240, 320, 400, 480], opacity: [1, 1, 1, 1, 1, 0] }}
          initial={{ x: 80, opacity: 1 }}
          transition={{ duration: 6, ease: "linear", repeat: Infinity }}
        >
          <path d="M 0 30 L 0 -10" stroke="#f43f5e" strokeWidth="4" markerEnd="url(#arrow-head)" />
          <text x="0" y="45" textAnchor="middle" fontSize="16" fontWeight="900" fill="#f43f5e">i</text>
        </motion.g>

        {/* Boundary Condition */}
        <line x1="440" y1="30" x2="440" y2="120" stroke="#facc15" strokeWidth="4" strokeDasharray="8 8" />
        <text x="440" y="20" textAnchor="middle" fontSize="14" fontWeight="800" fill="#facc15">N = 5 (경계)</text>
      </g>

      <rect x="150" y="350" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="380" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        가장 기초적인 탐색은 <tspan fill="#f43f5e" fontWeight="800">i = 0 부터 i &lt; N 까지</tspan> 하나씩 차례로 방문하는 것입니다.
      </text>
    </svg>
  );
}

export const OneDArraySupplementaryOptions = [
  ZeroBased,
  ArrayTraversal,
  Slicing,
  OutOfBounds,
];
