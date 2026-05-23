"use client";

import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  NodeCircle,
  EdgeLine,
  PointerArrow,
  colorTokens,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Supp 1: 인덱스로 다음 노드 가리키기
function CursorLinkedListSupp1() {
  const W = 600;
  const H = 300;
  const slots = [
    { idx: 0, val: "A", next: 1 },
    { idx: 1, val: "B", next: 2 },
    { idx: 2, val: "C", next: -1 },
  ];
  const boxSize = 80;
  const gap = 50;
  const totalW = slots.length * boxSize + (slots.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const y = 110;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={32} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        인덱스로 다음 노드 가리키기
      </text>
      <text x={W / 2} y={54} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        포인터 대신 배열 인덱스 번호를 next 필드에 저장
      </text>

      {slots.map((s, i) => {
        const x = startX + i * (boxSize + gap);
        return (
          <g key={i}>
            <ArrayBox x={x} y={y} width={boxSize} height={boxSize} value={s.val} status="active" showGlow />
            <text x={x + boxSize / 2} y={y + boxSize + 16} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
              index={s.idx}
            </text>
            <text x={x + boxSize / 2} y={y + boxSize + 30} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
              next={s.next}
            </text>
          </g>
        );
      })}

      {/* next 화살표 */}
      {slots.filter((s) => s.next >= 0).map((s, i) => {
        const fromX = startX + s.idx * (boxSize + gap) + boxSize;
        const toX = startX + s.next * (boxSize + gap);
        return (
          <EdgeLine
            key={`e-${i}`}
            x1={fromX}
            y1={y + boxSize / 2}
            x2={toX}
            y2={y + boxSize / 2}
            status="pointer"
            arrow
          />
        );
      })}

      <text x={W / 2} y={H - 24} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        next = -1 은 종단 의미. 인덱스 = 메모리 주소 대체 표현.
      </text>
    </svg>
  );
}

// Supp 2: free list 재사용 풀 — 사용 vs free 분리
function CursorLinkedListSupp2() {
  const W = 600;
  const H = 300;
  const slots = [
    { idx: 0, val: "A", inUse: true },
    { idx: 1, val: "B", inUse: true },
    { idx: 2, val: null, inUse: false },
    { idx: 3, val: null, inUse: false },
  ];
  const boxSize = 64;
  const gap = 28;
  const totalW = slots.length * boxSize + (slots.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const y = 110;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={32} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        free 체인 = 빈 슬롯 재사용 풀
      </text>
      <text x={W / 2} y={54} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        사용 슬롯과 빈 슬롯 체인을 따로 관리해 O(1) 재할당
      </text>

      {slots.map((s, i) => {
        const x = startX + i * (boxSize + gap);
        return (
          <g key={i}>
            <ArrayBox
              x={x}
              y={y}
              width={boxSize}
              height={boxSize}
              value={s.val ?? "·"}
              status={s.inUse ? "active" : "muted"}
              showGlow={s.inUse}
            />
            <text x={x + boxSize / 2} y={y + boxSize + 16} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
              [{s.idx}]
            </text>
          </g>
        );
      })}

      {/* 사용 슬롯 라벨 */}
      <text x={startX + boxSize / 2 + (boxSize + gap) * 0.5} y={y - 12} textAnchor="middle" fontSize={11} fontWeight={600} fill={colorTokens.active}>
        사용 중 (head 체인)
      </text>
      {/* free 슬롯 라벨 */}
      <text x={startX + (boxSize + gap) * 2.5 + boxSize / 2} y={y - 12} textAnchor="middle" fontSize={11} fontWeight={600} fill={colorTokens.muted}>
        free (재사용 풀)
      </text>

      <text x={W / 2} y={H - 24} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        삭제된 슬롯은 free 체인 앞에 다시 매달면 O(1)에 재활용 가능.
      </text>
    </svg>
  );
}

