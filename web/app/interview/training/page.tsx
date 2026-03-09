"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  GitBranch,
  Loader2,
  Sparkles,
  Target,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { GlobalHeader } from "@/components/layout/global-header";
import { RubricHelpGuide } from "@/components/features/interview/training/rubric-help-guide";

const RUBRIC_HELP = [
  {
    label: "설계 의도 설명",
    weight: 60,
    hint: "왜 이런 구조를 선택했는지, 대안과 트레이드오프를 설명하는 질문이 중심입니다.",
    sampleQuestion: "이 구조를 선택한 이유와 버린 대안 2개를 비교해서 설명해 주세요.",
  },
  {
    label: "코드 품질",
    weight: 10,
    hint: "유지보수성, 테스트, 장애 대응 가능성을 근거로 묻습니다.",
    sampleQuestion: "이 코드베이스에서 기술부채를 줄이기 위해 가장 먼저 손댈 지점은 어디인가요?",
  },
  {
    label: "AI 활용",
    weight: 30,
    hint: "AI를 어떻게 썼는지보다 검증/롤백 루프를 갖췄는지에 집중합니다.",
    sampleQuestion: "AI로 만든 결과를 운영에 반영하기 전에 어떤 검증 단계를 거치나요?",
  },
];

interface SessionSummary {
  id: string;
  sessionType: string;
  mode: string;
  status: string;
  repoUrl?: string;
  createdAt: number;
  analysis: {
    improvements?: string[];
    totalWeightedScore?: number;
  } | null;
}

function formatDate(ts: number): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export default function InterviewTrainingPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<5 | 7 | 10>(7);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/interview/sessions?session_type=portfolio_defense&limit=4");
        const data = await res.json();
        if (data.success) {
          setSessions(data.data || []);
        }
      } catch {
        // sessions stay empty — no crash
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchSessions();
  }, []);

  const startPortfolio = () => {
    const url = repoUrl.trim();
    if (!url) return;

    if (!url.startsWith("https://github.com/")) {
      alert("공개 GitHub 레포 URL만 입력할 수 있습니다.");
      return;
    }

    router.push(
      `/interview/training/portfolio?repoUrl=${encodeURIComponent(url)}&mode=video&duration=${durationMinutes}`,
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
        <section className="space-y-4">
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-3 py-1">
            PORTFOLIO DEFENSE TRAINING CENTER
          </Badge>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight">포트폴리오 디펜스 훈련 센터</h1>
              <p className="text-muted-foreground text-lg">
                공개 레포를 기반으로 화상 면접을 진행하고, 설계 의도 설명 역량을 강화합니다.
              </p>
            </div>
            <Button
              size="lg"
              className="h-12 px-6 rounded-xl shadow-lg shadow-primary/20"
              onClick={() => router.push("/interview/posting/setup")}
            >
              새로운 모의면접 시작
            </Button>
          </div>
        </section>

        <Card className="border-dashed border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">훈련 안내</CardTitle>
            <CardDescription>
              AI 시대 면접의 핵심은 구현량이 아니라 설계 의도를 설명하는 능력입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-xl border bg-primary/5 border-primary/15 px-4 py-3 text-sm text-primary/90">
                당신이 왜 이 구조를 택했는지 말할 수 있어야 합격에 가까워집니다. 훈련센터는 화상 면접 단일 모드로 운영됩니다.
              </div>
              <div className="flex items-center gap-2">
                {[5, 7, 10].map((minute) => (
                  <Button
                    key={minute}
                    type="button"
                    variant={durationMinutes === minute ? "default" : "outline"}
                    size="sm"
                    className="rounded-full h-8 px-3 text-xs"
                    onClick={() => setDurationMinutes(minute as 5 | 7 | 10)}
                  >
                    {minute}분
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <GitBranch className="w-5 h-5 text-primary" /> 포트폴리오 디펜스 시작
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                  Public Repo Only
                </Badge>
              </div>
              <CardDescription>
                공개 Git 레포를 분석해 아키텍처, 인프라, AI 활용 의사결정을 질문합니다.
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

          <Card className="border-2 shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="w-5 h-5 text-primary" /> 최근 디펜스 세션
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                  History
                </Badge>
              </div>
              <CardDescription>
                최근 포트폴리오 디펜스 결과를 빠르게 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  아직 포트폴리오 디펜스 세션이 없습니다.
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-xl border bg-card/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold truncate max-w-[70%]">
                        {session.repoUrl || "Repo 정보 없음"}
                      </div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(session.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" />
                        화상
                      </span>
                      <span>{session.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {session.analysis?.improvements?.[0] ?? "리포트를 열어 세부 분석을 확인하세요."}
                    </p>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-primary/20 text-primary"
                        onClick={() => router.push(`/interview/training/portfolio/report?id=${session.id}`)}
                      >
                        리포트 보기 <ChevronRight className="ml-1 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/15 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> 코칭 포인트
              </CardTitle>
              <CardDescription>포트폴리오 디펜스에서 자주 나오는 핵심 평가 신호입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>1. 설계 의사결정은 대안 비교 + 트레이드오프로 설명하세요.</p>
              <p>2. 인프라 선택 이유를 비용·운영성·장애대응 관점으로 답하세요.</p>
              <p>3. AI 사용은 결과만 아니라 검증/롤백 루프까지 제시하세요.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> 60/10/30 질문 가이드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <RubricHelpGuide items={RUBRIC_HELP} compact />
              <div className="pt-1 text-xs text-muted-foreground">
                점수 그래프 대신, 실제 질문 출제 방향을 먼저 이해할 수 있게 구성했습니다.
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
