"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  colorTokens,
  edgeAt,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// Tree Basics: 순회 4종 + 깊이/높이 storyboard
// step 0: 트리 구조 소개 (깊이/높이 구분)
// step 1: 전위 순회 (Pre-order)  A B D E C F
// step 2: 중위 순회 (In-order)   D B E A C F
// step 3: 후위 순회 (Post-order) D E B F C A
// step 4: 레벨 순회 (Level-order) A B C D E F
// step 5: 4종 비교 요약

const MAX_STEPS = 6;

// 좌표: 회사 조직도 스타일
const NODE_POS: Record<string, { x: number; y: number }> = {
  A: { x: 400, y: 110 },
  B: { x: 250, y: 230 },
  C: { x: 550, y: 230 },
  D: { x: 170, y: 350 },
  E: { x: 330, y: 350 },
  // F는 C의 오른쪽 자식 → 시각상으로도 C(x=550) 오른쪽에 위치해야
  // 중위순회 [D,B,E,A,C,F] 의 좌→우 순서 및 BST 정렬과 일치한다.
  F: { x: 630, y: 350 },
};

const EDGES: Array<[string, string]> = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["B", "E"],
  ["C", "F"],
];

// 각 순회의 방문 순서 (고정 트리 기준)
const ORDERS = {
  preorder: ["A", "B", "D", "E", "C", "F"],
  inorder: ["D", "B", "E", "A", "C", "F"],
  postorder: ["D", "E", "B", "F", "C", "A"],
  levelorder: ["A", "B", "C", "D", "E", "F"],
} as const;

type Phase = "intro" | "preorder" | "inorder" | "postorder" | "levelorder" | "summary";

type TreeState = {
  currentNode: string | null;
  visited: string[];
  phase: Phase;
  orderLabel: string;
};

function buildState(step: number): TreeState {
  switch (step) {
    case 0:
      return { currentNode: null, visited: [], phase: "intro", orderLabel: "구조 소개" };
    case 1:
      return {
        currentNode: ORDERS.preorder[ORDERS.preorder.length - 1],
        visited: [...ORDERS.preorder],
        phase: "preorder",
        orderLabel: "전위 (Pre-order): 부모 → 좌 → 우",
      };
    case 2:
      return {
        currentNode: ORDERS.inorder[ORDERS.inorder.length - 1],
        visited: [...ORDERS.inorder],
        phase: "inorder",
        orderLabel: "중위 (In-order): 좌 → 부모 → 우",
      };
    case 3:
      return {
        currentNode: ORDERS.postorder[ORDERS.postorder.length - 1],
        visited: [...ORDERS.postorder],
        phase: "postorder",
        orderLabel: "후위 (Post-order): 좌 → 우 → 부모",
      };
    case 4:
      return {
        currentNode: ORDERS.levelorder[ORDERS.levelorder.length - 1],
        visited: [...ORDERS.levelorder],
        phase: "levelorder",
        orderLabel: "레벨 (Level-order): 깊이 순 (BFS)",
      };
    default:
      return { currentNode: null, visited: [], phase: "summary", orderLabel: "4종 순회 비교" };
  }
}

const STEP_MESSAGES: Record<number, string> = {
  1: "[전위 PRE-ORDER] 부모를 먼저 방문하고 좌·우로 내려갑니다. 결과 A B D E C F.",
  2: "[중위 IN-ORDER] 좌측을 모두 본 뒤 부모, 그다음 우측. 결과 D B E A C F.",
  3: "[후위 POST-ORDER] 자식을 먼저, 부모를 마지막에. 결과 D E B F C A.",
  4: "[레벨 LEVEL-ORDER] 같은 깊이를 왼→오로 훑는 BFS. 결과 A B C D E F.",
  5: "[요약] 같은 트리라도 순회 순서에 따라 출력이 전부 달라집니다.",
};

