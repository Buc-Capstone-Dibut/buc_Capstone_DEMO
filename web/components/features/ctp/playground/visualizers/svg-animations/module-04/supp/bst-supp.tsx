"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  ArrayBox,
  colorTokens,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Supp 1: BST 불변식
function BstSupp1() {
  const W = 300;
  const H = 200;
  const r = 18;
  const POS = {
    root: { x: 150, y: 70 },
    left: { x: 90, y: 140 },
    right: { x: 210, y: 140 },
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        BST 불변식 (left &lt; parent &lt; right)
      </text>

      <EdgeLine x1={POS.root.x - 6} y1={POS.root.y + r - 4} x2={POS.left.x + 6} y2={POS.left.y - r + 4} status="active" />
      <EdgeLine x1={POS.root.x + 6} y1={POS.root.y + r - 4} x2={POS.right.x - 6} y2={POS.right.y - r + 4} status="active" />

      <NodeCircle cx={POS.root.x} cy={POS.root.y} r={r} value={5} status="found" showGlow />
      <NodeCircle cx={POS.left.x} cy={POS.left.y} r={r} value={3} status="comparing" />
      <NodeCircle cx={POS.right.x} cy={POS.right.y} r={r} value={7} status="comparing" />

      {/* 부등식 라벨 */}
      <text x={POS.left.x} y={POS.left.y + r + 14} textAnchor="middle" fontSize={10} fill={colorTokens.muted}>
        3 &lt; 5
      </text>
      <text x={POS.right.x} y={POS.right.y + r + 14} textAnchor="middle" fontSize={10} fill={colorTokens.muted}>
        7 &gt; 5
      </text>
      <text x={POS.root.x} y={POS.root.y - r - 6} textAnchor="middle" fontSize={9} fill={colorTokens.found}>
        root
      </text>

      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={9} fill={colorTokens.muted} fontStyle="italic">
        모든 노드에서 항상 성립
      </text>
    </svg>
  );
}

// Supp 2: 삽입과 검색의 공통 경로
function BstSupp2() {
  const W = 300;
  const H = 200;
  const r = 18;
  const POS = {
    root: { x: 150, y: 70 },
    left: { x: 90, y: 140 },
    right: { x: 210, y: 140 },
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        삽입·검색 공통 경로
      </text>

      <EdgeLine x1={POS.root.x - 6} y1={POS.root.y + r - 4} x2={POS.left.x + 6} y2={POS.left.y - r + 4} status="muted" />
      <EdgeLine x1={POS.root.x + 6} y1={POS.root.y + r - 4} x2={POS.right.x - 6} y2={POS.right.y - r + 4} status="active" />

      <NodeCircle cx={POS.root.x} cy={POS.root.y} r={r} value={5} status="active" showGlow />
      <NodeCircle cx={POS.left.x} cy={POS.left.y} r={r} value={3} status="comparing" />
      <NodeCircle cx={POS.right.x} cy={POS.right.y} r={r} value={7} status="found" showGlow />

      {/* 7 탐색 경로 라벨 */}
      <text x={W / 2 + 24} y={108} fontSize={10} fill={colorTokens.active} fontFamily="ui-monospace, monospace">
        7 &gt; 5 → right
      </text>

      <text x={W / 2} y={H - 22} textAnchor="middle" fontSize={9} fill={colorTokens.muted} fontStyle="italic">
        같은 길로 검색 / 같은 길로 삽입
      </text>
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={9} fill={colorTokens.muted} fontStyle="italic">
        null 만나면 → 실패 또는 삽입 위치
      </text>
    </svg>
  );
}

// Supp 3: 중위 순회 = 정렬 출력
function BstSupp3() {
  const W = 300;
  const H = 200;
  const r = 16;
  const POS = {
    root: { x: 150, y: 60 },
    left: { x: 95, y: 120 },
    right: { x: 205, y: 120 },
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={18} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        중위 순회 = 오름차순 출력
      </text>

      <EdgeLine x1={POS.root.x - 6} y1={POS.root.y + r - 4} x2={POS.left.x + 6} y2={POS.left.y - r + 4} status="active" />
      <EdgeLine x1={POS.root.x + 6} y1={POS.root.y + r - 4} x2={POS.right.x - 6} y2={POS.right.y - r + 4} status="active" />

      <NodeCircle cx={POS.root.x} cy={POS.root.y} r={r} value={5} status="comparing" />
      <NodeCircle cx={POS.left.x} cy={POS.left.y} r={r} value={3} status="comparing" />
      <NodeCircle cx={POS.right.x} cy={POS.right.y} r={r} value={7} status="comparing" />

      {/* 정렬된 배열 표시 (하단) */}
      <ArrayBox x={84} y={158} width={36} height={28} value={3} status="found" showGlow />
      <ArrayBox x={132} y={158} width={36} height={28} value={5} status="found" showGlow />
      <ArrayBox x={180} y={158} width={36} height={28} value={7} status="found" showGlow />

      <text x={W / 2} y={150} textAnchor="middle" fontSize={9} fill={colorTokens.found} fontStyle="italic">
        in-order: [3, 5, 7]
      </text>
    </svg>
  );
}

