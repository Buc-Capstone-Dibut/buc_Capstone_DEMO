"use client";

import { motion } from "framer-motion";

function HashMagic() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">The Magic of O(1) Access</text>

      {/* Input Data */}
      <g transform="translate(60, 100)">
        <text x="60" y="-15" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">Raw Data (Key)</text>
        <rect x="0" y="0" width="120" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="60" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--primary))">"apple"</text>
      </g>

      {/* Hash Function Processor */}
      <g transform="translate(240, 80)">
        <rect x="0" y="0" width="120" height="80" rx="12" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />
        <path d="M 40 25 L 50 35 L 60 25 M 60 55 L 70 45 L 80 55" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" fill="none" />
        <circle cx="60" cy="40" r="16" fill="hsl(var(--emerald-500, #10b981)/0.2)" />
        <text x="60" y="30" textAnchor="middle" fontSize="16">⚙️</text>
        <text x="60" y="65" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Hash Function</text>
      </g>

      {/* Array Index */}
      <g transform="translate(420, 100)">
        <text x="60" y="-15" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">Array Index</text>
        <rect x="0" y="0" width="120" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
         <text x="60" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--primary))">3</text>
      </g>

      {/* Connection Arrows & Animations */}
      <motion.path d="M 180 120 L 225 120" stroke="hsl(var(--border))" strokeWidth="3" markerEnd="url(#arrow)"
        animate={{ x: [0, 5, 0] }} transition={{ duration: 1, repeat: Infinity }} />
      <motion.path d="M 360 120 L 405 120" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="3" markerEnd="url(#arrow)"
        animate={{ x: [0, 5, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.5 }} />

      {/* Equation */}
      <rect x="150" y="220" width="300" height="36" rx="18" fill="hsl(var(--muted)/0.3)" />
      <text x="300" y="244" textAnchor="middle" fontSize="14" fontFamily="monospace" fill="hsl(var(--foreground))">
        index = <tspan fill="hsl(var(--emerald-500, #10b981))">hash</tspan>("apple") % array_size
      </text>
      <text x="300" y="275" textAnchor="middle" fontSize="12" fontWeight="500" fill="hsl(var(--muted-foreground))">
        Bypasses searching! Math calculates the exact memory location instantly.
      </text>

      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--border))" />
        </marker>
        <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--emerald-500, #10b981))" />
        </marker>
      </defs>
    </svg>
  );
}

function CollisionVisualization() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">Inevitable Collision (Pigeonhole Principle)</text>

      {/* Keys */}
      <g transform="translate(80, 80)">
        <rect x="0" y="0" width="100" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="50" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--primary))">"apple"</text>

        <rect x="0" y="50" width="100" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--destructive))" strokeWidth="2" />
        <text x="50" y="70" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--destructive))">"melon"</text>
      </g>

      {/* Hash computation lines */}
      <path d="M 180 95 C 240 95, 270 120, 310 120" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" markerEnd="url(#arrow)" />
      <path d="M 180 145 C 240 145, 270 120, 310 120" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2.5" markerEnd="url(#arrow)" />

      {/* Array / Bucket */}
      <g transform="translate(320, 70)">
        <text x="60" y="-15" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">Array Buckets</text>

        {/* Index 2 */}
        <rect x="0" y="0" width="120" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="-20" y="20" textAnchor="end" fontSize="12" fill="hsl(var(--muted-foreground))">[2]</text>

        {/* Index 3 (Collision Target) */}
        <motion.rect x="0" y="35" width="120" height="30" rx="4" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive))" strokeWidth="3"
          animate={{ x: [-2, 2, -2, 2, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }} />
        <text x="-20" y="55" textAnchor="end" fontSize="12" fontWeight="bold" fill="hsl(var(--destructive))">[3]</text>

        <text x="60" y="55" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--destructive))">💥 COLLISION!</text>

        {/* Index 4 */}
        <rect x="0" y="70" width="120" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="-20" y="90" textAnchor="end" fontSize="12" fill="hsl(var(--muted-foreground))">[4]</text>
      </g>

      <rect x="50" y="220" width="500" height="60" rx="12" fill="hsl(var(--muted)/0.3)" />
      <text x="300" y="245" textAnchor="middle" fontSize="13" fontWeight="bold" fill="hsl(var(--destructive))">Infinite Strings ➔ Finite Array Slots</text>
      <text x="300" y="265" textAnchor="middle" fontSize="12" fill="hsl(var(--foreground))">
        Multiple entirely different keys will inevitably compute to the same bucket index.
      </text>
    </svg>
  );
}

