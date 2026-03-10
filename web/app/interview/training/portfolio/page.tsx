"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, GitBranch, Loader2, Lock } from "lucide-react";
import { GlobalHeader } from "@/components/layout/global-header";

type AnalysisResult = {
  visibility: string;
  readmeSummary: string;
  treeSummary: string;
  infraHypotheses: string[];
  detectedTopics: string[];
};

function isPublicGithubRepoUrl(value: string): boolean {
  return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(value);
}

const TOPIC_LABEL: Record<string, string> = {
  cicd: "CI/CD",
  deployment: "배포 전략",
  monitoring: "모니터링",
  "incident-response": "장애 대응",
  "ai-usage": "AI 활용",
  testing: "테스트",
  containerization: "컨테이너",
  serverless: "서버리스",
  database: "데이터베이스",
  caching: "캐싱",
};

const clampDurationMinute = (raw: string | null): 5 | 10 | 15 => {
  const value = Number(raw);
  if (value === 5 || value === 10 || value === 15) return value;
  return 10;
};

const resolveInterviewMode = (_raw: string | null): "video" => "video";

export default function PortfolioTrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzeStep, setAnalyzeStep] = useState(0);

  const ANALYZE_STEPS = [
    "",
    "README 분석 중...",
    "파일 구조 분석 중...",
    "AI 토픽 감지 중...",
  ];
  const mode = resolveInterviewMode(searchParams.get("mode"));
  const durationMinutes = clampDurationMinute(searchParams.get("duration"));

  useEffect(() => {
    const initial = searchParams.get("repoUrl");
    if (initial) setRepoUrl(initial);
  }, [searchParams]);

  useEffect(() => {
    if (!isAnalyzing) { setAnalyzeStep(0); return; }
    setAnalyzeStep(1);
    const t1 = setTimeout(() => setAnalyzeStep(2), 4000);
    const t2 = setTimeout(() => setAnalyzeStep(3), 9000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isAnalyzing]);

  const analyze = async () => {
    const normalized = repoUrl.trim().replace(/\/+$/, "");

    if (!isPublicGithubRepoUrl(normalized)) {
      setError("공개 GitHub 레포 URL 형식만 지원합니다. 예: https://github.com/owner/repo");
      return;
    }

    setError(null);
    setAnalysis(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/interview/portfolio/analyze-public-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: normalized }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.error === "PUBLIC_REPO_ONLY") {
          setError("비공개 레포 또는 접근 불가한 레포입니다. 공개 레포 URL을 사용해주세요. GitHub 레포 Settings → General에서 공개(Public)로 변경 후 다시 시도하세요.");
        } else if (data.error === "GITHUB_RATE_LIMIT") {
          setError("GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 서버에 GITHUB_TOKEN을 설정해주세요.");
        } else if (data.error === "GITHUB_AUTH_ERROR") {
          setError("서버의 GitHub 토큰 인증에 실패했습니다. GITHUB_TOKEN 값을 다시 확인해주세요.");
        } else if (data.error === "GITHUB_FORBIDDEN") {
          setError("GitHub API 접근이 거부되었습니다. 토큰 권한(Repository metadata read)을 확인해주세요.");
        } else if (data.error === "GITHUB_API_ERROR") {
          setError("GitHub API 호출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } else {
          setError(data.error || "네트워크 오류 또는 GitHub API 요청 제한일 수 있습니다. 잠시 후 다시 시도해주세요.");
        }
        return;
      }

      setAnalysis(data.data);
    } catch (err: any) {
      setError(err.message || "네트워크 오류 또는 GitHub API 요청 제한일 수 있습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startDefense = async () => {
    if (!analysis) return;
    const normalized = repoUrl.trim().replace(/\/+$/, "");

    try {
      const res = await fetch("/api/interview/portfolio/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: normalized,
          mode,
          targetDurationSec: durationMinutes * 60,
          closingThresholdSec: 60,
          focus: ["architecture", "infra", "ai-usage"],
          readmeSummary: analysis.readmeSummary,
          treeSummary: analysis.treeSummary,
          infraHypotheses: analysis.infraHypotheses,
          detectedTopics: analysis.detectedTopics,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "세션 시작 실패");
        return;
      }

      const sessionId = data.data.sessionId;
      const params = new URLSearchParams({
        repoUrl: normalized,
        sessionId,
        mode,
        duration: String(durationMinutes),
        readmeSummary: analysis.readmeSummary,
        treeSummary: analysis.treeSummary,
        detectedTopics: analysis.detectedTopics.join(","),
      });

      router.push(`/interview/training/portfolio/room?${params.toString()}`);
    } catch (err: any) {
      setError(err.message || "세션 시작 실패");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      <main className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-8 space-y-6">
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
              README / 폴더 구조 / 인프라 단서를 분석하여 설계 의도를 설명하는 면접을 시작합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Repository URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    setError(null);
                    setAnalysis(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isAnalyzing && !analysis) analyze();
                  }}
                />
                <Button
                  onClick={analyze}
                  disabled={isAnalyzing || !repoUrl.trim()}
                  className="shrink-0"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "분석"}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                공개 레포만 지원합니다. Private repo는 분석하지 않습니다.
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {isAnalyzing && (
              <div className="rounded-xl border bg-muted/20 p-6 space-y-3">
                <div className="flex items-center gap-3 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{ANALYZE_STEPS[analyzeStep] || "분석 준비 중..."}</p>
                    <p className="text-xs text-muted-foreground">({analyzeStep}/3단계) 약 10~20초 소요</p>
                  </div>
                </div>
              </div>
            )}

            {analysis && (
              <div className="space-y-4 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <CheckCircle2 className="w-4 h-4" /> 분석 완료
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">README 요약</p>
                  <p className="text-sm text-foreground leading-relaxed">{analysis.readmeSummary}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">구조 특징</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.treeSummary}</p>
                </div>

                {analysis.infraHypotheses.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">인프라 가설</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                      {analysis.infraHypotheses.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                )}

                {analysis.detectedTopics.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">감지된 토픽</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.detectedTopics.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {TOPIC_LABEL[t] || t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary/90 inline-flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  평가는 설계 의도 60%, 코드 품질 10%, AI 활용 30% 가중치로 진행됩니다.
                </div>

                <Button className="w-full rounded-xl" onClick={startDefense}>
                  디펜스 면접 시작 <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {!analysis && !isAnalyzing && (
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                {[
                  "아키텍처 선택 이유",
                  "CI/CD 구성 의도",
                  "배포 전략과 롤백",
                  "모니터링/알림 체계",
                  "장애 대응 프로세스",
                  "AI 활용/검증 루프",
                ].map((item) => (
                  <div key={item} className="rounded-lg bg-muted/40 p-3 text-muted-foreground">
                    #{item}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
