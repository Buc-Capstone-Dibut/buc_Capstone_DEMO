"use client";

// Trace-mode 자동 시각화 컴포넌트.
// step.data = { array, pointers, eventType, event } (skulpt-runner의 mapToVisualData 산출물)
// 알려진 포인터 변수(L/R/M/i/j/k/left/right/mid/current)는 색상별 화살표로 매핑한다.

import {
  ArrayBox,
  IndexLabel,
  PointerArrow,
  CyberGrid,
  NeonGlowFilters,
  colorTokens,
  type ColorToken,
} from "./svg-primitives";

export interface GenericArrayVisualizerProps {
  data: {
    array?: unknown[] | null;
    pointers?: Record<string, number>;
    eventType?: string | null;
    event?: { event_type?: string; type?: string; [key: string]: unknown } | null;
  } | null;
  emptyMessage?: string;
}

// 알려진 포인터 변수별 색상 매핑 (Tailwind semantic token만 사용)
const POINTER_COLOR_MAP: Record<string, string> = {
  i: "hsl(var(--primary))",
  j: "hsl(var(--accent))",
  k: "hsl(var(--warning, 38 92% 50%))",
  l: "hsl(var(--primary))",
  left: "hsl(var(--primary))",
  r: "hsl(var(--accent))",
  right: "hsl(var(--accent))",
  m: "hsl(var(--warning, 38 92% 50%))",
  mid: "hsl(var(--warning, 38 92% 50%))",
  current: "hsl(var(--primary))",
  idx: "hsl(var(--primary))",
  index: "hsl(var(--primary))",
  pos: "hsl(var(--accent))",
  p: "hsl(var(--primary))",
  q: "hsl(var(--accent))",
};

const BOX_WIDTH = 56;
const BOX_HEIGHT = 56;
const BOX_GAP = 8;
const CANVAS_PADDING_X = 40;
const CANVAS_PADDING_TOP = 80;

function getPointerColor(name: string): string {
  return POINTER_COLOR_MAP[name.toLowerCase()] ?? "hsl(var(--primary))";
}

function computeStatus(
  pointers: Record<string, number>,
  index: number,
  eventType: string | null,
): ColorToken {
  const highlighted = Object.values(pointers).includes(index);
  if (!highlighted) return "default";
  if (eventType === "found") return "found";
  if (eventType === "compare") return "comparing";
  return "active";
}

export function GenericArrayVisualizer({
  data,
  emptyMessage = "코드를 실행하면 시각화가 나타납니다.",
}: GenericArrayVisualizerProps) {
  const array = data?.array ?? [];
  const pointers = data?.pointers ?? {};
  const eventType = data?.eventType ?? null;

  if (!array || array.length === 0) {
    return (
      <div className="w-full flex items-center justify-center min-h-[200px] text-sm text-muted-foreground font-mono">
        {emptyMessage}
      </div>
    );
  }

  const svgWidth = CANVAS_PADDING_X * 2 + array.length * (BOX_WIDTH + BOX_GAP) - BOX_GAP;
  const svgHeight = CANVAS_PADDING_TOP + BOX_HEIGHT + 60;

  // 포인터별 stacking offset (같은 인덱스를 가리키는 다중 포인터가 겹치지 않도록).
  const pointerEntries = Object.entries(pointers).filter(
    ([, idx]) => Number.isInteger(idx) && idx >= 0 && idx < array.length,
  );
  const pointerStackByIndex: Record<number, number> = {};

  return (
    <div className="w-full flex flex-col items-center gap-3 py-4">
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="max-w-full"
      >
        <CyberGrid width={svgWidth} height={svgHeight} />
        <NeonGlowFilters />

        {/* Array boxes */}
        {array.map((value, i) => {
          const x = CANVAS_PADDING_X + i * (BOX_WIDTH + BOX_GAP);
          const y = CANVAS_PADDING_TOP;
          const status = computeStatus(pointers, i, eventType);
          const displayValue =
            value === null || value === undefined
              ? "·"
              : typeof value === "object"
                ? "{}"
                : String(value);
          return (
            <g key={`cell-${i}`}>
              <ArrayBox
                x={x}
                y={y}
                width={BOX_WIDTH}
                height={BOX_HEIGHT}
                value={displayValue}
                status={status}
                showGlow={status !== "default"}
              />
              <IndexLabel
                x={x + BOX_WIDTH / 2}
                y={y + BOX_HEIGHT + 18}
                index={i}
              />
            </g>
          );
        })}

        {/* Pointer arrows */}
        {pointerEntries.map(([name, idx]) => {
          const x = CANVAS_PADDING_X + idx * (BOX_WIDTH + BOX_GAP) + BOX_WIDTH / 2;
          const stack = pointerStackByIndex[idx] ?? 0;
          pointerStackByIndex[idx] = stack + 1;
          const y = CANVAS_PADDING_TOP - 10 - stack * 22;
          return (
            <PointerArrow
              key={`ptr-${name}`}
              x={x}
              y={y}
              label={name}
              color={getPointerColor(name)}
              direction="down"
            />
          );
        })}
      </svg>

      {/* Event badge */}
      {eventType ? (
        <div
          className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border"
          style={{
            color: colorTokens.text,
            borderColor: colorTokens.border,
            background: colorTokens.background,
          }}
        >
          event · {eventType}
        </div>
      ) : null}
    </div>
  );
}
