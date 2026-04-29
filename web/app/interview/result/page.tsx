"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlobalHeader } from "@/components/layout/global-header";
import { DibeotCharacter } from "@/components/features/interview/report/dibeot-character";
import {
  buildSessionInterviewDetailModel,
  type CoreResponseEntry,
  type SessionPositioningGuide,
  type SessionTimelineEntry as TimelineEntry,
  type TimelineInsightEntry,
} from "@/lib/interview/report/session-interview-detail-adapter";
import { coerceSessionAnalysisPayload } from "@/lib/interview/report/session-analysis-guard";
import { buildSessionInterviewReportModel } from "@/lib/interview/report/session-interview-report-adapter";
import { DIBEOT_AXES, getAxisLabel } from "@/lib/interview/report/dibeot-axis";
import type {
  DibeotAxisScores,
  FooterAction,
  ReportAxisEvidence,
  ReportMetaItem,
  ReportMetric,
} from "@/lib/interview/report/report-types";
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
    axes?: Partial<DibeotAxisScores> | null;
    typeCode?: string;
    typeName?: string;
    typeLabels?: string[];
    axisEvidence?: Array<Partial<ReportAxisEvidence>> | null;
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

function ResultStatePanel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-foreground">
      <GlobalHeader />
      <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl items-center justify-center px-6 py-8">
        <section className="w-full border-y border-[#dfe5ec] bg-white px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#f4f7fb]">
            {icon}
          </div>
          <h2 className="mt-5 text-2xl font-bold">{title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{description}</p>
          {children ? <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">{children}</div> : null}
        </section>
      </main>
    </div>
  );
}

