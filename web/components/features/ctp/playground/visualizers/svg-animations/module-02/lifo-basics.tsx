import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useLifoBasicsSim() {
  const [stack, setStack] = useState<number[]>([10, 20, 30]);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 스택(Stack) 자료구조",
    "> 프로토콜: LIFO (후입선출)",
    "> [명령 대기 중] >>"
  ]);
  const [action, setAction] = useState<{ type: "IDLE" | "PUSH" | "POP" | "PEEK" | "ERROR", val?: number, index?: number }>({ type: "IDLE" });
  const maxSize = 6;

  const appendLog = useCallback((msg: string) => {
    setLogs(l => [`> ${msg}`, ...l]);
  }, []);

  const push = useCallback(() => {
    setStack(prev => {
      if (prev.length >= maxSize) {
        setAction({ type: "ERROR" });
        appendLog("[오버플로] 스택이 가득 차 데이터를 추가할 수 없습니다.");
        return prev;
      }
      const val = Math.floor(Math.random() * 90) + 10;
      setAction({ type: "PUSH", val, index: prev.length });
      appendLog(`[PUSH] ${val} 추가됨. 크기: ${prev.length + 1}/${maxSize}`);
      return [...prev, val];
    });
  }, [appendLog]);

  const pop = useCallback(() => {
    setStack(prev => {
      if (prev.length === 0) {
        setAction({ type: "ERROR" });
        appendLog("[언더플로] 빈 스택에서 데이터를 꺼낼 수 없습니다.");
        return prev;
      }
      const val = prev[prev.length - 1];
      setAction({ type: "POP", val, index: prev.length - 1 });
      appendLog(`[POP] ${val} 제거됨. 크기: ${prev.length - 1}/${maxSize}`);
      return prev.slice(0, -1);
    });
  }, [appendLog]);

  const peek = useCallback(() => {
    setStack(prev => {
      if (prev.length === 0) {
        setAction({ type: "ERROR" });
        appendLog("[PEEK] 스택이 비어 있습니다.");
        return prev;
      }
      const val = prev[prev.length - 1];
      setAction({ type: "PEEK", val, index: prev.length - 1 });
      appendLog(`[PEEK] 맨 위 데이터는 ${val} 입니다.`);
      return prev;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStack([10, 20, 30]);
    setAction({ type: "IDLE" });
    setLogs(["> 시스템 리부트: 초기 상태로 복구되었습니다."]);
  }, []);

  useEffect(() => {
    if (action.type !== "IDLE") {
      const timer = setTimeout(() => setAction({ type: "IDLE" }), 1500);
      return () => clearTimeout(timer);
    }
  }, [action]);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { stack, action, maxSize },
      logs,
      handlers: { push, pop, peek, reset, clear: reset }
    }
  };
}