// Supp 3: head 와 free 두 진입점
function CursorLinkedListSupp3() {
  const W = 600;
  const H = 300;
  const boxSize = 64;
  const gap = 24;
  const slots = 5;
  const totalW = slots * boxSize + (slots - 1) * gap;
  const startX = (W - totalW) / 2;
  const y = 130;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={32} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        head · free 두 진입점
      </text>
      <text x={W / 2} y={54} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        데이터 진입점은 head, 빈 슬롯 진입점은 free 로 분리
      </text>

      {/* 슬롯 박스들 */}
      {Array.from({ length: slots }).map((_, i) => {
        const x = startX + i * (boxSize + gap);
        const isData = i < 2;
        const value = isData ? (i === 0 ? "A" : "B") : "·";
        return (
          <g key={i}>
            <ArrayBox
              x={x}
              y={y}
              width={boxSize}
              height={boxSize}
              value={value}
              status={isData ? "active" : "muted"}
              showGlow={isData}
            />
            <text x={x + boxSize / 2} y={y + boxSize + 16} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
              [{i}]
            </text>
          </g>
        );
      })}

      {/* head pointer (idx 0) */}
      <PointerArrow
        x={startX + boxSize / 2}
        y={y - 8}
        label="head"
        color={colorTokens.found}
        direction="down"
      />
      {/* free pointer (idx 2) */}
      <PointerArrow
        x={startX + 2 * (boxSize + gap) + boxSize / 2}
        y={y - 8}
        label="free"
        color={colorTokens.muted}
        direction="down"
      />

      <text x={W / 2} y={H - 24} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        두 진입점만 정확히 다루면 삽입/삭제가 O(1) — 커서 리스트의 핵심.
      </text>
    </svg>
  );
}

// Supp 4: 고정 메모리 시스템 — capacity 강조
function CursorLinkedListSupp4() {
  const W = 600;
  const H = 300;
  const boxSize = 48;
  const gap = 6;
  const slots = 8;
  const totalW = slots * boxSize + (slots - 1) * gap;
  const startX = (W - totalW) / 2;
  const y = 140;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full font-mono">
      <CyberGrid width={W} height={H} />
      <NeonGlowFilters />
      <text x={W / 2} y={32} textAnchor="middle" fontSize={15} fontWeight={700} fill="hsl(var(--foreground))">
        고정 메모리 시스템에 적합
      </text>
      <text x={W / 2} y={54} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        임베디드 · 정적 메모리 풀: 슬롯 수 = 용량 상한
      </text>

      {/* capacity 박스 (점선) */}
      <rect
        x={startX - 12}
        y={y - 12}
        width={totalW + 24}
        height={boxSize + 24}
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeDasharray="6 4"
        strokeWidth={1.5}
        rx={8}
      />

      {/* 슬롯들 */}
      {Array.from({ length: slots }).map((_, i) => {
        const x = startX + i * (boxSize + gap);
        const used = i < 5;
        return (
          <ArrayBox
            key={i}
            x={x}
            y={y}
            width={boxSize}
            height={boxSize}
            value={used ? String.fromCharCode(65 + i) : "·"}
            status={used ? "active" : "muted"}
            showGlow={used}
          />
        );
      })}

      {/* capacity 라벨 */}
      <text x={W / 2} y={y - 22} textAnchor="middle" fontSize={11} fontWeight={600} fill={colorTokens.muted}>
        capacity = {slots}
      </text>

      <text x={W / 2} y={H - 24} textAnchor="middle" fontSize={11} fill="hsl(var(--foreground))" fontStyle="italic">
        동적 확장 불가. free 가 -1 이면 삽입 실패로 처리해야 함.
      </text>
    </svg>
  );
}

export const CursorLinkedListSupplementaryOptions = [
  CursorLinkedListSupp1,
  CursorLinkedListSupp2,
  CursorLinkedListSupp3,
  CursorLinkedListSupp4,
];
