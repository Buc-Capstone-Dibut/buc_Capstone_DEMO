"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  ExternalLink,
  GitBranch,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ANALYSIS_HUB_AXES,
  AnalysisHubSourceSession,
  AnalysisHubTabKind,
  AnalysisHubQuadrantKey,
  buildAnalysisHubSessions,
  computeAxisTrends,
  computeRepresentativeAxes,
  getAxisLabel,
  getDominantAxesText,
  getQuadrantKey,
  getQuadrantPoint,
} from "@/lib/interview/report/analysis-hub";
import { rankRecommendedBlogs } from "@/lib/interview/report/blog-recommendations";
import type { RecommendedBlog } from "@/lib/interview/report/blog-recommendations";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getTypeName } from "@/lib/interview/report/dibeot-axis";
import {
  getInterviewTypeVisual,
  INTERVIEW_TYPE_VISUALS,
  type InterviewTypeVisual,
} from "@/lib/interview/interview-type-visuals";

function InterviewTypeArtwork({
  visual,
  size = "lg",
  priority,
}: {
  visual: InterviewTypeVisual;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}) {
  const sizeClass =
    size === "sm"
      ? "h-16 w-16"
      : size === "md"
        ? "h-28 w-28"
        : "h-44 w-44";

  return (
    <div className={cn("relative shrink-0", sizeClass)}>
      <span className="absolute inset-x-3 bottom-2 h-6 rounded-full bg-[#172033]/10 blur-xl" />
      <Image
        src={visual.imagePath}
        alt={visual.label}
        fill
        sizes={size === "sm" ? "64px" : size === "md" ? "112px" : "176px"}
        className="object-contain drop-shadow-[0_24px_24px_rgba(23,32,51,0.14)]"
        priority={priority ?? size === "lg"}
      />
    </div>
  );
}

function resolveBlogVisual(blog: RecommendedBlog, fallback: InterviewTypeVisual) {
  const tags = new Set((blog.tags ?? []).map((tag) => tag.toLowerCase()));
  return INTERVIEW_TYPE_VISUALS.find((visual) => visual.blogTags.some((tag) => tags.has(tag))) || fallback;
}

