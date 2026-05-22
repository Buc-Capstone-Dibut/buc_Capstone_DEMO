"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  ArrayBox,
  colorTokens,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Supp 1: 전략 선택 의사결정 트리
function Fc1Supp1() {
  const W = 600;
  const H = 300;
  // 3-level decision tree
  // root: "정렬?" → left=hash, right=binary
  // left subtree at depth 2: "검색 횟수 많음?" → linear, hash
  const nodes = [
    { id: 0, cx: 300, cy: 70, label: "정렬?", status: "active" as const },
    { id: 1, cx: 160, cy: 160, label: "검색 多?", status: "comparing" as const },
    { id: 2, cx: 440, cy: 160, label: "메모리 여유?", status: "comparing" as const },
    { id: 3, cx: 90, cy: 240, label: "Linear", status: "found" as const },
    { id: 4, cx: 230, cy: 240, label: "Hash", status: "found" as const },
    { id: 5, cx: 380, cy: 240, label: "Binary", status: "found" as const },
    { id: 6, cx: 510, cy: 240, label: "Hash", status: "found" as const },
  ];
  const edges: Array<{ a: number; b: number; label: string }> = [
    { a: 0, b: 1, label: "No" },
    { a: 0, b: 2, label: "Yes" },
    { a: 1, b: 3, label: "No" },
    { a: 1, b: 4, label: "Yes" },
    { a: 2, b: 5, label: "No" },
    { a: 2, b: 6, label: "Yes" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        전략 선택 의사결정 트리
      </text>

      {edges.map((e, i) => {
        const a = nodes.find((n) => n.id === e.a)!;
        const b = nodes.find((n) => n.id === e.b)!;
        return (
          <EdgeLine
            key={i}
            x1={a.cx}
            y1={a.cy + 18}
            x2={b.cx}
            y2={b.cy - 18}
            status="muted"
            label={e.label}
          />
        );
      })}
      {nodes.map((n) => (
        <NodeCircle key={n.id} cx={n.cx} cy={n.cy} r={28} value={n.label.length > 4 ? n.label.slice(0, 4) : n.label} status={n.status} showGlow={n.status === "found"} />
      ))}

      <text x={W / 2} y={H - 14} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        정렬 여부 · 검색 빈도 · 메모리 여유 → 분기점 3개
      </text>
    </svg>
  );
}

// Supp 2: 비교 횟수 막대 비교
function Fc1Supp2() {
  const W = 600;
  const H = 300;
  // 3 bars: linear=4, binary=3, hash=1
  const bars = [
    { label: "Linear", count: 4, color: colorTokens.comparing },
    { label: "Binary", count: 3, color: colorTokens.active },
    { label: "Hash", count: 1, color: colorTokens.found },
  ];
  const barW = 90;
  const gap = 50;
  const totalW = bars.length * barW + (bars.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const baseY = 230;
  const unit = 28; // px per comparison

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={28} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        비교 횟수 비교 (N = 10, target = 9)
      </text>

      {/* axis */}
      <line x1={startX - 20} y1={baseY} x2={startX + totalW + 20} y2={baseY} stroke="hsl(var(--border))" strokeWidth={1.5} />

      {bars.map((b, i) => {
        const x = startX + i * (barW + gap);
        const h = b.count * unit;
        const y = baseY - h;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={b.color}
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
              rx={4}
            />
            <text x={x + barW / 2} y={baseY + 20} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
              {b.label}
            </text>
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(var(--foreground))">
              {b.count} 회
            </text>
          </g>
        );
      })}

      <text x={W / 2} y={H - 14} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        평균 시나리오 기준. 충돌·정렬 비용은 별도로 고려 필요.
      </text>
    </svg>
  );
}

