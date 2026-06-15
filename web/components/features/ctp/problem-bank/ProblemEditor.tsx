"use client";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/features/ctp/playground/code-editor";
import { useEffect, useMemo, useState } from "react";
import { BrowserJudge } from "@/components/features/ctp/playground/browser-judge/BrowserJudge";
import { JudgeResult, ProblemBankItem } from "./types";
import { JudgeResultPanel, ReputationStatus } from "./JudgeResultPanel";

interface ProblemEditorProps {
  problem: ProblemBankItem;
}

function getDefaultStarter(problem: ProblemBankItem): string {
  if (problem.starterCode) return problem.starterCode;
  return `# ${problem.id} ${problem.title}
# 입력을 받아 정답을 출력하세요.

def solve():
    pass

if __name__ == "__main__":
    solve()
`;
}

export function ProblemEditor({ problem }: ProblemEditorProps) {
  const starterCode = useMemo(() => getDefaultStarter(problem), [problem]);
  const [code, setCode] = useState<string>(starterCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [reputationStatus, setReputationStatus] = useState<ReputationStatus | null>(null);

  useEffect(() => {
    setCode(starterCode);
    setResult(null);
    setReputationStatus(null);
  }, [starterCode]);

  const handleReset = () => {
    setCode(starterCode);
    setResult(null);
    setReputationStatus(null);
  };

  const reportSolved = async () => {
    try {
      const res = await fetch("/api/ctp/solved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: problem.id, difficulty: problem.difficulty }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        applied?: boolean;
        duplicated?: boolean;
      };
      if (data.applied) {
        setReputationStatus("applied");
      } else if (data.duplicated) {
        setReputationStatus("duplicated");
      }
    } catch {
      // 채점 UI를 깨지 않도록 조용히 무시 (미로그인/네트워크 실패 포함).
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setReputationStatus(null);
    try {
      const judgeResult = await BrowserJudge.run(code, problem);
      setResult(judgeResult);
      if (judgeResult.overall === "AC") {
        void reportSolved();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">Python 3</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset} disabled={isSubmitting}>
            Reset
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "채점 중..." : "제출하기"}
          </Button>
        </div>
      </div>

      <div className="h-[420px]">
        <CodeEditor value={code} onChange={(value) => setCode(value ?? "")} />
      </div>

      <JudgeResultPanel result={result} reputationStatus={reputationStatus} />
    </div>
  );
}
