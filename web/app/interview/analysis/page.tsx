"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalHeader } from "@/components/layout/global-header";
import {
  ANALYSIS_HUB_AXES,
  AnalysisHubSession,
  AnalysisHubSourceSession,
  AnalysisHubTabKind,
  AnalysisHubQuadrantKey,
  collectRecommendedActions,
  collectRecurringWeaknesses,
  buildAnalysisHubSessions,
  computeAxisTrends,
  computeRepresentativeAxes,
  deriveSessionTags,
  getAxisLabel,
  getDominantAxesText,
  getQuadrantKey,
  getQuadrantPoint,
} from "@/lib/interview/report/analysis-hub";
import { Blog } from "@/lib/supabase";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getTypeName } from "@/lib/interview/report/dibeot-axis";

type RecommendedBlog = Blog & {
  recommendationReason: string;
};

const TECH_STACK_TAG_MAP: Record<string, string[]> = {
  react: ["react", "frontend", "typescript"],
  nextjs: ["nextjs", "react", "typescript", "frontend"],
  typescript: ["typescript", "javascript", "frontend"],
  javascript: ["javascript", "frontend"],
  css: ["css", "frontend", "ui/ux"],
  html: ["html", "frontend"],
  figma: ["ui/ux", "frontend"],
  java: ["java", "backend"],
  spring: ["spring", "java", "backend"],
  springboot: ["spring", "java", "backend"],
  node: ["node", "backend"],
  nodejs: ["node", "backend"],
  nest: ["nest", "node", "backend"],
  nestjs: ["nest", "node", "backend"],
  python: ["python", "backend", "ai"],
  go: ["go", "backend"],
  kotlin: ["kotlin", "mobile"],
  swift: ["swift", "ios", "mobile"],
  flutter: ["flutter", "mobile"],
  reactnative: ["react-native", "mobile"],
  aws: ["aws", "cloud", "devops"],
  docker: ["docker", "devops"],
  kubernetes: ["kubernetes", "devops"],
  sql: ["sql", "data"],
  postgresql: ["postgresql", "sql", "data"],
  mysql: ["mysql", "sql", "data"],
  mongodb: ["mongodb", "data"],
  supabase: ["backend", "database"],
};

const normalizeTechStack = (value: string) => value.toLowerCase().replace(/[\s._-]+/g, "");
const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

function buildRecommendationTags(
  sessions: AnalysisHubSession[],
  representativeLabels: string[],
  techStack: string[],
) {
  const representativeAxes = computeRepresentativeAxes(sessions);
  const tags: string[] = [];

  techStack.forEach((item) => {
    tags.push(...(TECH_STACK_TAG_MAP[normalizeTechStack(item)] ?? []));
  });

  if (representativeAxes.approach >= 50) {
    tags.push("architecture", "system design", "case-study");
  } else {
    tags.push("product", "case-study");
  }

  if (representativeAxes.scope >= 50) {
    tags.push("backend", "scalability", "monitoring");
  } else {
    tags.push("frontend", "typescript", "react");
  }

  if (representativeAxes.decision >= 50) {
    tags.push("monitoring", "sre", "case-study");
  } else {
    tags.push("cicd", "ai", "product");
  }

  if (representativeAxes.execution >= 50) {
    tags.push("api", "java", "spring", "node", "go", "react");
  } else {
    tags.push("business", "product", "case-study");
  }

  representativeLabels.forEach((label) => {
    if (label.includes("시스템")) tags.push("architecture", "backend");
    if (label.includes("구현")) tags.push("frontend", "react", "typescript");
    if (label.includes("안정")) tags.push("monitoring", "sre");
    if (label.includes("실험")) tags.push("product", "case-study", "ai");
    if (label.includes("구축")) tags.push("backend", "api");
    if (label.includes("조정")) tags.push("product", "business");
  });

  tags.push(...deriveSessionTags(sessions));
  return uniq(tags);
}