function ChainingSolution() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">Collision Resolution: Chaining</text>

      <g transform="translate(150, 80)">
        {/* Main Array Buckets */}
        <text x="25" y="-15" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">Array</text>

        {[0, 1, 2].map(i => (
          <g key={i} transform={`translate(0, ${i * 50})`}>
            <rect width="50" height="40" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
            <text x="-15" y="25" textAnchor="end" fontSize="12" fill="hsl(var(--muted-foreground))">[{i}]</text>
          </g>
        ))}

        {/* Index 1 Linked List */}
        <g transform="translate(50, 50)">
          {/* Node 1 ("apple") */}
          <path d="M 0 20 L 40 20" stroke="hsl(var(--primary))" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <rect x="40" y="0" width="80" height="40" rx="4" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary))" strokeWidth="2" />
          <text x="80" y="25" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--primary))">"apple"</text>

          {/* Node 2 ("melon") */}
          <path d="M 120 20 L 160 20" stroke="hsl(var(--destructive))" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <rect x="160" y="0" width="80" height="40" rx="4" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive))" strokeWidth="2" />
          <text x="200" y="25" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--destructive))">"melon"</text>

          {/* Node 3 ("kiwi") animated */}
          <motion.path d="M 240 20 L 280 20" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2.5" markerEnd="url(#arrow)"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity }} />
          <motion.rect x="280" y="0" width="80" height="40" rx="4" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity }} />
          <motion.text x="320" y="25" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity }}>"kiwi"</motion.text>
        </g>
      </g>

      <rect x="50" y="240" width="500" height="36" rx="18" fill="hsl(var(--muted)/0.3)" />
      <text x="300" y="263" textAnchor="middle" fontSize="13" fontWeight="500" fill="hsl(var(--foreground))">
        Instead of crashing, buckets store <tspan fill="hsl(var(--primary))" fontWeight="bold">Linked Lists</tspan> to chain multiple items together.
      </text>
    </svg>
  );
}

function OpenAddressing() {
  return (
    <svg viewBox="0 0 600 300" className="w-full h-full" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <text x="300" y="40" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">Collision Resolution: Linear Probing (Open Addressing)</text>

      <g transform="translate(200, 80)">
        {/* Array */}
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i} transform={`translate(0, ${i * 35})`}>
            <rect width="180" height="30" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
            <text x="-15" y="20" textAnchor="end" fontSize="12" fill="hsl(var(--muted-foreground))">[{i}]</text>
          </g>
        ))}

        {/* Existing Item */}
        <rect x="0" y="35" width="180" height="30" rx="4" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="90" y="55" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--primary))">"apple" (Occupied)</text>

        {/* Probing Animation for new item "melon" targeting index 1 */}

        {/* Step 1: Hit occupied */}
        <motion.path d="M -50 50 L -10 50" stroke="hsl(var(--destructive))" strokeWidth="3" markerEnd="url(#arrow)"
          animate={{ x: [0, 10, 0] }} transition={{ duration: 1, repeat: Infinity }} />
        <text x="-60" y="54" textAnchor="end" fontSize="12" fontWeight="bold" fill="hsl(var(--destructive))">"melon" ➔ [1]</text>
        <text x="200" y="54" fontSize="11" fontWeight="bold" fill="hsl(var(--destructive))">Collision!</text>

        {/* Step 2: Probe next */}
        <path d="M -70 60 L -70 85 L -10 85" fill="none" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="3" strokeDasharray="4 4" markerEnd="url(#arrow)" />
        <text x="200" y="89" fontSize="11" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Check [1 + 1]</text>

        {/* Placement */}
        <rect x="0" y="70" width="180" height="30" rx="4" fill="hsl(var(--emerald-500, #10b981)/0.2)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />
        <text x="90" y="90" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">"melon" (Placed!)</text>
      </g>

      <rect x="50" y="240" width="500" height="40" rx="8" fill="hsl(var(--muted)/0.3)" />
      <text x="300" y="258" textAnchor="middle" fontSize="12" fontWeight="500" fill="hsl(var(--foreground))">
        No linked lists. If a bucket is full, we step to the <tspan fill="hsl(var(--emerald-500, #10b981))" fontWeight="bold">next available slot</tspan> (+1).
      </text>
      <text x="300" y="274" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">
        Great for CPU cache, but suffers from "clustering" if array is too full.
      </text>
    </svg>
  );
}

export const HashCollisionSupplementaryOptions = [
  HashMagic,
  CollisionVisualization,
  ChainingSolution,
  OpenAddressing,
];
