import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CAPACITY = 6;

export function useCircularQueueSim() {
  const [items, setItems] = useState<(number | null)[]>([10, 20, null, null, null, null]);
  const [front, setFront] = useState(0);
  const [rear, setRear] = useState(1);
  const [size, setSize] = useState(2);
  const [logs, setLogs] = useState<string[]>([
    "> 시스템 초기화: 원형 큐(Circular Ring Buffer Queue)",
    "> [대기] 모듈러 연산(%)을 통해 공간을 재사용합니다. (rear + 1) % capacity"
  ]);
  const [action, setAction] = useState<{ type: "IDLE" | "ENQUEUE" | "DEQUEUE" | "PEEK" | "ERROR", val?: number, index?: number }>({ type: "IDLE" });

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const push = useCallback(() => { // enqueue
    if (size >= CAPACITY) {
      setAction({ type: "ERROR" });
      appendLog("[오버플로] 링 버퍼가 가득 찼습니다! 데이터를 추가할 수 없습니다.");
      return;
    }
    const newRear = (rear + 1) % CAPACITY;
    const val = Math.floor(Math.random() * 90) + 10;
    setItems(prev => {
      const next = [...prev];
      next[newRear] = val;
      return next;
    });
    setRear(newRear);
    setSize(s => s + 1);
    setAction({ type: "ENQUEUE", val, index: newRear });
    appendLog(`[ENQUEUE] 인덱스 ${newRear}에 ${val} 삽입됨. Rear → ${newRear} (모듈로 회전). 크기: ${size + 1}.`);
  }, [appendLog, rear, size]);

  const pop = useCallback(() => { // dequeue
    if (size === 0) {
      setAction({ type: "ERROR" });
      appendLog("[언더플로] 링 버퍼가 비어 있습니다.");
      return;
    }
    const val = items[front];
    setItems(prev => {
      const next = [...prev];
      next[front] = null;
      return next;
    });
    const newFront = (front + 1) % CAPACITY;
    setFront(newFront);
    setSize(s => s - 1);
    setAction({ type: "DEQUEUE", val: val ?? undefined, index: front });
    appendLog(`[DEQUEUE] 인덱스 ${front}에서 ${val} 제거됨. Front → ${newFront} (모듈로 회전). 크기: ${size - 1}.`);
  }, [appendLog, front, size, items]);

  const peek = useCallback(() => {
    if (size === 0) {
      setAction({ type: "ERROR" });
      appendLog("[PEEK] 버퍼가 비어 있습니다.");
      return;
    }
    setAction({ type: "PEEK", val: items[front] ?? undefined, index: front });
    appendLog(`[PEEK] Front 데이터는 인덱스 ${front}의 ${items[front]} 입니다.`);
  }, [appendLog, front, size, items]);

  const reset = useCallback(() => {
    setItems([10, 20, null, null, null, null]);
    setFront(0); setRear(1); setSize(2);
    setAction({ type: "IDLE" });
    setLogs(["> 시스템 리셋: 링 버퍼 초기화 완료."]);
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
      visualData: { items, front, rear, size, action, capacity: CAPACITY },
      logs,
      handlers: { push, pop, peek, reset, clear: reset }
    }
  };
}