export function useTreeBasicsSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> 트리 초기화: 루트 A 아래 B/C, B 아래 D/E, C 아래 F. ▶ 또는 Push로 순회를 진행하세요.",
  ]);

  const handleSetStep = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(target, MAX_STEPS - 1));
    setStep(clamped);
    const base = "> 트리 초기화: 루트 A 아래 B/C, B 아래 D/E, C 아래 F. ▶ 또는 Push로 순회를 진행하세요.";
    const next = [base];
    for (let i = 1; i <= clamped; i++) {
      if (STEP_MESSAGES[i]) next.unshift(`> [Step ${i}] ${STEP_MESSAGES[i]}`);
    }
    setLogs(next);
  }, []);

  const advance = useCallback(() => {
    setStep((prev) => {
      const nextStepIdx = Math.min(prev + 1, MAX_STEPS - 1);
      if (nextStepIdx !== prev && STEP_MESSAGES[nextStepIdx]) {
        setLogs((l) => [`> [Step ${nextStepIdx}] ${STEP_MESSAGES[nextStepIdx]}`, ...l]);
      }
      return nextStepIdx;
    });
  }, []);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: 트리 초기 상태."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step },
      logs,
      // push: 자동재생/▶︎ 가 호출하는 advance. peek: 동일 advance(기존 버튼 호환).
      handlers: { push: advance, peek: advance, clear: reset },
      currentStep: step,
      maxSteps: MAX_STEPS,
      setStep: handleSetStep,
      nextStep: advance,
      reset,
    },
  };
}

const PHASE_COLOR: Record<Phase, ColorToken> = {
  intro: "active",
  preorder: "active",
  inorder: "comparing",
  postorder: "found",
  levelorder: "pointer",
  summary: "active",
};

