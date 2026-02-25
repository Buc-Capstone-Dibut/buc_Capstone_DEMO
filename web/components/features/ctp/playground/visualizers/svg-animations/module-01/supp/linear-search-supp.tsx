"use client";

import { motion } from "framer-motion";

function SequentialSearchUnderstanding() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">O(N) Sequential Search</text>

      <g transform="translate(100, 100)">
        <text x="200" y="-15" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--primary))">Target: 42</text>

        {/* Array */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const vals = [17, 8, 93, 25, 42, 6, 51];
          const isTarget = vals[i] === 42;
          return (
            <g key={i} transform={`translate(${i * 60}, 10)`}>
              <rect width="50" height="50" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
              <text x="25" y="30" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">{vals[i]}</text>
              <text x="25" y="65" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">[{i}]</text>

              {isTarget ? (
                <motion.g animate={{ opacity: [0, 1, 0, 0, 0, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.1, 0.4, 0.6, 0.8, 1], delay: (i * 0.8) }}>
                  <circle cx="25" cy="25" r="30" fill="none" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="3" />
                  <text x="25" y="-10" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Found!</text>
                </motion.g>
              ) : (
                <motion.g animate={{ opacity: [0, 1, 0, 0, 0, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.1, 0.3, 0.4, 0.6, 1], delay: (i * 0.8) }}>
                  <line x1="10" y1="10" x2="40" y2="40" stroke="hsl(var(--destructive))" strokeWidth="3" />
                  <line x1="40" y1="10" x2="10" y2="40" stroke="hsl(var(--destructive))" strokeWidth="3" />
                </motion.g>
              )}
            </g>
          );
        })}

        {/* Pointer */}
        <motion.path d="M 25 100 L 25 80" stroke="hsl(var(--primary))" strokeWidth="3" markerEnd="url(#arrow)"
          animate={{ x: [0, 60, 120, 180, 240, 240, 240] }}
          transition={{ duration: 6, repeat: Infinity, times: [0, 0.13, 0.26, 0.39, 0.52, 0.8, 1], ease: "linear" }}
        />
      </g>

      <rect x="50" y="240" width="500" height="36" rx="18" fill="hsl(var(--muted)/0.3)" />
      <text x="300" y="263" textAnchor="middle" fontSize="13" fontWeight="500" fill="hsl(var(--foreground))">
        Checks every element until the target is found. Worst case: <tspan fill="hsl(var(--destructive))" fontWeight="bold">N comparisons</tspan>.
      </text>
    </svg>
  );
}

function SentinelOptimization() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">Sentinel Method (보초법)</text>

      <g transform="translate(40, 60)">
        <text x="260" y="-10" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">Normal Search (2 Checks per loop)</text>
        <rect x="0" y="0" width="520" height="50" rx="8" fill="hsl(var(--destructive)/0.05)" stroke="hsl(var(--destructive))" strokeWidth="1" />
        <text x="50" y="30" fontSize="12" fontFamily="monospace" fill="hsl(var(--foreground))">
          <tspan fill="hsl(var(--primary))">while</tspan> (i &lt; N <tspan fill="hsl(var(--destructive))" fontWeight="bold">/* Check 1 */</tspan>) {'{'}
          <tspan fill="hsl(var(--primary))"> if</tspan> (arr[i] == target <tspan fill="hsl(var(--destructive))" fontWeight="bold">/* Check 2 */</tspan>) break;
          i++; {'}'}
        </text>
      </g>

      <g transform="translate(40, 130)">
        <text x="260" y="-10" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Sentinel Search (1 Check per loop)</text>
        <rect x="0" y="0" width="520" height="90" rx="8" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />

        <text x="20" y="25" fontSize="12" fontFamily="monospace" fill="hsl(var(--foreground))">
          arr[N] = target; <tspan fill="hsl(var(--muted-foreground))"> // Add fake sentinel at the very end</tspan>
        </text>
        <text x="20" y="45" fontSize="12" fontFamily="monospace" fill="hsl(var(--foreground))">
          <tspan fill="hsl(var(--primary))">while</tspan> (arr[i] != target <tspan fill="hsl(var(--emerald-500, #10b981))" fontWeight="bold">/* Check 1 (Only!) */</tspan>) {'{'} i++; {'}'}
        </text>
        <text x="20" y="65" fontSize="12" fontFamily="monospace" fill="hsl(var(--foreground))">
          <tspan fill="hsl(var(--primary))">return</tspan> i == N ? -1 : i; <tspan fill="hsl(var(--muted-foreground))"> // Did we find the fake or real one?</tspan>
        </text>

        {/* Small array viz */}
        <g transform="translate(360, 40)">
          <rect x="0" y="0" width="20" height="20" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
          <rect x="20" y="0" width="20" height="20" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
          <rect x="40" y="0" width="30" height="20" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeDasharray="2 2" />
          <rect x="70" y="0" width="30" height="20" fill="hsl(var(--emerald-500, #10b981)/0.2)" stroke="hsl(var(--emerald-500, #10b981))" />
          <text x="85" y="14" textAnchor="middle" fontSize="10" fill="hsl(var(--emerald-500, #10b981))">Sent</text>
        </g>
      </g>

      <rect x="50" y="240" width="500" height="36" rx="18" fill="hsl(var(--muted)/0.3)" />
      <text x="300" y="263" textAnchor="middle" fontSize="13" fontWeight="500" fill="hsl(var(--foreground))">
        Reduces loop overhead by 50% by guaranteeing a match eventually.
      </text>
    </svg>
  );
}

