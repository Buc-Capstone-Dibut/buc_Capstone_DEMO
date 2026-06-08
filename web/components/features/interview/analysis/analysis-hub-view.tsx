"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  ExternalLink,
  GitBranch,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ANALYSIS_HUB_AXES,
  AnalysisHubSession,
  AnalysisHubTabKind,
  AnalysisHubQuadrantKey,
  getAxisLabel,
} from "@/lib/interview/report/analysis-hub";
import type { RecommendedBlog } from "@/lib/interview/report/blog-recommendations";
import type { DibeotAxisScores } from "@/lib/interview/report/report-types";
import { cn } from "@/lib/utils";
import {
  INTERVIEW_TYPE_VISUALS,
  type InterviewTypeVisual,
} from "@/lib/interview/interview-type-visuals";

// ── 통일된 비주얼 토큰 ───────────────────────────────────────────────
const CARD = "rounded-2xl border border-[#e7ecf2] bg-white";
const TYPE_TOTAL = INTERVIEW_TYPE_VISUALS.length; // 16

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/70">{children}</p>
  );
}

function InterviewTypeArtwork({
  visual,
  size = "md",
  priority,
}: {
  visual: InterviewTypeVisual;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}) {
  const sizeClass = size === "sm" ? "h-14 w-14" : size === "md" ? "h-28 w-28" : "h-40 w-40";
  return (
    <div className={cn("relative shrink-0", sizeClass)}>
      <span className="absolute inset-x-3 bottom-2 h-5 rounded-full bg-[#172033]/10 blur-xl" />
      <Image
        src={visual.imagePath}
        alt={visual.label}
        fill
        sizes={size === "sm" ? "56px" : size === "md" ? "112px" : "160px"}
        className="object-contain drop-shadow-[0_18px_20px_rgba(23,32,51,0.12)]"
        priority={priority ?? size === "lg"}
      />
    </div>
  );
}

