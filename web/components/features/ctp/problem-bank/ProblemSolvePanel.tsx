"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProblemBankItem } from "./types";
import { ProblemStatement } from "./ProblemStatement";
import { ProblemEditor } from "./ProblemEditor";

interface ProblemSolvePanelProps {
  problem: ProblemBankItem;
  onBack: () => void;
}

export function ProblemSolvePanel({ problem, onBack }: ProblemSolvePanelProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            ← 문제 목록
          </Button>
          <Badge variant="secondary">{problem.id}</Badge>
          <Badge variant="outline">{problem.difficulty}</Badge>
          <Badge variant="outline">{problem.type}</Badge>
        </div>
        <h2 className="text-base font-semibold">{problem.title}</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="max-h-[740px] overflow-auto rounded-xl border border-border/60 bg-background p-4">
          <ProblemStatement problem={problem} />
        </div>
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <ProblemEditor problem={problem} />
        </div>
      </div>
    </section>
  );
}
