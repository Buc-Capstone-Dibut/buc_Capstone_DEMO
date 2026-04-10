"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, FileText, Lightbulb, Loader2, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlobalHeader } from "@/components/layout/global-header";
import { AxisEvidencePanel } from "@/components/features/interview/report/axis-evidence-panel";
import { AxisProfileBoard } from "@/components/features/interview/report/axis-profile-board";
import { InterviewReportScreen } from "@/components/features/interview/report/interview-report-screen";
import { ReportFooterActions } from "@/components/features/interview/report/report-footer-actions";
import { ReportInsightListCard } from "@/components/features/interview/report/report-insight-list-card";
import { SessionReportHero } from "@/components/features/interview/report/session-report-hero";
import {
  buildSessionInterviewDetailModel,
  SessionTimelineEntry as TimelineEntry,
} from "@/lib/interview/report/session-interview-detail-adapter";
import { coerceSessionAnalysisPayload } from "@/lib/interview/report/session-analysis-guard";
import { buildSessionInterviewReportModel } from "@/lib/interview/report/session-interview-report-adapter";
import {
  hasRenderableInterviewReport,
  shouldRecoverInterruptedInterviewReport,
  shouldRedirectToPortfolioReport,
} from "@/lib/interview/interview-session-flow";
import { AnalysisResult, useInterviewSetupStore } from "@/store/interview-setup-store";

interface SessionDetail {
  analysis?: SessionAnalysisPayload;
  created_at?: string | number;
  mode?: string;
  session_type?: string;
  status?: string;
  target_duration_sec?: number;
  reportStatus?: string;
  reportError?: string;
  reportAttempts?: number;
  reportMaxAttempts?: number;
  reportRequestedAt?: number;
  reportStartedAt?: number;
  reportUpdatedAt?: number;
  schema_version?: string;
  report_view?: SessionReportView | null;
  timeline?: TimelineEntry[];
  report_generation_meta?: SessionReportGenerationMeta | null;
  job_payload?: {
    role?: string;
    company?: string;
    url?: string;
    source_url?: string;
    original_url?: string;
  };
}

interface SessionReportView {
  sessionType?: string;
  analysisMode?: string;
  company?: string;
  role?: string;
  repoUrl?: string;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
  questionFindings?: Array<{
    question?: string;
    userAnswer?: string;
    strengths?: string[];
    improvements?: string[];
    refinedAnswer?: string;
    followUpQuestion?: string;
    evidence?: string[];
    confidence?: number;
  }>;
  competencyCoverage?: Array<{
    competency?: string;
    score?: number;
    evidence?: string;
    confidence?: number;
  }>;
  jdCoverage?: Array<{
    requirement?: string;
    matched?: boolean;
    evidence?: string;
    confidence?: number;
  }>;
  deliveryInsights?: string[];
  analysisQuality?: {
    score?: number;
    level?: string;
    label?: string;
    completenessScore?: number;
    questionFindingCount?: number;
    groundedQuestionCount?: number;
    competencyCount?: number;
    jdRequirementCount?: number;
    matchedRequirementCount?: number;
    directEvidenceCount?: number;
    warnings?: string[];
  };
  profile?: {
    axes?: {
      approach?: number;
      scope?: number;
      decision?: number;
      execution?: number;
    };
    typeCode?: string;
    typeName?: string;
    typeLabels?: string[];
    axisEvidence?: Array<{
      axisKey?: string;
      title?: string;
      description?: string;
    }>;
  } | null;
}

interface SessionReportGenerationMeta {
  generatedAt?: number;
  sessionType?: string;
  turnCount?: number;
  questionCount?: number;
  timelineCount?: number;
  source?: string;
  analysisMode?: string;
  fallbackReason?: string;
  analysisQuality?: {
    score?: number;
    level?: string;
    label?: string;
    completenessScore?: number;
    questionFindingCount?: number;
    groundedQuestionCount?: number;
    competencyCount?: number;
    jdRequirementCount?: number;
    matchedRequirementCount?: number;
    directEvidenceCount?: number;
    warnings?: string[];
  };
}

