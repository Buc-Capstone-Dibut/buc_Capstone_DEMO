"use client";

import { motion } from "framer-motion";

function SharedDefs() {
  return (
    <defs>
      <linearGradient id="primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="surface-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="1" />
        <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
      </linearGradient>
      <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.1" />
      </filter>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <marker id="arrow-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
      </marker>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="hsl(var(--border))" opacity="0.5" />
      </pattern>
    </defs>
  );
}

function LinearTransformation() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        2차원에서 1차원 인덱스 변환
      </text>

      {/* Logical 2D Grid */}
      <g transform="translate(100, 100)">
        <text x="90" y="-10" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--muted-foreground))">논리적 2D 배열 (3x4)</text>
        {[0, 1, 2].map(r => (
          <g key={`row-${r}`}>
            {[0, 1, 2, 3].map(c => {
              const highlighted = r === 1 && c === 2;
              return (
                <g key={`col-${c}`} transform={`translate(${c * 50}, ${r * 50})`}>
                  <rect width="45" height="45" rx="8" fill={highlighted ? "url(#primary-grad)" : "url(#surface-grad)"}
                        stroke={highlighted ? "#fff" : "hsl(var(--border))"} strokeWidth="2" filter={highlighted ? "url(#soft-shadow)" : ""} />
                  <text x="22.5" y="27" textAnchor="middle" fontSize="14" fontWeight="800" fill={highlighted ? "#fff" : "hsl(var(--muted-foreground))"}>{r},{c}</text>
                </g>
              );
            })}
          </g>
        ))}
        {/* Helper vectors */}
        <text x="-15" y="77" textAnchor="end" fontSize="16" fontWeight="900" fill="#6366f1">Row: 1</text>
        <path d="M 122.5 -5 L 122.5 -35" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)" opacity="0.5" />
        <text x="122.5" y="-45" textAnchor="middle" fontSize="16" fontWeight="900" fill="#10b981">Col: 2</text>
      </g>

      <path d="M 330 170 L 400 170" stroke="url(#primary-grad)" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="8 6" />
      <text x="365" y="150" textAnchor="middle" fontSize="14" fontWeight="700" fill="#6366f1">매핑</text>

      {/* Physical 1D Array */}
      <g transform="translate(450, 100)">
        <text x="140" y="-10" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--muted-foreground))">물리적 1D 배열</text>
        <g filter="url(#soft-shadow)">
           <rect width="280" height="150" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
        </g>
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
          const highlighted = i === 6;
          return (
            <g key={`flat-${i}`} transform={`translate(${15 + (i%4) * 60}, ${20 + Math.floor(i/4) * 60})`}>
              <rect width="50" height="50" rx="8" fill={highlighted ? "url(#primary-grad)" : "hsl(var(--muted))"}
                    stroke={highlighted ? "#fff" : "hsl(var(--border))"} strokeWidth="1" />
              <text x="25" y="32" textAnchor="middle" fontSize="18" fontWeight="800" fill={highlighted ? "#fff" : "hsl(var(--foreground))"}>{i}</text>
            </g>
          );
        })}
        {/* Ping animation to show map connection */}
        <motion.circle cx="160" cy="105" r="28" fill="none" stroke="#a855f7" strokeWidth="3" filter="url(#glow)"
           animate={{ scale: [1, 1.4, 1], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />
      </g>

      <rect x="200" y="350" width="400" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="380" textAnchor="middle" fontSize="16" fontWeight="600" fill="hsl(var(--foreground))">
        1D 인덱스 = (<tspan fill="#6366f1" fontWeight="800">r</tspan> × 열의 개수) + <tspan fill="#10b981" fontWeight="800">c</tspan>
      </text>
    </svg>
  );
}

