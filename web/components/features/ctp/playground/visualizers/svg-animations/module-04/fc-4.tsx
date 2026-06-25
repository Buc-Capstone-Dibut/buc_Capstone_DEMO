"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  CyberGrid,
  NeonGlowFilters,
  ArrayBox,
  colorTokens,
  type ColorToken,
} from "@/components/features/ctp/playground/visualizers/shared/svg-primitives";

// FC-4: 미니 코딩테스트 UI (timer + 4 problem cards + result panel)
// stages: read → plan → design → implement → submit
const MAX_STEPS = 5;
const TOTAL_TIME = 600; // 10 min (데모용 목업 제한시간)

type CardStatus = "locked" | "active" | "solved";

function buildCards(step: number): Array<{ id: number; title: string; status: CardStatus }> {
  const base: Array<{ id: number; title: string; status: CardStatus }> = [
    { id: 1, title: "정독", status: "locked" },
    { id: 2, title: "전략 비교", status: "locked" },
    { id: 3, title: "설계", status: "locked" },
    { id: 4, title: "구현", status: "locked" },
  ];
  if (step >= 0) base[0].status = step === 0 ? "active" : "solved";
  if (step >= 1) base[1].status = step === 1 ? "active" : "solved";
  if (step >= 2) base[2].status = step === 2 ? "active" : "solved";
  if (step >= 3) base[3].status = step === 3 ? "active" : "solved";
  if (step >= 4) base[3].status = "solved";
  return base;
}

function buildLogs(step: number): string[] {
  const out: string[] = [];
  if (step >= 0) out.push("[READ] 입력: 정수 배열, target=9. 출력: 합=target 쌍의 인덱스 정렬 리스트.");
  if (step >= 1) out.push("[PLAN] 후보 비교: 이중 반복 O(N^2) vs 해시 O(N).");
  if (step >= 2) out.push("[DESIGN] 해시 채택. 변수: seen={}, result=[].");
  if (step >= 3) out.push("[IMPL] 단일 패스: target-x in seen → result.push([seen[target-x], i]).");
  if (step >= 4) out.push("[SUBMIT] result 정렬 후 출력. 엣지: 빈 입력, 중복, 음수 점검.");
  return out;
}

const STEP_MSG: Record<number, string> = {
  1: "[PLAN] 두 후보 풀이를 시간복잡도로 비교.",
  2: "[DESIGN] 해시 풀이 선택. 보조 자료구조 = 해시 테이블.",
  3: "[IMPL] 단일 패스로 배열 순회하며 결과 누적.",
  4: "[SUBMIT] 결과 정렬 후 제출. 엣지 케이스 최종 점검.",
};

