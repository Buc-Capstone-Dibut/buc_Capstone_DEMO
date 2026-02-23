"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CAPACITY = 6;

export function useCircularQueueSim() {
  const [items, setItems] = useState<(number | null)[]>([10, 20, null, null, null, null]);
  const [front, setFront] = useState(0);
  const [rear, setRear] = useState(1);
  const [size, setSize] = useState(2);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Circular Ring Buffer Queue",
    "> [AWAIT] Modular indexing allows space reuse. (rear + 1) % capacity"
  ]);

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const push = useCallback(() => { // enqueue
    if (size >= CAPACITY) {
      appendLog("[OVERFLOW] Ring buffer full! Cannot enqueue.");
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
    appendLog(`[ENQUEUE] ${val} at index ${newRear}. Rear → ${newRear} (modulo wrap). Size: ${size + 1}.`);
  }, [appendLog, rear, size]);

  const pop = useCallback(() => { // dequeue
    if (size === 0) {
      appendLog("[UNDERFLOW] Ring buffer empty.");
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
    appendLog(`[DEQUEUE] Removed ${val} from index ${front}. Front → ${newFront} (modulo wrap). Size: ${size - 1}.`);
  }, [appendLog, front, size, items]);

  const peek = useCallback(() => {
    if (size === 0) { appendLog("[PEEK] Buffer empty."); return; }
    appendLog(`[PEEK] Front element = ${items[front]} at index ${front}.`);
  }, [appendLog, front, size, items]);

  const reset = useCallback(() => {
    setItems([10, 20, null, null, null, null]);
    setFront(0); setRear(1); setSize(2);
    setLogs(["> SYSTEM RESET: Ring buffer flushed."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { items, front, rear, size },
      logs,
      handlers: { push, pop, peek, reset, clear: reset }
    }
  };
}

export function CircularQueueVisualizer({ data }: { data: { items: (number | null)[], front: number, rear: number, size: number } }) {
  const { items, front, rear, size } = data;

  const cx = 150, cy = 150, r = 100;
  const angleStep = (2 * Math.PI) / CAPACITY;
  const cellPositions = Array.from({ length: CAPACITY }, (_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-10">
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono rounded-xl py-8 gap-8 px-4">
      <CyberGrid />

      <motion.div className="w-full max-w-4xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          <span className="font-bold text-purple-500">Circular Queue</span> uses modular arithmetic to recycle array slots — no wasted space after dequeue!
        </p>
      </motion.div>

      <div className="w-full max-w-4xl z-10 flex flex-col lg:flex-row gap-8 items-center justify-center">

        {/* SVG Ring */}
        <svg width="300" height="300" viewBox="0 0 300 300" className="shrink-0">
          {/* Inner Circle Guide */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="40" opacity="0.15" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

          {/* Rotation direction arrow */}
          <path d={`M ${cx + r + 25},${cy - 15} A ${r + 25} ${r + 25} 0 0 1 ${cx + r + 25},${cy + 15}`} fill="none" stroke="hsl(var(--purple-500))" strokeWidth="2" markerEnd="url(#arr-circ)" opacity="0.6" />

          <defs>
            <marker id="arr-circ" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--purple-500))" />
            </marker>
          </defs>

          {cellPositions.map(({ x, y }, i) => {
            const val = items[i];
            const isFront = i === front && val !== null;
            const isRear = i === rear && val !== null;
            const hasVal = val !== null;

            let fill = "hsl(var(--card))";
            let stroke = "hsl(var(--border))";
            let strokeW = "2";
            if (isFront) { fill = "hsl(var(--destructive)/0.2)"; stroke = "hsl(var(--destructive))"; strokeW = "3"; }
            else if (isRear) { fill = "hsl(var(--emerald-500)/0.2)"; stroke = "hsl(var(--emerald-500))"; strokeW = "3"; }
            else if (hasVal) { fill = "hsl(var(--cyan-500)/0.1)"; stroke = "hsl(var(--cyan-500)/0.4)"; }

            return (
              <g key={`circ-${i}`}>
                <circle cx={x} cy={y} r="22" fill={fill} stroke={stroke} strokeWidth={strokeW} />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold"
                  fill={isFront ? "hsl(var(--destructive))" : isRear ? "hsl(var(--emerald-500))" : hasVal ? "white" : "hsl(var(--muted-foreground)/0.3)"}>
                  {hasVal ? val : "·"}
                </text>
                {isFront && <text x={x} y={y - 28} textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--destructive))">FRONT</text>}
                {isRear && !isFront && <text x={x} y={y - 28} textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--emerald-500))">REAR</text>}
                <text x={x} y={y + 32} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">[{i}]</text>
              </g>
            );
          })}

          {/* Center size display */}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--muted-foreground))">SIZE</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="20" fontWeight="bold" fill="hsl(var(--purple-500))">{size}/{CAPACITY}</text>
        </svg>

        {/* Info Panel */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <div className="bg-[#0d1117]/80 rounded-2xl p-5 border border-border text-sm font-mono flex flex-col gap-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-black mb-1">Ring Buffer Logic</div>
            <code className="text-purple-400 text-xs leading-relaxed bg-muted/30 p-2 rounded"><pre>{`rear = (rear + 1) % capacity
front = (front + 1) % capacity`}</pre></code>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card/60 border border-border rounded-xl p-3 text-center">
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Front</div>
              <div className="text-2xl font-black text-destructive">{front}</div>
            </div>
            <div className="bg-card/60 border border-border rounded-xl p-3 text-center">
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Rear</div>
              <div className="text-2xl font-black text-emerald-500">{rear}</div>
            </div>
          </div>

          <div className="bg-card/50 rounded-xl border border-border p-4 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Key Insight:</strong> Modular indexing wraps the rear/front pointers around the array, eliminating false overflow — unlike the linear queue.
          </div>
        </div>
      </div>
    </div>
  );
}
