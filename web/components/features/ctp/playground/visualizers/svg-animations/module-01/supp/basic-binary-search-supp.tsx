"use client";

import { motion } from "framer-motion";

function LogarithmicReduction() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="log-glow-bs">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="discard-grad-bs" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--destructive)/0.2)" />
            <stop offset="100%" stopColor="hsl(var(--destructive)/0.05)" />
          </linearGradient>
        </defs>

        <rect x="20" y="20" width="360" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Logarithmic Reduction O(log N)</text>

        <g transform="translate(40, 90)">
          <rect x="0" y="0" width="320" height="24" fill="hsl(var(--card))" rx="4" stroke="hsl(var(--border))" />
          <text x="160" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--muted-foreground))">Original Search Space (N items)</text>
        </g>

        <g transform="translate(40, 130)">
          <rect x="0" y="0" width="160" height="24" fill="url(#discard-grad-bs)" rx="4" stroke="hsl(var(--destructive)/0.3)" />
          <text x="80" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--destructive)/0.5)">Discarded N/2</text>
          <motion.rect x="160" y="0" width="160" height="24" fill="hsl(var(--primary)/0.2)" rx="4" stroke="hsl(var(--primary)/0.5)"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
          />
          <motion.text x="240" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>Remaining N/2</motion.text>
        </g>

        <g transform="translate(40, 170)">
          <rect x="160" y="0" width="80" height="24" fill="url(#discard-grad-bs)" rx="4" stroke="hsl(var(--destructive)/0.3)" />
          <text x="220" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--destructive)/0.5)">Discard</text>
          <motion.rect x="240" y="0" width="80" height="24" fill="hsl(var(--primary)/0.4)" rx="4" stroke="hsl(var(--primary))"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 1.5 }}
          />
          <motion.text x="280" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.5 }}>N/4</motion.text>
        </g>

        <g transform="translate(40, 210)">
          <motion.rect x="280" y="0" width="40" height="24" fill="hsl(var(--emerald-500, #10b981)/0.3)" rx="4" stroke="hsl(var(--emerald-500, #10b981))" filter="url(#log-glow-bs)"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 2.5 }}
          />
          <motion.text x="300" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 2.5 }}>HIT</motion.text>
        </g>

        <text x="200" y="270" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--muted-foreground))">
          Efficiency: Max steps = log2(N)
        </text>
      </svg>
    </div>
  );
}

function PointerCrossing() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="pointer-glow-bs">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Search Area: L &amp; R Pointers</text>

        <g transform="translate(45, 120)">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={i * 45} y="0" width="40" height="40" fill="hsl(var(--card))" rx="6" stroke="hsl(var(--border))" />
          ))}

          <motion.rect x={5 * 45} y="0" width="40" height="40" fill="hsl(var(--emerald-500, #10b981)/0.2)" rx="6" stroke="hsl(var(--emerald-500, #10b981))"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          />

          {/* Left pointer */}
          <motion.g animate={{ x: [0, 180, 225], opacity: [1, 1, 1] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.5, 1], ease: "easeInOut", repeatDelay: 1 }}>
            <path d="M 20 55 L 10 70 L 30 70 Z" fill="hsl(var(--orange-400, #fb923c))" filter="url(#pointer-glow-bs)" />
            <rect x="5" y="75" width="30" height="18" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--orange-400, #fb923c)/0.5)" />
            <text x="20" y="88" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--orange-400, #fb923c))">L</text>
          </motion.g>

          {/* Right pointer */}
          <motion.g animate={{ x: [270, 270, 225], opacity: [1, 1, 1] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.5, 1], ease: "easeInOut", repeatDelay: 1 }}>
            <path d="M 20 55 L 10 70 L 30 70 Z" fill="hsl(var(--purple-400, #c084fc))" filter="url(#pointer-glow-bs)" />
            <rect x="5" y="75" width="30" height="18" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--purple-400, #c084fc)/0.5)" />
            <text x="20" y="88" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--purple-400, #c084fc))">R</text>
          </motion.g>

          {/* Mid pointer */}
          <motion.g animate={{ x: [135, 225, 225], opacity: [1, 1, 1] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.5, 1], ease: "easeInOut", repeatDelay: 1 }}>
            <rect x="0" y="-20" width="40" height="14" fill="hsl(var(--primary))" rx="2" />
            <text x="20" y="-10" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">MID</text>
            <rect x="0" y="0" width="40" height="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" rx="6" filter="url(#pointer-glow-bs)" />
            <path d="M 20 -6 L 20 0" stroke="hsl(var(--primary))" strokeWidth="2" />
          </motion.g>
        </g>

        <text x="200" y="250" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--muted-foreground))">
          L &gt; R implies target not found
        </text>
      </svg>
    </div>
  );
}

