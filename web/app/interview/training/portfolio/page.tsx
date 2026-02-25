"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, GitBranch } from "lucide-react";
import { GlobalHeader } from "@/components/layout/global-header";
import { InterviewModeSwitch, type InterviewMode } from "@/components/features/interview/training/interview-mode-switch";

function isPublicGithubRepoUrl(value: string): boolean {
  return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(value);
}

export default function PortfolioTrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<InterviewMode>("chat");

  useEffect(() => {
    const initial = searchParams.get("repoUrl");
    if (initial) setRepoUrl(initial);
    const initialMode = searchParams.get("mode");
    if (initialMode === "video" || initialMode === "chat") {
      setMode(initialMode);
    }
  }, [searchParams]);

  const proceed = () => {
    const normalized = repoUrl.trim().replace(/\/+$/, "");

    if (!isPublicGithubRepoUrl(normalized)) {
      setError("공개 GitHub 레포 URL 형식만 지원합니다. 예: https://github.com/owner/repo");
      return;
    }

    setError(null);
    router.push(`/interview/training/portfolio/room?repoUrl=${encodeURIComponent(normalized)}&mode=${mode}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push("/interview/training")}>
            <ArrowLeft className="mr-2 w-4 h-4" /> 훈련 센터
          </Button>
          <Badge variant="outline" className="border-primary/20 text-primary">
            PORTFOLIO DEFENSE
          </Badge>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" /> 공개 레포 기반 디펜스 면접
            </CardTitle>
            <CardDescription>
              README/폴더 구조/인프라 단서를 바탕으로 설계 의도를 설명하는 면접을 시작합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Repository URL</label>
              <Input
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> 공개 레포만 지원합니다. private repo는 분석하지 않습니다.
              </div>
            </div>

            <InterviewModeSwitch mode={mode} onModeChange={setMode} />

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-3 text-sm">
              {[
                "아키텍처 선택 이유",
                "CI/CD 구성 의도",
                "배포 전략과 롤백",
                "모니터링/알림 체계",
                "장애 대응 프로세스",
                "AI 활용/검증 루프",
              ].map((item) => (
                <div key={item} className="rounded-lg bg-muted/40 p-3">
                  {item}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary/90 inline-flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              평가는 설계 의도 60%, 코드 품질 10%, AI 활용 30% 가중치로 진행됩니다.
            </div>

            {mode !== "chat" && (
              <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
                화상 디펜스는 LiveKit 베타 연결로 체험할 수 있습니다.
              </div>
            )}

            <Button className="w-full rounded-xl" onClick={proceed}>
              디펜스 면접 시작 <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