function getRecommendationReason(blog: Blog, labels: string[]) {
  const lowerTags = (blog.tags ?? []).map((tag) => tag.toLowerCase());

  if (lowerTags.some((tag) => ["architecture", "system design", "scalability"].includes(tag))) {
    return `${labels[0]} · ${labels[1]} 관점으로 읽기 좋은 구조 설계 글`;
  }
  if (lowerTags.some((tag) => ["monitoring", "sre", "case-study"].includes(tag))) {
    return `${labels[2]} 성향과 잘 맞는 운영 · 안정화 사례`;
  }
  if (lowerTags.some((tag) => ["frontend", "react", "typescript", "ui/ux"].includes(tag))) {
    return `최근 구현 흐름과 맞는 프론트엔드 · 인터랙션 관점의 글`;
  }
  if (lowerTags.some((tag) => ["backend", "java", "spring", "node", "go"].includes(tag))) {
    return `서비스 설계와 구현 밀도를 함께 넓혀줄 백엔드 글`;
  }

  return "최근 세션 흐름과 기술 스택을 기준으로 골랐습니다.";
}

function DibeotCharacter({ typeName }: { typeName: string }) {
  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-[36px] bg-primary/10 shadow-inner shadow-primary/5 md:mx-0">
      <div className="absolute -top-3 left-7 h-8 w-8 rounded-full bg-primary/20" />
      <div className="absolute -top-3 right-7 h-8 w-8 rounded-full bg-primary/20" />
      <div className="relative flex h-28 w-28 items-center justify-center rounded-[30px] bg-background shadow-sm">
        <div className="absolute left-5 top-8 h-3 w-3 rounded-full bg-foreground/80" />
        <div className="absolute right-5 top-8 h-3 w-3 rounded-full bg-foreground/80" />
        <div className="absolute top-[52px] h-2 w-7 rounded-full bg-primary/40" />
        <div className="absolute bottom-5 h-6 w-12 rounded-b-[18px] rounded-t-[8px] bg-primary/20" />
        <span className="absolute -bottom-10 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          디벗
        </span>
      </div>
      <span className="sr-only">{typeName} 디벗 캐릭터</span>
    </div>
  );
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
    <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{axis.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{axis.description}</p>
          </div>
          <div className="shrink-0 whitespace-nowrap rounded-2xl border border-[#e7ebf1] bg-[#fbfcfe] px-3 py-1.5 text-center text-xs font-semibold text-foreground">
            {axis.left} ↔ {axis.right}
          </div>
        </div>

        <div className="border-t border-[#eef2f6] pt-4">
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
      </CardContent>
    </Card>
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
    <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          디벗 성향 맵
        </CardTitle>
        <CardDescription>실제 세션 평균을 기준으로 현재 답변 성향이 어디에 모이는지 보여줍니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="relative aspect-square rounded-[28px] border border-[#e7ebf1] bg-[#fbfcfe] p-4">
          <div className="absolute inset-x-1/2 top-6 h-[calc(100%-3rem)] w-px -translate-x-1/2 bg-[#dfe5ee]" />
          <div className="absolute inset-y-1/2 left-6 h-px w-[calc(100%-3rem)] -translate-y-1/2 bg-[#dfe5ee]" />

          {quadrantLabels.map((quadrant) => (
            <div
              key={quadrant.key}
              className={cn(
                "absolute text-[11px] leading-4",
                quadrant.key === "tl" && "left-4 top-4",
                quadrant.key === "tr" && "right-4 top-4",
                quadrant.key === "bl" && "bottom-4 left-4",
                quadrant.key === "br" && "bottom-4 right-4",
                quadrant.key === quadrantKey ? "text-primary" : "text-muted-foreground/70",
              )}
            >
              <p className="text-xs font-semibold text-foreground">{quadrant.title}</p>
              <p className={cn("mt-1", quadrant.key === quadrantKey ? "text-primary/80" : "text-muted-foreground/60")}>
                {quadrant.subtitle}
              </p>
            </div>
          ))}

          <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[11px] font-medium text-muted-foreground">
            안정 · 조정
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-medium text-muted-foreground">
            실험 · 구축
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
            구조 · 시스템
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
            탐색 · 구현
          </div>

          <div
            className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-background bg-primary shadow-[0_0_0_10px_rgba(132,204,22,0.16)]"
            style={{ left: `${point.x}%`, top: `${100 - point.y}%` }}
          />
          <div
            className="absolute z-10 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-[11px] font-semibold text-background shadow-sm"
            style={{ left: `${point.x}%`, top: `calc(${100 - point.y}% + 20px)` }}
          >
            {typeName}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e7ebf1] bg-[#f8fafc] px-4 py-3 text-sm">
          <p className="font-medium">{quadrantSummaryMap[quadrantKey]}</p>
          <p className="mt-1 text-muted-foreground">
            현재는 {dominantAxisText} 축의 존재감이 가장 크고, {unstableAxisText} 축에서 최근 변동이 큽니다.
            다음에는 {growthAxisText} 축을 의식적으로 보완하는 흐름이 적합합니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <CardContent className="space-y-3 p-6">
        <div className="h-4 w-24 rounded-full bg-primary/10" />
        <div className="h-6 w-2/3 rounded-full bg-muted" />
        <div className="h-16 rounded-[18px] bg-muted/70" />
      </CardContent>
    </Card>
  );
}

