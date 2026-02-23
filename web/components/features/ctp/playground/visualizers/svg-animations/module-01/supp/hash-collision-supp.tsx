"use client";

import { motion } from "framer-motion";

function HashFunctionMagic() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="hash-glow-supp">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow-hash-supp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
          <linearGradient id="hash-grad-supp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary)/0.2)" />
            <stop offset="100%" stopColor="hsl(var(--primary)/0.05)" />
          </linearGradient>
        </defs>

        <rect x="20" y="20" width="360" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Hash Function Mapping O(1)</text>

        <g transform="translate(30, 100)">
          <text x="35" y="-10" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">Input Keys</text>
          {['"Apple"', '"Banana"', '"Cherry"'].map((label, i) => (
            <motion.g key={label} animate={{ x: [0, 20, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i }}>
              <rect x="0" y={i * 35} width="70" height="24" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--primary)/0.5)" />
              <text x="35" y={i * 35 + 16} textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--primary))">{label}</text>
            </motion.g>
          ))}
        </g>

        <g transform="translate(150, 70)">
          <rect x="0" y="0" width="80" height="150" rx="12" fill="url(#hash-grad-supp)" stroke="hsl(var(--primary))" strokeWidth="2" filter="url(#hash-glow-supp)" />
          <text x="40" y="75" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">Hash(X)</text>
          <text x="40" y="90" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="hsl(var(--muted-foreground))">SHA/MURMUR</text>
          <motion.rect x="20" y="20" width="40" height="2" fill="hsl(var(--primary))"
            animate={{ y: [20, 130, 20], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }}
          />
        </g>

        <g transform="translate(300, 80)">
          <text x="35" y="-10" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">Memory</text>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="0" y={i * 26} width="70" height="20" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
          ))}
          <rect x="2" y="28" width="66" height="16" rx="2" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary)/0.5)" />
          <rect x="2" y="80" width="66" height="16" rx="2" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary)/0.5)" />
        </g>

        <motion.path d="M 120 120 L 150 125" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4"
          initial={{ strokeDashoffset: 10 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }} />
        <motion.path d="M 120 155 L 150 145" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4"
          initial={{ strokeDashoffset: 10 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear", delay: 1 }} />
        <motion.path d="M 230 100 Q 260 90 290 115" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow-hash-supp)"
          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
        <motion.path d="M 230 140 Q 260 140 290 90" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow-hash-supp)"
          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
      </svg>
    </div>
  );
}

function CollisionViz() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <filter id="explosion-glow-supp">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow-collide-supp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--foreground))" />
          </marker>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--destructive))">Memory Sector Collision</text>

        <g transform="translate(60, 100)">
          <rect x="0" y="0" width="80" height="30" rx="4" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" />
          <text x="40" y="19" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">Node A</text>
        </g>
        <g transform="translate(60, 160)">
          <rect x="0" y="0" width="80" height="30" rx="4" fill="hsl(var(--orange-500, #f97316)/0.2)" stroke="hsl(var(--orange-500, #f97316))" />
          <text x="40" y="19" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--orange-500, #f97316))">Node B</text>
        </g>

        <g transform="translate(240, 115)">
          <rect x="0" y="0" width="80" height="60" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeDasharray="4 4" />
          <text x="40" y="25" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">Sector 3</text>
          <rect x="10" y="32" width="60" height="20" rx="4" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary)/0.5)" />
          <text x="40" y="45" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--primary))">Node A stored</text>
        </g>

        <path d="M 140 115 L 235 135" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow-collide-supp)" />
        <motion.path d="M 140 175 L 230 155" stroke="hsl(var(--orange-500, #f97316))" strokeWidth="2" markerEnd="url(#arrow-collide-supp)"
          animate={{ strokeWidth: [2, 4, 2] }} transition={{ duration: 1, repeat: Infinity }}
        />

        <motion.g transform="translate(225, 145)" filter="url(#explosion-glow-supp)"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
        >
          <path d="M 0 -20 L 5 -5 L 20 0 L 5 5 L 0 20 L -5 5 L -20 0 L -5 -5 Z" fill="hsl(var(--destructive))" />
        </motion.g>

        <text x="200" y="240" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="hsl(var(--muted-foreground))">Multiple keys map to same index!</text>
      </svg>
    </div>
  );
}

