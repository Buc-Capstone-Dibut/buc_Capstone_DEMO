"use client";

import ReactMarkdown from "react-markdown";
import { ComponentType } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";

interface FeatureItem {
  title: string;
  description: string;
  Visualizer?: ComponentType<any>;
}

interface CTPFeaturesProps {
  features: FeatureItem[];
}

export function CTPFeatures({ features }: CTPFeaturesProps) {
  return (
    <section id="features" data-toc="main" data-toc-level="1" className="mt-12 space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">주요 학습 포인트</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {features.map((feature: any, idx) => (
          <div
            key={idx}
            className="flex flex-col bg-card border border-border/50 text-card-foreground rounded-xl overflow-hidden shadow-sm transition-all hover:bg-accent/5"
          >
            {/* 1. Header & Text Content */}
            <div className="p-6 flex-1 space-y-4">
              <h3 className="font-semibold text-xl flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                  {idx + 1}
                </span>
                {feature.title}
              </h3>
              <div className="text-muted-foreground text-[15px] leading-relaxed">
                <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span> }}>
                  {feature.description}
                </ReactMarkdown>
              </div>
            </div>

            {/* 2. Supplementary Visualizer (Optional) */}
            {feature.SupplementaryVisualizer && (
              <div className="w-full relative p-6 bg-muted/10 border-t">
                {/* SVG preview는 DialogTrigger 밖에 렌더 — framer-motion ref와 Radix ref 충돌 방지 */}
                <div className="w-full h-auto">
                  <feature.SupplementaryVisualizer />
                </div>

                {/* 확대 버튼만 Dialog trigger로 — 복잡한 DOM 없음 */}
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="absolute top-4 right-4 z-10 p-2 bg-background/80 hover:bg-background rounded-md border shadow-sm flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50">
                      <Maximize2 className="w-3.5 h-3.5" />
                      자세히 보기
                    </button>
                  </DialogTrigger>

                  <DialogContent className="max-w-[80vw] md:max-w-[70vw] w-full p-4 md:p-10 bg-card rounded-xl border shadow-2xl">
                    <div className="w-full h-auto relative flex items-center justify-center mt-6">
                      <feature.SupplementaryVisualizer />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