// ── 4축 미니바(컴팩트) ──────────────────────────────────────────────
function AxisMiniBar({
  axis,
  value,
}: {
  axis: (typeof ANALYSIS_HUB_AXES)[number];
  value: number;
}) {
  const dominant = getAxisLabel(axis, value);
  const isLeft = value >= 50;
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-foreground">{axis.label}</span>
        <span className="shrink-0 text-xs font-bold text-primary">{dominant}</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-[#eef2f6]">
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-[0_0_0_4px_rgba(132,204,22,0.15)]"
          style={{ left: `${100 - value}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className={cn(isLeft && "font-semibold text-foreground")}>{axis.left}</span>
        <span className={cn(!isLeft && "font-semibold text-foreground")}>{axis.right}</span>
      </div>
    </div>
  );
}

// ── 디벗 성향 맵(사분면) ────────────────────────────────────────────
function QuadrantMap({
  point,
  quadrantKey,
  typeName,
  dominantAxisText,
  unstableAxisText,
  growthAxisText,
}: {
  point: { x: number; y: number };
  quadrantKey: AnalysisHubQuadrantKey;
  typeName: string;
  dominantAxisText: string;
  unstableAxisText: string;
  growthAxisText: string;
}) {
  const quadrantLabels: Array<{ key: AnalysisHubQuadrantKey; title: string; subtitle: string }> = [
    { key: "tl", title: "구조 · 시스템", subtitle: "안정 · 조정" },
    { key: "tr", title: "탐색 · 구현", subtitle: "안정 · 조정" },
    { key: "bl", title: "구조 · 시스템", subtitle: "실험 · 구축" },
    { key: "br", title: "탐색 · 구현", subtitle: "실험 · 구축" },
  ];
  const summaryMap: Record<AnalysisHubQuadrantKey, string> = {
    tl: "설계와 시스템 구조를 먼저 보고, 안정과 조율을 우선하는 위치입니다.",
    tr: "실무 문제를 빠르게 파악하되, 리스크와 협업 정렬도 함께 챙기는 위치입니다.",
    bl: "전략적 설계를 바탕으로 실험과 직접 추진까지 함께 끌고 가는 위치입니다.",
    br: "구현과 실험을 빠르게 반복하면서 직접 만들어 검증하는 성향이 강한 위치입니다.",
  };

  return (
    <div className="rounded-xl border border-[#e7ecf2] bg-[#fbfcfe] p-5">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Sparkles className="h-4 w-4 text-primary" />
        디벗 성향 맵
      </div>
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[230px] rounded-lg border border-[#e1e7ef] bg-white p-3">
        <div className="absolute inset-x-1/2 top-5 h-[calc(100%-2.5rem)] w-px -translate-x-1/2 bg-[#e3e9f1]" />
        <div className="absolute inset-y-1/2 left-5 h-px w-[calc(100%-2.5rem)] -translate-y-1/2 bg-[#e3e9f1]" />
        {quadrantLabels.map((q) => (
          <div
            key={q.key}
            className={cn(
              "absolute text-[10px] leading-3",
              q.key === "tl" && "left-2.5 top-2.5",
              q.key === "tr" && "right-2.5 top-2.5 text-right",
              q.key === "bl" && "bottom-2.5 left-2.5",
              q.key === "br" && "bottom-2.5 right-2.5 text-right",
            )}
          >
            <p className="text-[10px] font-semibold text-foreground">{q.title}</p>
            <p className={cn("mt-0.5", q.key === quadrantKey ? "text-primary" : "text-muted-foreground/60")}>
              {q.subtitle}
            </p>
          </div>
        ))}
        <div
          className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-primary shadow-[0_0_0_6px_rgba(132,204,22,0.16)]"
          style={{ left: `${point.x}%`, top: `${100 - point.y}%` }}
        />
        <div
          className="absolute z-10 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background shadow-sm"
          style={{ left: `${point.x}%`, top: `calc(${100 - point.y}% + 14px)` }}
        >
          {typeName}
        </div>
      </div>
      <p className="mt-4 text-xs font-medium leading-5 text-foreground">{summaryMap[quadrantKey]}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        지금은 <b className="font-semibold text-foreground">{dominantAxisText}</b> 축이 가장 뚜렷하고,{" "}
        {unstableAxisText} 축에서 최근 변동이 큽니다. 다음엔 {growthAxisText} 축을 의식해보세요.
      </p>
    </div>
  );
}

function getSessionStatusLabel(status: string) {
  if (status === "pending" || status === "running") return "분석 대기";
  if (status === "failed") return "분석 실패";
  return "분석 완료";
}

function formatPublishedDate(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export interface AnalysisHubViewProps {
  displayName: string;
  loading: boolean;
  error: string | null;
  blogsLoading: boolean;
  sessions: AnalysisHubSession[];
  repeatCounts: Record<string, number>;
  representativeVisual: InterviewTypeVisual;
  representativeTypeName: string;
  representativeLabels: string[];
  representativeAxes: DibeotAxisScores;
  quadrantPoint: { x: number; y: number };
  quadrantKey: AnalysisHubQuadrantKey;
  dominantAxisText: string;
  unstableAxisText: string;
  growthAxisText: string;
  dominantAxesText: string;
  interviewTypeStats: Array<{ visual: InterviewTypeVisual; count: number }>;
  blogs: RecommendedBlog[];
  /** 추천 엔진이 도출한 사용자 태그 조합(상위 N개) — '더 보기' 필터에 사용 */
  recommendationTags: string[];
  onNavigate: (href: string) => void;
  /** 미경험 유형 기본 펼침 (프리뷰/스크린샷용) */
  defaultShowUncovered?: boolean;
}

export function AnalysisHubView({
  displayName,
  loading,
  error,
  blogsLoading,
  sessions,
  repeatCounts,
  representativeVisual,
  representativeTypeName,
  representativeLabels,
  representativeAxes,
  quadrantPoint,
  quadrantKey,
  dominantAxisText,
  unstableAxisText,
  growthAxisText,
  dominantAxesText,
  interviewTypeStats,
  blogs,
  recommendationTags,
  onNavigate,
  defaultShowUncovered = false,
}: AnalysisHubViewProps) {
  const [selectedTab, setSelectedTab] = useState<AnalysisHubTabKind>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showUncovered, setShowUncovered] = useState(defaultShowUncovered);

  const filteredSessions = sessions.filter(
    (s) => selectedTab === "all" || s.kind === selectedTab,
  );
  const hasSessions = sessions.length > 0;
  const totalSessions = sessions.length;
  const totalMock = sessions.filter((s) => s.kind === "mock").length;
  const totalDefense = sessions.filter((s) => s.kind === "defense").length;

  const covered = interviewTypeStats.filter((t) => t.count > 0);
  const uncovered = interviewTypeStats.filter((t) => t.count === 0);
  const coveragePct = Math.round((covered.length / TYPE_TOTAL) * 100);

  const moreBlogsHref =
    recommendationTags.length > 0
      ? `/insights/tech-blog?tags=${encodeURIComponent(recommendationTags.join(","))}&from=analysis`
      : "/insights/tech-blog";

  const heroSummary = hasSessions
    ? `${representativeVisual.reportLens} 최근 ${Math.min(totalSessions, 6)}개 세션에서는 ${dominantAxesText} 축이 가장 강하게 드러났습니다.`
    : "아직 분석할 세션이 없어 공고 적합도 면접을 기본 기준으로 표시합니다.";

  // 세션 로딩 중에는 빈 데이터로 렌더하지 않고 스켈레톤을 보여준다.
  // (콜드스타트 등으로 응답이 느려도 '비어 보임/고장난 것처럼 보임'을 방지)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] text-foreground">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 md:px-8">
          <header className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </span>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">나의 인터뷰 분석</h1>
              <Badge variant="outline" className="ml-1 rounded-full border-[#e5eaf1] text-[11px] text-muted-foreground">
                불러오는 중…
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">인터뷰 기록을 불러오고 있습니다. 처음 열 때는 잠시 걸릴 수 있어요.</p>
          </header>

          <div aria-hidden="true" className="flex flex-col gap-6">
            {[
              { lead: 200, rows: 2 },
              { lead: 160, rows: 3 },
              { lead: 140, rows: 1 },
            ].map((block, i) => (
              <section key={i} className={cn(CARD, "p-6")}>
                <div className="h-3.5 animate-pulse rounded bg-muted" style={{ width: block.lead }} />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: block.rows * 2 }).map((_, j) => (
                    <div key={j} className="h-24 animate-pulse rounded-xl bg-muted/55" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 md:px-8">
        {/* 페이지 헤더 */}
        <header className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </span>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">나의 인터뷰 분석</h1>
            <Badge variant="secondary" className="ml-1 rounded-full text-[11px]">실세션 기반</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            실제 모의면접과 포트폴리오 디펜스 결과로 내 4축 성향과 최근 면접 흐름을 한눈에 확인합니다.
          </p>
          {error ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
              세션 목록을 불러오지 못했습니다. {error}
            </div>
          ) : null}
        </header>

        {/* ── 블록 A: 나의 면접 성향(대표유형 + 4축 + 성향맵 통합) ── */}
        <section className={cn(CARD, "p-6 md:p-7")}>
          <Eyebrow>나의 면접 성향</Eyebrow>
          <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div className="min-w-0 space-y-6">
              <div className="flex items-center gap-5">
                <InterviewTypeArtwork visual={representativeVisual} size="md" priority />
                <div className="min-w-0 space-y-1.5">
                  <Badge className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/10">
                    대표 면접 유형
                  </Badge>
                  <h2 className="text-2xl font-black leading-tight tracking-tight">{representativeVisual.label}</h2>
                  <p className="text-sm font-medium text-foreground">
                    {representativeTypeName} · {representativeLabels.join(" · ")}
                  </p>
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{heroSummary}</p>

              <div className="grid grid-cols-3 divide-x divide-[#eef2f6] rounded-xl border border-[#eef2f6] bg-[#fbfcfe]">
                {[
                  { label: "총 분석 세션", value: `${totalSessions}회` },
                  { label: "모의면접", value: `${totalMock}회` },
                  { label: "포트폴리오 디펜스", value: `${totalDefense}회` },
                ].map((s) => (
                  <div key={s.label} className="px-4 py-3">
                    <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-base font-bold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">4축 성향</p>
                <div className="grid gap-x-7 gap-y-4 sm:grid-cols-2">
                  {ANALYSIS_HUB_AXES.map((axis) => (
                    <AxisMiniBar key={axis.key} axis={axis} value={representativeAxes[axis.key]} />
                  ))}
                </div>
              </div>
            </div>

            <QuadrantMap
              point={quadrantPoint}
              quadrantKey={quadrantKey}
              typeName={representativeTypeName}
              dominantAxisText={dominantAxisText}
              unstableAxisText={unstableAxisText}
              growthAxisText={growthAxisText}
            />
          </div>
        </section>

        {/* ── 블록 B: 면접 기록 ── */}
        <section className={cn(CARD, "overflow-hidden")}>
          <div className="flex flex-col gap-3 border-b border-[#eef2f6] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Eyebrow>면접 기록</Eyebrow>
              <p className="mt-1.5 text-sm text-muted-foreground">반복 훈련 · 분석 상태 · 재시도 여부를 한 화면에서.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-[#e5eaf1] bg-[#fbfcfe] p-0.5">
                {[
                  { key: "all", label: "전체" },
                  { key: "mock", label: "모의면접" },
                  { key: "defense", label: "디펜스" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedTab(tab.key as AnalysisHubTabKind)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-bold transition-all",
                      selectedTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="inline-flex items-center rounded-lg border border-[#e5eaf1] bg-[#fbfcfe] p-0.5">
                {[
                  { key: "cards", label: "카드" },
                  { key: "table", label: "테이블" },
                ].map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setViewMode(v.key as "cards" | "table")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-bold transition-all",
                      viewMode === v.key ? "bg-[#172033] text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-muted-foreground">총 {filteredSessions.length}개</span>
            </div>
          </div>

          {filteredSessions.length > 0 ? (
            viewMode === "cards" ? (
              <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredSessions.slice(0, 9).map((session) => {
                  const repeatCount = repeatCounts[`${session.kind}:${session.subtitle || session.title}`] || 1;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onNavigate(session.href)}
                      className="group flex min-h-[196px] flex-col rounded-xl border border-[#e7ecf2] bg-[#fbfcfe] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#edf6e6] px-2.5 py-1 text-[11px] font-bold text-[#6f9f3b]">{session.interviewTypeLabel}</span>
                        <span className="text-[11px] font-semibold text-muted-foreground">{session.date}</span>
                      </div>
                      <div className="mt-3 flex items-start gap-3">
                        <div className="relative h-12 w-12 shrink-0">
                          <Image src={session.interviewTypeImage} alt="" fill sizes="48px" className="object-contain drop-shadow-[0_10px_12px_rgba(23,32,51,0.1)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-bold text-foreground">{session.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{session.subtitle}</p>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{session.summary}</p>
                      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                        <span className="rounded-full border border-[#e7ecf2] bg-white px-2 py-0.5 text-[11px] font-bold text-[#4f5b6b]">{getSessionStatusLabel(session.reportStatus)}</span>
                        <span className="rounded-full border border-[#e7ecf2] bg-white px-2 py-0.5 text-[11px] font-bold text-[#4f5b6b]">반복 {repeatCount}회</span>
                        <span className="ml-auto inline-flex items-center text-xs font-bold text-primary">
                          리포트
                          <ArrowRight className="ml-0.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="divide-y divide-[#eef2f6] px-5">
                {filteredSessions.slice(0, 9).map((session) => {
                  const repeatCount = repeatCounts[`${session.kind}:${session.subtitle || session.title}`] || 1;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onNavigate(session.href)}
                      className="grid w-full gap-3 py-3.5 text-left transition-colors hover:bg-primary/[0.03] md:grid-cols-[88px_minmax(0,1fr)_96px_72px_96px_24px] md:items-center"
                    >
                      <span className="text-xs font-bold text-primary">{session.kind === "mock" ? "면접" : "디펜스"}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{session.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{session.subtitle}</p>
                      </div>
                      <span className="text-xs text-muted-foreground md:text-right">{session.date}</span>
                      <span className="text-xs font-bold text-foreground md:text-right">{repeatCount}회</span>
                      <span className="text-xs font-bold text-muted-foreground md:text-right">{getSessionStatusLabel(session.reportStatus)}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground md:justify-self-end" />
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="m-5 rounded-xl border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-4 py-6 text-sm text-muted-foreground">
              아직 분석할 세션이 없습니다. 면접이나 디펜스를 완료하면 실제 기록 기반 추세를 확인할 수 있습니다.
            </div>
          )}
        </section>

        {/* ── 블록 C: 유형 커버리지(요약 바 + 칩 + 미경험 토글) ── */}
        <section className={cn(CARD, "p-6")}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow>유형 커버리지</Eyebrow>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">완료한 세션을 16개 면접 유형으로 분류해 어떤 축을 훈련했는지 보여줍니다.</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-2xl font-black text-primary">{covered.length}</span>
              <span className="text-sm font-bold text-muted-foreground">/{TYPE_TOTAL}</span>
            </div>
          </div>

          {/* 16분할 커버리지 바 */}
          <div className="mt-4 flex gap-1">
            {interviewTypeStats.map(({ visual, count }) => (
              <div key={visual.key} className={cn("h-2 flex-1 rounded-full", count > 0 ? "bg-primary" : "bg-[#e7ecf2]")} />
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            16개 유형 중 <b className="text-foreground">{covered.length}개</b> 경험 · {coveragePct}%
          </p>

          {/* 경험한 유형 칩 */}
          <div className="mt-5 flex flex-wrap gap-2">
            {covered.length > 0 ? (
              covered.map(({ visual, count }) => (
                <span key={visual.key} className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-[#f3f9ec] py-1.5 pl-2 pr-2.5">
                  <Image src={visual.imagePath} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                  <span className="text-xs font-bold text-foreground">{visual.label}</span>
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">{count}</span>
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">아직 경험한 유형이 없습니다. 첫 면접을 시작해보세요.</span>
            )}

            {showUncovered &&
              uncovered.map(({ visual }) => (
                <span key={visual.key} className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#d7dee6] bg-[#fafbfc] py-1.5 pl-2 pr-2.5 text-muted-foreground/70">
                  <Image src={visual.imagePath} alt="" width={20} height={20} className="h-5 w-5 object-contain opacity-50 grayscale" />
                  <span className="text-xs font-medium">{visual.label}</span>
                </span>
              ))}
          </div>

          {uncovered.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowUncovered((v) => !v)}
              className="mt-4 inline-flex items-center gap-1 rounded-lg border border-[#e7ecf2] bg-[#fbfcfe] px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-white"
            >
              {showUncovered ? "미경험 유형 접기" : `아직 안 해본 유형 ${uncovered.length}개 보기`}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showUncovered && "rotate-180")} />
            </button>
          ) : null}
        </section>

        {/* ── 블록 D: 추천 블로그 (컴팩트 4개 + 더 보기) ── */}
        <section className={cn(CARD, "p-6")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Eyebrow>{displayName}님 추천 기술 블로그</Eyebrow>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">최근 세션 맥락과 답변 성향을 바탕으로 바로 읽어볼 만한 글을 골랐습니다.</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(moreBlogsHref)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#e7ecf2] bg-[#fbfcfe] px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-white"
            >
              더 보기
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5">
            {blogsLoading ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-[#e7ecf2] bg-[#fbfcfe] p-3">
                    <div className="h-20 rounded-lg bg-muted/70" />
                    <div className="mt-3 h-3 w-16 rounded-full bg-primary/10" />
                    <div className="mt-2 h-3.5 w-3/4 rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            ) : blogs.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {blogs.slice(0, 4).map((blog) => (
                  <a
                    key={blog.id}
                    href={blog.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col overflow-hidden rounded-xl border border-[#e7ecf2] bg-white transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="relative flex h-24 items-center justify-center overflow-hidden bg-[#f6f9fc]">
                      {blog.thumbnail_url ? (
                        <Image src={blog.thumbnail_url} alt="" fill unoptimized sizes="(min-width:1024px) 25vw, 50vw" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      ) : (
                        <InterviewTypeArtwork visual={representativeVisual} size="sm" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {(blog.tags ?? []).slice(0, 2).map((tag) => (
                          <span key={`${blog.id}-${tag}`} className="rounded-full bg-[#f4f6fa] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                      <p className="mt-2 line-clamp-2 text-[13px] font-bold leading-5 text-foreground">{blog.title}</p>
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{blog.recommendationReason}</p>
                      <div className="mt-auto flex items-center justify-between pt-2.5">
                        <span className="truncate text-[11px] font-medium text-muted-foreground">{formatPublishedDate(blog.published_at)}</span>
                        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-primary">원문<ExternalLink className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-4 py-6 text-sm text-muted-foreground">
                지금 추천할 기술 블로그를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.
              </div>
            )}
          </div>
        </section>

        {/* ── 푸터 CTA ── */}
        <section className={cn(CARD, "p-6")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold">디벗과 다시 연습해볼까요?</p>
              <p className="mt-1 text-sm text-muted-foreground">최근 기록을 기준으로 새 모의면접이나 포트폴리오 디펜스로 바로 이어갈 수 있습니다.</p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button variant="outline" className="rounded-full px-5" onClick={() => onNavigate("/interview")}>
                <Briefcase className="mr-2 h-4 w-4" />새 모의면접 시작
              </Button>
              <Button className="rounded-full px-5" onClick={() => onNavigate("/interview/training/setup")}>
                <GitBranch className="mr-2 h-4 w-4" />디펜스 시작
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
