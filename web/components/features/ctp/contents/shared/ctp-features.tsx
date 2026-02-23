"use client";

import ReactMarkdown from "react-markdown";
import { ComponentType } from "react";

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature: any, idx) => (
          <div
            key={idx}
            className="flex flex-col bg-card border border-border/50 text-card-foreground rounded-xl overflow-hidden shadow-sm transition-all hover:bg-accent/5"
          >
            {/* 1. Header & Text Content */}
            <div className="p-6 flex-1 space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                {feature.title}
              </h3>
              <div className="text-muted-foreground text-sm leading-relaxed">
                <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span> }}>
                  {feature.description}
                </ReactMarkdown>
              </div>
            </div>

            {/* 2. Supplementary Visualizer (Optional) */}
            {feature.SupplementaryVisualizer && (
              <div className="w-full aspect-video bg-muted/20 border-t border-border/40 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-muted/50 to-transparent pointer-events-none" />
                <feature.SupplementaryVisualizer data={{ step: 4 }} /> {/* Default preview step */}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
