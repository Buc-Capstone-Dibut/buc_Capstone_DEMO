"use client";

import { motion } from "framer-motion";

function LogNReduction() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">O(log N) Half Reduction</text>

      {/* Target */}
      <text x="300" y="70" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--primary))">Target: 71</text>

      <g transform="translate(60, 100)">
        {/* Step 1: Full Array */}
        <text x="0" y="15" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">Step 1</text>
        <rect x="50" y="0" width="400" height="20" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="250" y1="0" x2="250" y2="20" stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <text x="250" y="-5" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">Mid (50)</text>

        <path d="M 150 10 L 400 10" stroke="hsl(var(--primary))" strokeWidth="4" />
        <text x="330" y="35" textAnchor="middle" fontSize="11" fill="hsl(var(--primary))">Keep Right Half</text>

        {/* Toss left half */}
        <motion.rect x="50" y="0" width="200" height="20" fill="hsl(var(--destructive)/0.3)" rx="4"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.2, 0.8, 1] }}
        />

        {/* Step 2: Half Array */}
        <g transform="translate(0, 60)">
          <text x="0" y="15" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">Step 2</text>
          <rect x="250" y="0" width="200" height="20" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
          <line x1="350" y1="0" x2="350" y2="20" stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <text x="350" y="-5" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">Mid (75)</text>

          <path d="M 250 10 L 350 10" stroke="hsl(var(--primary))" strokeWidth="4" />
          <text x="300" y="35" textAnchor="middle" fontSize="11" fill="hsl(var(--primary))">Keep Left Half</text>

          {/* Toss right half */}
          <motion.rect x="350" y="0" width="100" height="20" fill="hsl(var(--destructive)/0.3)" rx="4"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.3, 0.8, 1] }}
          />
        </g>

        {/* Step 3: Quarter Array */}
        <g transform="translate(0, 120)">
           <text x="0" y="15" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">Step 3</text>
           <rect x="250" y="0" width="100" height="20" rx="4" fill="hsl(var(--emerald-500, #10b981)/0.2)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />
           <text x="300" y="14" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Found (71)</text>
        </g>
      </g>

      <rect x="50" y="250" width="500" height="36" rx="18" fill="hsl(var(--muted)/0.3)" />
      <text x="300" y="273" textAnchor="middle" fontSize="13" fontWeight="500" fill="hsl(var(--foreground))">
        Reduces search space by <tspan fill="hsl(var(--primary))" fontWeight="bold">50%</tspan> every step. 1,000,000 items ⇒ ~20 steps.
      </text>
    </svg>
  );
}

function BoundaryUpdateRules() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">Left, Mid, Right Pointer Rules</text>

      <g transform="translate(100, 110)">
        {/* Array */}
        <rect x="0" y="0" width="400" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />

        {/* Grid lines */}
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="40" stroke="hsl(var(--border))" />
        ))}

        <text x="25" y="25" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">2</text>
        <text x="75" y="25" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">5</text>
        <text x="125" y="25" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">8</text>
        <text x="175" y="25" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">12</text>
        <text x="225" y="25" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">16</text>
        <text x="275" y="25" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">23</text>
        <text x="325" y="25" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">38</text>
        <text x="375" y="25" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">56</text>

        {/* Target indication */}
        <rect x="250" y="0" width="50" height="40" fill="hsl(var(--primary)/0.2)" />
        <text x="300" y="-30" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--primary))">Target: 23</text>
        <path d="M 275 -25 L 275 -5" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* L Pointer */}
        <text x="25" y="65" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">L</text>

        {/* R Pointer */}
        <text x="375" y="65" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">R</text>

        {/* MID Pointer (Initial) */}
        <motion.g animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <text x="175" y="65" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--destructive))">M</text>
          <path d="M 175 50 L 175 42" stroke="hsl(var(--destructive))" strokeWidth="2" />
        </motion.g>

        {/* Animated L movement */}
        <motion.path d="M 25 80 L 175 80" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.text x="100" y="95" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >L = M + 1</motion.text>
      </g>

      <rect x="50" y="230" width="500" height="50" rx="8" fill="hsl(var(--muted)/0.3)" />
      <text x="300" y="250" textAnchor="middle" fontSize="12" fontFamily="monospace" fill="hsl(var(--foreground))">
        <tspan fill="hsl(var(--primary))">if</tspan> (arr[M] &lt; target) Left = Mid + 1;
      </text>
      <text x="300" y="270" textAnchor="middle" fontSize="12" fontFamily="monospace" fill="hsl(var(--foreground))">
        <tspan fill="hsl(var(--primary))">else if</tspan> (arr[M] &gt; target) Right = Mid - 1;
      </text>
    </svg>
  );
}

