"use client";

import { motion } from "framer-motion";

function InputOutput() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="algo-glow-ao">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow-algo-ao" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        <g opacity="0.1">
          <path d="M 0 50 L 400 50 M 0 100 L 400 100 M 0 150 L 400 150 M 0 200 L 400 200 M 0 250 L 400 250" stroke="hsl(var(--foreground))" strokeWidth="1" />
          <path d="M 50 0 L 50 300 M 100 0 L 100 300 M 150 0 L 150 300 M 200 0 L 200 300 M 250 0 L 250 300 M 300 0 L 300 300 M 350 0 L 350 300" stroke="hsl(var(--foreground))" strokeWidth="1" />
        </g>

        <g transform="translate(30, 110)">
          <rect x="0" y="0" width="80" height="80" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
          <text x="40" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--muted-foreground))">Input</text>
          <text x="40" y="32" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground)/0.5)">Unsorted Data</text>
          <g transform="translate(15, 45)">
            <rect x="0" y="0" width="14" height="20" rx="2" fill="hsl(var(--muted))" />
            <rect x="18" y="0" width="14" height="20" rx="2" fill="hsl(var(--muted))" />
            <rect x="36" y="0" width="14" height="20" rx="2" fill="hsl(var(--muted))" />
            <text x="7" y="14" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--foreground))">4</text>
            <text x="25" y="14" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--foreground))">1</text>
            <text x="43" y="14" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--foreground))">3</text>
          </g>
        </g>

        <g transform="translate(200, 150)">
          <text x="0" y="65" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Algo Engine</text>
          <motion.g animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
            <circle cx="0" cy="0" r="40" fill="hsl(var(--primary)/0.05)" stroke="hsl(var(--primary)/0.3)" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="0" cy="0" r="30" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="10 5" filter="url(#algo-glow-ao)" />
            <circle cx="0" cy="0" r="15" fill="hsl(var(--primary))" />
            <rect x="-4" y="-35" width="8" height="10" rx="2" fill="hsl(var(--primary))" />
            <rect x="-4" y="25" width="8" height="10" rx="2" fill="hsl(var(--primary))" />
            <rect x="-35" y="-4" width="10" height="8" rx="2" fill="hsl(var(--primary))" />
            <rect x="25" y="-4" width="10" height="8" rx="2" fill="hsl(var(--primary))" />
          </motion.g>
        </g>

        <g transform="translate(290, 110)">
          <motion.rect x="0" y="0" width="80" height="80" rx="8" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981)/0.5)" filter="url(#algo-glow-ao)"
            animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
          />
          <text x="40" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Output</text>
          <text x="40" y="32" textAnchor="middle" fontSize="8" fill="hsl(var(--emerald-500, #10b981)/0.5)">Sorted Result</text>
          <g transform="translate(15, 45)">
            <rect x="0" y="0" width="14" height="20" rx="2" fill="hsl(var(--emerald-500, #10b981)/0.2)" stroke="hsl(var(--emerald-500, #10b981)/0.5)" />
            <rect x="18" y="0" width="14" height="20" rx="2" fill="hsl(var(--emerald-500, #10b981)/0.2)" stroke="hsl(var(--emerald-500, #10b981)/0.5)" />
            <rect x="36" y="0" width="14" height="20" rx="2" fill="hsl(var(--emerald-500, #10b981)/0.2)" stroke="hsl(var(--emerald-500, #10b981)/0.5)" />
            <text x="7" y="14" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">1</text>
            <text x="25" y="14" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">3</text>
            <text x="43" y="14" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">4</text>
          </g>
        </g>

        <motion.path d="M 120 150 L 150 150" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow-algo-ao)"
          animate={{ strokeDashoffset: [0, -30] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.path d="M 250 150 L 280 150" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" markerEnd="url(#arrow-algo-ao)"
          animate={{ strokeDashoffset: [0, -30] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.75 }}
        />
      </svg>
    </div>
  );
}

function Deterministic() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="det-glow-ao">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow-det-ao" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Deterministic Property</text>

        {[{ y: 90, label: "Execution T1", delay: 0 }, { y: 170, label: "Execution T2", delay: 0.75 }].map(({ y, label, delay }) => (
          <g key={label} transform={`translate(60, ${y})`}>
            <rect x="0" y="0" width="280" height="60" rx="8" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" />
            <text x="20" y="20" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">{label}</text>
            <rect x="20" y="30" width="60" height="20" rx="4" fill="hsl(var(--muted)/0.5)" />
            <text x="50" y="44" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))">[ 3, 1, 2 ]</text>
            <path d="M 90 40 L 190 40" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-det-ao)" />
            <motion.circle cx="90" cy="40" r="3" fill="hsl(var(--primary))" filter="url(#det-glow-ao)"
              animate={{ cx: [90, 190], opacity: [1, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay }}
            />
            <motion.rect x="200" y="30" width="60" height="20" rx="4" fill="hsl(var(--emerald-500, #10b981)/0.2)" stroke="hsl(var(--emerald-500, #10b981))" filter="url(#det-glow-ao)"
              animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
            />
            <text x="230" y="44" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">[ 1, 2, 3 ]</text>
          </g>
        ))}

        <path d="M 350 120 L 360 120 L 360 200 L 350 200 M 360 160 L 370 160" fill="none" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />
        <text x="375" y="165" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">≡</text>
      </svg>
    </div>
  );
}

