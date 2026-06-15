"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JudgeResult, Verdict } from "./types";

export type ReputationStatus = "applied" | "duplicated";

interface JudgeResultPanelProps {
  result: JudgeResult | null;
  reputationStatus?: ReputationStatus | null;
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

export function JudgeResultPanel({ result, reputationStatus }: JudgeResultPanelProps) {
  if (!result) {
    return (
      <div className="rounded-md border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
        아직 제출 결과가 없습니다. 코드를 작성하고 제출하세요.
      </div>
    );
  }

  const firstFailed = result.cases.find((item) => item.verdict !== "AC");
  const isAccepted = result.overall === "AC";

  return (
    <div className="space-y-4 rounded-md border border-border/60 bg-muted/10 p-4">
      {isAccepted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3"
        >
          <p className="text-base font-bold text-emerald-600">정답입니다</p>
          <p className="mt-0.5 text-sm text-emerald-700/90">
            {result.total}개 테스트 케이스를 모두 통과했습니다.
          </p>
          {reputationStatus === "applied" && (
            <p className="mt-1.5 text-xs font-medium text-emerald-700/90">
              레벨 점수에 반영되었습니다.
            </p>
          )}
          {reputationStatus === "duplicated" && (
            <p className="mt-1.5 text-xs font-medium text-emerald-700/80">
              이미 레벨 점수에 반영된 문제입니다.
            </p>
          )}
        </motion.div>
      )}

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
