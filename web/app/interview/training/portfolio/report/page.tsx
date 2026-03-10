"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { GlobalHeader } from "@/components/layout/global-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AxisEvidencePanel } from "@/components/features/interview/report/axis-evidence-panel";
import { AxisProfileBoard } from "@/components/features/interview/report/axis-profile-board";
import { ReportFooterActions } from "@/components/features/interview/report/report-footer-actions";
import { SessionReportHero } from "@/components/features/interview/report/session-report-hero";
import {
  buildPortfolioDefenseReportModel,
  PortfolioRubricSnapshot,
} from "@/lib/interview/report/portfolio-defense-report-adapter";

type RubricKey = "design_intent" | "code_quality" | "ai_usage";

interface RubricItem {
  raw: number;
  weight: number;
  weighted: number;
  evidence: string;
  confidence: number;
}

interface SessionDetail {
  analysis?: {
    rubricScores?: Record<string, Partial<RubricItem>>;
    totalWeightedScore?: number;
    strengths?: string[];
    improvements?: string[];
    nextActions?: string[];
  };
  debug_events?: Array<{
    summary?: string;
    payload?: {
      role?: string;
    };
  }>;
  target_duration_sec?: number;
  mode?: string;
  status?: string;
  current_phase?: string;
  created_at?: number;
  jd_text?: string;
  reportStatus?: string;
  reportAttempts?: number;
  reportMaxAttempts?: number;
  reportError?: string;
}

const RUBRIC_META: Record<RubricKey, { label: string; weight: number }> = {
  design_intent: { label: "설계 의도 설명", weight: 60 },
  code_quality: { label: "코드 품질", weight: 10 },
  ai_usage: { label: "AI 활용", weight: 30 },
};