function UsageContext() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">When to use Linear Search?</text>

      <g transform="translate(100, 100)">
        {/* Scenario 1: Unsorted */}
        <rect x="0" y="0" width="180" height="120" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
        <circle cx="90" cy="30" r="16" fill="hsl(var(--primary)/0.2)" />
        <text x="90" y="35" textAnchor="middle" fontSize="14" fill="hsl(var(--primary))">🌪️</text>
        <text x="90" y="65" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Unsorted Data</text>
        <text x="90" y="85" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">Sorting costs O(N log N)</text>
        <text x="90" y="100" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">Search is only O(N)</text>

        {/* Scenario 2: Small Data */}
        <rect x="220" y="0" width="180" height="120" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />
        <circle cx="310" cy="30" r="16" fill="hsl(var(--emerald-500, #10b981)/0.2)" />
        <text x="310" y="35" textAnchor="middle" fontSize="14" fill="hsl(var(--emerald-500, #10b981))">🤏</text>
        <text x="310" y="65" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Tiny Arrays (N &lt; 50)</text>
        <text x="310" y="85" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">Too small for complex logic</text>
        <text x="310" y="100" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">Simplicity &gt; Asymptotics</text>
      </g>
    </svg>
  );
}

function PerformanceComparison() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">Linear vs Binary Search Comparisons</text>

      <g transform="translate(100, 70)">
        {/* Header */}
        <rect x="0" y="0" width="100" height="30" fill="hsl(var(--muted)/0.5)" rx="4" />
        <text x="50" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">Data Size (N)</text>

        <rect x="110" y="0" width="140" height="30" fill="hsl(var(--destructive)/0.1)" rx="4" />
        <text x="180" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--destructive))">Linear Search O(N)</text>

        <rect x="260" y="0" width="140" height="30" fill="hsl(var(--emerald-500, #10b981)/0.1)" rx="4" />
        <text x="330" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Binary Search O(log N)</text>

        {/* Row 1 */}
        <text x="50" y="60" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">16</text>
        <rect x="110" y="45" width="20" height="20" fill="hsl(var(--destructive)/0.3)" rx="4" />
        <text x="140" y="60" fontSize="12" fill="hsl(var(--destructive))">Max 16 checks</text>

        <rect x="260" y="45" width="5" height="20" fill="hsl(var(--emerald-500, #10b981)/0.3)" rx="2" />
        <text x="275" y="60" fontSize="12" fill="hsl(var(--emerald-500, #10b981))">Max 4 checks</text>

        {/* Row 2 */}
        <text x="50" y="100" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">1,024</text>
        <rect x="110" y="85" width="80" height="20" fill="hsl(var(--destructive)/0.5)" rx="4" />
        <text x="200" y="100" fontSize="12" fill="hsl(var(--destructive))">Max 1k checks</text>

        <rect x="260" y="85" width="15" height="20" fill="hsl(var(--emerald-500, #10b981)/0.5)" rx="2" />
        <text x="285" y="100" fontSize="12" fill="hsl(var(--emerald-500, #10b981))">Max 10 checks</text>

        {/* Row 3 */}
        <text x="50" y="140" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">1,000,000</text>
        <rect x="110" y="125" width="140" height="20" fill="hsl(var(--destructive))" rx="4" />
        <text x="260" y="140" fontSize="12" fontWeight="bold" fill="hsl(var(--destructive))">Max 1M checks!</text>

        <rect x="260" y="125" width="30" height="20" fill="hsl(var(--emerald-500, #10b981))" rx="2" />
        <text x="300" y="140" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Max 20 checks!</text>
      </g>
    </svg>
  );
}

export const LinearSearchSupplementaryOptions = [
  SequentialSearchUnderstanding,
  SentinelOptimization,
  UsageContext,
  PerformanceComparison,
];
