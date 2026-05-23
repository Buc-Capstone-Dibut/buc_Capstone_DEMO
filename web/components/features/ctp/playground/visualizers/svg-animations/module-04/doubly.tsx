"use client";

import { useState, useCallback } from "react";
import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  PointerArrow,
  colorTokens,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Doubly Linked List: 5 step storyboard
// step 0: A ⇄ B ⇄ C 초기 (양방향 화살표)
// step 1: B에서 prev로 A 접근
// step 2: B에서 next로 C 접근
// step 3: B와 C 사이 X 삽입 (4 포인터 갱신)
// step 4: B 삭제 (양옆 prev/next 재연결)

const MAX_STEPS = 5;

type DoublyNode = {
  id: string;
  value: string;
  prev: string | null;
  next: string | null;
};

type DoublyState = {
  nodes: DoublyNode[];
  head: string;
  tail: string;
  current: string | null;
  highlights: string[];
};

function buildState(step: number): DoublyState {
  if (step === 0) {
    return {
      nodes: [
        { id: "A", value: "A", prev: null, next: "B" },
        { id: "B", value: "B", prev: "A", next: "C" },
        { id: "C", value: "C", prev: "B", next: null },
      ],
      head: "A",
      tail: "C",
      current: null,
      highlights: ["A", "B", "C"],
    };
  }
  if (step === 1) {
    return {
      nodes: [
        { id: "A", value: "A", prev: null, next: "B" },
        { id: "B", value: "B", prev: "A", next: "C" },
        { id: "C", value: "C", prev: "B", next: null },
      ],
      head: "A",
      tail: "C",
      current: "B",
      highlights: ["B", "A"],
    };
  }
  if (step === 2) {
    return {
      nodes: [
        { id: "A", value: "A", prev: null, next: "B" },
        { id: "B", value: "B", prev: "A", next: "C" },
        { id: "C", value: "C", prev: "B", next: null },
      ],
      head: "A",
      tail: "C",
      current: "B",
      highlights: ["B", "C"],
    };
  }
  if (step === 3) {
    return {
      nodes: [
        { id: "A", value: "A", prev: null, next: "B" },
        { id: "B", value: "B", prev: "A", next: "X" },
        { id: "X", value: "X", prev: "B", next: "C" },
        { id: "C", value: "C", prev: "X", next: null },
      ],
      head: "A",
      tail: "C",
      current: "X",
      highlights: ["B", "X", "C"],
    };
  }
  // step 4: B 삭제
  return {
    nodes: [
      { id: "A", value: "A", prev: null, next: "X" },
      { id: "X", value: "X", prev: "A", next: "C" },
      { id: "C", value: "C", prev: "X", next: null },
    ],
    head: "A",
    tail: "C",
    current: "A",
    highlights: ["A", "X"],
  };
}

export function useDoublySim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 이중 연결 리스트 초기화: A ⇄ B ⇄ C (head=A, tail=C)",
  ]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === 1) appendLog("[PREV] B.prev로 A 즉시 접근. 한 노드만 알아도 뒤쪽으로 이동 가능.");
      if (next === 2) appendLog("[NEXT] 같은 B에서 next로 C 즉시 접근. 양방향 자유 이동이 핵심.");
      if (next === 3) appendLog("[INSERT] B와 C 사이 X 삽입. X.prev/next + B.next + C.prev 네 포인터 갱신.");
      if (next === 4) appendLog("[DELETE] B 제거. A.next=X, X.prev=A 두 포인터로 양옆 재연결.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: 이중 연결 리스트 초기 상태."]);
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

