"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  PointerArrow,
  colorTokens,
  edgeAt,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Supp 1: 노드와 head 진입점 — head 라벨이 첫 노드 위에서 가리키고 next 화살표 연결
function SinglySupp1() {
  const W = 300;
  const H = 200;
  const r = 22;
  const cy = 110;
  const positions = [
    { x: 80, val: "A" },
    { x: 160, val: "B" },
    { x: 240, val: "C" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        head 단일 진입점
      </text>

      {positions.slice(0, -1).map((p, i) => (
        <EdgeLine
          key={`e-${i}`}
          x1={p.x + r}
          y1={cy}
          x2={positions[i + 1].x - r}
          y2={cy}
          status="pointer"
          arrow
        />
      ))}

      {positions.map((p) => (
        <NodeCircle key={p.val} cx={p.x} cy={cy} r={r} value={p.val} status="active" showGlow={p.val === "A"} />
      ))}

      <PointerArrow
        x={positions[0].x}
        y={cy - r - 6}
        label="head"
        color={colorTokens.found}
        direction="down"
      />

      <text x={W / 2} y={H - 12} textAnchor="middle" fontSize={10} fill={colorTokens.muted} fontStyle="italic">
        next 포인터로 한 방향 연결
      </text>
    </svg>
  );
}

// Supp 2: 중간 삽입의 포인터 재배선 — B/C 사이에 X 들어가는 모습
function SinglySupp2() {
  const W = 300;
  const H = 200;
  const r = 20;
  const cy = 130;
  const positions: Record<string, { x: number; y: number }> = {
    A: { x: 60, y: cy },
    B: { x: 140, y: cy },
    X: { x: 195, y: 70 },
    C: { x: 240, y: cy },
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        중간 삽입: 두 포인터 재배선
      </text>

      {/* 기존 B → C 점선 (재배선 전) */}
      <EdgeLine
        x1={positions.B.x + r}
        y1={cy + 12}
        x2={positions.C.x - r}
        y2={cy + 12}
        status="muted"
      />
      <text x={(positions.B.x + positions.C.x) / 2} y={cy + 32} textAnchor="middle" fontSize={9} fill={colorTokens.muted}>
        기존 (끊김)
      </text>

      {/* A → B (그대로) */}
      <EdgeLine
        x1={positions.A.x + r}
        y1={cy}
        x2={positions.B.x - r}
        y2={cy}
        status="pointer"
        arrow
      />

      {/* B → X (새 active) */}
      <EdgeLine
        {...edgeAt(positions.B, positions.X, r, r)}
        status="active"
        arrow
      />

      {/* X → C (새 active) */}
      <EdgeLine
        {...edgeAt(positions.X, positions.C, r, r)}
        status="active"
        arrow
      />

      <NodeCircle cx={positions.A.x} cy={positions.A.y} r={r} value="A" status="comparing" />
      <NodeCircle cx={positions.B.x} cy={positions.B.y} r={r} value="B" status="active" showGlow />
      <NodeCircle cx={positions.X.x} cy={positions.X.y} r={r} value="X" status="found" showGlow />
      <NodeCircle cx={positions.C.x} cy={positions.C.y} r={r} value="C" status="active" showGlow />

      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize={10} fill={colorTokens.muted} fontStyle="italic">
        B.next=X, X.next=C 두 줄로 O(1)
      </text>
    </svg>
  );
}

// Supp 3: 단방향 순회 제약 — next OK, prev X
function SinglySupp3() {
  const W = 300;
  const H = 200;
  const r = 22;
  const cy = 100;
  const positions = [
    { x: 80, val: "A" },
    { x: 160, val: "B" },
    { x: 240, val: "C" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        단방향 순회: next만 가능
      </text>

      {/* forward arrows */}
      {positions.slice(0, -1).map((p, i) => (
        <EdgeLine
          key={`f-${i}`}
          x1={p.x + r}
          y1={cy - 6}
          x2={positions[i + 1].x - r}
          y2={cy - 6}
          status="active"
          arrow
        />
      ))}

      {/* prev 방향 점선 + X */}
      {positions.slice(1).map((p, i) => {
        const from = p.x - r;
        const to = positions[i].x + r;
        const midX = (from + to) / 2;
        return (
          <g key={`b-${i}`}>
            <line
              x1={from}
              y1={cy + 14}
              x2={to}
              y2={cy + 14}
              stroke={colorTokens.muted}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <text x={midX} y={cy + 18} textAnchor="middle" fontSize={14} fontWeight={700} fill={colorTokens.muted}>
              ×
            </text>
          </g>
        );
      })}

      {positions.map((p) => (
        <NodeCircle key={p.val} cx={p.x} cy={cy} r={r} value={p.val} status="comparing" />
      ))}

      <text x={W / 2} y={cy + 50} textAnchor="middle" fontSize={10} fill={colorTokens.active}>
        forward (next): OK
      </text>
      <text x={W / 2} y={cy + 66} textAnchor="middle" fontSize={10} fill={colorTokens.muted}>
        backward (prev): 불가능
      </text>
    </svg>
  );
}

// Supp 4: 임의 접근 O(N) — 인덱스 카운터
function SinglySupp4() {
  const W = 300;
  const H = 200;
  const r = 20;
  const cy = 100;
  // 4번째 노드 cx=250 으로 좌측 이동: target 라벨이 viewBox(W=300) 우측 가장자리에서 잘리지 않도록 여유 확보
  const positions = [
    { x: 50, val: "A", idx: 0 },
    { x: 115, val: "B", idx: 1 },
    { x: 180, val: "C", idx: 2 },
    { x: 250, val: "D", idx: 3 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        임의 접근 O(N) 비용
      </text>

      {positions.slice(0, -1).map((p, i) => (
        <EdgeLine
          key={`e-${i}`}
          x1={p.x + r}
          y1={cy}
          x2={positions[i + 1].x - r}
          y2={cy}
          status="pointer"
          arrow
        />
      ))}

      {positions.map((p) => (
        <NodeCircle key={p.val} cx={p.x} cy={cy} r={r} value={p.val} status="comparing" />
      ))}

      {/* 인덱스 카운터 (각 노드 아래) */}
      {positions.map((p) => (
        <text
          key={`idx-${p.idx}`}
          x={p.x}
          y={cy + r + 18}
          textAnchor="middle"
          fontSize={10}
          fill={colorTokens.muted}
          fontFamily="ui-monospace, monospace"
        >
          step={p.idx}
        </text>
      ))}

      <PointerArrow
        x={positions[3].x}
        y={cy - r - 6}
        label="target"
        color={colorTokens.found}
        direction="down"
      />

      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize={10} fill={colorTokens.muted} fontStyle="italic">
        k번째 노드 = head부터 k번 next 따라감
      </text>
    </svg>
  );
}

export const SinglySupplementaryOptions = [SinglySupp1, SinglySupp2, SinglySupp3, SinglySupp4];
