"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  NodeCircle,
  EdgeLine,
  colorTokens,
  edgeAt,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// FC-3: 문자열 / 리스트 / 트리 종합
// text="abracadabra", pattern="abra" → 일치 인덱스 [0, 7]
// 검색 단계를 패턴이 0→7 로 실제 슬라이드하는 sub-step 으로 펼침.
const TEXT = "abracadabra";
const PATTERN = "abra";
const MATCHES = [0, 7];

// 패턴이 멈추는 후보 위치 (창이 슬라이드하는 경로). 끝 위치 = TEXT.length - PATTERN.length.
// 일치(0, 7)는 거치되 그 사이 대표 위치 몇 곳을 보여 0→7 슬라이드를 가시화.
const SLIDE_POSITIONS = [0, 1, 4, 7];
const LAST_SLIDE = SLIDE_POSITIONS.length - 1;

// step 0: input
// step 1..LAST_SLIDE+1: 검색 (패턴 슬라이드)
// 이후: 리스트 / BST / summary
const STEP_SEARCH_START = 1;
const STEP_SEARCH_END = LAST_SLIDE + 1; // 슬라이드 마지막 = 검색 완료
const STEP_LIST = STEP_SEARCH_END + 1;
const STEP_BST = STEP_LIST + 1;
const STEP_SUMMARY = STEP_BST + 1;
const MAX_STEPS = STEP_SUMMARY + 1;

function slideIndexFor(step: number): number {
  // 검색 단계 내에서 현재 슬라이드 위치 인덱스
  if (step < STEP_SEARCH_START) return -1;
  if (step >= STEP_SEARCH_END) return LAST_SLIDE;
  return step - STEP_SEARCH_START;
}

function isMatchAt(pos: number): boolean {
  return MATCHES.includes(pos);
}

function searchMsg(step: number): string | null {
  if (step < STEP_SEARCH_START || step > STEP_SEARCH_END) return null;
  const si = slideIndexFor(step);
  const pos = SLIDE_POSITIONS[si];
  const window = TEXT.slice(pos, pos + PATTERN.length);
  const hit = isMatchAt(pos);
  return `[SLIDE pos=${pos}] 창="${window}" vs pattern="${PATTERN}" → ${hit ? "일치!" : "불일치, 한 칸 이동"}`;
}

const STEP_MSG: Record<number, string> = {
  [STEP_LIST]: "[LIST] 이중 연결 리스트에 발견 순서대로 적재. prev/next 양방향 순회 가능.",
  [STEP_BST]: "[BST] 동일 데이터 BST 삽입. 중위 순회는 정렬 순서를 보존.",
  [STEP_SUMMARY]: "[SUMMARY] 리스트=발견순서, BST=정렬순서. 질의에 따라 선택.",
};

function msgFor(step: number): string | null {
  return searchMsg(step) ?? STEP_MSG[step] ?? null;
}

export function useFc3Sim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> FC-3 시작. text=\"abracadabra\", pattern=\"abra\". ▶ 또는 Push로 진행.",
  ]);

  const handleSetStep = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(target, MAX_STEPS - 1));
    setStep(clamped);
    const base = "> FC-3 시작. text=\"abracadabra\", pattern=\"abra\". ▶ 또는 Push로 진행.";
    const next = [base];
    for (let i = 1; i <= clamped; i++) {
      const m = msgFor(i);
      if (m) next.unshift(`> [Step ${i}] ${m}`);
    }
    setLogs(next);
  }, []);

  const advance = useCallback(() => {
    setStep((prev) => {
      const nextIdx = Math.min(prev + 1, MAX_STEPS - 1);
      if (nextIdx !== prev) {
        const m = msgFor(nextIdx);
        if (m) setLogs((l) => [`> [Step ${nextIdx}] ${m}`, ...l]);
      }
      return nextIdx;
    });
  }, []);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: FC-3 초기 상태."]);
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

export function Fc3Visualizer({ data }: { data?: { step: number } }) {
  const step = data?.step ?? 0;

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

  // 검색 단계: 현재 슬라이드 창 위치 (실제 0→7 이동)
  const inSearch = step >= STEP_SEARCH_START && step <= STEP_SEARCH_END;
  const slideIdx = slideIndexFor(step);
  const slidePos = slideIdx >= 0 ? SLIDE_POSITIONS[slideIdx] : 0;
  const searchDone = step >= STEP_SEARCH_END;
  const slideHit = inSearch && isMatchAt(slidePos);
  const charX = (i: number) => charStartX + i * (charBoxSize + charGap);

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
          inSearch ? `PATTERN SLIDE (pos=${slidePos})` :
          step === STEP_LIST ? "DOUBLY LINKED LIST" :
          step === STEP_BST ? "BST INSERT" :
          "SUMMARY"
        }
      </text>

      {/* ===== 문자열 검색 영역 ===== */}
      <text x={charStartX} y={textY - 16} fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">
        {`text = "${TEXT}" · pattern = "${PATTERN}"`}
      </text>
      {Array.from(TEXT).map((ch, i) => {
        const x = charX(i);
        // 검색 완료 후엔 확정 일치 강조, 검색 중엔 현재 창 강조
        let status: ColorToken = "default";
        if (searchDone || step > STEP_SEARCH_END) {
          if (MATCHES.some((m) => i >= m && i < m + PATTERN.length)) status = "found";
        } else if (inSearch) {
          if (i >= slidePos && i < slidePos + PATTERN.length) status = slideHit ? "found" : "comparing";
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

      {/* Pattern slider — 실제 0→7 슬라이드 (framer-motion 으로 부드럽게 이동) */}
      {inSearch && (
        <motion.g
          initial={false}
          animate={{ x: charX(slidePos) }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        >
          {/* 패턴 창 프레임 */}
          <rect
            x={0}
            y={textY - 6}
            width={PATTERN.length * (charBoxSize + charGap) - charGap}
            height={charBoxSize + 12}
            rx={6}
            fill="none"
            stroke={slideHit ? colorTokens.found : colorTokens.comparing}
            strokeWidth={2.5}
            strokeDasharray={slideHit ? "0" : "5 3"}
          />
          {/* 패턴 글자 (창 위에 떠 있는 라벨) */}
          <text
            x={(PATTERN.length * (charBoxSize + charGap) - charGap) / 2}
            y={textY - 14}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill={slideHit ? colorTokens.found : colorTokens.comparing}
            fontFamily="ui-monospace, monospace"
          >
            {`"${PATTERN}"`} {slideHit ? "✓ 일치" : "비교 중"}
          </text>
        </motion.g>
      )}

      {/* ===== 이중 연결 리스트 ===== */}
      {step >= STEP_LIST && (
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
      {step >= STEP_BST && (
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
      {step === STEP_SUMMARY && (
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