// Supp 3: 정렬 전제 및 손익분기점 그래프
function Fc1Supp3() {
  const W = 600;
  const H = 300;
  const originX = 80;
  const originY = 230;
  const axisW = 460;
  const axisH = 160;

  // 손익분기점: 검색 횟수 K가 적으면 Linear, 많으면 Binary
  // 곡선 두 개
  const linearPath = `M ${originX} ${originY - 10} L ${originX + axisW} ${originY - 90}`; // 선형 증가
  const binaryPath = `M ${originX} ${originY - 40} Q ${originX + 100} ${originY - 50} ${originX + axisW} ${originY - 60}`; // 거의 평탄

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={28} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        정렬 전제 · 손익분기점
      </text>
      <text x={W / 2} y={50} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        반복 검색 K 가 많을수록 이진/해시 이득이 커짐
      </text>

      {/* axes */}
      <line x1={originX} y1={originY} x2={originX + axisW} y2={originY} stroke="hsl(var(--border))" strokeWidth={1.5} />
      <line x1={originX} y1={originY} x2={originX} y2={originY - axisH} stroke="hsl(var(--border))" strokeWidth={1.5} />

      {/* labels */}
      <text x={originX + axisW / 2} y={originY + 22} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        검색 횟수 K
      </text>
      <text x={originX - 30} y={originY - axisH / 2} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))" transform={`rotate(-90, ${originX - 30}, ${originY - axisH / 2})`}>
        총 비용
      </text>

      {/* curves */}
      <path d={linearPath} fill="none" stroke={colorTokens.comparing} strokeWidth={2.5} />
      <path d={binaryPath} fill="none" stroke={colorTokens.active} strokeWidth={2.5} />

      {/* legends */}
      <g transform={`translate(${originX + axisW - 130}, ${originY - axisH + 10})`}>
        <line x1={0} y1={0} x2={20} y2={0} stroke={colorTokens.comparing} strokeWidth={2.5} />
        <text x={26} y={4} fontSize={11} fill="hsl(var(--foreground))">Linear (N×K)</text>
        <line x1={0} y1={18} x2={20} y2={18} stroke={colorTokens.active} strokeWidth={2.5} />
        <text x={26} y={22} fontSize={11} fill="hsl(var(--foreground))">Binary (N log N + K log N)</text>
      </g>

      {/* breakeven 표시 */}
      <line x1={originX + 180} y1={originY} x2={originX + 180} y2={originY - 110} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 3" />
      <text x={originX + 180} y={originY + 36} textAnchor="middle" fontSize={11} fontWeight={600} fill={colorTokens.found}>
        breakeven
      </text>
    </svg>
  );
}

// Supp 4: 해시 충돌 시 성능 저하 — 버킷 + 길어진 체인
function Fc1Supp4() {
  const W = 600;
  const H = 300;
  const bucketW = 60;
  const bucketH = 56;
  const buckets = 4;
  const gap = 30;
  const totalW = buckets * bucketW + (buckets - 1) * gap;
  const startX = (W - totalW) / 2;
  const y = 90;

  // bucket → chain lengths (충돌 시연)
  const chains = [
    [11],
    [3, 9],
    [6],
    [2, 5, 7, 1], // 가장 긴 체인
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={28} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        해시 충돌 시 성능 저하
      </text>
      <text x={W / 2} y={50} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        체인이 길어질수록 lookup이 O(N)에 수렴
      </text>

      {chains.map((chain, b) => {
        const x = startX + b * (bucketW + gap);
        return (
          <g key={b}>
            <ArrayBox
              x={x}
              y={y}
              width={bucketW}
              height={bucketH}
              value={`h=${b}`}
              status={chain.length >= 3 ? "comparing" : "default"}
              showGlow={chain.length >= 3}
            />
            {chain.map((v, ci) => {
              const cy = y + bucketH + 28 + ci * 36;
              return (
                <g key={ci}>
                  <NodeCircle
                    cx={x + bucketW / 2}
                    cy={cy}
                    r={14}
                    value={v}
                    status={chain.length >= 3 ? "comparing" : "active"}
                  />
                  <EdgeLine
                    x1={x + bucketW / 2}
                    y1={ci === 0 ? y + bucketH : cy - 14 - 22}
                    x2={x + bucketW / 2}
                    y2={cy - 14}
                    status="muted"
                  />
                </g>
              );
            })}
          </g>
        );
      })}

      <text x={W / 2} y={H - 12} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        해시 함수의 품질이 곧 lookup 성능. 적절한 버킷 크기와 분산이 핵심.
      </text>
    </svg>
  );
}

export const Fc1SupplementaryOptions = [Fc1Supp1, Fc1Supp2, Fc1Supp3, Fc1Supp4];
