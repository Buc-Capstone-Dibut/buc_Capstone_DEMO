import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useQueueOverviewSim() {
  const [queue, setQueue] = useState<number[]>([10, 20, 30]);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 큐(Queue) 자료구조",
    "> 프로토콜: FIFO (선입선출)",
    "> [명령 대기 중] >>"
  ]);
  const [action, setAction] = useState<{ type: "IDLE" | "ENQUEUE" | "DEQUEUE" | "PEEK" | "ERROR", val?: number, index?: number }>({ type: "IDLE" });
  const maxSize = 6;

  const appendLog = useCallback((msg: string) => {
    setLogs(l => [`> ${msg}`, ...l]);
  }, []);

  const push = useCallback(() => {  // enqueue
    setQueue(prev => {
      if (prev.length >= maxSize) {
        setAction({ type: "ERROR" });
        appendLog("[오버플로] 큐가 가득 찼습니다! 데이터를 큐에 넣을 수 없습니다.");
        return prev;
      }
      const val = Math.floor(Math.random() * 90) + 10;
      setAction({ type: "ENQUEUE", val, index: prev.length });
      appendLog(`[ENQUEUE] 후단에 ${val} 추가됨. 크기: ${prev.length + 1}/${maxSize}`);
      return [...prev, val];
    });
  }, [appendLog]);

  const pop = useCallback(() => { // dequeue
    setQueue(prev => {
      if (prev.length === 0) {
        setAction({ type: "ERROR" });
        appendLog("[언더플로] 큐가 비어 있습니다! 데이터를 뺄 수 없습니다.");
        return prev;
      }
      const val = prev[0];
      setAction({ type: "DEQUEUE", val, index: 0 });
      appendLog(`[DEQUEUE] 전단에서 ${val} 제거됨. 크기: ${prev.length - 1}/${maxSize}`);
      return prev.slice(1);
    });
  }, [appendLog]);

  const peek = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) {
        setAction({ type: "ERROR" });
        appendLog("[PEEK] 큐가 비어 있습니다.");
        return prev;
      }
      const val = prev[0];
      setAction({ type: "PEEK", val, index: 0 });
      appendLog(`[PEEK] 전단 데이터는 ${val} 입니다.`);
      return prev;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setQueue([10, 20, 30]);
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
      visualData: { queue, action, maxSize },
      logs,
      handlers: { push, pop, peek, reset, clear: reset }
    }
  };
}