function ChainingSolution() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <defs>
          <marker id="arrow-chain-supp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--orange-500, #f97316))" />
          </marker>
          <marker id="arrow-chain-ext-supp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--emerald-500, #10b981))" />
          </marker>
        </defs>

        <rect x="40" y="20" width="320" height="40" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Chaining Resolution</text>

        <g transform="translate(40, 80)">
          <text x="25" y="-10" textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--muted-foreground))">Array</text>
          <rect x="0" y="0" width="50" height="150" fill="hsl(var(--card))" stroke="hsl(var(--border))" rx="4" />
          <rect x="0" y="60" width="50" height="30" fill="hsl(var(--primary)/0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
          <text x="25" y="80" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">Idx 3</text>
        </g>

        <g transform="translate(130, 130)">
          <rect x="0" y="0" width="60" height="30" rx="6" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary))" strokeWidth="2" />
          <text x="30" y="19" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">Alice</text>

          <motion.path d="M 60 15 L 90 15" stroke="hsl(var(--orange-500, #f97316))" strokeWidth="2" markerEnd="url(#arrow-chain-supp)"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
          />

          <motion.g initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 1 }}>
            <rect x="100" y="0" width="60" height="30" rx="6" fill="hsl(var(--orange-500, #f97316)/0.1)" stroke="hsl(var(--orange-500, #f97316))" strokeWidth="2" />
            <text x="130" y="19" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--orange-500, #f97316))">Bob</text>
            <motion.path d="M 160 15 L 190 15" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" markerEnd="url(#arrow-chain-ext-supp)"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 2 }}
            />
          </motion.g>

          <motion.g initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 2.5 }}>
            <rect x="200" y="0" width="60" height="30" rx="6" fill="hsl(var(--emerald-500, #10b981)/0.1)" stroke="hsl(var(--emerald-500, #10b981))" strokeWidth="2" />
            <text x="230" y="19" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500, #10b981))">Charlie</text>
          </motion.g>
        </g>

        <path d="M 65 145 L 120 145" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow-chain-supp)" />
        <text x="200" y="225" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="hsl(var(--muted-foreground))">
          Colliding elements linked in a chain at same bucket.
        </text>
      </svg>
    </div>
  );
}


function OpenAddressing() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 bg-background">
      <svg viewBox="0 0 400 300" className="w-full h-full overflow-visible">
        <rect x="40" y="10" width="320" height="36" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="200" y="32" textAnchor="middle" fontSize="11" fontWeight="bold" fill="hsl(var(--primary))">Open Addressing (Linear Probe)</text>
        {/* Buckets */}
        {[{idx:0,val:"–"},{idx:1,val:"–"},{idx:2,val:"A"},{idx:3,val:"B*"},{idx:4,val:"–"},{idx:5,val:"–"},{idx:6,val:"C"}].map(({ idx, val }) => (
          <g key={idx} transform={`translate(${55 + idx * 44}, 60)`}>
            <rect x="0" y="0" width="38" height="48" rx="5"
              fill={val === "B*" ? "hsl(var(--primary)/0.12)" : val !== "–" ? "hsl(var(--emerald-500,#10b981)/0.1)" : "hsl(var(--card))"}
              stroke={val === "B*" ? "hsl(var(--primary))" : val !== "–" ? "hsl(var(--emerald-500,#10b981)/0.5)" : "hsl(var(--border))"}
            />
            <text x="19" y="16" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">[{idx}]</text>
            <text x="19" y="36" textAnchor="middle" fontSize="14" fontFamily="monospace" fontWeight="bold"
              fill={val === "B*" ? "hsl(var(--primary))" : val !== "–" ? "hsl(var(--emerald-500,#10b981))" : "hsl(var(--muted-foreground)/0.3)"}>{val}</text>
          </g>
        ))}
        <text x="200" y="128" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">B* = B가 [2]에 충돌 → 선형 탐사로 [3]에 삽입</text>
        {/* vs Chaining */}
        <rect x="42" y="142" width="148" height="80" rx="8" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" />
        <text x="116" y="160" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">Open Addressing</text>
        <text x="116" y="178" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">• 메모리 더 compact</text>
        <text x="116" y="194" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">• 로드팩터 높으면 느림</text>
        <text x="116" y="210" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">• 캐시 친화적</text>
        <rect x="210" y="142" width="148" height="80" rx="8" fill="hsl(var(--card)/0.5)" stroke="hsl(var(--border))" />
        <text x="284" y="160" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--emerald-500,#10b981))">Chaining</text>
        <text x="284" y="178" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">• 충돌 선형 연결</text>
        <text x="284" y="194" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">• 삽입/삭제 유연</text>
        <text x="284" y="210" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">• 포인터 오버헤드</text>
        <text x="200" y="255" textAnchor="middle" fontSize="9" fill="hsl(var(--primary))">두 방식 모두 최악 O(N) — 로드팩터 관리가 핵심</text>
      </svg>
    </div>
  );
}

export const HashCollisionSupplementaryOptions = [
  HashFunctionMagic,
  CollisionViz,
  ChainingSolution,
  OpenAddressing,
];