export function CircularQueueVisualizer({ data }: { data: { items: (number | null)[], front: number, rear: number, size: number, action: { type: string, val?: number, index?: number }, capacity: number } }) {
  const { items, front, rear, size, action, capacity } = data;
  const isError = action.type === "ERROR";

  const cx = 400, cy = 250, r = 130;
  const angleStep = (2 * Math.PI) / capacity;
  const cellPositions = Array.from({ length: capacity }, (_, i) => {
    // start top (-PI/2), go clockwise
    const angle = i * angleStep - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      angle
    };
  });

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
        <filter id="neon-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neon-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arr-circ" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
        </marker>
        <marker id="arr-circ-err" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
        </marker>
      </defs>

      {/* Background */}
      <rect width="800" height="500" fill="url(#grid)" />

      {/* Title & Core Concept */}
      <text x="40" y="50" fill="#a855f7" fontSize="24" fontWeight="bold" letterSpacing="2" filter="url(#neon-glow-purple)">원형 큐 (Circular Queue)</text>
      <text x="40" y="75" fill="hsl(var(--muted-foreground))" fontSize="12" letterSpacing="1">모듈러(%) 연산을 활용한 링 버퍼 (Ring Buffer)</text>

      {/* Action Indicator Text */}
      <AnimatePresence>
        {action.type !== "IDLE" && (
          <motion.text
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            x={cx}
            y={cy - 50}
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

      {/* Center size display */}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="12" fontWeight="bold" fill="hsl(var(--muted-foreground))">크기 (SIZE)</text>
      <text x={cx} y={cy + 25} textAnchor="middle" fontSize="32" fontWeight="bold" fill="#a855f7" filter="url(#neon-glow-purple)">{size}/{capacity}</text>

      {/* Inner Circle Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" opacity="0.5" strokeWidth="60" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" />

      {/* Rotation direction arrow */}
      <path
        d={`M ${cx + r + 40},${cy - 25} A ${r + 40} ${r + 40} 0 0 1 ${cx + r + 40},${cy + 25}`}
        fill="none"
        stroke={isError ? "#ef4444" : "#a855f7"}
        strokeWidth="2"
        markerEnd={isError ? "url(#arr-circ-err)" : "url(#arr-circ)"}
        opacity="0.8"
      />

      {/* Array Slots & Items */}
      <AnimatePresence>
        {cellPositions.map(({ x, y, angle }, i) => {
          const val = items[i];
          const isFront = i === front && val !== null;
          const isRear = i === rear && val !== null;
          const isEmpty = val === null;

          const isActivelyDequeuing = action.type === "DEQUEUE" && action.index === i;
          const isActivelyEnqueuing = action.type === "ENQUEUE" && action.index === i;

          return (
            <motion.g
              key={`circ-${i}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Item Circle */}
              <motion.circle
                cx={x}
                cy={y}
                r="30"
                fill={isActivelyDequeuing ? "rgba(239, 68, 68, 0.2)" : (isActivelyEnqueuing ? "rgba(16, 185, 129, 0.2)" : (isEmpty ? "hsl(var(--card))" : "hsl(var(--muted))"))}
                stroke={isActivelyDequeuing ? "#ef4444" : (isActivelyEnqueuing ? "#10b981" : (isEmpty ? "hsl(var(--border))" : "#06b6d4"))}
                strokeWidth={isActivelyDequeuing || isActivelyEnqueuing ? "3" : "2"}
                strokeDasharray={isEmpty ? "4 4" : "0"}
                filter={isActivelyDequeuing ? "url(#neon-glow-destructive)" : (isActivelyEnqueuing ? "url(#neon-glow-emerald)" : (!isEmpty ? "url(#neon-glow-cyan)" : undefined))}
              />

              {/* Value */}
              <motion.text
                x={x}
                y={y + 6}
                fill={isActivelyDequeuing ? "#ef4444" : (isEmpty ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))")}
                fontSize="18"
                fontWeight="bold"
                textAnchor="middle"
              >
                {val !== null ? val : "·"}
              </motion.text>

              {/* Index Outline Label */}
              <text
                x={cx + (r + 55) * Math.cos(angle)}
                y={cy + (r + 55) * Math.sin(angle) + 4}
                fill="hsl(var(--muted-foreground))"
                fontSize="12"
                textAnchor="middle"
              >
                [{i}]
              </text>

              {/* Pointers Top Label */}
              <AnimatePresence>
                {isFront && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <text
                      x={cx + (r - 55) * Math.cos(angle)}
                      y={cy + (r - 55) * Math.sin(angle) + 4}
                      fill="#ef4444"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                      filter="url(#neon-glow-destructive)"
                    >
                      F
                    </text>
                  </motion.g>
                )}
                {isRear && !isFront && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <text
                      x={cx + (r - 55) * Math.cos(angle)}
                      y={cy + (r - 55) * Math.sin(angle) + 4}
                      fill="#10b981"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                      filter="url(#neon-glow-emerald)"
                    >
                      R
                    </text>
                  </motion.g>
                )}
                {isFront && isRear && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <text
                      x={cx + (r - 55) * Math.cos(angle)}
                      y={cy + (r - 55) * Math.sin(angle) + 4}
                      fill="#f59e0b"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      F=R
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Info Panel on bottom left */}
      <g transform="translate(40, 390)">
        <rect x="0" y="0" width="220" height="70" fill="hsl(var(--card))" opacity="0.6" stroke="hsl(var(--border))" rx="8" />
        <text x="15" y="25" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="bold" letterSpacing="1">모듈러 로직 (MODULO LOGIC)</text>
        <rect x="15" y="35" width="190" height="25" fill="hsl(var(--muted))" rx="4" />
        <text x="25" y="52" fill="#a855f7" fontSize="11" fontFamily="monospace">rear = (rear + 1) % size</text>
      </g>

      {/* Info Panel on bottom right */}
      <g transform="translate(620, 390)">
        <rect x="0" y="0" width="140" height="70" fill="hsl(var(--card))" opacity="0.6" stroke="hsl(var(--border))" rx="8" />

        <text x="15" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">Front:</text>
        <text x="55" y="25" fill="#ef4444" fontSize="12" fontWeight="bold" filter="url(#neon-glow-destructive)">{front}</text>

        <text x="15" y="45" fill="hsl(var(--muted-foreground))" fontSize="11">Rear:</text>
        <text x="55" y="45" fill="#10b981" fontSize="12" fontWeight="bold" filter="url(#neon-glow-emerald)">{rear}</text>

        <text x="90" y="25" fill="hsl(var(--muted-foreground))" fontSize="11">최대:</text>
        <text x="120" y="25" fill="hsl(var(--foreground))" fontSize="11">{capacity}</text>
      </g>
    </svg>
  );
}