export function QueueOverviewVisualizer({ data }: { data: { queue: number[], action: { type: string, val?: number, index?: number }, maxSize: number } }) {
  const { queue, action, maxSize } = data;
  const isError = action.type === "ERROR";

  // Coordinates
  const centerY = 250;
  const slotWidth = 70;
  const slotHeight = 70;
  const gap = 12;
  const totalWidth = maxSize * slotWidth + (maxSize - 1) * gap;
  const startX = 400 - totalWidth / 2 + slotWidth / 2;

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
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
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
        <filter id="neon-glow-destructive" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="#10b981" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-emerald)">FIFO 큐 (Queue)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">First-In, First-Out (선입선출) 데이터 파이프라인</text>

      {/* Container Pipeline (The "Pipe") */}
      <motion.path
        d={`M ${startX - slotWidth/2 - 20} ${centerY - slotHeight/2 - 20} L ${startX + totalWidth - slotWidth/2 + 20} ${centerY - slotHeight/2 - 20}`}
        fill="none"
        stroke={isError ? "#ef4444" : "hsl(var(--border))"}
        strokeWidth="4"
        strokeLinecap="round"
        animate={{ stroke: isError ? "#ef4444" : "hsl(var(--border))" }}
        transition={{ duration: 0.2 }}
      />
      <motion.path
        d={`M ${startX - slotWidth/2 - 20} ${centerY + slotHeight/2 + 20} L ${startX + totalWidth - slotWidth/2 + 20} ${centerY + slotHeight/2 + 20}`}
        fill="none"
        stroke={isError ? "#ef4444" : "hsl(var(--border))"}
        strokeWidth="4"
        strokeLinecap="round"
        animate={{ stroke: isError ? "#ef4444" : "hsl(var(--border))" }}
        transition={{ duration: 0.2 }}
      />
      <motion.rect
        x={startX - slotWidth/2 - 20}
        y={centerY - slotHeight/2 - 20}
        width={totalWidth + 40}
        height={slotHeight + 40}
        fill={isError ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.02)"}
        animate={{ fill: isError ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.02)" }}
      />

      {/* Direction Flow Arrows */}
      <g opacity="0.4">
        <path d={`M ${startX - slotWidth/2 - 60} ${centerY} L ${startX - slotWidth/2 - 30} ${centerY}`} stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
        <path d={`M ${startX - slotWidth/2 - 35} ${centerY - 5} L ${startX - slotWidth/2 - 30} ${centerY} L ${startX - slotWidth/2 - 35} ${centerY + 5}`} fill="none" stroke="#10b981" strokeWidth="2" />

        <path d={`M ${startX + totalWidth - slotWidth/2 + 30} ${centerY} L ${startX + totalWidth - slotWidth/2 + 60} ${centerY}`} stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
        <path d={`M ${startX + totalWidth - slotWidth/2 + 55} ${centerY - 5} L ${startX + totalWidth - slotWidth/2 + 60} ${centerY} L ${startX + totalWidth - slotWidth/2 + 55} ${centerY + 5}`} fill="none" stroke="#ef4444" strokeWidth="2" />
      </g>

      {/* Front and Rear Labels */}
      <text x={startX - slotWidth/2 - 10} y={centerY - slotHeight/2 - 30} fill="#ef4444" fontSize="12" fontWeight="bold" letterSpacing="2" textAnchor="end" filter="url(#neon-glow-destructive)">[전단/FRONT] DEQUEUE &lt;&lt;</text>
      <text x={startX + totalWidth - slotWidth/2 + 10} y={centerY - slotHeight/2 - 30} fill="#10b981" fontSize="12" fontWeight="bold" letterSpacing="2" textAnchor="start" filter="url(#neon-glow-emerald)">&lt;&lt; ENQUEUE [후단/REAR]</text>

      {/* Action Indicator Text */}
      <AnimatePresence>
        {action.type !== "IDLE" && (
          <motion.text
            initial={{ opacity: 0, y: centerY + slotHeight/2 + 60 }}
            animate={{ opacity: 1, y: centerY + slotHeight/2 + 40 }}
            exit={{ opacity: 0 }}
            x={400}
            y={centerY + slotHeight/2 + 40}
            textAnchor="middle"
            fill={action.type === "ENQUEUE" ? "#10b981" : action.type === "DEQUEUE" ? "#ef4444" : action.type === "PEEK" ? "#a855f7" : "#ef4444"}
            fontSize="18"
            fontWeight="bold"
            letterSpacing="2"
            filter={action.type === "ENQUEUE" ? "url(#neon-glow-emerald)" : action.type === "DEQUEUE" ? "url(#neon-glow-destructive)" : undefined}
          >
            {action.type === "ERROR" ? "연산 실패" : `${action.type} ${action.val !== undefined ? `(${action.val})` : ""}`}
          </motion.text>
        )}
      </AnimatePresence>

      {/* Empty Slots Guidelines */}
      {Array.from({ length: maxSize }).map((_, i) => {
        const xPos = startX + (maxSize - 1 - i) * (slotWidth + gap);
        return (
          <g key={`empty-${i}`}>
            <rect x={xPos - slotWidth/2} y={centerY - slotHeight/2} width={slotWidth} height={slotHeight} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" rx="6" />
            <text x={xPos} y={centerY + slotHeight/2 + 16} fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="middle">[{i}]</text>
          </g>
        );
      })}

      {/* Queue Items */}
      <AnimatePresence>
        {queue.map((val, i) => {
          // Items enter from the right (Rear) and exit from the left (Front)
          // Index 0 in the 'queue' array is the Front.
          // In the UI, let's render Front on the Left, Rear on the Right.
          // Since empty slots are calculated (maxSize - 1 - i), index 0 (Front) should be at the leftmost available position.
          // Actually, our Empty Slots Guidelines drew index 0 on the Right!
          // Let's reverse the visual concept: Front=0 on Left, Rear on Right.
          // So xPos = startX + i * (slotWidth + gap)
          const xPos = startX + i * (slotWidth + gap);

          const isFront = i === 0;
          const isRear = i === queue.length - 1;
          const isActivelyDequeuing = action.type === "DEQUEUE" && action.index === i;
          const isActivelyEnqueuing = action.type === "ENQUEUE" && action.index === i;

          // Animation starting position (enter from right)
          const initialX = isActivelyEnqueuing ? xPos + 100 : xPos;

          return (
            <motion.g
              key={`item-${val}-${i}`}
              initial={{ opacity: 0, x: initialX, y: centerY, scale: 0.9 }}
              animate={{ opacity: 1, x: xPos, y: centerY, scale: 1 }}
              exit={{ opacity: 0, x: xPos - 100, y: centerY, scale: 1.1, filter: "blur(4px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Item Box */}
              <motion.rect
                x={-slotWidth/2}
                y={-slotHeight/2}
                width={slotWidth}
                height={slotHeight}
                rx="8"
                fill={isActivelyDequeuing ? "rgba(239, 68, 68, 0.2)" : (isActivelyEnqueuing ? "rgba(16, 185, 129, 0.2)" : "hsl(var(--muted))")}
                stroke={isActivelyDequeuing ? "#ef4444" : (isFront ? "#ef4444" : (isRear ? "#10b981" : "hsl(var(--border))"))}
                strokeWidth="2"
                filter={isActivelyDequeuing ? "url(#neon-glow-destructive)" : (isActivelyEnqueuing ? "url(#neon-glow-emerald)" : undefined)}
              />

              {/* Value */}
              <motion.text
                x={0}
                y={6}
                fill={isActivelyDequeuing ? "#ef4444" : (isFront ? "#ef4444" : (isRear ? "#10b981" : "hsl(var(--foreground))"))}
                fontSize="18"
                fontWeight="bold"
                textAnchor="middle"
              >
                {val}
              </motion.text>
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Info Panel on bottom */}
      <g transform="translate(60, 400)">
        <rect x="0" y="0" width="200" height="60" fill="hsl(var(--muted))" opacity="0.5" stroke="hsl(var(--border))" rx="8" />
        <text x="15" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">최대 용량: {maxSize}</text>
        <text x="15" y="45" fill="hsl(var(--muted-foreground))" fontSize="11">현재 크기: <tspan fill="#10b981" fontWeight="bold">{queue.length}</tspan></text>

        <rect x="110" y="38" width="70" height="6" fill="hsl(var(--muted-foreground))" opacity="0.3" rx="3" />
        <motion.rect
          x="110"
          y="38"
          height="6"
          fill="#10b981"
          rx="3"
          filter="url(#neon-glow-emerald)"
          animate={{ width: 70 * (queue.length / maxSize) }}
          transition={{ type: "spring", stiffness: 100 }}
        />
      </g>
    </svg>
  );
}
