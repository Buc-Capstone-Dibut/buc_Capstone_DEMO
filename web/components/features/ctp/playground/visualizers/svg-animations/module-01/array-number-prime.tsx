"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useArrayPrimeSim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Prime Number Sieve (Eratosthenes)",
    "> [AWAITING COMMAND] >> initiating parallel memory purge for non-primes."
  ]);
  const maxSteps = 5;

  const appendLog = useCallback((msg: string) => {
    setLogs(p => [`> ${msg}`, ...p]);
  }, []);

  const peek = useCallback(() => {
    setStep(p => {
      const next = p >= maxSteps ? 1 : p + 1;
      if (next === 1) appendLog("[PRIME_LOCK] P=2 secured. Purging multiples of 2 from memory matrix...");
      if (next === 2) appendLog("[PRIME_LOCK] P=3 secured. Purging multiples of 3 from memory matrix...");
      if (next === 3) appendLog("[SKIP_CYCLE] P=4 is already marked as non-prime. Bypassing...");
      if (next === 4) appendLog("[PRIME_LOCK] P=5 secured. Purging multiples of 5 from memory matrix...");
      if (next === 5) appendLog("[TERMINATE] Scan threshold reached. Remaining active nodes designated as primes.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> SYSTEM RESET: Matrix structure restored. Awaiting scan commands."]);
  }, []);

  return {
    runSimulation: () => {},
    interactive: {
      visualData: { step },
      logs,
      handlers: { peek, reset, clear: reset }
    }
  };
}

