"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  PointerArrow,
  ArrayBox,
  colorTokens,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Supp 1: 양방향 포인터 구조 — next 위쪽, prev 아래쪽
function DoublySupp1() {
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

      <text x={W / 2} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        prev / next 양방향 포인터
      </text>

      {/* next 위쪽 */}
      {positions.slice(0, -1).map((p, i) => (
        <EdgeLine
          key={`n-${i}`}
          x1={p.x + r}
          y1={cy - 8}
          x2={positions[i + 1].x - r}
          y2={cy - 8}
          status="active"
          arrow
        />
      ))}

      {/* prev 아래쪽 (반대 방향) */}
      {positions.slice(1).map((p, i) => (
        <EdgeLine
          key={`p-${i}`}
          x1={p.x - r}
          y1={cy + 8}
          x2={positions[i].x + r}
          y2={cy + 8}
          status="pointer"
          arrow
        />
      ))}

      {positions.map((p) => (
        <NodeCircle key={p.val} cx={p.x} cy={cy} r={r} value={p.val} status="comparing" />
      ))}

      <text x={W / 2} y={cy - r - 12} textAnchor="middle" fontSize={9} fill={colorTokens.active}>
        next →
      </text>
      <text x={W / 2} y={cy + r + 20} textAnchor="middle" fontSize={9} fill={colorTokens.pointer}>
        ← prev
      </text>
    </svg>
  );
}

// Supp 2: head와 tail 이중 진입점
function DoublySupp2() {
  const W = 300;
  const H = 200;
  const r = 22;
  const cy = 120;
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
        head / tail 이중 진입점
      </text>

      {positions.slice(0, -1).map((p, i) => (
        <EdgeLine
          key={`n-${i}`}
          x1={p.x + r}
          y1={cy - 8}
          x2={positions[i + 1].x - r}
          y2={cy - 8}
          status="active"
          arrow
        />
      ))}
      {positions.slice(1).map((p, i) => (
        <EdgeLine
          key={`p-${i}`}
          x1={p.x - r}
          y1={cy + 8}
          x2={positions[i].x + r}
          y2={cy + 8}
          status="pointer"
          arrow
        />
      ))}

      {positions.map((p, i) => {
        const isEdge = i === 0 || i === positions.length - 1;
        return (
          <NodeCircle
            key={p.val}
            cx={p.x}
            cy={cy}
            r={r}
            value={p.val}
            status={isEdge ? "active" : "comparing"}
            showGlow={isEdge}
          />
        );
      })}

      <PointerArrow
        x={positions[0].x}
        y={cy - r - 6}
        label="head"
        color={colorTokens.found}
        direction="down"
      />
      <PointerArrow
        x={positions[positions.length - 1].x}
        y={cy - r - 6}
        label="tail"
        color={colorTokens.pointer}
        direction="down"
      />

      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize={10} fill={colorTokens.muted} fontStyle="italic">
        앞쪽·뒤쪽 모두 O(1) 접근
      </text>
    </svg>
  );
}

// Supp 3: O(1) 임의 노드 삭제 — B 빼고 A↔C
function DoublySupp3() {
  const W = 300;
  const H = 200;
  const r = 22;
  const cy = 120;
  const positions: Record<string, { x: number; y: number }> = {
    A: { x: 70, y: cy },
    B: { x: 150, y: cy },
    C: { x: 230, y: cy },
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        O(1) 임의 노드 삭제
      </text>

      {/* 새 양방향 직결 (활성) - 호 형태 */}
      <path
        d={`M ${positions.A.x + r} ${cy - 4} Q ${(positions.A.x + positions.C.x) / 2} ${cy - 40} ${positions.C.x - r} ${cy - 4}`}
        stroke={colorTokens.active}
        strokeWidth={2}
        fill="none"
      />
      <polygon
        points={`${positions.C.x - r},${cy - 4} ${positions.C.x - r - 8},${cy - 10} ${positions.C.x - r - 8},${cy + 2}`}
        fill={colorTokens.active}
      />
      <path
        d={`M ${positions.C.x - r} ${cy + 4} Q ${(positions.A.x + positions.C.x) / 2} ${cy + 40} ${positions.A.x + r} ${cy + 4}`}
        stroke={colorTokens.active}
        strokeWidth={2}
        fill="none"
      />
      <polygon
        points={`${positions.A.x + r},${cy + 4} ${positions.A.x + r + 8},${cy + 10} ${positions.A.x + r + 8},${cy - 2}`}
        fill={colorTokens.active}
      />

      {/* B는 muted (삭제됨) */}
      <NodeCircle cx={positions.B.x} cy={positions.B.y} r={r} value="B" status="muted" />
      {/* B에 X 표시 */}
      <text
        x={positions.B.x}
        y={positions.B.y + 6}
        textAnchor="middle"
        fontSize={26}
        fill={colorTokens.muted}
        fontWeight={700}
      >
        ✕
      </text>

      <NodeCircle cx={positions.A.x} cy={positions.A.y} r={r} value="A" status="found" showGlow />
      <NodeCircle cx={positions.C.x} cy={positions.C.y} r={r} value="C" status="found" showGlow />

      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize={10} fill={colorTokens.muted} fontStyle="italic">
        prev/next로 양옆 즉시 연결
      </text>
    </svg>
  );
}

// Supp 4: 추가 메모리 비용 — 단일 vs 이중 비교
function DoublySupp4() {
  const W = 300;
  const H = 200;
  const boxH = 36;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        추가 메모리 비용 비교
      </text>

      {/* 단일 노드: data + next */}
      <text x={60} y={60} fontSize={10} fill={colorTokens.muted}>
        단일 (singly):
      </text>
      <ArrayBox x={60} y={68} width={60} height={boxH} value="data" status="comparing" />
      <ArrayBox x={122} y={68} width={60} height={boxH} value="next" status="pointer" />

      {/* 이중 노드: prev + data + next */}
      <text x={60} y={130} fontSize={10} fill={colorTokens.muted}>
        이중 (doubly):
      </text>
      <ArrayBox x={60} y={138} width={50} height={boxH} value="prev" status="pointer" />
      <ArrayBox x={112} y={138} width={50} height={boxH} value="data" status="comparing" />
      <ArrayBox x={164} y={138} width={50} height={boxH} value="next" status="pointer" />

      <text x={236} y={92} fontSize={10} fill={colorTokens.active}>
        2 fields
      </text>
      <text x={236} y={162} fontSize={10} fill={colorTokens.active}>
        3 fields
      </text>

      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={10} fill={colorTokens.muted} fontStyle="italic">
        포인터 +1 의 메모리 trade-off
      </text>
    </svg>
  );
}

export const DoublySupplementaryOptions = [DoublySupp1, DoublySupp2, DoublySupp3, DoublySupp4];