function NestedLoop() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        이중 루프 순회 (가로 우선)
      </text>

      {/* Code Text */}
      <g transform="translate(100, 160)" filter="url(#soft-shadow)">
        <rect width="250" height="120" rx="16" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
        <text x="25" y="40" fontSize="14" fontFamily="monospace" fontWeight="800" fill="#6366f1">for (r = 0; r &lt; 3; r++) {"{"}</text>
        <text x="45" y="70" fontSize="14" fontFamily="monospace" fontWeight="800" fill="#10b981">for (c = 0; c &lt; 4; c++) {"{"}</text>
        <text x="65" y="100" fontSize="14" fontFamily="monospace" fontWeight="800" fill="hsl(var(--foreground))">방문(r, c)</text>
      </g>

      {/* The 2D Grid being visited */}
      <g transform="translate(420, 120)">
        {[0, 1, 2].map(r => (
          <g key={`row-${r}`}>
            {[0, 1, 2, 3].map(c => (
              <rect key={`col-${c}`} x={c * 60} y={r * 60} width="50" height="50" rx="8" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />
            ))}
          </g>
        ))}

        {/* The sweeping cursor animated across R,C */}
        <motion.rect width="50" height="50" rx="8" fill="url(#primary-grad)" stroke="#fff" strokeWidth="2" filter="url(#glow)"
           animate={{
              x: [0, 60, 120, 180, 0, 60, 120, 180, 0, 60, 120, 180],
              y: [0, 0, 0, 0, 60, 60, 60, 60, 120, 120, 120, 120],
           }}
           transition={{ duration: 6, ease: "linear", repeat: Infinity }}
        />

        {/* Tracking texts */}
        <motion.path d="M 235 25 L 260 25" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrow-head)"
           animate={{ y: [0, 0, 0, 0, 60, 60, 60, 60, 120, 120, 120, 120] }} transition={{ duration: 6, ease: "linear", repeat: Infinity }} />
        <text x="270" y="30" fontSize="14" fontWeight="800" fill="#6366f1">Outer r</text>

        <motion.path d="M 25 -10 L 25 -25" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-head)"
           animate={{ x: [0, 60, 120, 180, 0, 60, 120, 180, 0, 60, 120, 180] }} transition={{ duration: 6, ease: "linear", repeat: Infinity }} />
        <text x="25" y="-35" textAnchor="middle" fontSize="14" fontWeight="800" fill="#10b981">Inner c</text>
      </g>

    </svg>
  );
}

function MemoryLayout() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        Row-Major Memory (연연속된 캐시 라인)
      </text>

      {/* 2D Block */}
      <g transform="translate(150, 120)">
        <rect width="180" height="180" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" filter="url(#soft-shadow)" />
        <text x="90" y="-15" textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--muted-foreground))">C/C++, Python 등 2D 적재 공간</text>

        {[0, 1, 2].map(r => (
          <g key={`rm-${r}`}>
            {[0, 1, 2].map(c => {
               // Assign rows different visual weights/colors
               let fillGrad = r === 0 ? "url(#emerald-grad)" : r===1 ? "url(#primary-grad)" : "url(#destructive-grad)";
               return <rect key={`rmc-${c}`} x={12 + c * 54} y={15 + r * 54} width="48" height="42" rx="6" fill={fillGrad} opacity="0.5" stroke="#fff" strokeWidth="1" />;
            })}
          </g>
        ))}
      </g>

      <path d="M 360 210 L 440 210" stroke="hsl(var(--muted-foreground))" strokeWidth="4" markerEnd="url(#arrow-head)" strokeDasharray="8 6" />

      {/* 1D Flat line block */}
      <g transform="translate(480, 130)">
        <rect width="80" height="150" rx="12" fill="url(#emerald-grad)" stroke="#fff" strokeWidth="2" filter="url(#soft-shadow)" />
        <rect width="80" height="150" x="90" rx="12" fill="url(#primary-grad)" stroke="#fff" strokeWidth="2" filter="url(#soft-shadow)" />
        <rect width="80" height="150" x="180" rx="12" fill="url(#destructive-grad)" stroke="#fff" strokeWidth="2" filter="url(#soft-shadow)" />

        <text x="40" y="-10" textAnchor="middle" fontSize="14" fontWeight="800" fill="#10b981">Row 0</text>
        <text x="130" y="-10" textAnchor="middle" fontSize="14" fontWeight="800" fill="#6366f1">Row 1</text>
        <text x="220" y="-10" textAnchor="middle" fontSize="14" fontWeight="800" fill="#f43f5e">Row 2</text>
      </g>

      <rect x="150" y="350" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="380" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        가로(Row) 덩어리가 메모리에 일렬로 늘어서게 되어, <tspan fill="#6366f1" fontWeight="800">캐시 효율</tspan>이 극대화됩니다.
      </text>
    </svg>
  );
}

