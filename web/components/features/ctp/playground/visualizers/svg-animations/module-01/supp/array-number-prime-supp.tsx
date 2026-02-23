"use client";

import { motion } from "framer-motion";

function SieveAnimation() {
  const numbers = Array.from({ length: 20 }, (_, i) => i + 1);
  const primes = [2, 3, 5, 7, 11, 13, 17, 19];

  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="sieve-glow-ap">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="20" y="20" width="360" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Sieve of Eratosthenes</text>

        <g transform="translate(45, 90)">
          {numbers.map((num, i) => {
            const isPrime = primes.includes(num);
            const isCrossed = num === 1 || (num > 2 && num % 2 === 0) || (num > 3 && num % 3 === 0);
            const delay = num % 2 === 0 && num > 2 ? 1 : num % 3 === 0 && num > 3 ? 2 : 0;

            return (
              <g key={num} transform={`translate(${(i % 10) * 31}, ${Math.floor(i / 10) * 31})`}>
                <rect width="28" height="28" rx="6"
                  fill={num === 1 ? "hsl(var(--muted)/0.3)" : isPrime ? "hsl(var(--primary)/0.15)" : "hsl(var(--card))"}
                  stroke={isPrime && num !== 1 ? "hsl(var(--primary)/0.5)" : "hsl(var(--border))"}
                />
                <text x="14" y="18" textAnchor="middle" fontSize="10" fontWeight="bold"
                  fill={isPrime && num !== 1 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}>
                  {num}
                </text>
                {isCrossed && (
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: num === 1 ? 0 : delay, repeat: Infinity, repeatType: "reverse", repeatDelay: 3 }}>
                    <rect x="0" y="0" width="28" height="28" rx="6" fill="hsl(var(--destructive)/0.2)" stroke="hsl(var(--destructive)/0.4)" strokeWidth="1" />
                    <path d="M 6 6 L 22 22 M 22 6 L 6 22" stroke="hsl(var(--destructive))" strokeWidth="2" />
                  </motion.g>
                )}
                {!isCrossed && isPrime && (
                  <motion.rect width="28" height="28" rx="6" fill="transparent" stroke="hsl(var(--primary))" filter="url(#sieve-glow-ap)"
                    initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, delay: 3, repeat: Infinity, repeatDelay: 1 }}
                  />
                )}
              </g>
            );
          })}
        </g>

        <rect x="40" y="185" width="320" height="65" rx="6" fill="hsl(var(--muted)/0.3)" stroke="hsl(var(--border))" strokeDasharray="4 4" />
        <text x="200" y="205" textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--destructive))">Multiples marked as composite (Discarded)</text>
        <text x="200" y="235" textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">Remaining intact nodes = Prime Numbers</text>
      </svg>
    </div>
  );
}

function BaseConversion() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="base-glow-ap">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow-base-ap" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--emerald-500, #10b981))" />
          </marker>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Base-2 Conversion (13)</text>

        <g transform="translate(60, 90)">
          <rect x="0" y="0" width="120" height="140" rx="8" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" />
          {[
            { div: "13 / 2 = 6", r: "R:1", rColor: "hsl(var(--emerald-500, #10b981))", y: 30 },
            { div: "6 / 2 = 3", r: "R:0", rColor: "hsl(var(--muted-foreground))", y: 60 },
            { div: "3 / 2 = 1", r: "R:1", rColor: "hsl(var(--emerald-500, #10b981))", y: 90 },
            { div: "1 / 2 = 0", r: "R:1", rColor: "hsl(var(--emerald-500, #10b981))", y: 120 },
          ].map(({ div, r, rColor, y }) => (
            <g key={y}>
              <text x="55" y={y} textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--muted-foreground))">{div}</text>
              <text x="105" y={y} fontSize="9" fontWeight="bold" fill={rColor}>{r}</text>
            </g>
          ))}
          <motion.rect x="95" y="18" width="20" height="16" rx="2" fill="none" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="1" filter="url(#base-glow-ap)"
            animate={{ y: [18, 48, 78, 108, 18] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </g>

        <path d="M 190 160 C 230 160, 230 140, 250 140" fill="none" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-base-ap)" />

        <g transform="translate(260, 110)">
          <rect x="0" y="0" width="100" height="60" rx="8" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981)/0.5)" />
          <text x="50" y="-10" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Binary Buffer (LSB→MSB)</text>
          <motion.text x="50" y="38" textAnchor="middle" fontSize="22" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))" filter="url(#base-glow-ap)"
            animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 2, repeat: Infinity }}
          >1101</motion.text>
        </g>
      </svg>
    </div>
  );
}

