"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Difficulty, ProblemType } from "./types";

export type DifficultyFilter = "all" | Difficulty;
export type TypeFilter = "all" | ProblemType;

interface ProblemBankFiltersProps {
  difficulty: DifficultyFilter;
  type: TypeFilter;
  total: number;
  visible: number;
  onDifficultyChange: (value: DifficultyFilter) => void;
  onTypeChange: (value: TypeFilter) => void;
}

export function ProblemBankFilters({
  difficulty,
  type,
  total,
  visible,
  onDifficultyChange,
  onTypeChange,
}: ProblemBankFiltersProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Filters</h3>
        <Badge variant="secondary" className="text-xs">
          {visible}/{total}
        </Badge>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Type</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={type === "all" ? "default" : "outline"} onClick={() => onTypeChange("all")}>
            All
          </Button>
          <Button size="sm" variant={type === "coding" ? "default" : "outline"} onClick={() => onTypeChange("coding")}>
            Coding
          </Button>
          <Button size="sm" variant={type === "debugging" ? "default" : "outline"} onClick={() => onTypeChange("debugging")}>
            Debugging
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Difficulty</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={difficulty === "all" ? "default" : "outline"} onClick={() => onDifficultyChange("all")}>
            All
          </Button>
          <Button size="sm" variant={difficulty === "bronze" ? "default" : "outline"} onClick={() => onDifficultyChange("bronze")}>
            🥉 Bronze
          </Button>
          <Button size="sm" variant={difficulty === "silver" ? "default" : "outline"} onClick={() => onDifficultyChange("silver")}>
            🥈 Silver
          </Button>
          <Button size="sm" variant={difficulty === "gold" ? "default" : "outline"} onClick={() => onDifficultyChange("gold")}>
            🥇 Gold
          </Button>
        </div>
      </div>
    </div>
  );
}