export function ArrayPrimeVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;

  // Grid from 2 to 20
  const nums = Array.from({ length: 19 }, (_, i) => i + 2);

  const getStatus = (n: number) => {
    if (step === 0) return { state: "idle", isScanning: false };

    let state = "idle";
    let isScanning = false;

    const isMultipleOf = (num: number, prime: number) => num > prime && num % prime === 0;

    if (step >= 1) { // Process 2
      if (n === 2) { state = "prime"; isScanning = step === 1; }
      else if (isMultipleOf(n, 2)) state = "crossed";
    }
    if (step >= 2 && state !== "crossed") { // Process 3
      if (n === 3) { state = "prime"; isScanning = step === 2; }
      else if (isMultipleOf(n, 3)) state = "crossed";
    }
    if (step >= 3 && state !== "crossed") { // Process 4
      if (n === 4) { isScanning = step === 3; }
    }
    if (step >= 4 && state !== "crossed") { // Process 5
      if (n === 5) { state = "prime"; isScanning = step === 4; }
      else if (isMultipleOf(n, 5)) state = "crossed";
    }

    if (step >= 5) {
      if (state !== "crossed") state = "prime";
      isScanning = false;
    }

    return { state, isScanning };
  };

  const CyberGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <div className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
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
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          {step === 0 && "Sieve of Eratosthenes: Efficiently finding primes by iteratively marking multiples."}
          {step === 1 && "Start at 2. It is prime. Cross out all multiples of 2."}
          {step === 2 && "Move to 3. Not crossed out, so it's prime. Cross out multiples."}
          {step === 3 && "Move to 4. Already crossed out. Skip."}
          {step === 4 && "Move to 5. It's prime. Cross out multiples."}
          {step === 5 && "Optimization: stop at √N. All remaining uncrossed numbers are prime."}
        </p>
      </motion.div>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 relative items-stretch z-10 max-w-full">

        {/* Code Execution Panel */}
        <div className="flex-1 min-w-[300px] bg-[#0d1117]/90 backdrop-blur-md rounded-2xl p-6 font-mono text-xs md:text-sm leading-relaxed border border-border shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold flex-1 text-center">Execution Context</span>
          </div>

          <div className="relative text-base h-full flex flex-col py-4 mt-2">
            {/* Active Highlight Background */}
            <motion.div
              className="absolute left-[-24px] right-[-24px] h-[36px] bg-emerald-500/10 border-l-[3px] border-emerald-500 pointer-events-none z-0"
              initial={{ top: 0, opacity: 0 }}
              animate={{
                top: step === 0 ? 0 : step === 3 ? 16 + 36 * 3 : step === 5 ? 16 + 36 * 6 : 16 + 36 * (step === 1 ? 4 : step === 2 ? 4 : 4),
                opacity: step === 0 ? 0 : 1,
                boxShadow: step > 0 ? "0 0 20px hsla(var(--emerald-500), 0.2) inset" : "none"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />

            <div className="relative z-10 flex flex-col gap-[12px]">
              <div className={`h-[24px] flex items-center ${step === 0 ? "text-emerald-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                 <span className="text-purple-400">let</span> isPrime = <span className="text-blue-400">Array</span>(n).<span className="text-blue-400">fill</span>(<span className="text-yellow-300">true</span>);
              </div>
              <div className={`h-[24px] flex items-center ${step >= 1 && step <= 4 ? "text-primary font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                 <span className="text-purple-400">for</span> (<span className="text-purple-400">let</span> p = 2; p * p &lt;= n; p++) {"{"}
              </div>
              <div className={`h-[24px] flex items-center pl-4 ${step === 3 ? "text-foreground font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                 <span className="text-purple-400">if</span> (isPrime[p]) {"{"}
              </div>
              <div className={`h-[24px] flex items-center pl-8 ${(step === 1 || step === 2 || step === 4) ? "text-emerald-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                 <span className="text-muted-foreground">// Purge Multiples</span>
              </div>
              <div className={`h-[24px] flex items-center pl-8 ${(step === 1 || step === 2 || step === 4) ? "text-emerald-500 font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                 <span className="text-purple-400">for</span> (<span className="text-purple-400">let</span> i = p*p; i &lt; n; i += p)
              </div>
              <div className={`h-[24px] flex items-center pl-12 ${(step === 1 || step === 2 || step === 4) ? "text-destructive font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                 isPrime[i] = <span className="text-yellow-300">false</span>;
              </div>
              <div className={`h-[24px] flex items-center pl-4 ${step >= 1 && step <= 4 ? "text-primary font-bold" : "text-muted-foreground/60 transition-opacity"}`}>
                 {"}"}
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Visualization Panel */}
        <div className="flex-[2] bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex flex-col items-center justify-start overflow-hidden min-h-[400px]">

          <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted px-4 py-1 rounded-full mb-8 z-10 border border-border shadow-inner">
            Integer Matrix: [2 ... 20]
          </div>

          {/* Grid Layout for numbers */}
          <div className="relative z-10 w-full flex flex-wrap justify-center gap-3 md:gap-4 max-w-sm lg:max-w-md">
             {nums.map((num) => {
               const { state, isScanning } = getStatus(num);

               let bgColor = "hsl(var(--card)/0.8)";
               let borderColor = "hsl(var(--border))";
               let textColor = "hsl(var(--card-foreground))";
               let shadow = "none";

               if (state === "prime") {
                 bgColor = "hsl(var(--emerald-500)/0.2)";
                 borderColor = "hsl(var(--emerald-500))";
                 textColor = "hsl(var(--emerald-500))";
                 shadow = "0 0 15px hsla(var(--emerald-500), 0.3)";
               } else if (state === "crossed") {
                 bgColor = "hsl(var(--destructive)/0.05)";
                 borderColor = "hsl(var(--destructive)/0.3)";
                 textColor = "hsl(var(--destructive)/0.4)";
               }

               if (isScanning && state !== "crossed") {
                 borderColor = "hsl(var(--primary))";
                 shadow = "0 0 20px hsla(var(--primary), 0.5)";
                 textColor = "hsl(var(--primary))";
               }

               return (
                 <motion.div
                   key={`prime-cell-${num}`}
                   animate={{
                     backgroundColor: bgColor,
                     borderColor: borderColor,
                     color: textColor,
                     boxShadow: shadow,
                     scale: isScanning ? 1.1 : state === "prime" ? 1.05 : 1,
                     opacity: state === "crossed" ? 0.6 : 1
                   }}
                   transition={{ duration: 0.3 }}
                   className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center text-lg md:text-xl font-black rounded-lg border-2 relative overflow-hidden`}
                 >
                   {/* Scanning sweep animation */}
                   {isScanning && (
                      <motion.div
                         className="absolute inset-y-0 w-1 bg-primary/40 blur-sm"
                         animate={{ left: ['-20%', '120%'] }}
                         transition={{ duration: 1, repeat: Infinity }}
                      />
                   )}

                   {/* Cross out line */}
                   <AnimatePresence>
                      {state === "crossed" && (
                         <motion.div
                           className="absolute inset-0 flex items-center justify-center pointer-events-none"
                           initial={{ opacity: 0, scale: 0 }}
                           animate={{ opacity: 1, scale: 1 }}
                           transition={{ type: "spring", bounce: 0.5 }}
                         >
                            <svg className="w-full h-full text-destructive/50" viewBox="0 0 100 100">
                               <line x1="10" y1="10" x2="90" y2="90" stroke="currentColor" strokeWidth="4" />
                               <line x1="90" y1="10" x2="10" y2="90" stroke="currentColor" strokeWidth="4" />
                            </svg>
                         </motion.div>
                      )}
                   </AnimatePresence>

                   <span className="relative z-10">{num}</span>
                 </motion.div>
               );
             })}
          </div>

          <AnimatePresence>
            {step >= 1 && step < 5 && (
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 20 }}
                 className="mt-8 px-6 py-2 bg-primary/10 border border-primary/30 rounded-lg backdrop-blur-md flex items-center gap-3 absolute bottom-8 max-w-[80%]"
               >
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary tracking-widest uppercase">
                    {step === 1 && "Active Process: Eliminating multiples of 2"}
                    {step === 2 && "Active Process: Eliminating multiples of 3"}
                    {step === 3 && "Skip Notice: 4 is composite"}
                    {step === 4 && "Active Process: Eliminating multiples of 5"}
                  </span>
               </motion.div>
            )}
            {step === 5 && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="mt-8 px-6 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg backdrop-blur-md flex items-center gap-3 absolute bottom-8 max-w-[80%]"
               >
                  <span className="text-xs font-black text-emerald-500 tracking-widest uppercase">
                    Matrix Integrity Verified. Primes Locked.
                  </span>
               </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