const TOPIC_META: Record<string, { label: string; keywords: string[] }> = {
  architecture: {
    label: "아키텍처",
    keywords: ["아키텍처", "설계", "구조", "레이어", "도메인", "msa", "모노리스"],
  },
  cicd: {
    label: "CI/CD",
    keywords: ["ci", "cd", "pipeline", "깃허브 액션", "github actions", "jenkins", "배포 자동화"],
  },
  deployment: {
    label: "배포 전략",
    keywords: ["배포", "롤백", "카나리", "블루그린", "k8s", "쿠버네티스", "docker", "도커"],
  },
  monitoring: {
    label: "모니터링",
    keywords: ["모니터링", "로그", "알림", "grafana", "prometheus", "apm", "observability"],
  },
  "incident-response": {
    label: "장애 대응",
    keywords: ["장애", "인시던트", "incident", "복구", "포스트모텀", "재발 방지"],
  },
  "ai-usage": {
    label: "AI 활용 방식",
    keywords: ["ai", "llm", "gpt", "claude", "copilot", "프롬프트", "검증", "hallucination"],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseJdPayload(jdText?: string): Record<string, unknown> {
  if (!jdText) return {};
  try {
    const parsed = JSON.parse(jdText);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeMode(mode?: string): "voice" | "video" {
  return mode === "video" ? "video" : "voice";
}

function resolveDurationMinute(targetDurationSec?: number): 5 | 10 | 15 {
  if (!targetDurationSec) return 10;
  const minute = Math.round(targetDurationSec / 60);
  if (minute <= 5) return 5;
  if (minute >= 15) return 15;
  return 10;
}

function detectCoveredTopics(events: SessionDetail["debug_events"]): Set<string> {
  const covered = new Set<string>();
  for (const event of events ?? []) {
    if (event.payload?.role !== "user") continue;
    const text = (event.summary || "").toLowerCase();
    if (!text) continue;
    for (const [key, topic] of Object.entries(TOPIC_META)) {
      if (topic.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
        covered.add(key);
      }
    }
  }
  return covered;
}

function extractTurns(events: SessionDetail["debug_events"]) {
  const turns: Array<{ role: "user" | "model"; text: string }> = [];
  for (const event of events ?? []) {
    const role = event.payload?.role;
    if (role !== "user" && role !== "model") continue;
    const text = (event.summary || "").trim();
    if (!text) continue;
    turns.push({ role, text });
  }
  return turns;
}

function InsightListCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <Card className="rounded-[28px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3 text-sm leading-6 text-foreground">
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function PortfolioDefenseReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id") ?? "";

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!sessionId) {
        setError("세션 ID가 없습니다.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/interview/sessions/${sessionId}`);
        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error || "세션 정보를 불러오지 못했습니다.");
        }
        setDetail(json.data as SessionDetail);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "리포트를 불러오지 못했습니다.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !detail) return;
    if (!detail.reportStatus || !["pending", "running"].includes(detail.reportStatus)) return;

    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/interview/sessions/${sessionId}`, { cache: "no-store" });
        const json = await res.json();
        if (json.success && json.data) {
          setDetail(json.data as SessionDetail);
        }
      } catch {
        // retry next interval
      }
    }, 5000);

    return () => window.clearInterval(id);
  }, [detail, sessionId]);

  const jdPayload = useMemo(() => parseJdPayload(detail?.jd_text), [detail?.jd_text]);
  const repoUrl = typeof jdPayload.repoUrl === "string" ? jdPayload.repoUrl : "";
  const mode = normalizeMode(detail?.mode);
  const durationMinute = resolveDurationMinute(detail?.target_duration_sec);

  const rubric = useMemo(() => {
    const source = detail?.analysis?.rubricScores || {};
    const keys: RubricKey[] = ["design_intent", "code_quality", "ai_usage"];
    return keys.reduce((acc, key) => {
      acc[key] = {
        raw: clamp(Number(source[key]?.raw ?? 0), 0, 100),
        weighted: clamp(Number(source[key]?.weighted ?? 0), 0, RUBRIC_META[key].weight),
      };
      return acc;
    }, {} as Record<RubricKey, { raw: number; weighted: number }>);
  }, [detail?.analysis?.rubricScores]);

  const totalWeightedScore = useMemo(() => {
    const fromPayload = Number(detail?.analysis?.totalWeightedScore ?? NaN);
    if (Number.isFinite(fromPayload)) return clamp(fromPayload, 0, 100);
    return rubric.design_intent.weighted + rubric.code_quality.weighted + rubric.ai_usage.weighted;
  }, [detail?.analysis?.totalWeightedScore, rubric]);

  const strengths = detail?.analysis?.strengths ?? [];
  const improvements = detail?.analysis?.improvements ?? [];
  const nextActions = detail?.analysis?.nextActions ?? [];

  const coveredTopics = useMemo(() => detectCoveredTopics(detail?.debug_events), [detail?.debug_events]);
  const expectedTopics = useMemo(() => {
    const fromPayload = Array.isArray(jdPayload.detectedTopics)
      ? jdPayload.detectedTopics.filter((key: unknown): key is string => typeof key === "string")
      : [];
    const normalized = fromPayload.filter((key) => key in TOPIC_META);
    if (normalized.length > 0) return Array.from(new Set(normalized));
    return Object.keys(TOPIC_META);
  }, [jdPayload.detectedTopics]);
  const coverage = useMemo(
    () => ({
      covered: expectedTopics.filter((key) => coveredTopics.has(key)).length,
      total: expectedTopics.length,
      items: expectedTopics.map((key) => ({
        label: TOPIC_META[key]?.label || key,
        covered: coveredTopics.has(key),
      })),
    }),
    [coveredTopics, expectedTopics],
  );

  const turns = useMemo(() => extractTurns(detail?.debug_events), [detail?.debug_events]);

  const model = useMemo(() => {
    if (!detail) return null;
    return buildPortfolioDefenseReportModel({
      rubric: {
        designIntent: rubric.design_intent.raw,
        codeQuality: rubric.code_quality.raw,
        aiUsage: rubric.ai_usage.raw,
        totalWeightedScore,
      } satisfies PortfolioRubricSnapshot,
      repoUrl,
      mode,
      createdAt: detail.created_at,
      strengths,
      improvements,
      nextActions,
      coverage,
      turns,
    });
  }, [coverage, detail, improvements, mode, nextActions, repoUrl, rubric, strengths, totalWeightedScore, turns]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] text-foreground">
        <GlobalHeader />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center px-6 py-8">
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-bold">포트폴리오 디펜스 리포트를 불러오는 중입니다</h2>
            <p className="text-muted-foreground">세션 로그와 평가 근거를 기반으로 디벗 리포트를 구성하고 있습니다.</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !detail || !model) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] text-foreground">
        <GlobalHeader />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center px-6 py-8">
          <Card className="w-full rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardContent className="space-y-4 p-8 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-orange-500" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">리포트를 불러올 수 없습니다.</h2>
                <p className="text-muted-foreground">{error || "세션 상세 정보를 찾지 못했습니다."}</p>
              </div>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button variant="outline" className="rounded-full px-6" onClick={() => router.push("/interview/training")}>
                  훈련 센터로
                </Button>
                <Button className="rounded-full px-6" onClick={() => window.location.reload()}>
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const hasRubricReport =
    rubric.design_intent.weighted > 0 || rubric.code_quality.weighted > 0 || rubric.ai_usage.weighted > 0;
  const reportStatus = detail.reportStatus || "";

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-foreground">
      <GlobalHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6 md:px-10">
        <section className="flex items-center gap-3">
          <Button variant="outline" className="rounded-full bg-white" onClick={() => router.push("/interview/analysis")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            나의 인터뷰 분석
          </Button>
          <Badge variant="outline" className="border-primary/20 bg-white text-primary">
            PORTFOLIO DEFENSE REPORT
          </Badge>
        </section>

        {["pending", "running"].includes(reportStatus) ? (
          <div className="rounded-[24px] border border-primary/30 bg-primary/5 px-4 py-4">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
              <div>
                <p className="text-sm font-semibold text-primary">AI 리포트 생성 중입니다</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  평가 분석이 진행 중입니다. 페이지는 자동으로 다시 읽습니다.
                  {detail.reportAttempts != null && detail.reportMaxAttempts != null
                    ? ` (${detail.reportAttempts}/${detail.reportMaxAttempts}회 확인)`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!hasRubricReport ? (
          <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardContent className="space-y-4 p-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">디펜스 분석이 아직 준비되지 않았습니다</h2>
                <p className="text-muted-foreground">
                  {reportStatus === "failed"
                    ? `리포트 생성이 실패했습니다. ${detail.reportError || ""}`
                    : "세션 종료 직후에는 분석이 지연될 수 있습니다. 잠시 뒤 다시 확인해주세요."}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" className="rounded-full px-6" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
                <Button
                  className="rounded-full px-6"
                  onClick={() =>
                    router.push(
                      `/interview/training/portfolio/room?sessionId=${encodeURIComponent(sessionId)}&mode=${mode}&duration=${durationMinute}${repoUrl ? `&repoUrl=${encodeURIComponent(repoUrl)}` : ""}`,
                    )
                  }
                >
                  세션으로 복귀
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <SessionReportHero
              badgeLabel={model.badgeLabel}
              typeName={model.typeName}
              typeLabels={model.typeLabels}
              summary={model.summary}
              metrics={model.heroMetrics}
              metaItems={model.metaItems}
            />

            <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <AxisProfileBoard axes={model.axes} />
              <AxisEvidencePanel items={model.axisEvidence} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <Card className="rounded-[28px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    디펜스 요약
                  </CardTitle>
                  <CardDescription>총평과 핵심 하이라이트만 짧게 묶어봅니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4 text-sm leading-7 text-foreground">
                    {model.defenseSummary}
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">디펜스 하이라이트</p>
                    </div>
                    {model.narrativeHighlights.map((highlight, index) => (
                      <div key={`${highlight.title}-${index}`} className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-primary/20 bg-white text-primary">
                            {highlight.label}
                          </Badge>
                          <p className="text-sm font-semibold text-foreground">{highlight.title}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{highlight.summary}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-[28px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      토픽 커버리지
                    </CardTitle>
                    <CardDescription>이번 디펜스에서 실제로 다룬 핵심 주제들입니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">Coverage</span>
                        <span className="text-muted-foreground">
                          {model.topicCoverage.covered} / {model.topicCoverage.total}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${model.topicCoverage.total > 0 ? Math.round((model.topicCoverage.covered / model.topicCoverage.total) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {model.topicCoverage.items.map((item) => (
                        <div
                          key={item.label}
                          className={`flex items-center justify-between rounded-[16px] border px-3 py-2 text-sm ${
                            item.covered ? "border-primary/20 bg-primary/5" : "border-[#e7ebf1] bg-[#fbfcfe]"
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className={`text-xs font-semibold ${item.covered ? "text-primary" : "text-muted-foreground"}`}>
                            {item.covered ? "Covered" : "Missed"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <InsightListCard
                  title="기여도 / 방어력"
                  description="다음 디펜스에서 더 또렷하게 말해야 할 포인트입니다."
                  items={model.contributionInsights}
                />
              </div>
            </section>

            <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">대화 하이라이트</CardTitle>
                <CardDescription>디펜스 중 마지막 주요 질문과 답변 장면입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {model.transcriptHighlights.length > 0 ? (
                  model.transcriptHighlights.map((turn, index) => (
                    <div key={`${turn.role}-${index}`} className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant={turn.role === "model" ? "outline" : "secondary"} className="border-primary/20 bg-white text-primary">
                          {turn.role === "model" ? "면접관" : "지원자"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">최근 흐름</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">{turn.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4 text-sm text-muted-foreground">
                    아직 대화 하이라이트를 정리할 로그가 충분하지 않습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            <ReportFooterActions
              title="같은 레포로 다시 방어해볼까요?"
              description="같은 레포로 다시 디펜스를 진행하거나, 훈련 센터로 돌아가 다른 레포를 시작할 수 있습니다."
              actions={model.footerActions}
            />
          </>
        )}
      </main>
    </div>
  );
}
