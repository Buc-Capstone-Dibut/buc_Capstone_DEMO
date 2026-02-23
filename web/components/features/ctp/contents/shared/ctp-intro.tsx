"use client";

import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { BookOpen, Lightbulb, HelpCircle, ArrowDownCircle } from "lucide-react";

interface CTPIntroProps {
  category: string;
  title: string;
  description: string;
  tags?: string[];
  story?: {
    problem: string;
    definition: string;
    analogy: string;
    playgroundLimit?: string;
  };
}

export function CTPIntro({ category, title, description, tags = [], story }: CTPIntroProps) {
  return (
    <section id="intro" data-toc="main" data-toc-level="1" className="space-y-6 border-b border-border/40 pb-8">
      {/* Header Area */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-primary font-mono opacity-80">
          <span className="opacity-50">MODULE</span>
          <span className="opacity-50">/</span>
          <span className="uppercase tracking-wider">{category}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-[-0.02em]">{title}</h1>
      </div>

      {tags.length > 0 && (
        <div className="flex gap-2">
          {tags.map((tag, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Narrative Content */}
      {story ? (
        <div className="space-y-8 mt-6">
          {/* 1. Problem / Background */}
          {story.problem && (
            <div
              id="intro-problem"
              data-toc="sub"
              data-toc-level="2"
              data-toc-title="왜 필요할까?"
              className="relative pl-6 border-l-4 border-red-200 dark:border-red-900/50"
            >
              <h3 className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em] text-red-600 dark:text-red-400 mb-2">
                <HelpCircle className="w-5 h-5" />
                왜 필요할까? (Problem)
              </h3>
              <div className="text-lg text-muted-foreground leading-[1.7] prose dark:prose-invert max-w-none prose-p:my-2 prose-strong:text-red-700 dark:prose-strong:text-red-300">
                <ReactMarkdown>{story.problem}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* 2. Definition */}
          {story.definition && (
            <div
              id="intro-definition"
              data-toc="sub"
              data-toc-level="2"
              data-toc-title="핵심 정의"
              className="bg-muted/30 rounded-xl p-6 border border-border/50"
            >
              <h3 className="flex items-center gap-1.5 text-base font-bold tracking-[-0.02em] text-primary mb-2">
                <BookOpen className="w-5 h-5" />
                핵심 정의 (Definition)
              </h3>
              <div className="text-[1.15rem] font-medium leading-[1.7] tracking-[-0.01em] text-foreground/90 prose dark:prose-invert max-w-none prose-p:my-2 prose-li:my-1 prose-ul:my-3 prose-ol:my-3 prose-strong:text-primary">
                <ReactMarkdown>{story.definition}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* 3. Analogy */}
          {story.analogy && (
            <div
              id="intro-analogy"
              data-toc="sub"
              data-toc-level="2"
              data-toc-title="쉽게 이해하기"
              className="relative bg-amber-50 dark:bg-amber-950/20 rounded-xl p-6 border border-amber-100 dark:border-amber-900/30"
            >
              <div className="absolute -top-3 -left-3 bg-amber-100 dark:bg-amber-900 rounded-full p-2 border-4 border-background">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 fill-current" />
              </div>
              <h3 className="ml-6 text-lg font-bold tracking-[-0.02em] text-amber-700 dark:text-amber-400 mb-2">
                쉽게 이해하기 (Analogy)
              </h3>
              <div className="text-lg text-muted-foreground leading-[1.7] prose dark:prose-invert max-w-none prose-p:my-2 prose-strong:text-amber-800 dark:prose-strong:text-amber-300">
                <ReactMarkdown>{story.analogy}</ReactMarkdown>
              </div>
            </div>
          )}


        </div>
      ) : (
        // Fallback for modules without story
        <p className="text-lg text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </section>
  );
}
