"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  EdgeLine,
  colorTokens,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Supp 1: 재귀 호출의 스택 표현 (좌: 코드 / 우: 스택 누적)
function Fc2Supp1() {
  const W = 600;
  const H = 300;
  const codeX = 40;
  const stackX = 380;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={28} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        재귀 호출 = LIFO 스택
      </text>
      <text x={W / 2} y={50} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        호출 시 push · 반환 시 pop. 동일한 메커니즘.
      </text>

      {/* 코드 박스 (좌) */}
      <rect x={codeX} y={80} width={300} height={180} fill="hsl(var(--muted))" stroke="hsl(var(--border))" rx={6} />
      <text x={codeX + 10} y={100} fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">function f(n)</text>
      <text x={codeX + 18} y={122} fontSize={11} fill="hsl(var(--foreground))">if n &lt;= 1 return 1</text>
      <text x={codeX + 18} y={142} fontSize={11} fontWeight={700} fill={colorTokens.active}>return f(n-1) + f(n-2)</text>

      <text x={codeX + 10} y={180} fontSize={11} fill="hsl(var(--muted-foreground))">call: f(3)</text>
      <text x={codeX + 10} y={198} fontSize={11} fill="hsl(var(--muted-foreground))">→ f(2) push</text>
      <text x={codeX + 10} y={216} fontSize={11} fill="hsl(var(--muted-foreground))">→ f(1) push (base) → pop</text>
      <text x={codeX + 10} y={234} fontSize={11} fill="hsl(var(--muted-foreground))">→ f(0) push (base) → pop</text>
      <text x={codeX + 10} y={252} fontSize={11} fill="hsl(var(--muted-foreground))">→ f(2) pop ...</text>

      {/* 스택 시각화 (우) */}
      <text x={stackX + 90} y={100} textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">Call Stack</text>
      {["f(3)", "f(2)", "f(1)"].map((label, i) => (
        <ArrayBox
          key={i}
          x={stackX}
          y={240 - i * 44}
          width={180}
          height={36}
          value={label}
          status={i === 2 ? "active" : "comparing"}
          showGlow={i === 2}
        />
      ))}
      <text x={stackX + 90} y={228 + 4} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">↑ TOP</text>
    </svg>
  );
}

// Supp 2: 분할 정복 호출 트리
function Fc2Supp2() {
  const W = 600;
  const H = 300;
  // 5글자 라벨 "(0,5)" 가 r=22 안에 안 들어감 → ArrayBox(직사각형 70×36) 로 교체.
  // grandchild cx 간격 60→70px 확장 (Important #16) 으로 노드 사이 여유 확보
  const nodes = [
    { id: 0, cx: 300, cy: 75, label: "(0,5)" },
    { id: 1, cx: 180, cy: 155, label: "(0,2)" },
    { id: 2, cx: 420, cy: 155, label: "(3,5)" },
    { id: 3, cx: 100, cy: 235, label: "(0,0)" },
    { id: 4, cx: 260, cy: 235, label: "(2,2)" },
    { id: 5, cx: 350, cy: 235, label: "(3,3)" },
    { id: 6, cx: 500, cy: 235, label: "(5,5)" },
  ];
  const edges: Array<[number, number]> = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6],
  ];
  const boxW = 70;
  const boxH = 36;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        분할 정복 호출 트리
      </text>

      {edges.map(([a, b], i) => {
        const na = nodes[a];
        const nb = nodes[b];
        return (
          <EdgeLine
            key={i}
            x1={na.cx}
            y1={na.cy + boxH / 2}
            x2={nb.cx}
            y2={nb.cy - boxH / 2}
            status="muted"
            arrow
          />
        );
      })}
      {nodes.map((n) => (
        <ArrayBox
          key={n.id}
          x={n.cx - boxW / 2}
          y={n.cy - boxH / 2}
          width={boxW}
          height={boxH}
          value={n.label}
          status={n.id === 0 ? "active" : n.id <= 2 ? "comparing" : "found"}
          showGlow={n.id <= 2 || n.id >= 3}
        />
      ))}

      <text x={W / 2} y={H - 14} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        평균 깊이 O(log N) · 최악 O(N). 각 노드는 (lo, hi) 표시.
      </text>
    </svg>
  );
}

