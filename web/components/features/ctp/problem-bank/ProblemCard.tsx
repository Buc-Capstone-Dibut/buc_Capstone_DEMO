"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Difficulty, ProblemBankItem, ProblemType } from "./types";

const difficultyLabel: Record<Difficulty, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

const typeLabel: Record<ProblemType, string> = {
  coding: "Coding",
  debugging: "Debugging",
};

interface ProblemCardProps {
  problem: ProblemBankItem;
  selected?: boolean;
  solved?: boolean;
  onSelect: (id: string) => void;
}

export function ProblemCard({ problem, selected = false, solved = false, onSelect }: ProblemCardProps) {
  return (
    <Card
      className={cn(
        "h-full border-border/60 transition-all",
        selected && "border-primary ring-1 ring-primary/40",
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base leading-tight">
          {solved && (
            <Badge className="border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-emerald-600">
              ✓
            </Badge>
          )}
          {problem.id}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 min-h-10 text-sm font-medium text-foreground">{problem.title}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {difficultyLabel[problem.difficulty]}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {typeLabel[problem.type]}
          </Badge>
        </div>
        {problem.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {problem.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <Button className="w-full" size="sm" variant={selected ? "default" : "secondary"} onClick={() => onSelect(problem.id)}>
          {selected ? "선택됨" : "문제 풀기"}
        </Button>
      </CardContent>
    </Card>
  );
}