function DocumentSection({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#dfe5ec] py-12 md:py-14">
      <div className="grid gap-7 lg:grid-cols-[170px_minmax(0,1fr)]">
        <aside>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{index}</p>
          <h2 className="mt-2 text-2xl font-bold">{title}</h2>
          {description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function ReportHeroBand({
  badgeLabel,
  typeName,
  typeLabels,
  summary,
  fitSummary,
  metrics,
  metaItems,
}: {
  badgeLabel: string;
  typeName: string;
  typeLabels: string[];
  summary: string;
  fitSummary?: string;
  metrics: ReportMetric[];
  metaItems: ReportMetaItem[];
}) {
  return (
    <section className="border-b border-[#dfe5ec] bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:px-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:py-14">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-md border border-primary/10 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
              {badgeLabel}
            </Badge>
            {typeLabels.map((label) => (
              <span key={label} className="text-xs font-semibold text-muted-foreground">
                {label}
              </span>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl break-words text-4xl font-black md:text-5xl">{typeName}</h1>
          {fitSummary ? (
            <p className="mt-5 max-w-4xl text-lg leading-8 text-foreground">{fitSummary}</p>
          ) : null}
          <p className="mt-4 max-w-4xl text-sm leading-7 text-muted-foreground">{summary}</p>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#e7edf3] pt-4 text-sm">
            {metaItems.map((item) => (
              <div key={item.label} className="flex max-w-full items-center gap-1.5">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{item.label}</span>
                <span className="text-muted-foreground">·</span>
                <span className="break-words font-semibold text-foreground">{item.value}</span>
                {item.href ? (
                  <Link
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs font-medium text-primary underline underline-offset-4"
                  >
                    {item.hrefLabel || "원본 링크"}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start border-l border-[#dfe5ec] pl-6">
          <DibeotCharacter typeName={typeName} />
          <div className="mt-12">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              디벗 유형
            </div>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              이번 면접에서 답변 흐름과 근거 제시 방식이 남긴 인상을 캐릭터와 유형으로 요약했습니다.
            </p>
          </div>
          {metrics.length > 0 ? (
            <dl className="mt-5 divide-y divide-[#e7edf3]">
              {metrics.map((metric) => (
                <div key={metric.label} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-sm text-muted-foreground">{metric.label}</dt>
                  <dd className="text-2xl font-bold">{metric.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function InsightColumn({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  tone?: "positive" | "caution" | "neutral";
}) {
  const markerClass =
    tone === "positive"
      ? "bg-emerald-500"
      : tone === "caution"
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="border-l border-[#dfe5ec] pl-5">
      <p className="text-sm font-bold">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3 text-sm leading-7 text-foreground">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${markerClass}`} />
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AxisDocumentProfile({
  axes,
  typeName,
  axisEvidence,
}: {
  axes: DibeotAxisScores;
  typeName: string;
  axisEvidence: ReportAxisEvidence[];
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {DIBEOT_AXES.map((axis) => {
            const value = axes[axis.key];
            const dominant = getAxisLabel(axis.key, value);
            const opposite = value >= 50 ? axis.right : axis.left;
            const dominantValue = value >= 50 ? value : 100 - value;
            const oppositeValue = 100 - dominantValue;

            return (
              <div key={axis.key} className="grid gap-3 border-b border-[#e7edf3] pb-5 md:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-bold">{axis.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{axis.description}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-primary">{dominant}</span>
                    <span className="text-muted-foreground">{dominantValue}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-[#e9eef4]">
                    <div className="h-full bg-primary" style={{ width: `${dominantValue}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{opposite} {oppositeValue}%</span>
                    <span>이번 세션 기준</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-l border-[#dfe5ec] pl-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <p className="text-lg font-bold">프로필 해석</p>
          </div>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            이번 면접은 <span className="font-semibold text-foreground">{typeName}</span> 성향으로 읽힙니다. 좋은 유형과 나쁜 유형을 나누기보다, 답변에서 어떤 개발자 인상이 강하게 남았는지를 보는 기준입니다.
          </p>
        </div>
      </div>

      {axisEvidence.length > 0 ? (
        <div className="grid gap-5 border-t border-[#dfe5ec] pt-7 md:grid-cols-2">
          {axisEvidence.map((item, index) => (
            <div key={`${item.axisKey}-${index}`} className="border-l border-[#dfe5ec] pl-5">
              <p className="text-sm font-bold">{item.title}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TimelineDocument({
  items,
  selectedIndex,
  onSelect,
  activeItem,
}: {
  items: TimelineInsightEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  activeItem: TimelineInsightEntry | null;
}) {
  if (items.length === 0) {
    return (
      <div className="border-l border-dashed border-[#cbd5e1] pl-5 text-sm leading-7 text-muted-foreground">
        아직 저장된 질문/답변 타임라인이 없어 시간순 응답 로그를 구성하지 못했습니다.
      </div>
    );
  }

  const analysisBadge = activeItem ? getAnalysisSourceBadge(activeItem.analysisSource) : null;
  const coachingBadge = activeItem ? getCoachingSourceBadge(activeItem.coachingSource) : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <ol className="border-l border-[#dfe5ec]">
        {items.map((item, index) => {
          const selected = selectedIndex === index;
          return (
            <li key={item.id} className="relative border-b border-[#e7edf3] py-5 pl-6">
              <span className={`absolute -left-[5px] top-6 h-2.5 w-2.5 rounded-full ${selected ? "bg-primary" : "bg-[#cbd5e1]"}`} />
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(index)}
                className="w-full text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{item.timeLabel}</span>
                  <Badge variant="outline" className={selected ? "border-primary/30 bg-primary/5 text-primary" : "border-[#dfe5ec] bg-white text-muted-foreground"}>
                    {item.phaseLabel}
                  </Badge>
                </div>
                <p className="mt-3 break-words text-base font-semibold leading-7 text-foreground">{item.prompt}</p>
                <p className="mt-2 line-clamp-2 break-words text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </button>
            </li>
          );
        })}
      </ol>

      <aside className="border-l border-[#dfe5ec] pl-6 lg:sticky lg:top-24 lg:self-start">
        {activeItem ? (
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {analysisBadge ? (
                  <Badge variant="outline" className={analysisBadge.className}>
                    {analysisBadge.label}
                  </Badge>
                ) : null}
                {activeItem.confidence != null && activeItem.analysisSource === "question_finding" ? (
                  <span className="text-xs text-muted-foreground">신뢰도 {activeItem.confidence}%</span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground">
                {activeItem.analysis || "이 응답은 아직 저장된 질문별 분석과 직접 연결되지 않았습니다."}
              </p>
            </div>

            {activeItem.evidence.length > 0 ? (
              <div className="border-t border-[#e7edf3] pt-5">
                <p className="text-xs font-semibold text-muted-foreground">근거 문장</p>
                <div className="mt-2 space-y-2">
                  {activeItem.evidence.map((item) => (
                    <p key={item} className="text-sm leading-7 text-foreground">{item}</p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-[#e7edf3] pt-5">
              <div className="flex items-center gap-2">
                {coachingBadge ? (
                  <Badge variant="outline" className={coachingBadge.className}>
                    {coachingBadge.label}
                  </Badge>
                ) : null}
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-sm font-semibold">추천 답변 가이드</p>
              <p className="mt-2 text-sm leading-7 text-foreground">{activeItem.recommendedAnswer}</p>
            </div>

            <div className="border-t border-[#e7edf3] pt-5">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">예상 꼬리 질문</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-foreground">{activeItem.followUp}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-7 text-muted-foreground">
            타임라인에서 질문 응답을 선택하면, 여기에서 추천 답변과 예상 꼬리 질문을 확인할 수 있습니다.
          </p>
        )}
      </aside>
    </div>
  );
}

function CoreResponseDocument({
  responses,
  selectedIndex,
  onSelect,
  activeResponse,
}: {
  responses: CoreResponseEntry[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  activeResponse: CoreResponseEntry | null;
}) {
  if (responses.length === 0) {
    return (
      <div className="border-l border-dashed border-[#cbd5e1] pl-5 text-sm leading-7 text-muted-foreground">
        아직 저장된 질문별 분석이 충분하지 않아 대표 답변 분석을 구성하지 못했습니다.
      </div>
    );
  }

  const analysisBadge = activeResponse ? getAnalysisSourceBadge(activeResponse.analysisSource) : null;
  const coachingBadge = activeResponse ? getCoachingSourceBadge(activeResponse.coachingSource) : null;

  return (
    <div className="space-y-8">
      <div className="flex gap-2 overflow-x-auto border-b border-[#dfe5ec] pb-3">
        {responses.map((item, index) => (
          <button
            key={`${item.label}-${item.timeLabel}`}
            type="button"
            onClick={() => onSelect(index)}
            className={`shrink-0 border-b-2 px-1 pb-2 text-sm font-semibold ${
              selectedIndex === index
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeResponse ? (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-7">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  {activeResponse.label}
                </Badge>
                <span className="text-xs font-medium text-muted-foreground">{activeResponse.timeLabel}</span>
              </div>
              <h3 className="mt-4 break-words text-2xl font-bold leading-9">{activeResponse.question}</h3>
            </div>

            <div className="border-l border-[#dfe5ec] pl-5">
              <p className="text-xs font-semibold text-muted-foreground">내 답변</p>
              <p className="mt-2 text-sm leading-7 text-foreground">{activeResponse.answer}</p>
            </div>

            <div className="border-l border-[#dfe5ec] pl-5">
              <div className="flex flex-wrap items-center gap-2">
                {analysisBadge ? (
                  <Badge variant="outline" className={analysisBadge.className}>
                    {analysisBadge.label}
                  </Badge>
                ) : null}
                {activeResponse.confidence != null && activeResponse.analysisSource === "question_finding" ? (
                  <span className="text-xs text-muted-foreground">신뢰도 {activeResponse.confidence}%</span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground">{activeResponse.analysis}</p>
              {activeResponse.evidence.length > 0 ? (
                <div className="mt-4 space-y-2 border-t border-[#e7edf3] pt-4">
                  <p className="text-xs font-semibold text-muted-foreground">근거 문장</p>
                  {activeResponse.evidence.map((item) => (
                    <p key={item} className="text-sm leading-7 text-foreground">{item}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-6 border-l border-[#dfe5ec] pl-6">
            <div>
              <div className="flex items-center gap-2">
                {coachingBadge ? (
                  <Badge variant="outline" className={coachingBadge.className}>
                    {coachingBadge.label}
                  </Badge>
                ) : null}
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-sm font-semibold">보완 답변</p>
              <p className="mt-2 text-sm leading-7 text-foreground">{activeResponse.improvedAnswer}</p>
            </div>

            <div className="border-t border-[#e7edf3] pt-5">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">예상 꼬리 질문</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-foreground">{activeResponse.followUp}</p>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function GrowthGuideDocument({
  guide,
  typeName,
}: {
  guide: SessionPositioningGuide | null;
  typeName: string;
}) {
  if (!guide) {
    return (
      <div className="border-l border-dashed border-[#cbd5e1] pl-5 text-sm leading-7 text-muted-foreground">
        성장 가이드를 만들기 위한 프로필 데이터가 아직 충분하지 않습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
          개발자 면접 포지셔닝
        </Badge>
        <h3 className="mt-4 text-2xl font-bold">{typeName}</h3>
        <p className="mt-3 text-sm leading-7 text-foreground">{guide.interviewerImpression}</p>

        <div className="mt-8 border-t border-[#dfe5ec] pt-6">
          <p className="text-sm font-bold">이 유형이 잘 보이는 질문</p>
          <ul className="mt-4 space-y-3">
            {guide.strongQuestionTypes.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-foreground">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="border-l border-[#dfe5ec] pl-6">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <p className="text-lg font-bold">성장 가이드</p>
        </div>
        <ol className="mt-5 space-y-4">
          {guide.guideSteps.map((step, index) => (
            <li key={step} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 text-sm leading-7">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function ActionPlanDocument({
  strengths,
  weaknesses,
  nextActions,
  deliveryInsights,
  footerActions,
  onNavigate,
}: {
  strengths: string[];
  weaknesses: string[];
  nextActions: string[];
  deliveryInsights: string[];
  footerActions: FooterAction[];
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-8">
        <div>
          <p className="text-lg font-bold">다음 면접 전 우선순위</p>
          <ol className="mt-5 space-y-4">
            {nextActions.map((item, index) => (
              <li key={`${item}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-4 border-b border-[#e7edf3] pb-4 text-sm leading-7">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="break-words">{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <InsightColumn title="유지할 강점" items={strengths} tone="positive" />
          <InsightColumn title="먼저 보완할 점" items={weaknesses} tone="caution" />
        </div>
      </div>

      <aside className="border-l border-[#dfe5ec] pl-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <p className="text-lg font-bold">전달력 메모</p>
        </div>
        <ul className="mt-5 space-y-3">
          {deliveryInsights.map((item, index) => (
            <li key={`${item}-${index}`} className="text-sm leading-7 text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-2 border-t border-[#dfe5ec] pt-5">
          {footerActions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "default"}
              className="justify-between rounded-md"
              onClick={() => action.href && onNavigate(action.href)}
            >
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </aside>
    </div>
  );
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
        <ResultStatePanel
          icon={<AlertTriangle className="h-6 w-6 text-orange-500" />}
          title="리포트 생성이 예상보다 오래 걸리고 있습니다."
          description="현재 작업이 지연되고 있어 리포트 생성을 다시 요청할 수 있습니다."
        >
          <Button className="rounded-md px-6" onClick={() => void requestRetryReport()} disabled={isRetryingReport}>
            {isRetryingReport ? "리포트 재생성 요청 중..." : "리포트 다시 생성"}
          </Button>
          <Button variant="outline" className="rounded-md px-6" onClick={() => window.location.reload()}>
            다시 불러오기
          </Button>
        </ResultStatePanel>
      );
    }

    return (
      <ResultStatePanel
        icon={<Loader2 className="h-7 w-7 animate-spin text-primary" />}
        title="면접 결과를 디벗 리포트로 정리하고 있습니다"
        description="답변 흐름과 직무 연결성을 다시 읽어 상세 리포트를 생성하는 중입니다."
      />
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
      <ResultStatePanel
        icon={<AlertTriangle className="h-6 w-6 text-orange-500" />}
        title={isReportFailure ? "정식 분석 리포트를 아직 만들지 못했습니다." : "분석 데이터가 없습니다."}
        description={
          isReportFailure
            ? reportError || "요약/기본 리포트 대신 정식 분석 결과만 보여주도록 설정되어 있습니다. 리포트를 다시 생성해 정식 분석을 완료해 주세요."
            : "면접을 마친 뒤 상세 리포트를 확인할 수 있습니다."
        }
      >
        {isReportFailure ? (
          <Button
            className="rounded-md px-6"
            onClick={() => void requestRetryReport()}
            disabled={isRetryingReport}
          >
            {isRetryingReport ? "리포트 재생성 요청 중..." : "리포트 다시 생성"}
          </Button>
        ) : null}
        <Button variant="outline" className="rounded-md px-6" onClick={() => window.location.reload()}>
          다시 불러오기
        </Button>
        <Button className="rounded-md px-6" onClick={() => router.push("/interview")}>
          면접 메인으로 이동
        </Button>
        {isReportFailure && sessionDetail?.reportAttempts != null && sessionDetail?.reportMaxAttempts != null ? (
          <p className="w-full text-sm text-muted-foreground">
            재시도 횟수: {sessionDetail.reportAttempts}/{sessionDetail.reportMaxAttempts}
          </p>
        ) : null}
      </ResultStatePanel>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-foreground">
      <GlobalHeader />
      <main className="pb-20">
        <ReportHeroBand
          badgeLabel={reportModel.badgeLabel}
          typeName={reportModel.typeName}
          typeLabels={reportModel.typeLabels}
          summary={reportModel.summary}
          fitSummary={reportModel.fitSummary}
          metrics={reportModel.heroMetrics}
          metaItems={reportModel.metaItems}
        />

        <article className="mx-auto max-w-7xl px-6 md:px-10">
          <DocumentSection
            index="01"
            title="요약"
            description="이번 면접에서 먼저 읽어야 할 강점, 보완점, 다음 행동입니다."
          >
            <div className="space-y-8">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <p className="text-lg font-bold">종합 한줄평</p>
                  </div>
                  <p className="mt-4 text-xl font-semibold leading-9">{reportModel.fitSummary}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{reportModel.summary}</p>
                </div>

                <aside className="border-l border-[#dfe5ec] pl-6">
                  <p className="text-sm font-bold">세션 요약</p>
                  <dl className="mt-4 divide-y divide-[#e7edf3]">
                    {reportModel.metaItems.map((item) => (
                      <div key={item.label} className="flex justify-between gap-4 py-3 text-sm">
                        <dt className="text-muted-foreground">{item.label}</dt>
                        <dd className="break-words text-right font-semibold">{item.value}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-4 py-3 text-sm">
                      <dt className="text-muted-foreground">진행 시간</dt>
                      <dd className="font-semibold">{sessionDurationMinutes}분</dd>
                    </div>
                  </dl>
                </aside>
              </div>

              <div className="grid gap-6 border-t border-[#dfe5ec] pt-8 md:grid-cols-3">
                <InsightColumn title="유지할 강점" items={reportModel.strengths} tone="positive" />
                <InsightColumn title="보완할 점" items={reportModel.weaknesses} tone="caution" />
                <InsightColumn title="다음 액션" items={reportModel.nextActions} />
              </div>
            </div>
          </DocumentSection>

          <DocumentSection
            index="02"
            title="DIBEOT 프로필"
            description={
              hasDetailedAnalysis
                ? "점수 카드 대신 네 축의 기울기와 근거를 한 번에 읽습니다."
                : "정밀 분석이 부족한 경우에도 현재 리포트 기준의 요약 프로필을 보여줍니다."
            }
          >
            <AxisDocumentProfile
              axes={reportModel.axes}
              typeName={reportModel.typeName}
              axisEvidence={reportModel.axisEvidence}
            />
          </DocumentSection>

          <DocumentSection
            index="03"
            title="질문 타임라인"
            description="질문과 답변 흐름을 시간순으로 읽고, 선택한 응답의 분석과 코칭을 확인합니다."
          >
            <TimelineDocument
              items={detailModel.timelineInsights}
              selectedIndex={selectedTimelineIndex}
              onSelect={setSelectedTimelineIndex}
              activeItem={activeTimelineInsight}
            />
          </DocumentSection>

          <DocumentSection
            index="04"
            title="대표 답변 분석"
            description="실제 분석과 AI 코칭을 분리해, 어떤 답변을 어떻게 고치면 좋을지 보여줍니다."
          >
            <CoreResponseDocument
              responses={detailModel.coreResponses}
              selectedIndex={selectedCoreResponseIndex}
              onSelect={setSelectedCoreResponseIndex}
              activeResponse={activeCoreResponse}
            />
          </DocumentSection>

          <DocumentSection
            index="05"
            title="성장 가이드"
            description="이번 리포트가 면접관에게 남긴 인상과 다음 연습 방향입니다."
          >
            <GrowthGuideDocument guide={positioningGuide} typeName={reportModel.typeName} />
          </DocumentSection>

          <DocumentSection
            index="06"
            title="다음 액션"
            description="리포트의 마지막은 다시 연습할 때 바로 쓸 수 있는 체크리스트로 끝냅니다."
          >
            <ActionPlanDocument
              strengths={reportModel.strengths}
              weaknesses={reportModel.weaknesses}
              nextActions={reportModel.nextActions}
              deliveryInsights={reportModel.deliveryInsights}
              footerActions={reportModel.footerActions}
              onNavigate={(href) => router.push(href)}
            />
          </DocumentSection>
        </article>
      </main>
    </div>
  );
}
