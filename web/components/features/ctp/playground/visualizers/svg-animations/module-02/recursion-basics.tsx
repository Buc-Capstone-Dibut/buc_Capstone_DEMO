import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colorTokens } from "../../shared/svg-primitives";

type CallFrame = { id: number; n: number; status: 'active' | 'returning' | 'done' };

// One immutable snapshot per step. Pre-computing every snapshot lets the
// slider jump to an arbitrary step (and the ▶ autoplay advance one step) while
// keeping the Visualizer a pure function of `data`.
type Step = {
  callStack: CallFrame[];
  result: number | null; // factorial result once fully unwound
  phase: 'idle' | 'winding' | 'unwinding' | 'done';
  msg: string;
};

const DEFAULT_N = 4;

// Build the full winding → base → unwinding trace for factorial(n).
function generateRecursionSteps(n: number): Step[] {
  const steps: Step[] = [];

  steps.push({
    callStack: [],
    result: null,
    phase: 'idle',
    msg: `factorial(${n}) 실행 대기. Step을 눌러 호출 스택을 추적하세요.`,
  });

  // Winding: push factorial(n), factorial(n-1), ... down to base case 1.
  const frames: CallFrame[] = [];
  for (let v = n; v >= 1; v--) {
    frames.push({ id: v, n: v, status: 'active' });
    if (v === 1) {
      steps.push({
        callStack: frames.map(f => ({ ...f })),
        result: null,
        phase: 'winding',
        msg: `[기저 조건] factorial(1) → 기저 조건 도달! 1을 반환합니다.`,
      });
    } else {
      steps.push({
        callStack: frames.map(f => ({ ...f })),
        result: null,
        phase: 'winding',
        msg: `[호출] factorial(${v}) → 평가 중... factorial(${v - 1})이 필요합니다.`,
      });
    }
  }

  // Unwinding: pop frames from the top, accumulating the product.
  // factorial(1)=1, then factorial(2)=2*1, factorial(3)=3*2, ...
  let acc = 1;
  for (let v = 1; v <= n; v++) {
    acc = v === 1 ? 1 : v * acc;
    // Remove the just-resolved frame; mark the new top as 'returning'.
    frames.pop();
    const isLast = v === n;
    const snapshot = frames.map((f, idx) => ({
      ...f,
      status: (idx === frames.length - 1 ? 'returning' : 'active') as CallFrame['status'],
    }));
    if (isLast) {
      steps.push({
        callStack: [{ id: n, n, status: 'done' }],
        result: acc,
        phase: 'done',
        msg: `[반환] factorial(${n}) = ${acc}. 최종 결과 확정.`,
      });
    } else {
      const parent = v + 1;
      steps.push({
        callStack: snapshot,
        result: null,
        phase: 'unwinding',
        msg: `[반환] factorial(${v}) = ${acc}. 프레임 팝 → factorial(${parent})에 ${acc} 반환.`,
      });
    }
  }

  // Final: stack fully drained.
  steps.push({
    callStack: [],
    result: acc,
    phase: 'done',
    msg: `[완료] 모든 프레임 처리 완료. factorial(${n}) = ${acc}.`,
  });

  return steps;
}

