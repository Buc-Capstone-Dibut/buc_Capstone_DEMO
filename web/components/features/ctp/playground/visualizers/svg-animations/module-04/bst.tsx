"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CyberGrid,
  NeonGlowFilters,
  NodeCircle,
  EdgeLine,
  ArrayBox,
  PointerArrow,
  colorTokens,
  edgeAt,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// BST: 데이터 기반 storyboard (하드코딩 3노드 제거)
// 데이터셋을 순서대로 삽입하며 BST 구축 → 검색 → 중위순회(정렬) → 균형붕괴 비교.
// step 0: 빈 트리
// step 1..n: DATASET 값 하나씩 삽입
// step n+1: 검색 데모
// step n+2: 중위 순회 = 정렬 출력
// step n+3: 균형 붕괴 (오름차순 입력 → 선형 트리)

// 삽입 순서가 균형 잡힌 트리를 만들도록 구성된 데이터셋.
const DATASET = [50, 30, 70, 20, 40, 60];
const SEARCH_TARGET = 40;

// ---- BST 빌드 (값으로부터 부모/자식 관계 계산) ----
type BstNode = { value: number; left: number | null; right: number | null; parent: number | null; depth: number };

function buildBst(values: number[]): Map<number, BstNode> {
  const map = new Map<number, BstNode>();
  let root: number | null = null;
  for (const v of values) {
    if (map.has(v)) continue;
    const node: BstNode = { value: v, left: null, right: null, parent: null, depth: 0 };
    if (root === null) {
      root = v;
      map.set(v, node);
      continue;
    }
    let cur = root;
    while (true) {
      const curNode = map.get(cur)!;
      if (v < cur) {
        if (curNode.left === null) {
          curNode.left = v;
          node.parent = cur;
          node.depth = curNode.depth + 1;
          break;
        }
        cur = curNode.left;
      } else {
        if (curNode.right === null) {
          curNode.right = v;
          node.parent = cur;
          node.depth = curNode.depth + 1;
          break;
        }
        cur = curNode.right;
      }
    }
    map.set(v, node);
  }
  return map;
}

const FULL_TREE = buildBst(DATASET);
const ROOT_VALUE = DATASET[0];

// 탐색 경로 (root → target). 삽입/검색 공통.
function pathTo(values: number[], target: number): number[] {
  const tree = buildBst(values);
  const path: number[] = [];
  let cur: number | null = values[0] ?? null;
  while (cur !== null) {
    path.push(cur);
    if (cur === target) break;
    cur = target < cur ? tree.get(cur)!.left : tree.get(cur)!.right;
  }
  return path;
}

// 중위 순회 (정렬 결과)
function inorder(tree: Map<number, BstNode>, rootVal: number): number[] {
  const out: number[] = [];
  const walk = (v: number | null) => {
    if (v === null) return;
    const n = tree.get(v)!;
    walk(n.left);
    out.push(v);
    walk(n.right);
  };
  walk(rootVal);
  return out;
}

// ---- 좌표 계산 (트리 레이아웃: 깊이=행, in-order 위치=열) ----
const SVG_W = 800;
const SVG_H = 440;
const R = 28;

function layout(tree: Map<number, BstNode>, rootVal: number): Record<number, { x: number; y: number }> {
  const order = inorder(tree, rootVal); // x축은 중위 순서로 균등 배치
  const maxDepth = Math.max(...Array.from(tree.values()).map((n) => n.depth), 0);
  const pos: Record<number, { x: number; y: number }> = {};
  const left = 140;
  const right = SVG_W - 140;
  const top = 150;
  const rowGap = maxDepth > 0 ? Math.min(90, (SVG_H - top - 60) / maxDepth) : 90;
  order.forEach((v, i) => {
    const frac = order.length > 1 ? i / (order.length - 1) : 0.5;
    pos[v] = { x: left + frac * (right - left), y: top + tree.get(v)!.depth * rowGap };
  });
  return pos;
}

const FULL_POS = layout(FULL_TREE, ROOT_VALUE);