export function useFc4Sim() {
  const [step, setStep] = useState(0);
  const [remaining, setRemaining] = useState(TOTAL_TIME); // 실제 카운트다운 (초)
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [logs, setLogs] = useState<string[]>([
    "> FC-4 미니 코딩테스트 시작. 제한 시간 10:00 (데모/목업). ▶ 또는 Push로 진행하면 타이머가 흐릅니다.",
  ]);

  // 실제 setInterval 카운트다운: running 동안 1초마다 1씩 감소, 0에서 멈춤.
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleSetStep = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(target, MAX_STEPS - 1));
    setStep(clamped);
    const base = "> FC-4 미니 코딩테스트 시작. 제한 시간 10:00 (데모/목업). ▶ 또는 Push로 진행하면 타이머가 흐릅니다.";
    const next = [base];
    for (let i = 1; i <= clamped; i++) {
      if (STEP_MSG[i]) next.unshift(`> [Step ${i}] ${STEP_MSG[i]}`);
    }
    setLogs(next);
  }, []);

  const advance = useCallback(() => {
    setRunning(true); // 첫 진행에서 실제 타이머 시작
    setStep((prev) => {
      const nextIdx = Math.min(prev + 1, MAX_STEPS - 1);
      if (nextIdx !== prev && STEP_MSG[nextIdx]) {
        setLogs((l) => [`> [Step ${nextIdx}] ${STEP_MSG[nextIdx]}`, ...l]);
      }
      if (nextIdx === MAX_STEPS - 1) setRunning(false); // 제출 시 타이머 정지
      return nextIdx;
    });
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setStep(0);
    setRemaining(TOTAL_TIME);
    setLogs(["> 시스템 리셋: FC-4 초기 상태. 타이머 10:00 으로 복원."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step, remaining },
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

export function Fc4Visualizer({ data }: { data?: { step: number; remaining?: number } }) {
  const step = data?.step ?? 0;
  const cards = buildCards(step);
  const innerLogs = buildLogs(step);

  const svgWidth = 800;
  const svgHeight = 420;

  // Timer: 실제 setInterval 카운트다운 값 (sim hook 제공). 없으면 전체 시간.
  const remaining = data?.remaining ?? TOTAL_TIME;
  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = Math.floor(remaining % 60).toString().padStart(2, "0");
  const timerColor: ColorToken = remaining < 120 ? "found" : remaining < 300 ? "comparing" : "default";

  // Card grid (2x2)
  const cardW = 150;
  const cardH = 88;
  const cardGapX = 18;
  const cardGapY = 18;
  const gridStartX = 60;
  const gridStartY = 110;

  // Result panel (right)
  const panelX = 470;
  const panelY = 110;
  const panelW = 270;
  const panelH = 220;

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
        FC-4 · 미니 코딩테스트 (타이머형)
      </text>

      {/* Timer */}
      <g>
        <rect x={svgWidth / 2 - 90} y={48} width={180} height={42} rx={8} fill="hsl(var(--muted))" stroke="hsl(var(--border))" />
        <text x={svgWidth / 2} y={64} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
          남은 시간
        </text>
        <text
          x={svgWidth / 2}
          y={84}
          textAnchor="middle"
          fontSize={18}
          fontWeight={700}
          fontFamily="ui-monospace, monospace"
          fill={colorTokens[timerColor === "default" ? "active" : timerColor]}
        >
          {mm}:{ss}
        </text>
      </g>

      {/* Problem cards (2x2) */}
      {cards.map((c, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = gridStartX + col * (cardW + cardGapX);
        const y = gridStartY + row * (cardH + cardGapY);
        const status: ColorToken =
          c.status === "active" ? "active" :
          c.status === "solved" ? "found" :
          "muted";
        return (
          <g key={`card-${c.id}`}>
            <ArrayBox
              x={x}
              y={y}
              width={cardW}
              height={cardH}
              value=""
              status={status}
              showGlow={c.status === "active"}
            />
            {/* card label */}
            <text
              x={x + 14}
              y={y + 22}
              fontSize={10}
              fill="hsl(var(--background))"
              fontWeight={600}
            >
              {c.id}/4
            </text>
            <text
              x={x + cardW / 2}
              y={y + cardH / 2 + 6}
              textAnchor="middle"
              fontSize={14}
              fontWeight={700}
              fill="hsl(var(--background))"
            >
              {c.title}
            </text>
            <text
              x={x + cardW / 2}
              y={y + cardH - 12}
              textAnchor="middle"
              fontSize={10}
              fill="hsl(var(--background))"
              fontStyle="italic"
            >
              {c.status === "active" ? "in progress" : c.status === "solved" ? "done" : "pending"}
            </text>
          </g>
        );
      })}

      {/* Result panel */}
      <g>
        <rect x={panelX} y={panelY} width={panelW} height={panelH} fill="hsl(var(--background))" stroke="hsl(var(--border))" rx={8} />
        <rect x={panelX} y={panelY} width={panelW} height={28} fill="hsl(var(--muted))" rx={8} />
        <text x={panelX + panelW / 2} y={panelY + 18} textAnchor="middle" fontSize={12} fontWeight={700} fill="hsl(var(--foreground))">
          Judge Result (데모/목업)
        </text>

        {innerLogs.map((line, i) => (
          <text
            key={`log-${i}`}
            x={panelX + 12}
            y={panelY + 50 + i * 22}
            fontSize={10}
            fontFamily="ui-monospace, monospace"
            fill="hsl(var(--foreground))"
          >
            {line.length > 52 ? line.slice(0, 51) + "…" : line}
          </text>
        ))}

        {/* Final verdict (step 4) — 하드코딩 데모 결과 (실제 채점 아님) */}
        {step === 4 && (
          <g>
            <rect x={panelX + 12} y={panelY + panelH - 44} width={panelW - 24} height={32} fill={colorTokens.found} rx={6} />
            <text
              x={panelX + panelW / 2}
              y={panelY + panelH - 24}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="hsl(var(--background))"
            >
              AC · Accepted (목업)
            </text>
          </g>
        )}
      </g>

      {/* Footer hint */}
      <text x={svgWidth / 2} y={svgHeight - 16} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
        {step === 0 && "Stage 1/5 — 문제 정독 (입력·출력·제한 시간·엣지 케이스)"}
        {step === 1 && "Stage 2/5 — 전략 비교 (O(N^2) vs O(N))"}
        {step === 2 && "Stage 3/5 — 설계 (자료구조·핵심 변수·종료 조건)"}
        {step === 3 && "Stage 4/5 — 구현 (단일 패스 + 누적)"}
        {step === 4 && "Stage 5/5 — 제출 & 엣지 케이스 최종 점검"}
      </text>
    </svg>
  );
}