export function useRecursionBasicsSim(initialN: number = DEFAULT_N) {
  // sampleData from the content module arrives as number[]; first entry (if any)
  // sets N, clamped to a legible range so the call-stack panel never overflows.
  const n = Array.isArray(initialN)
    ? Math.max(2, Math.min(6, (initialN as number[])[0] ?? DEFAULT_N))
    : Math.max(2, Math.min(6, initialN));

  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const baseLog = `> 시스템 초기화: 재귀 호출 스택 검사기 — factorial(${n})`;

  useEffect(() => {
    setSteps(generateRecursionSteps(n));
    setStepIdx(0);
    setLogs([baseLog, "> [대기] 각 단계마다 프레임을 스택에 넣고(Winding) 뺍니다(Unwinding)."]);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetStep = useCallback((newStep: number) => {
    if (newStep < 0 || newStep >= steps.length) return;
    setStepIdx(newStep);
    const newLogs = [baseLog];
    for (let i = 1; i <= newStep; i++) newLogs.unshift(`[Step ${i}/${steps.length - 1}] ${steps[i].msg}`);
    setLogs(newLogs);
  }, [steps, baseLog]);

  const nextStep = useCallback(() => {
    setStepIdx(prev => {
      const next = prev >= steps.length - 1 ? prev : prev + 1;
      if (next !== prev) handleSetStep(next);
      return next;
    });
  }, [steps.length, handleSetStep]);

  const reset = useCallback(() => handleSetStep(0), [handleSetStep]);

  const current = steps[stepIdx] || { callStack: [], result: null, phase: 'idle', msg: '' };

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step: stepIdx, n, callStack: current.callStack, result: current.result, phase: current.phase },
      logs,
      handlers: { push: nextStep, clear: reset },
      currentStep: stepIdx,
      maxSteps: steps.length,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

type VData = { step: number; n: number; callStack: CallFrame[]; result: number | null; phase: Step['phase'] };

export function RecursionBasicsVisualizer({ data }: { data?: VData }) {
  if (!data) return null;
  const { n, callStack, result, phase } = data;

  // Code-highlight band tracks winding (recursive line) vs unwinding (return-up line).
  const getCodeHighlightY = () => {
    if (phase === 'winding') return 163;   // "return n * factorial(n - 1)" baseline 185 → top 163
    if (phase === 'unwinding') return 233; // "# 풀기 (UNWINDING)"          baseline 255 → top 233
    return -100;
  };
  const highlightVisible = phase === 'winding' || phase === 'unwinding';

  // Stack frames are laid out from the bottom up. To keep N variable without the
  // tower overflowing, frame height shrinks gently as the stack grows taller.
  const STACK_BOTTOM = 325;
  const STACK_TOP = 30;
  const gap = 10;
  const maxFrames = Math.max(callStack.length, n);
  const frameHeight = Math.max(34, Math.min(50, (STACK_BOTTOM - STACK_TOP - (maxFrames - 1) * gap) / maxFrames));

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={colorTokens.gridLine} strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neon-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="hsl(271 91% 65%)" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-purple)">재귀 기초 (Recursion Basics)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">호출 스택: 쌓기(Winding)와 풀기(Unwinding)</text>

      {/* Code Editor Panel */}
      <g transform="translate(40, 110)">
        <rect width="460" height="340" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" rx="12" />

        {/* Mac OS window buttons */}
        <circle cx="20" cy="20" r="5" fill="hsl(0 84% 60%)" />
        <circle cx="40" cy="20" r="5" fill="hsl(45 93% 47%)" />
        <circle cx="60" cy="20" r="5" fill="hsl(160 84% 39%)" />
        <text x="80" y="24" fill="hsl(0 0% 40%)" fontSize="11" letterSpacing="1">factorial.py</text>

        {/* Highlight Bar */}
        <motion.rect x="2" width="456" height="30" fill={colorTokens.primaryHighlightTrace}
          initial={false}
          animate={{ y: getCodeHighlightY(), opacity: highlightVisible ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }} />
        <motion.rect x="2" width="4" height="30" fill="hsl(271 91% 65%)"
          initial={false}
          animate={{ y: getCodeHighlightY(), opacity: highlightVisible ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }} />

        {/* Code Lines (n parameterized) */}
        <text x="30" y="80" fontSize="15" fill="hsl(0 0% 100%)" fontFamily="monospace">
          <tspan fill="hsl(271 91% 65%)">def </tspan>
          <tspan fill="hsl(213 94% 68%)">factorial</tspan>
          <tspan>(n):</tspan>
        </text>
        <text x="50" y="115" fontSize="15" fill="hsl(0 0% 100%)" fontFamily="monospace">
          <tspan fill="hsl(271 91% 65%)">if </tspan>
          <tspan>n == </tspan>
          <tspan fill="hsl(38 92% 50%)">1</tspan>
          <tspan>:</tspan>
          <tspan fill="hsl(160 84% 39%)">  # 기저 조건 (BASE CASE)</tspan>
        </text>
        <text x="70" y="150" fontSize="15" fill="hsl(0 0% 100%)" fontFamily="monospace">
          <tspan fill="hsl(271 91% 65%)">return </tspan>
          <tspan fill="hsl(38 92% 50%)">1</tspan>
        </text>
        <text x="50" y="185" fontSize="15" fill="hsl(0 0% 100%)" fontFamily="monospace">
          <tspan fill="hsl(271 91% 65%)">return </tspan>
          <tspan>n </tspan>
          <tspan fill="hsl(271 91% 65%)">* </tspan>
          <tspan fill="hsl(213 94% 68%)">factorial</tspan>
          <tspan>(n - </tspan>
          <tspan fill="hsl(38 92% 50%)">1</tspan>
          <tspan>)</tspan>
          <tspan fill="hsl(160 84% 39%)">  # 쌓기 (WINDING)</tspan>
        </text>
        <text x="50" y="255" fontSize="15" fill="hsl(0 0% 100%)" fontFamily="monospace">
          <tspan fill="hsl(160 84% 39%)"># 풀기 (UNWINDING) </tspan>
          <tspan fill="hsl(var(--muted-foreground))">위로 값을 반환합니다</tspan>
        </text>

        {/* Dynamic Execution Result text */}
        <text x="30" y="300" fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="1" fontWeight="bold">실행 결과 (EXECUTION RESULT)</text>
        <line x1="30" y1="310" x2="430" y2="310" stroke="hsl(var(--border))" strokeDasharray="4 4" />

        {result !== null ? (
          <text x="30" y="335" fill="hsl(189 94% 43%)" fontSize="24" fontWeight="bold" filter="url(#neon-glow-cyan)">
            factorial({n}) = {result}
          </text>
        ) : phase === 'idle' ? (
          <text x="30" y="335" fill="hsl(var(--muted-foreground))" fontSize="14">실행 대기 중...</text>
        ) : (
          <text x="30" y="335" fill="hsl(271 91% 65%)" fontSize="16" className="animate-pulse">계산 중...</text>
        )}
      </g>

      {/* Call Stack Panel */}
      <g transform="translate(530, 110)">
        <text x="115" y="15" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="2" textAnchor="middle" fontWeight="bold">호출 스택 (CALL STACK)</text>
        <path d="M 0 30 L 0 340 L 230 340 L 230 30" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />

        {callStack.length === 0 && (
          <text x="115" y="180" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">스택 비어 있음</text>
        )}

        <AnimatePresence>
          {callStack.map((frame, index) => {
            // Stack builds UP from the base (y=340). Variable frame height keeps deep stacks on-canvas.
            const yPos = 340 - 15 - (index * (frameHeight + gap)) - frameHeight;

            let borderColor = "hsl(271 91% 65%)";
            let bgColor: string = colorTokens.primaryHighlightTrace;
            let statusText = "실행 중";
            let statusColor = "hsl(271 91% 65%)";
            if (frame.status === "returning") {
              borderColor = "hsl(160 84% 39%)";
              bgColor = colorTokens.successTrace;
              statusText = "← 반환";
              statusColor = "hsl(160 84% 39%)";
            } else if (frame.status === "done") {
              borderColor = "hsl(189 94% 43%)";
              bgColor = colorTokens.infoTrace;
              statusText = "완료";
              statusColor = "hsl(189 94% 43%)";
            }

            return (
              <motion.g
                key={`frame-${frame.id}`}
                initial={{ opacity: 0, y: yPos - 30 }}
                animate={{ opacity: 1, y: yPos }}
                exit={{ opacity: 0, scale: 0.9, y: yPos + 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <rect x="15" y="0" width="200" height={frameHeight} fill={bgColor} stroke={borderColor} strokeWidth="2" rx="8" />
                <text x="30" y={frameHeight / 2 + 6} fill="hsl(0 0% 100%)" fontSize="15" fontWeight="bold">factorial({frame.n})</text>
                <rect x="140" y={frameHeight / 2 - 10} width="60" height="20" fill={bgColor} rx="4" />
                <text x="170" y={frameHeight / 2 + 4} fill={statusColor} fontSize="10" fontWeight="bold" textAnchor="middle">{statusText}</text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </g>
    </svg>
  );
}