function Finiteness() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="fnt-glow-ao">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Finiteness</text>

        <g transform="translate(60, 90)">
          <rect x="0" y="0" width="280" height="60" rx="8" fill="hsl(var(--destructive)/0.05)" stroke="hsl(var(--destructive)/0.5)" />
          <text x="20" y="20" fontSize="9" fontWeight="bold" fill="hsl(var(--destructive))">Infinite Loop — Violates Algorithm Definition</text>
          <rect x="180" y="20" width="80" height="20" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
          <text x="220" y="34" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))">while(true)</text>
          <motion.path d="M 170 30 C 150 10, 120 10, 100 30 C 80 50, 100 50, 170 30" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2"
            animate={{ strokeDasharray: ["0 150", "150 0"], strokeDashoffset: [0, -150] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </g>

        <g transform="translate(60, 170)">
          <rect x="0" y="0" width="280" height="80" rx="8" fill="hsl(var(--emerald-500, #10b981)/0.05)" stroke="hsl(var(--emerald-500, #10b981)/0.5)" />
          <text x="20" y="20" fontSize="9" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Terminating Process — Valid Algorithm</text>
          <rect x="20" y="50" width="200" height="10" rx="5" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
          <motion.rect x="20" y="50" height="10" rx="5" fill="hsl(var(--emerald-500, #10b981))" filter="url(#fnt-glow-ao)"
            initial={{ width: 0 }} animate={{ width: 200 }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
          />
          <motion.rect x="230" y="45" width="40" height="20" rx="4" fill="hsl(var(--primary))" filter="url(#fnt-glow-ao)"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 1, times: [0, 0.9, 0.95, 1] }}
          />
          <motion.text x="250" y="59" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 1, times: [0, 0.9, 0.95, 1] }}
          >HALT</motion.text>
        </g>
      </svg>
    </div>
  );
}


function Efficiency() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="eff-glow-ao">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="40" y="10" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="34" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Big-O Complexity</text>
        {/* Axes */}
        <line x1="60" y1="220" x2="360" y2="220" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <line x1="60" y1="70" x2="60" y2="220" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <text x="210" y="248" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">Input Size (N)</text>
        <text x="25" y="145" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" transform="rotate(-90,25,145)">Operations</text>
        {/* O(1) line */}
        <line x1="60" y1="216" x2="355" y2="212" stroke="hsl(var(--emerald-500,#10b981))" strokeWidth="2" strokeDasharray="4 3" />
        <text x="358" y="215" fontSize="8" fill="hsl(var(--emerald-500,#10b981))" fontWeight="bold">O(1)</text>
        {/* O(N) line */}
        <line x1="60" y1="215" x2="355" y2="115" stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="358" y="118" fontSize="8" fill="hsl(var(--primary))" fontWeight="bold">O(N)</text>
        {/* O(N²) curve */}
        <path d="M 60 218 Q 180 200, 280 130 Q 340 90, 355 72" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" />
        <text x="349" y="70" fontSize="8" fill="hsl(var(--destructive))" fontWeight="bold">O(N²)</text>
        {/* Focus point */}
        <motion.circle cx="210" cy="165" r="5" fill="hsl(var(--primary))" filter="url(#eff-glow-ao)"
          animate={{ r: [5, 8, 5], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }} />
      </svg>
    </div>
  );
}

export const AlgoOverviewSupplementaryOptions = [
  InputOutput,
  Deterministic,
  Finiteness,
  Efficiency,
];

