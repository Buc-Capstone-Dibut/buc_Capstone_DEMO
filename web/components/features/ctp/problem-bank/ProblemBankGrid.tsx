"use client";

import { ProblemBankItem } from "./types";
import { ProblemCard } from "./ProblemCard";

interface ProblemBankGridProps {
  problems: ProblemBankItem[];
  selectedProblemId?: string;
  onSelectProblem: (problemId: string) => void;
}

export function ProblemBankGrid({ problems, selectedProblemId, onSelectProblem }: ProblemBankGridProps) {
  if (!problems.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
        필터 조건에 맞는 문제가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {problems.map((problem) => (
        <ProblemCard
          key={problem.id}
          problem={problem}
          selected={selectedProblemId === problem.id}
          onSelect={onSelectProblem}
        />
      ))}
    </div>
  );
}
