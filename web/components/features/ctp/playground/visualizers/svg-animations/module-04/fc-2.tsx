"use client";

import { useState, useCallback } from "react";
import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  NodeCircle,
  EdgeLine,
  PointerArrow,
  colorTokens,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// FC-2: 스택/재귀/정렬 통합 (5 step)
// 좌측: stack (callStack)
// 중앙: queue (보조 — push/pop과 대조)
// 우측: recursion-tree (분할 정복)
const MAX_STEPS = 5;

type Frame = { lo: number; hi: number };

function buildState(step: number): {
  callStack: Frame[];
  queue: number[];
  sortedResult: number[];
  treeHighlight: number[]; // tree node indices
  stage: string;
} {
  if (step === 0) return { callStack: [], queue: [8, 3, 6, 1, 7, 4], sortedResult: [], treeHighlight: [0], stage: "INPUT" };
  if (step === 1) return { callStack: [{ lo: 0, hi: 5 }], queue: [8, 3, 6, 1, 7, 4], sortedResult: [], treeHighlight: [0], stage: "PUSH root" };
  if (step === 2) return { callStack: [{ lo: 0, hi: 2 }, { lo: 4, hi: 5 }], queue: [8, 3, 6, 1, 7, 4], sortedResult: [], treeHighlight: [0, 1, 2], stage: "SPLIT" };
  if (step === 3) return { callStack: [{ lo: 0, hi: 2 }], queue: [8, 3, 6, 1, 7, 4], sortedResult: [4, 7], treeHighlight: [0, 1, 2, 3, 4], stage: "POP partial" };
  return { callStack: [], queue: [8, 3, 6, 1, 7, 4], sortedResult: [1, 3, 4, 6, 7, 8], treeHighlight: [0, 1, 2, 3, 4, 5, 6], stage: "DONE" };
}

export function useFc2Sim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> FC-2 스택/재귀/정렬 종합 시작. 입력=[8,3,6,1,7,4]",
  ]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === 1) appendLog("[PUSH] quickSort(0,5) 첫 프레임이 호출 스택에 push.");
      if (next === 2) appendLog("[SPLIT] 피벗 분할 결과 좌·우 하위 호출이 트리로 펼쳐짐.");
      if (next === 3) appendLog("[POP] 기저 조건 도달한 프레임이 pop되며 부분 정렬이 누적.");
      if (next === 4) appendLog("[DONE] 스택이 비면 전체 정렬 완료. 재귀=명시적 스택 등가.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: FC-2 초기 상태."]);
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

