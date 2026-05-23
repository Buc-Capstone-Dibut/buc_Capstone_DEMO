"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  NodeCircle,
  EdgeLine,
  colorTokens,
  edgeAt,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Supp 1: 패턴 검색의 결과 누적 — 텍스트 + 일치 화살표
function Fc3Supp1() {
  const W = 600;
  const H = 300;
  const text = "abracadabra";
  const matches = [0, 7];
  const patternLen = 4;
  const boxSize = 38;
  const gap = 4;
  const totalW = text.length * boxSize + (text.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const y = 80;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        패턴 검색 결과 누적
      </text>
      <text x={W / 2} y={48} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        결과 인덱스를 어디에 저장할지 → 후속 질의 성능 결정
      </text>

      {Array.from(text).map((ch, i) => {
        const x = startX + i * (boxSize + gap);
        const isMatch = matches.some((m) => i >= m && i < m + patternLen);
        return (
          <g key={i}>
            <ArrayBox
              x={x}
              y={y}
              width={boxSize}
              height={boxSize}
              value={ch}
              status={isMatch ? "found" : "default"}
              showGlow={isMatch}
            />
            <text x={x + boxSize / 2} y={y + boxSize + 14} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))" fontFamily="ui-monospace, monospace">
              {i}
            </text>
          </g>
        );
      })}

      {/* 화살표 → list (좌하단) */}
      <EdgeLine
        x1={startX + boxSize / 2}
        y1={y + boxSize + 30}
        x2={150}
        y2={230}
        status="pointer"
        arrow
        label="list"
      />
      {/* 화살표 → BST (우하단) */}
      <EdgeLine
        x1={startX + matches[1] * (boxSize + gap) + boxSize / 2}
        y1={y + boxSize + 30}
        x2={450}
        y2={230}
        status="pointer"
        arrow
        label="BST"
      />

      {/* list 박스 */}
      <ArrayBox x={110} y={230} width={80} height={40} value="[0, 7]" status="active" showGlow />
      {/* BST 박스 */}
      <ArrayBox x={410} y={230} width={80} height={40} value="0 / 7" status="comparing" showGlow />
    </svg>
  );
}

// Supp 2: 이중 연결 리스트 양방향 순회
function Fc3Supp2() {
  const W = 600;
  const H = 300;
  const items = [0, 7, 12, 18];
  const nodeR = 26;
  const gap = 110;
  const totalW = (items.length - 1) * gap + 2 * nodeR;
  const startX = (W - totalW) / 2;
  const y = 150;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        이중 연결 리스트 양방향 순회
      </text>
      <text x={W / 2} y={48} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        노드당 prev · next 두 포인터로 앞뒤 이동 자유
      </text>

      {items.map((v, i) => (
        <NodeCircle
          key={i}
          cx={startX + nodeR + i * gap}
          cy={y}
          r={nodeR}
          value={v}
          status="active"
          showGlow
        />
      ))}

      {/* edges: next (위) + prev (아래) */}
      {items.slice(0, -1).map((_, i) => {
        const x1 = startX + nodeR + i * gap + nodeR;
        const x2 = startX + nodeR + (i + 1) * gap - nodeR;
        return (
          <g key={i}>
            <EdgeLine
              x1={x1}
              y1={y - 8}
              x2={x2}
              y2={y - 8}
              status="pointer"
              arrow
              label="next"
            />
            <EdgeLine
              x1={x2}
              y1={y + 12}
              x2={x1}
              y2={y + 12}
              status="muted"
              arrow
              label="prev"
            />
          </g>
        );
      })}

      <text x={W / 2} y={H - 18} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        추가 비용: 노드당 prev 포인터 한 개.
      </text>
    </svg>
  );
}

