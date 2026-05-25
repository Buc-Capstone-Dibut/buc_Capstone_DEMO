"use client";

import { useState, useCallback } from "react";
import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  PointerArrow,
  colorTokens,
  edgeAt,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// BST: 6 step storyboard
// step 0: 빈 트리
// step 1: 5 삽입 (root)
// step 2: 3 삽입 (left)
// step 3: 7 삽입 (right)
// step 4: 3 검색 (left 경로)
// step 5: 7 검색 (right 경로)

const MAX_STEPS = 6;

const NODE_POS: Record<number, { x: number; y: number }> = {
  5: { x: 400, y: 130 },
  3: { x: 280, y: 260 },
  7: { x: 520, y: 260 },
};

type BstState = {
  presentValues: number[];
  currentValue: number | null;
  path: number[]; // 진행 경로 (탐색/삽입)
  phase: "empty" | "insert" | "search-success";
};

function buildState(step: number): BstState {
  if (step === 0) {
    return { presentValues: [], currentValue: null, path: [], phase: "empty" };
  }
  if (step === 1) {
    return { presentValues: [5], currentValue: 5, path: [5], phase: "insert" };
  }
  if (step === 2) {
    return { presentValues: [5, 3], currentValue: 3, path: [5, 3], phase: "insert" };
  }
  if (step === 3) {
    return { presentValues: [5, 3, 7], currentValue: 7, path: [5, 7], phase: "insert" };
  }
  if (step === 4) {
    return { presentValues: [5, 3, 7], currentValue: 3, path: [5, 3], phase: "search-success" };
  }
  // step 5: 7 검색
  return { presentValues: [5, 3, 7], currentValue: 7, path: [5, 7], phase: "search-success" };
}

export function useBstSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> BST 초기화: 빈 트리 (root=null)",
  ]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === 1) appendLog("[INSERT 5] 빈 트리이므로 5가 root가 됨.");
      if (next === 2) appendLog("[INSERT 3] 5와 비교 → 3 < 5 → 왼쪽 자식 자리.");
      if (next === 3) appendLog("[INSERT 7] 5와 비교 → 7 > 5 → 오른쪽 자식 자리.");
      if (next === 4) appendLog("[SEARCH 3] 5와 비교 → 3 < 5 → 왼쪽으로. 3 발견. O(log N) 평균.");
      if (next === 5) appendLog("[SEARCH 7] 5와 비교 → 7 > 5 → 오른쪽으로. 7 발견. 불변식 활용 검색.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: 빈 BST."]);
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

export function BstVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const state = buildState(step);

  const svgWidth = 800;
  const svgHeight = 420;
  const r = 32;

  const phaseLabel =
    state.phase === "empty"
      ? "빈 트리 (root=null)"
      : state.phase === "insert"
      ? `Insert ${state.currentValue}`
      : `Search ${state.currentValue} (found)`;

  // Edge: parent → child (path 강조)
  function isPathEdge(parent: number, child: number): boolean {
    const idxP = state.path.indexOf(parent);
    const idxC = state.path.indexOf(child);
    return idxP >= 0 && idxC === idxP + 1;
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
        Binary Search Tree · 사전 색인 (좌&lt;부모&lt;우)
      </text>

      <text x={svgWidth / 2} y={56} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        {step === 0 && "빈 트리에서 시작. 값을 하나씩 삽입하며 BST를 구축"}
        {step === 1 && "5 삽입 → root. 첫 노드는 비교 없이 자리잡음"}
        {step === 2 && "3 삽입 → 3<5 비교 → 5의 왼쪽 자식 자리"}
        {step === 3 && "7 삽입 → 7>5 비교 → 5의 오른쪽 자식 자리"}
        {step === 4 && "3 검색 → 5에서 왼쪽으로 → 3 발견 (1회 비교)"}
        {step === 5 && "7 검색 → 5에서 오른쪽으로 → 7 발견 (1회 비교)"}
      </text>

      {/* Empty placeholder (step 0) */}
      {state.phase === "empty" && (
        <g>
          <rect
            x={svgWidth / 2 - 90}
            y={svgHeight / 2 - 36}
            width={180}
            height={72}
            fill="none"
            stroke={colorTokens.muted}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            rx={10}
          />
          <text
            x={svgWidth / 2}
            y={svgHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fill={colorTokens.muted}
            fontFamily="ui-monospace, monospace"
          >
            root = null
          </text>
          <text
            x={svgWidth / 2}
            y={svgHeight / 2 + 22}
            textAnchor="middle"
            fontSize={11}
            fill={colorTokens.muted}
            fontStyle="italic"
          >
            첫 값을 삽입하면 root가 됩니다
          </text>
        </g>
      )}

      {/* Edges */}
      {state.presentValues.includes(5) && state.presentValues.includes(3) && (
        <EdgeLine
          {...edgeAt(NODE_POS[5], NODE_POS[3], r, r)}
          status={isPathEdge(5, 3) ? "active" : "muted"}
          arrow
        />
      )}
      {state.presentValues.includes(5) && state.presentValues.includes(7) && (
        <EdgeLine
          {...edgeAt(NODE_POS[5], NODE_POS[7], r, r)}
          status={isPathEdge(5, 7) ? "active" : "muted"}
          arrow
        />
      )}

      {/* Nodes */}
      {state.presentValues.map((v) => {
        const pos = NODE_POS[v];
        const isCurrent = state.currentValue === v;
        const isOnPath = state.path.includes(v);

        let status: ColorToken;
        if (isCurrent && state.phase === "search-success") status = "found";
        else if (isCurrent && state.phase === "insert") status = "found";
        else if (isOnPath) status = "active";
        else status = "comparing";

        return (
          <NodeCircle
            key={`node-${v}`}
            cx={pos.x}
            cy={pos.y}
            r={r}
            value={v}
            status={status}
            showGlow={isCurrent}
          />
        );
      })}

      {/* root pointer (root가 있을 때) */}
      {state.presentValues.includes(5) && (
        <PointerArrow
          x={NODE_POS[5].x}
          y={NODE_POS[5].y - r - 8}
          label="root"
          color={colorTokens.found}
          direction="down"
        />
      )}

      {/* 불변식 라벨 (root 옆에 좌<5<우) */}
      {state.presentValues.length >= 2 && (
        <text
          x={NODE_POS[5].x + r + 18}
          y={NODE_POS[5].y + 5}
          fontSize={11}
          fill={colorTokens.muted}
          fontFamily="ui-monospace, monospace"
          fontStyle="italic"
        >
          left &lt; 5 &lt; right
        </text>
      )}

      {/* Phase 라벨 + path */}
      <text
        x={40}
        y={92}
        fontSize={12}
        fontWeight={600}
        fill={colorTokens.active}
        fontFamily="ui-monospace, monospace"
      >
        {phaseLabel}
      </text>

      {state.path.length > 0 && (
        <text
          x={40}
          y={112}
          fontSize={12}
          fill="hsl(var(--foreground))"
          fontFamily="ui-monospace, monospace"
        >
          path: [{state.path.join(" → ")}]
        </text>
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
