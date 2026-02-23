"use client";

import { motion } from "framer-motion";

function ZeroBased() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="zero-glow-1d">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow-down-1d" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--destructive))" />
          </marker>
        </defs>

        <g opacity="0.1">
          <path d="M 0 50 L 400 50 M 0 100 L 400 100 M 0 150 L 400 150 M 0 200 L 400 200 M 0 250 L 400 250" stroke="hsl(var(--primary))" strokeWidth="1" />
          <path d="M 50 0 L 50 300 M 100 0 L 100 300 M 150 0 L 150 300 M 200 0 L 200 300 M 250 0 L 250 300 M 300 0 L 300 300 M 350 0 L 350 300" stroke="hsl(var(--primary))" strokeWidth="1" />
        </g>

        <text x="200" y="40" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--muted-foreground))">Memory Layout</text>

        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(${50 + i * 60}, 120)`}>
            <rect width="56" height="56" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
            <text x="28" y="34" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--foreground))">VAL</text>
            <text x="28" y="-10" textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--muted-foreground))">+{i * 4}</text>
            <text x="28" y="75" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">[{i}]</text>
          </g>
        ))}

        <motion.rect x="50" y="120" width="56" height="56" rx="8" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" filter="url(#zero-glow-1d)"
          animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2, repeat: Infinity }}
        />

        <path d="M 78 240 L 78 200" stroke="hsl(var(--destructive))" strokeWidth="2" markerEnd="url(#arrow-down-1d)" />
        <rect x="30" y="245" width="96" height="24" rx="4" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive)/0.3)" />
        <text x="78" y="261" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--destructive))">BASE 0x100</text>

        <path d="M 78 90 C 138 60, 138 60, 198 90" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-down-1d)" />
        <text x="138" y="70" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">+ offset(2)</text>
      </svg>
    </div>
  );
}

function Iteration() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="iter-glow-1d">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="60" y="30" width="280" height="40" rx="8" fill="hsl(var(--muted)/0.5)" stroke="hsl(var(--border))" />
        <text x="200" y="54" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">for (let i = 0; i &lt; N; i++)</text>

        <g transform="translate(60, 120)">
          <rect width="280" height="60" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <rect x={i * 46 + 4} y="4" width="42" height="52" rx="4" fill="hsl(var(--muted)/0.5)" />
              <text x={i * 46 + 25} y="34" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">{i}</text>
            </g>
          ))}
          <motion.rect y="4" width="42" height="52" rx="4" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" strokeWidth="2" filter="url(#iter-glow-1d)"
            animate={{ x: [4, 50, 96, 142, 188, 234] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </g>

        <motion.path d="M 60 210 L 340 210" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="10 10"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        {[0, 1, 2].map(i => (
          <motion.circle key={i} cx="60" cy="210" r="4" fill="hsl(var(--primary))" filter="url(#iter-glow-1d)"
            animate={{ cx: [60, 340], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: i * 0.6 }}
          />
        ))}
        <text x="200" y="230" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--muted-foreground))">O(N) Processing Stream</text>
      </svg>
    </div>
  );
}

function Slicing() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="slice-glow-1d">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="slice-grad-1d" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--emerald-500, #10b981))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--emerald-500, #10b981))" stopOpacity="0.05" />
          </linearGradient>
          <marker id="arrow-slice-1d" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--emerald-500, #10b981))" />
          </marker>
        </defs>

        <text x="200" y="40" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--muted-foreground))">Source Array (arr)</text>

        <g transform="translate(60, 60)">
          <rect width="280" height="50" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <rect x={i * 46 + 4} y="4" width="42" height="42" rx="4"
                fill={i >= 1 && i < 4 ? "hsl(var(--emerald-500, #10b981)/0.2)" : "hsl(var(--muted)/0.5)"}
                stroke={i >= 1 && i < 4 ? "hsl(var(--emerald-500, #10b981))" : "none"}
              />
              <text x={i * 46 + 25} y="29" textAnchor="middle" fontSize="12" fontWeight="bold"
                fill={i >= 1 && i < 4 ? "hsl(var(--emerald-500, #10b981))" : "hsl(var(--muted-foreground))"}>{i}</text>
            </g>
          ))}
        </g>

        <rect x="60" y="140" width="280" height="30" rx="4" fill="url(#slice-grad-1d)" stroke="hsl(var(--emerald-500, #10b981)/0.5)" strokeDasharray="4 4" />
        <text x="200" y="159" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">arr.slice(1, 4)</text>

        <path d="M 130 115 L 130 135" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" strokeDasharray="2 2" markerEnd="url(#arrow-slice-1d)" />
        <path d="M 270 115 L 270 135" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" strokeDasharray="2 2" markerEnd="url(#arrow-slice-1d)" />
        <path d="M 200 175 L 200 195" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" markerEnd="url(#arrow-slice-1d)" />

        <motion.g transform="translate(132, 210)"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
        >
          <rect width="136" height="50" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--emerald-500, #10b981))" filter="url(#slice-glow-1d)" />
          {[1, 2, 3].map((val, idx) => (
            <g key={val}>
              <rect x={idx * 44 + 4} y="4" width="40" height="42" rx="4" fill="hsl(var(--emerald-500, #10b981)/0.2)" />
              <text x={idx * 44 + 24} y="29" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">{val}</text>
            </g>
          ))}
          <text x="68" y="70" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">New Allocation (O(N))</text>
        </motion.g>
      </svg>
    </div>
  );
}


function OutOfBounds() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Off-by-One / Out-of-Bounds</text>
        {/* Array boxes */}
        {[0,1,2,3,4].map(i => (
          <g key={i} transform={`translate(${55 + i * 56}, 70)`}>
            <rect x="0" y="0" width="48" height="48" rx="6"
              fill={i < 5 ? "hsl(var(--card))" : "hsl(var(--destructive)/0.1)"}
              stroke={i < 5 ? "hsl(var(--border))" : "hsl(var(--destructive))"}
              strokeWidth="1.5" />
            <text x="24" y="18" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">idx[{i}]</text>
            <text x="24" y="36" textAnchor="middle" fontSize="14" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))">{[7,3,9,1,5][i]}</text>
          </g>
        ))}
        {/* Invalid index pointer */}
        <motion.g animate={{ x: [-10, 0, -10] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <line x1="339" y1="55" x2="339" y2="68" stroke="hsl(var(--destructive))" strokeWidth="2" />
          <text x="339" y="50" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--destructive))">idx[5] ✗</text>
        </motion.g>
        {/* Ghost box (out of bounds) */}
        <rect x="335" y="70" width="48" height="48" rx="6" fill="hsl(var(--destructive)/0.08)" stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="359" y="100" textAnchor="middle" fontSize="10" fill="hsl(var(--destructive))">???</text>
        {/* Error label */}
        <rect x="100" y="145" width="200" height="32" rx="8" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive)/0.5)" />
        <text x="200" y="165" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--destructive))">IndexError: list index out of range</text>
        <text x="200" y="210" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">올바른 범위: 0 ≤ i ≤ N-1 (= 4)</text>
        <text x="200" y="235" textAnchor="middle" fontSize="10" fill="hsl(var(--emerald-500,#10b981))">for i in range(len(arr)):  ← 안전한 순회</text>
      </svg>
    </div>
  );
}

export const OneDArraySupplementaryOptions = [
  ZeroBased,
  Iteration,
  Slicing,
  OutOfBounds,
];