function SearchPattern() {
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full font-sans select-none" style={{ backgroundColor: "hsl(var(--background))" }}>
      <SharedDefs />
      <rect width="800" height="450" fill="url(#grid)" />

      <text x="400" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="hsl(var(--foreground))" letterSpacing="-0.02em">
        2차원 배열 탐색 패턴 (델타 배열, 상하좌우 탐색)
      </text>

      <g transform="translate(150, 100)" filter="url(#soft-shadow)">
        <rect width="500" height="240" rx="16" fill="url(#surface-grad)" stroke="hsl(var(--border))" strokeWidth="2" />

        {/* 5x5 Grid representing a map */}
        <g transform="translate(80, 20)">
          {[0, 1, 2, 3, 4].map(r => (
            <g key={`row-${r}`}>
              {[0, 1, 2, 3, 4].map(c => {
                 let fill = "hsl(var(--card))";
                 if(r===2 && c===2) fill = "#6366f1"; // Center current
                 if((Math.abs(r-2)===1 && c===2) || (Math.abs(c-2)===1 && r===2)) fill = "rgba(16, 185, 129, 0.2)"; // adjacent

                 return (
                  <rect key={`cell-${r}-${c}`} x={c * 40} y={r * 40} width="36" height="36" rx="6"
                        fill={fill} stroke={fill === "#6366f1" ? "none" : "hsl(var(--border))"} strokeWidth="1" />
                 );
              })}
            </g>
          ))}

          <text x="100" y="105" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#fff">현재</text>

          {/* Animated search directions (dx, dy) */}
          <motion.path d="M 100 80 L 100 40" stroke="#10b981" strokeWidth="4" markerEnd="url(#arrow-head)"
             initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }} />
          <motion.path d="M 100 115 L 100 155" stroke="#10b981" strokeWidth="4" markerEnd="url(#arrow-head)"
             initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
          <motion.path d="M 80 100 L 40 100" stroke="#10b981" strokeWidth="4" markerEnd="url(#arrow-head)"
             initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.0 }} />
          <motion.path d="M 115 100 L 155 100" stroke="#10b981" strokeWidth="4" markerEnd="url(#arrow-head)"
             initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }} />
        </g>

        {/* Code Explanation Segment */}
        <g transform="translate(320, 50)" fontSize="16" fontFamily="monospace" fill="hsl(var(--foreground))" fontWeight="600">
          <text x="0" y="20"><tspan fill="#6366f1">const</tspan> dx = [ <tspan fill="#f59e0b">0</tspan>, <tspan fill="#f59e0b">0</tspan>, <tspan fill="#f59e0b">-1</tspan>, <tspan fill="#f59e0b">1</tspan> ];</text>
          <text x="0" y="45"><tspan fill="#6366f1">const</tspan> dy = [ <tspan fill="#f59e0b">-1</tspan>, <tspan fill="#f59e0b">1</tspan>, <tspan fill="#f59e0b">0</tspan>, <tspan fill="#f59e0b">0</tspan> ];</text>

          <text x="0" y="85" fontSize="14" fill="hsl(var(--muted-foreground))">// 상, 하, 좌, 우 4방향 탐색 루프</text>
          <text x="0" y="110"><tspan fill="#6366f1">for</tspan> (<tspan fill="#6366f1">let</tspan> d=<tspan fill="#f59e0b">0</tspan>; d&lt;<tspan fill="#f59e0b">4</tspan>; d++) {'{'}</text>
          <text x="20" y="135"><tspan fill="#6366f1">let</tspan> nx = x + dx[d];</text>
          <text x="20" y="160"><tspan fill="#6366f1">let</tspan> ny = y + dy[d];</text>
          <text x="0" y="185">{'}'}</text>
        </g>
      </g>

      <rect x="150" y="360" width="500" height="50" rx="25" fill="hsl(var(--muted))" opacity="0.6" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="400" y="390" textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--foreground))">
        <tspan fill="#10b981" fontWeight="800">델타 배열(dx, dy)</tspan>을 사용하면 if문을 무한정 쓰지 않고 우아하게 사방을 탐색할 수 있습니다.
      </text>
    </svg>
  );
}

export const TwoDArraySupplementaryOptions = [
  LinearTransformation,
  NestedLoop,
  SearchPattern,
  MemoryLayout,
];