export default function InterviewAnalysisPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<AnalysisHubTabKind>("all");
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sourceSessions, setSourceSessions] = useState<AnalysisHubSourceSession[]>([]);
  const [displayName, setDisplayName] = useState("회원");
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [recommendedBlogs, setRecommendedBlogs] = useState<RecommendedBlog[]>([]);
  const [resolvedRecommendationTags, setResolvedRecommendationTags] = useState<string[]>([]);
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
  const recentProfileBase = useMemo(
    () => (allSessions.length > 0 ? allSessions.slice(0, 6) : []),
    [allSessions],
  );
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
  const recurringWeaknesses = useMemo(() => collectRecurringWeaknesses(recentProfileBase), [recentProfileBase]);
  const recommendedActions = useMemo(() => collectRecommendedActions(recentProfileBase), [recentProfileBase]);

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

          const { data: profile } = await supabase
            .from("profiles")
            .select("nickname, tech_stack")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.nickname) {
            nickname = profile.nickname;
          }

          if (Array.isArray(profile?.tech_stack)) {
            techStack = profile.tech_stack;
          }
        }

        if (!cancelled) {
          setDisplayName(nickname);
          setProfileTags(techStack);
        }

        const { data: tagRows, error: tagRowsError } = await supabase
          .from("blogs")
          .select("tags")
          .eq("blog_type", "company");

        if (tagRowsError) {
          throw tagRowsError;
        }

        const availableTagSet = new Set(
          (tagRows ?? []).flatMap((row) =>
            Array.isArray(row.tags)
              ? row.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)
              : [],
          ),
        );

        const candidateTags = buildRecommendationTags(recentProfileBase, representativeLabels, techStack);
        const tags = candidateTags.filter((tag) => availableTagSet.has(tag)).slice(0, 8);

        let query = supabase
          .from("blogs")
          .select("*")
          .eq("blog_type", "company")
          .order("published_at", { ascending: false })
          .limit(3);

        if (tags.length > 0) {
          query = query.overlaps("tags", tags);
        }

        const { data: initialData, error } = await query;
        let data = initialData;

        if (error) {
          throw error;
        }

        if (!data || data.length < 3) {
          const fallback = await supabase
            .from("blogs")
            .select("*")
            .eq("blog_type", "company")
            .order("published_at", { ascending: false })
            .limit(3);

          if (fallback.error) {
            throw fallback.error;
          }

          data = fallback.data ?? [];
        }

        if (!cancelled) {
          const fallbackTags =
            ((data as Blog[]) ?? []).flatMap((blog) =>
              Array.isArray(blog.tags)
                ? blog.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)
                : [],
            );

          setResolvedRecommendationTags(tags.length > 0 ? tags : uniq(fallbackTags).slice(0, 8));
          setRecommendedBlogs(
            ((data as Blog[]) ?? []).map((blog) => ({
              ...blog,
              recommendationReason: getRecommendationReason(blog, representativeLabels),
            })),
          );
        }
      } catch (error) {
        console.error("추천 기술 블로그를 불러오지 못했습니다.", error);
        if (!cancelled) {
          setRecommendedBlogs([]);
          setResolvedRecommendationTags([]);
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
    <div className="min-h-screen bg-[#f6f7fb] text-foreground">
      <GlobalHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 md:px-10">
        <section className="space-y-2">
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
              실제 모의면접과 포트폴리오 디펜스 결과를 바탕으로 내 4축 성향과 최근 보완 포인트를 확인합니다.
            </p>
          </div>
          {sessionsError ? (
            <div className="rounded-[24px] border border-orange-200 bg-orange-50 px-4 py-4 text-sm text-orange-700">
              세션 목록을 불러오지 못했습니다. {sessionsError}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          {sessionsLoading ? (
            <>
              <LoadingCard />
              <LoadingCard />
            </>
          ) : (
            <>
              <Card className="overflow-hidden rounded-[32px] border border-[#e7ebf1] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <CardContent className="space-y-6 p-6">
                  <div className="grid gap-8 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
                    <DibeotCharacter typeName={representativeTypeName} />

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Badge className="rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
                          대표 디벗 유형
                        </Badge>
                        <h2 className="text-3xl font-black tracking-tight">{representativeTypeName}</h2>
                        <p className="text-base font-medium text-foreground">{representativeLabels.join(" · ")}</p>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                          {hasSessions
                            ? `최근 ${Math.min(recentProfileBase.length, 6)}개 세션을 종합하면 ${getDominantAxesText(representativeAxes)} 축이 가장 강하게 드러났습니다.`
                            : "아직 분석할 세션이 없어 기본 축을 중립값으로 표시합니다."}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#eef2f6] pt-4 text-sm">
                        {[
                          { label: "총 분석 세션", value: `${totalSessions}회` },
                          { label: "모의면접", value: `${totalMockSessions}회` },
                          { label: "포트폴리오 디펜스", value: `${totalDefenseSessions}회` },
                        ].map((item, index, array) => (
                          <div key={item.label} className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="font-medium">{item.label}</span>
                            <span>:</span>
                            <span className="font-semibold text-foreground">{item.value}</span>
                            {index < array.length - 1 ? <span className="ml-2 text-[#cfd6e2]">|</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[#e7ebf1] bg-white px-5 py-4">
                    <div className="mb-2 flex items-center justify-between gap-4 border-b border-[#eef2f6] pb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">기록 허브</p>
                        <p className="mt-1 text-xs text-muted-foreground">실제 리포트가 생성된 세션만 묶어 보여줍니다.</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="inline-flex items-center rounded-full border border-[#e5eaf1] bg-[#f8fafc] p-1">
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
                                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                                selectedTab === tab.key
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <span className="text-xs font-medium text-muted-foreground">총 {filteredSessions.length}개</span>
                      </div>
                    </div>

                    {filteredSessions.length > 0 ? (
                      <div className="divide-y divide-[#eef2f6]">
                        {filteredSessions.slice(0, 6).map((session) => (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => router.push(session.href)}
                            className="flex w-full items-center justify-between px-1 py-4 text-left transition-colors hover:bg-primary/[0.03]"
                          >
                            <div className="min-w-0 pr-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="rounded-full bg-primary/5 text-primary hover:bg-primary/5">
                                  {session.kind === "mock" ? "모의면접" : "포트폴리오 디펜스"}
                                </Badge>
                                <Badge variant="outline" className="rounded-full border-[#e5eaf1] bg-white text-muted-foreground">
                                  {session.analysisQualityLabel}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{session.date}</span>
                              </div>
                              <p className="mt-2 truncate text-sm font-semibold text-foreground">{session.title}</p>
                              <p className="mt-1 truncate text-xs text-muted-foreground">{session.subtitle}</p>
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{session.summary}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="rounded-full bg-[#f2f4f8] px-3 py-1 text-xs font-medium">{session.typeName}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-4 py-6 text-sm text-muted-foreground">
                        아직 분석할 세션이 없습니다. 면접이나 디펜스를 완료하면 여기서 실제 기록 기반 추세를 확인할 수 있습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <QuadrantMapCard
                point={quadrantPoint}
                quadrantKey={quadrantKey}
                typeName={representativeTypeName}
                dominantAxisText={dominantAxis ? getAxisLabel(dominantAxis, representativeAxes[dominantAxis.key]) : "대표 축"}
                unstableAxisText={unstableAxis ? unstableAxis.label : "최근 변화"}
                growthAxisText={growthAxis ? growthAxis.label : "보완 축"}
              />
            </>
          )}
        </section>

        {!sessionsLoading ? (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {ANALYSIS_HUB_AXES.map((axis) => (
              <AxisCard
                key={axis.key}
                axis={axis}
                value={representativeAxes[axis.key]}
              />
            ))}
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                최근 반복된 보완 포인트
              </CardTitle>
              <CardDescription>최근 실제 세션에서 자주 반복된 약점만 추렸습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recurringWeaknesses.length > 0 ? recurringWeaknesses.map((item, index) => (
                <div key={item} className="rounded-[22px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-[#e5eaf1] bg-white text-muted-foreground">
                      보완 {index + 1}
                    </Badge>
                    <p className="text-sm font-semibold text-foreground">{item}</p>
                  </div>
                </div>
              )) : (
                <div className="rounded-[22px] border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-4 py-6 text-sm text-muted-foreground">
                  아직 반복 약점을 집계할 세션이 충분하지 않습니다.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                다음 추천 훈련 액션
              </CardTitle>
              <CardDescription>실제 세션 리포트에서 자주 반복된 액션만 모았습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedActions.length > 0 ? recommendedActions.map((item, index) => (
                <div key={item} className="rounded-[22px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                      액션 {index + 1}
                    </Badge>
                    <p className="text-sm font-semibold text-foreground">{item}</p>
                  </div>
                </div>
              )) : (
                <div className="rounded-[22px] border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-4 py-6 text-sm text-muted-foreground">
                  아직 추천 액션을 집계할 세션이 충분하지 않습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                {displayName}님이 읽어보면 좋을 기술 블로그
              </CardTitle>
              <CardDescription>
                실제 세션 성향과 기술 스택을 바탕으로, 바로 읽어볼 만한 글만 골라두었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isRecommendationsLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-[22px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
                    <div className="h-3 w-24 rounded-full bg-primary/10" />
                    <div className="mt-3 h-5 w-3/4 rounded-full bg-muted" />
                    <div className="mt-2 h-4 w-full rounded-full bg-muted/70" />
                  </div>
                ))
              ) : recommendedBlogs.length > 0 ? (
                recommendedBlogs.map((blog) => (
                  <a
                    key={blog.id}
                    href={blog.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-start justify-between rounded-[22px] border border-[#e7ebf1] bg-white px-4 py-4 text-left transition-all hover:border-primary/20 hover:bg-primary/[0.03]"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full bg-primary/5 text-primary hover:bg-primary/5">
                          {blog.author}
                        </Badge>
                        {(blog.tags ?? []).slice(0, 2).map((tag) => (
                          <span
                            key={`${blog.id}-${tag}`}
                            className="rounded-full bg-[#f4f6fa] px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">{blog.title}</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{blog.recommendationReason}</p>
                    </div>
                    <span className="mt-1 flex shrink-0 items-center gap-1 rounded-full bg-[#f4f6fa] px-3 py-1 text-xs font-medium text-foreground">
                      원문 읽기
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-4 py-6 text-sm text-muted-foreground">
                  지금 추천할 기술 블로그를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                추천에 반영한 태그
              </CardTitle>
              <CardDescription>
                실제 세션 성향, 최근 기록, 기술 스택에서 겹치는 주제를 우선 반영했습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {resolvedRecommendationTags.length > 0 ? (
                  resolvedRecommendationTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">기본 추천 태그를 준비 중입니다.</span>
                )}
              </div>

              <div className="rounded-[22px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
                <p className="text-sm font-semibold text-foreground">추천 기준</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {representativeLabels.join(" · ")} 흐름과
                  {profileTags.length > 0
                    ? ` ${profileTags.slice(0, 3).join(", ")}`
                    : " 최근 세션에서 드러난 직무 맥락"}
                  을 함께 보고, 바로 도움이 될 만한 원문 글을 우선 보여줍니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="rounded-[30px] border border-[#e7ebf1] bg-white px-6 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">디벗과 다시 연습해볼까요?</p>
              <p className="mt-1 text-sm text-muted-foreground">최근 약점을 기준으로 새 모의면접이나 포트폴리오 디펜스로 바로 이어갈 수 있습니다.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="rounded-full px-5" onClick={() => router.push("/interview")}>
                <Briefcase className="mr-2 h-4 w-4" />
                새 모의면접 시작
              </Button>
              <Button className="rounded-full px-5" onClick={() => router.push("/interview/training")}>
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
