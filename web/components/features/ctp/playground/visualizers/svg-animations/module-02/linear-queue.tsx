import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MAX_SIZE = 6;

export function useLinearQueueSim() {
  const [items, setItems] = useState<(number | null)[]>([10, 20, null, null, null, null]);
  const [front, setFront] = useState(0);
  const [rear, setRear] = useState(1); // points to last occupied index
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 배열 기반 선형 큐(Linear Queue)",
    "> [대기] Front=0, Rear=1. Enqueue로 Rear 이동. Dequeue로 Front 이동."
  ]);
  const [action, setAction] = useState<{ type: "IDLE" | "ENQUEUE" | "DEQUEUE" | "PEEK" | "ERROR", val?: number, index?: number }>({ type: "IDLE" });

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const push = useCallback(() => { // enqueue
    setItems(prev => {
      const newRear = rear + 1;
      if (newRear >= MAX_SIZE) {
        setAction({ type: "ERROR" });
        appendLog("[오버플로] 선형 큐가 가득 찼습니다! 배열 한계 도달. 데이터를 추가할 수 없습니다.");
        return prev;
      }
      const val = Math.floor(Math.random() * 90) + 10;
      const next = [...prev];
      next[newRear] = val;
      setRear(newRear);
      setAction({ type: "ENQUEUE", val, index: newRear });
      appendLog(`[ENQUEUE] 인덱스 ${newRear}에 ${val} 삽입됨. Rear 포인터 → ${newRear}.`);
      return next;
    });
  }, [appendLog, rear]);

  const pop = useCallback(() => { // dequeue
    setItems(prev => {
      if (front > rear) {
        setAction({ type: "ERROR" });
        appendLog("[언더플로] 큐가 비어 있습니다. 꺼낼 데이터가 없습니다.");
        return prev;
      }
      const val = prev[front];
      const next = [...prev];
      next[front] = null;
      setAction({ type: "DEQUEUE", val: val ?? undefined, index: front });
      setFront(f => {
        appendLog(`[DEQUEUE] 인덱스 ${f}에서 ${val} 제거됨. Front 포인터 → ${f + 1}.`);
        return f + 1;
      });
      return next;
    });
  }, [appendLog, front, rear]);

  const peek = useCallback(() => {
    if (front > rear || items[front] === null) {
      setAction({ type: "ERROR" });
      appendLog("[PEEK] 큐가 비어 있습니다.");
      return;
    }
    setAction({ type: "PEEK", val: items[front] ?? undefined, index: front });
    appendLog(`[PEEK] Front 데이터는 인덱스 ${front}의 ${items[front]} 입니다. 변화 없음.`);
  }, [appendLog, front, rear, items]);

  const reset = useCallback(() => {
    setItems([10, 20, null, null, null, null]);
    setFront(0);
    setRear(1);
    setAction({ type: "IDLE" });
    setLogs(["> 시스템 리셋: 선형 큐 초기화. Front=0, Rear=1."]);
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
      visualData: { items, front, rear, action, maxSize: MAX_SIZE },
      logs,
      handlers: { push, pop, peek, reset, clear: reset }
    }
  };
}

