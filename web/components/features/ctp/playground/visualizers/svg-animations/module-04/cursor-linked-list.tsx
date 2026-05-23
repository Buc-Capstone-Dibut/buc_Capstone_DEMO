"use client";

import { useState, useCallback } from "react";
import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  PointerArrow,
  IndexLabel,
  EdgeLine,
  colorTokens,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Cursor-based linked list: 5 step storyboard
// initialState: A→B→C used (idx 0..2), free chain at 3→4→-1
// step 0: snapshot   head=0 free=3
// step 1: take free(3) for new node X → free advances to 4
// step 2: node[3] = { value: X, next: 2 (== B.next) }
// step 3: B(1).next = 3 → list now A→B→X→C
// step 4: free-chain emphasis: 삭제 슬롯 재사용 풀

const MAX_STEPS = 5;

type Slot = {
  index: number;
  value: string | null;
  next: number; // -1 means terminator
  inUse: boolean;
};

function buildSlots(step: number): { slots: Slot[]; head: number; free: number; highlights: number[] } {
  // baseline (step 0)
  const slots: Slot[] = [
    { index: 0, value: "A", next: 1, inUse: true },
    { index: 1, value: "B", next: 2, inUse: true },
    { index: 2, value: "C", next: -1, inUse: true },
    { index: 3, value: null, next: 4, inUse: false },
    { index: 4, value: null, next: -1, inUse: false },
  ];
  let head = 0;
  let free = 3;
  let highlights: number[] = [];

  if (step >= 1) {
    // free 진입점이 4로 이동 (3은 곧 새 노드 영역)
    free = 4;
    highlights = [3];
  }
  if (step >= 2) {
    // node[3] = X, next=2 (B의 기존 next)
    slots[3] = { index: 3, value: "X", next: 2, inUse: true };
    highlights = [3];
  }
  if (step >= 3) {
    // B(1).next = 3 → A→B→X→C
    slots[1] = { ...slots[1], next: 3 };
    highlights = [1, 3];
  }
  if (step >= 4) {
    // 삭제 슬롯 재사용 강조: free 체인 시각화 (현재 free=4, 4.next=-1)
    highlights = [];
  }

  return { slots, head, free, highlights };
}

export function useCursorLinkedListSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 커서 기반 연결 리스트 초기화: A → B → C, free 진입점 [3]",
  ]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === 1) appendLog("[FREE 차용] 슬롯 [3]을 free 체인에서 떼어 새 노드 자리로 확보. free 진입점 [4]로 이동.");
      if (next === 2) appendLog("[VALUE 기입] node[3].value=X, node[3].next=2 (B의 기존 next 복사).");
      if (next === 3) appendLog("[LINK 갱신] B(1).next=3 으로 갱신 → 순회 결과: A → B → X → C.");
      if (next === 4) appendLog("[재사용 풀] 삭제된 슬롯은 free 체인 앞에 끼워 두면 O(1)에 재할당 가능.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: 커서 기반 연결 리스트 초기 상태로 복원."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step },
      logs,
      handlers: { peek, reset, clear: reset },
      currentStep: step,
      maxSteps: MAX_STEPS,
      setStep,
    },
  };
}

