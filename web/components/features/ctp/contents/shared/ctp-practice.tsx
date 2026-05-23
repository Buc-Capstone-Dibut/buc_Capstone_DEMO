"use client";

import { Badge } from "@/components/ui/badge";
import type { CTPPracticeProblem } from "../../common/types";

interface CTPPracticeProps {
  problems: CTPPracticeProblem[];
}

export function CTPPractice({ problems }: CTPPracticeProps) {
  return (
    <section id="practice" data-toc="main" data-toc-level="1" className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">추천 문제 (Baekjoon)</h2>
      <div className="grid gap-3">
        {problems.map((prob) => {
          const link = prob.link || `https://www.acmicpc.net/problem/${prob.id}`;
          return (
            <a
              key={prob.id}
              href={link}
              target="_blank"
              rel="noreferrer"
              className="group block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold group-hover:text-primary transition-colors">
                  {prob.id}. {prob.title}
                </span>
                <Badge
                  variant="outline"
                  className="text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"
                >
                  {prob.tier}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{prob.description}</p>
            </a>
          );
        })}
      </div>
    </section>
  );
}
