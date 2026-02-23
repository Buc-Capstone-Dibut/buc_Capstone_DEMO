"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JudgeResult, Verdict } from "./types";

interface JudgeResultPanelProps {
  result: JudgeResult | null;
}

const verdictLabel: Record<Verdict, string> = {
  AC: "맞았습니다",
  WA: "틀렸습니다",
  TLE: "시간 초과",
  RTE: "런타임 에러",
  OLE: "출력 초과",
};

const verdictClass: Record<Verdict, string> = {
  AC: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  WA: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  TLE: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  RTE: "bg-red-500/10 text-red-600 border-red-500/30",
  OLE: "bg-orange-500/10 text-orange-600 border-orange-500/30",
};

export function JudgeResultPanel({ result }: JudgeResultPanelProps) {
  if (!result) {
    return (
      <div className="rounded-md border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
        아직 제출 결과가 없습니다. 코드를 작성하고 제출하세요.
      </div>
    );
  }

  const firstFailed = result.cases.find((item) => item.verdict !== "AC");

  return (
    <div className="space-y-4 rounded-md border border-border/60 bg-muted/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn("border", verdictClass[result.overall])}>{verdictLabel[result.overall]}</Badge>
        <span className="text-sm text-muted-foreground">
          {result.passed} / {result.total} passed
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {result.cases.map((item) => (
          <Badge key={`tc-${item.index}`} variant="outline" className={cn("font-mono", verdictClass[item.verdict])}>
            TC{item.index} {item.verdict}
          </Badge>
        ))}
      </div>

      {firstFailed && (
        <div className="space-y-2 rounded-md border border-border/60 bg-background p-3 text-sm">
          <p className="font-semibold">첫 실패 케이스: TC{firstFailed.index}</p>
          {firstFailed.errorMessage ? (
            <p className="text-rose-600">{firstFailed.errorMessage}</p>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Expected</p>
                <pre className="overflow-auto rounded border border-border/60 bg-muted/10 p-2 text-xs">
                  {firstFailed.expectedOutput ?? ""}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Actual</p>
                <pre className="overflow-auto rounded border border-border/60 bg-muted/10 p-2 text-xs">
                  {firstFailed.actualOutput ?? ""}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
