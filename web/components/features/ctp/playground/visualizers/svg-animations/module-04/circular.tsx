"use client";

import { useState, useCallback } from "react";
import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  PointerArrow,
  colorTokens,
  edgeAt,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Circular Doubly Linked List: 5 step storyboard
// step 0: A ⇄ B ⇄ C 원형 (C.next=A, A.prev=C)
// step 1: B에서 next로 C 이동
// step 2: C에서 next로 head A로 되돌아옴
// step 3: C와 A 사이 X 삽입
// step 4: B 삭제

const MAX_STEPS = 5;

type CircNode = {
  id: string;
  value: string;
  prev: string;
  next: string;
};

type CircState = {
  nodes: CircNode[];
  head: string;
  current: string | null;
  highlights: string[];
  edgeHighlights: Array<[string, string]>; // (from, to) pairs to highlight active
};

function buildState(step: number): CircState {
  if (step === 0) {
    return {
      nodes: [
        { id: "A", value: "A", prev: "C", next: "B" },
        { id: "B", value: "B", prev: "A", next: "C" },
        { id: "C", value: "C", prev: "B", next: "A" },
      ],
      head: "A",
      current: null,
      highlights: ["A", "B", "C"],
      edgeHighlights: [],
    };
  }
  if (step === 1) {
    return {
      nodes: [
        { id: "A", value: "A", prev: "C", next: "B" },
        { id: "B", value: "B", prev: "A", next: "C" },
        { id: "C", value: "C", prev: "B", next: "A" },
      ],
      head: "A",
      current: "C",
      highlights: ["B", "C"],
      edgeHighlights: [["B", "C"]],
    };
  }
  if (step === 2) {
    return {
      nodes: [
        { id: "A", value: "A", prev: "C", next: "B" },
        { id: "B", value: "B", prev: "A", next: "C" },
        { id: "C", value: "C", prev: "B", next: "A" },
      ],
      head: "A",
      current: "A",
      highlights: ["C", "A"],
      edgeHighlights: [["C", "A"]],
    };
  }
  if (step === 3) {
    return {
      nodes: [
        { id: "A", value: "A", prev: "X", next: "B" },
        { id: "B", value: "B", prev: "A", next: "C" },
        { id: "C", value: "C", prev: "B", next: "X" },
        { id: "X", value: "X", prev: "C", next: "A" },
      ],
      head: "A",
      current: "X",
      highlights: ["C", "X", "A"],
      edgeHighlights: [
        ["C", "X"],
        ["X", "A"],
      ],
    };
  }
  // step 4: B 삭제
  return {
    nodes: [
      { id: "A", value: "A", prev: "X", next: "C" },
      { id: "C", value: "C", prev: "A", next: "X" },
      { id: "X", value: "X", prev: "C", next: "A" },
    ],
    head: "A",
    current: "A",
    highlights: ["A", "C"],
    edgeHighlights: [["A", "C"]],
  };
}

export function useCircularSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 원형 이중 연결 리스트 초기화: A ⇄ B ⇄ C ⇄ A (head=A)",
  ]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === 1) appendLog("[TRAVERSE] B에서 next를 따라 C로 이동. 임의 출발점에서 순회 시작.");
      if (next === 2) appendLog("[WRAP-AROUND] C에서 next를 따라가니 head A로 되돌아옴. 원형 결합 확인.");
      if (next === 3) appendLog("[INSERT] C와 A 사이 X 삽입. 끝-시작 경계가 자연스럽게 처리됨.");
      if (next === 4) appendLog("[DELETE] B 제거. A.next=C, C.prev=A로 양옆 재연결. 원형 유지.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: 원형 이중 연결 리스트 초기 상태."]);
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

