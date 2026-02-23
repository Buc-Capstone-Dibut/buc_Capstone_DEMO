"use client";

import { motion } from "framer-motion";

function VisualDebug() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="ft-glow-primary-supp">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="code-bg-supp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <rect x="20" y="40" width="200" height="220" rx="8" fill="url(#code-bg-supp)" stroke="hsl(var(--border))" />
        <circle cx="35" cy="55" r="4" fill="hsl(var(--destructive))" />
        <circle cx="50" cy="55" r="4" fill="hsl(var(--yellow-500, #eab308))" />
        <circle cx="65" cy="55" r="4" fill="hsl(var(--emerald-500, #10b981))" />
        <path d="M 20 70 L 220 70" stroke="hsl(var(--border))" strokeWidth="1" />

        <text x="35" y="100" fontSize="9" fontFamily="monospace" fill="hsl(var(--muted-foreground))">let sum = 0;</text>
        <text x="35" y="125" fontSize="9" fontFamily="monospace" fill="hsl(var(--muted-foreground))">for(let i=1; i&lt;3; i++){"{"}</text>
        <text x="50" y="150" fontSize="9" fontFamily="monospace" fill="hsl(var(--muted-foreground))">  sum += i;</text>
        <text x="35" y="175" fontSize="9" fontFamily="monospace" fill="hsl(var(--muted-foreground))">{"}"}</text>
        <text x="35" y="200" fontSize="9" fontFamily="monospace" fill="hsl(var(--muted-foreground))">return sum;</text>

        <motion.rect x="20" width="200" height="20" fill="hsl(var(--primary)/0.2)"
          animate={{ y: [85, 110, 135, 110, 135, 185] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <rect x="240" y="40" width="140" height="220" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="255" y="60" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">MEMORY DUMP</text>
        <path d="M 240 70 L 380 70" stroke="hsl(var(--border))" strokeWidth="1" />

        <text x="255" y="100" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--destructive))">var i:</text>
        <motion.text x="310" y="100" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))"
          animate={{ opacity: [1, 0, 0, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.33, 0.66, 1] }}>0</motion.text>
        <motion.text x="310" y="100" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))"
          animate={{ opacity: [0, 1, 0, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.33, 0.66, 1] }}>1</motion.text>
        <motion.text x="310" y="100" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))"
          animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.33, 0.66, 1] }}>2</motion.text>

        <path d="M 255 115 L 365 115" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 2" />
        <text x="255" y="145" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">sum:</text>
        <motion.text x="310" y="145" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))"
          animate={{ opacity: [1, 0, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.33, 1] }}>0</motion.text>
        <motion.text x="310" y="145" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))"
          animate={{ opacity: [0, 1, 0] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.33, 0.66] }}>1</motion.text>
        <motion.text x="310" y="145" fontSize="11" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))"
          animate={{ opacity: [0, 0, 1] }} transition={{ duration: 6, repeat: Infinity, times: [0, 0.66, 1] }}>3</motion.text>
      </svg>
    </div>
  );
}

function ExitCase() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="exit-glow-supp">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow-ft-supp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        {[1, 2, 3].map((level, i) => (
          <g key={level} transform={`translate(150, ${50 + i * 50})`}>
            <rect width="100" height="30" rx="4" fill="hsl(var(--muted)/0.5)" stroke="hsl(var(--border))" strokeWidth="2" />
            <text x="50" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--muted-foreground))">Depth {level}</text>
          </g>
        ))}

        <motion.rect x="140" y="210" width="120" height="40" rx="6" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2"
          filter="url(#exit-glow-supp)"
          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
        />
        <text x="200" y="234" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">BASE CASE</text>

        <path d="M 200 20 L 200 45" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow-ft-supp)" />
        <path d="M 200 80 L 200 95" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
        <path d="M 200 130 L 200 145" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />

        <motion.path d="M 200 180 L 200 200" stroke="hsl(var(--primary))" strokeWidth="3" markerEnd="url(#arrow-ft-supp)"
          filter="url(#exit-glow-supp)"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.path d="M 280 230 C 350 230, 350 65, 260 65" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
          strokeLinecap="round" strokeDasharray="10 10" markerEnd="url(#arrow-ft-supp)"
          filter="url(#exit-glow-supp)"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.text x="340" y="150" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 3, repeat: Infinity }}
        >RETURN</motion.text>
      </svg>
    </div>
  );
}

function EdgeCase() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="edge-glow-supp">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="edge-destructive-supp">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow-ec-supp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        <text x="200" y="80" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">Guard Clause</text>

        <path d="M 50 150 L 180 150" stroke="hsl(var(--muted-foreground))" strokeWidth="4" />
        <path d="M 220 150 L 350 150" stroke="hsl(var(--primary))" strokeWidth="4" filter="url(#edge-glow-supp)" />
        <text x="285" y="140" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">Normal Flow</text>

        <rect x="180" y="130" width="40" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" transform="rotate(45 200 150)" />
        <text x="200" y="154" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--foreground))">val</text>

        <path d="M 200 175 L 200 240 L 260 240" stroke="hsl(var(--destructive))" strokeWidth="3" strokeDasharray="5 5" />
        <rect x="260" y="225" width="100" height="30" rx="4" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive))" strokeWidth="2" filter="url(#edge-destructive-supp)" />
        <text x="310" y="244" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--destructive))">Exception</text>

        <motion.circle cx="50" cy="150" r="6" fill="hsl(var(--primary))"
          animate={{ cx: [50, 180, 200, 310] }}
          transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.5, 1] }}
        />
        <motion.g
          animate={{ opacity: [0, 0, 1, 1, 0], x: [50, 180, 200, 200, 200], y: [150, 150, 150, 240, 240] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.3, 0.4, 0.8, 1], delay: 1 }}
        >
          <circle r="6" fill="hsl(var(--destructive))" filter="url(#edge-destructive-supp)" />
        </motion.g>
      </svg>
    </div>
  );
}


function VariableTimeline() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Variable State Timeline</text>
        {/* Headers */}
        <text x="75" y="68" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">step</text>
        <text x="155" y="68" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">i</text>
        <text x="225" y="68" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--emerald-500,#10b981))">sum</text>
        <text x="310" y="68" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">action</text>
        {[
          { step: "init", i: "–", sum: "0", action: "sum = 0", highlight: false },
          { step: "i=1", i: "1", sum: "1", action: "sum += 1", highlight: true },
          { step: "i=2", i: "2", sum: "3", action: "sum += 2", highlight: false },
          { step: "i=3", i: "3", sum: "6", action: "sum += 3", highlight: true },
          { step: "end", i: "4", sum: "6", action: "loop exits", highlight: false },
        ].map(({ step, i, sum, action, highlight }, idx) => (
          <g key={step} transform={`translate(0, ${80 + idx * 38})`}>
            <rect x="42" y="4" width="316" height="28" rx="5" fill={highlight ? "hsl(var(--primary)/0.08)" : "hsl(var(--card)/0.4)"} stroke="hsl(var(--border))" />
            <text x="75" y="22" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{step}</text>
            <text x="155" y="22" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--primary))">{i}</text>
            <text x="225" y="22" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--emerald-500,#10b981))">{sum}</text>
            <text x="310" y="22" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">{action}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export const FlowTracingSupplementaryOptions = [
  VisualDebug,
  ExitCase,
  EdgeCase,
  VariableTimeline,
];

