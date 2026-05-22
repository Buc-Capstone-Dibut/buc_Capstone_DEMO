"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  colorTokens,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Tree positions (작은 트리 - 300x200 viewBox용)
const TREE_POS: Record<string, { x: number; y: number }> = {
  A: { x: 150, y: 55 },
  B: { x: 80, y: 115 },
  C: { x: 220, y: 115 },
  D: { x: 45, y: 170 },
  E: { x: 115, y: 170 },
  F: { x: 220, y: 170 },
};

const TREE_EDGES: Array<[string, string]> = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["B", "E"],
  ["C", "F"],
];

// Supp 1: 부모-자식 관계
function TreeBasicsSupp1() {
  const W = 300;
  const H = 200;
  const r = 16;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        부모-자식 계층
      </text>

      {TREE_EDGES.map(([p, c]) => (
        <EdgeLine
          key={`e-${p}-${c}`}
          x1={TREE_POS[p].x}
          y1={TREE_POS[p].y + r}
          x2={TREE_POS[c].x}
          y2={TREE_POS[c].y - r}
          status="active"
        />
      ))}

      {Object.entries(TREE_POS).map(([id, pos]) => (
        <NodeCircle key={id} cx={pos.x} cy={pos.y} r={r} value={id} status="comparing" />
      ))}

      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={9} fill={colorTokens.muted} fontStyle="italic">
        한 부모 - 여러 자식 (재귀 구조)
      </text>
    </svg>
  );
}

// Supp 2: 루트와 리프
function TreeBasicsSupp2() {
  const W = 300;
  const H = 200;
  const r = 16;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        루트와 리프
      </text>

      {TREE_EDGES.map(([p, c]) => (
        <EdgeLine
          key={`e-${p}-${c}`}
          x1={TREE_POS[p].x}
          y1={TREE_POS[p].y + r}
          x2={TREE_POS[c].x}
          y2={TREE_POS[c].y - r}
          status="muted"
        />
      ))}

      {Object.entries(TREE_POS).map(([id, pos]) => {
        const isRoot = id === "A";
        const isLeaf = ["D", "E", "F"].includes(id);
        const status = isRoot ? "found" : isLeaf ? "pointer" : "comparing";
        return (
          <NodeCircle
            key={id}
            cx={pos.x}
            cy={pos.y}
            r={r}
            value={id}
            status={status}
            showGlow={isRoot || isLeaf}
          />
        );
      })}

      {/* 라벨 */}
      <text x={TREE_POS.A.x + r + 6} y={TREE_POS.A.y + 4} fontSize={9} fill={colorTokens.found}>
        root
      </text>
      <text x={TREE_POS.D.x} y={TREE_POS.D.y + r + 12} textAnchor="middle" fontSize={9} fill={colorTokens.pointer}>
        leaf
      </text>
      <text x={TREE_POS.E.x} y={TREE_POS.E.y + r + 12} textAnchor="middle" fontSize={9} fill={colorTokens.pointer}>
        leaf
      </text>
      <text x={TREE_POS.F.x} y={TREE_POS.F.y + r + 12} textAnchor="middle" fontSize={9} fill={colorTokens.pointer}>
        leaf
      </text>
    </svg>
  );
}

// Supp 3: 깊이와 높이
function TreeBasicsSupp3() {
  const W = 300;
  const H = 200;
  const r = 14;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        깊이와 높이
      </text>

      {TREE_EDGES.map(([p, c]) => (
        <EdgeLine
          key={`e-${p}-${c}`}
          x1={TREE_POS[p].x}
          y1={TREE_POS[p].y + r}
          x2={TREE_POS[c].x}
          y2={TREE_POS[c].y - r}
          status="muted"
        />
      ))}

      {Object.entries(TREE_POS).map(([id, pos]) => (
        <NodeCircle key={id} cx={pos.x} cy={pos.y} r={r} value={id} status="comparing" />
      ))}

      {/* depth 라벨 (왼쪽) */}
      <text x={20} y={TREE_POS.A.y + 4} fontSize={9} fill={colorTokens.muted}>
        d=0
      </text>
      <text x={20} y={TREE_POS.B.y + 4} fontSize={9} fill={colorTokens.muted}>
        d=1
      </text>
      <text x={20} y={TREE_POS.D.y + 4} fontSize={9} fill={colorTokens.muted}>
        d=2
      </text>

      {/* height 라벨 (오른쪽 막대) */}
      <line
        x1={275}
        y1={TREE_POS.A.y}
        x2={275}
        y2={TREE_POS.D.y}
        stroke={colorTokens.active}
        strokeWidth={2}
      />
      <text x={283} y={(TREE_POS.A.y + TREE_POS.D.y) / 2 + 4} fontSize={9} fill={colorTokens.active}>
        h=2
      </text>
    </svg>
  );
}

// Supp 4: 트리 순회의 기본
function TreeBasicsSupp4() {
  const W = 300;
  const H = 200;
  const r = 14;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        순회 4종
      </text>

      {TREE_EDGES.map(([p, c]) => (
        <EdgeLine
          key={`e-${p}-${c}`}
          x1={TREE_POS[p].x}
          y1={TREE_POS[p].y + r}
          x2={TREE_POS[c].x}
          y2={TREE_POS[c].y - r}
          status="muted"
        />
      ))}

      {Object.entries(TREE_POS).map(([id, pos]) => (
        <NodeCircle key={id} cx={pos.x} cy={pos.y} r={r} value={id} status="comparing" />
      ))}

      {/* 4종 순회 결과 (텍스트로) */}
      <text x={20} y={140} fontSize={9} fill={colorTokens.active} fontFamily="ui-monospace, monospace">
        pre: A B D E C F
      </text>
      <text x={20} y={155} fontSize={9} fill={colorTokens.comparing} fontFamily="ui-monospace, monospace">
        in:  D B E A C F
      </text>
      <text x={20} y={170} fontSize={9} fill={colorTokens.found} fontFamily="ui-monospace, monospace">
        post:D E B F C A
      </text>
      <text x={20} y={185} fontSize={9} fill={colorTokens.pointer} fontFamily="ui-monospace, monospace">
        lvl: A B C D E F
      </text>
    </svg>
  );
}

export const TreeBasicsSupplementaryOptions = [
  TreeBasicsSupp1,
  TreeBasicsSupp2,
  TreeBasicsSupp3,
  TreeBasicsSupp4,
];
