import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CallFrame = { id: number; n: number; status: 'active' | 'returning' | 'done' };

export function useRecursionBasicsSim() {
  const [step, setStep] = useState(0);
  const [callStack, setCallStack] = useState<CallFrame[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 재귀 호출 스택 검사기(Recursion Call Stack Inspector)",
    "> [대기] 시뮬레이션: factorial(4). 각 단계마다 프레임을 스택에 넣고 뺍니다."
  ]);
  const maxSteps = 8;

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const peek = useCallback(() => {
    setStep(prev => {
      const next = prev >= maxSteps ? 1 : prev + 1;
      if (next === 1) { setCallStack([{ id: 1, n: 4, status: 'active' }]); appendLog("[호출] factorial(4) → 평가 중... factorial(3)이 필요합니다."); }
      if (next === 2) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'active' }]); appendLog("[호출] factorial(3) → 평가 중... factorial(2)가 필요합니다."); }
      if (next === 3) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'active' }, { id: 3, n: 2, status: 'active' }]); appendLog("[호출] factorial(2) → 평가 중... factorial(1)이 필요합니다."); }
      if (next === 4) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'active' }, { id: 3, n: 2, status: 'active' }, { id: 4, n: 1, status: 'active' }]); appendLog("[기저 조건] factorial(1) → 기저 조건 도달! 1을 반환합니다."); }
      if (next === 5) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'active' }, { id: 3, n: 2, status: 'returning' }]); appendLog("[반환] factorial(2): 2 × 1 = 2. 프레임 팝. factorial(3)에 2 반환."); }
      if (next === 6) { setCallStack([{ id: 1, n: 4, status: 'active' }, { id: 2, n: 3, status: 'returning' }]); appendLog("[반환] factorial(3): 3 × 2 = 6. 프레임 팝. factorial(4)에 6 반환."); }
      if (next === 7) { setCallStack([{ id: 1, n: 4, status: 'done' }]); appendLog("[반환] factorial(4): 4 × 6 = 24. 최종 결과: 24."); }
      if (next === 8) { setCallStack([]); appendLog("[완료] 모든 프레임 처리 완료. factorial(4) = 24 ✓."); }
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0); setCallStack([]);
    setLogs(["> 시스템 리셋: 호출 스택 초기화 완료. 새로운 실행 준비됨."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step, callStack },
      logs,
      handlers: { peek, reset, clear: reset }
    }
  };
}

