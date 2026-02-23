"use client";

import { motion } from "framer-motion";

function SearchableData() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="key-glow-spk">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow-key-spk" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        <rect x="20" y="20" width="360" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--foreground))">Impact of Data Ordering</text>

        {/* Unsorted side */}
        <g transform="translate(40, 80)">
          <text x="60" y="-10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--destructive))">Unsorted: O(N)</text>
          <rect x="0" y="0" width="120" height="120" rx="8" fill="hsl(var(--destructive)/0.05)" stroke="hsl(var(--destructive)/0.3)" strokeDasharray="4 4" />
          {[{ cx: 30, cy: 20, r: 12 }, { cx: 65, cy: 50, r: 15 }, { cx: 25, cy: 80, r: 10 }, { cx: 85, cy: 25, r: 10 }, { cx: 90, cy: 90, r: 12 }].map((c, i) => (
            <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
          ))}
          <motion.circle cx="30" cy="20" r="5" fill="hsl(var(--destructive))" opacity="0.8" filter="url(#key-glow-spk)"
            animate={{ cx: [30, 65, 25, 85, 90], cy: [20, 50, 80, 25, 90] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </g>

        <path d="M 195 80 L 195 210" stroke="hsl(var(--border))" strokeDasharray="4 4" />

        {/* Sorted side */}
        <g transform="translate(215, 80)">
          <text x="60" y="-10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Sorted: O(log N)</text>
          <rect x="0" y="0" width="120" height="120" rx="8" fill="hsl(var(--emerald-500, #10b981)/0.05)" stroke="hsl(var(--emerald-500, #10b981)/0.3)" strokeDasharray="4 4" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={10 + i * 22} y={20} width="18" height={20 + i * 16} rx="3"
              fill="hsl(var(--emerald-500, #10b981)/0.2)" stroke="hsl(var(--emerald-500, #10b981)/0.5)" />
          ))}
          <motion.path d="M 55 10 L 55 20" fill="none" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="3" markerEnd="url(#arrow-key-spk)"
            animate={{ x: [0, -33, 11] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </g>

        <text x="200" y="245" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--muted-foreground))">
          Data ordering determines algorithm efficiency.
        </text>
      </svg>
    </div>
  );
}

function MatchingKey() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="match-glow-spk">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrow-match-spk" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>

        <rect x="20" y="20" width="360" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Key-Value Matching Protocol</text>

        <g transform="translate(30, 110)">
          <rect x="0" y="0" width="110" height="60" rx="12" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary))" strokeWidth="2" filter="url(#match-glow-spk)" />
          <text x="55" y="22" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">Search Key</text>
          <text x="55" y="44" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--primary))">name: &quot;Apple&quot;</text>
        </g>

        <motion.path d="M 140 140 Q 200 100, 240 130" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrow-match-spk)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.text x="195" y="100" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--primary))"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        >Match!</motion.text>

        <g transform="translate(245, 90)">
          <rect x="0" y="0" width="130" height="130" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
          <text x="65" y="22" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">Database Record</text>
          <rect x="10" y="30" width="110" height="28" rx="4" fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary)/0.5)" />
          <text x="65" y="49" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">name: &quot;Apple&quot;</text>
          <text x="65" y="80" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground)/0.6)">price: $1.20</text>
          <text x="65" y="100" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground)/0.6)">qty: 50</text>
          <text x="65" y="120" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground)/0.6)">category: Fruit</text>
        </g>

        <text x="200" y="255" textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="hsl(var(--muted-foreground))">
          Search key is matched against each record property.
        </text>
      </svg>
    </div>
  );
}

