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
  edgeAt,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// FC-3: 문자열 / 리스트 / 트리 종합
// text="abracadabra", pattern="abra" → 일치 인덱스 [0, 7]
// step 0: input
// step 1: KMP 검색 → matches=[0, 7]
// step 2: 이중 연결 리스트 적재 [0 <-> 7]
// step 3: BST 삽입 (root=0, right=7)
// step 4: summary (리스트=발견순서, BST=정렬순서)
const MAX_STEPS = 5;
const TEXT = "abracadabra";
const PATTERN = "abra";
const MATCHES = [0, 7];

export function useFc3Sim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> FC-3 시작. text=\"abracadabra\", pattern=\"abra\".",
  ]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === 1) appendLog("[SEARCH] KMP 실행 → 일치 위치 [0, 7] 발견.");
      if (next === 2) appendLog("[LIST] 이중 연결 리스트에 발견 순서대로 적재. prev/next 양방향 순회 가능.");
      if (next === 3) appendLog("[BST] 동일 데이터 BST 삽입. 중위 순회는 정렬 순서를 보존.");
      if (next === 4) appendLog("[SUMMARY] 리스트=발견순서, BST=정렬순서. 질의에 따라 선택.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: FC-3 초기 상태."]);
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

export function Fc3Visualizer({ data }: { data: { step: number } }) {
  const { step } = data;

  const svgWidth = 800;
  const svgHeight = 420;

  // 3 panes (vertical stacking): 문자열 (top) + 리스트 (mid) + 트리 (bottom-right)
  const textY = 100;
  const listY = 220;
  const treeOriginX = 540;
  const treeOriginY = 240;

  // String: 11 글자 박스
  const charBoxSize = 38;
  const charGap = 4;
  const charTotal = TEXT.length * charBoxSize + (TEXT.length - 1) * charGap;
  const charStartX = (svgWidth - charTotal) / 2;

  // List nodes
  const listNodeR = 22;
  const listGap = 80;
  const listStartX = 120;

  // Tree nodes (root=0 left=null right=7)
  const treeNodeR = 22;

  // Pattern slide position (animated highlight)
  const slidePos = step >= 1 ? (step === 1 ? 7 : 7) : 0;

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
        FC-3 · 문자열 · 리스트 · 트리 종합
      </text>
      <text x={svgWidth / 2} y={50} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        Stage {step + 1}/{MAX_STEPS} · {
          step === 0 ? "INPUT" :
          step === 1 ? "KMP SEARCH" :
          step === 2 ? "DOUBLY LINKED LIST" :
          step === 3 ? "BST INSERT" :
          "SUMMARY"
        }
      </text>

      {/* ===== 문자열 검색 영역 ===== */}
      <text x={charStartX} y={textY - 16} fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">
        text = "{TEXT}" · pattern = "{PATTERN}"
      </text>
      {Array.from(TEXT).map((ch, i) => {
        const x = charStartX + i * (charBoxSize + charGap);
        // 일치 위치 강조
        let status: ColorToken = "default";
        if (step >= 1) {
          const isInMatch = MATCHES.some((m) => i >= m && i < m + PATTERN.length);
          if (isInMatch) status = "found";
        }
        return (
          <g key={`ch-${i}`}>
            <ArrayBox
              x={x}
              y={textY}
              width={charBoxSize}
              height={charBoxSize}
              value={ch}
              status={status}
              showGlow={status === "found"}
            />
            <text x={x + charBoxSize / 2} y={textY + charBoxSize + 14} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))" fontFamily="ui-monospace, monospace">
              {i}
            </text>
          </g>
        );
      })}

      {/* Pattern slider (step 1) */}
      {step === 1 && (
        <g>
          <PointerArrow
            x={charStartX + slidePos * (charBoxSize + charGap) + charBoxSize / 2}
            y={textY - 8}
            label="match"
            color={colorTokens.found}
            direction="down"
          />
        </g>
      )}

      {/* ===== 이중 연결 리스트 ===== */}
      {step >= 2 && (
        <g>
          <text x={listStartX} y={listY - 16} fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">
            Doubly Linked List (발견 순서)
          </text>
          {MATCHES.map((m, i) => {
            const cx = listStartX + i * listGap;
            return (
              <g key={`ln-${i}`}>
                <NodeCircle
                  cx={cx}
                  cy={listY}
                  r={listNodeR}
                  value={m}
                  status="active"
                  showGlow
                />
                {/* prev/next 양방향 화살표 (연속 노드 사이) */}
                {i < MATCHES.length - 1 && (
                  <g>
                    <EdgeLine
                      x1={cx + listNodeR}
                      y1={listY - 4}
                      x2={cx + listGap - listNodeR}
                      y2={listY - 4}
                      status="pointer"
                      arrow
                      label="next"
                    />
                    <EdgeLine
                      x1={cx + listGap - listNodeR}
                      y1={listY + 8}
                      x2={cx + listNodeR}
                      y2={listY + 8}
                      status="muted"
                      arrow
                      label="prev"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* ===== BST ===== */}
      {step >= 3 && (
        <g>
          <text x={treeOriginX} y={treeOriginY - 80} fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">
            BST (정렬 순서)
          </text>
          {/* root = 0 */}
          <NodeCircle
            cx={treeOriginX + 70}
            cy={treeOriginY - 50}
            r={treeNodeR}
            value={0}
            status="active"
            showGlow
          />
          {/* right child = 7 */}
          <EdgeLine
            {...edgeAt(
              { x: treeOriginX + 70, y: treeOriginY - 50 },
              { x: treeOriginX + 120, y: treeOriginY + 10 },
              treeNodeR,
              treeNodeR,
            )}
            status="pointer"
            arrow
          />
          <NodeCircle
            cx={treeOriginX + 120}
            cy={treeOriginY + 10}
            r={treeNodeR}
            value={7}
            status="comparing"
            showGlow
          />
          {/* root label */}
          <text x={treeOriginX + 70} y={treeOriginY - 80} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
            root
          </text>
        </g>
      )}

      {/* ===== Summary ===== */}
      {step === 4 && (
        <g>
          <rect x={60} y={340} width={680} height={56} fill="hsl(var(--muted))" rx={8} />
          <text x={80} y={364} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
            동일 데이터 · 다른 질의
          </text>
          <text x={80} y={384} fontSize={11} fill="hsl(var(--foreground))">
            리스트: 발견 순서 보존 · 양방향 순회
          </text>
          <text x={400} y={384} fontSize={11} fill="hsl(var(--foreground))">
            BST: 정렬 순서 · 범위 질의 효율적
          </text>
        </g>
      )}
    </svg>
  );
}
