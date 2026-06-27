"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Two runnable scenarios:
//   insert : 15 → bucket 7, then 23 → bucket 7 collision → chaining
//   get    : look up key 23 → hash to bucket 7 → walk the chain → hit
type Scenario = "insert" | "get";
type Phase =
  | "idle"
  | "hash"      // computing hash
  | "store"     // direct store (bucket empty)
  | "collision" // bucket occupied
  | "chain"     // append to chain
  | "probeHead" // get: inspect bucket head
  | "probeChain"// get: inspect chained node
  | "hit";      // get: found in chain

type Step = {
  step: number;     // legacy field
  scenario: Scenario;
  phase: Phase;
  activeKey: number | null; // key being hashed (for the Hash Func box)
  bucketHasHead: boolean;   // bucket 7 already stores 15
  bucketHasChain: boolean;  // chain node 23 present
  probeHead: boolean;       // highlight bucket head during get
  probeChain: boolean;      // highlight chain node during get
  narrative: string;
  msg: string;
};

const BUCKETS = [0, 1, 2, 3, 4, 5, 6, 7];
const INIT_LOG = "> 시스템 초기화: 해시 테이블 대기 중... Step을 눌러 시작하세요.";

function buildSteps(scenario: Scenario): Step[] {
  if (scenario === "insert") {
    return [
      { step: 0, scenario, phase: "idle", activeKey: null, bucketHasHead: false, bucketHasChain: false, probeHead: false, probeChain: false,
        narrative: "해시 테이블은 해시 함수로 키를 인덱스에 매핑해 O(1) 접근을 노립니다.",
        msg: "[READY] 키-값 삽입 시연 준비. (insert 시나리오)" },
      { step: 1, scenario, phase: "hash", activeKey: 15, bucketHasHead: false, bucketHasChain: false, probeHead: false, probeChain: false,
        narrative: "Key 15 삽입: hash(15) = 15 % 8 = 7.",
        msg: "[HASH] hash(15) = 15 % 8 = Sector 7." },
      { step: 2, scenario, phase: "store", activeKey: 15, bucketHasHead: true, bucketHasChain: false, probeHead: false, probeChain: false,
        narrative: "Index 7 이 비어 있으므로 값 15 를 버킷에 바로 저장합니다.",
        msg: "[STORE] Sector 7 비어 있음. 값 15 직접 저장." },
      { step: 3, scenario, phase: "hash", activeKey: 23, bucketHasHead: true, bucketHasChain: false, probeHead: false, probeChain: false,
        narrative: "Key 23 삽입: hash(23) = 23 % 8 = 7.",
        msg: "[HASH] hash(23) = 23 % 8 = Sector 7." },
      { step: 4, scenario, phase: "collision", activeKey: 23, bucketHasHead: true, bucketHasChain: false, probeHead: false, probeChain: false,
        narrative: "충돌! Index 7 에 이미 값이 존재합니다.",
        msg: "[COLLISION] Sector 7 점유됨. 직접 쓰기 중단." },
      { step: 5, scenario, phase: "chain", activeKey: 23, bucketHasHead: true, bucketHasChain: true, probeHead: false, probeChain: false,
        narrative: "체이닝: 새 값을 기존 버킷에 연결 리스트 노드로 덧붙입니다.",
        msg: "[CHAINING] Sector 7 에 연결 리스트 확장. 값 23 추가." },
    ];
  }
  // get scenario assumes the table already holds 15 (head) → 23 (chain).
  return [
    { step: 0, scenario, phase: "idle", activeKey: null, bucketHasHead: true, bucketHasChain: true, probeHead: false, probeChain: false,
      narrative: "조회(get): 버킷 7 에 15 → 23 이 체이닝되어 있는 상태입니다.",
      msg: "[READY] 키 조회 시연 준비. (get 시나리오, 버킷 7: 15 → 23)" },
    { step: 1, scenario, phase: "hash", activeKey: 23, bucketHasHead: true, bucketHasChain: true, probeHead: false, probeChain: false,
      narrative: "Key 23 조회: hash(23) = 23 % 8 = 7. 버킷 7 로 이동합니다.",
      msg: "[HASH] get(23): hash(23) = 7. 버킷 7 접근." },
    { step: 2, scenario, phase: "probeHead", activeKey: 23, bucketHasHead: true, bucketHasChain: true, probeHead: true, probeChain: false,
      narrative: "버킷 머리 노드(15)와 비교: 15 != 23. 체인을 따라 이동합니다.",
      msg: "[PROBE] 버킷 head=15 != 23. 다음 노드로." },
    { step: 3, scenario, phase: "probeChain", activeKey: 23, bucketHasHead: true, bucketHasChain: true, probeHead: false, probeChain: true,
      narrative: "체인 노드(23)와 비교: 23 == 23. 일치!",
      msg: "[PROBE] 체인 노드=23 == 23. 일치 확인." },
    { step: 4, scenario, phase: "hit", activeKey: 23, bucketHasHead: true, bucketHasChain: true, probeHead: false, probeChain: true,
      narrative: "조회 성공: 체인을 1칸 순회해 값 23 을 반환합니다.",
      msg: "[HIT] get(23) 성공. 체인 순회 1회. 값 반환." },
  ];
}