function FailureCondition() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="fail-glow-spk">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="20" y="20" width="360" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--destructive))">Search Failure: Return -1</text>

        <g transform="translate(70, 130)">
          <rect x="-10" y="-10" width="270" height="60" rx="8" fill="hsl(var(--muted)/0.2)" stroke="hsl(var(--border))" strokeDasharray="4 4" />
          {['A', 'B', 'C', 'D'].map((v, i) => (
            <g key={i} transform={`translate(${i * 60}, 0)`}>
              <rect x="0" y="0" width="50" height="40" rx="4" fill="hsl(var(--muted)/0.5)" stroke="hsl(var(--border))" />
              <text x="25" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="hsl(var(--muted-foreground))">{v}</text>
            </g>
          ))}

          <motion.g animate={{ x: [0, 60, 120, 180, 250] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", times: [0, 0.25, 0.5, 0.75, 1] }}>
            <rect x="0" y="0" width="50" height="40" rx="4" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" />
            <rect x="22" y="-30" width="6" height="30" fill="hsl(var(--primary))" rx="3" />
          </motion.g>

          <motion.g transform="translate(240, 0)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0, 0, 1] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.25, 0.5, 0.75, 1] }}>
            <rect x="0" y="-10" width="60" height="60" rx="4" fill="hsl(var(--destructive)/0.15)" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="4 4" filter="url(#fail-glow-spk)" />
            <text x="30" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--destructive))">NULL</text>
            <text x="30" y="36" textAnchor="middle" fontSize="8" fill="hsl(var(--destructive)/0.7)">End</text>
          </motion.g>
        </g>

        <motion.g transform="translate(140, 220)"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0, 0, 0, 1], scale: [0.8, 0.8, 0.8, 0.8, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.25, 0.5, 0.75, 1] }}>
          <rect x="0" y="0" width="120" height="36" rx="8" fill="hsl(var(--destructive)/0.15)" stroke="hsl(var(--destructive))" strokeWidth="2" filter="url(#fail-glow-spk)" />
          <text x="60" y="23" textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--destructive))">return -1 (Not Found)</text>
        </motion.g>
      </svg>
    </div>
  );
}


function SearchResultState() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Search Result: Outcome States</text>
        {/* Success path */}
        <rect x="42" y="62" width="148" height="110" rx="8" fill="hsl(var(--emerald-500,#10b981)/0.05)" stroke="hsl(var(--emerald-500,#10b981)/0.4)" />
        <text x="116" y="80" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500,#10b981))">SUCCESS ✓</text>
        <text x="116" y="98" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">Key found in array</text>
        <rect x="62" y="106" width="108" height="28" rx="6" fill="hsl(var(--emerald-500,#10b981)/0.15)" stroke="hsl(var(--emerald-500,#10b981)/0.5)" />
        <text x="116" y="118" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="hsl(var(--emerald-500,#10b981))">return index</text>
        <text x="116" y="132" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="hsl(var(--emerald-500,#10b981))">→ element</text>
        <text x="116" y="156" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">값을 찾아 즉시 반환</text>
        {/* Failure path */}
        <rect x="210" y="62" width="148" height="110" rx="8" fill="hsl(var(--destructive)/0.05)" stroke="hsl(var(--destructive)/0.4)" />
        <text x="284" y="80" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--destructive))">FAILURE ✗</text>
        <text x="284" y="98" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">Key not found</text>
        <rect x="230" y="106" width="108" height="28" rx="6" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive)/0.5)" />
        <text x="284" y="118" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="hsl(var(--destructive))">return -1</text>
        <text x="284" y="132" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="hsl(var(--destructive))">→ None</text>
        <text x="284" y="156" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">실패 시 안전하게 -1 반환</text>
        {/* Lesson */}
        <rect x="60" y="190" width="280" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="210" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">성공·실패 모두 정의해야 완결된 검색 알고리즘</text>
        <text x="200" y="224" textAnchor="middle" fontSize="9" fill="hsl(var(--primary))">None 체크 없이 반환값 접근 → 런타임 오류</text>
      </svg>
    </div>
  );
}

export const ProblemKeySupplementaryOptions = [
  SearchableData,
  MatchingKey,
  FailureCondition,
  SearchResultState,
];