function Tradeoff() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="tradeoff-glow-bs">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow-tradeoff-bs" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--foreground))" />
          </marker>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--foreground))">The Sorting Prerequisite</text>

        <g transform="translate(40, 100)">
          <rect x="0" y="0" width="120" height="80" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--destructive)/0.5)" strokeWidth="2" />
          <path d="M 0 24 L 120 24" stroke="hsl(var(--destructive)/0.3)" strokeWidth="1" />
          <text x="60" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--destructive))">High Cost Setup</text>
          <text x="60" y="50" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Sorting</text>
          <text x="60" y="70" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--destructive))">O(N log N)</text>
        </g>

        <g transform="translate(240, 100)">
          <rect x="0" y="0" width="120" height="80" rx="12" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary))" strokeWidth="2" filter="url(#tradeoff-glow-bs)" />
          <path d="M 0 24 L 120 24" stroke="hsl(var(--primary)/0.3)" strokeWidth="1" />
          <text x="60" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">Low Cost Retrieval</text>
          <text x="60" y="50" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--primary))">Binary Srch</text>
          <text x="60" y="70" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">O(log N)</text>
        </g>

        <path d="M 170 140 L 230 140" stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrow-tradeoff-bs)" strokeDasharray="4 4" />

        <rect x="80" y="215" width="240" height="50" rx="6" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive)/0.5)" />
        <text x="200" y="233" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--destructive))">Not recommended if data changes frequently</text>
        <text x="200" y="250" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--destructive))">Mutations require re-sorting O(N log N)</text>
      </svg>
    </div>
  );
}


function SortedPrerequisite() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Binary Search Prerequisites</text>
        {/* Sorted requirement */}
        <rect x="42" y="56" width="316" height="50" rx="8" fill="hsl(var(--primary)/0.05)" stroke="hsl(var(--primary)/0.3)" />
        <text x="200" y="76" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">필수 조건: 정렬된 배열</text>
        <text x="200" y="96" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">[ 1, 3, 5, 7, 11, 13, 17, 19, 23 ]  ← O(N log N) 정렬 비용 지불</text>
        {/* Pros */}
        <rect x="42" y="118" width="148" height="80" rx="8" fill="hsl(var(--emerald-500,#10b981)/0.05)" stroke="hsl(var(--emerald-500,#10b981)/0.3)" />
        <text x="116" y="136" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500,#10b981))">장점</text>
        <text x="116" y="154" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">탐색: O(log N)</text>
        <text x="116" y="170" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">10억 개 → 30번</text>
        <text x="116" y="186" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">반복 검색 유리</text>
        {/* Cons */}
        <rect x="210" y="118" width="148" height="80" rx="8" fill="hsl(var(--destructive)/0.05)" stroke="hsl(var(--destructive)/0.3)" />
        <text x="284" y="136" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--destructive))">단점</text>
        <text x="284" y="154" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">정렬 선행 필요</text>
        <text x="284" y="170" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">삽입/삭제 빈번 시</text>
        <text x="284" y="186" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">재정렬 비용 발생</text>
        {/* conclusion */}
        <rect x="60" y="216" width="280" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="233" textAnchor="middle" fontSize="9" fill="hsl(var(--primary))">한 번 정렬 후 N회 검색 → 이진 탐색이 압도적 효율</text>
        <text x="200" y="245" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">삽입/삭제가 잦으면 BST나 정렬 배열 유지가 현실적</text>
      </svg>
    </div>
  );
}

export const BinarySearchSupplementaryOptions = [
  LogarithmicReduction,
  PointerCrossing,
  Tradeoff,
  SortedPrerequisite,
];

