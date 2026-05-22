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

// Singly Linked List: 5 step storyboard
// step 0: A → B → C 초기
// step 1: head 앞에 Z prepend (Z → A → B → C)
// step 2: traverse to B 위치
// step 3: B와 C 사이 X 삽입 (Z → A → B → X → C)
// step 4: A 삭제 (Z → B → X → C)

const MAX_STEPS = 5;

type SinglyNode = {
  id: string;
  value: string;
  next: string | null;
};

type SinglyState = {
  nodes: SinglyNode[];
  head: string;
  current: string | null;
  highlights: string[];
};

function buildState(step: number): SinglyState {
  if (step === 0) {
    return {
      nodes: [
        { id: "A", value: "A", next: "B" },
        { id: "B", value: "B", next: "C" },
        { id: "C", value: "C", next: null },
      ],
      head: "A",
      current: null,
      highlights: ["A", "B", "C"],
    };
  }
  if (step === 1) {
    return {
      nodes: [
        { id: "Z", value: "Z", next: "A" },
        { id: "A", value: "A", next: "B" },
        { id: "B", value: "B", next: "C" },
        { id: "C", value: "C", next: null },
      ],
      head: "Z",
      current: "Z",
      highlights: ["Z"],
    };
  }
  if (step === 2) {
    return {
      nodes: [
        { id: "Z", value: "Z", next: "A" },
        { id: "A", value: "A", next: "B" },
        { id: "B", value: "B", next: "C" },
        { id: "C", value: "C", next: null },
      ],
      head: "Z",
      current: "B",
      highlights: ["Z", "A", "B"],
    };
  }
  if (step === 3) {
    return {
      nodes: [
        { id: "Z", value: "Z", next: "A" },
        { id: "A", value: "A", next: "B" },
        { id: "B", value: "B", next: "X" },
        { id: "X", value: "X", next: "C" },
        { id: "C", value: "C", next: null },
      ],
      head: "Z",
      current: "X",
      highlights: ["B", "X"],
    };
  }
  // step 4: A 삭제
  return {
    nodes: [
      { id: "Z", value: "Z", next: "B" },
      { id: "B", value: "B", next: "X" },
      { id: "X", value: "X", next: "C" },
      { id: "C", value: "C", next: null },
    ],
    head: "Z",
    current: "Z",
    highlights: ["Z", "B"],
  };
}

export function useSinglySim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 단일 연결 리스트 초기화: A → B → C (head=A)",
  ]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === 1) appendLog("[PREPEND] head 앞에 Z를 끼움. Z.next=A, head=Z 두 줄로 O(1).");
      if (next === 2) appendLog("[TRAVERSE] head Z에서 출발해 next를 따라 B 위치까지 이동.");
      if (next === 3) appendLog("[INSERT MIDDLE] B와 C 사이에 X 삽입. X.next=C, B.next=X 순서 갱신.");
      if (next === 4) appendLog("[DELETE] A 제거. 직전 노드 Z의 next를 A.next인 B로 재연결.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: 단일 연결 리스트 초기 상태."]);
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

export function SinglyVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const state = buildState(step);

  const svgWidth = 800;
  const svgHeight = 400;
  const r = 30;
  const gap = 130;
  const totalWidth = state.nodes.length * (2 * r) + (state.nodes.length - 1) * (gap - 2 * r);
  const startX = (svgWidth - totalWidth) / 2 + r;
  const cy = 220;

  const xOf = (id: string) => {
    const idx = state.nodes.findIndex((n) => n.id === id);
    return idx >= 0 ? startX + idx * gap : -1;
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
        Singly Linked List · 앞→뒤만 연결 (next 포인터)
      </text>

      <text x={svgWidth / 2} y={56} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        {step === 0 && "초기 상태: A → B → C (head=A)"}
        {step === 1 && "Prepend: head 앞에 Z 삽입 (head=Z)"}
        {step === 2 && "Traverse: head Z에서 출발해 B 위치까지 이동"}
        {step === 3 && "Insert: B와 C 사이에 X 삽입 (B.next=X, X.next=C)"}
        {step === 4 && "Delete: A 제거. Z.next=B로 재연결"}
      </text>

      {/* Edge lines (next pointers) */}
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
              key={`edge-${n.id}`}
              x1={fromX}
              y1={cy}
              x2={toX}
              y2={cy}
              status={status}
              arrow
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

      {/* terminator (NULL) label for last node */}
      {(() => {
        const last = state.nodes[state.nodes.length - 1];
        const lastX = xOf(last.id);
        return (
          <g>
            <line
              x1={lastX + r}
              y1={cy}
              x2={lastX + r + 38}
              y2={cy}
              stroke={colorTokens.muted}
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            <text
              x={lastX + r + 56}
              y={cy + 4}
              textAnchor="start"
              fontSize={11}
              fill={colorTokens.muted}
              fontFamily="ui-monospace, monospace"
            >
              null
            </text>
          </g>
        );
      })()}

      {/* head pointer */}
      <PointerArrow
        x={xOf(state.head)}
        y={cy - r - 8}
        label="head"
        color={colorTokens.found}
        direction="down"
      />

      {/* current pointer (step 2~4) */}
      {state.current && state.current !== state.head && (
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