const N = DATASET.length;
const STEP_INSERT_END = N; // step 1..N = 삽입
const STEP_SEARCH = N + 1;
const STEP_INORDER = N + 2;
const STEP_SKEW = N + 3;
const MAX_STEPS = N + 4; // 0(빈) + N(삽입) + 검색 + 중위 + 균형붕괴

type Phase = "empty" | "insert" | "search" | "inorder" | "skew";

type BstState = {
  present: number[]; // 현재 그려진 노드 값
  current: number | null;
  path: number[];
  phase: Phase;
};

function buildState(step: number): BstState {
  if (step === 0) return { present: [], current: null, path: [], phase: "empty" };
  if (step >= 1 && step <= STEP_INSERT_END) {
    const present = DATASET.slice(0, step);
    const inserted = DATASET[step - 1];
    return { present, current: inserted, path: pathTo(present, inserted), phase: "insert" };
  }
  if (step === STEP_SEARCH) {
    return { present: [...DATASET], current: SEARCH_TARGET, path: pathTo(DATASET, SEARCH_TARGET), phase: "search" };
  }
  if (step === STEP_INORDER) {
    return { present: [...DATASET], current: null, path: [], phase: "inorder" };
  }
  return { present: [...DATASET], current: null, path: [], phase: "skew" };
}

const STEP_MSG: Record<number, string> = {
  [STEP_SEARCH]: `[SEARCH ${SEARCH_TARGET}] 루트부터 한 방향으로만 내려가 ${SEARCH_TARGET} 발견. 평균 O(log N).`,
  [STEP_INORDER]: `[IN-ORDER] 중위 순회 → ${inorder(FULL_TREE, ROOT_VALUE).join(", ")} (오름차순 정렬).`,
  [STEP_SKEW]: "[SKEW] 오름차순 입력은 한쪽으로만 자라 선형 리스트가 됨 → 최악 O(N). 균형 트리가 필요한 이유.",
};

function insertMsg(step: number): string {
  const v = DATASET[step - 1];
  if (step === 1) return `[INSERT ${v}] 빈 트리 → ${v} 가 root.`;
  const p = pathTo(DATASET.slice(0, step), v);
  const parent = p[p.length - 2];
  const dir = v < parent ? "왼쪽" : "오른쪽";
  return `[INSERT ${v}] 경로 ${p.join(" → ")}. ${parent} 와 비교 → ${dir} 자식.`;
}

export function useBstSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    `> BST 초기화: 데이터셋 [${DATASET.join(", ")}] 을 순서대로 삽입합니다. ▶ 또는 Push로 진행.`,
  ]);

  const msgFor = useCallback((s: number): string | null => {
    if (s >= 1 && s <= STEP_INSERT_END) return insertMsg(s);
    return STEP_MSG[s] ?? null;
  }, []);

  const handleSetStep = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(target, MAX_STEPS - 1));
      setStep(clamped);
      const base = `> BST 초기화: 데이터셋 [${DATASET.join(", ")}] 을 순서대로 삽입합니다. ▶ 또는 Push로 진행.`;
      const next = [base];
      for (let i = 1; i <= clamped; i++) {
        const m = msgFor(i);
        if (m) next.unshift(`> [Step ${i}] ${m}`);
      }
      setLogs(next);
    },
    [msgFor],
  );

  const advance = useCallback(() => {
    setStep((prev) => {
      const nextIdx = Math.min(prev + 1, MAX_STEPS - 1);
      if (nextIdx !== prev) {
        const m = msgFor(nextIdx);
        if (m) setLogs((l) => [`> [Step ${nextIdx}] ${m}`, ...l]);
      }
      return nextIdx;
    });
  }, [msgFor]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs([`> 시스템 리셋: 빈 BST. 데이터셋 [${DATASET.join(", ")}].`]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step },
      logs,
      handlers: { push: advance, peek: advance, clear: reset },
      currentStep: step,
      maxSteps: MAX_STEPS,
      setStep: handleSetStep,
      nextStep: advance,
      reset,
    },
  };
}

