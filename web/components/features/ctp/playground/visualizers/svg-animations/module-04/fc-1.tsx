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
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// FC-1: 4문제 미니 워크플로 (input → linear → binary → hash → summary)
const MAX_STEPS = 5;

const INPUT_ARR = [3, 7, 1, 9, 4, 11, 6, 5, 2, 8];
const SORTED_ARR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11];
const TARGET = 9;
// 해시 충돌 시연: hash(x) = x % 7
const HASH_BUCKETS = 7;
const hashOf = (n: number) => n % HASH_BUCKETS;

export function useFc1Sim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> FC-1 종합 검색 챌린지 시작. target=9.",
  ]);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [`> ${msg}`, ...prev]);
  }, []);

  const peek = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, MAX_STEPS - 1);
      if (next === 1) appendLog("[LINEAR] 인덱스 0부터 순회. target=9는 인덱스 3에서 발견 (비교 4회).");
      if (next === 2) appendLog("[BINARY] 정렬된 사본에서 L=0, R=9, M=4. 절반씩 후보 구간 축소 (비교 3~4회).");
      if (next === 3) appendLog("[HASH] 입력을 해시 테이블에 적재. lookup(9)는 평균 O(1).");
      if (next === 4) appendLog("[SUMMARY] 선형 O(N) · 이진 O(log N) · 해시 O(1) 평균.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> 시스템 리셋: FC-1 초기 상태."]);
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

export function Fc1Visualizer({ data }: { data: { step: number } }) {
  const { step } = data;

  // SVG layout
  const svgWidth = 760;
  const svgHeight = 380;
  const boxSize = 52;
  const boxGap = 8;
  const totalWidth = INPUT_ARR.length * boxSize + (INPUT_ARR.length - 1) * boxGap;
  const boxStartX = (svgWidth - totalWidth) / 2;
  const boxY = 120;

  const arr = step >= 2 ? SORTED_ARR : INPUT_ARR;
  const stageLabel =
    step === 0 ? "INPUT" :
    step === 1 ? "LINEAR SEARCH" :
    step === 2 ? "BINARY SEARCH" :
    step === 3 ? "HASH SEARCH" :
    "SUMMARY";

  // Linear search: 인덱스 0..3 까지 진행, target found at 3
  const linearProgress = step === 1 ? 4 : 0;
  // Binary search: L=0, R=9, M=4 (값=5), target=9, found at index 8
  const L = 0, R = 9, M = 4;
  const binaryFoundIdx = SORTED_ARR.indexOf(TARGET); // 8

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
        {step === 2 && "이진 검색: 정렬된 사본에서 L/R/M 포인터로 절반씩 좁혀 갑니다."}
        {step === 3 && "해시 검색: 버킷에 적재 후 즉시 조회. 충돌 시 체인이 길어집니다."}
        {step === 4 && "복잡도 요약: O(N) vs O(log N) vs O(1) 평균."}
      </text>

      {/* Step 0~2: 배열 표시 (INPUT_ARR or SORTED_ARR) */}
      {step <= 2 && arr.map((val, i) => {
        const x = boxStartX + i * (boxSize + boxGap);
        let status: ColorToken = "default";

        // step 0: target 강조 (정렬되지 않은 입력)
        if (step === 0 && val === TARGET) status = "active";

        // step 1: linear search 진행
        if (step === 1) {
          if (i < linearProgress - 1) status = "muted"; // 이미 비교 끝
          if (i === linearProgress - 1) status = "found"; // 발견
        }

        // step 2: binary search L/R/M
        if (step === 2) {
          if (i === M) status = "active";
          else if (i === binaryFoundIdx) status = "found";
          else if (i >= L && i <= R) status = "comparing";
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

      {/* step 2: L/R/M pointer — L=blue(pointer) / R=orange(comparing) 색 분리 */}
      {step === 2 && (
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

      {/* step 3: 해시 테이블 (7 buckets + 충돌 chain) */}
      {step === 3 && (() => {
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
                    // ci===0: bucket bottom → first node top
                    // ci>=1: previous node bottom (cy - 38 + nodeR) → this node top (cy - nodeR)
                    const y1 = ci === 0 ? bucketY + bucketBoxSize : cy - 38 + nodeR;
                    const y2 = cy - nodeR;
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

      {/* step 4: summary table */}
      {step === 4 && (() => {
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
