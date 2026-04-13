import assert from "node:assert/strict";
import test from "node:test";

import { buildAnalysisHubSessions } from "@/lib/interview/report/analysis-hub";
import { rankRecommendedBlogs } from "@/lib/interview/report/blog-recommendations";
import { Blog } from "@/lib/supabase";

function createCompanyBlog(overrides: Partial<Blog> & Pick<Blog, "id" | "title" | "published_at" | "external_url" | "author">): Blog {
  return {
    id: overrides.id,
    title: overrides.title,
    summary: overrides.summary ?? "",
    author: overrides.author,
    tags: overrides.tags ?? [],
    published_at: overrides.published_at,
    thumbnail_url: null,
    external_url: overrides.external_url,
    views: overrides.views ?? 0,
    blog_type: "company",
    category: overrides.category ?? "BE",
    created_at: overrides.created_at ?? overrides.published_at,
    updated_at: overrides.updated_at ?? overrides.published_at,
  };
}

test("blog recommendations prioritize weakness and action matches over generic tech tags", () => {
  const sessions = buildAnalysisHubSessions([
    {
      id: "live-1",
      sessionType: "live_interview",
      mode: "video",
      targetDurationSec: 600,
      company: "Dibut",
      role: "Backend Engineer",
      createdAt: 1713000000,
      analysis: {
        overallScore: 81,
        passProbability: 74,
        evaluation: { jobFit: 79, logic: 83, communication: 75, attitude: 72 },
        sentimentTimeline: [],
        habits: [],
        feedback: {
          strengths: ["구조적으로 설명했습니다."],
          improvements: ["성과 수치를 더 분명히 말하기"],
        },
        bestPractices: [],
      },
      reportView: {
        sessionType: "live_interview",
        analysisMode: "full",
        summary: "백엔드 서비스 구조와 응답 지표를 설명했습니다.",
        strengths: ["구조적으로 설명했습니다."],
        improvements: ["성과 수치를 더 분명히 말하기"],
        nextActions: ["답변 첫 문장에서 결론 먼저 말하기", "설계 근거를 구조적으로 설명하기"],
        profile: {
          axes: { approach: 82, scope: 66, decision: 70, execution: 64 },
          typeName: "아키텍트형",
          typeLabels: ["구조형", "시스템형", "안정형", "구축형"],
        },
      },
    },
  ]);

  const blogs = [
    createCompanyBlog({
      id: 1,
      title: "성과 지표로 서비스 개선을 설명하는 법",
      summary: "응답 시간, 지표, 성능 개선 근거를 정리하는 사례입니다.",
      tags: ["case-study", "monitoring"],
      published_at: "2026-04-01T00:00:00.000Z",
      external_url: "https://example.com/1",
      author: "Dibut",
    }),
    createCompanyBlog({
      id: 2,
      title: "React hydration 최적화 메모",
      summary: "프론트엔드 렌더링 성능 이야기입니다.",
      tags: ["react", "frontend", "typescript"],
      published_at: "2026-04-02T00:00:00.000Z",
      external_url: "https://example.com/2",
      author: "Dibut",
    }),
  ];

  const result = rankRecommendedBlogs({
    blogs,
    sessions,
    representativeLabels: ["구조형", "시스템형", "안정형", "구축형"],
    techStack: ["React", "Spring"],
  });

  assert.equal(result.recommendedBlogs[0]?.id, 1);
  assert.ok(result.recommendedBlogs[0]?.recommendationReason.includes("설계 근거를 구조적으로 설명하기"));
  assert.equal(result.recommendedBlogs[0]?.recommendationReason.includes("도입"), false);
  assert.equal(result.recommendedBlogs[0]?.recommendationReason.includes("있는"), false);
  assert.ok(result.resolvedRecommendationTags.includes("case-study"));
});

test("blog recommendations surface action and weakness derived tags before fallback latest posts", () => {
  const sessions = buildAnalysisHubSessions([
    {
      id: "live-2",
      sessionType: "live_interview",
      mode: "video",
      targetDurationSec: 600,
      company: "Dibut",
      role: "Platform Engineer",
      createdAt: 1714000000,
      analysis: {
        overallScore: 78,
        passProbability: 68,
        evaluation: { jobFit: 75, logic: 79, communication: 72, attitude: 70 },
        sentimentTimeline: [],
        habits: [],
        feedback: {
          strengths: ["구조가 안정적입니다."],
          improvements: ["장애 대응과 모니터링 근거를 더 또렷하게 말하기"],
        },
        bestPractices: [],
      },
      reportView: {
        sessionType: "live_interview",
        analysisMode: "full",
        summary: "플랫폼 안정화와 모니터링 대응 경험을 설명했습니다.",
        strengths: ["구조가 안정적입니다."],
        improvements: ["장애 대응과 모니터링 근거를 더 또렷하게 말하기"],
        nextActions: ["장애 복구 순서를 명확히 설명하기"],
        profile: {
          axes: { approach: 80, scope: 70, decision: 74, execution: 60 },
          typeName: "플랫폼형",
          typeLabels: ["구조형", "시스템형", "안정형", "구축형"],
        },
      },
    },
  ]);

  const blogs = [
    createCompanyBlog({
      id: 10,
      title: "SRE 모니터링 체계 다시 세우기",
      summary: "장애 대응 순서와 운영 안정화 사례를 다룹니다.",
      tags: ["monitoring", "sre", "case-study"],
      published_at: "2026-03-20T00:00:00.000Z",
      external_url: "https://example.com/10",
      author: "Dibut",
    }),
    createCompanyBlog({
      id: 11,
      title: "최신 사내 소식",
      summary: "기술 태그가 거의 없는 일반 글입니다.",
      tags: ["culture"],
      published_at: "2026-04-05T00:00:00.000Z",
      external_url: "https://example.com/11",
      author: "Dibut",
    }),
  ];

  const result = rankRecommendedBlogs({
    blogs,
    sessions,
    representativeLabels: ["구조형", "시스템형", "안정형", "구축형"],
    techStack: ["AWS"],
  });

  assert.equal(result.recommendedBlogs[0]?.id, 10);
  assert.ok(result.recommendedBlogs[0]?.recommendationReason.includes("장애 복구 순서를 명확히 설명하기"));
  assert.ok(result.recommendedBlogs[0]?.matchedTags.includes("monitoring"));
  assert.ok(result.resolvedRecommendationTags.includes("monitoring"));
});