export function LifoBasicsVisualizer({ data }: { data: { stack: number[], action: { type: string, val?: number, index?: number }, maxSize: number } }) {
  const { stack, action, maxSize } = data;
  const isError = action.type === "ERROR";

  // Coordinates
  const centerX = 400;
  const baseY = 420;
  const slotWidth = 140;
  const slotHeight = 44;
  const gap = 8;

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
        <filter id="neon-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-red" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background (Transparent for SVGFlowWrapper) */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="#06b6d4" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-cyan)">LIFO 스택</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">Last-In, First-Out (후입선출) 메모리 구조</text>

      {/* Container Base & Borders (The "Stack" glass case) */}
      <motion.path
        d={`M ${centerX - slotWidth/2 - 20} ${baseY - maxSize * (slotHeight + gap) - 10} L ${centerX - slotWidth/2 - 20} ${baseY + 10} L ${centerX + slotWidth/2 + 20} ${baseY + 10} L ${centerX + slotWidth/2 + 20} ${baseY - maxSize * (slotHeight + gap) - 10}`}
        fill="none"
        stroke={isError ? "#ef4444" : "hsl(var(--border))"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ stroke: isError ? "#ef4444" : "hsl(var(--border))" }}
        transition={{ duration: 0.2 }}
      />
      <motion.rect
        x={centerX - slotWidth/2 - 20}
        y={baseY - maxSize * (slotHeight + gap) - 10}
        width={slotWidth + 40}
        height={maxSize * (slotHeight + gap) + 20}
        fill={isError ? "rgba(239, 68, 68, 0.05)" : "rgba(6, 182, 212, 0.02)"}
        animate={{ fill: isError ? "rgba(239, 68, 68, 0.05)" : "rgba(6, 182, 212, 0.02)" }}
      />

      {/* Action Indicator Text */}
      <AnimatePresence>
        {action.type !== "IDLE" && (
          <motion.text
            initial={{ opacity: 0, y: baseY - maxSize * (slotHeight + gap) - 60 }}
            animate={{ opacity: 1, y: baseY - maxSize * (slotHeight + gap) - 40 }}
            exit={{ opacity: 0 }}
            x={centerX}
            y={baseY - maxSize * (slotHeight + gap) - 40}
            textAnchor="middle"
            fill={action.type === "PUSH" ? "#06b6d4" : action.type === "POP" ? "#f97316" : action.type === "PEEK" ? "#a855f7" : "#ef4444"}
            fontSize="18"
            fontWeight="bold"
            letterSpacing="2"
            filter={action.type === "PUSH" ? "url(#neon-glow-cyan)" : action.type === "POP" ? "url(#neon-glow-orange)" : undefined}
          >
            {action.type === "ERROR" ? "연산 실패" : `${action.type} ${action.val !== undefined ? `(${action.val})` : ""}`}
          </motion.text>
        )}
      </AnimatePresence>

      {/* Empty Slots Guidelines */}
      {Array.from({ length: maxSize }).map((_, i) => {
        const yPos = baseY - i * (slotHeight + gap) - slotHeight;
        return (
          <g key={`empty-${i}`}>
            <rect x={centerX - slotWidth/2} y={yPos} width={slotWidth} height={slotHeight} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" rx="6" />
            <text x={centerX - slotWidth/2 - 25} y={yPos + slotHeight/2 + 4} fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end">[{i}]</text>
          </g>
        );
      })}

      {/* Stack Items */}
      <AnimatePresence>
        {stack.map((val, i) => {
          const yPos = baseY - i * (slotHeight + gap) - slotHeight;
          const isTop = i === stack.length - 1;
          const isActivelyPopping = action.type === "POP" && action.index === i;

          return (
            <motion.g
              key={`item-${i}-${val}`}
              initial={{ opacity: 0, y: yPos - 50, scale: 0.9 }}
              animate={{ opacity: 1, y: yPos, scale: 1 }}
              exit={{ opacity: 0, y: yPos - 50, scale: 1.1, filter: "blur(4px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Item Box */}
              <motion.rect
                x={centerX - slotWidth/2}
                y={0}
                width={slotWidth}
                height={slotHeight}
                rx="8"
                fill={isActivelyPopping ? "rgba(249, 115, 22, 0.2)" : (isTop ? "rgba(6, 182, 212, 0.2)" : "hsl(var(--muted))")}
                stroke={isActivelyPopping ? "#f97316" : (isTop ? "#06b6d4" : "hsl(var(--border))")}
                strokeWidth="2"
                filter={isActivelyPopping ? "url(#neon-glow-orange)" : (isTop ? "url(#neon-glow-cyan)" : undefined)}
              />

              {/* Value */}
              <motion.text
                x={centerX}
                y={slotHeight / 2 + 6}
                fill={isActivelyPopping ? "#f97316" : (isTop ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))")}
                fontSize="18"
                fontWeight="bold"
                textAnchor="middle"
              >
                {val}
              </motion.text>

              {/* TOP Label Marker */}
              {isTop && !isActivelyPopping && (
                <motion.g
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <path d={`M ${centerX + slotWidth/2 + 25} ${slotHeight/2} L ${centerX + slotWidth/2 + 10} ${slotHeight/2 - 5} L ${centerX + slotWidth/2 + 10} ${slotHeight/2 + 5} Z`} fill="#06b6d4" />
                  <text x={centerX + slotWidth/2 + 35} y={slotHeight/2 + 4} fill="#06b6d4" fontSize="12" fontWeight="bold" letterSpacing="1" filter="url(#neon-glow-cyan)">TOP</text>
                </motion.g>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Info Panel on the right */}
      <g transform="translate(580, 200)">
        <rect x="0" y="0" width="180" height="150" fill="hsl(var(--muted))" opacity="0.5" stroke="hsl(var(--border))" rx="8" />
        <text x="15" y="25" fill="hsl(var(--foreground))" fontSize="12" fontWeight="bold">공간 지표 (Space Metrics)</text>
        <line x1="15" y1="35" x2="165" y2="35" stroke="hsl(var(--border))" strokeWidth="1" />

        <text x="15" y="60" fill="hsl(var(--muted-foreground))" fontSize="11">최대 용량:</text>
        <text x="165" y="60" fill="hsl(var(--foreground))" fontSize="11" textAnchor="end">{maxSize}</text>

        <text x="15" y="80" fill="hsl(var(--muted-foreground))" fontSize="11">현재 크기:</text>
        <text x="165" y="80" fill="#06b6d4" fontSize="11" textAnchor="end" fontWeight="bold" filter="url(#neon-glow-cyan)">{stack.length}</text>

        <text x="15" y="100" fill="hsl(var(--muted-foreground))" fontSize="11">남은 공간:</text>
        <text x="165" y="100" fill="hsl(var(--foreground))" fontSize="11" textAnchor="end">{maxSize - stack.length}</text>

        {/* Utilization Bar */}
        <rect x="15" y="120" width="150" height="6" fill="hsl(var(--muted-foreground))" opacity="0.3" rx="3" />
        <motion.rect
          x="15"
          y="120"
          height="6"
          fill="#06b6d4"
          rx="3"
          filter="url(#neon-glow-cyan)"
          animate={{ width: 150 * (stack.length / maxSize) }}
          transition={{ type: "spring", stiffness: 100 }}
        />
      </g>
    </svg>
  );
}
