"use client";

import { motion } from "framer-motion";

function SequentialSearch() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="scan-glow-ls">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="scan-grad-ls" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary)/0.4)" />
            <stop offset="100%" stopColor="hsl(var(--primary)/0.0)" />
          </linearGradient>
        </defs>

        <rect x="20" y="20" width="360" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Sequential Scan O(N)</text>

        <g transform="translate(150, 80)">
          <rect x="0" y="0" width="100" height="24" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--primary))" />
          <text x="50" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">Target = 9</text>
        </g>

        <g transform="translate(50, 140)">
          <rect x="-10" y="-10" width="320" height="60" rx="8" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" strokeDasharray="4 4" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={i * 50} y="0" width="40" height="40" rx="4" fill="hsl(var(--muted)/0.3)" stroke="hsl(var(--border))" strokeWidth="2" />
          ))}
          {['5', '2', '8', '1', '9', '3'].map((v, i) => (
            <text key={i} x={i * 50 + 20} y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">{v}</text>
          ))}

          <motion.g
            animate={{ x: [0, 50, 100, 150, 200] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", times: [0, 0.25, 0.5, 0.75, 1] }}
          >
            <rect x="-2" y="-2" width="44" height="44" rx="6" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" strokeWidth="3" filter="url(#scan-glow-ls)" />
            <rect x="19" y="-40" width="2" height="40" fill="hsl(var(--primary))" />
            <rect x="0" y="42" width="40" height="30" fill="url(#scan-grad-ls)" />
          </motion.g>

          <motion.g transform="translate(200, 0)"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0, 0, 0, 1, 1], scale: [0.8, 0.8, 0.8, 0.8, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", times: [0, 0.25, 0.5, 0.75, 0.8, 1] }}
          >
            <rect x="-4" y="-4" width="48" height="48" rx="8" fill="hsl(var(--emerald-500, #10b981)/0.3)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="3" filter="url(#scan-glow-ls)" />
            <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">9</text>
          </motion.g>
        </g>

        <text x="200" y="250" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="hsl(var(--muted-foreground))">
          Time complexity scales linearly with array size.
        </text>
      </svg>
    </div>
  );
}

function SentinelOptimization() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <marker id="arrow-fast-ls" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--orange-500, #f97316))" />
          </marker>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--orange-500, #f97316))">Sentinel Optimization</text>

        <g transform="translate(60, 120)">
          {['5', '2', '8', '1', '3'].map((v, i) => (
            <g key={i} transform={`translate(${i * 45}, 0)`}>
              <rect x="0" y="0" width="35" height="40" rx="4" fill="hsl(var(--muted)/0.3)" stroke="hsl(var(--border))" />
              <text x="17.5" y="25" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--muted-foreground))">{v}</text>
            </g>
          ))}
          <g transform="translate(225, 0)">
            <rect x="0" y="0" width="35" height="40" rx="4" fill="hsl(var(--destructive)/0.2)" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="4 4" />
            <text x="17.5" y="25" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--destructive))">9</text>
            <text x="17.5" y="-10" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--destructive))">Sentinel</text>
          </g>

          <motion.rect x="-10" y="50" width="20" height="4" fill="hsl(var(--orange-500, #f97316))" rx="2"
            initial={{ x: -10 }} animate={{ x: 230 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <motion.path d="M 0 52 L 230 52" stroke="hsl(var(--orange-500, #f97316)/0.3)" strokeWidth="4" strokeDasharray="4 4"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <text x="110" y="75" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--orange-500, #f97316))">Skip bounds check</text>
        </g>

        <text x="200" y="240" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="hsl(var(--muted-foreground))">
          Appending target removes i &lt; N check — faster loop.
        </text>
      </svg>
    </div>
  );
}

function WhenToUse() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="choose-glow-ls">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow-cond-ls" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
          </marker>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--foreground))">Algorithm Selection</text>

        <g transform="translate(60, 100)">
          <rect x="0" y="0" width="100" height="100" rx="16" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" filter="url(#choose-glow-ls)" />
          <text x="50" y="35" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Linear Scan</text>
          <text x="50" y="55" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">O(N)</text>
          <text x="50" y="75" textAnchor="middle" fontSize="8" fill="hsl(var(--emerald-500, #10b981)/0.7)">Small N / Unsorted</text>
        </g>

        <path d="M 170 150 L 230 150" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-cond-ls)" />
        <text x="200" y="140" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">N &gt; 1000?</text>

        <g transform="translate(240, 100)">
          <rect x="0" y="0" width="100" height="100" rx="16" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive))" strokeWidth="2" />
          <text x="50" y="35" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--destructive))">Binary Search</text>
          <text x="50" y="55" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--destructive))">O(log N)</text>
          <text x="50" y="75" textAnchor="middle" fontSize="8" fill="hsl(var(--destructive)/0.7)">Large N / Sorted</text>
        </g>

        <text x="200" y="245" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="hsl(var(--muted-foreground))">
          Sorting overhead makes linear faster for small datasets.
        </text>
      </svg>
    </div>
  );
}


function LinearVsBinary() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Linear vs Binary Search</text>
        {/* Headers */}
        <text x="115" y="62" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">Linear O(N)</text>
        <text x="285" y="62" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500,#10b981))">Binary O(log N)</text>
        {/* N=16 comparison rows */}
        {[{ n: 16, linear: 16, binary: 4 }, { n: 1000, linear: 1000, binary: 10 }, { n: 1000000, linear: "1,000,000", binary: 20 }].map(({ n, linear, binary }, i) => (
          <g key={n} transform={`translate(0, ${72 + i * 52})`}>
            <text x="200" y="18" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">N = {n.toLocaleString()}</text>
            <rect x="42" y="24" width="148" height="22" rx="4" fill="hsl(var(--destructive)/0.08)" stroke="hsl(var(--destructive)/0.3)" />
            <text x="116" y="39" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="hsl(var(--destructive))">{linear} 번 비교</text>
            <rect x="210" y="24" width="148" height="22" rx="4" fill="hsl(var(--emerald-500,#10b981)/0.1)" stroke="hsl(var(--emerald-500,#10b981)/0.4)" />
            <text x="284" y="39" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="hsl(var(--emerald-500,#10b981))">{binary} 번 비교</text>
          </g>
        ))}
        <text x="200" y="255" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">💡 선형 탐색이 유리한 상황: 소규모 비정렬 데이터</text>
        <text x="200" y="272" textAnchor="middle" fontSize="9" fill="hsl(var(--primary))">정렬 비용 &gt; 검색 이득이면 선형이 현실적</text>
      </svg>
    </div>
  );
}

export const LinearSearchSupplementaryOptions = [
  SequentialSearch,
  SentinelOptimization,
  WhenToUse,
  LinearVsBinary,
];

