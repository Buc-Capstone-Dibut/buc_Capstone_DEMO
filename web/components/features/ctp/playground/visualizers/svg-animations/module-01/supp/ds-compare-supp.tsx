"use client";

import { motion } from "framer-motion";

function ContinuousMemory() {
  const slots = [0, 1, 2, 3, 4, 5];
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 280" className="w-full h-full overflow-visible">
        <defs>
          <filter id="mem-glow-ds">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow-mem-ds" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        <rect x="20" y="20" width="360" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Contiguous Memory Allocation</text>

        <g transform="translate(60, 110)">
          <rect x="-20" y="-20" width="290" height="90" rx="8" fill="none" stroke="hsl(var(--border))" strokeDasharray="4 4" />
          {slots.map((i) => {
            const isAllocated = i < 4;
            return (
              <g key={i} transform={`translate(${i * 42}, 0)`}>
                <rect width="36" height="36" rx="6"
                  fill={isAllocated ? "hsl(var(--primary)/0.15)" : "hsl(var(--muted)/0.3)"}
                  stroke={isAllocated ? "hsl(var(--primary)/0.5)" : "hsl(var(--border))"}
                  strokeWidth="2"
                />
                {isAllocated && (
                  <text x="18" y="23" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--primary))">{i * 10}</text>
                )}
                <text x="18" y="55" textAnchor="middle" fontSize="8" fontFamily="monospace"
                  fill={isAllocated ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                >
                  {"0x" + (100 + i * 4)}
                </text>
              </g>
            );
          })}
          <rect x="0" y="-10" width="36" height="56" rx="8" fill="none" stroke="hsl(var(--orange-400, #fb923c))" strokeWidth="2" strokeDasharray="4 4" />
          <text x="18" y="-14" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--orange-400, #fb923c))">Base</text>
          <motion.path
            d="M 18 -38 L 18 -14"
            fill="none" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow-mem-ds)"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: [0, 1, 0], pathLength: [0, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>

        <text x="200" y="240" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="hsl(var(--muted-foreground))">
          Base Address + (Index x Size) = Direct O(1) Offset
        </text>
      </svg>
    </div>
  );
}

function StaticVsDynamic() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="resize-glow-ds">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow-resize-ds" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--purple-500, #a855f7))" />
          </marker>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--foreground))">Dynamic Array Resizing</text>

        <g transform="translate(60, 100)">
          <text x="60" y="-10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--destructive))">Capacity Full (3)</text>
          <rect x="-5" y="-5" width="130" height="50" rx="6" fill="hsl(var(--destructive)/0.05)" stroke="hsl(var(--destructive)/0.3)" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={i * 40} y="0" width="38" height="40" rx="6" fill="hsl(var(--destructive)/0.2)" stroke="hsl(var(--destructive))" />
          ))}
        </g>

        <motion.g transform="translate(195, 110)"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <circle cx="0" cy="0" r="16" fill="hsl(var(--card))" stroke="hsl(var(--purple-500, #a855f7))" strokeWidth="2" />
          <path d="M -5 0 L 5 0 M 0 -5 L 0 5" stroke="hsl(var(--purple-500, #a855f7))" strokeWidth="3" />
        </motion.g>

        <g transform="translate(40, 190)">
          <text x="160" y="-10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">New Capacity (6) — O(N) Copy</text>
          <rect x="-5" y="-5" width="260" height="50" rx="6" fill="none" stroke="hsl(var(--emerald-500, #10b981)/0.3)" strokeDasharray="4 4" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={i * 40} y="0" width="38" height="40" rx="6" fill="hsl(var(--purple-500, #a855f7)/0.3)" stroke="hsl(var(--purple-500, #a855f7))" />
          ))}
          <motion.rect x={3 * 40} y="0" width="38" height="40" rx="6"
            fill="hsl(var(--emerald-500, #10b981)/0.4)" stroke="hsl(var(--emerald-500, #10b981))"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1, repeat: Infinity, repeatType: "reverse", repeatDelay: 1 }}
          />
          {[4, 5].map((i) => (
            <rect key={i} x={i * 40} y="0" width="38" height="40" rx="6" fill="none" stroke="hsl(var(--border))" strokeDasharray="4 4" />
          ))}
        </g>
      </svg>
    </div>
  );
}

