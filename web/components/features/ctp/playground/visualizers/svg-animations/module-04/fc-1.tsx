"use client";

import { useState, useCallback } from "react";
import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  PointerArrow,
  IndexLabel,
  NodeCircle,
  EdgeLine,
  colorTokens,
  edgeAt,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// FC-1: 4문제 미니 워크플로 (input → linear → binary(3 sub-step) → hash → summary)
const MAX_STEPS = 7;

const INPUT_ARR = [3, 7, 1, 9, 4, 11, 6, 5, 2, 8];
const SORTED_ARR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11];
const TARGET = 9;
// 해시 충돌 시연: hash(x) = x % 7
const HASH_BUCKETS = 7;
const hashOf = (n: number) => n % HASH_BUCKETS;

// Binary stage helper: step 2~4 동안 sub-step에 따라 L/R/M 갱신
const BINARY_PHASES = [
  { L: 0, R: 9, M: 4 },  // step 2: M=4 (값=5) < target=9 → L 이동
  { L: 5, R: 9, M: 7 },  // step 3: M=7 (값=8) < target=9 → L 이동
  { L: 8, R: 9, M: 8 },  // step 4: M=8 (값=9) === target → 발견
];

const STEP_MSG: Record<number, string> = {
  1: "[LINEAR] 인덱스 0부터 순회. target=9는 인덱스 3에서 발견 (비교 4회).",
  2: "[BINARY 1/3] L=0, R=9, M=4. arr[4]=5 < 9 → L = M+1 = 5. (비교 1회)",
  3: "[BINARY 2/3] L=5, R=9, M=7. arr[7]=8 < 9 → L = M+1 = 8. (비교 2회)",
  4: "[BINARY 3/3] L=8, R=9, M=8. arr[8]=9 === target → 발견. (비교 3회)",
  5: "[HASH] 입력을 해시 테이블에 적재. lookup(9)는 평균 O(1) (비교 1회).",
  6: "[SUMMARY] 선형 4회 · 이진 3회 · 해시 1회. O(N) vs O(log N) vs O(1).",
};

export function useFc1Sim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> FC-1 종합 검색 챌린지 시작. target=9. ▶ 또는 Push로 진행.",
  ]);

  const handleSetStep = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(target, MAX_STEPS - 1));
    setStep(clamped);
    const base = "> FC-1 종합 검색 챌린지 시작. target=9. ▶ 또는 Push로 진행.";
    const next = [base];
    for (let i = 1; i <= clamped; i++) {
      if (STEP_MSG[i]) next.unshift(`> [Step ${i}] ${STEP_MSG[i]}`);
    }
    setLogs(next);
  }, []);

  const advance = useCallback(() => {
    setStep((prev) => {
      const nextIdx = Math.min(prev + 1, MAX_STEPS - 1);
      if (nextIdx !== prev && STEP_MSG[nextIdx]) {
        setLogs((l) => [`> [Step ${nextIdx}] ${STEP_MSG[nextIdx]}`, ...l]);
      }
      return nextIdx;
    });
  }, []);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: FC-1 초기 상태."]);
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

// 라이브 비교 횟수 카운터 (현재 step까지 누적)
function comparisonCounts(step: number): { linear: number; binary: number; hash: number } {
  // Linear: step 1 에서 4회 (target idx 3 → 4번 비교)
  const linear = step >= 1 ? 4 : 0;
  // Binary: step 2~4 sub-step 당 1회 누적
  const binary = step >= 4 ? 3 : step === 3 ? 2 : step === 2 ? 1 : 0;
  // Hash: step 5 에서 1회
  const hash = step >= 5 ? 1 : 0;
  return { linear, binary, hash };
}