export function BstVisualizer({ data }: { data?: { step: number } }) {
  const step = data?.step ?? 0;
  const state = buildState(step);

  const phaseLabel =
    state.phase === "empty"
      ? "빈 트리 (root=null)"
      : state.phase === "insert"
      ? `Insert ${state.current}`
      : state.phase === "search"
      ? `Search ${state.current}`
      : state.phase === "inorder"
      ? "In-order 순회 = 정렬"
      : "균형 붕괴 (skewed)";

  function isPathEdge(parent: number, child: number): boolean {
    const ip = state.path.indexOf(parent);
    const ic = state.path.indexOf(child);
    return ip >= 0 && ic === ip + 1;
  }

  // skew 단계용: 오름차순 입력 트리(선형) 좌표.
  // 균형 트리(좌 패널, x≈[99,317])와 겹치지 않도록 우측으로 분리 배치한다.
  const sorted = inorder(FULL_TREE, ROOT_VALUE);
  const skewPos: Record<number, { x: number; y: number }> = {};
  sorted.forEach((v, i) => {
    skewPos[v] = { x: 430 + i * 30, y: 150 + i * 42 };
  });

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" preserveAspectRatio="xMidYMid meet" className="font-mono">
      <CyberGrid width={SVG_W} height={SVG_H} />
      <NeonGlowFilters />

      <text x={SVG_W / 2} y={32} textAnchor="middle" fontSize={16} fontWeight={700} fill="hsl(var(--foreground))">
        Binary Search Tree · 좌&lt;부모&lt;우 (데이터셋 [{DATASET.join(",")}])
      </text>

      <text x={SVG_W / 2} y={56} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        {state.phase === "empty" && "빈 트리에서 시작. 데이터를 하나씩 삽입하며 BST를 구축합니다."}
        {state.phase === "insert" && `${state.current} 삽입 → 루트부터 비교하며 자리를 찾습니다.`}
        {state.phase === "search" && `${state.current} 검색 → 한 방향 탐색. 평균 O(log N).`}
        {state.phase === "inorder" && "중위 순회 결과는 항상 오름차순으로 정렬됩니다."}
        {state.phase === "skew" && "오름차순으로만 삽입하면 트리가 한쪽으로 기울어 O(N)이 됩니다."}
      </text>

      {/* Empty placeholder */}
      {state.phase === "empty" && (
        <g>
          <rect
            x={SVG_W / 2 - 90}
            y={SVG_H / 2 - 36}
            width={180}
            height={72}
            fill="none"
            stroke={colorTokens.muted}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            rx={10}
          />
          <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" dominantBaseline="middle" fontSize={14} fill={colorTokens.muted} fontFamily="ui-monospace, monospace">
            root = null
          </text>
          <text x={SVG_W / 2} y={SVG_H / 2 + 24} textAnchor="middle" fontSize={11} fill={colorTokens.muted} fontStyle="italic">
            첫 값을 삽입하면 root가 됩니다
          </text>
        </g>
      )}

      {/* ===== 정상 트리 (empty/skew 제외) ===== */}
      {state.phase !== "empty" && state.phase !== "skew" && (
        <g>
          {/* Edges */}
          {state.present.map((v) => {
            const node = FULL_TREE.get(v)!;
            return (["left", "right"] as const).map((side) => {
              const child = node[side];
              if (child === null || !state.present.includes(child)) return null;
              return (
                <EdgeLine
                  key={`edge-${v}-${child}`}
                  {...edgeAt(FULL_POS[v], FULL_POS[child], R, R)}
                  status={isPathEdge(v, child) ? "active" : "muted"}
                  arrow
                />
              );
            });
          })}

          {/* Nodes */}
          {state.present.map((v) => {
            const pos = FULL_POS[v];
            const isCurrent = state.current === v;
            const isOnPath = state.path.includes(v);
            const isInorder = state.phase === "inorder";

            let status: ColorToken;
            if (isInorder) status = "found";
            else if (isCurrent) status = "found";
            else if (isOnPath) status = "active";
            else status = "comparing";

            return (
              <g key={`node-${v}`}>
                {isCurrent && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={R + 8}
                    fill="none"
                    stroke={colorTokens.found}
                    strokeWidth={2}
                    initial={{ opacity: 0.2 }}
                    animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.95, 1.08, 0.95] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                )}
                <NodeCircle cx={pos.x} cy={pos.y} r={R} value={v} status={status} showGlow={isCurrent} />
              </g>
            );
          })}

          {/* root pointer */}
          {state.present.includes(ROOT_VALUE) && (
            <PointerArrow x={FULL_POS[ROOT_VALUE].x} y={FULL_POS[ROOT_VALUE].y - R - 8} label="root" color={colorTokens.found} direction="down" />
          )}

          {/* 중위 순회 결과 배열 (inorder 단계) */}
          {state.phase === "inorder" && (
            <g>
              {sorted.map((v, i) => (
                <ArrayBox key={`io-${v}`} x={SVG_W / 2 - (sorted.length * 46) / 2 + i * 46} y={SVG_H - 70} width={40} height={32} value={v} status="found" showGlow />
              ))}
              <text x={SVG_W / 2} y={SVG_H - 80} textAnchor="middle" fontSize={11} fill={colorTokens.found} fontStyle="italic">
                in-order: [{sorted.join(", ")}] — 정렬 완료
              </text>
            </g>
          )}
        </g>
      )}

      {/* ===== 균형 붕괴 비교 (skew) ===== */}
      {state.phase === "skew" && (
        <g>
          {/* 좌: 균형 트리 */}
          <text x={180} y={130} textAnchor="middle" fontSize={12} fontWeight={600} fill={colorTokens.active}>
            균형 BST · O(log N)
          </text>
          {state.present.map((v) => {
            const node = FULL_TREE.get(v)!;
            const pos = { x: FULL_POS[v].x * 0.42 + 40, y: FULL_POS[v].y - 10 };
            return (["left", "right"] as const).map((side) => {
              const child = node[side];
              if (child === null) return null;
              const cpos = { x: FULL_POS[child].x * 0.42 + 40, y: FULL_POS[child].y - 10 };
              return <EdgeLine key={`bl-${v}-${child}`} {...edgeAt(pos, cpos, 16, 16)} status="active" />;
            });
          })}
          {state.present.map((v) => {
            const pos = { x: FULL_POS[v].x * 0.42 + 40, y: FULL_POS[v].y - 10 };
            return <NodeCircle key={`bn-${v}`} cx={pos.x} cy={pos.y} r={16} value={v} status="active" />;
          })}

          {/* 우: 기울어진 트리 */}
          <text x={505} y={130} textAnchor="middle" fontSize={12} fontWeight={600} fill={colorTokens.found}>
            오름차순 삽입 → 선형 · O(N)
          </text>
          {sorted.slice(0, -1).map((v, i) => (
            <EdgeLine key={`sl-${v}`} {...edgeAt(skewPos[v], skewPos[sorted[i + 1]], 16, 16)} status="muted" />
          ))}
          {sorted.map((v) => (
            <NodeCircle key={`sn-${v}`} cx={skewPos[v].x} cy={skewPos[v].y} r={16} value={v} status="comparing" />
          ))}
        </g>
      )}

      {/* Phase 라벨 + path */}
      <text x={40} y={92} fontSize={12} fontWeight={600} fill={colorTokens.active} fontFamily="ui-monospace, monospace">
        {phaseLabel}
      </text>
      {state.path.length > 0 && (
        <text x={40} y={112} fontSize={12} fill="hsl(var(--foreground))" fontFamily="ui-monospace, monospace">
          path: [{state.path.join(" → ")}]
        </text>
      )}

      {/* Step counter */}
      <text x={SVG_W - 24} y={SVG_H - 16} textAnchor="end" fontSize={11} fill="hsl(var(--muted-foreground))" fontFamily="ui-monospace, monospace">
        Step {step + 1}/{MAX_STEPS}
      </text>
    </svg>
  );
}
