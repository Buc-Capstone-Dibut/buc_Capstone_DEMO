"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CTPModule } from "./types";
import { useCTPStore } from "../store/use-ctp-store";
import { CTPIntro } from "../contents/shared/ctp-intro";
import { CTPFeatures } from "../contents/shared/ctp-features";
import { CTPComplexity } from "../contents/shared/ctp-complexity";
import { CTPPractice } from "../contents/shared/ctp-practice";
import { CTPImplementation } from "../contents/shared/ctp-implementation";
import { CTPPlayground } from "../playground/ctp-playground";
import { CTPSortingPlayground } from "../playground/ctp-sorting-playground";
import { CTPMergeSortPlayground } from "../playground/ctp-merge-sort-playground";
import { CTPHeapSortPlayground } from "../playground/ctp-heap-sort-playground";
import { CTPGuidePanel } from "../contents/shared/ctp-guide-panel";
import { CTPInteractiveModule } from "../playground/ctp-interactive-module";
import { CTPInteractivePlayground } from "../playground/ctp-interactive-playground";
import ReactMarkdown from "react-markdown";
import { applyContentExpansion } from "../contents/shared/ctp-content-expansion";

interface CTPModuleLoaderProps {
  module: CTPModule;
  category?: string;
  activeKey: string;
}

