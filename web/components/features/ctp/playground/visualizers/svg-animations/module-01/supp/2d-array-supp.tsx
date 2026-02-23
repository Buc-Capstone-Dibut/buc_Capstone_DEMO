"use client";

import { motion } from "framer-motion";

function LinearTransformation() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="linear-glow-2d">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow-linear-2d" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        <text x="50" y="40" fontSize="10" fontWeight="bold" fill="hsl(var(--muted-foreground))">Logical 2D Matrix</text>

        <g transform="translate(50, 60)">
          <rect x="-10" y="-10" width="100" height="140" rx="8" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" />
          {[0, 1, 2].map((r) =>
            [0, 1].map((c) => {
              const i = r * 2 + c;
              return (
                <g key={`log-${r}-${c}`}>
                  <rect x={c * 40} y={r * 40} width="32" height="32" rx="4" fill="hsl(var(--muted)/0.5)" stroke="hsl(var(--border))" />
                  <text x={c * 40 + 16} y={r * 40 + 20} textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">{i}</text>
                </g>
              );
            })
          )}
          <motion.rect width="32" height="32" rx="4" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" filter="url(#linear-glow-2d)"
            animate={{ x: [0, 40, 0, 40, 0, 40], y: [0, 0, 40, 40, 80, 80] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        </g>

        <path d="M 160 120 L 210 120" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow-linear-2d)" />
        <motion.circle cx="160" cy="120" r="4" fill="hsl(var(--primary))" filter="url(#linear-glow-2d)"
          animate={{ cx: [160, 210], opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />

        <rect x="120" y="160" width="160" height="30" rx="4" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary)/0.3)" />
        <text x="200" y="179" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">idx = r * cols + c</text>

        <text x="220" y="40" fontSize="10" fontWeight="bold" fill="hsl(var(--muted-foreground))">Physical Memory (1D)</text>

        <g transform="translate(220, 60)">
          <rect x="-10" y="-10" width="160" height="140" rx="8" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i} transform={`translate(10, ${10 + i * 18})`}>
              <rect width="130" height="14" rx="2" fill="hsl(var(--muted)/0.5)" stroke="hsl(var(--border))" />
              <text x="10" y="10" fontSize="8" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--muted-foreground))">0xA{i}0</text>
              <text x="80" y="10" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--foreground))">VAL {i}</text>
            </g>
          ))}
          <motion.rect width="130" height="14" rx="2" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" filter="url(#linear-glow-2d)"
            animate={{ y: [10, 28, 46, 64, 82, 100] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{ x: 10 }}
          />
        </g>
      </svg>
    </div>
  );
}

function NestedLoop() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="loop-glow-2d">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="40" y="40" width="320" height="70" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="60" y="65" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">for (let r = 0; r &lt; ROW; r++)</text>
        <text x="80" y="85" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">for (let c = 0; c &lt; COL; c++)</text>

        <g transform="translate(100, 140)">
          <rect x="-10" y="-10" width="220" height="160" rx="8" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" />

          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect key={`grid-${r}-${c}`} x={c * 50} y={r * 50} width="42" height="42" rx="4" fill="hsl(var(--muted)/0.5)" stroke="hsl(var(--border)/0.5)" />
            ))
          )}

          <motion.rect x="-5" width="210" height="52" rx="6" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary)/0.3)" strokeWidth="2"
            animate={{ y: [-5, 45, 95] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <motion.rect width="42" height="42" rx="4" fill="hsl(var(--emerald-500, #10b981)/0.3)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" filter="url(#loop-glow-2d)"
            animate={{ x: [0, 50, 100, 150, 0, 50, 100, 150, 0, 50, 100, 150], y: [0, 0, 0, 0, 50, 50, 50, 50, 100, 100, 100, 100] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        </g>
      </svg>
    </div>
  );
}

function DiagonalSearch() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="diag-primary-glow-2d">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="40" y="30" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <circle cx="80" cy="50" r="4" fill="hsl(var(--primary))" filter="url(#diag-primary-glow-2d)" />
        <text x="95" y="54" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">Main (r == c)</text>
        <circle cx="210" cy="50" r="4" fill="hsl(var(--destructive))" filter="url(#diag-primary-glow-2d)" />
        <text x="225" y="54" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--destructive))">Anti (r + c == N-1)</text>

        <g transform="translate(100, 100)">
          <rect x="-10" y="-10" width="220" height="220" rx="8" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect key={`d-grid-${r}-${c}`} x={c * 50} y={r * 50} width="46" height="46" rx="4" fill="hsl(var(--muted)/0.5)" stroke="hsl(var(--border)/0.5)" />
            ))
          )}

          {[0, 1, 2, 3].map((i) => (
            <motion.rect key={`d1-${i}`} x={i * 50} y={i * 50} width="46" height="46" rx="4"
              fill="hsl(var(--primary)/0.3)" stroke="hsl(var(--primary))" strokeWidth="2" filter="url(#diag-primary-glow-2d)"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 0.8] }}
              transition={{ delay: i * 0.4, repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            />
          ))}

          {[0, 1, 2, 3].map((i) => (
            <motion.rect key={`d2-${i}`} x={(3 - i) * 50} y={i * 50} width="46" height="46" rx="4"
              fill="hsl(var(--destructive)/0.3)" stroke="hsl(var(--destructive))" strokeWidth="2" filter="url(#diag-primary-glow-2d)"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 0.8] }}
              transition={{ delay: i * 0.4 + 1.6, repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}


function MemoryLayout() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Row-Major Memory Layout</text>
        {/* 2D grid */}
        {[[1,2,3],[4,5,6],[7,8,9]].map((row, r) =>
          row.map((val, c) => (
            <g key={`${r}-${c}`} transform={`translate(${80 + c * 56}, ${58 + r * 44})`}>
              <rect x="0" y="0" width="48" height="36" rx="5" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
              <text x="24" y="12" textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))">[{r}][{c}]</text>
              <text x="24" y="26" textAnchor="middle" fontSize="13" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))">{val}</text>
            </g>
          ))
        )}
        {/* Linear memory strip */}
        <text x="200" y="204" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">실제 메모리 (Row-Major Order)</text>
        {[1,2,3,4,5,6,7,8,9].map((val, i) => (
          <g key={val} transform={`translate(${42 + i * 36}, 212)`}>
            <rect x="0" y="0" width="32" height="28" rx="4" fill={i < 3 ? "hsl(var(--primary)/0.15)" : i < 6 ? "hsl(var(--emerald-500,#10b981)/0.12)" : "hsl(var(--card))"} stroke="hsl(var(--border))" />
            <text x="16" y="18" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))">{val}</text>
          </g>
        ))}
        <text x="200" y="262" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">arr[r][c] → addr = base + r×cols + c</text>
      </svg>
    </div>
  );
}

export const TwoDArraySupplementaryOptions = [
  LinearTransformation,
  NestedLoop,
  DiagonalSearch,
  MemoryLayout,
];
