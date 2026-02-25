"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, RotateCcw, Play, Pause } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

const LABELS: Record<string, string> = {
  push: "Push",
  pop: "Pop",
  peek: "Peek",
  reset: "Reset",
  pushFront: "Push Front",
  pushRear: "Push Rear",
  popFront: "Pop Front",
  popRear: "Pop Rear",
};

const VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  push: "default",
  pushFront: "default",
  pushRear: "default",
  pop: "secondary",
  popFront: "secondary",
  popRear: "secondary",
  peek: "outline",
  reset: "outline",
};

interface InteractiveRuntime {
  visualData: any;
  edges?: { source: string; target: string; label?: string }[];
  logs?: string[];
  handlers: Record<string, () => void>;
  selectedNodeId?: string | number | null;
  selectedSummary?: string[];
  onNodeSelect?: (nodeId: string | number) => void;
  currentStep?: number;
  maxSteps?: number;
  setStep?: (step: number) => void;
}

interface CTPInteractiveModuleProps {
  components: string[];
  runtime: InteractiveRuntime;
  Visualizer: React.ComponentType<any>;
  maxSize?: number;
  emptyMessage?: string;
}

type ParsedLog = {
  step?: string;
  title: string;
  details: string[];
};

const parseLog = (raw: string): ParsedLog => {
  const normalized = raw.replace(/^>\s*/, "").trim();
  if (!normalized) {
    return { title: "기록 없음", details: [] };
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const headline = lines[0] || normalized;
  const matched = headline.match(/^(\d+\/\d+)\s+(.+)$/);
  if (matched) {
    return {
      step: matched[1],
      title: matched[2],
      details: lines.slice(1),
    };
  }

  return {
    title: headline,
    details: lines.slice(1),
  };
};

export function CTPInteractiveModule({
  components,
  runtime,
  Visualizer,
  maxSize,
  emptyMessage = "데이터를 추가해보세요.",
}: CTPInteractiveModuleProps) {
  const logs = runtime.logs || [];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && runtime.currentStep !== undefined && runtime.maxSteps !== undefined) {
      if (runtime.currentStep >= runtime.maxSteps - 1) {
        setIsPlaying(false);
      } else {
        interval = setInterval(() => {
          if (runtime.handlers.push) {
            runtime.handlers.push();
          }
        }, 800); // 800ms per step
      }
    }
    return () => clearInterval(interval);
  }, [isPlaying, runtime.currentStep, runtime.maxSteps, runtime.handlers]);

  const getHandler = (key: string) => {
    if (runtime.handlers[key]) return runtime.handlers[key];
    if (key === "reset" && runtime.handlers.clear) return runtime.handlers.clear;
    return undefined;
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-background overflow-hidden shadow-sm transition-all duration-300",
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-0"
          : "h-[640px] border border-border rounded-xl"
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
        <div>
          <h3 className="text-sm font-bold">Interactive Playground</h3>
          <p className="text-[11px] text-muted-foreground">패널 경계를 드래그해 원하는 크기로 조절할 수 있습니다.</p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => setIsFullscreen((prev) => !prev)}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={68} minSize={40}>
          <div className="h-full bg-muted/10 relative border-r flex flex-col">
            <div className="flex-1 min-h-0 relative">
              <Visualizer
                data={runtime.visualData}
                edges={runtime.edges}
                maxSize={maxSize}
                emptyMessage={emptyMessage}
                selectedNodeId={runtime.selectedNodeId}
                onNodeSelect={runtime.onNodeSelect}
              />
            </div>
            {runtime.maxSteps !== undefined && runtime.currentStep !== undefined && runtime.setStep !== undefined && (
              <div className="h-16 border-t border-border flex items-center px-6 gap-4 bg-background shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? <Pause className="w-5 h-5 text-fuchsia-500" /> : <Play className="w-5 h-5 text-emerald-500" />}
                </Button>
                <Slider
                  value={[runtime.currentStep]}
                  max={runtime.maxSteps - 1}
                  step={1}
                  onValueChange={(val) => runtime.setStep!(val[0])}
                  className="flex-1 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground w-12 text-right font-mono">
                  {runtime.currentStep} / {runtime.maxSteps - 1}
                </span>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={32} minSize={20}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={40} minSize={28}>
              <div className="h-full bg-card p-6 flex flex-col">
                <div>
                  <h3 className="font-bold text-lg mb-2">Operation Panel</h3>
                  <p className="text-sm text-muted-foreground">버튼을 눌러 동작을 확인하세요.</p>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-5 overflow-auto pr-1">
                  {components.map((key) => {
                    const handler = getHandler(key);
                    if (!handler) return null;

                    return (
                      <Button
                        type="button"
                        key={key}
                        onClick={handler}
                        variant={VARIANTS[key] || "default"}
                        className="w-full justify-start text-base"
                        size="lg"
                      >
                        {LABELS[key] || key}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={60} minSize={26}>
              <div className="h-full bg-card p-6 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">학습 노트</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={runtime.handlers.clear || runtime.handlers.reset}
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                </div>

                {runtime.selectedSummary && runtime.selectedSummary.length > 0 && (
                  <Card className="mb-3 border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-900/10">
                    <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">선택 노드 정보</div>
                    <div className="space-y-0.5">
                      {runtime.selectedSummary.map((line, idx) => (
                        <p key={idx} className="text-sm text-blue-800/90 dark:text-blue-200/90">
                          {line}
                        </p>
                      ))}
                    </div>
                  </Card>
                )}

                <div className="flex-1 min-h-0">
                  <Card className="h-full bg-muted/30 text-foreground text-base p-3 overflow-hidden border border-border">
                    <div className="h-full pr-3 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                      {logs.length === 0 ? (
                        <span className="text-base text-muted-foreground italic">Peek 버튼을 눌러 학습 단계를 시작하세요.</span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {logs.map((log, i) => {
                            const parsed = parseLog(log);
                            return (
                              <div key={i} className="rounded-lg border border-border bg-background/90 px-3 py-2">
                                <div className="flex items-center gap-2 mb-1">
                                  {parsed.step && (
                                    <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                                      {parsed.step}
                                    </span>
                                  )}
                                  <span className="text-sm font-semibold text-foreground">{parsed.title}</span>
                                </div>
                                {parsed.details.length > 0 && (
                                  <div className="space-y-1">
                                    {parsed.details.map((line, detailIndex) => (
                                      <p key={detailIndex} className="text-sm leading-relaxed text-muted-foreground">
                                        • {line}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