export function CTPModuleLoader({ module, category, activeKey }: CTPModuleLoaderProps) {
  const { config, useSim, Visualizer } = module;
  const mergedConfig = useMemo(() => applyContentExpansion(config, activeKey), [config, activeKey]);
  const sim = useSim();
  const { runSimulation, interactive } = sim;
  const { reset, steps, currentStepIndex, setCode } = useCTPStore();

  // Reset & Init Simulation when Module Changes
  useEffect(() => {
    reset();
    if (mergedConfig.initialCode) {
      const code = mergedConfig.initialCode.python || "";
      setCode(code);
      // Auto-run disabled as per user request
    }

    // Cleanup: Reset store when module unmounts/switches to prevent stale data in next module
    return () => {
      reset();
    };
  }, [activeKey, mergedConfig, reset, setCode]);

  const currentPayload = steps[currentStepIndex]?.data || [];
  const currentEvents = useMemo(() => {
    if (currentStepIndex < 0 || steps.length === 0) return [];
    return steps
      .slice(0, currentStepIndex + 1)
      .flatMap((step) => step.events ?? []);
  }, [steps, currentStepIndex]);
  const currentData =
    currentPayload && typeof currentPayload === "object" && "nodes" in currentPayload
      ? (currentPayload as any).nodes
      : currentPayload;
  const currentEdges =
    currentPayload && typeof currentPayload === "object" && "edges" in currentPayload
      ? (currentPayload as any).edges
      : undefined;
  const currentRoot =
    currentPayload && typeof currentPayload === "object" && "rootId" in currentPayload
      ? (currentPayload as any).rootId
      : undefined;
  const currentOrientation =
    currentPayload && typeof currentPayload === "object" && "orientation" in currentPayload
      ? (currentPayload as any).orientation
      : undefined;
  const isMergeSortModule = activeKey === "merge-sort";
  const isHeapSortModule = activeKey === "heap-sort";
  const isSortingModule = [
    "bubble-sort",
    "selection-sort",
    "insertion-sort",
    "quick-sort",
  ].includes(activeKey);

  return (
    <div className="space-y-12 pb-20">
      {/* 1. Overview */}
      <CTPIntro
        category={category || ""}
        title={mergedConfig.title || "Untitled"}
        description={mergedConfig.description || ""}
        tags={mergedConfig.tags || []}
        story={mergedConfig.story}
      />

      {/* 2. Features */}
      {mergedConfig.features && <CTPFeatures features={mergedConfig.features} />}

      {/* 3. Visualizer */}
      <section id="visualization" data-toc="main" data-toc-level="1" className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">시각화 학습하기</h2>

        {/* [NEW] Playground Limit (Story Connection) */}
        {mergedConfig.story?.playgroundLimit && (
          <div className="flex items-start gap-3 py-2 text-muted-foreground">
            <ArrowDownCircle className="w-5 h-5 mt-1 animate-bounce text-primary" />
            <p className="font-medium text-primary">
              {mergedConfig.story.playgroundLimit}
            </p>
          </div>
        )}
        {mergedConfig.story?.playgroundDescription ? (
          <div className="bg-muted/30 border-l-4 border-primary/50 p-4 mb-6 rounded-r-lg">
            <div className="text-muted-foreground leading-relaxed prose dark:prose-invert max-w-none prose-p:my-1 prose-li:my-0 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown>{mergedConfig.story.playgroundDescription}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground mb-4">
            아래 에디터에서 코드를 작성하고 실행하여 자료구조의 동작 원리를 확인해보세요!
          </p>
        )}

        {/* [NEW] Interactive Guide Layout */}
        <div className="flex flex-col gap-6">
          {mergedConfig.mode === 'interactive' && mergedConfig.interactive ? (
            <div className="w-full">
              {interactive ? (
                <CTPInteractiveModule
                  components={mergedConfig.interactive.components}
                  runtime={interactive}
                  Visualizer={Visualizer}
                  maxSize={mergedConfig.interactive.maxSize}
                  emptyMessage="데이터를 추가해보세요!"
                />
              ) : mergedConfig.interactive.components.every((c) => c === "push" || c === "pop" || c === "peek") ? (
                <CTPInteractivePlayground config={mergedConfig.interactive} />
              ) : (
                <div className="p-6 border rounded-lg bg-muted/20 text-sm text-muted-foreground">
                  이 모듈은 아직 인터랙티브 시뮬레이션이 준비되지 않았습니다.
                </div>
              )}
            </div>
          ) : (
            /* Standard Mode: Visualizer + Code Editor */
            <>
              <div className="w-full">
                {isMergeSortModule ? (
                  <CTPMergeSortPlayground
                    initialCode={mergedConfig.initialCode?.python ?? ""}
                    onRun={runSimulation}
                    visualizer={
                      <Visualizer
                        data={currentData}
                        edges={currentEdges}
                        rootId={currentRoot}
                        orientation={currentOrientation}
                        events={currentEvents}
                        emptyMessage="코드를 실행하여 시각화를 시작해보세요!"
                      />
                    }
                  />
                ) : isHeapSortModule ? (
                  <CTPHeapSortPlayground
                    initialCode={mergedConfig.initialCode?.python ?? ""}
                    onRun={runSimulation}
                    visualizer={
                      <Visualizer
                        data={currentData}
                        edges={currentEdges}
                        rootId={currentRoot}
                        orientation={currentOrientation}
                        events={currentEvents}
                        emptyMessage="코드를 실행하여 시각화를 시작해보세요!"
                      />
                    }
                  />
                ) : isSortingModule ? (
                  <CTPSortingPlayground
                    initialCode={mergedConfig.initialCode?.python ?? ""}
                    onRun={runSimulation}
                    visualizer={
                      <Visualizer
                        data={currentData}
                        edges={currentEdges}
                        rootId={currentRoot}
                        orientation={currentOrientation}
                        events={currentEvents}
                        emptyMessage="코드를 실행하여 시각화를 시작해보세요!"
                      />
                    }
                  />
                ) : (
                  <CTPPlayground
                    initialCode={mergedConfig.initialCode?.python ?? ""}
                    onRun={runSimulation}
                    showStatePanel={mergedConfig.showStatePanel ?? false}
                    statePanelMode={mergedConfig.statePanelMode ?? "summary"}
                    visualizer={
                      <Visualizer
                        data={currentData}
                        edges={currentEdges}
                        rootId={currentRoot}
                        orientation={currentOrientation}
                        events={currentEvents}
                        emptyMessage="코드를 실행하여 시각화를 시작해보세요!"
                      />
                    }
                  />
                )}
              </div>

              {/* Guide Panel (Bottom Toggle) */}
              {mergedConfig.guide && (
                <div
                  id="guide"
                  data-toc="sub"
                  data-toc-level="2"
                  data-toc-title="실습 가이드"
                  className="w-full"
                >
                  <GuideToggleSection guide={mergedConfig.guide} />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 4. Complexity */}
      {mergedConfig.complexity && <CTPComplexity data={mergedConfig.complexity} names={mergedConfig.complexityNames} />}

      {/* 5. Implementation Code */}
      {mergedConfig.implementation && <CTPImplementation examples={mergedConfig.implementation} />}

      {/* 6. Practice Problems */}
      {mergedConfig.practiceProblems && <CTPPractice problems={mergedConfig.practiceProblems} />}
    </div>
  );
}

function GuideToggleSection({ guide }: { guide: import("./types").GuideSection[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/40 rounded-none from-muted/10 to-transparent bg-gradient-to-r"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left flex flex-col">
            <span className="font-bold text-sm text-foreground/90">Playground Guide & Patterns</span>
            <span className="text-xs text-muted-foreground font-normal">
              {isOpen ? "가이드 접기" : "자주 쓰는 코드 패턴과 설명 보기"}
            </span>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t"
          >
            <div className="p-1 bg-muted/5">
              <CTPGuidePanel guide={guide} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