export function DoublyVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const state = buildState(step);

  const svgWidth = 800;
  const svgHeight = 400;
  const r = 30;
  const gap = 140;
  const cy = 220;

  // 고정 anchor: A/B/X/C 가 모든 step 에서 동일한 x 좌표 유지.
  // step 3 X 삽입 시 회전·시프트 없이 빈 자리에서 등장.
  // step 4 B 삭제 시 양옆 노드가 이동하지 않음.
  const SLOT: Record<string, number> = { A: 0, B: 1, X: 2, C: 3 };
  const SLOT_COUNT = 4;
  const totalWidth = SLOT_COUNT * (2 * r) + (SLOT_COUNT - 1) * (gap - 2 * r);
  const startX = (svgWidth - totalWidth) / 2 + r;

  const xOf = (id: string) => {
    const slot = SLOT[id];
    return slot !== undefined ? startX + slot * gap : -1;
  };

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className="font-mono"
    >
      <CyberGrid width={svgWidth} height={svgHeight} />
      <NeonGlowFilters />

      <text x={svgWidth / 2} y={32} textAnchor="middle" fontSize={16} fontWeight={700} fill="hsl(var(--foreground))">
        Doubly Linked List · 왕복 가능 (prev / next)
      </text>

      <text x={svgWidth / 2} y={56} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        {step === 0 && "초기 상태: A ⇄ B ⇄ C (head=A, tail=C)"}
        {step === 1 && "양방향 접근: B에서 prev를 따라 A로 즉시 이동"}
        {step === 2 && "양방향 접근: B에서 next를 따라 C로 즉시 이동"}
        {step === 3 && "Insert: B와 C 사이 X 삽입. 네 포인터 동시 갱신"}
        {step === 4 && "Delete: B 제거. A↔X 양방향 재연결로 O(1)"}
      </text>

      {/* Forward edges (next, upper) — y offset 16 으로 prev 와 분리 + label */}
      {state.nodes
        .filter((n) => n.next !== null)
        .map((n) => {
          const fromX = xOf(n.id) + r;
          const toX = xOf(n.next!) - r;
          const isHighlighted =
            state.highlights.includes(n.id) && state.highlights.includes(n.next!);
          const status: ColorToken = isHighlighted ? "active" : "pointer";
          return (
            <EdgeLine
              key={`next-${n.id}`}
              x1={fromX}
              y1={cy - 16}
              x2={toX}
              y2={cy - 16}
              status={status}
              arrow
              label="next"
            />
          );
        })}

      {/* Backward edges (prev, lower) — y offset 16 으로 next 와 분리 + label */}
      {state.nodes
        .filter((n) => n.prev !== null)
        .map((n) => {
          const fromX = xOf(n.id) - r;
          const toX = xOf(n.prev!) + r;
          const isHighlighted =
            state.highlights.includes(n.id) && state.highlights.includes(n.prev!);
          const status: ColorToken = isHighlighted ? "active" : "comparing";
          return (
            <EdgeLine
              key={`prev-${n.id}`}
              x1={fromX}
              y1={cy + 16}
              x2={toX}
              y2={cy + 16}
              status={status}
              arrow
              label="prev"
            />
          );
        })}

      {/* Nodes */}
      {state.nodes.map((n) => {
        const cx = xOf(n.id);
        const isCurrent = state.current === n.id;
        const isHighlighted = state.highlights.includes(n.id);
        const status: ColorToken = isCurrent ? "found" : isHighlighted ? "active" : "comparing";
        return (
          <NodeCircle
            key={`node-${n.id}`}
            cx={cx}
            cy={cy}
            r={r}
            value={n.value}
            status={status}
            showGlow={isCurrent || isHighlighted}
          />
        );
      })}

      {/* head pointer */}
      <PointerArrow
        x={xOf(state.head)}
        y={cy - r - 8}
        label="head"
        color={colorTokens.found}
        direction="down"
      />

      {/* tail pointer */}
      <PointerArrow
        x={xOf(state.tail)}
        y={cy - r - 8}
        label="tail"
        color={colorTokens.pointer}
        direction="down"
      />

      {/* current pointer */}
      {state.current && state.current !== state.head && state.current !== state.tail && (
        <PointerArrow
          x={xOf(state.current)}
          y={cy + r + 36}
          label="current"
          color={colorTokens.active}
          direction="up"
        />
      )}

      {/* Step counter */}
      <text
        x={svgWidth - 24}
        y={svgHeight - 24}
        textAnchor="end"
        fontSize={11}
        fill="hsl(var(--muted-foreground))"
        fontFamily="ui-monospace, monospace"
      >
        Step {step + 1}/{MAX_STEPS}
      </text>
    </svg>
  );
}
