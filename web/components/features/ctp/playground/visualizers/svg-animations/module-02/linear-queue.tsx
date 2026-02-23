"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MAX_SIZE = 6;

export function useLinearQueueSim() {
  const [items, setItems] = useState<(number | null)[]>([10, 20, null, null, null, null]);
  const [front, setFront] = useState(0);
  const [rear, setRear] = useState(1); // points to last occupied index
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Array-Based Linear Queue",
    "> [AWAIT] Front=0, Rear=1. Enqueue to advance Rear. Dequeue to advance Front."
  ]);

  const appendLog = useCallback((msg: string) => setLogs(l => [`> ${msg}`, ...l]), []);

  const push = useCallback(() => { // enqueue
    setItems(prev => {
      const newRear = rear + 1;
      if (newRear >= MAX_SIZE) {
        appendLog("[OVERFLOW] Linear Queue full! Array boundary reached. Cannot enqueue.");
        return prev;
      }
      const val = Math.floor(Math.random() * 90) + 10;
      const next = [...prev];
      next[newRear] = val;
      setRear(newRear);
      appendLog(`[ENQUEUE] ${val} inserted at index ${newRear}. Rear pointer → ${newRear}.`);
      return next;
    });
  }, [appendLog, rear]);

  const pop = useCallback(() => { // dequeue
    setItems(prev => {
      if (front > rear) {
        appendLog("[UNDERFLOW] Queue is empty. No elements to dequeue.");
        return prev;
      }
      const val = prev[front];
      const next = [...prev];
      next[front] = null;
      setFront(f => {
        appendLog(`[DEQUEUE] Removed ${val} from index ${f}. Front pointer → ${f + 1}.`);
        return f + 1;
      });
      return next;
    });
  }, [appendLog, front, rear]);

  const peek = useCallback(() => {
    if (front > rear || items[front] === null) {
      appendLog("[PEEK] Queue is empty.");
      return;
    }
    appendLog(`[PEEK] Front element = ${items[front]} at index ${front}. No modification.`);
  }, [appendLog, front, rear, items]);

  const reset = useCallback(() => {
    setItems([10, 20, null, null, null, null]);
    setFront(0);
    setRear(1);
    setLogs(["> SYSTEM RESET: Linear queue cleared. Front=0, Rear=1."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { items, front, rear },
      logs,
      handlers: { push, pop, peek, reset, clear: reset }
    }
  };
}

export function LinearQueueVisualizer({ data }: { data: { items: (number | null)[], front: number, rear: number } }) {
  const { items, front, rear } = data;

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono rounded-xl py-8 gap-8 px-4">
      <CyberGrid />

      <motion.div className="w-full max-w-4xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          <span className="font-bold text-orange-500">Linear Queue</span> uses a fixed array. Front pointer advances on dequeue — this wastes space and can trigger false overflow.
        </p>
      </motion.div>

      <div className="w-full max-w-4xl z-10 flex flex-col items-center gap-6">

        {/* Array Cells */}
        <div className="relative flex items-end gap-1.5 w-full max-w-lg justify-center">
          {items.map((val, i) => {
            const isFront = i === front && val !== null;
            const isRear = i === rear && val !== null;
            const isEmpty = val === null;
            const isWasted = i < front && !isEmpty || (val === null && i < front);

            return (
              <div key={`lq-${i}`} className="flex flex-col items-center gap-1 flex-1">
                {/* Pointer Labels */}
                <div className="h-6 flex items-center justify-center">
                  {isFront && <span className="text-[9px] font-black text-destructive uppercase tracking-widest bg-destructive/10 px-1 rounded">F</span>}
                  {isRear && !isFront && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1 rounded">R</span>}
                  {isFront && isRear && <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-1 rounded">F=R</span>}
                </div>

                {/* Cell */}
                <motion.div
                  className={`w-full h-16 rounded-lg border-2 flex flex-col items-center justify-center
                    ${isFront && isRear ? 'border-yellow-500 bg-yellow-500/10' :
                      isFront ? 'border-destructive bg-destructive/10' :
                      isRear ? 'border-emerald-500 bg-emerald-500/10' :
                      val !== null ? 'border-cyan-500/30 bg-cyan-500/5' :
                      i < front ? 'border-border/20 bg-muted/10 opacity-30' :
                      'border-border/30 bg-card/20'}`}
                  animate={{ scale: (isFront || isRear) ? 1.05 : 1 }}
                >
                  {val !== null ? (
                    <span className={`text-lg font-black ${isFront ? 'text-destructive' : isRear ? 'text-emerald-500' : 'text-foreground'}`}>{val}</span>
                  ) : (
                    <span className="text-muted-foreground/30 text-[10px]">{i < front ? '✗' : '—'}</span>
                  )}
                </motion.div>

                {/* Index label */}
                <span className="text-[9px] text-muted-foreground/60 font-mono">[{i}]</span>
              </div>
            );
          })}
        </div>

        {/* Pointer Status */}
        <div className="flex gap-8 items-center bg-card/60 border border-border rounded-xl px-8 py-3">
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">Front Ptr</span>
            <span className="text-2xl font-black text-destructive">{front}</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">Rear Ptr</span>
            <span className="text-2xl font-black text-emerald-500">{rear}</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">Capacity</span>
            <span className="text-2xl font-black text-muted-foreground">{MAX_SIZE}</span>
          </div>
        </div>

        {/* Warning about wasted space */}
        {front > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-5 py-2 text-xs text-orange-500 font-bold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            {front} slot(s) wasted after dequeue — this is the key limitation of a linear queue!
          </motion.div>
        )}
      </div>
    </div>
  );
}