function formatPublishedDate(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function AxisCard({
  axis,
  value,
}: {
  axis: (typeof ANALYSIS_HUB_AXES)[number];
  value: number;
}) {
  const isLeftDominant = value >= 50;
  const dominant = getAxisLabel(axis, value);
  const distance = Math.abs(value - 50);
  const leaningText =
    distance < 8
      ? `${axis.left}과 ${axis.right}이 비슷하지만, 현재는 ${dominant} 쪽에 조금 더 가깝습니다.`
      : distance < 18
        ? `두 성향 중 현재는 ${dominant} 쪽에 조금 더 가까운 흐름입니다.`
        : `지금 답변 흐름은 ${dominant} 성향이 더 분명하게 드러납니다.`;

  return (
    <div className="min-w-0 py-5 md:px-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{axis.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{axis.description}</p>
        </div>
        <div className="shrink-0 whitespace-nowrap border border-[#e1e7ef] bg-[#fbfcfe] px-3 py-1.5 text-center text-xs font-semibold text-foreground">
          {axis.left} ↔ {axis.right}
        </div>
      </div>

      <div className="mt-4 border-t border-[#eef2f6] pt-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-primary">{dominant}</span>
          <span className="text-muted-foreground">쪽에 더 가까움</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{leaningText}</p>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className={cn(isLeftDominant && "font-semibold text-foreground")}>{axis.left}</span>
          <div className="h-px flex-1 bg-[#dfe5ee]" />
          <span className={cn(!isLeftDominant && "font-semibold text-foreground")}>{axis.right}</span>
        </div>
      </div>
    </div>
  );
}

function QuadrantMapCard({
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

  const quadrantSummaryMap: Record<AnalysisHubQuadrantKey, string> = {
    tl: "설계와 시스템 구조를 먼저 보고, 안정과 조율을 우선하는 위치입니다.",
    tr: "실무 문제를 빠르게 파악하되, 리스크와 협업 정렬도 함께 챙기는 위치입니다.",
    bl: "전략적 설계를 바탕으로 실험과 직접 추진까지 함께 끌고 가는 위치입니다.",
    br: "구현과 실험을 빠르게 반복하면서 직접 만들어 검증하는 성향이 강한 위치입니다.",
  };

  return (
    <div className="border-t border-[#dfe5ec] pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
      <div className="flex items-center gap-2 text-lg font-bold">
        <Sparkles className="h-5 w-5 text-primary" />
        디벗 성향 맵
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        실제 세션 평균을 기준으로 현재 답변 성향이 어디에 모이는지 보여줍니다.
      </p>

      <div className="relative mt-5 aspect-square w-full max-w-[260px] border border-[#e1e7ef] bg-[#fbfcfe] p-3">
        <div className="absolute inset-x-1/2 top-5 h-[calc(100%-2.5rem)] w-px -translate-x-1/2 bg-[#dfe5ee]" />
        <div className="absolute inset-y-1/2 left-5 h-px w-[calc(100%-2.5rem)] -translate-y-1/2 bg-[#dfe5ee]" />

        {quadrantLabels.map((quadrant) => (
          <div
            key={quadrant.key}
            className={cn(
              "absolute text-[10px] leading-3",
              quadrant.key === "tl" && "left-3 top-3",
              quadrant.key === "tr" && "right-3 top-3 text-right",
              quadrant.key === "bl" && "bottom-3 left-3",
              quadrant.key === "br" && "bottom-3 right-3 text-right",
              quadrant.key === quadrantKey ? "text-primary" : "text-muted-foreground/70",
            )}
          >
            <p className="text-[11px] font-semibold text-foreground">{quadrant.title}</p>
            <p className={cn("mt-1", quadrant.key === quadrantKey ? "text-primary/80" : "text-muted-foreground/60")}>
              {quadrant.subtitle}
            </p>
          </div>
        ))}

        <div className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[10px] font-medium text-muted-foreground">
          안정 · 조정
        </div>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground">
          실험 · 구축
        </div>
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
          구조 · 시스템
        </div>
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
          탐색 · 구현
        </div>

        <div
          className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-background bg-primary shadow-[0_0_0_7px_rgba(132,204,22,0.16)]"
          style={{ left: `${point.x}%`, top: `${100 - point.y}%` }}
        />
        <div
          className="absolute z-10 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background shadow-sm"
          style={{ left: `${point.x}%`, top: `calc(${100 - point.y}% + 16px)` }}
        >
          {typeName}
        </div>
      </div>

      <div className="mt-4 border-t border-[#eef2f6] pt-4 text-sm">
        <p className="font-medium">{quadrantSummaryMap[quadrantKey]}</p>
        <p className="mt-2 leading-6 text-muted-foreground">
          현재는 {dominantAxisText} 축의 존재감이 가장 크고, {unstableAxisText} 축에서 최근 변동이 큽니다.
          다음에는 {growthAxisText} 축을 조금 더 의식하는 흐름이 적합합니다.
        </p>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="space-y-3 border-t border-[#dfe5ec] py-6">
      <div className="h-4 w-24 rounded-full bg-primary/10" />
      <div className="h-6 w-2/3 rounded-full bg-muted" />
      <div className="h-16 bg-muted/70" />
    </div>
  );
}

function getSessionStatusLabel(status: string) {
  if (status === "pending" || status === "running") return "분석 대기";
  if (status === "failed") return "분석 실패";
  return "분석 완료";
}

export default function InterviewAnalysisPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<AnalysisHubTabKind>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sourceSessions, setSourceSessions] = useState<AnalysisHubSourceSession[]>([]);
  const [displayName, setDisplayName] = useState("회원");
  const [recommendedBlogs, setRecommendedBlogs] = useState<RecommendedBlog[]>([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const res = await fetch("/api/interview/sessions?limit=24", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        if (!json?.success || !Array.isArray(json?.data)) {
          throw new Error(json?.error || "세션 목록을 불러오지 못했습니다.");
        }
        if (!cancelled) {
          setSourceSessions(json.data as AnalysisHubSourceSession[]);
        }
      } catch (error) {
        if (!cancelled) {
          setSessionsError(error instanceof Error ? error.message : "세션 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setSessionsLoading(false);
        }
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const allSessions = useMemo(() => buildAnalysisHubSessions(sourceSessions), [sourceSessions]);
  const filteredSessions = useMemo(
    () => allSessions.filter((session) => selectedTab === "all" || session.kind === selectedTab),
    [allSessions, selectedTab],
  );
  const repeatCounts = useMemo(() => {
    return allSessions.reduce((acc, session) => {
      const key = `${session.kind}:${session.subtitle || session.title}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [allSessions]);
  const recentProfileBase = useMemo(
    () => (allSessions.length > 0 ? allSessions.slice(0, 6) : []),
    [allSessions],
  );
  const interviewTypeStats = useMemo(() => {
    const counts = new Map<string, number>();
    allSessions.forEach((session) => {
      counts.set(session.interviewTypeKey, (counts.get(session.interviewTypeKey) || 0) + 1);
    });

    return INTERVIEW_TYPE_VISUALS.map((visual) => ({
      visual,
      count: counts.get(visual.key) || 0,
    })).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return INTERVIEW_TYPE_VISUALS.findIndex((item) => item.key === a.visual.key)
        - INTERVIEW_TYPE_VISUALS.findIndex((item) => item.key === b.visual.key);
    });
  }, [allSessions]);
  const recentSessionsPreview = useMemo(() => allSessions.slice(0, 3), [allSessions]);
  const representativeInterviewVisual = useMemo(() => {
    const topType = interviewTypeStats.find((item) => item.count > 0)?.visual;
    return topType || getInterviewTypeVisual("posting-fit");
  }, [interviewTypeStats]);
  const representativeAxes = useMemo(
    () => computeRepresentativeAxes(recentProfileBase),
    [recentProfileBase],
  );
  const representativeTypeName = useMemo(() => getTypeName(representativeAxes), [representativeAxes]);
  const representativeLabels = useMemo(
    () => ANALYSIS_HUB_AXES.map((axis) => getAxisLabel(axis, representativeAxes[axis.key])),
    [representativeAxes],
  );
  const quadrantPoint = useMemo(() => getQuadrantPoint(representativeAxes), [representativeAxes]);
  const quadrantKey = useMemo(() => getQuadrantKey(quadrantPoint), [quadrantPoint]);
  const axisTrends = useMemo(() => computeAxisTrends(recentProfileBase), [recentProfileBase]);
  const totalSessions = allSessions.length;
  const totalMockSessions = allSessions.filter((session) => session.kind === "mock").length;
  const totalDefenseSessions = allSessions.filter((session) => session.kind === "defense").length;

  const dominantAxis = ANALYSIS_HUB_AXES
    .map((axis) => ({ axis, distance: Math.abs(representativeAxes[axis.key] - 50) }))
    .sort((a, b) => b.distance - a.distance)[0]?.axis;
  const unstableAxis = ANALYSIS_HUB_AXES
    .map((axis) => ({ axis, movement: Math.abs(axisTrends[axis.key]) }))
    .sort((a, b) => b.movement - a.movement)[0]?.axis;
  const growthAxis = ANALYSIS_HUB_AXES
    .map((axis) => ({ axis, distance: Math.abs(representativeAxes[axis.key] - 50) }))
    .sort((a, b) => a.distance - b.distance)[0]?.axis;

  useEffect(() => {
    let cancelled = false;

    const loadRecommendations = async () => {
      setIsRecommendationsLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let nickname = "회원";
        let techStack: string[] = [];

        if (user) {
          nickname =
            user.user_metadata?.nickname ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "회원";

          const { data: profileRow } = await supabase
            .from("profiles")
            .select("nickname, tech_stack")
            .eq("id", user.id)
            .maybeSingle();
          const profile = profileRow as {
            nickname?: string | null;
            tech_stack?: string[] | null;
          } | null;

          if (profile?.nickname) {
            nickname = profile.nickname;
          }

          if (Array.isArray(profile?.tech_stack)) {
            techStack = profile.tech_stack;
          }
        }

        if (!cancelled) {
          setDisplayName(nickname);
        }

        const { data: blogs, error: blogsError } = await supabase
          .from("blogs")
          .select("*")
          .eq("blog_type", "company")
          .order("published_at", { ascending: false })
          .limit(120);

        if (blogsError) {
          throw blogsError;
        }

        if (!cancelled) {
          const ranked = rankRecommendedBlogs({
            blogs: blogs ?? [],
            sessions: recentProfileBase,
            representativeLabels,
            techStack,
          });
          setRecommendedBlogs(ranked.recommendedBlogs);
        }
      } catch (error) {
        console.error("추천 기술 블로그를 불러오지 못했습니다.", error);
        if (!cancelled) {
          setRecommendedBlogs([]);
        }
      } finally {
        if (!cancelled) {
          setIsRecommendationsLoading(false);
        }
      }
    };

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [recentProfileBase, representativeLabels]);

  const hasSessions = allSessions.length > 0;

  return (
    <div className="min-h-screen bg-white text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-8 md:px-10">
        <section className="border-b border-[#dfe5ec] pb-8">
          <div className="space-y-2">
            <h1 className="flex items-center gap-3 text-4xl font-black tracking-tight">
              <LayoutDashboard className="h-10 w-10 text-primary" />
              나의 인터뷰 분석
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="w-fit rounded-full">
                실세션 기반 허브
              </Badge>
              {sessionsLoading ? (
                <Badge variant="outline" className="rounded-full border-[#e5eaf1] bg-white text-muted-foreground">
                  불러오는 중
                </Badge>
              ) : null}
            </div>
            <p className="text-lg text-muted-foreground">
              실제 모의면접과 포트폴리오 디펜스 결과를 바탕으로 내 4축 성향과 최근 면접 흐름을 확인합니다.
            </p>
          </div>
          {sessionsError ? (
            <div className="rounded-[24px] border border-orange-200 bg-orange-50 px-4 py-4 text-sm text-orange-700">
              세션 목록을 불러오지 못했습니다. {sessionsError}
            </div>
          ) : null}
        </section>

        <section>
          {sessionsLoading ? (
            <LoadingCard />
          ) : (
            <div>
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                <div className="grid min-w-0 gap-8 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
                  <InterviewTypeArtwork visual={representativeInterviewVisual} />

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Badge className="rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
                        대표 면접 유형
                      </Badge>
                      <h2 className="text-3xl font-black tracking-tight">{representativeInterviewVisual.label}</h2>
                      <p className="text-base font-medium text-foreground">{representativeTypeName} · {representativeLabels.join(" · ")}</p>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        {hasSessions
                          ? `${representativeInterviewVisual.reportLens} 최근 ${Math.min(recentProfileBase.length, 6)}개 세션에서는 ${getDominantAxesText(representativeAxes)} 축이 가장 강하게 드러났습니다.`
                          : "아직 분석할 세션이 없어 공고 적합도 면접을 기본 기준으로 표시합니다."}
                      </p>
                    </div>

                    <div className="grid divide-y divide-[#eef2f6] border-y border-[#eef2f6] text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                      {[
                        { label: "총 분석 세션", value: `${totalSessions}회` },
                        { label: "모의면접", value: `${totalMockSessions}회` },
                        { label: "포트폴리오 디펜스", value: `${totalDefenseSessions}회` },
                      ].map((item) => (
                        <div key={item.label} className="py-3 sm:px-4 sm:first:pl-0">
                          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                          <p className="mt-1 font-semibold text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="border-t border-[#dfe5ec] pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">최근 기록</p>
                      <p className="mt-1 text-xs text-muted-foreground">바로 이어서 확인할 세션</p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{recentSessionsPreview.length}개</span>
                  </div>

                  {recentSessionsPreview.length > 0 ? (
                    <div className="mt-4 divide-y divide-[#eef2f6] border-y border-[#eef2f6]">
                      {recentSessionsPreview.map((session) => (
                        <button
                          key={`recent-${session.id}`}
                          type="button"
                          onClick={() => router.push(session.href)}
                          className="group flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-primary/[0.03]"
                        >
                          <div className="relative h-12 w-12 shrink-0">
                            <Image
                              src={session.interviewTypeImage}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-contain drop-shadow-[0_10px_12px_rgba(23,32,51,0.12)]"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold text-primary">
                                {session.interviewTypeLabel}
                              </span>
                              <span className="text-[11px] text-muted-foreground">{session.date}</span>
                            </div>
                            <p className="mt-1 truncate text-sm font-semibold text-foreground">{session.title}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{session.typeName}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-4 py-5 text-sm text-muted-foreground">
                      아직 확인할 기록이 없습니다.
                    </div>
                  )}
                </aside>
              </div>

              <div className="mt-10 rounded-[30px] border border-[#dfe7ef] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 border-b border-[#eef2f6] bg-[#fbfcfe] px-5 py-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-black text-foreground">내 면접 기록</p>
                    <p className="mt-1 text-sm text-muted-foreground">반복 훈련, 분석 상태, 재시도 가능 여부를 한 화면에서 확인합니다.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-xl border border-[#e5eaf1] bg-white p-1">
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
                            "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                            selectedTab === tab.key
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="inline-flex items-center rounded-xl border border-[#e5eaf1] bg-white p-1">
                      {[
                        { key: "cards", label: "카드" },
                        { key: "table", label: "테이블" },
                      ].map((view) => (
                        <button
                          key={view.key}
                          type="button"
                          onClick={() => setViewMode(view.key as "cards" | "table")}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                            viewMode === view.key
                              ? "bg-[#172033] text-white shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {view.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">총 {filteredSessions.length}개</span>
                  </div>
                </div>

                {filteredSessions.length > 0 ? (
                  viewMode === "cards" ? (
                    <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                      {filteredSessions.slice(0, 9).map((session) => {
                        const repeatKey = `${session.kind}:${session.subtitle || session.title}`;
                        const repeatCount = repeatCounts[repeatKey] || 1;
                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => router.push(session.href)}
                            className="group flex min-h-[220px] flex-col rounded-2xl border border-[#dfe7ef] bg-[#fbfcfe] p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="rounded-full bg-[#edf6e6] px-3 py-1 text-[11px] font-black text-[#6f9f3b]">
                                {session.interviewTypeLabel}
                              </span>
                              <span className="text-xs font-bold text-muted-foreground">{session.date}</span>
                            </div>
                            <div className="mt-4 flex items-start gap-3">
                              <div className="relative h-16 w-16 shrink-0">
                                <Image
                                  src={session.interviewTypeImage}
                                  alt=""
                                  fill
                                  sizes="64px"
                                  className="object-contain drop-shadow-[0_14px_14px_rgba(23,32,51,0.12)]"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-base font-black text-foreground">{session.title}</p>
                                <p className="mt-1 truncate text-sm text-muted-foreground">{session.subtitle}</p>
                              </div>
                            </div>
                            <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{session.summary}</p>
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#5f6b7a]">{session.reportLens}</p>
                            <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#4f5b6b] shadow-sm">
                                {getSessionStatusLabel(session.reportStatus)}
                              </span>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#4f5b6b] shadow-sm">
                                반복 {repeatCount}회
                              </span>
                              <span className="ml-auto inline-flex items-center text-xs font-black text-primary">
                                리포트 보기
                                <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="divide-y divide-[#eef2f6] px-5">
                      {filteredSessions.slice(0, 9).map((session) => {
                        const repeatKey = `${session.kind}:${session.subtitle || session.title}`;
                        const repeatCount = repeatCounts[repeatKey] || 1;
                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => router.push(session.href)}
                            className="grid w-full gap-3 py-4 text-left transition-colors hover:bg-primary/[0.03] md:grid-cols-[112px_minmax(0,1fr)_96px_96px_120px_24px] md:items-center"
                          >
                            <span className="text-xs font-black text-primary">
                              {session.kind === "mock" ? "면접" : "디펜스"}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{session.title}</p>
                              <p className="mt-1 truncate text-xs text-muted-foreground">{session.subtitle}</p>
                            </div>
                            <span className="text-xs text-muted-foreground md:text-right">{session.date}</span>
                            <span className="text-xs font-bold text-foreground md:text-right">{repeatCount}회</span>
                            <span className="text-xs font-bold text-muted-foreground md:text-right">
                              {getSessionStatusLabel(session.reportStatus)}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground md:justify-self-end" />
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="m-5 rounded-2xl border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-4 py-6 text-sm text-muted-foreground">
                    아직 분석할 세션이 없습니다. 면접이나 디펜스를 완료하면 여기서 실제 기록 기반 추세를 확인할 수 있습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {!sessionsLoading ? (
          <section className="border-t border-[#dfe5ec] pt-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-lg font-bold">16개 면접 유형 커버리지</p>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  완료된 세션을 면접 유형별로 다시 분류해 어떤 질문 축이 많이 훈련됐는지 보여줍니다.
                </p>
              </div>
              <span className="text-xs font-bold text-muted-foreground">총 {totalSessions}회 반영</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {interviewTypeStats.map(({ visual, count }, index) => {
                const active = count > 0;
                return (
                  <div
                    key={visual.key}
                    className={cn(
                      "group relative min-h-[150px] overflow-hidden border border-[#e3eaf1] bg-[#fbfcfe] p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm",
                      active && "border-primary/30 bg-[#f7fbf3]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground">{visual.label}</p>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{visual.description}</p>
                      </div>
                      <InterviewTypeArtwork visual={visual} size="sm" priority={index === 0} />
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#edf2f7] pt-3">
                      <span className="text-[11px] font-bold uppercase text-muted-foreground">{visual.shortLabel}</span>
                      <span className={cn("text-lg font-black", active ? "text-primary" : "text-[#94a3b8]")}>{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {!sessionsLoading ? (
          <section className="border-t border-[#dfe5ec] pt-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <div className="min-w-0">
                <p className="text-lg font-bold">4축 성향</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  각 축은 최근 세션 답변에서 반복적으로 드러난 설명 방식과 판단 성향을 요약합니다.
                </p>
                <div className="mt-5 grid border-l border-t border-[#e7edf3] md:grid-cols-2">
                  {ANALYSIS_HUB_AXES.map((axis) => (
                    <div key={axis.key} className="min-w-0 border-b border-r border-[#e7edf3]">
                      <AxisCard
                        axis={axis}
                        value={representativeAxes[axis.key]}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <QuadrantMapCard
                point={quadrantPoint}
                quadrantKey={quadrantKey}
                typeName={representativeTypeName}
                dominantAxisText={dominantAxis ? getAxisLabel(dominantAxis, representativeAxes[dominantAxis.key]) : "대표 축"}
                unstableAxisText={unstableAxis ? unstableAxis.label : "최근 변화"}
                growthAxisText={growthAxis ? growthAxis.label : "보완 축"}
              />
            </div>
          </section>
        ) : null}

        <section className="border-t border-[#dfe5ec] pt-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold">
                <Sparkles className="h-5 w-5 text-primary" />
                {displayName}님이 읽어보면 좋을 기술 블로그
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                최근 세션 맥락과 답변 성향을 바탕으로 바로 읽어볼 만한 글을 골랐습니다.
              </p>
            </div>
          </div>

          <div className="mt-5">
            {isRecommendationsLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="min-h-[260px] border border-[#e7edf3] bg-[#fbfcfe] p-4">
                    <div className="h-28 bg-muted/70" />
                    <div className="mt-4 h-3 w-24 rounded-full bg-primary/10" />
                    <div className="mt-3 h-5 w-3/4 rounded-full bg-muted" />
                    <div className="mt-2 h-4 w-full rounded-full bg-muted/70" />
                  </div>
                ))}
              </div>
            ) : recommendedBlogs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {recommendedBlogs.map((blog) => {
                  const visual = resolveBlogVisual(blog, representativeInterviewVisual);
                  return (
                    <a
                      key={blog.id}
                      href={blog.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex min-h-[300px] flex-col overflow-hidden border border-[#dfe7ef] bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]"
                    >
                      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-[#f6f9fc]">
                        {blog.thumbnail_url ? (
                          <Image
                            src={blog.thumbnail_url}
                            alt=""
                            fill
                            unoptimized
                            sizes="(min-width: 768px) 33vw, 100vw"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <InterviewTypeArtwork visual={visual} size="md" />
                        )}
                        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-[#172033] shadow-sm">
                          {blog.author}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {(blog.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={`${blog.id}-${tag}`}
                              className="rounded-full bg-[#f4f6fa] px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 line-clamp-2 text-base font-black leading-6 text-foreground">{blog.title}</p>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{blog.recommendationReason}</p>
                        <div className="mt-auto flex items-center justify-between border-t border-[#edf2f7] pt-3">
                          <span className="text-xs font-medium text-muted-foreground">{formatPublishedDate(blog.published_at)}</span>
                          <span className="flex shrink-0 items-center gap-1 text-xs font-black text-primary">
                            원문 읽기
                            <ExternalLink className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-4 py-6 text-sm text-muted-foreground">
                지금 추천할 기술 블로그를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-[#dfe5ec] py-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">디벗과 다시 연습해볼까요?</p>
              <p className="mt-1 text-sm text-muted-foreground">최근 기록을 기준으로 새 모의면접이나 포트폴리오 디펜스로 바로 이어갈 수 있습니다.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="rounded-full px-5" onClick={() => router.push("/interview")}>
                <Briefcase className="mr-2 h-4 w-4" />
                새 모의면접 시작
              </Button>
              <Button className="rounded-full px-5" onClick={() => router.push("/interview/training/setup")}>
                <GitBranch className="mr-2 h-4 w-4" />
                디펜스 시작
              </Button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
