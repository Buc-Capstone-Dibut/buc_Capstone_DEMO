"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
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
import { buildPortfolioDefenseReportModel } from "@/lib/interview/report/portfolio-defense-report-adapter";

interface RubricItem {
  raw?: number;
  weighted?: number;
  evidence?: string;
  confidence?: number;
}

interface PortfolioTimelineEntry {
  prompt?: string;
  answer?: string;
  phaseLabel?: string;
}

interface PortfolioReportView {
  repoUrl?: string;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
  rubric?: Record<string, Partial<RubricItem> | number>;
  comparisonPayload?: {
    repoUrl?: string;
  };
}

interface SessionDetail {
  analysis?: {
    rubricScores?: Record<string, Partial<RubricItem>>;
    totalWeightedScore?: number;
    strengths?: string[];
    improvements?: string[];
    nextActions?: string[];
  };
  report_view?: PortfolioReportView | null;
  timeline?: PortfolioTimelineEntry[];
  job_payload?: {
    repoUrl?: string;
    detectedTopics?: string[];
  };
  target_duration_sec?: number;
  mode?: string;
  created_at?: number;
  reportStatus?: string;
  reportAttempts?: number;
  reportMaxAttempts?: number;
  reportError?: string;
}

function resolveDurationMinute(targetDurationSec?: number): 5 | 10 | 15 {
  if (!targetDurationSec) return 10;
  const minute = Math.round(targetDurationSec / 60);
  if (minute <= 5) return 5;
  if (minute >= 15) return 15;
  return 10;
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
          <div
            key={`${title}-${index}`}
            className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3 text-sm leading-6 text-foreground"
          >
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
        const res = await fetch(`/api/interview/sessions/${sessionId}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        if (!json?.success || !json?.data) {
          throw new Error(json?.error || "세션 정보를 불러오지 못했습니다.");
        }
        setDetail(json.data as SessionDetail);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "리포트를 불러오지 못했습니다.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchDetail();
  }, [router, sessionId]);

  useEffect(() => {
    if (!sessionId || !detail) return;
    if (!detail.reportStatus || !["pending", "running"].includes(detail.reportStatus)) return;

    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/interview/sessions/${sessionId}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        if (json?.success && json?.data) {
          setDetail(json.data as SessionDetail);
        }
      } catch {
        // retry next interval
      }
    }, 5000);

    return () => window.clearInterval(id);
  }, [detail, router, sessionId]);

  const durationMinute = resolveDurationMinute(detail?.target_duration_sec);
  const timeline = useMemo(
    () => (Array.isArray(detail?.timeline) ? detail.timeline : []),
    [detail?.timeline],
  );
  const repoUrl =
    detail?.report_view?.repoUrl ||
    detail?.report_view?.comparisonPayload?.repoUrl ||
    detail?.job_payload?.repoUrl ||
    "";
  const detectedTopics = useMemo(
    () =>
      Array.isArray(detail?.job_payload?.detectedTopics)
        ? detail.job_payload.detectedTopics.filter((item): item is string => typeof item === "string")
        : [],
    [detail?.job_payload?.detectedTopics],
  );

  const model = useMemo(() => {
    if (!detail) return null;
    return buildPortfolioDefenseReportModel({
      analysis: detail.analysis,
      reportView: detail.report_view,
      timeline,
      session: {
        repoUrl,
        detectedTopics,
        mode: detail.mode,
        createdAt: detail.created_at,
        durationMinute,
      },
    });
  }, [detail, detectedTopics, durationMinute, repoUrl, timeline]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] text-foreground">
        <GlobalHeader />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center px-6 py-8">
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-bold">포트폴리오 디펜스 리포트를 불러오는 중입니다</h2>
            <p className="text-muted-foreground">세션 리포트와 타임라인을 기반으로 화면을 구성하고 있습니다.</p>
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

  const hasRubricReport = Boolean(
    detail.report_view ||
      detail.analysis?.rubricScores ||
      detail.analysis?.totalWeightedScore ||
      detail.analysis?.strengths?.length ||
      detail.analysis?.improvements?.length,
  );
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
                      `/interview/training/portfolio/room?sessionId=${encodeURIComponent(sessionId)}&mode=${detail.mode || "video"}&duration=${durationMinute}${repoUrl ? `&repoUrl=${encodeURIComponent(repoUrl)}` : ""}`,
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
                <CardDescription>세션 타임라인 기준의 주요 질문과 답변 장면입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {model.transcriptHighlights.length > 0 ? (
                  model.transcriptHighlights.map((turn, index) => (
                    <div key={`${turn.role}-${index}`} className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <Badge
                          variant={turn.role === "model" ? "outline" : "secondary"}
                          className="border-primary/20 bg-white text-primary"
                        >
                          {turn.role === "model" ? "면접관" : "지원자"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">타임라인 기반</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">{turn.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4 text-sm text-muted-foreground">
                    아직 대화 하이라이트를 정리할 타임라인이 충분하지 않습니다.
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
