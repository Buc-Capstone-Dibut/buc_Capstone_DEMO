"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ANALYSIS_HUB_AXES,
  AnalysisHubSourceSession,
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
import { getTypeName } from "@/lib/interview/report/dibeot-axis";
import {
  getInterviewTypeVisual,
  INTERVIEW_TYPE_VISUALS,
} from "@/lib/interview/interview-type-visuals";
import { AnalysisHubView } from "@/components/features/interview/analysis/analysis-hub-view";

export default function InterviewAnalysisPage() {
  const router = useRouter();
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sourceSessions, setSourceSessions] = useState<AnalysisHubSourceSession[]>([]);
  const [displayName, setDisplayName] = useState("회원");
  const [recommendedBlogs, setRecommendedBlogs] = useState<RecommendedBlog[]>([]);
  const [recommendationTags, setRecommendationTags] = useState<string[]>([]);
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

  const dominantAxis = ANALYSIS_HUB_AXES
    .map((axis) => ({ axis, distance: Math.abs(representativeAxes[axis.key] - 50) }))
    .sort((a, b) => b.distance - a.distance)[0]?.axis;
  const unstableAxis = ANALYSIS_HUB_AXES
    .map((axis) => ({ axis, movement: Math.abs(axisTrends[axis.key]) }))
    .sort((a, b) => b.movement - a.movement)[0]?.axis;
  const growthAxis = ANALYSIS_HUB_AXES
    .map((axis) => ({ axis, distance: Math.abs(representativeAxes[axis.key] - 50) }))
    .sort((a, b) => a.distance - b.distance)[0]?.axis;

  const dominantAxesText = useMemo(() => getDominantAxesText(representativeAxes), [representativeAxes]);

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
          setRecommendationTags(ranked.resolvedRecommendationTags ?? []);
        }
      } catch (error) {
        console.error("추천 기술 블로그를 불러오지 못했습니다.", error);
        if (!cancelled) {
          setRecommendedBlogs([]);
          setRecommendationTags([]);
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

  return (
    <AnalysisHubView
      displayName={displayName}
      loading={sessionsLoading}
      error={sessionsError}
      blogsLoading={isRecommendationsLoading}
      sessions={allSessions}
      repeatCounts={repeatCounts}
      representativeVisual={representativeInterviewVisual}
      representativeTypeName={representativeTypeName}
      representativeLabels={representativeLabels}
      representativeAxes={representativeAxes}
      quadrantPoint={quadrantPoint}
      quadrantKey={quadrantKey}
      dominantAxisText={dominantAxis ? getAxisLabel(dominantAxis, representativeAxes[dominantAxis.key]) : "대표 축"}
      unstableAxisText={unstableAxis ? unstableAxis.label : "최근 변화"}
      growthAxisText={growthAxis ? growthAxis.label : "보완 축"}
      dominantAxesText={dominantAxesText}
      interviewTypeStats={interviewTypeStats}
      blogs={recommendedBlogs}
      recommendationTags={recommendationTags}
      onNavigate={(href) => router.push(href)}
    />
  );
}