type SessionAnalysisPayload = AnalysisResult & {
  rubricScores?: Record<string, unknown>;
  summary?: string;
  fitSummary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
};

function hasOfficialInterviewReport(detail: SessionDetail | null | undefined): boolean {
  const analysisMode = String(
    detail?.report_generation_meta?.analysisMode
      || detail?.report_view?.analysisMode
      || "",
  ).trim();

  if (analysisMode && analysisMode !== "full") return false;
  if (detail?.analysis) return true;

  const reportView = detail?.report_view;
  if (!reportView) return false;

  return Boolean(
    reportView.profile
      || (Array.isArray(reportView.questionFindings) && reportView.questionFindings.length > 0)
      || (Array.isArray(reportView.competencyCoverage) && reportView.competencyCoverage.length > 0)
      || (Array.isArray(reportView.jdCoverage) && reportView.jdCoverage.length > 0),
  );
}

function shouldWaitForOfficialInterviewReport(detail: SessionDetail | null | undefined): boolean {
  const reportStatus = String(detail?.reportStatus || "").trim();
  return (reportStatus === "pending" || reportStatus === "running") && !hasOfficialInterviewReport(detail);
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

function formatGeneratedAt(value?: number): string {
  if (!value) return "-";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAnalysisSourceBadge(source: "question_finding" | "best_practice" | "none") {
  if (source === "question_finding") {
    return {
      label: "실제 면접 기반 분석",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (source === "best_practice") {
    return {
      label: "리포트 해석 기반",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "직접 연결된 분석 없음",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };
}

function getCoachingSourceBadge(source: "question_finding" | "generated") {
  if (source === "question_finding") {
    return {
      label: "분석 기반 AI 코칭",
      className: "border-primary/20 bg-primary/5 text-primary",
    };
  }

  return {
    label: "일반 AI 코칭",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  };
}

function resolveReportPresentationState({
  isBasicFallbackReport,
  isSummaryOnlyReport,
  analysisQualityLevel,
}: {
  isBasicFallbackReport: boolean;
  isSummaryOnlyReport: boolean;
  analysisQualityLevel: string;
}) {
  if (isBasicFallbackReport) {
    return {
      badge: "fallback/basic",
      title: "기본 리포트",
      description: "정식 질문별 분석이 완성되지 않아, 저장된 질문 흐름과 요약 필드 중심으로 기본 리포트를 먼저 보여줍니다.",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (isSummaryOnlyReport) {
    return {
      badge: "summary-only",
      title: "요약 리포트",
      description: "세부 평가 데이터가 아직 충분하지 않아 `report_view`와 질문 흐름 중심의 최소 리포트를 먼저 보여줍니다.",
      className: "border-primary/20 bg-primary/5 text-primary",
    };
  }

  if (analysisQualityLevel === "low") {
    return {
      badge: "partial-analysis",
      title: "부분 분석 리포트",
      description: "정식 분석은 완료됐지만 질문별 근거나 커버리지 데이터가 충분하지 않아, 일부 항목은 보수적으로 해석했습니다.",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }

  return {
    badge: "full-analysis",
    title: "정식 분석 리포트",
    description: "질문별 분석, 역량 커버리지, JD 커버리지까지 포함한 정식 결과 리포트입니다.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}


export default function InterviewResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("id");
  const interviewSessionId = useInterviewSetupStore((state) => state.interviewSessionId);
  const resolvedSessionId = querySessionId || interviewSessionId || "";
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRetryingReport, setIsRetryingReport] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [selectedCoreResponseIndex, setSelectedCoreResponseIndex] = useState(0);
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState(0);
  const recoveryRequestedRef = useRef<Set<string>>(new Set());
  const effectiveAnalysis = useMemo(
    () => coerceSessionAnalysisPayload(sessionDetail?.analysis ?? null),
    [sessionDetail?.analysis],
  );
  const sessionDurationMinutes = useMemo(
    () => resolveDurationMinutes(searchParams.get("duration"), sessionDetail?.target_duration_sec),
    [searchParams, sessionDetail?.target_duration_sec],
  );
  const sessionTimeline = useMemo(
    () => (Array.isArray(sessionDetail?.timeline) ? sessionDetail.timeline : []),
    [sessionDetail?.timeline],
  );
  const hasMinimalReportData = hasRenderableInterviewReport({
    analysis: effectiveAnalysis,
    report_view: sessionDetail?.report_view,
    timeline: sessionTimeline,
  });
  const hasOfficialReportData = useMemo(
    () => hasOfficialInterviewReport(sessionDetail),
    [sessionDetail],
  );

  const recoverInterruptedSession = useCallback(async (detail: SessionDetail): Promise<SessionDetail> => {
    if (!resolvedSessionId) return detail;
    if (recoveryRequestedRef.current.has(resolvedSessionId)) return detail;

    recoveryRequestedRef.current.add(resolvedSessionId);

    try {
      const response = await fetch(`/api/interview/sessions/${resolvedSessionId}/complete`, {
        method: "POST",
      });
      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "중단된 면접 종료 처리에 실패했습니다.");
      }

      return {
        ...detail,
        status: String(json?.data?.status || "completed"),
        reportStatus: String(json?.data?.reportStatus || detail.reportStatus || "pending"),
        reportError: "",
        reportRequestedAt: detail.reportRequestedAt || Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      console.error("Interrupted Session Recovery Error:", error);
      recoveryRequestedRef.current.delete(resolvedSessionId);
      return detail;
    }
  }, [resolvedSessionId]);

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

        let nextDetail = json.data as SessionDetail;

        if (shouldRedirectToPortfolioReport(nextDetail)) {
          router.replace(`/interview/training/portfolio/report?id=${resolvedSessionId}`);
          return;
        }

        if (shouldRecoverInterruptedInterviewReport(nextDetail)) {
          nextDetail = await recoverInterruptedSession(nextDetail);
        }

        if (cancelled) return;
        setSessionDetail(nextDetail);
        setIsAnalyzing(shouldWaitForOfficialInterviewReport(nextDetail));
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
  }, [recoverInterruptedSession, resolvedSessionId, router]);

  useEffect(() => {
    if (!resolvedSessionId || !sessionDetail) return;
    if (!shouldWaitForOfficialInterviewReport(sessionDetail)) return;

    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/interview/sessions/${resolvedSessionId}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!json?.success || !json?.data) return;
        const nextDetail = json.data as SessionDetail;
        if (shouldRedirectToPortfolioReport(nextDetail)) {
          router.replace(`/interview/training/portfolio/report?id=${resolvedSessionId}`);
          return;
        }
        setSessionDetail(nextDetail);
        setIsAnalyzing(shouldWaitForOfficialInterviewReport(nextDetail));
      } catch {
        // retry on next interval
      }
    }, 5000);

    return () => window.clearInterval(id);
  }, [resolvedSessionId, router, sessionDetail]);

  const reportModel = useMemo(() => {
    if (!sessionDetail || !hasOfficialReportData || (!effectiveAnalysis && !hasMinimalReportData)) return null;

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
        sessionType: sessionDetail?.session_type,
        createdAt: sessionDetail?.created_at,
        originalUrl: originalPostingUrl,
        schemaVersion: sessionDetail?.schema_version,
        reportGenerationMeta: sessionDetail?.report_generation_meta,
      },
    });
  }, [effectiveAnalysis, hasMinimalReportData, hasOfficialReportData, sessionDetail]);

  const roleLabel =
    reportModel?.metaItems.find((item) => item.label === "직무")?.value ||
    sessionDetail?.job_payload?.role ||
    sessionDetail?.report_view?.role ||
    "개발자";

  const detailModel = useMemo(
    () =>
      buildSessionInterviewDetailModel({
        analysis: effectiveAnalysis,
        reportView: sessionDetail?.report_view,
        reportModel,
        roleLabel,
        durationMinutes: sessionDurationMinutes,
        timeline: sessionTimeline,
      }),
    [effectiveAnalysis, reportModel, roleLabel, sessionDetail?.report_view, sessionDurationMinutes, sessionTimeline],
  );

  const activeCoreResponse =
    detailModel.coreResponses[selectedCoreResponseIndex] || detailModel.coreResponses[0] || null;
  const activeTimelineInsight =
    detailModel.timelineInsights[selectedTimelineIndex] || detailModel.timelineInsights[0] || null;
  const positioningGuide = detailModel.positioningGuide;
  const hasDetailedAnalysis = Boolean(reportModel?.hasDetailedProfile) && reportModel?.analysisMode === "full";
  const isSummaryOnlyReport = Boolean(reportModel) && !hasDetailedAnalysis;
  const reportGenerationMeta = sessionDetail?.report_generation_meta || null;
  const fallbackReason = String(reportGenerationMeta?.fallbackReason || "").trim();
  const isBasicFallbackReport = isSummaryOnlyReport && Boolean(fallbackReason);
  const analysisQuality =
    reportGenerationMeta?.analysisQuality ||
    sessionDetail?.report_view?.analysisQuality ||
    null;
  const reportPresentationState = resolveReportPresentationState({
    isBasicFallbackReport,
    isSummaryOnlyReport,
    analysisQualityLevel: String(analysisQuality?.level || ""),
  });
  const analysisQualityWarnings = Array.isArray(analysisQuality?.warnings)
    ? analysisQuality.warnings.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const reportPendingAnchor = Number(
    sessionDetail?.reportStartedAt
      || sessionDetail?.reportRequestedAt
      || sessionDetail?.reportUpdatedAt
      || 0,
  );
  const reportPendingTooLong = Boolean(
    shouldWaitForOfficialInterviewReport(sessionDetail)
    && reportPendingAnchor > 0
    && (Date.now() / 1000) - reportPendingAnchor >= 30,
  );

  const requestRetryReport = useCallback(async () => {
    if (!resolvedSessionId || isRetryingReport) return;
    setIsRetryingReport(true);
    try {
      const response = await fetch(`/api/interview/sessions/${resolvedSessionId}/retry-report`, {
        method: "POST",
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "리포트 재생성 요청에 실패했습니다.");
      }
      setSessionDetail((prev) => (
        prev
          ? {
              ...prev,
              reportStatus: "pending",
              reportError: "",
              reportRequestedAt: Math.floor(Date.now() / 1000),
              reportStartedAt: undefined,
            }
          : prev
      ));
      setIsAnalyzing(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "리포트 재생성 요청에 실패했습니다.";
      setSessionDetail((prev) => (
        prev
          ? {
              ...prev,
              reportError: message,
            }
          : prev
      ));
      setIsAnalyzing(false);
    } finally {
      setIsRetryingReport(false);
    }
  }, [isRetryingReport, resolvedSessionId]);

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
    if (reportPendingTooLong) {
      return (
        <div className="min-h-screen bg-[#f6f7fb] text-foreground">
          <GlobalHeader />
          <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center px-6 py-8">
            <Card className="w-full rounded-[30px] border border-[#e7ebf1] bg-white text-center shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <CardContent className="space-y-4 p-8">
                <AlertTriangle className="mx-auto h-10 w-10 text-orange-500" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">리포트 생성이 예상보다 오래 걸리고 있습니다.</h2>
                  <p className="text-muted-foreground">
                    현재 작업이 지연되고 있어 리포트 생성을 다시 요청할 수 있습니다.
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                  <Button className="rounded-full px-6" onClick={() => void requestRetryReport()} disabled={isRetryingReport}>
                    {isRetryingReport ? "리포트 재생성 요청 중..." : "리포트 다시 생성"}
                  </Button>
                  <Button variant="outline" className="rounded-full px-6" onClick={() => window.location.reload()}>
                    다시 불러오기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      );
    }

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
    const reportStatus = String(sessionDetail?.reportStatus || "");
    const reportError = String(sessionDetail?.reportError || "").trim();
    const reportAnalysisMode = String(
      sessionDetail?.report_generation_meta?.analysisMode
        || sessionDetail?.report_view?.analysisMode
        || "",
    ).trim();
    const isReportFailure = reportStatus === "failed" || (reportStatus === "completed" && reportAnalysisMode !== "full");
    return (
      <div className="min-h-screen bg-[#f6f7fb] text-foreground">
        <GlobalHeader />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center px-6 py-8">
          <Card className="w-full rounded-[30px] border border-[#e7ebf1] bg-white text-center shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardContent className="space-y-4 p-8">
              <AlertTriangle className="mx-auto h-10 w-10 text-orange-500" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  {isReportFailure ? "정식 분석 리포트를 아직 만들지 못했습니다." : "분석 데이터가 없습니다."}
                </h2>
                <p className="text-muted-foreground">
                  {isReportFailure
                    ? reportError || "요약/기본 리포트 대신 정식 분석 결과만 보여주도록 설정되어 있습니다. 리포트를 다시 생성해 정식 분석을 완료해 주세요."
                    : "면접을 마친 뒤 상세 리포트를 확인할 수 있습니다."}
                </p>
                {isReportFailure && sessionDetail?.reportAttempts != null && sessionDetail?.reportMaxAttempts != null ? (
                  <p className="text-sm text-muted-foreground">
                    재시도 횟수: {sessionDetail.reportAttempts}/{sessionDetail.reportMaxAttempts}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                {isReportFailure ? (
                  <Button
                    className="rounded-full px-6"
                    onClick={() => void requestRetryReport()}
                    disabled={isRetryingReport}
                  >
                    {isRetryingReport ? "리포트 재생성 요청 중..." : "리포트 다시 생성"}
                  </Button>
                ) : null}
                <Button variant="outline" className="rounded-full px-6" onClick={() => window.location.reload()}>
                  다시 불러오기
                </Button>
                <Button className="rounded-full px-6" onClick={() => router.push("/interview")}>
                  면접 메인으로 이동
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const summaryContent = (
    <>
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
                  <p className="text-lg font-semibold">선택한 응답 분석과 코칭</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    왼쪽 타임라인에서 질문 응답을 선택하면, 여기에서 실제 분석이 연결됐는지와 AI 코칭이 어떻게 붙었는지를 함께 확인할 수 있습니다.
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getAnalysisSourceBadge(activeTimelineInsight.analysisSource).className}>
                      {getAnalysisSourceBadge(activeTimelineInsight.analysisSource).label}
                    </Badge>
                    {activeTimelineInsight.linkedCoreResponseLabel ? (
                      <span className="text-xs text-muted-foreground">{activeTimelineInsight.linkedCoreResponseLabel}</span>
                    ) : null}
                    {activeTimelineInsight.confidence != null && activeTimelineInsight.analysisSource === "question_finding" ? (
                      <span className="text-xs text-muted-foreground">신뢰도 {activeTimelineInsight.confidence}%</span>
                    ) : null}
                  </div>
                  {activeTimelineInsight.analysis ? (
                    <p className="mt-3 text-sm leading-7 text-foreground">{activeTimelineInsight.analysis}</p>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      이 응답은 아직 저장된 질문별 분석과 직접 연결되지 않았습니다. 아래 코칭은 실제 답변 흐름을 바탕으로 AI가 보강한 가이드입니다.
                    </p>
                  )}
                  {activeTimelineInsight.evidence.length > 0 ? (
                    <div className="mt-3 rounded-[14px] border border-[#eef2f6] bg-[#fbfcfe] px-3 py-3">
                      <p className="text-xs font-medium text-muted-foreground">근거 문장</p>
                      <div className="mt-2 space-y-1.5">
                        {activeTimelineInsight.evidence.map((item) => (
                          <p key={item} className="text-sm leading-6 text-foreground">{item}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[18px] border border-primary/15 bg-white px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getCoachingSourceBadge(activeTimelineInsight.coachingSource).className}>
                      {getCoachingSourceBadge(activeTimelineInsight.coachingSource).label}
                    </Badge>
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">추천 답변 가이드</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-foreground">{activeTimelineInsight.recommendedAnswer}</p>
                </div>

                <div className="rounded-[18px] border border-[#cfe0ff] bg-white px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getCoachingSourceBadge(activeTimelineInsight.coachingSource).className}>
                      {getCoachingSourceBadge(activeTimelineInsight.coachingSource).label}
                    </Badge>
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

      {hasDetailedAnalysis ? (
        <>
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
              <ReportInsightListCard
                title="전달력 / 직무 연결"
                description="답변 흐름과 개발자 면접 맥락 연결에서 바로 읽히는 포인트입니다."
                items={reportModel.deliveryInsights}
              />
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportInsightListCard
              title="요약 리포트에서 먼저 보이는 강점"
              description="세부 평가 점수 없이도 현재 면접 기록에서 바로 읽히는 강점입니다."
              items={reportModel.strengths}
            />
            <ReportInsightListCard
              title="지금 바로 보완할 점"
              description="정밀 분석이 준비되기 전에도 다음 면접에 바로 반영할 수 있는 포인트입니다."
              items={[...reportModel.weaknesses, ...reportModel.nextActions].slice(0, 3)}
            />
          </div>
        </section>
      )}
    </>
  );

  const detailContent = hasDetailedAnalysis ? (
    <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
      <div className="space-y-5">
        <div>
          <p className="text-lg font-semibold">상세 피드백</p>
          <p className="mt-1 text-sm text-muted-foreground">실제 면접 기반 분석과 AI 코칭을 분리해서 보여줍니다. 먼저 실제 분석을 보고, 그 다음 보완 답변과 꼬리 질문 코칭을 읽는 구조입니다.</p>
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
                <Badge variant="outline" className={getAnalysisSourceBadge(activeCoreResponse.analysisSource).className}>
                  {getAnalysisSourceBadge(activeCoreResponse.analysisSource).label}
                </Badge>
                {activeCoreResponse.confidence != null && activeCoreResponse.analysisSource === "question_finding" ? (
                  <span className="text-xs font-medium text-muted-foreground">신뢰도 {activeCoreResponse.confidence}%</span>
                ) : null}
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
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={getAnalysisSourceBadge(activeCoreResponse.analysisSource).className}>
                    {getAnalysisSourceBadge(activeCoreResponse.analysisSource).label}
                  </Badge>
                  <MessageSquareQuote className="h-5 w-5 text-primary" />
                  <p className="text-lg font-semibold">실제 분석</p>
                </div>
                <p className="mt-4 text-sm leading-7 text-foreground">{activeCoreResponse.analysis}</p>
                {activeCoreResponse.evidence.length > 0 ? (
                  <div className="mt-4 rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-4">
                    <p className="text-xs font-medium text-muted-foreground">근거 문장</p>
                    <div className="mt-2 space-y-2">
                      {activeCoreResponse.evidence.map((item) => (
                        <p key={item} className="text-sm leading-7 text-foreground">{item}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[18px] border border-dashed border-[#d8dee8] bg-white px-4 py-4 text-sm leading-6 text-muted-foreground">
                    이 항목은 저장된 질문별 근거 문장 없이 리포트 해석 중심으로 표시됩니다.
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-primary/15 bg-primary/5 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={getCoachingSourceBadge(activeCoreResponse.coachingSource).className}>
                    {getCoachingSourceBadge(activeCoreResponse.coachingSource).label}
                  </Badge>
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <p className="text-lg font-semibold">AI 코칭: 보완 답변</p>
                </div>
                <p className="mt-4 text-sm leading-7 text-foreground">{activeCoreResponse.improvedAnswer}</p>
              </div>

              <div className="rounded-[24px] border border-[#cfe0ff] bg-[#f8fbff] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={getCoachingSourceBadge(activeCoreResponse.coachingSource).className}>
                    {getCoachingSourceBadge(activeCoreResponse.coachingSource).label}
                  </Badge>
                  <p className="text-sm font-semibold text-foreground">AI 코칭: 예상 꼬리 질문</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-foreground">{activeCoreResponse.followUp}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  ) : (
    <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
      <div className="space-y-5">
        <div>
          <p className="text-lg font-semibold">세부 분석 준비 중</p>
          <p className="mt-1 text-sm text-muted-foreground">현재는 실제 분석보다 AI 코칭 중심으로 먼저 제공합니다. 질문별 근거 분석이 준비되면 실제 분석 카드가 함께 표시됩니다.</p>
        </div>

        {detailModel.timelineInsights.length > 0 ? (
          <div className="grid gap-4">
            {detailModel.timelineInsights.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                    {item.phaseLabel}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground">{item.timeLabel}</span>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">질문</p>
                    <p className="mt-1 text-sm leading-7 text-foreground">{item.prompt}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">내 답변</p>
                    <p className="mt-1 text-sm leading-7 text-foreground">{item.answer}</p>
                  </div>
                  <div className="rounded-[18px] border border-primary/15 bg-white px-4 py-4">
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                      일반 AI 코칭
                    </Badge>
                    <p className="text-sm font-semibold text-foreground">다음 답변 가이드</p>
                    <p className="mt-2 text-sm leading-7 text-foreground">{item.recommendedAnswer}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#cfe0ff] bg-white px-4 py-4">
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                      일반 AI 코칭
                    </Badge>
                    <p className="text-sm font-semibold text-foreground">예상 꼬리 질문</p>
                    <p className="mt-2 text-sm leading-7 text-foreground">{item.followUp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-[#d8dee8] bg-[#fbfcfe] px-4 py-6 text-sm leading-6 text-muted-foreground">
            아직 저장된 질문/답변 기록이 충분하지 않아 세부 분석 카드를 구성하지 못했습니다.
          </div>
        )}
      </div>
    </section>
  );

  const guideContent = hasDetailedAnalysis ? (
    <>
      <section className="rounded-[32px] border border-primary/15 bg-primary/5 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/10">
                개발자 면접 포지셔닝
              </div>
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                AI 코칭 기반 가이드
              </Badge>
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
          <ReportInsightListCard
            title="이 유형이 잘 보이는 질문"
            description="동일 직무 비교가 아니라, 현재 성향이 특히 잘 드러나는 질문 장면입니다."
            items={positioningGuide?.strongQuestionTypes || []}
          />
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <p className="text-lg font-semibold">성장 가이드</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">아래 내용은 실제 분석 결과를 바탕으로 서비스가 정리한 AI 코칭 가이드입니다.</p>
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
    </>
  ) : (
    <>
      <section className="rounded-[32px] border border-primary/15 bg-primary/5 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
        <div className="space-y-3">
          <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/10">
            요약 리포트 안내
          </div>
          <h3 className="text-2xl font-black tracking-tight">기본 흐름은 확인할 수 있습니다</h3>
          <p className="text-sm leading-7 text-foreground">
            세부 평가 점수와 질문별 정밀 분석이 아직 충분하지 않아, 현재는 실제 면접 기록과 핵심 액션 중심으로 먼저 결과를 보여줍니다.
          </p>
        </div>
      </section>

      <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <ReportInsightListCard
            title="다음 면접 액션"
            description="현재 리포트 기준으로 바로 반영하기 좋은 액션입니다."
            items={reportModel.nextActions}
          />
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
              <div className="flex items-center gap-2 text-base font-semibold">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                지금 보이는 강점
              </div>
              <div className="mt-2 space-y-2 text-sm leading-7 text-muted-foreground">
                {reportModel.strengths.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-[20px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
              <div className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                먼저 보완할 점
              </div>
              <div className="mt-2 space-y-2 text-sm leading-7 text-muted-foreground">
                {reportModel.weaknesses.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const statusBanner = (
    <div className="rounded-[24px] border border-[#e7ebf1] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={reportPresentationState.className}>
            {reportPresentationState.badge}
          </Badge>
          <p className="text-sm font-semibold text-foreground">{reportPresentationState.title}</p>
          {sessionDetail?.reportAttempts && sessionDetail.reportAttempts > 1 ? (
            <span className="text-xs text-muted-foreground">재생성 {sessionDetail.reportAttempts}회 후 완료</span>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground">{reportPresentationState.description}</p>
        {fallbackReason ? (
          <p className="text-xs text-muted-foreground">기본 리포트 사유: {fallbackReason}</p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[18px] border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">생성 상태</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{reportPresentationState.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">생성 시각 {formatGeneratedAt(reportGenerationMeta?.generatedAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">리포트 버전 {sessionDetail?.schema_version || "-"}</p>
          </div>
          <div className="rounded-[18px] border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">분석 신뢰도</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {analysisQuality?.score ? `${analysisQuality.score}점` : "데이터 부족"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {analysisQuality?.label || "요약 리포트"}
              {analysisQuality?.completenessScore ? ` · 완성도 ${analysisQuality.completenessScore}점` : ""}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">근거 데이터</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              질문 {analysisQuality?.groundedQuestionCount ?? 0}개 · 근거 {analysisQuality?.directEvidenceCount ?? 0}개
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              저장된 질문 분석 {analysisQuality?.questionFindingCount ?? 0}개
            </p>
          </div>
          <div className="rounded-[18px] border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">생성 입력 규모</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              질문 {reportGenerationMeta?.questionCount ?? 0}개 · 발화 {reportGenerationMeta?.turnCount ?? 0}턴
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              타임라인 {reportGenerationMeta?.timelineCount ?? 0}개 · JD 매칭 {analysisQuality?.matchedRequirementCount ?? 0}/{analysisQuality?.jdRequirementCount ?? 0}
            </p>
          </div>
        </div>

        {analysisQualityWarnings.length > 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#d8dee8] bg-[#fbfcfe] px-4 py-4">
            <p className="text-xs font-medium text-muted-foreground">분석 메모</p>
            <div className="mt-2 space-y-1.5">
              {analysisQualityWarnings.slice(0, 3).map((item) => (
                <p key={item} className="text-sm leading-6 text-muted-foreground">{item}</p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-foreground">
      <GlobalHeader />
      <InterviewReportScreen
        banner={statusBanner}
        hero={(
          <SessionReportHero
            badgeLabel={reportModel.badgeLabel}
            typeName={reportModel.typeName}
            typeLabels={reportModel.typeLabels}
            summary={reportModel.summary}
            fitSummary={reportModel.fitSummary}
            metrics={reportModel.heroMetrics}
            metaItems={reportModel.metaItems}
          />
        )}
        tabs={[
          { value: "summary", label: "종합 리포트", content: summaryContent },
          { value: "detail", label: "세부 분석", content: detailContent },
          { value: "guide", label: "성장 가이드", content: guideContent },
        ]}
        footer={(
          <ReportFooterActions
            title="같은 톤으로 다시 연습해볼까요?"
            description="같은 직무로 다시 연습하거나, 전체 인터뷰 분석으로 돌아가 흐름을 확인할 수 있습니다."
            actions={reportModel.footerActions}
          />
        )}
      />
    </div>
  );
}
