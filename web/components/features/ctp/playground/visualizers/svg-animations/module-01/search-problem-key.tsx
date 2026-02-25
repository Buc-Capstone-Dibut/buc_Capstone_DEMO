"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useProblemKeySim() {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "> SYSTEM INITIALIZED: Database Search Problem Definition",
    "> [AWAITING COMMAND] >> Ready to investigate the role of 'Keys' in record identification."
  ]);
  const maxSteps = 4;

  const appendLog = useCallback((msg: string) => {
    setLogs(l => [`> ${msg}`, ...l]);
  }, []);

  const peek = useCallback(() => {
    setStep(p => {
      const next = p >= maxSteps ? 1 : p + 1;
      if (next === 1) appendLog("[MEMORY_DUMP] Extracted 3 user records from primary database.");
      if (next === 2) appendLog("[QUERY_CONFIG] Establishing Search Key: 'name'. Target Value: 'Bob'.");
      if (next === 3) appendLog("[SCAN_EXECUTE] Iterating through records. Comparing Key ('name') against Target ('Bob')...");
      if (next === 4) appendLog("[MATCH_FOUND] Record #2 Key 'name' matches Target 'Bob'. Returning full record object.");
      return next;
    });
  }, [appendLog]);

  const reset = useCallback(() => {
    setStep(0);
    setLogs(["> SYSTEM RESET: Search query parameters cleared. Database connection on standby."]);
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

export function ProblemKeyVisualizer({ data }: { data: { step: number } }) {
  const { step } = data;

  const records = [
    { id: 1, name: "Alice", age: 24, role: "Admin" },
    { id: 2, name: "Bob", age: 30, role: "User" },
    { id: 3, name: "Charlie", age: 28, role: "Editor" },
  ];

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
        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">
          {step === 0 && "A 'Key' is the specific property of a record used to identify it during a search."}
          {step === 1 && "We have a database containing multiple records (objects)."}
          {step === 2 && "Configure the search: We want to find a record where the Key 'name' equals 'Bob'."}
          {step === 3 && "The search algorithm iterates over all records, strictly checking the specified Key."}
          {step === 4 && "Match Found! The entire record containing the matching key is returned."}
        </p>
      </motion.div>

      <div className="w-full max-w-5xl flex flex-col gap-8 relative items-center z-10">

        {/* Query Configuration Panel */}
        <div className="w-full bg-[#0d1117]/90 backdrop-blur-md rounded-2xl p-6 border border-border shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold flex-1 text-center">Application Search Query</span>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 relative z-10">
            {/* Search Key Input */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded">Search Key (Property)</span>
              <div className={`px-6 py-3 rounded-lg font-black text-lg border-2 transition-all duration-300 shadow-inner ${step >= 2 ? "bg-cyan-500/10 border-cyan-500 text-cyan-500 shadow-[0_0_15px_hsla(var(--cyan-500),0.3)]" : "bg-card border-border text-foreground"}`}>
                "name"
              </div>
            </div>

            <div className="text-2xl font-black text-muted-foreground/50 hidden md:block mt-8">=</div>

            <div className="text-2xl font-black text-muted-foreground/50 md:hidden rotate-90">=</div>

            {/* Target Value Input */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded">Target Value</span>
              <div className={`px-6 py-3 rounded-lg font-black text-lg border-2 transition-all duration-300 shadow-inner ${step >= 2 ? "bg-purple-500/10 border-purple-500 text-purple-500 shadow-[0_0_15px_hsla(var(--purple-500),0.3)]" : "bg-card border-border text-foreground"}`}>
                "Bob"
              </div>
            </div>

             {/* Execute Button Representation */}
             <AnimatePresence>
                 {step >= 3 && (
                    <motion.div
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 flex flex-col items-center"
                    >
                       <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_20px_hsla(var(--emerald-500),0.4)]">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                       </div>
                       <span className="text-[10px] font-black text-emerald-500 mt-2 uppercase tracking-widest">Executing</span>
                    </motion.div>
                 )}
             </AnimatePresence>
          </div>
        </div>

        {/* Database Records Container */}
        <div className="w-full bg-card/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border shadow-2xl relative flex flex-col items-center overflow-hidden">

          <div className="absolute top-6 left-6 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted px-4 py-1 rounded-full border border-border shadow-inner">
            Database Records (Memory)
          </div>

          <div className="w-full min-h-[160px] flex flex-col md:flex-row gap-6 items-center justify-center mt-12 relative z-10">
            {records.map((rec, index) => {
               const isTargetProcess = step >= 3;
               const isScanningThis = step === 3 && index <= 2; // For visual effect, let's pretend it scans all quickly, or just highlight properties
               const isMatch = rec.name === "Bob";
               const showMatch = step === 4 && isMatch;
               const showFail = step === 4 && !isMatch;

               return (
                 <motion.div
                    key={`rec-${rec.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 20,
                               scale: showMatch ? 1.05 : 1,
                               filter: showFail ? "grayscale(100%) opacity(50%)" : "none"
                            }}
                    transition={{ duration: 0.5, delay: step === 1 ? index * 0.1 : 0 }}
                    className={`flex-1 w-full max-w-[280px] rounded-xl border-2 p-4 text-xs relative transition-all duration-300
                       ${showMatch ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_hsla(var(--emerald-500),0.3)]' : 'bg-card border-border'}
                    `}
                 >
                    {/* Record Header */}
                    <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
                       <span className="text-muted-foreground font-black tracking-widest">ID: {rec.id}</span>
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest ${showMatch ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>RECORD</span>
                    </div>

                    <div className="flex flex-col gap-2">
                       {/* The KEY Property */}
                       <div className={`flex justify-between p-2 rounded relative ${isTargetProcess ? 'bg-cyan-500/10' : ''}`}>
                          {/* Key Highlight Outline */}
                          {step >= 2 && <div className="absolute inset-0 rounded border-2 border-cyan-500/50 pointer-events-none" />}
                          <span className={`font-bold ${isTargetProcess ? 'text-cyan-500' : 'text-muted-foreground'}`}>name:</span>
                          <span className={`font-mono font-bold ${isTargetProcess ? 'text-foreground' : 'text-muted-foreground'}`}>"{rec.name}"</span>
                       </div>

                       {/* Non-key properties */}
                       <div className="flex justify-between p-2">
                          <span className="text-muted-foreground/60">age:</span>
                          <span className="font-mono text-muted-foreground/60">{rec.age}</span>
                       </div>
                       <div className="flex justify-between p-2">
                          <span className="text-muted-foreground/60">role:</span>
                          <span className="font-mono text-muted-foreground/60">"{rec.role}"</span>
                       </div>
                    </div>

                    {/* Scanning / Match Indicator */}
                    <AnimatePresence>
                       {step >= 3 && !showMatch && !showFail && (
                          <motion.div
                             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                             className="absolute inset-0 border-2 border-blue-500/30 rounded-xl pointer-events-none"
                          >
                             <div className="absolute top-0 right-0 w-full h-1 bg-blue-500/50 blur-sm animate-[scanData_2s_linear_infinite]" />
                          </motion.div>
                       )}
                       {showMatch && (
                          <motion.div
                             initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                             className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background"
                          >
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--background))" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </motion.div>
                       )}
                    </AnimatePresence>

                 </motion.div>
               );
            })}
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scanData {
              0% { top: 0; opacity: 1; }
              50% { top: 100%; opacity: 0.5; }
              100% { top: 0; opacity: 1; }
            }
          `}} />

        </div>
      </div>
    </div>
  );
}