export function CursorLinkedListVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const { slots, head, free, highlights } = buildSlots(step);

  // SVG layout: 5 slots in a row
  const svgWidth = 720;
  const svgHeight = 320;
  const boxSize = 84;
  const boxGap = 28;
  const totalWidth = slots.length * boxSize + (slots.length - 1) * boxGap;
  const boxStartX = (svgWidth - totalWidth) / 2;
  const boxY = 150;

  const slotCenterX = (i: number) => boxStartX + i * (boxSize + boxGap) + boxSize / 2;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className="font-mono"
    >
      <CyberGrid width={svgWidth} height={svgHeight} />
      <NeonGlowFilters />

      {/* Title */}
      <text
        x={svgWidth / 2}
        y={32}
        textAnchor="middle"
        fontSize={16}
        fontWeight={700}
        fill="hsl(var(--foreground))"
      >
        Cursor Linked List · 배열 인덱스가 next 포인터 역할
      </text>

      {/* Step narration */}
      <text
        x={svgWidth / 2}
        y={56}
        textAnchor="middle"
        fontSize={12}
        fill="hsl(var(--muted-foreground))"
      >
        {step === 0 && "초기 상태: A → B → C 사용 중, 빈 슬롯 [3] [4]가 free 체인"}
        {step === 1 && "삽입 준비: free 진입점이 가리키는 [3]을 새 노드 자리로 차용"}
        {step === 2 && "값 기입: node[3].value=X, node[3].next=2 (B의 기존 next)"}
        {step === 3 && "링크 갱신: B(1).next=3 으로 갱신 → A → B → X → C 완성"}
        {step === 4 && "재사용 풀: 삭제된 슬롯은 free 체인 앞에 매달아 두면 O(1) 재활용"}
      </text>

      {/* Slot row */}
      {slots.map((slot) => {
        const x = boxStartX + slot.index * (boxSize + boxGap);
        const status: ColorToken = highlights.includes(slot.index)
          ? "active"
          : slot.inUse
          ? "comparing"
          : "muted";
        const display = slot.value ?? "·";
        return (
          <g key={`slot-${slot.index}`}>
            <ArrayBox
              x={x}
              y={boxY}
              width={boxSize}
              height={boxSize}
              value={display}
              status={status}
              showGlow={highlights.includes(slot.index)}
            />
            <IndexLabel x={x + boxSize / 2} y={boxY + boxSize + 18} index={slot.index} />
            {/* next= 표기 */}
            <text
              x={x + boxSize / 2}
              y={boxY + boxSize + 38}
              textAnchor="middle"
              fontSize={11}
              fill="hsl(var(--muted-foreground))"
              fontFamily="ui-monospace, monospace"
            >
              next={slot.next}
            </text>
          </g>
        );
      })}

      {/* next 화살표 (사용 중 슬롯만, terminator 제외) */}
      {slots
        .filter((s) => s.inUse && s.next >= 0)
        .map((slot) => {
          const fromX = boxStartX + slot.index * (boxSize + boxGap) + boxSize;
          const toX = boxStartX + slot.next * (boxSize + boxGap);
          const y = boxY + boxSize / 2;
          // 인접하지 않은 경우 (예: B→X→C) 호로 표현
          const adjacent = Math.abs(slot.next - slot.index) === 1 && slot.next > slot.index;
          const status: ColorToken = highlights.includes(slot.index) ? "active" : "pointer";

          if (adjacent) {
            return (
              <EdgeLine
                key={`next-${slot.index}`}
                x1={fromX}
                y1={y}
                x2={toX}
                y2={y}
                status={status}
                arrow
              />
            );
          }
          // 호 (curved) 그리기: 같은 색의 path
          const stroke = colorTokens[status];
          const arrowSize = 5;
          const dx = toX - fromX;
          const dy = -36; // 위로 휘어지는 호
          const cpX = fromX + dx / 2;
          const cpY = y + dy;
          return (
            <g key={`next-${slot.index}`}>
              <path
                d={`M ${fromX} ${y} Q ${cpX} ${cpY} ${toX} ${y}`}
                stroke={stroke}
                strokeWidth={2}
                fill="none"
              />
              {/* arrow head */}
              <polygon
                points={`${toX},${y} ${toX - arrowSize - 2},${y - arrowSize} ${toX - arrowSize - 2},${y + arrowSize}`}
                fill={stroke}
              />
            </g>
          );
        })}

      {/* head pointer */}
      <PointerArrow
        x={slotCenterX(head)}
        y={boxY - 8}
        label="head"
        color={colorTokens.found}
        direction="down"
      />

      {/* free pointer (빈 슬롯 진입점) */}
      {free >= 0 && free < slots.length && (
        <PointerArrow
          x={slotCenterX(free)}
          y={boxY - 8}
          label="free"
          color={colorTokens.muted}
          direction="down"
        />
      )}

      {/* Free chain 강조 박스 (step 4) */}
      {step === 4 && (
        <g>
          <rect
            x={boxStartX - 10}
            y={boxY - 18}
            width={totalWidth + 20}
            height={boxSize + 36}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.2}
            strokeDasharray="6 4"
            fill="none"
            rx={8}
          />
          <text
            x={boxStartX + totalWidth - 8}
            y={boxY + boxSize + 60}
            textAnchor="end"
            fontSize={11}
            fontStyle="italic"
            fill="hsl(var(--muted-foreground))"
          >
            capacity {slots.length} · 슬롯 수 = 용량 상한
          </text>
        </g>
      )}
    </svg>
  );
}
