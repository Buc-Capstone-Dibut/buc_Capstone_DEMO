"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
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

const BASE_LOG = "> 단일 연결 리스트 초기화: A → B → C (head=A)";

// step 별 로그 메시지 (advance·슬라이더가 공유 → 파생 상태 동기화 기준).
const STEP_MSG: Record<number, string> = {
  1: "[PREPEND] head 앞에 Z를 끼움. Z.next=A, head=Z 두 줄로 O(1).",
  2: "[TRAVERSE] head Z에서 출발해 next를 따라 B 위치까지 이동.",
  3: "[INSERT MIDDLE] B와 C 사이에 X 삽입. X.next=C, B.next=X 순서 갱신.",
  4: "[DELETE] A 제거. 직전 노드 Z의 next를 A.next인 B로 재연결.",
};

export function useSinglySim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([BASE_LOG]);

  // 슬라이더 드래그/임의 step 점프 시 logs 를 해당 step 까지 재계산해 동기화.
  const handleSetStep = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(target, MAX_STEPS - 1));
    setStep(clamped);
    const next = [BASE_LOG];
    for (let i = 1; i <= clamped; i++) {
      if (STEP_MSG[i]) next.unshift(`> ${STEP_MSG[i]}`);
    }
    setLogs(next);
  }, []);

  const advance = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === prev) return prev;
      if (STEP_MSG[next]) setLogs((l) => [`> ${STEP_MSG[next]}`, ...l]);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: 단일 연결 리스트 초기 상태."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step },
      logs,
      // push: 자동재생(▶︎)·슬라이더 구동용 advance. peek: 기존 Operation Panel 버튼 호환 alias.
      handlers: { push: advance, peek: advance, clear: reset },
      currentStep: step,
      maxSteps: MAX_STEPS,
      setStep: handleSetStep,
      nextStep: advance,
      reset,
    },
  };
}

export function SinglyVisualizer({ data }: { data?: { step: number } | null }) {
  const step = data?.step ?? 0;
  const state = buildState(step);

  const svgWidth = 800;
  const svgHeight = 400;
  const r = 30;
  const gap = 130;
  const cy = 220;

  // 고정 anchor: Z/A/B/X/C 가 모든 step 에서 동일한 x 좌표 유지.
  // 좌→우 순서: Z(prepend), A, B, X(중간 삽입), C
  // step 0 에서는 A 가 머리지만 Z 슬롯은 비워두지 않고 좌측을 살짝 쉬프트.
  //   대신 Z/A/B/X/C 모두 5 슬롯에 안정 배치 → step 1+ 에서 Z 가 등장해도 시프트 없음.
  const SLOT: Record<string, number> = { Z: 0, A: 1, B: 2, X: 3, C: 4 };
  const SLOT_COUNT = 5;
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
        Singly Linked List · 앞→뒤만 연결 (next 포인터)
      </text>

      <text x={svgWidth / 2} y={56} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        {step === 0 && "초기 상태: A → B → C (head=A)"}
        {step === 1 && "Prepend: head 앞에 Z 삽입 (head=Z)"}
        {step === 2 && "Traverse: head Z에서 출발해 B 위치까지 이동"}
        {step === 3 && "Insert: B와 C 사이에 X 삽입 (B.next=X, X.next=C)"}
        {step === 4 && "Delete: A 제거. Z.next=B로 재연결"}
      </text>

      {/* Edge lines (next pointers) — 재배선 시 부드럽게 페이드 */}
      {state.nodes
        .filter((n) => n.next !== null)
        .map((n) => {
          const fromX = xOf(n.id) + r;
          const toX = xOf(n.next!) - r;
          const isHighlighted =
            state.highlights.includes(n.id) && state.highlights.includes(n.next!);
          const status: ColorToken = isHighlighted ? "active" : "pointer";
          return (
            <motion.g
              key={`edge-${n.id}-${n.next}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              <EdgeLine x1={fromX} y1={cy} x2={toX} y2={cy} status={status} arrow />
            </motion.g>
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