function Immutability() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="shield-glow-ds">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--foreground))">Mutability vs. Immutability</text>

        <g transform="translate(60, 110)">
          <text x="60" y="-10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--destructive))">Mutable List</text>
          <rect x="0" y="0" width="120" height="50" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--destructive)/0.5)" strokeWidth="2" />
          <text x="60" y="32" textAnchor="middle" fontSize="16" fontWeight="bold" fontFamily="monospace" fill="hsl(var(--foreground))">[ 1, X, 3 ]</text>
          <motion.circle cx="60" cy="25" r="25" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive))"
            animate={{ scale: [1, 2], opacity: [1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </g>

        <g transform="translate(240, 110)">
          <text x="60" y="-10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">Immutable Tuple</text>
          <rect x="0" y="0" width="120" height="50" rx="25" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary))" strokeWidth="2" filter="url(#shield-glow-ds)" />
          <text x="60" y="32" textAnchor="middle" fontSize="16" fontWeight="bold" fontFamily="monospace" fill="hsl(var(--primary))">( 1, 2, 3 )</text>
          <text x="60" y="-24" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">Protected (Read-Only)</text>
        </g>

        <text x="200" y="220" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="hsl(var(--muted-foreground))">
          Immutability prevents side effects and ensures thread safety.
        </text>
      </svg>
    </div>
  );
}


function TradeoffMatrix() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Operation Cost Matrix</text>
        {/* Column headers */}
        <text x="165" y="66" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">Array</text>
        <text x="285" y="66" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--purple-500,#a855f7))">Linked List</text>
        {[
          { op: "Access", arr: "O(1) ✓", ll: "O(N) ✗", arrGood: true },
          { op: "Append", arr: "O(1)* ✓", ll: "O(1) ✓", arrGood: true },
          { op: "Insert(mid)", arr: "O(N) ✗", ll: "O(1) ✓", arrGood: false },
          { op: "Delete(mid)", arr: "O(N) ✗", ll: "O(1) ✓", arrGood: false },
          { op: "Search", arr: "O(N)", ll: "O(N)", arrGood: null },
        ].map(({ op, arr, ll, arrGood }, i) => (
          <g key={op} transform={`translate(0, ${76 + i * 38})`}>
            <rect x="42" y="4" width="316" height="28" rx="4" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" />
            <text x="90" y="22" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">{op}</text>
            <rect x="126" y="8" width="78" height="20" rx="4"
              fill={arrGood === true ? "hsl(var(--emerald-500,#10b981)/0.15)" : arrGood === false ? "hsl(var(--destructive)/0.08)" : "hsl(var(--muted)/0.5)"} />
            <text x="165" y="22" textAnchor="middle" fontSize="9" fontFamily="monospace"
              fill={arrGood === true ? "hsl(var(--emerald-500,#10b981))" : arrGood === false ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}>{arr}</text>
            <rect x="246" y="8" width="78" height="20" rx="4"
              fill={arrGood === false ? "hsl(var(--emerald-500,#10b981)/0.15)" : arrGood === true ? "hsl(var(--destructive)/0.08)" : "hsl(var(--muted)/0.5)"} />
            <text x="285" y="22" textAnchor="middle" fontSize="9" fontFamily="monospace"
              fill={arrGood === false ? "hsl(var(--emerald-500,#10b981))" : arrGood === true ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}>{ll}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export const DsCompareSupplementaryOptions = [
  ContinuousMemory,
  StaticVsDynamic,
  Immutability,
  TradeoffMatrix,
];