export function CircularVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const state = buildState(step);

  const svgWidth = 800;
  const svgHeight = 400;
  const r = 30;
  const cx0 = svgWidth / 2;
  const cy0 = svgHeight / 2 + 10;
  const ringRadius = 130;

  // 원형 배치 (안정 좌표): 고정 anchor 4 슬롯에 노드를 매핑.
  // A/B/C 는 step 0~4 동안 동일 슬롯을 차지. 신규 X 는 빈 슬롯(3) 에 추가됨.
  // 결과: 회전 효과 없이 X 만 빈 공간에서 등장 → "삽입" 의미 명확.
  const SLOT_COUNT = 4;
  const slotByValue: Record<string, number> = { A: 0, B: 1, C: 2, X: 3 };
  const posOf = (id: string): { x: number; y: number } => {
    const slot = slotByValue[id];
    if (slot === undefined) return { x: 0, y: 0 };
    const angle = -Math.PI / 2 + (2 * Math.PI * slot) / SLOT_COUNT;
    return {
      x: cx0 + ringRadius * Math.cos(angle),
      y: cy0 + ringRadius * Math.sin(angle),
    };
  };

  // 호 화살표용 path 생성 (bulge 파라미터화: wrap-around 강조 시 30 사용).
  // edgeAt 으로 노드 경계점을 계산해 직선 곡선 모두 노드 안으로 파고들지 않게 한다.
  function arcPath(from: { x: number; y: number }, to: { x: number; y: number }, bulge = 18): string {
    const ep = edgeAt(from, to, r, r);
    // 살짝 바깥쪽으로 휘게 (중심에서 멀어지는 방향)
    const midX = (ep.x1 + ep.x2) / 2;
    const midY = (ep.y1 + ep.y2) / 2;
    const outX = midX - cx0;
    const outY = midY - cy0;
    const outDist = Math.sqrt(outX * outX + outY * outY) || 1;
    const cpX = midX + (outX / outDist) * bulge;
    const cpY = midY + (outY / outDist) * bulge;
    return `M ${ep.x1} ${ep.y1} Q ${cpX} ${cpY} ${ep.x2} ${ep.y2}`;
  }

  function arrowHead(to: { x: number; y: number }, from: { x: number; y: number }, color: string): React.JSX.Element {
    // 화살표 tip 은 to 노드 경계 위(edgeAt.x2/y2) — arcPath 끝점과 동일.
    const ep = edgeAt(from, to, r, r);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const unitX = dx / dist;
    const unitY = dy / dist;
    const tipX = ep.x2;
    const tipY = ep.y2;
    const baseX = tipX - unitX * 8;
    const baseY = tipY - unitY * 8;
    const perpX = -unitY * 5;
    const perpY = unitX * 5;
    return (
      <polygon
        points={`${tipX},${tipY} ${baseX + perpX},${baseY + perpY} ${baseX - perpX},${baseY - perpY}`}
        fill={color}
      />
    );
  }

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
        Circular Doubly Linked List · 끝과 시작이 결합
      </text>

      <text x={svgWidth / 2} y={56} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        {step === 0 && "초기 상태: A ⇄ B ⇄ C ⇄ A (원형 회전 초밥 벨트)"}
        {step === 1 && "Traverse: B에서 next를 따라 C로 이동"}
        {step === 2 && "Wrap-around: C.next가 head A로 되돌아옴"}
        {step === 3 && "Insert: C와 A 사이 X 삽입 (끝-시작 경계 처리 없음)"}
        {step === 4 && "Delete: B 제거. 양옆 재연결로 원형 유지"}
      </text>

      {/* next edges (호) — wrap-around (C→A 또는 X→A) 만 strokeWidth=3, bulge=30 으로 강조 */}
      {state.nodes.map((node) => {
        const from = posOf(node.id);
        const to = posOf(node.next);
        const isHighlighted = state.edgeHighlights.some(
          ([a, b]) => a === node.id && b === node.next,
        );
        // wrap-around 정의: next 가 head(A) 인 마지막 노드 (last → first 결합)
        const isWrap = node.next === state.head;
        const color = isHighlighted ? colorTokens.active : colorTokens.pointer;
        const strokeW = isWrap ? 3 : 2;
        const bulge = isWrap ? 30 : 18;
        return (
          <g key={`edge-${node.id}-${node.next}`}>
            <path
              d={arcPath(from, to, bulge)}
              stroke={color}
              strokeWidth={strokeW}
              fill="none"
            />
            {arrowHead(to, from, color)}
          </g>
        );
      })}

      {/* Nodes */}
      {state.nodes.map((node) => {
        const pos = posOf(node.id);
        const isCurrent = state.current === node.id;
        const isHighlighted = state.highlights.includes(node.id);
        const status: ColorToken = isCurrent ? "found" : isHighlighted ? "active" : "comparing";
        return (
          <NodeCircle
            key={`node-${node.id}`}
            cx={pos.x}
            cy={pos.y}
            r={r}
            value={node.value}
            status={status}
            showGlow={isCurrent || isHighlighted}
          />
        );
      })}

      {/* head pointer */}
      {(() => {
        const pos = posOf(state.head);
        return (
          <PointerArrow
            x={pos.x}
            y={pos.y - r - 8}
            label="head"
            color={colorTokens.found}
            direction="down"
          />
        );
      })()}

      {/* current pointer */}
      {state.current && state.current !== state.head && (
        (() => {
          const pos = posOf(state.current);
          return (
            <PointerArrow
              x={pos.x}
              y={pos.y + r + 32}
              label="current"
              color={colorTokens.active}
              direction="up"
            />
          );
        })()
      )}

      {/* 가운데에 "원형" 라벨 */}
      <text
        x={cx0}
        y={cy0 + 5}
        textAnchor="middle"
        fontSize={12}
        fill="hsl(var(--muted-foreground))"
        fontStyle="italic"
      >
        {step === 2 ? "wrap to head" : "circular ring"}
      </text>

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
