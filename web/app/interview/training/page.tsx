"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  GitBranch,
  PlayCircle,
  Sparkles,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { GlobalHeader } from "@/components/layout/global-header";
import { MOCK_INTERVIEW_LIST } from "@/mocks/interview-data";
import { EvaluationRings } from "@/components/features/interview/training/evaluation-rings";
import { InterviewModeSwitch, type InterviewMode } from "@/components/features/interview/training/interview-mode-switch";

const WEIGHTS = [
  { label: "설계 의도 설명", score: 60 },
  { label: "코드 품질", score: 10 },
  { label: "AI 활용", score: 30 },
];

export default function InterviewTrainingPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [mode, setMode] = useState<InterviewMode>("chat");

  const recentSessions = useMemo(() => MOCK_INTERVIEW_LIST.slice(0, 4), []);

  const startPortfolio = () => {
    const url = repoUrl.trim();
    if (!url) return;

    if (!url.startsWith("https://github.com/")) {
      alert("공개 GitHub 레포 URL만 입력할 수 있습니다.");
      return;
    }

    router.push(`/interview/training/portfolio?repoUrl=${encodeURIComponent(url)}&mode=${mode}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
        <section className="space-y-4">
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-3 py-1">
            REPLAY TRAINING CENTER
          </Badge>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight">리포트 재체험 면접 센터</h1>
              <p className="text-muted-foreground text-lg">
                보고 끝나는 리포트가 아니라, 면접 순간으로 돌아가 다시 답하는 실전 훈련 공간입니다.
              </p>
            </div>
            <Button
              size="lg"
              className="h-12 px-6 rounded-xl shadow-lg shadow-primary/20"
              onClick={() => router.push("/interview/setup")}
            >
              새로운 모의면접 시작
            </Button>
          </div>
        </section>

        <Card className="border-dashed border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">재체험 모드</CardTitle>
            <CardDescription>
              채팅은 즉시 사용 가능하며, 화상은 LiveKit 연결로 베타 체험할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InterviewModeSwitch mode={mode} onModeChange={setMode} />
          </CardContent>
        </Card>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <PlayCircle className="w-5 h-5 text-primary" /> 리포트 순간 재체험
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                  Replay
                </Badge>
              </div>
              <CardDescription>
                각 세션에서 중요 질문을 다시 체험하고 답변을 개선하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="rounded-xl border bg-card/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{session.company} · {session.role}</div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {session.date}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {session.analysis.feedback.improvements[0]}
                  </p>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg border-primary/20 text-primary"
                      onClick={() => router.push(`/interview/training/replay/${session.id}?mode=${mode}`)}
                    >
                      이 순간 다시 체험하기 <ChevronRight className="ml-1 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <GitBranch className="w-5 h-5 text-primary" /> 포트폴리오 디펜스 면접
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                  Public Repo Only
                </Badge>
              </div>
              <CardDescription>
                공개 Git 레포를 기반으로 설계 의도, 인프라 선택, AI 활용을 설명하는 면접을 진행합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">GitHub Repository URL</label>
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/{owner}/{repo}"
                />
                <p className="text-xs text-muted-foreground">
                  공개 레포만 지원합니다. 비공개 레포는 분석할 수 없습니다.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  "아키텍처",
                  "CI/CD",
                  "배포 전략",
                  "모니터링",
                  "장애 대응",
                  "AI 활용 방식",
                ].map((topic) => (
                  <div key={topic} className="rounded-md bg-muted/50 px-2 py-1.5 text-muted-foreground">
                    #{topic}
                  </div>
                ))}
              </div>

              <Button className="w-full rounded-xl" onClick={startPortfolio} disabled={!repoUrl.trim()}>
                분석 후 디펜스 면접 시작 <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/15 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> 코칭 포인트
              </CardTitle>
              <CardDescription>리포트에서 가장 자주 나온 개선 신호를 요약합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>1. 설계 의사결정에서 대안 비교 기준을 먼저 제시하세요.</p>
              <p>2. 인프라 선택 이유를 비용·운영성·장애대응 관점으로 설명하세요.</p>
              <p>3. AI 사용은 결과뿐 아니라 검증 루프를 함께 말하세요.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> 평가 가중치
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <EvaluationRings items={WEIGHTS} />
              <div className="pt-2 text-xs text-muted-foreground">
                화상 리플레이는 LiveKit 베타 연결을 제공합니다.
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
