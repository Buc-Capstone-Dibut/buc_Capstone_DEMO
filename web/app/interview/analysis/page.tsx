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
import { Blog } from "@/lib/supabase";
import { supabase } from "@/lib/supabase/client";
import { MOCK_INTERVIEW_LIST } from "@/mocks/interview-data";
import { cn } from "@/lib/utils";

type SessionKind = "mock" | "defense";
type TabKind = "all" | SessionKind;
type AxisKey = "approach" | "scope" | "decision" | "execution";
type AxisPolarity = "A" | "B";

interface AxisDefinition {
  key: AxisKey;
  label: string;
  left: string;
  right: string;
  description: string;
  colorClass: string;
  bgClass: string;
}

interface AxisScores {
  approach: number;
  scope: number;
  decision: number;
  execution: number;
}

interface AnalysisHubSession {
  id: string;
  kind: SessionKind;
  date: string;
  title: string;
  subtitle: string;
  typeName: string;
  summary: string;
  strongestAxis: string;
  weakestAxis: string;
  axes: AxisScores;
  href: string;
}

type QuadrantKey = "tl" | "tr" | "bl" | "br";

interface RecommendedBlog extends Blog {
  recommendationReason: string;
}

const AXES: AxisDefinition[] = [
  {
    key: "approach",
    label: "문제 접근 방식",
    left: "구조형",
    right: "탐색형",
    description: "설계·분석부터 시작하는지, 실험·구현부터 시작하는지",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  {
    key: "scope",
    label: "사고 범위",
    left: "시스템형",
    right: "구현형",
    description: "시스템 구조 중심인지, 코드 구현 중심인지",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  {
    key: "decision",
    label: "의사결정 전략",
    left: "안정형",
    right: "실험형",
    description: "리스크 최소화 우선인지, 빠른 실험·학습 우선인지",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  {
    key: "execution",
    label: "실행 방식",
    left: "구축형",
    right: "조정형",
    description: "직접 구현 중심인지, 구조·협업 조정 중심인지",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
];

const TYPE_NAMES: Record<`${AxisPolarity}${AxisPolarity}${AxisPolarity}${AxisPolarity}`, string> = {
  AAAA: "시스템 엔지니어형",
  AAAB: "아키텍트형",
  AABA: "혁신 엔지니어형",
  AABB: "전략가형",
  ABAA: "장인형 개발자",
  ABAB: "코드 아키텍트형",
  ABBA: "실험적 빌더형",
  ABBB: "기술 전략가형",
  BAAA: "인프라 엔지니어형",
  BAAB: "운영 설계형",
  BABA: "플랫폼 빌더형",
  BABB: "플랫폼 전략형",
  BBAA: "디버깅 전문가형",
  BBAB: "운영 개발자형",
  BBBA: "빌더형",
  BBBB: "스타트업 엔지니어형",
};

const INTERVIEW_AXIS_MAP: AxisScores[] = [
  { approach: 74, scope: 68, decision: 60, execution: 42 },
  { approach: 48, scope: 39, decision: 71, execution: 58 },
  { approach: 70, scope: 63, decision: 44, execution: 61 },
];

const PORTFOLIO_DEFENSE_SESSIONS: AnalysisHubSession[] = [
  {
    id: "defense-1",
    kind: "defense",
    date: "2024-03-22",
    title: "포트폴리오 디펜스",
    subtitle: "협업형 SaaS 플랫폼",
    typeName: "전략가형",
    summary: "시스템 흐름 설명은 좋았고, 구현 기여도는 더 또렷하게 드러낼 필요가 있습니다.",
    strongestAxis: "시스템형",
    weakestAxis: "구축형",
    axes: { approach: 81, scope: 76, decision: 46, execution: 58 },
    href: "/interview/training/portfolio/report?id=defense-1",
  },
  {
    id: "defense-2",
    kind: "defense",
    date: "2024-03-13",
    title: "포트폴리오 디펜스",
    subtitle: "디자인 시스템 리뉴얼",
    typeName: "코드 아키텍트형",
    summary: "품질 기준과 구조 정리는 강점이었고, 실험 기반 의사결정 사례는 보강이 필요합니다.",
    strongestAxis: "구조형",
    weakestAxis: "실험형",
    axes: { approach: 72, scope: 41, decision: 67, execution: 54 },
    href: "/interview/training/portfolio/report?id=defense-2",
  },
  {
    id: "defense-3",
    kind: "defense",
    date: "2024-03-06",
    title: "포트폴리오 디펜스",
    subtitle: "레포 분석 기반 공개 프로젝트",
    typeName: "플랫폼 전략형",
    summary: "플랫폼 맥락 설명은 안정적이었지만, 직접 구현한 장면의 밀도는 조금 약했습니다.",
    strongestAxis: "조정형",
    weakestAxis: "구축형",
    axes: { approach: 45, scope: 73, decision: 49, execution: 69 },
    href: "/interview/training/portfolio/report?id=defense-3",
  },
];

const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

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

const deriveSessionTags = (sessions: AnalysisHubSession[]) => {
  const tags: string[] = [];

  sessions.forEach((session) => {
    const source = `${session.title} ${session.subtitle}`.toLowerCase();

    if (source.includes("frontend")) tags.push("frontend", "react", "typescript", "nextjs");
    if (source.includes("product")) tags.push("product", "ui/ux", "frontend");
    if (source.includes("service") || source.includes("backend")) tags.push("backend", "java", "spring", "node");
    if (source.includes("platform")) tags.push("architecture", "scalability", "backend");
    if (source.includes("design")) tags.push("ui/ux", "css", "frontend");
    if (source.includes("saas")) tags.push("product", "case-study", "architecture");
  });

  return uniq(tags);
};

const buildRecommendationTags = (axes: AxisScores, sessions: AnalysisHubSession[], techStack: string[]) => {
  const tags: string[] = [];

  techStack.forEach((item) => {
    tags.push(...(TECH_STACK_TAG_MAP[normalizeTechStack(item)] ?? []));
  });

  if (axes.approach >= 50) {
    tags.push("architecture", "system design", "case-study");
  } else {
    tags.push("product", "case-study");
  }

  if (axes.scope >= 50) {
    tags.push("backend", "scalability", "monitoring");
  } else {
    tags.push("frontend", "typescript", "react");
  }

  if (axes.decision >= 50) {
    tags.push("monitoring", "sre", "case-study");
  } else {
    tags.push("cicd", "ai", "product");
  }

  if (axes.execution >= 50) {
    tags.push("api", "java", "spring", "node", "go", "react");
  } else {
    tags.push("business", "product", "case-study");
  }

  tags.push(...deriveSessionTags(sessions));

  return uniq(tags);
};

const getRecommendationReason = (blog: Blog, labels: string[]) => {
  const lowerTags = (blog.tags ?? []).map((tag) => tag.toLowerCase());

  if (lowerTags.some((tag) => ["architecture", "system design", "scalability"].includes(tag))) {
    return `${labels[0]} · ${labels[1]} 관점으로 읽기 좋은 구조 설계 글`;
  }
  if (lowerTags.some((tag) => ["monitoring", "sre", "case-study"].includes(tag))) {
    return `${labels[2]} 성향과 잘 맞는 운영 · 안정화 사례`;
  }
  if (lowerTags.some((tag) => ["frontend", "react", "typescript", "ui/ux"].includes(tag))) {
    return `최근 관심 흐름에 맞는 구현 · 인터랙션 관점의 글`;
  }
  if (lowerTags.some((tag) => ["backend", "java", "spring", "node", "go"].includes(tag))) {
    return `서비스 설계와 구현 밀도를 함께 넓혀줄 백엔드 글`;
  }

  return `지금의 디벗 성향과 최근 기록을 기준으로 골랐어요`;
};

const getTypeCode = (axes: AxisScores): `${AxisPolarity}${AxisPolarity}${AxisPolarity}${AxisPolarity}` => {
  const approach = axes.approach >= 50 ? "A" : "B";
  const scope = axes.scope >= 50 ? "A" : "B";
  const decision = axes.decision >= 50 ? "A" : "B";
  const execution = axes.execution >= 50 ? "A" : "B";
  return `${approach}${scope}${decision}${execution}`;
};

const getAxisLabel = (axis: AxisDefinition, value: number) => (value >= 50 ? axis.left : axis.right);

const getDominantAxesText = (axes: AxisScores) =>
  AXES.map((axis) => ({ label: getAxisLabel(axis, axes[axis.key]), score: Math.abs(axes[axis.key] - 50) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.label)
    .join(" · ");

const getWeakAxisLabel = (axes: AxisScores) =>
  AXES.map((axis) => ({ axis, distance: Math.abs(axes[axis.key] - 50) }))
    .sort((a, b) => a.distance - b.distance)[0]?.axis;

const getQuadrantPoint = (axes: AxisScores) => ({
  x: Math.round(((100 - axes.approach) + (100 - axes.scope)) / 2),
  y: Math.round((axes.decision + (100 - axes.execution)) / 2),
});

const getQuadrantKey = (point: { x: number; y: number }): QuadrantKey => {
  if (point.y >= 50 && point.x < 50) return "tl";
  if (point.y >= 50 && point.x >= 50) return "tr";
  if (point.y < 50 && point.x < 50) return "bl";
  return "br";
};

const buildMockInterviewSessions = (): AnalysisHubSession[] =>
  MOCK_INTERVIEW_LIST.map((session, index) => {
    const axes = INTERVIEW_AXIS_MAP[index] ?? INTERVIEW_AXIS_MAP[0];
    const typeName = TYPE_NAMES[getTypeCode(axes)];
    const weakAxis = getWeakAxisLabel(axes);

    return {
      id: session.id,
      kind: "mock",
      date: session.date,
      title: `${session.company} 모의면접`,
      subtitle: session.role,
      typeName,
      summary: session.analysis.feedback.improvements[0] ?? "상세 결과에서 세부 피드백을 확인하세요.",
      strongestAxis: getDominantAxesText(axes),
      weakestAxis: weakAxis ? getAxisLabel(weakAxis, axes[weakAxis.key] >= 50 ? 100 - axes[weakAxis.key] : axes[weakAxis.key]) : "균형형",
      axes,
      href: `/interview/result?id=${session.id}`,
    };
  });

const ALL_SESSIONS: AnalysisHubSession[] = [...buildMockInterviewSessions(), ...PORTFOLIO_DEFENSE_SESSIONS].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
);

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
  axis: AxisDefinition;
  value: number;
}) {
  const isLeftDominant = value >= 50;
  const dominant = isLeftDominant ? axis.left : axis.right;
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
          <div
            className={cn(
              "shrink-0 whitespace-nowrap rounded-2xl border border-[#e7ebf1] bg-[#fbfcfe] px-3 py-1.5 text-center text-xs font-semibold text-foreground",
            )}
          >
            {axis.left} ↔ {axis.right}
          </div>
        </div>

        <div className="border-t border-[#eef2f6] pt-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={cn("font-semibold", axis.colorClass)}>{dominant}</span>
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
  quadrantKey: QuadrantKey;
  typeName: string;
  dominantAxisText: string;
  unstableAxisText: string;
  growthAxisText: string;
}) {
  const quadrantLabels: Array<{ key: QuadrantKey; title: string; subtitle: string }> = [
    { key: "tl", title: "구조 · 시스템", subtitle: "안정 · 조정" },
    { key: "tr", title: "탐색 · 구현", subtitle: "안정 · 조정" },
    { key: "bl", title: "구조 · 시스템", subtitle: "실험 · 구축" },
    { key: "br", title: "탐색 · 구현", subtitle: "실험 · 구축" },
  ];

  const quadrantSummaryMap: Record<QuadrantKey, string> = {
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
        <CardDescription>가로축은 문제 접근 방식 + 사고 범위를, 세로축은 의사결정 전략 + 실행 방식을 합쳐 보여줍니다.</CardDescription>
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
                quadrant.key === quadrantKey
                  ? "text-primary"
                  : "text-muted-foreground/70",
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
          <p className="mt-1 text-muted-foreground">현재는 {dominantAxisText} 축의 존재감이 가장 크고, {unstableAxisText} 축에서 최근 변동이 큽니다. 다음에는 {growthAxisText} 축을 의식적으로 보완하는 흐름이 적합합니다.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InterviewAnalysisPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<TabKind>("all");
  const [displayName, setDisplayName] = useState("회원");
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [recommendedBlogs, setRecommendedBlogs] = useState<RecommendedBlog[]>([]);
  const [resolvedRecommendationTags, setResolvedRecommendationTags] = useState<string[]>([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(true);

  const filteredSessions = useMemo(() => {
    return ALL_SESSIONS.filter((session) => selectedTab === "all" || session.kind === selectedTab);
  }, [selectedTab]);

  const recentSessions = useMemo(() => ALL_SESSIONS.slice(0, 5), []);
  const recentProfileBase = useMemo(
    () => (recentSessions.length > 0 ? recentSessions : ALL_SESSIONS),
    [recentSessions],
  );
  const representativeAxes = useMemo(
    () =>
      AXES.reduce((acc, axis) => {
        const total = recentProfileBase.reduce((sum, session) => sum + session.axes[axis.key], 0);
        acc[axis.key] = Math.round(total / recentProfileBase.length);
        return acc;
      }, {} as AxisScores),
    [recentProfileBase],
  );
  const representativeTypeName = TYPE_NAMES[getTypeCode(representativeAxes)];
  const representativeLabels = useMemo(
    () => AXES.map((axis) => getAxisLabel(axis, representativeAxes[axis.key])),
    [representativeAxes],
  );
  const quadrantPoint = getQuadrantPoint(representativeAxes);
  const quadrantKey = getQuadrantKey(quadrantPoint);

  const axisTrends = useMemo(
    () =>
      AXES.reduce((acc, axis) => {
        const recent = recentProfileBase.slice(0, 3);
        const previous = recentProfileBase.slice(3, 6);
        const recentAvg =
          recent.length > 0 ? recent.reduce((sum, session) => sum + session.axes[axis.key], 0) / recent.length : 0;
        const previousAvg =
          previous.length > 0 ? previous.reduce((sum, session) => sum + session.axes[axis.key], 0) / previous.length : recentAvg;
        acc[axis.key] = Math.round(recentAvg - previousAvg);
        return acc;
      }, {} as Record<AxisKey, number>),
    [recentProfileBase],
  );

  const dominantAxis = AXES.map((axis) => ({
    axis,
    distance: Math.abs(representativeAxes[axis.key] - 50),
  })).sort((a, b) => b.distance - a.distance)[0]?.axis;
  const unstableAxis = AXES.map((axis) => ({
    axis,
    movement: Math.abs(axisTrends[axis.key]),
  })).sort((a, b) => b.movement - a.movement)[0]?.axis;
  const growthAxis = AXES.map((axis) => ({
    axis,
    distance: Math.abs(representativeAxes[axis.key] - 50),
  })).sort((a, b) => a.distance - b.distance)[0]?.axis;

  const totalSessions = ALL_SESSIONS.length;
  const totalMockSessions = ALL_SESSIONS.filter((session) => session.kind === "mock").length;
  const totalDefenseSessions = ALL_SESSIONS.filter((session) => session.kind === "defense").length;

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

        const candidateTags = buildRecommendationTags(representativeAxes, recentProfileBase, techStack);
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

    loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [recentProfileBase, representativeAxes, representativeLabels]);

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
            <Badge variant="secondary" className="w-fit rounded-full">
              데모 리포트 데이터
            </Badge>
            <p className="text-lg text-muted-foreground">
              면접과 포트폴리오 디펜스 기록을 바탕으로 내 4축 성향과 전체 흐름을 확인합니다.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
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
                    <p className="text-base font-medium text-foreground">
                      {representativeLabels.join(" · ")}
                    </p>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      최근 면접과 디펜스 기록을 종합하면, 설계를 먼저 정리하고 구조와 안정성을 중시하는 방향이 가장 강하게 드러났습니다.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#eef2f6] pt-4 text-sm">
                    {[
                      { label: "총 세션", value: `${totalSessions}회` },
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
                    <p className="mt-1 text-xs text-muted-foreground">면접과 디펜스 기록 중 필요한 결과만 바로 확인할 수 있습니다.</p>
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
                          onClick={() => setSelectedTab(tab.key as TabKind)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                            selectedTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <span className="text-xs font-medium text-muted-foreground">총 {filteredSessions.length}개</span>
                  </div>
                </div>

                <div className="divide-y divide-[#eef2f6]">
                  {filteredSessions.slice(0, 3).map((session) => (
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
                          <span className="text-xs text-muted-foreground">{session.date}</span>
                        </div>
                        <p className="mt-2 truncate text-sm font-semibold text-foreground">{session.title}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{session.subtitle}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="rounded-full bg-[#f2f4f8] px-3 py-1 text-xs font-medium">{session.typeName}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <QuadrantMapCard
            point={quadrantPoint}
            quadrantKey={quadrantKey}
            typeName={representativeTypeName}
            dominantAxisText={dominantAxis ? getAxisLabel(dominantAxis, representativeAxes[dominantAxis.key]) : "대표"}
            unstableAxisText={unstableAxis ? unstableAxis.label : "최근 변화"}
            growthAxisText={growthAxis ? growthAxis.label : "보완"}
          />
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {AXES.map((axis) => (
            <AxisCard
              key={axis.key}
              axis={axis}
              value={representativeAxes[axis.key]}
            />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                {displayName}님이 읽어보면 좋을 기술 블로그
              </CardTitle>
              <CardDescription>
                최근 면접 성향과 기술 스택을 바탕으로, 바로 읽어볼 만한 글만 골라두었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isRecommendationsLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[22px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4"
                  >
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
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {blog.recommendationReason}
                      </p>
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
                디벗 성향, 최근 기록, 기술 스택에서 겹치는 주제들을 우선 반영했습니다.
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
                    : " 최근 면접에서 드러난 직무 맥락"}
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
              <p className="mt-1 text-sm text-muted-foreground">대표 유형을 유지할지, 반대 축을 키울지 선택해 다음 연습으로 이어갈 수 있습니다.</p>
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