function CachingMemoization() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="cache-glow-ap">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow-cache1-ap" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
          </marker>
          <marker id="arrow-cache2-ap" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="45" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--foreground))">Memoization &amp; Caching</text>

        <g transform="translate(60, 120)">
          <rect x="0" y="0" width="80" height="60" rx="8" fill="hsl(var(--muted)/0.5)" stroke="hsl(var(--border))" />
          <text x="40" y="34" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">Compute Core</text>
          <motion.rect x="25" y="45" width="30" height="4" rx="2" fill="hsl(var(--foreground))"
            animate={{ width: [0, 30], opacity: [1, 0] }} transition={{ duration: 2, repeat: Infinity }}
          />
        </g>

        <path d="M 150 150 L 220 150" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-cache1-ap)" />
        <text x="185" y="140" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--muted-foreground))">Write to Cache</text>

        <g transform="translate(240, 90)">
          <rect x="-10" y="0" width="120" height="120" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--primary)/0.5)" strokeDasharray="4 4" />
          <text x="50" y="20" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">Memo[] Buffer</text>
          <rect x="10" y="35" width="80" height="24" rx="4" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary)/0.5)" />
          <text x="50" y="51" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">f(x) = Y</text>
          <rect x="10" y="65" width="80" height="24" rx="4" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary)/0.5)" />
          <text x="50" y="81" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">f(z) = W</text>
        </g>

        <path d="M 60 200 L 260 200" stroke="hsl(var(--primary))" strokeWidth="3" markerEnd="url(#arrow-cache2-ap)" />
        <path d="M 260 200 L 260 180" stroke="hsl(var(--primary))" strokeWidth="3" markerEnd="url(#arrow-cache2-ap)" />
        <motion.circle cx="60" cy="200" r="4" fill="hsl(var(--primary))" filter="url(#cache-glow-ap)"
          animate={{ cx: [60, 260, 260], cy: [200, 200, 180], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
        <text x="160" y="215" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">O(1) Access! Bypass Compute</text>
      </svg>
    </div>
  );
}


function MemoizationCache() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Memoization: Cache vs Recompute</text>
        {/* Without cache */}
        <rect x="42" y="56" width="148" height="110" rx="8" fill="hsl(var(--destructive)/0.04)" stroke="hsl(var(--destructive)/0.4)" />
        <text x="116" y="74" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--destructive))">Without Cache</text>
        {["fib(4)","fib(3)","fib(2)","fib(2)","fib(1)"].map((label, i) => (
          <g key={i} transform={`translate(52, ${80 + i * 18})`}>
            <rect x="0" y="0" width="128" height="14" rx="3" fill="hsl(var(--destructive)/0.08)" />
            <text x="64" y="10" textAnchor="middle" fontSize="8" fill="hsl(var(--destructive))">{label} — recalculate</text>
          </g>
        ))}
        {/* With cache */}
        <rect x="210" y="56" width="148" height="110" rx="8" fill="hsl(var(--emerald-500,#10b981)/0.05)" stroke="hsl(var(--emerald-500,#10b981)/0.4)" />
        <text x="284" y="74" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--emerald-500,#10b981))">With Cache (Memo)</text>
        {[["fib(4)","compute"],["fib(3)","compute"],["fib(2)","compute"],["fib(2)","cache ✓"],["fib(1)","cache ✓"]].map(([label, tag], i) => (
          <g key={i} transform={`translate(220, ${80 + i * 18})`}>
            <rect x="0" y="0" width="128" height="14" rx="3" fill={tag === "cache ✓" ? "hsl(var(--emerald-500,#10b981)/0.15)" : "hsl(var(--card))"} />
            <text x="64" y="10" textAnchor="middle" fontSize="8" fill={tag === "cache ✓" ? "hsl(var(--emerald-500,#10b981))" : "hsl(var(--muted-foreground))"}>{label} — {tag}</text>
          </g>
        ))}
        <text x="116" y="188" textAnchor="middle" fontSize="9" fill="hsl(var(--destructive))">중복 호출 多</text>
        <text x="284" y="188" textAnchor="middle" fontSize="9" fill="hsl(var(--emerald-500,#10b981))">중복 제거 → 속도 향상</text>
        <text x="200" y="235" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">메모이제이션: 결과를 배열/딕셔너리에 저장해 재활용</text>
      </svg>
    </div>
  );
}

export const ArrayPrimeSupplementaryOptions = [
  SieveAnimation,
  BaseConversion,
  CachingMemoization,
  MemoizationCache,
];
