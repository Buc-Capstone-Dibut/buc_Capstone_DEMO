"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useQueueOverviewSim() {
  const [queue, setQueue] = useState<number[]>([10, 20, 30]);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Queue Data Structure — FIFO Protocol",
    "> [AWAITING COMMAND] >> Interact: Enqueue adds to Rear, Dequeue removes from Front."
  ]);
  const maxSize = 6;

  const appendLog = useCallback((msg: string) => {
    setLogs(l => [`> ${msg}`, ...l]);
  }, []);

  const push = useCallback(() => {  // enqueue
    setQueue(prev => {
      if (prev.length >= maxSize) {
        appendLog("[OVERFLOW] Queue is full! Cannot enqueue.");
        return prev;
      }
      const val = Math.floor(Math.random() * 90) + 10;
      appendLog(`[ENQUEUE] ${val} added to the rear. Queue size: ${prev.length + 1}.`);
      return [...prev, val];
    });
  }, [appendLog]);

  const pop = useCallback(() => { // dequeue
    setQueue(prev => {
      if (prev.length === 0) {
        appendLog("[UNDERFLOW] Queue is empty! Cannot dequeue.");
        return prev;
      }
      const val = prev[0];
      appendLog(`[DEQUEUE] ${val} removed from the front. Queue size: ${prev.length - 1}.`);
      return prev.slice(1);
    });
  }, [appendLog]);

  const peek = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) {
        appendLog("[PEEK] Queue is empty.");
        return prev;
      }
      appendLog(`[PEEK] Front element = ${prev[0]}. Queue unchanged.`);
      return prev;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setQueue([10, 20, 30]);
    setLogs(["> SYSTEM RESET: Queue drained. Initial state restored."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { queue },
      logs,
      handlers: { push, pop, peek, reset, clear: reset }
    }
  };
}

export function QueueOverviewVisualizer({ data }: { data: { queue: number[] } }) {
  const { queue } = data;
  const maxSize = 6;

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono rounded-xl py-8 gap-8 px-4">
      <CyberGrid />

      {/* Narrative Info Header */}
      <motion.div
        className="w-full max-w-4xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          Queue operates on <span className="font-bold text-emerald-500">FIFO</span> — First In, First Out. Elements are enqueued at the rear and dequeued from the front.
        </p>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground border border-border rounded px-3 py-1 bg-muted/40">
          <span>Size: {queue.length}/{maxSize}</span>
        </div>
      </motion.div>

      <div className="w-full max-w-4xl flex flex-col gap-8 z-10 items-center">

        {/* Queue — horizontal layout */}
        <div className="flex flex-col items-center gap-4 w-full">

          {/* Direction Labels */}
          <div className="flex justify-between w-full max-w-lg px-2">
            <div className="flex flex-col items-center text-destructive">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">DEQUEUE (Front)</span>
            </div>
            <div className="flex flex-col items-center text-emerald-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">ENQUEUE (Rear)</span>
            </div>
          </div>

          {/* Queue Container */}
          <div className="relative w-full max-w-lg">
            <div className="flex gap-1 justify-center relative z-10">
              {Array.from({ length: maxSize }).map((_, i) => {
                const val = queue[i];
                const isFront = val !== undefined && i === 0;
                const isRear = val !== undefined && i === queue.length - 1;
                return (
                  <motion.div
                    key={`q-slot-${i}`}
                    className={`flex-1 h-20 rounded-lg border-2 flex flex-col items-center justify-center relative overflow-hidden
                      ${val !== undefined ? (isFront ? 'border-destructive bg-destructive/10' : isRear ? 'border-emerald-500 bg-emerald-500/10' : 'border-cyan-500/40 bg-cyan-500/5') : 'border-border/30 bg-card/20'}`}
                  >
                    {isFront && <span className="text-[8px] font-black text-destructive absolute top-1 uppercase tracking-widest">FRONT</span>}
                    {isRear && !isFront && <span className="text-[8px] font-black text-emerald-500 absolute top-1 uppercase tracking-widest">REAR</span>}

                    {val !== undefined ? (
                      <span className={`text-xl font-black ${isFront ? 'text-destructive' : isRear ? 'text-emerald-500' : 'text-foreground'}`}>{val}</span>
                    ) : (
                      <span className="text-muted-foreground/30 text-[10px] uppercase">empty</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Flow Arrow under the queue */}
            <div className="flex items-center gap-1 mt-3 px-2">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-destructive/60 to-emerald-500/60" />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg">
          <div className="bg-card/50 rounded-xl border border-border p-4 flex flex-col gap-2">
            <code className="text-emerald-500 font-bold text-sm">enqueue(val)</code>
            <span className="text-muted-foreground text-xs">Add to rear — O(1)</span>
          </div>
          <div className="bg-card/50 rounded-xl border border-border p-4 flex flex-col gap-2">
            <code className="text-destructive font-bold text-sm">dequeue()</code>
            <span className="text-muted-foreground text-xs">Remove from front — O(1)</span>
          </div>
          <div className="bg-card/50 rounded-xl border border-border p-4 flex flex-col gap-2">
            <code className="text-purple-500 font-bold text-sm">peek()</code>
            <span className="text-muted-foreground text-xs">Read front — O(1)</span>
          </div>
        </div>

        {/* Analogy */}
        <div className="bg-card/50 backdrop-blur rounded-xl p-4 border border-border flex gap-3 items-start w-full max-w-lg">
          <div className="text-2xl mt-0.5">🎫</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Analogy:</strong> Like a ticket line — the first person in line is the first to be served. Used in CPU scheduling, BFS graph traversal, and print queues.
          </p>
        </div>
      </div>
    </div>
  );
}
