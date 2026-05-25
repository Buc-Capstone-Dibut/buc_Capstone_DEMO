"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  PointerArrow,
  ArrayBox,
  colorTokens,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Helper: ring layout positions
function ringPositions(centerX: number, centerY: number, radius: number, count: number) {
  return Array.from({ length: count }).map((_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}

function curvedArrow(
  from: { x: number; y: number },
  to: { x: number; y: number },
  cx: number,
  cy: number,
  r: number,
  color: string,
  bulge = 14,
): React.JSX.Element {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist;
  const uy = dy / dist;
  const sx = from.x + ux * r;
  const sy = from.y + uy * r;
  const ex = to.x - ux * (r + 5);
  const ey = to.y - uy * (r + 5);
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const ox = mx - cx;
  const oy = my - cy;
  const od = Math.sqrt(ox * ox + oy * oy);
  const cpX = mx + (ox / od) * bulge;
  const cpY = my + (oy / od) * bulge;
  const tipX = ex;
  const tipY = ey;
  const baseX = tipX - ux * 7;
  const baseY = tipY - uy * 7;
  const perpX = -uy * 4;
  const perpY = ux * 4;
  return (
    <g>
      <path d={`M ${sx} ${sy} Q ${cpX} ${cpY} ${ex} ${ey}`} stroke={color} strokeWidth={1.8} fill="none" />
      <polygon
        points={`${tipX},${tipY} ${baseX + perpX},${baseY + perpY} ${baseX - perpX},${baseY - perpY}`}
        fill={color}
      />
    </g>
  );
}

// Supp 1: 끝과 시작의 결합 — 4 노드 원형
function CircularSupp1() {
  const W = 300;
  const H = 200;
  const cx = W / 2;
  const cy = H / 2 + 6;
  const radius = 64;
  const r = 18;
  const vals = ["A", "B", "C", "D"];
  const positions = ringPositions(cx, cy, radius, vals.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        끝과 시작의 결합
      </text>

      {positions.map((p, i) => {
        const next = positions[(i + 1) % positions.length];
        // 마지막(C → A)는 found 색으로 강조
        const isLast = i === positions.length - 1;
        const color = isLast ? colorTokens.found : colorTokens.pointer;
        return <g key={`e-${i}`}>{curvedArrow(p, next, cx, cy, r, color)}</g>;
      })}

      {vals.map((v, i) => (
        <NodeCircle
          key={v}
          cx={positions[i].x}
          cy={positions[i].y}
          r={r}
          value={v}
          status={i === vals.length - 1 || i === 0 ? "active" : "comparing"}
          showGlow={i === 0}
        />
      ))}

      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={9} fill={colorTokens.found} fontStyle="italic">
        D.next = A (끝 → 시작)
      </text>
    </svg>
  );
}

// Supp 2: 어디서든 전체 순회 — B에서 출발해 한 바퀴
function CircularSupp2() {
  const W = 300;
  const H = 200;
  const cx = W / 2;
  const cy = H / 2 + 6;
  const radius = 64;
  const r = 18;
  const vals = ["A", "B", "C", "D"];
  const positions = ringPositions(cx, cy, radius, vals.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        어디서든 전체 순회
      </text>

      {/* 모든 next 화살표는 active (B에서 시작한 1회 순회) */}
      {positions.map((p, i) => {
        const next = positions[(i + 1) % positions.length];
        return <g key={`e-${i}`}>{curvedArrow(p, next, cx, cy, r, colorTokens.active)}</g>;
      })}

      {vals.map((v, i) => (
        <NodeCircle
          key={v}
          cx={positions[i].x}
          cy={positions[i].y}
          r={r}
          value={v}
          status="active"
          showGlow={i === 1}
        />
      ))}

      {/* start B 라벨 */}
      <PointerArrow
        x={positions[1].x}
        y={positions[1].y - r - 4}
        label="start"
        color={colorTokens.found}
        direction="down"
      />

      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={9} fill={colorTokens.active} fontStyle="italic">
        B → C → D → A → B (1회 순회)
      </text>
    </svg>
  );
}

// Supp 3: 라운드 로빈 — 토큰이 시계방향 진행
function CircularSupp3() {
  const W = 300;
  const H = 200;
  const cx = W / 2;
  const cy = H / 2 + 6;
  const radius = 60;
  const r = 16;
  const vals = ["1", "2", "3", "4"];
  const positions = ringPositions(cx, cy, radius, vals.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        라운드 로빈 응용
      </text>

      {positions.map((p, i) => {
        const next = positions[(i + 1) % positions.length];
        return <g key={`e-${i}`}>{curvedArrow(p, next, cx, cy, r, colorTokens.pointer)}</g>;
      })}

      {vals.map((v, i) => (
        <NodeCircle
          key={v}
          cx={positions[i].x}
          cy={positions[i].y}
          r={r}
          value={v}
          status={i === 2 ? "found" : "comparing"}
          showGlow={i === 2}
        />
      ))}

      {/* token 위치 표시 */}
      <PointerArrow
        x={positions[2].x}
        y={positions[2].y - r - 4}
        label="token"
        color={colorTokens.found}
        direction="down"
      />

      {/* turn 라벨 — token PointerArrow(y=cy+22) 와 14px 이상 분리되도록 위로 이동 */}
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={10} fill={colorTokens.muted} fontFamily="ui-monospace, monospace">
        turn 3
      </text>
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill={colorTokens.muted} fontStyle="italic">
        스케줄러
      </text>

      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={9} fill={colorTokens.muted} fontStyle="italic">
        끝나면 다시 1번부터
      </text>
    </svg>
  );
}

// Supp 4: 무한 루프 위험 — 종료 조건 박스
function CircularSupp4() {
  const W = 300;
  const H = 200;
  const cx = W / 2 - 50;
  const cy = H / 2 + 10;
  const radius = 48;
  const r = 14;
  const vals = ["A", "B", "C", "D"];
  const positions = ringPositions(cx, cy, radius, vals.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        무한 루프 방지
      </text>

      {positions.map((p, i) => {
        const next = positions[(i + 1) % positions.length];
        return <g key={`e-${i}`}>{curvedArrow(p, next, cx, cy, r, colorTokens.pointer, 10)}</g>;
      })}

      {vals.map((v, i) => (
        <NodeCircle key={v} cx={positions[i].x} cy={positions[i].y} r={r} value={v} status="comparing" />
      ))}

      {/* 종료 조건 박스 */}
      <ArrayBox x={185} y={70} width={100} height={32} value="start = B" status="active" showGlow />
      <ArrayBox x={185} y={110} width={100} height={32} value="visited = 2" status="pointer" />

      {/* 종료 조건 라벨 */}
      <rect
        x={180}
        y={150}
        width={110}
        height={26}
        fill="none"
        stroke={colorTokens.found}
        strokeDasharray="4 3"
        strokeWidth={1.5}
        rx={4}
      />
      <text x={235} y={167} textAnchor="middle" fontSize={9} fill={colorTokens.found}>
        current === start?
      </text>
    </svg>
  );
}

export const CircularSupplementaryOptions = [CircularSupp1, CircularSupp2, CircularSupp3, CircularSupp4];