export function Fc1Visualizer({ data }: { data?: { step: number } }) {
  const step = data?.step ?? 0;

  // SVG layout
  const svgWidth = 760;
  const svgHeight = 380;
  const counts = comparisonCounts(step);
  const boxSize = 52;
  const boxGap = 8;
  const totalWidth = INPUT_ARR.length * boxSize + (INPUT_ARR.length - 1) * boxGap;
  const boxStartX = (svgWidth - totalWidth) / 2;
  const boxY = 120;

  const inBinaryStage = step >= 2 && step <= 4;
  const arr = inBinaryStage ? SORTED_ARR : (step >= 5 ? INPUT_ARR : (step === 1 ? INPUT_ARR : INPUT_ARR));
  const stageLabel =
    step === 0 ? "INPUT" :
    step === 1 ? "LINEAR SEARCH" :
    step === 2 ? "BINARY SEARCH (1/3)" :
    step === 3 ? "BINARY SEARCH (2/3)" :
    step === 4 ? "BINARY SEARCH (3/3)" :
    step === 5 ? "HASH SEARCH" :
    "SUMMARY";

  // Linear search: 인덱스 0..3 까지 진행, target found at 3
  const linearProgress = step === 1 ? 4 : 0;
  // Binary search: sub-step에 따라 L/R/M
  const binaryPhase = inBinaryStage ? BINARY_PHASES[step - 2] : BINARY_PHASES[0];
  const { L, R, M } = binaryPhase;
  const binaryFoundIdx = SORTED_ARR.indexOf(TARGET); // 8
  const binaryFoundNow = step === 4; // 마지막 sub-step에서만 발견

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
        FC-1 · 기초·검색 종합 (target = {TARGET})
      </text>
      <text x={svgWidth / 2} y={50} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">
        Stage {step + 1}/{MAX_STEPS} · {stageLabel}
      </text>

      {/* Narration */}
      <text x={svgWidth / 2} y={78} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        {step === 0 && "정렬되지 않은 입력. 어떤 검색 전략을 고를지 결정합니다."}
        {step === 1 && "선형 검색: 인덱스 0부터 차례로 비교. 비교 횟수를 누적합니다."}
        {step === 2 && "이진 검색 1/3: L=0, R=9, M=4. arr[4]=5 < 9이므로 좌측 절반을 버립니다 (L = M+1)."}
        {step === 3 && "이진 검색 2/3: L=5, R=9, M=7. arr[7]=8 < 9이므로 다시 좌측 절반을 버립니다 (L = M+1)."}
        {step === 4 && "이진 검색 3/3: L=8, R=9, M=8. arr[8]=9 → target 발견 (총 3회 비교)."}
        {step === 5 && "해시 검색: 버킷에 적재 후 즉시 조회. 충돌 시 체인이 길어집니다."}
        {step === 6 && "복잡도 요약: O(N) vs O(log N) vs O(1) 평균."}
      </text>

      {/* 라이브 비교 횟수 카운터 (좌상단) */}
      {(() => {
        const rows: Array<{ label: string; n: number; color: string; active: boolean }> = [
          { label: "Linear", n: counts.linear, color: colorTokens.comparing, active: step === 1 },
          { label: "Binary", n: counts.binary, color: colorTokens.active, active: step >= 2 && step <= 4 },
          { label: "Hash", n: counts.hash, color: colorTokens.found, active: step === 5 },
        ];
        const panelX = 14;
        const panelY = 92;
        return (
          <g>
            <rect x={panelX} y={panelY} width={150} height={84} rx={8} fill="hsl(var(--background))" stroke="hsl(var(--border))" />
            <text x={panelX + 10} y={panelY + 18} fontSize={11} fontWeight={700} fill="hsl(var(--foreground))">
              비교 횟수 (live)
            </text>
            {rows.map((r, i) => {
              const ry = panelY + 34 + i * 16;
              return (
                <g key={r.label}>
                  <circle cx={panelX + 16} cy={ry - 4} r={4} fill={r.color} opacity={r.active ? 1 : 0.4} />
                  <text x={panelX + 28} y={ry} fontSize={11} fill="hsl(var(--foreground))" fontWeight={r.active ? 700 : 400} fontFamily="ui-monospace, monospace">
                    {r.label}
                  </text>
                  <text x={panelX + 138} y={ry} textAnchor="end" fontSize={11} fontWeight={700} fill={r.color} fontFamily="ui-monospace, monospace">
                    {r.n}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })()}

      {/* Step 0~4: 배열 표시 (INPUT_ARR or SORTED_ARR) */}
      {step <= 4 && arr.map((val, i) => {
        const x = boxStartX + i * (boxSize + boxGap);
        let status: ColorToken = "default";

        // step 0: target 강조 (정렬되지 않은 입력)
        if (step === 0 && val === TARGET) status = "active";

        // step 1: linear search 진행
        if (step === 1) {
          if (i < linearProgress - 1) status = "muted"; // 이미 비교 끝
          if (i === linearProgress - 1) status = "found"; // 발견
        }

        // step 2~4: binary search L/R/M sub-steps
        if (inBinaryStage) {
          if (binaryFoundNow && i === binaryFoundIdx) status = "found";
          else if (i === M) status = "active";
          else if (i >= L && i <= R) status = "comparing";
          else status = "muted"; // 이미 버린 구간
        }

        return (
          <g key={`fc1-cell-${i}`}>
            <ArrayBox
              x={x}
              y={boxY}
              width={boxSize}
              height={boxSize}
              value={val}
              status={status}
              showGlow={status === "active" || status === "found"}
            />
            <IndexLabel x={x + boxSize / 2} y={boxY + boxSize + 16} index={i} />
          </g>
        );
      })}

      {/* step 1: linear search pointer */}
      {step === 1 && (
        <PointerArrow
          x={boxStartX + (linearProgress - 1) * (boxSize + boxGap) + boxSize / 2}
          y={boxY - 8}
          label="i"
          color={colorTokens.found}
          direction="down"
        />
      )}

      {/* step 2~4: L/R/M pointer — L=blue(pointer) / R=orange(comparing) 색 분리 */}
      {inBinaryStage && (
        <>
          <PointerArrow
            x={boxStartX + L * (boxSize + boxGap) + boxSize / 2}
            y={boxY - 8}
            label="L"
            color={colorTokens.pointer}
            direction="down"
          />
          <PointerArrow
            x={boxStartX + R * (boxSize + boxGap) + boxSize / 2}
            y={boxY - 8}
            label="R"
            color={colorTokens.comparing}
            direction="down"
          />
          <PointerArrow
            x={boxStartX + M * (boxSize + boxGap) + boxSize / 2}
            y={boxY + boxSize + 36}
            label="M"
            color={colorTokens.active}
            direction="up"
          />
        </>
      )}

      {/* step 5: 해시 테이블 (7 buckets + 충돌 chain) */}
      {step === 5 && (() => {
        const bucketBoxSize = 64;
        const bucketGap = 14;
        const bucketTotal = HASH_BUCKETS * bucketBoxSize + (HASH_BUCKETS - 1) * bucketGap;
        const bucketStartX = (svgWidth - bucketTotal) / 2;
        const bucketY = 140;

        // 각 버킷에 매핑된 값들 (chain)
        const buckets: number[][] = Array.from({ length: HASH_BUCKETS }, () => []);
        INPUT_ARR.forEach((v) => buckets[hashOf(v)].push(v));

        return (
          <g>
            {buckets.map((chain, b) => {
              const x = bucketStartX + b * (bucketBoxSize + bucketGap);
              const isTarget = chain.includes(TARGET);
              return (
                <g key={`bucket-${b}`}>
                  <ArrayBox
                    x={x}
                    y={bucketY}
                    width={bucketBoxSize}
                    height={bucketBoxSize}
                    value={`h=${b}`}
                    status={isTarget ? "found" : "default"}
                    showGlow={isTarget}
                  />
                  {/* chain nodes */}
                  {chain.map((v, ci) => {
                    const cy = bucketY + bucketBoxSize + 30 + ci * 38;
                    const nodeR = 14;
                    const isFound = v === TARGET;
                    const centerX = x + bucketBoxSize / 2;
                    // ci===0: bucket(rect) bottom → first node top.
                    // ci>=1: 두 원 사이는 edgeAt 으로 경계점 계산해 라인이 절대 원 안으로 파고들지 않게 한다.
                    let y1: number;
                    let y2: number;
                    if (ci === 0) {
                      y1 = bucketY + bucketBoxSize;
                      y2 = cy - nodeR;
                    } else {
                      const prevCy = cy - 38;
                      const ep = edgeAt({ x: centerX, y: prevCy }, { x: centerX, y: cy }, nodeR, nodeR);
                      y1 = ep.y1;
                      y2 = ep.y2;
                    }
                    return (
                      <g key={`chain-${b}-${ci}`}>
                        <NodeCircle
                          cx={centerX}
                          cy={cy}
                          r={nodeR}
                          value={v}
                          status={isFound ? "found" : "comparing"}
                          showGlow={isFound}
                        />
                        <EdgeLine
                          x1={centerX}
                          y1={y1}
                          x2={centerX}
                          y2={y2}
                          status={ci === 0 && isFound ? "found" : "muted"}
                          arrow
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        );
      })()}

      {/* step 6: summary table */}
      {step === 6 && (() => {
        const rows = [
          { label: "Linear", complexity: "O(N)", comparisons: "4 회", note: "정렬 불필요" },
          { label: "Binary", complexity: "O(log N)", comparisons: "3 회", note: "정렬 전제" },
          { label: "Hash", complexity: "O(1) 평균", comparisons: "1 회", note: "충돌 시 저하" },
        ];
        const tableX = 100;
        const tableY = 110;
        const colW = 140;
        const rowH = 44;
        return (
          <g>
            {/* header */}
            <rect x={tableX} y={tableY} width={colW * 4} height={rowH} fill="hsl(var(--muted))" rx={6} />
            {["전략", "복잡도", "비교 횟수", "비고"].map((h, i) => (
              <text
                key={`h-${i}`}
                x={tableX + colW * i + colW / 2}
                y={tableY + rowH / 2 + 5}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill="hsl(var(--foreground))"
              >
                {h}
              </text>
            ))}
            {rows.map((r, ri) => {
              const y = tableY + (ri + 1) * rowH;
              return (
                <g key={`r-${ri}`}>
                  <rect x={tableX} y={y} width={colW * 4} height={rowH} fill="hsl(var(--background))" stroke="hsl(var(--border))" rx={4} />
                  {[r.label, r.complexity, r.comparisons, r.note].map((cell, ci) => (
                    <text
                      key={`cell-${ri}-${ci}`}
                      x={tableX + colW * ci + colW / 2}
                      y={y + rowH / 2 + 5}
                      textAnchor="middle"
                      fontSize={12}
                      fill={ci === 1 ? colorTokens.active : "hsl(var(--foreground))"}
                      fontWeight={ci === 1 ? 700 : 400}
                    >
                      {cell}
                    </text>
                  ))}
                </g>
              );
            })}
          </g>
        );
      })()}
    </svg>
  );
}