export function useHashCollisionSim() {
  const [scenario, setScenario] = useState<Scenario>("insert");
  const [steps, setSteps] = useState<Step[]>(() => buildSteps("insert"));
  const [stepIdx, setStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([INIT_LOG]);

  useEffect(() => {
    setSteps(buildSteps(scenario));
    setStepIdx(0);
    setLogs([INIT_LOG]);
  }, [scenario]);

  const handleSetStep = useCallback(
    (newStep: number) => {
      if (newStep < 0 || newStep >= steps.length) return;
      setStepIdx(newStep);
      const rebuilt = [INIT_LOG];
      for (let i = 1; i <= newStep; i++) rebuilt.unshift(`[Step ${i}] ${steps[i].msg}`);
      setLogs(rebuilt);
    },
    [steps],
  );

  const nextStep = useCallback(() => {
    setStepIdx((prev) => {
      const next = prev >= steps.length - 1 ? prev : prev + 1;
      if (next !== prev) handleSetStep(next);
      return next;
    });
  }, [steps.length, handleSetStep]);

  const reset = useCallback(() => handleSetStep(0), [handleSetStep]);

  const toggleScenario = useCallback(() => {
    setScenario((s) => (s === "insert" ? "get" : "insert"));
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: steps[stepIdx] ?? null,
      logs,
      handlers: {
        push: nextStep,      // ▶ / Step
        clear: reset,        // Reset
        pop: toggleScenario, // insert ⇄ get(조회) 전환
      },
      currentStep: stepIdx,
      maxSteps: steps.length,
      setStep: handleSetStep,
      nextStep,
      reset,
    },
  };
}

export function HashCollisionVisualizer({ data }: { data: Step | { step: number } | null }) {
  if (!data) return null;
  const hasFull = "phase" in (data as object);
  const s: Step = hasFull
    ? (data as Step)
    : {
        step: (data as { step: number }).step ?? 0,
        scenario: "insert", phase: "idle", activeKey: null,
        bucketHasHead: ((data as { step: number }).step ?? 0) >= 2,
        bucketHasChain: ((data as { step: number }).step ?? 0) >= 5,
        probeHead: false, probeChain: false, narrative: "", msg: "",
      };

  const { scenario, phase, activeKey, bucketHasHead, bucketHasChain, probeHead, probeChain, narrative } = s;
  const isCollision = phase === "collision";
  const isChainStep = phase === "chain";
  const isGet = scenario === "get";

  // Connector color: orange when a collision/chain is involved, cyan otherwise.
  const accent = phase === "collision" || phase === "chain" ? "orange-500" : isGet ? "cyan-500" : "cyan-500";

  // --- Dynamic connector geometry --------------------------------------
  // The bucket column lays out 8 buckets in a flex gap-2. Bucket 7 (active) is
  // the last one. We compute the curve relative to a 0..100 / 0..100 viewBox
  // so it scales with the panel instead of relying on magic pixel constants.
  // Hash Func box sits in the left column → start near (16, 42).
  // Bucket 7 row sits low-right in the bucket column → land near (60, 90).
  const startX = 16, startY = 42;
  const endX = 58, endY = 90;
  const c1X = startX, c1Y = (startY + endY) / 2;
  const c2X = endX - 14, c2Y = endY - 6;
  const connectorPath = `M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}`;

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center bg-background/40 relative font-mono px-4 md:px-8 gap-8 rounded-xl py-8">
      <CyberGrid />

      {/* Narrative Info Header */}
      <motion.div
        className="w-full max-w-5xl z-10 flex gap-4 items-center px-4 py-3 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-[0_0_30px_hsla(var(--primary),0.05)]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          className={`h-2 w-2 rounded-full animate-pulse ${
            phase === "hit" || phase === "store" ? "bg-emerald-500" : isCollision ? "bg-destructive" : "bg-orange-500"
          }`}
        />
        <p className="text-sm font-medium tracking-wide">{narrative}</p>
      </motion.div>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 relative items-stretch z-10">
        {/* Code Execution Panel */}
        <div className="flex-1 min-w-[300px] bg-card/90 backdrop-blur-md rounded-2xl p-6 font-mono text-xs md:text-sm leading-relaxed border border-border shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold flex-1 text-center">
              Execution Context
            </span>
          </div>

          {/* Scenario chips (Pop toggles) */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className={`rounded-lg border-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest transition-all ${!isGet ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-border bg-card text-muted-foreground/70"}`}>insert</div>
            <div className={`rounded-lg border-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest transition-all ${isGet ? "border-cyan-500 bg-cyan-500/10 text-cyan-500" : "border-border bg-card text-muted-foreground/70"}`}>get (조회)</div>
          </div>

          <div className="relative z-10 flex flex-col gap-[12px] text-base">
            {!isGet ? (
              <>
                <div className="h-[24px] flex items-center text-foreground"><span className="text-purple-400">function</span>&nbsp;<span className="text-blue-400">insert</span>(key, value) {"{"}</div>
                <div className={`h-[24px] flex items-center pl-4 ${phase === "hash" ? "text-orange-500 font-bold" : "text-muted-foreground/60"}`}><span className="text-purple-400">const</span>&nbsp;index = <span className="text-blue-400">hash</span>(key); <span className="text-muted-foreground">{"// key % 8"}</span></div>
                <div className={`h-[24px] flex items-center pl-4 ${phase === "store" || phase === "collision" ? "text-foreground font-bold" : "text-muted-foreground/60"}`}><span className="text-purple-400">if</span>&nbsp;(!table[index]) {"{"}</div>
                <div className={`h-[24px] flex items-center pl-8 ${phase === "store" ? "text-emerald-500 font-bold" : "text-muted-foreground/60"}`}>table[index] = [value];</div>
                <div className={`h-[24px] flex items-center pl-4 ${phase === "collision" ? "text-foreground font-bold" : "text-muted-foreground/60"}`}>{"}"} <span className="text-purple-400">else</span> {"{"}&nbsp;<span className="text-muted-foreground">{"// Chaining"}</span></div>
                <div className={`h-[24px] flex items-center pl-8 ${phase === "chain" ? "text-orange-500 font-bold shadow-[0_0_10px_currentColor] bg-orange-500/10 rounded px-2 w-max" : "text-muted-foreground/60"}`}>table[index].<span className="text-emerald-400">push</span>(value);</div>
                <div className="h-[24px] flex items-center pl-4 text-muted-foreground/60">{"}"}</div>
                <div className="h-[24px] flex items-center text-foreground">{"}"}</div>
              </>
            ) : (
              <>
                <div className="h-[24px] flex items-center text-foreground"><span className="text-purple-400">function</span>&nbsp;<span className="text-blue-400">get</span>(key) {"{"}</div>
                <div className={`h-[24px] flex items-center pl-4 ${phase === "hash" ? "text-cyan-500 font-bold" : "text-muted-foreground/60"}`}><span className="text-purple-400">const</span>&nbsp;index = <span className="text-blue-400">hash</span>(key);</div>
                <div className={`h-[24px] flex items-center pl-4 ${phase === "probeHead" || phase === "probeChain" ? "text-foreground font-bold" : "text-muted-foreground/60"}`}><span className="text-purple-400">for</span>&nbsp;(node <span className="text-purple-400">of</span> table[index]) {"{"}</div>
                <div className={`h-[24px] flex items-center pl-8 ${phase === "probeHead" || phase === "probeChain" ? "text-cyan-500 font-bold" : "text-muted-foreground/60"}`}><span className="text-purple-400">if</span>&nbsp;(node === key)</div>
                <div className={`h-[24px] flex items-center pl-12 ${phase === "hit" ? "text-emerald-500 font-bold shadow-[0_0_10px_currentColor] bg-emerald-500/10 rounded px-2 w-max" : "text-muted-foreground/60"}`}><span className="text-purple-400">return</span>&nbsp;node;</div>
                <div className="h-[24px] flex items-center pl-4 text-muted-foreground/60">{"}"}</div>
                <div className="h-[24px] flex items-center pl-4 text-muted-foreground/60"><span className="text-purple-400">return</span>&nbsp;-<span className="text-yellow-300">1</span>;</div>
                <div className="h-[24px] flex items-center text-foreground">{"}"}</div>
              </>
            )}
          </div>

          <div className="mt-4 px-4 py-2 bg-muted/60 text-[10px] font-black uppercase tracking-widest text-muted-foreground rounded-full border shadow-inner w-max">
            {phase === "idle" && "Waiting..."}
            {activeKey !== null && phase !== "idle" && (
              <span className={isCollision || isChainStep ? "text-orange-500" : "text-cyan-500"}>
                {isGet ? `Processing: get(${activeKey})` : `Processing: Insert(${activeKey})`}
              </span>
            )}
          </div>
        </div>

        {/* Matrix Visualization Panel */}
        <div className="flex-[2] bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex flex-col items-center justify-start overflow-hidden min-h-[400px]">
          <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted px-4 py-1 rounded-full mb-8 z-10 border border-border shadow-inner">
            Hash Matrix (Modulo 8)
          </div>

          <div className="relative z-10 flex gap-12 items-start mt-8 w-full max-w-lg justify-center">
            {/* SVG overlay: dynamic Hash Func → Bucket 7 connector.
                viewBox 0..100 x 0..100 so the curve scales with the panel. */}
            {phase !== "idle" && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <marker id="hash-arrow-cyan" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--cyan-500))" />
                  </marker>
                  <marker id="hash-arrow-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--orange-500))" />
                  </marker>
                </defs>
                <motion.path
                  key={accent}
                  d={connectorPath}
                  fill="none"
                  stroke={`hsl(var(--${accent}))`}
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  markerEnd={`url(#hash-arrow-${accent === "orange-500" ? "orange" : "cyan"})`}
                  style={{ filter: `drop-shadow(0 0 4px hsl(var(--${accent})))` }}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </svg>
            )}

            {/* Calculation Box */}
            <div className="w-32 flex flex-col items-center relative z-10">
              <div className="w-full aspect-square rounded-2xl bg-card border-2 border-dashed border-border flex flex-col items-center justify-center relative shadow-lg">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground absolute top-2">Hash Func</div>
                <AnimatePresence mode="popLayout">
                  {activeKey !== null && phase !== "idle" && (
                    <motion.div
                      key={`calc-${activeKey}-${accent}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={`text-2xl font-black drop-shadow-[0_0_10px_currentColor] ${accent === "orange-500" ? "text-orange-500" : "text-cyan-500"}`}
                    >
                      {activeKey} % 8 = 7
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Hash Table Buckets */}
            <div className="flex flex-col gap-2 relative">
              {BUCKETS.map((b) => {
                const isActiveBucket = b === 7;
                const headHighlight = isActiveBucket && (phase === "hash" || probeHead);
                const headStored = isActiveBucket && bucketHasHead;
                const collisionPing = isActiveBucket && isCollision;

                let bgColor = "hsl(var(--card)/0.8)";
                let borderColor = "hsl(var(--border))";
                let shadow = "none";

                if (collisionPing) {
                  borderColor = "hsl(var(--orange-500))";
                  shadow = "0 0 20px hsla(var(--orange-500), 0.4)";
                } else if (isActiveBucket && phase === "store") {
                  bgColor = "hsl(var(--emerald-500)/0.2)";
                  borderColor = "hsl(var(--emerald-500))";
                  shadow = "0 0 20px hsla(var(--emerald-500), 0.4)";
                } else if (headHighlight) {
                  borderColor = probeHead ? "hsl(var(--cyan-500))" : "hsl(var(--cyan-500))";
                  shadow = "0 0 15px hsla(var(--cyan-500), 0.4)";
                }

                return (
                  <div key={`bucket-${b}`} className="flex items-center gap-4 relative">
                    <div className={`w-6 text-right text-xs font-black ${isActiveBucket && phase !== "idle" ? "text-primary" : "text-muted-foreground"}`}>{b}</div>

                    <motion.div
                      className="flex items-center gap-2"
                      animate={{ x: headHighlight || collisionPing ? [0, 5, -5, 0] : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        className="w-16 h-10 rounded-lg flex items-center justify-center font-black text-lg border-2 z-10 relative overflow-hidden"
                        animate={{ backgroundColor: bgColor, borderColor, boxShadow: shadow }}
                      >
                        <AnimatePresence>
                          {collisionPing && (
                            <motion.div
                              className="absolute inset-0 bg-orange-500/30"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.4 }}
                            />
                          )}
                        </AnimatePresence>
                        {headStored && (
                          <span className={`relative z-10 ${probeHead ? "text-cyan-500" : "text-emerald-500"}`}>15</span>
                        )}
                      </motion.div>

                      {/* Linked-list chain node (collision resolution / get target). */}
                      <AnimatePresence>
                        {isActiveBucket && bucketHasChain && (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                          >
                            <motion.div
                              className="h-1 w-6 bg-orange-500"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              style={{ originX: 0 }}
                              transition={{ duration: 0.3 }}
                            />
                            <div
                              className={`w-16 h-10 rounded-lg flex items-center justify-center font-black text-lg border-2 transition-all ${
                                probeChain
                                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-500 shadow-[0_0_20px_hsla(var(--emerald-500),0.4)]"
                                  : "border-orange-500 bg-orange-500/20 text-orange-500 shadow-[0_0_20px_hsla(var(--orange-500),0.4)]"
                              }`}
                            >
                              23
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Overlay */}
          <AnimatePresence>
            {isCollision && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="absolute bottom-12 px-6 py-2 bg-destructive/10 border border-destructive/50 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-[0_0_30px_hsla(var(--destructive),0.2)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--destructive))" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                <span className="text-sm font-black text-destructive uppercase tracking-widest">Hash Collision Detected</span>
              </motion.div>
            )}
            {isChainStep && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute bottom-12 px-6 py-2 bg-orange-500/10 border border-orange-500/50 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-[0_0_30px_hsla(var(--orange-500),0.2)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--orange-500))" strokeWidth="3"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                <span className="text-sm font-black text-orange-500 uppercase tracking-widest">Resolved via Separation Chaining</span>
              </motion.div>
            )}
            {phase === "hit" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute bottom-12 px-6 py-2 bg-emerald-500/10 border border-emerald-500/50 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-[0_0_30px_hsla(var(--emerald-500),0.2)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--emerald-500))" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-sm font-black text-emerald-500 uppercase tracking-widest">Found via Chain Traversal</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