export function TreeBasicsVisualizer({ data }: { data?: { step: number } }) {
  const step = data?.step ?? 0;
  const state = buildState(step);

  const svgWidth = 800;
  const svgHeight = 470;
  const r = 28;

  const accent = colorTokens[PHASE_COLOR[state.phase]];

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
        Tree Basics · 순회 4종 + 깊이/높이
      </text>

      <text x={svgWidth / 2} y={56} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        {step === 0 && "깊이(depth)=루트→노드 간선 수 · 높이(height)=트리 전체 최장 경로"}
        {step === 1 && "전위 순회: 부모를 먼저 → A B D E C F"}
        {step === 2 && "중위 순회: 좌측 먼저 → D B E A C F"}
        {step === 3 && "후위 순회: 자식 먼저 → D E B F C A"}
        {step === 4 && "레벨 순회: 깊이 순(BFS) → A B C D E F"}
        {step === 5 && "같은 트리, 다른 순회 → 다른 출력"}
      </text>

      {/* Edges */}
      {EDGES.map(([parent, child]) => {
        const p = NODE_POS[parent];
        const c = NODE_POS[child];
        const isVisitedParent = state.visited.includes(parent);
        const isVisitedChild = state.visited.includes(child);
        const status: ColorToken = isVisitedParent && isVisitedChild ? PHASE_COLOR[state.phase] : "muted";
        return (
          <EdgeLine
            key={`edge-${parent}-${child}`}
            {...edgeAt(p, c, r, r)}
            status={status}
            arrow
          />
        );
      })}

      {/* 방문 순번 라벨 (배지) */}
      {state.phase !== "intro" && state.phase !== "summary" &&
        state.visited.map((id, orderIdx) => {
          const pos = NODE_POS[id];
          return (
            <g key={`badge-${id}`}>
              <circle cx={pos.x + r - 4} cy={pos.y - r + 4} r={10} fill={accent} stroke="hsl(var(--background))" strokeWidth={1.5} />
              <text
                x={pos.x + r - 4}
                y={pos.y - r + 4}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={700}
                fill="hsl(var(--background))"
              >
                {orderIdx + 1}
              </text>
            </g>
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
        else if (isVisited) status = PHASE_COLOR[state.phase];
        else if (state.phase === "intro" && isRoot) status = "found";
        else if (state.phase === "intro" && isLeaf) status = "pointer";
        else status = "comparing";

        return (
          <g key={`node-${id}`}>
            {isCurrent && (
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r={r + 8}
                fill="none"
                stroke={colorTokens.found}
                strokeWidth={2}
                initial={{ opacity: 0.2, scale: 0.9 }}
                animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.95, 1.08, 0.95] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            )}
            <NodeCircle cx={pos.x} cy={pos.y} r={r} value={id} status={status} showGlow={isCurrent} />
          </g>
        );
      })}

      {/* Phase 라벨 + visited 순서 */}
      <text x={40} y={92} fontSize={12} fontWeight={600} fill={accent} fontFamily="ui-monospace, monospace">
        {state.orderLabel}
      </text>

      {state.visited.length > 0 && (
        <text x={40} y={112} fontSize={12} fill="hsl(var(--foreground))" fontFamily="ui-monospace, monospace">
          visited: [{state.visited.join(" → ")}]
        </text>
      )}

      {/* 깊이/높이 설명 (구조 소개 모드) */}
      {state.phase === "intro" && (
        <g>
          {/* depth 안내 (왼쪽 가이드) */}
          <text x={70} y={NODE_POS.A.y + 5} fontSize={11} fill="hsl(var(--muted-foreground))" fontStyle="italic">
            depth 0 · root
          </text>
          <text x={70} y={NODE_POS.B.y + 5} fontSize={11} fill="hsl(var(--muted-foreground))" fontStyle="italic">
            depth 1
          </text>
          <text x={70} y={NODE_POS.D.y + 5} fontSize={11} fill="hsl(var(--muted-foreground))" fontStyle="italic">
            depth 2 · leaf
          </text>

          {/* height 막대 (오른쪽): root → leaf 까지의 최장 경로 = 2 */}
          <line x1={svgWidth - 40} y1={NODE_POS.A.y} x2={svgWidth - 40} y2={NODE_POS.D.y} stroke={colorTokens.active} strokeWidth={2} />
          <line x1={svgWidth - 46} y1={NODE_POS.A.y} x2={svgWidth - 34} y2={NODE_POS.A.y} stroke={colorTokens.active} strokeWidth={2} />
          <line x1={svgWidth - 46} y1={NODE_POS.D.y} x2={svgWidth - 34} y2={NODE_POS.D.y} stroke={colorTokens.active} strokeWidth={2} />
          <text x={svgWidth - 30} y={(NODE_POS.A.y + NODE_POS.D.y) / 2 + 4} fontSize={11} fontWeight={600} fill={colorTokens.active}>
            height = 2
          </text>

          {/* 구분 캡션 */}
          <text x={40} y={svgHeight - 44} fontSize={11} fill="hsl(var(--muted-foreground))">
            depth = 노드별 속성 (이 노드가 얼마나 아래인가)
          </text>
          <text x={40} y={svgHeight - 28} fontSize={11} fill="hsl(var(--muted-foreground))">
            height = 트리 전체 속성 (가장 깊은 리프까지)
          </text>
        </g>
      )}

      {/* 4종 순회 요약 (summary) */}
      {state.phase === "summary" && (
        <g>
          {(
            [
              { label: "pre  (부모→좌→우)", arr: ORDERS.preorder, color: colorTokens.active },
              { label: "in   (좌→부모→우)", arr: ORDERS.inorder, color: colorTokens.comparing },
              { label: "post (좌→우→부모)", arr: ORDERS.postorder, color: colorTokens.found },
              { label: "level(깊이 순 BFS)", arr: ORDERS.levelorder, color: colorTokens.pointer },
            ] as const
          ).map((row, i) => (
            <g key={row.label}>
              <text x={40} y={svgHeight - 96 + i * 20} fontSize={12} fill={row.color} fontFamily="ui-monospace, monospace">
                {row.label}
              </text>
              <text x={250} y={svgHeight - 96 + i * 20} fontSize={12} fill="hsl(var(--foreground))" fontFamily="ui-monospace, monospace">
                {row.arr.join(" ")}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* Step counter */}
      <text
        x={svgWidth - 24}
        y={svgHeight - 16}
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