// Supp 3: 스택 메모리 사용량 (깊이 막대 + 한계선)
function Fc2Supp3() {
  const W = 600;
  const H = 300;
  // 입력 크기별 재귀 깊이
  const sizes = [4, 8, 16, 32, 64];
  const depths = [2, 3, 4, 5, 6]; // log2 N (가정)
  const limit = 5; // stack overflow 한계

  const barW = 50;
  const gap = 30;
  const totalW = sizes.length * barW + (sizes.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const baseY = 240;
  const unit = 22;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        스택 메모리 사용량 · Overflow 한계
      </text>

      {/* axis */}
      <line x1={startX - 20} y1={baseY} x2={startX + totalW + 20} y2={baseY} stroke="hsl(var(--border))" strokeWidth={1.5} />

      {/* limit 선 */}
      <line
        x1={startX - 20}
        y1={baseY - limit * unit}
        x2={startX + totalW + 20}
        y2={baseY - limit * unit}
        stroke={colorTokens.found}
        strokeWidth={1.5}
        strokeDasharray="6 4"
      />
      <text x={startX + totalW + 24} y={baseY - limit * unit + 4} fontSize={11} fontWeight={600} fill={colorTokens.found}>
        한계
      </text>

      {sizes.map((N, i) => {
        const x = startX + i * (barW + gap);
        const d = depths[i];
        const h = d * unit;
        const over = d > limit;
        return (
          <g key={i}>
            <rect
              x={x}
              y={baseY - h}
              width={barW}
              height={h}
              fill={over ? colorTokens.found : colorTokens.active}
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
              rx={4}
            />
            <text x={x + barW / 2} y={baseY + 16} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))">
              N={N}
            </text>
            <text x={x + barW / 2} y={baseY - h - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="hsl(var(--foreground))">
              {d}
            </text>
          </g>
        );
      })}

      <text x={W / 2} y={H - 14} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        깊이 ≈ log₂ N. 너무 깊으면 반복 + 명시적 스택으로 전환.
      </text>
    </svg>
  );
}

// Supp 4: 재귀 vs 반복 코드 비교
function Fc2Supp4() {
  const W = 600;
  const H = 300;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        재귀 ↔ 반복 (명시적 스택) 등가
      </text>

      {/* 좌: 재귀 */}
      <rect x={20} y={60} width={280} height={200} fill="hsl(var(--muted))" stroke="hsl(var(--border))" rx={6} />
      <text x={30} y={82} fontSize={11} fontWeight={700} fill={colorTokens.active}>// recursive</text>
      <text x={30} y={106} fontSize={11} fill="hsl(var(--foreground))">function qs(lo, hi):</text>
      <text x={38} y={126} fontSize={11} fill="hsl(var(--foreground))">if lo &gt;= hi: return</text>
      <text x={38} y={146} fontSize={11} fill="hsl(var(--foreground))">p = partition(lo, hi)</text>
      <text x={38} y={166} fontSize={11} fill="hsl(var(--foreground))">qs(lo, p-1)</text>
      <text x={38} y={186} fontSize={11} fill="hsl(var(--foreground))">qs(p+1, hi)</text>
      <text x={30} y={220} fontSize={11} fontStyle="italic" fill="hsl(var(--muted-foreground))">간결 · 가독성 우수</text>
      <text x={30} y={240} fontSize={11} fontStyle="italic" fill="hsl(var(--muted-foreground))">단점: 호출 깊이 한계</text>

      {/* 우: 반복 + 명시 스택 */}
      <rect x={300} y={60} width={280} height={200} fill="hsl(var(--muted))" stroke="hsl(var(--border))" rx={6} />
      <text x={310} y={82} fontSize={11} fontWeight={700} fill={colorTokens.comparing}>// iterative</text>
      <text x={310} y={106} fontSize={11} fill="hsl(var(--foreground))">stack = [(0, N-1)]</text>
      <text x={310} y={126} fontSize={11} fill="hsl(var(--foreground))">while stack:</text>
      <text x={318} y={146} fontSize={11} fill="hsl(var(--foreground))">lo, hi = stack.pop()</text>
      <text x={318} y={166} fontSize={11} fill="hsl(var(--foreground))">p = partition(lo, hi)</text>
      <text x={318} y={186} fontSize={11} fill="hsl(var(--foreground))">stack.push((p+1, hi))</text>
      <text x={318} y={206} fontSize={11} fill="hsl(var(--foreground))">stack.push((lo, p-1))</text>
      <text x={310} y={232} fontSize={11} fontStyle="italic" fill="hsl(var(--muted-foreground))">제어성 우수 · 메모리 명시</text>
      <text x={310} y={252} fontSize={11} fontStyle="italic" fill="hsl(var(--muted-foreground))">단점: 약간 장황함</text>
    </svg>
  );
}

export const Fc2SupplementaryOptions = [Fc2Supp1, Fc2Supp2, Fc2Supp3, Fc2Supp4];
