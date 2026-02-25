"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProblemBankFilters, DifficultyFilter, TypeFilter } from "./ProblemBankFilters";
import { ProblemBankGrid } from "./ProblemBankGrid";
import { ProblemSolvePanel } from "./ProblemSolvePanel";
import { ProblemBankItem } from "./types";

interface ProblemBankControllerProps {
  moduleLabel: string;
  chapterTitle: string;
  chapterDescription: string;
  problems: ProblemBankItem[];
}

export function ProblemBankController({
  moduleLabel,
  chapterTitle,
  chapterDescription,
  problems,
}: ProblemBankControllerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [selectedProblemId, setSelectedProblemId] = useState<string | undefined>(problems[0]?.id);
  const [isSolving, setIsSolving] = useState(false);
  const view = searchParams.get("view");

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      const matchesDifficulty = difficulty === "all" || problem.difficulty === difficulty;
      const matchesType = type === "all" || problem.type === type;
      return matchesDifficulty && matchesType;
    });
  }, [difficulty, problems, type]);

  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === selectedProblemId),
    [problems, selectedProblemId],
  );

  useEffect(() => {
    if (!selectedProblemId && filteredProblems.length > 0) {
      setSelectedProblemId(filteredProblems[0].id);
      return;
    }
    if (selectedProblemId && !problems.some((problem) => problem.id === selectedProblemId)) {
      setSelectedProblemId(filteredProblems[0]?.id);
    }
  }, [filteredProblems, problems, selectedProblemId]);

  useEffect(() => {
    if (!view) {
      setIsSolving(false);
      return;
    }
    const matched = problems.find((problem) => problem.id === view);
    if (!matched) {
      setIsSolving(false);
      return;
    }
    setSelectedProblemId(matched.id);
    setIsSolving(true);
  }, [problems, view]);

  const handleSelectProblem = (problemId: string) => {
    setSelectedProblemId(problemId);
    setIsSolving(true);
    router.replace(`${pathname}?view=${problemId}`, { scroll: false });
  };

  if (isSolving && selectedProblem) {
    return (
      <ProblemSolvePanel
        problem={selectedProblem}
        onBack={() => {
          setIsSolving(false);
          router.replace(pathname, { scroll: false });
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{moduleLabel}</p>
        <h1 className="text-2xl font-bold tracking-tight">{chapterTitle}</h1>
        <p className="text-sm text-muted-foreground">{chapterDescription}</p>
      </section>

      <ProblemBankFilters
        difficulty={difficulty}
        type={type}
        total={problems.length}
        visible={filteredProblems.length}
        onDifficultyChange={setDifficulty}
        onTypeChange={setType}
      />

      <ProblemBankGrid
        problems={filteredProblems}
        selectedProblemId={selectedProblemId}
        onSelectProblem={handleSelectProblem}
      />
    </div>
  );
}