function SortingTradeOff() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">The Hidden Cost: Sorting</text>

      <g transform="translate(150, 80)">
        {/* Unsorted Array */}
        <rect x="0" y="0" width="300" height="40" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="4 4" />
        <text x="150" y="25" textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))">[9, 2, 7, 1, 8, 4]</text>
        <text x="-20" y="25" textAnchor="end" fontSize="12" fill="hsl(var(--destructive))">Unsorted!</text>

        <path d="M 150 45 L 150 75" stroke="hsl(var(--border))" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="160" y="65" fontSize="12" fontWeight="bold" fill="hsl(var(--primary))">O(N log N) Sort Cost</text>

        {/* Sorted Array */}
        <rect x="0" y="80" width="300" height="40" rx="4" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />
        <text x="150" y="105" textAnchor="middle" fontSize="14" fill="hsl(var(--foreground))">[1, 2, 4, 7, 8, 9]</text>

        {/* Success path */}
        <path d="M 150 120 C 150 150, 50 150, 50 180" fill="none" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="50" y="200" textAnchor="middle" fontSize="11" fill="hsl(var(--emerald-500, #10b981))">Binary Search O(log N)</text>

        {/* Failure path if modified */}
        <path d="M 250 120 C 250 150, 250 150, 250 180" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2" markerEnd="url(#arrow)" strokeDasharray="4 4" />
        <circle cx="250" cy="180" r="15" fill="hsl(var(--card))" stroke="hsl(var(--destructive))" strokeWidth="2" />
        <text x="250" y="184" textAnchor="middle" fontSize="12" fill="hsl(var(--destructive))">+3</text>
        <text x="250" y="210" textAnchor="middle" fontSize="11" fill="hsl(var(--destructive))">Insert breaks order!</text>
      </g>

      <rect x="50" y="240" width="500" height="36" rx="18" fill="hsl(var(--muted)/0.3)" />
      <text x="300" y="263" textAnchor="middle" fontSize="13" fontWeight="500" fill="hsl(var(--foreground))">
        Heavy initial cost. Frequent data changes ruin the sorted invariant.
      </text>
    </svg>
  );
}

function UsageJudgment() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">When to use Binary Search?</text>

      {/* When NOT to use */}
      <g transform="translate(80, 80)">
        <rect x="0" y="0" width="200" height="150" rx="12" fill="hsl(var(--destructive)/0.05)" stroke="hsl(var(--destructive))" strokeWidth="2" />
        <circle cx="100" cy="30" r="16" fill="hsl(var(--destructive))" />
        <path d="M 94 24 L 106 36 M 106 24 L 94 36" stroke="white" strokeWidth="3" fill="none" />
        <text x="100" y="70" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Don't Use If:</text>

        <text x="20" y="100" fontSize="12" fill="hsl(var(--muted-foreground))">• Data is rarely searched</text>
        <text x="20" y="120" fontSize="12" fill="hsl(var(--muted-foreground))">• Frequent Insert/Delete</text>
        <text x="20" y="140" fontSize="12" fill="hsl(var(--muted-foreground))">• Data is tiny (N &lt; 50)</text>
      </g>

      {/* When TO use */}
      <g transform="translate(320, 80)">
        <rect x="0" y="0" width="200" height="150" rx="12" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />
        <circle cx="100" cy="30" r="16" fill="hsl(var(--emerald-500, #10b981))" />
        <path d="M 93 30 L 98 35 L 108 23" fill="none" stroke="white" strokeWidth="3" />
        <text x="100" y="70" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Best Used For:</text>

        <text x="20" y="100" fontSize="12" fill="hsl(var(--foreground))">• Write-Once, Read-Many</text>
        <text x="20" y="120" fontSize="12" fill="hsl(var(--foreground))">• Massive databases</text>
        <text x="20" y="140" fontSize="12" fill="hsl(var(--foreground))">• Dictionary lookups</text>
      </g>
    </svg>
  );
}

export const BinarySearchSupplementaryOptions = [
  LogNReduction,
  BoundaryUpdateRules,
  SortingTradeOff,
  UsageJudgment,
];
