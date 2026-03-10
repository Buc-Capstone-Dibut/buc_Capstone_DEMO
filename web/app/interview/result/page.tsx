"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, FileText, Lightbulb, Loader2, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalHeader } from "@/components/layout/global-header";
import { AxisEvidencePanel } from "@/components/features/interview/report/axis-evidence-panel";
import { AxisProfileBoard } from "@/components/features/interview/report/axis-profile-board";
import { ReportFooterActions } from "@/components/features/interview/report/report-footer-actions";
import { SessionReportHero } from "@/components/features/interview/report/session-report-hero";
import {
  buildSessionInterviewDetailModel,
  SessionTimelineEntry as TimelineEntry,
} from "@/lib/interview/report/session-interview-detail-adapter";
import { buildSessionInterviewReportModel } from "@/lib/interview/report/session-interview-report-adapter";
import {
  isPendingReportStatus,
  shouldRedirectToPortfolioReport,
} from "@/lib/interview/interview-session-flow";
import { AnalysisResult, useInterviewSetupStore } from "@/store/interview-setup-store";

interface SessionDetail {
  analysis?: SessionAnalysisPayload;
  created_at?: string | number;
  mode?: string;
  status?: string;
  target_duration_sec?: number;
  reportStatus?: string;
  report_view?: SessionReportView | null;
  timeline?: TimelineEntry[];
  job_payload?: {
    role?: string;
    company?: string;
    url?: string;
    source_url?: string;
    original_url?: string;
  };
}

interface SessionReportView {
  company?: string;
  role?: string;
  repoUrl?: string;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
}

type SessionAnalysisPayload = AnalysisResult & {
  rubricScores?: Record<string, unknown>;
  summary?: string;
  fitSummary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
};