// Supp 3: BST 삽입과 중위 순회
function Fc3Supp3() {
  const W = 600;
  const H = 300;
  // tree: root=8, left=4 (children 2, 6), right=12 (children 10, 15)
  const nodes = [
    { id: 0, cx: 300, cy: 80, val: 8, side: "root" },
    { id: 1, cx: 200, cy: 150, val: 4, side: "left" },
    { id: 2, cx: 400, cy: 150, val: 12, side: "right" },
    { id: 3, cx: 140, cy: 220, val: 2, side: "left" },
    { id: 4, cx: 260, cy: 220, val: 6, side: "left" },
    { id: 5, cx: 340, cy: 220, val: 10, side: "right" },
    { id: 6, cx: 460, cy: 220, val: 15, side: "right" },
  ];
  const edges: Array<[number, number]> = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6],
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={24} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        BST 삽입과 중위 순회
      </text>
      <text x={W / 2} y={44} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        좌측 = 작은 값 · 우측 = 큰 값. 중위 순회 → 오름차순
      </text>

      {edges.map(([a, b], i) => {
        const na = nodes[a];
        const nb = nodes[b];
        return (
          <EdgeLine
            key={i}
            {...edgeAt({ x: na.cx, y: na.cy }, { x: nb.cx, y: nb.cy }, 22, 22)}
            status="muted"
          />
        );
      })}
      {nodes.map((n) => {
        const status = n.side === "root" ? "active" : n.side === "left" ? "comparing" : "found";
        return (
          <NodeCircle key={n.id} cx={n.cx} cy={n.cy} r={22} value={n.val} status={status} showGlow />
        );
      })}

      <text x={W / 2} y={H - 16} textAnchor="middle" fontSize={11} fontStyle="italic" fill={colorTokens.found}>
        중위 순회 결과: 2 → 4 → 6 → 8 → 10 → 12 → 15 (정렬됨)
      </text>
    </svg>
  );
}

// Supp 4: 리스트 vs BST 비교 표
function Fc3Supp4() {
  const W = 600;
  const H = 300;
  const tableX = 60;
  const tableY = 80;
  const colW = 200;
  const rowH = 40;
  const rows = [
    { feature: "강점", list: "발견 순서 보존", bst: "정렬 순서 보존" },
    { feature: "약점", list: "정렬 질의 느림", bst: "삽입 순서 사라짐" },
    { feature: "대표 질의", list: "이전/다음 일치", bst: "범위·minmax 질의" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={28} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        자료구조 선택의 트레이드오프
      </text>

      {/* header */}
      <rect x={tableX} y={tableY} width={colW * 2 + 100} height={rowH} fill="hsl(var(--muted))" rx={6} />
      <text x={tableX + 50} y={tableY + rowH / 2 + 5} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">기준</text>
      <text x={tableX + 100 + colW / 2} y={tableY + rowH / 2 + 5} textAnchor="middle" fontSize={12} fontWeight={700} fill={colorTokens.active}>이중 연결 리스트</text>
      <text x={tableX + 100 + colW + colW / 2} y={tableY + rowH / 2 + 5} textAnchor="middle" fontSize={12} fontWeight={700} fill={colorTokens.comparing}>BST</text>

      {rows.map((r, i) => {
        const y = tableY + (i + 1) * rowH;
        return (
          <g key={i}>
            <rect x={tableX} y={y} width={colW * 2 + 100} height={rowH} fill="hsl(var(--background))" stroke="hsl(var(--border))" rx={4} />
            <text x={tableX + 50} y={y + rowH / 2 + 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">{r.feature}</text>
            <text x={tableX + 100 + colW / 2} y={y + rowH / 2 + 5} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))">{r.list}</text>
            <text x={tableX + 100 + colW + colW / 2} y={y + rowH / 2 + 5} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))">{r.bst}</text>
          </g>
        );
      })}

      <text x={W / 2} y={H - 16} textAnchor="middle" fontSize={11} fontStyle="italic" fill="hsl(var(--muted-foreground))">
        질의 유형이 데이터 구조 선택을 결정.
      </text>
    </svg>
  );
}

export const Fc3SupplementaryOptions = [Fc3Supp1, Fc3Supp2, Fc3Supp3, Fc3Supp4];