export function RecursionBasicsVisualizer({ data }: { data: { step: number, callStack: CallFrame[] } }) {
  const { step, callStack } = data;

  const getCodeHighlightY = () => {
    if (step >= 1 && step <= 4) return 175;
    if (step >= 5 && step <= 7) return 245;
    return -100; // hidden
  };

  return (
    <svg viewBox="0 0 800 500" className="w-full h-full font-mono">
      <defs>
        <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </pattern>
        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="#a855f7" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-purple)">재귀 기초 (Recursion Basics)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">호출 스택: 쌓기(Winding)와 풀기(Unwinding)</text>

      {/* Code Editor Panel */}
      <g transform="translate(40, 110)">
        {/* Editor Background */}
        <rect width="460" height="340" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" rx="12" />

        {/* Mac OS window buttons */}
        <circle cx="20" cy="20" r="5" fill="#ef4444" />
        <circle cx="40" cy="20" r="5" fill="#eab308" />
        <circle cx="60" cy="20" r="5" fill="#10b981" />
        <text x="80" y="24" fill="#666" fontSize="11" letterSpacing="1">factorial.py</text>

        {/* Highlight Bar */}
        <motion.rect
          x="2"
          y={getCodeHighlightY()}
          width="456"
          height="30"
          fill="rgba(168, 85, 247, 0.15)"
          animate={{ y: getCodeHighlightY(), opacity: step > 0 && step < 8 ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <motion.rect
          x="2"
          y={getCodeHighlightY()}
          width="4"
          height="30"
          fill="#a855f7"
          animate={{ y: getCodeHighlightY(), opacity: step > 0 && step < 8 ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />

        {/* Code Lines */}
        <text x="30" y="80" fontSize="15" fill="#fff" fontFamily="monospace">
          <tspan fill="#a855f7">def </tspan>
          <tspan fill="#60a5fa">factorial</tspan>
          <tspan>(n):</tspan>
        </text>

        <text x="50" y="115" fontSize="15" fill="#fff" fontFamily="monospace">
          <tspan fill="#a855f7">if </tspan>
          <tspan>n == </tspan>
          <tspan fill="#f59e0b">1</tspan>
          <tspan>:</tspan>
          <tspan fill="#10b981">  # 기저 조건 (BASE CASE)</tspan>
        </text>

        <text x="70" y="150" fontSize="15" fill="#fff" fontFamily="monospace">
          <tspan fill="#a855f7">return </tspan>
          <tspan fill="#f59e0b">1</tspan>
        </text>

        <text x="50" y="185" fontSize="15" fill="#fff" fontFamily="monospace">
          <tspan fill="#a855f7">return </tspan>
          <tspan>n </tspan>
          <tspan fill="#a855f7">* </tspan>
          <tspan fill="#60a5fa">factorial</tspan>
          <tspan>(n - </tspan>
          <tspan fill="#f59e0b">1</tspan>
          <tspan>)</tspan>
          <tspan fill="#10b981">  # 쌓기 (WINDING)</tspan>
        </text>

        {/* Extra unwinding visualization context */}
        <text x="50" y="255" fontSize="15" fill="#fff" fontFamily="monospace">
          <tspan fill="#10b981"># 풀기 (UNWINDING) </tspan>
          <tspan fill="hsl(var(--muted-foreground))">위로 값을 반환합니다</tspan>
        </text>

        {/* Dynamic Execution Result text */}
        <text x="30" y="300" fill="hsl(var(--muted-foreground))" fontSize="11" letterSpacing="1" fontWeight="bold">실행 결과 (EXECUTION RESULT)</text>
        <line x1="30" y1="310" x2="430" y2="310" stroke="hsl(var(--border))" strokeDasharray="4 4" />

        {step >= 7 ? (
          <text x="30" y="335" fill="#06b6d4" fontSize="24" fontWeight="bold" filter="url(#neon-glow-cyan)">
            factorial(4) = 24
          </text>
        ) : step === 0 ? (
          <text x="30" y="335" fill="hsl(var(--muted-foreground))" fontSize="14">실행 대기 중...</text>
        ) : (
          <text x="30" y="335" fill="#a855f7" fontSize="16" className="animate-pulse">계산 중...</text>
        )}
      </g>

      {/* Call Stack Panel */}
      <g transform="translate(530, 110)">
        <text x="115" y="15" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="2" textAnchor="middle" fontWeight="bold">호출 스택 (CALL STACK)</text>

        <path d="M 0 30 L 0 340 L 230 340 L 230 30" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />

        {/* Call Stack Empty Placeholder */}
        {callStack.length === 0 && (
          <text x="115" y="180" fill="hsl(var(--muted-foreground))" fontSize="14" textAnchor="middle">스택 비어 있음</text>
        )}

        {/* Stack Frames */}
        <AnimatePresence>
          {callStack.map((frame, index) => {
            // Calculate starting Y from the bottom (340 is the bottom, stack builds UP)
            const frameHeight = 50;
            const gap = 10;
            const yPos = 340 - 15 - (index * (frameHeight + gap)) - frameHeight;

            let borderColor = "#a855f7"; // purple (active winding)
            let bgColor = "rgba(168, 85, 247, 0.15)";
            let statusText = "실행 중";
            let statusColor = "#a855f7";

            if (frame.status === "returning") {
              borderColor = "#10b981"; // emerald (unwinding)
              bgColor = "rgba(16, 185, 129, 0.15)";
              statusText = "← 반환";
              statusColor = "#10b981";
            } else if (frame.status === "done") {
              borderColor = "#06b6d4"; // cyan
              bgColor = "rgba(6, 182, 212, 0.15)";
              statusText = "완료";
              statusColor = "#06b6d4";
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
                <text x="30" y="30" fill="#fff" fontSize="16" fontWeight="bold">factorial({frame.n})</text>

                {/* Status Badge */}
                <rect x="140" y="15" width="60" height="20" fill={bgColor} rx="4" />
                <text x="170" y="29" fill={statusColor} fontSize="10" fontWeight="bold" textAnchor="middle">{statusText}</text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </g>
    </svg>
  );
}