function normalizeAnalysisResult(source: SessionAnalysisPayload | null): SessionAnalysisPayload | null {
  if (!source) return null;

  return {
    ...source,
    habits: (source.habits || []).map((habit) => ({
      ...habit,
      severity:
        habit.severity === "high" || habit.severity === "medium" || habit.severity === "low"
          ? habit.severity
          : "low",
    })),
  };
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

function clampSessionDurationMinute(raw: string | null): 5 | 10 | 15 {
  const value = Number(raw);
  if (value === 5 || value === 10 || value === 15) return value;
  return 10;
}

function resolveDurationMinutes(raw: string | null, targetDurationSec?: number): 5 | 10 | 15 {
  const queryDuration = clampSessionDurationMinute(raw);
  if (raw) return queryDuration;

  const derivedMinute = Math.round((targetDurationSec || 0) / 60);
  if (derivedMinute === 5 || derivedMinute === 10 || derivedMinute === 15) return derivedMinute;

  return queryDuration;
}


export default function InterviewResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("id");
  const interviewSessionId = useInterviewSetupStore((state) => state.interviewSessionId);
  const resolvedSessionId = querySessionId || interviewSessionId || "";
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [selectedCoreResponseIndex, setSelectedCoreResponseIndex] = useState(0);
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState(0);
  const effectiveAnalysis = normalizeAnalysisResult(sessionDetail?.analysis ?? null);
  const sessionDurationMinutes = useMemo(
    () => resolveDurationMinutes(searchParams.get("duration"), sessionDetail?.target_duration_sec),
    [searchParams, sessionDetail?.target_duration_sec],
  );

  useEffect(() => {
    if (!resolvedSessionId) return;

    let cancelled = false;

    const fetchSession = async () => {
      setIsAnalyzing(true);
      try {
        const res = await fetch(`/api/interview/sessions/${resolvedSessionId}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }

        if (!json?.success || !json?.data) {
          throw new Error(json?.error || "세션 정보를 불러오지 못했습니다.");
        }

        if (shouldRedirectToPortfolioReport(json.data)) {
          router.replace(`/interview/training/portfolio/report?id=${resolvedSessionId}`);
          return;
        }

        if (cancelled) return;
        setSessionDetail(json.data as SessionDetail);

        setIsAnalyzing(isPendingReportStatus(String(json.data.reportStatus || "")));
      } catch (error) {
        console.error("Session Fetch Error:", error);
        if (!cancelled) {
          setIsAnalyzing(false);
        }
      }
    };

    void fetchSession();

    return () => {
      cancelled = true;
    };
  }, [resolvedSessionId, router]);

  useEffect(() => {
    if (!resolvedSessionId || !sessionDetail) return;
    if (!isPendingReportStatus(sessionDetail.reportStatus || "")) return;

    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/interview/sessions/${resolvedSessionId}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!json?.success || !json?.data) return;
        if (shouldRedirectToPortfolioReport(json.data)) {
          router.replace(`/interview/training/portfolio/report?id=${resolvedSessionId}`);
          return;
        }
        setSessionDetail(json.data as SessionDetail);
        setIsAnalyzing(isPendingReportStatus(String(json.data.reportStatus || "")));
      } catch {
        // retry on next interval
      }
    }, 5000);

    return () => window.clearInterval(id);
  }, [resolvedSessionId, router, sessionDetail]);

  const reportModel = useMemo(() => {
    if (!effectiveAnalysis || !sessionDetail) return null;

    const sessionJob = sessionDetail?.job_payload || {};
    const originalPostingUrl =
      sessionJob.source_url ||
      sessionJob.original_url ||
      sessionJob.url ||
      "";

    return buildSessionInterviewReportModel({
      analysis: effectiveAnalysis,
      reportView: sessionDetail.report_view,
      session: {
        company: sessionJob.company,
        role: sessionJob.role,
        mode: sessionDetail?.mode || "video",
        createdAt: sessionDetail?.created_at,
        originalUrl: originalPostingUrl,
      },
    });
  }, [effectiveAnalysis, sessionDetail]);

  const roleLabel =
    reportModel?.metaItems.find((item) => item.label === "직무")?.value ||
    sessionDetail?.job_payload?.role ||
    sessionDetail?.report_view?.role ||
    "개발자";

  const sessionTimeline = useMemo(
    () => (Array.isArray(sessionDetail?.timeline) ? sessionDetail.timeline : []),
    [sessionDetail?.timeline],
  );

  const detailModel = useMemo(
    () =>
      buildSessionInterviewDetailModel({
        analysis: effectiveAnalysis,
        reportModel,
        roleLabel,
        durationMinutes: sessionDurationMinutes,
        timeline: sessionTimeline,
      }),
    [effectiveAnalysis, reportModel, roleLabel, sessionDurationMinutes, sessionTimeline],
  );

  const activeCoreResponse =
    detailModel.coreResponses[selectedCoreResponseIndex] || detailModel.coreResponses[0] || null;
  const activeTimelineInsight =
    detailModel.timelineInsights[selectedTimelineIndex] || detailModel.timelineInsights[0] || null;
  const positioningGuide = detailModel.positioningGuide;

  useEffect(() => {
    if (selectedCoreResponseIndex >= detailModel.coreResponses.length) {
      setSelectedCoreResponseIndex(0);
    }
  }, [detailModel.coreResponses.length, selectedCoreResponseIndex]);

  useEffect(() => {
    if (selectedTimelineIndex >= detailModel.timelineInsights.length) {
      setSelectedTimelineIndex(0);
    }
  }, [detailModel.timelineInsights.length, selectedTimelineIndex]);

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] text-foreground">
        <GlobalHeader />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center px-6 py-8">
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-bold">면접 결과를 디벗 리포트로 정리하고 있습니다</h2>
            <p className="text-muted-foreground">답변 흐름과 직무 연결성을 다시 읽어 상세 리포트를 생성하는 중입니다.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!reportModel) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] text-foreground">
        <GlobalHeader />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center px-6 py-8">
          <Card className="w-full rounded-[30px] border border-[#e7ebf1] bg-white text-center shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardContent className="space-y-4 p-8">
              <AlertTriangle className="mx-auto h-10 w-10 text-orange-500" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">분석 데이터가 없습니다.</h2>
                <p className="text-muted-foreground">면접을 마친 뒤 상세 리포트를 확인할 수 있습니다.</p>
              </div>
              <Button className="rounded-full px-6" onClick={() => router.push("/interview")}>
                면접 메인으로 이동
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-foreground">
      <GlobalHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6 md:px-10">
        <Tabs defaultValue="summary" className="space-y-5">
          <TabsList className="h-auto rounded-full bg-transparent p-0 text-foreground">
            <TabsTrigger
              value="summary"
              className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-lg font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              종합 리포트
            </TabsTrigger>
            <TabsTrigger
              value="detail"
              className="ml-8 rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-lg font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              상세 피드백
            </TabsTrigger>
            <TabsTrigger
              value="guide"
              className="ml-8 rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-lg font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              합격 가이드
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6 p-5 md:p-6">
            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.045)] md:p-6">
              <SessionReportHero
                badgeLabel={reportModel.badgeLabel}
                typeName={reportModel.typeName}
                typeLabels={reportModel.typeLabels}
                summary={reportModel.summary}
                fitSummary={reportModel.fitSummary}
                metrics={reportModel.heroMetrics}
                metaItems={reportModel.metaItems}
                embedded
              />
            </section>

            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="mb-5 flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-semibold">면접 타임라인</p>
                  <p className="text-sm text-muted-foreground">
                    {sessionDurationMinutes}분 세션 안에서 내가 어떤 답변을 언제 했는지 시간순으로 정리했습니다.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-4">
                  {detailModel.timelineInsights.length > 0 ? (
                    <div className="max-h-[560px] overflow-y-auto pr-1">
                      {detailModel.timelineInsights.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-[44px_10px_minmax(0,1fr)] gap-1.5">
                          <div className="pt-1 text-[11px] font-semibold text-muted-foreground">
                            {item.timeLabel}
                          </div>
                          <div className="flex flex-col items-center">
                            <div className={`mt-1 h-2.5 w-2.5 rounded-full ${selectedTimelineIndex === index ? "bg-primary" : "bg-[#cfd8e3]"}`} />
                            {index !== detailModel.timelineInsights.length - 1 ? <div className="mt-1 h-full w-px bg-[#dfe6ee]" /> : null}
                          </div>
                          <div className="pb-4">
                            <button
                              type="button"
                              onClick={() => setSelectedTimelineIndex(index)}
                              className={`mt-0.5 w-full border-l-2 pl-3 text-left transition-colors ${
                                selectedTimelineIndex === index
                                  ? "border-primary"
                                  : "border-transparent hover:border-primary/30"
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex justify-start">
                                  <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.04)] ring-1 ring-[#e7ebf1]">
                                    <p className="text-[10px] font-medium text-muted-foreground">질문</p>
                                    <p className="mt-1 truncate text-sm text-foreground">{item.prompt}</p>
                                  </div>
                                </div>

                                <div className="flex justify-end">
                                  <div className="max-w-[92%] rounded-2xl rounded-br-md bg-primary/8 px-3 py-2 ring-1 ring-primary/10">
                                    <p className="text-[10px] font-medium text-muted-foreground">내 답변</p>
                                    <p className="mt-1 truncate text-sm text-foreground">{item.answer}</p>
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[#d8dee8] bg-white px-4 py-6 text-sm leading-6 text-muted-foreground">
                      아직 저장된 질문/답변 타임라인이 없어 시간순 응답 로그를 구성하지 못했습니다.
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-4">
                  {activeTimelineInsight ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-semibold">선택한 응답 가이드</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          왼쪽 타임라인에서 질문 응답을 선택하면, 여기에서 AI 추천 답변과 예상 꼬리 질문을 바로 확인할 수 있습니다.
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-primary/15 bg-white px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">AI 추천 답변</p>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-foreground">{activeTimelineInsight.recommendedAnswer}</p>
                      </div>

                      <div className="rounded-[18px] border border-[#cfe0ff] bg-white px-4 py-4">
                        <div className="flex items-center gap-2">
                          <MessageSquareQuote className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">예상 꼬리 질문</p>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-foreground">{activeTimelineInsight.followUp}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[#d8dee8] bg-white px-4 py-6 text-sm leading-6 text-muted-foreground">
                      타임라인에서 질문 응답을 선택하면, 여기에서 추천 답변과 예상 꼬리 질문을 확인할 수 있습니다.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <AxisProfileBoard axes={reportModel.axes} embedded />
                <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-4">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    <p className="text-lg font-semibold">디벗 유형은 이렇게 읽습니다</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    디벗 성향은 MBTI처럼 네 개의 축을 조합해서 읽습니다. 좋은 유형과 나쁜 유형을 나누는 게 아니라, 이번 면접에서 어떤 개발자처럼 보였는지 해석하는 방식입니다.
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <div className="rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">문제 접근 방식</p>
                      <p className="mt-1 text-muted-foreground">구조형 ↔ 탐색형</p>
                    </div>
                    <div className="rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">사고 범위</p>
                      <p className="mt-1 text-muted-foreground">시스템형 ↔ 구현형</p>
                    </div>
                    <div className="rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">의사결정 전략</p>
                      <p className="mt-1 text-muted-foreground">안정형 ↔ 실험형</p>
                    </div>
                    <div className="rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">실행 방식</p>
                      <p className="mt-1 text-muted-foreground">구축형 ↔ 조정형</p>
                    </div>
                    <div className="rounded-[18px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-foreground">
                      이번 리포트는 이 네 축 조합으로 <span className="font-semibold">{reportModel.typeName}</span> 유형을 읽고 있습니다.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <AxisEvidencePanel items={reportModel.axisEvidence} embedded />
                <InsightListCard
                  title="전달력 / 직무 연결"
                  description="답변 흐름과 개발자 면접 맥락 연결에서 바로 읽히는 포인트입니다."
                  items={reportModel.deliveryInsights}
                />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="detail" className="space-y-6">
            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-semibold">상세 피드백</p>
                  <p className="mt-1 text-sm text-muted-foreground">핵심 질문 응답 5~10개를 골라 질문별로 다시 읽고, 탭마다 하나의 핵심 피드백만 선명하게 제공합니다.</p>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {detailModel.coreResponses.map((item, index) => (
                    <button
                      key={`${item.label}-${item.timeLabel}`}
                      type="button"
                      onClick={() => setSelectedCoreResponseIndex(index)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        selectedCoreResponseIndex === index
                          ? "bg-foreground text-background"
                          : "bg-[#fbfcfe] text-muted-foreground ring-1 ring-[#e7ebf1]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {activeCoreResponse ? (
                  <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                          {activeCoreResponse.label}
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground">{activeCoreResponse.timeLabel}</span>
                      </div>
                      <p className="mt-4 text-lg font-semibold text-foreground">{activeCoreResponse.question}</p>

                      <div className="mt-5 rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-4">
                        <p className="text-xs font-medium text-muted-foreground">내 답변</p>
                        <p className="mt-2 text-sm leading-7 text-foreground">{activeCoreResponse.answer}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-5">
                        <div className="flex items-center gap-2">
                          <MessageSquareQuote className="h-5 w-5 text-primary" />
                          <p className="text-lg font-semibold">핵심 피드백</p>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-foreground">{activeCoreResponse.analysis}</p>
                      </div>

                      <div className="rounded-[24px] border border-primary/15 bg-primary/5 p-5">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-primary" />
                          <p className="text-lg font-semibold">보완 답변</p>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-foreground">{activeCoreResponse.improvedAnswer}</p>
                      </div>

                      <div className="rounded-[24px] border border-[#cfe0ff] bg-[#f8fbff] p-5">
                        <p className="text-sm font-semibold text-foreground">예상 꼬리 질문</p>
                        <p className="mt-3 text-sm leading-7 text-foreground">{activeCoreResponse.followUp}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="guide" className="space-y-6">
            <section className="rounded-[32px] border border-primary/15 bg-primary/5 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-3">
                  <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/10">
                    개발자 면접 포지셔닝
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">{reportModel.typeName}</h3>
                  <p className="text-sm leading-7 text-foreground">{positioningGuide?.interviewerImpression}</p>
                </div>
                <div className="grid gap-2">
                  {positioningGuide?.dominantAxes.map((axis) => (
                    <div key={axis.key} className="flex items-center justify-between rounded-[16px] bg-white px-4 py-3 ring-1 ring-primary/10">
                      <span className="text-sm text-muted-foreground">{axis.label}</span>
                      <span className="text-sm font-semibold text-foreground">{axis.dominant}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <InsightListCard
                  title="이 유형이 잘 보이는 질문"
                  description="동일 직무 비교가 아니라, 현재 성향이 특히 잘 드러나는 질문 장면입니다."
                  items={positioningGuide?.strongQuestionTypes || []}
                />
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                      <p className="text-lg font-semibold">합격 가이드</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">우리 서비스의 4축 결과를 기준으로 다음 면접에서 더 잘 보이는 방법만 정리합니다.</p>
                  </div>
                  <div className="space-y-3">
                    {(positioningGuide?.guideSteps || []).map((step, index) => (
                      <div key={step} className="flex items-start gap-3 rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-6 text-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[20px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        면접관에게 이렇게 보입니다
                      </div>
                      <div className="mt-2 space-y-2 text-sm leading-7 text-muted-foreground">
                        <p>설계와 구현 중 어디에 더 강점이 있는지 일관되게 드러나고 있습니다.</p>
                        <p>개발자 면접에서는 이 성향을 숨기기보다, 실제 사례와 연결해 더 선명하게 보여주는 편이 좋습니다.</p>
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <FileText className="h-4 w-4 text-primary" />
                        개발자 모의면접 기준 메모
                      </div>
                      <div className="mt-2 space-y-2 text-sm leading-7 text-muted-foreground">
                        <p>우리는 동일 직무 지원자와의 상대 비교나 합격 퍼센타일을 제공하지 않습니다.</p>
                        <p>대신 4축과 디벗 유형을 기준으로, 어떤 개발자처럼 보였는지와 다음 면접에서 더 잘 드러내는 방법에 집중합니다.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <ReportFooterActions
          title="같은 톤으로 다시 연습해볼까요?"
          description="같은 직무로 다시 연습하거나, 전체 인터뷰 분석으로 돌아가 흐름을 확인할 수 있습니다."
          actions={reportModel.footerActions}
        />
      </main>
    </div>
  );
}
