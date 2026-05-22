"use client";

import { useState, useCallback } from "react";
import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  colorTokens,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Tree Basics: 6 step storyboard (전위·후위 순회)
// step 0: 트리 구조 소개
// step 1: 전위 순회 시작 (A 방문)
// step 2: 좌측 서브트리 진입 (A B D)
// step 3: B 우측 자식 방문 (A B D E)
// step 4: 우측 서브트리 진입 (A B D E C F)
// step 5: 후위 순회 비교 (D E B F C A)

const MAX_STEPS = 6;

// 좌표: 회사 조직도 스타일
const NODE_POS: Record<string, { x: number; y: number }> = {
  A: { x: 400, y: 100 },
  B: { x: 250, y: 220 },
  C: { x: 550, y: 220 },
  D: { x: 170, y: 340 },
  E: { x: 330, y: 340 },
  F: { x: 470, y: 340 },
};

const EDGES: Array<[string, string]> = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["B", "E"],
  ["C", "F"],
];

type TreeState = {
  currentNode: string | null;
  visited: string[];
  phase: "intro" | "preorder" | "postorder";
};

function buildState(step: number): TreeState {
  if (step === 0) {
    return { currentNode: "A", visited: [], phase: "intro" };
  }
  if (step === 1) {
    return { currentNode: "A", visited: ["A"], phase: "preorder" };
  }
  if (step === 2) {
    return { currentNode: "D", visited: ["A", "B", "D"], phase: "preorder" };
  }
  if (step === 3) {
    return { currentNode: "E", visited: ["A", "B", "D", "E"], phase: "preorder" };
  }
  if (step === 4) {
    return { currentNode: "F", visited: ["A", "B", "D", "E", "C", "F"], phase: "preorder" };
  }
  // step 5: postorder
  return { currentNode: "A", visited: ["D", "E", "B", "F", "C", "A"], phase: "postorder" };
}

export function useTreeBasicsSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 트리 초기화: 루트 A 아래 B/C, B 아래 D/E, C 아래 F",
  ]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === 1) appendLog("[PREORDER] 전위 순회 시작. 루트 A 방문.");
      if (next === 2) appendLog("[PREORDER] 좌측 서브트리 진입. B → D 순서로 내려감. 방문 결과 A B D.");
      if (next === 3) appendLog("[PREORDER] B의 우측 자식 E 방문. 좌측 서브트리 순회 완료. 결과 A B D E.");
      if (next === 4) appendLog("[PREORDER] 우측 서브트리로 진입. C → F. 최종 결과 A B D E C F.");
      if (next === 5) appendLog("[POSTORDER] 후위 순회 비교. 자식 먼저, 부모 나중. 결과 D E B F C A.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: 트리 초기 상태."]);
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

export function TreeBasicsVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const state = buildState(step);

  const svgWidth = 800;
  const svgHeight = 460;
  const r = 28;

  const phaseLabel =
    state.phase === "intro"
      ? "구조 소개"
      : state.phase === "preorder"
      ? "전위 순회 (Pre-order)"
      : "후위 순회 (Post-order)";

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
        Tree Basics · 회사 조직도 (부모-자식 계층)
      </text>

      <text x={svgWidth / 2} y={56} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        {step === 0 && "구조 소개: 루트 A 아래 B/C, B 아래 D/E, C 아래 F"}
        {step === 1 && "전위 순회 시작: 루트 A 방문"}
        {step === 2 && "좌측 진입: 방문 결과 A → B → D"}
        {step === 3 && "B의 우측 자식 E 방문: A → B → D → E"}
        {step === 4 && "우측 진입: A → B → D → E → C → F 완성"}
        {step === 5 && "후위 순회 비교: D → E → B → F → C → A"}
      </text>

      {/* Edges */}
      {EDGES.map(([parent, child]) => {
        const p = NODE_POS[parent];
        const c = NODE_POS[child];
        const isVisitedParent = state.visited.includes(parent);
        const isVisitedChild = state.visited.includes(child);
        const status: ColorToken =
          isVisitedParent && isVisitedChild ? "active" : "muted";
        return (
          <EdgeLine
            key={`edge-${parent}-${child}`}
            x1={p.x}
            y1={p.y + r}
            x2={c.x}
            y2={c.y - r}
            status={status}
          />
        );
      })}

      {/* Nodes */}
      {Object.entries(NODE_POS).map(([id, pos]) => {
        const isCurrent = state.currentNode === id;
        const isVisited = state.visited.includes(id);
        const isLeaf = ["D", "E", "F"].includes(id);
        const isRoot = id === "A";

        let status: ColorToken;
        if (isCurrent) status = "found";
        else if (isVisited) status = "active";
        else if (state.phase === "intro" && isRoot) status = "found";
        else if (state.phase === "intro" && isLeaf) status = "pointer";
        else status = "comparing";

        return (
          <NodeCircle
            key={`node-${id}`}
            cx={pos.x}
            cy={pos.y}
            r={r}
            value={id}
            status={status}
            showGlow={isCurrent}
          />
        );
      })}

      {/* Phase 라벨 + visited 순서 */}
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

      {state.visited.length > 0 && (
        <text
          x={40}
          y={112}
          fontSize={12}
          fill="hsl(var(--foreground))"
          fontFamily="ui-monospace, monospace"
        >
          visited: [{state.visited.join(", ")}]
        </text>
      )}

      {/* depth 라벨 (구조 소개 모드에서만) */}
      {state.phase === "intro" && (
        <g>
          <text x={80} y={NODE_POS.A.y + 5} fontSize={11} fill="hsl(var(--muted-foreground))" fontStyle="italic">
            depth 0 (root)
          </text>
          <text x={80} y={NODE_POS.B.y + 5} fontSize={11} fill="hsl(var(--muted-foreground))" fontStyle="italic">
            depth 1
          </text>
          <text x={80} y={NODE_POS.D.y + 5} fontSize={11} fill="hsl(var(--muted-foreground))" fontStyle="italic">
            depth 2 (leaf)
          </text>
        </g>
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
