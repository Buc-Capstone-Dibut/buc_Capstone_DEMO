"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Difficulty, ProblemBankItem, ProblemType } from "./types";

const difficultyLabel: Record<Difficulty, string> = {
  bronze: "🥉 Bronze",
  silver: "🥈 Silver",
  gold: "🥇 Gold",
};

const typeLabel: Record<ProblemType, string> = {
  coding: "Coding",
  debugging: "Debugging",
};

interface ProblemCardProps {
  problem: ProblemBankItem;
  selected?: boolean;
  onSelect: (id: string) => void;
}

export function ProblemCard({ problem, selected = false, onSelect }: ProblemCardProps) {
  return (
    <Card
      className={cn(
        "h-full border-border/60 transition-all",
        selected && "border-primary ring-1 ring-primary/40",
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base leading-tight">{problem.id}</CardTitle>
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
        <Button className="w-full" size="sm" variant={selected ? "default" : "secondary"} onClick={() => onSelect(problem.id)}>
          {selected ? "선택됨" : "문제 풀기"}
        </Button>
      </CardContent>
    </Card>
  );
}