// Supp 4: 균형 트리의 필요성
function BstSupp4() {
  const W = 300;
  const H = 200;
  const r = 12;

  // 왼쪽: 한쪽 기울어진 BST (O(N))
  const SKEW: Record<number, { x: number; y: number }> = {
    1: { x: 50, y: 56 },
    2: { x: 70, y: 96 },
    3: { x: 90, y: 136 },
    4: { x: 110, y: 176 },
  };

  // 오른쪽: 균형 잡힌 BST (O(log N))
  const BAL: Record<number, { x: number; y: number }> = {
    3: { x: 220, y: 60 },
    1: { x: 185, y: 120 },
    4: { x: 255, y: 120 },
    2: { x: 200, y: 180 },
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />

      <text x={W / 2} y={18} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
        균형 트리의 필요성
      </text>

      {/* SKEW edges */}
      <EdgeLine x1={SKEW[1].x + 4} y1={SKEW[1].y + r - 2} x2={SKEW[2].x - 4} y2={SKEW[2].y - r + 2} status="muted" />
      <EdgeLine x1={SKEW[2].x + 4} y1={SKEW[2].y + r - 2} x2={SKEW[3].x - 4} y2={SKEW[3].y - r + 2} status="muted" />
      <EdgeLine x1={SKEW[3].x + 4} y1={SKEW[3].y + r - 2} x2={SKEW[4].x - 4} y2={SKEW[4].y - r + 2} status="muted" />

      <NodeCircle cx={SKEW[1].x} cy={SKEW[1].y} r={r} value={1} status="comparing" />
      <NodeCircle cx={SKEW[2].x} cy={SKEW[2].y} r={r} value={2} status="comparing" />
      <NodeCircle cx={SKEW[3].x} cy={SKEW[3].y} r={r} value={3} status="comparing" />
      <NodeCircle cx={SKEW[4].x} cy={SKEW[4].y} r={r} value={4} status="comparing" />

      <text x={70} y={42} textAnchor="middle" fontSize={9} fill={colorTokens.muted}>
        기울어진 BST
      </text>
      <text x={70} y={H - 6} textAnchor="middle" fontSize={9} fontWeight={700} fill={colorTokens.muted}>
        O(N)
      </text>

      {/* BAL edges */}
      <EdgeLine x1={BAL[3].x - 4} y1={BAL[3].y + r - 2} x2={BAL[1].x + 4} y2={BAL[1].y - r + 2} status="active" />
      <EdgeLine x1={BAL[3].x + 4} y1={BAL[3].y + r - 2} x2={BAL[4].x - 4} y2={BAL[4].y - r + 2} status="active" />
      <EdgeLine x1={BAL[1].x + 4} y1={BAL[1].y + r - 2} x2={BAL[2].x - 4} y2={BAL[2].y - r + 2} status="active" />

      <NodeCircle cx={BAL[3].x} cy={BAL[3].y} r={r} value={3} status="active" showGlow />
      <NodeCircle cx={BAL[1].x} cy={BAL[1].y} r={r} value={1} status="active" />
      <NodeCircle cx={BAL[4].x} cy={BAL[4].y} r={r} value={4} status="active" />
      <NodeCircle cx={BAL[2].x} cy={BAL[2].y} r={r} value={2} status="active" />

      <text x={220} y={42} textAnchor="middle" fontSize={9} fill={colorTokens.active}>
        균형 BST
      </text>
      <text x={220} y={H - 6} textAnchor="middle" fontSize={9} fontWeight={700} fill={colorTokens.active}>
        O(log N)
      </text>
    </svg>
  );
}

export const BstSupplementaryOptions = [BstSupp1, BstSupp2, BstSupp3, BstSupp4];
