"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ProblemBankItem } from "./types";

interface ProblemStatementProps {
  problem: ProblemBankItem;
}

export function ProblemStatement({ problem }: ProblemStatementProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">문제</h3>
        <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.description}</ReactMarkdown>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">입력</h4>
        <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm whitespace-pre-wrap">{problem.inputFormat}</div>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">출력</h4>
        <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm whitespace-pre-wrap">{problem.outputFormat}</div>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">제한</h4>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {problem.constraints.map((constraint, idx) => (
            <li key={`${problem.id}-constraint-${idx}`}>{constraint}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">예제</h4>
        <div className="space-y-3">
          {problem.sampleIO.map((sample, idx) => (
            <div key={`${problem.id}-sample-${idx}`} className="rounded-md border border-border/60 bg-muted/10 p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">예제 {idx + 1}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">입력</p>
                  <pre className="overflow-auto rounded border border-border/60 bg-background p-2 text-xs">{sample.input}</pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">출력</p>
                  <pre className="overflow-auto rounded border border-border/60 bg-background p-2 text-xs">{sample.output}</pre>
                </div>
              </div>
              {sample.explanation && (
                <p className="mt-2 text-xs text-muted-foreground">{sample.explanation}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