export function Fc2Visualizer({ data }: { data: { step: number } }) {
  const { step } = data;
  const state = buildState(step);

  const svgWidth = 800;
  const svgHeight = 420;

  // 3-pane layout: stack (left) · queue (mid) · tree (right)
  const paneTop = 90;
  const stackX = 60;
  const queueX = 290;
  const treeX = 480;

  // ---- Stack pane ----
  const stackSlotW = 130;
  const stackSlotH = 36;
  const stackBaseY = 360;
  const stackMax = 4;

  // ---- Queue pane ----
  const queueSlotW = 36;
  const queueSlotH = 36;
  const queueGap = 4;

  // ---- Tree pane ----
  // 3-level binary tree positions (root, 2 children, 4 grandchildren)
  const treeNodes: Array<{ idx: number; cx: number; cy: number; lo: number; hi: number }> = [
    { idx: 0, cx: treeX + 130, cy: paneTop + 30, lo: 0, hi: 5 },
    { idx: 1, cx: treeX + 70, cy: paneTop + 100, lo: 0, hi: 2 },
    { idx: 2, cx: treeX + 190, cy: paneTop + 100, lo: 4, hi: 5 },
    { idx: 3, cx: treeX + 35, cy: paneTop + 170, lo: 0, hi: 0 },
    { idx: 4, cx: treeX + 105, cy: paneTop + 170, lo: 2, hi: 2 },
    { idx: 5, cx: treeX + 160, cy: paneTop + 170, lo: 4, hi: 4 },
    { idx: 6, cx: treeX + 220, cy: paneTop + 170, lo: 5, hi: 5 },
  ];
  const treeEdges: Array<[number, number]> = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6],
  ];

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className="font-mono"
    >
      <CyberGrid width={svgWidth} height={svgHeight} />
      <NeonGlowFilters />

      {/* Header */}
      <text x={svgWidth / 2} y={28} textAnchor="middle" fontSize={16} fontWeight={700} fill="hsl(var(--foreground))">
        FC-2 · 스택 · 재귀 · 분할 정복 정렬 통합
      </text>
      <text x={svgWidth / 2} y={50} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        Stage {step + 1}/{MAX_STEPS} · {state.stage}
      </text>

      {/* ===== Stack Pane ===== */}
      <text x={stackX + stackSlotW / 2} y={paneTop - 10} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
        Call Stack (LIFO)
      </text>
      {/* slot guidelines */}
      {Array.from({ length: stackMax }).map((_, i) => {
        const y = stackBaseY - (i + 1) * (stackSlotH + 4);
        return (
          <rect
            key={`s-slot-${i}`}
            x={stackX}
            y={y}
            width={stackSlotW}
            height={stackSlotH}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={1}
            strokeDasharray="3 3"
            rx={4}
          />
        );
      })}
      {/* frames */}
      {state.callStack.map((f, i) => {
        const y = stackBaseY - (i + 1) * (stackSlotH + 4);
        const isTop = i === state.callStack.length - 1;
        return (
          <ArrayBox
            key={`frame-${i}`}
            x={stackX}
            y={y}
            width={stackSlotW}
            height={stackSlotH}
            value={`qs(${f.lo},${f.hi})`}
            status={isTop ? "active" : "comparing"}
            showGlow={isTop}
          />
        );
      })}
      {state.callStack.length > 0 && (
        <PointerArrow
          x={stackX + stackSlotW + 18}
          y={stackBaseY - state.callStack.length * (stackSlotH + 4) + stackSlotH / 2}
          label="TOP"
          color={colorTokens.active}
          direction="left"
        />
      )}
      {state.callStack.length === 0 && (
        <text x={stackX + stackSlotW / 2} y={stackBaseY - stackSlotH / 2 + 4} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
          empty
        </text>
      )}

      {/* ===== Queue / Input Pane ===== */}
      <text x={queueX + (state.queue.length * (queueSlotW + queueGap)) / 2} y={paneTop - 10} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
        Input Array
      </text>
      {state.queue.map((v, i) => {
        const x = queueX + i * (queueSlotW + queueGap);
        const y = paneTop + 10;
        const status: ColorToken = state.sortedResult.includes(v) ? "found" : "default";
        return (
          <ArrayBox
            key={`q-${i}`}
            x={x}
            y={y}
            width={queueSlotW}
            height={queueSlotH}
            value={v}
            status={status}
            showGlow={status === "found"}
          />
        );
      })}

      {/* Sorted result row (below input) */}
      <text x={queueX} y={paneTop + 100} fontSize={11} fill="hsl(var(--muted-foreground))">
        sortedResult:
      </text>
      {state.sortedResult.map((v, i) => {
        const x = queueX + i * (queueSlotW + queueGap);
        const y = paneTop + 110;
        return (
          <ArrayBox
            key={`sr-${i}`}
            x={x}
            y={y}
            width={queueSlotW}
            height={queueSlotH}
            value={v}
            status="found"
            showGlow
          />
        );
      })}

      {/* ===== Tree Pane ===== */}
      <text x={treeX + 130} y={paneTop - 10} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
        Recursion Tree
      </text>
      {treeEdges.map(([a, b], i) => {
        const na = treeNodes[a];
        const nb = treeNodes[b];
        const active = state.treeHighlight.includes(a) && state.treeHighlight.includes(b);
        return (
          <EdgeLine
            key={`e-${i}`}
            x1={na.cx}
            y1={na.cy + 16}
            x2={nb.cx}
            y2={nb.cy - 16}
            status={active ? "active" : "muted"}
          />
        );
      })}
      {treeNodes.map((n) => {
        const isHL = state.treeHighlight.includes(n.idx);
        const isLeaf = n.lo === n.hi;
        return (
          <g key={`n-${n.idx}`}>
            <NodeCircle
              cx={n.cx}
              cy={n.cy}
              r={18}
              value={`${n.lo}-${n.hi}`}
              status={isHL ? (isLeaf ? "found" : "active") : "default"}
              showGlow={isHL && step >= 2}
            />
          </g>
        );
      })}
    </svg>
  );
}