export function LinearQueueVisualizer({ data }: { data: { items: (number | null)[], front: number, rear: number, action: { type: string, val?: number, index?: number }, maxSize: number } }) {
  const { items, front, rear, action, maxSize } = data;
  const isError = action.type === "ERROR";

  // Coordinates
  const centerY = 240;
  const slotWidth = 80;
  const slotHeight = 80;
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
        <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-destructive" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-orange" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
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
      <text x="40" y="50" fill="#f97316" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-orange)">선형 큐 (Linear Queue)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">배열 기반 고정 크기 구조 (Array-Based Fixed Structure)</text>

      {/* Container Background Base */}
      <motion.rect
        x={startX - slotWidth/2 - 15}
        y={centerY - slotHeight/2 - 15}
        width={totalWidth + 30}
        height={slotHeight + 30}
        fill={isError ? "rgba(239, 68, 68, 0.05)" : "hsl(var(--card))"}
        opacity={0.5}
        rx="12"
        stroke={isError ? "#ef4444" : "hsl(var(--border))"}
        strokeWidth="2"
        animate={{ stroke: isError ? "#ef4444" : "hsl(var(--border))" }}
        transition={{ duration: 0.2 }}
      />

      {/* Action Indicator Text */}
      <AnimatePresence>
        {action.type !== "IDLE" && (
          <motion.text
            initial={{ opacity: 0, y: centerY + slotHeight/2 + 80 }}
            animate={{ opacity: 1, y: centerY + slotHeight/2 + 60 }}
            exit={{ opacity: 0, y: centerY + slotHeight/2 + 50 }}
            x={400}
            y={centerY + slotHeight/2 + 60}
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

      {/* Warning text about false overflow */}
      <AnimatePresence>
        {front > 0 && !isError && (
          <motion.g
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <rect x="230" y="380" width="340" height="30" fill="rgba(249, 115, 22, 0.1)" stroke="rgba(249, 115, 22, 0.3)" rx="8" />
            <text x="400" y="400" fill="#f97316" fontSize="12" fontWeight="bold" textAnchor="middle">WARNING: 낭비된 공간 감지 (가짜 오버플로 위험)</text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Array Slots & Items */}
      <AnimatePresence>
        {items.map((val, i) => {
          const xPos = startX + i * (slotWidth + gap);

          const isFront = i === front && val !== null;
          const isRear = i === rear && val !== null;
          const isEmpty = val === null;
          const isWasted = (i < front);

          const isActivelyDequeuing = action.type === "DEQUEUE" && action.index === i;
          const isActivelyEnqueuing = action.type === "ENQUEUE" && action.index === i;

          return (
            <motion.g
              key={`item-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Item Box */}
              <motion.rect
                x={xPos - slotWidth/2}
                y={centerY - slotHeight/2}
                width={slotWidth}
                height={slotHeight}
                rx="8"
                fill={isActivelyDequeuing ? "rgba(239, 68, 68, 0.2)" : (isActivelyEnqueuing ? "rgba(16, 185, 129, 0.2)" : (isWasted ? "rgba(30,30,30,0.4)" : "hsl(var(--card))"))}
                stroke={isActivelyDequeuing ? "#ef4444" : (isActivelyEnqueuing ? "#10b981" : (isEmpty && !isWasted ? "hsl(var(--border))" : (isWasted ? "hsl(var(--border))" : "#06b6d4")))}
                strokeWidth={isActivelyDequeuing || isActivelyEnqueuing ? "3" : "2"}
                strokeDasharray={(isEmpty && !isWasted) || isWasted ? "4 4" : "0"}
                filter={isActivelyDequeuing ? "url(#neon-glow-destructive)" : (isActivelyEnqueuing ? "url(#neon-glow-emerald)" : undefined)}
              />

              {/* Value */}
              <motion.text
                x={xPos}
                y={centerY + 6}
                fill={isActivelyDequeuing ? "#ef4444" : (isWasted ? "hsl(var(--muted-foreground))" : (isEmpty ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))"))}
                fontSize="20"
                fontWeight="bold"
                textAnchor="middle"
              >
                {val !== null ? val : (isWasted ? "✗" : "—")}
              </motion.text>

              {/* Index Subtitle */}
              <text x={xPos} y={centerY + slotHeight/2 + 20} fill="hsl(var(--muted-foreground))" fontSize="12" textAnchor="middle">
                [{i}]
              </text>

              {/* Pointers Top Label */}
              <AnimatePresence>
                {isFront && (
                  <motion.g
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <path d={`M ${xPos} ${centerY - slotHeight/2 - 5} L ${xPos - 5} ${centerY - slotHeight/2 - 15} L ${xPos + 5} ${centerY - slotHeight/2 - 15} Z`} fill="#ef4444" />
                    <text x={xPos} y={centerY - slotHeight/2 - 25} fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-destructive)">F</text>
                  </motion.g>
                )}
                {isRear && !isFront && (
                  <motion.g
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <path d={`M ${xPos} ${centerY - slotHeight/2 - 5} L ${xPos - 5} ${centerY - slotHeight/2 - 15} L ${xPos + 5} ${centerY - slotHeight/2 - 15} Z`} fill="#10b981" />
                    <text x={xPos} y={centerY - slotHeight/2 - 25} fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#neon-glow-emerald)">R</text>
                  </motion.g>
                )}
                {isFront && isRear && (
                  <motion.g
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <path d={`M ${xPos} ${centerY - slotHeight/2 - 5} L ${xPos - 5} ${centerY - slotHeight/2 - 15} L ${xPos + 5} ${centerY - slotHeight/2 - 15} Z`} fill="#f59e0b" />
                    <text x={xPos} y={centerY - slotHeight/2 - 25} fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">F=R</text>
                  </motion.g>
                )}
              </AnimatePresence>
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Info Panel on bottom right */}
      <g transform="translate(600, 420)">
        <rect x="0" y="0" width="160" height="60" fill="hsl(var(--card))" opacity="0.6" stroke="hsl(var(--border))" rx="8" />

        <text x="15" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">Front:</text>
        <text x="55" y="25" fill="#ef4444" fontSize="12" fontWeight="bold" filter="url(#neon-glow-destructive)">{front}</text>

        <text x="15" y="45" fill="hsl(var(--muted-foreground))" fontSize="11">Rear:</text>
        <text x="55" y="45" fill="#10b981" fontSize="12" fontWeight="bold" filter="url(#neon-glow-emerald)">{rear}</text>

        <text x="90" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">최대:</text>
        <text x="130" y="25" fill="hsl(var(--foreground))" fontSize="11">{maxSize}</text>
      </g>
    </svg>
  );
}
