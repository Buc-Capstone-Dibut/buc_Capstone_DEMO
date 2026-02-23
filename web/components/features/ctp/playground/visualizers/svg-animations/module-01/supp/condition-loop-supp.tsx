"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// Helper component for the AccumulationLoop counter text
function CounterText() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => (c >= 99 ? 0 : c + 1));
    }, 100);
    return () => clearInterval(interval);
  }, []);
  return (
    <text x="200" y="158" textAnchor="middle" fontSize="24" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">
      {count.toString().padStart(2, '0')}
    </text>
  );
}

function Branching() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="neon-glow-cl">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeOpacity="0.1" fill="none">
          {[0, 20, 40, 60, 80, 100].map((v) => (
            <path key={`h${v}`} d={`M 0 ${v * 3} L 400 ${v * 3}`} />
          ))}
          {[0, 20, 40, 60, 80, 100].map((v) => (
            <path key={`v${v}`} d={`M ${v * 4} 0 L ${v * 4} 300`} />
          ))}
        </g>

        <path d="M 200 40 L 200 120" stroke="hsl(var(--muted-foreground))" strokeWidth="4" strokeLinecap="round" />
        <path d="M 200 180 L 100 240 L 100 260" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="4" fill="none" strokeDasharray="6 6" opacity="0.6" />
        <path d="M 200 180 L 300 240 L 300 260" stroke="hsl(var(--destructive))" strokeWidth="4" fill="none" strokeDasharray="6 6" opacity="0.6" />

        <motion.g animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} transform="translate(200, 150)">
          <polygon points="0,-40 50,0 0,40 -50,0" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" filter="url(#neon-glow-cl)" />
          <text x="0" y="5" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">CONDITION?</text>
        </motion.g>

        <rect x="60" y="260" width="80" height="30" rx="8" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />
        <text x="100" y="279" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">TRUE</text>

        <rect x="260" y="260" width="80" height="30" rx="8" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive))" strokeWidth="2" />
        <text x="300" y="279" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--destructive))">FALSE</text>

        <motion.circle r="8" fill="hsl(var(--emerald-500, #10b981))" filter="url(#neon-glow-cl)"
          animate={{ cx: [200, 200, 100, 100, 200], cy: [40, 150, 210, 260, 40], opacity: [0, 1, 1, 0, 0] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.3, 0.6, 0.8, 1] }}
        />
        <motion.circle r="8" fill="hsl(var(--destructive))" filter="url(#neon-glow-cl)"
          animate={{ cx: [200, 200, 300, 300, 200], cy: [40, 150, 210, 260, 40], opacity: [0, 0, 0, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.2, 0.5, 0.8, 1], delay: 2 }}
        />
      </svg>
    </div>
  );
}

function AccumulationLoop() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="loop-glow-cl">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="core-gradient-cl" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="150" r="100" fill="url(#core-gradient-cl)" />
        <circle cx="200" cy="150" r="100" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="10 15" opacity="0.5" />
        <circle cx="200" cy="150" r="80" fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" />

        <motion.circle cx="200" cy="150" r="40" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="4" filter="url(#loop-glow-cl)" />
        <CounterText />

        {[0, 120, 240].map((angle, i) => (
          <motion.g key={i}
            animate={{ rotate: [angle, angle + 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ originX: "200px", originY: "150px" }}
          >
            <circle cx="200" cy="50" r="12" fill="hsl(var(--primary))" filter="url(#loop-glow-cl)" />
            <text x="200" y="55" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">+{i + 1}</text>
          </motion.g>
        ))}

        <path d="M 300 150 L 360 150" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="4" strokeLinecap="round" strokeDasharray="4 4" />
        <path d="M 350 140 L 365 150 L 350 160" fill="hsl(var(--emerald-500, #10b981))" />
        <text x="330" y="140" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">EXIT</text>
      </svg>
    </div>
  );
}

function LoopPattern() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="scan-glow-cl">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="40" y="120" width="320" height="60" rx="8" fill="hsl(var(--muted)/0.5)" stroke="hsl(var(--border))" strokeWidth="2" />

        {["A", "B", "C", "D", "★", "F"].map((val, i) => (
          <g key={i} transform={`translate(${50 + i * 50}, 130)`}>
            <rect width="40" height="40" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
            <text x="20" y="25" textAnchor="middle" fontSize="12" fontWeight="bold"
              fill={val === "★" ? "hsl(var(--emerald-500, #10b981))" : "hsl(var(--muted-foreground))"}>{val}</text>
          </g>
        ))}

        <motion.rect y="125" width="50" height="50" rx="6" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" filter="url(#scan-glow-cl)"
          animate={{ x: [45, 95, 145, 195, 245, 45] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        <motion.g
          animate={{ x: [0, 50, 100, 150, 200, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <path d="M 70 80 L 70 125" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" />
          <polygon points="65,115 75,115 70,125" fill="hsl(var(--primary))" filter="url(#scan-glow-cl)" />
          <rect x="35" y="55" width="70" height="25" rx="12" fill="hsl(var(--primary))" />
          <text x="70" y="72" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">i++</text>
        </motion.g>

        <motion.rect x="245" y="125" width="50" height="50" rx="6" fill="none" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="4" filter="url(#scan-glow-cl)"
          animate={{ opacity: [0, 0, 0, 0, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
        />
      </svg>
    </div>
  );
}


function NestedPattern() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Nested: Loop ∩ Condition</text>
        {/* Outer loop block */}
        <rect x="40" y="60" width="320" height="220" rx="10" fill="hsl(var(--primary)/0.04)" stroke="hsl(var(--primary)/0.3)" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x="55" y="78" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">for i in range(N):</text>
        {/* Inner condition */}
        <rect x="70" y="88" width="260" height="80" rx="8" fill="hsl(var(--card)/0.6)" stroke="hsl(var(--border))" />
        <text x="85" y="106" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">  if arr[i] % 2 == 0:</text>
        <rect x="90" y="112" width="220" height="28" rx="6" fill="hsl(var(--emerald-500,#10b981)/0.1)" stroke="hsl(var(--emerald-500,#10b981)/0.4)" />
        <text x="105" y="130" fontSize="9" fontWeight="bold" fill="hsl(var(--emerald-500,#10b981))">    evens.append(arr[i])  ✓ True</text>
        <text x="85" y="158" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">  else:  skip  ✗ False</text>
        {/* Animated pointer */}
        <motion.line x1="55" y1="185" x2="55" y2="215" stroke="hsl(var(--primary))" strokeWidth="2"
          animate={{ y1: [185, 205, 185], y2: [215, 235, 215] }} transition={{ duration: 1.5, repeat: Infinity }} />
        <motion.text x="65" y="200" fontSize="9" fill="hsl(var(--primary))"
          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>i → next iteration</motion.text>
        <text x="55" y="262" fontSize="9" fill="hsl(var(--muted-foreground))">결과: 조건 충족 요소만 필터링 완료</text>
      </svg>
    </div>
  );
}

export const ConditionLoopSupplementaryOptions = [
  Branching,
  AccumulationLoop,
  LoopPattern,
  NestedPattern,
];

