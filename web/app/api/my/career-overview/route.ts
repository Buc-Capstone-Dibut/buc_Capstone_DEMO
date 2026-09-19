import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import type {
  CareerOverviewData,
  CareerOverviewItem,
} from "@/lib/career-overview";
import prisma from "@/lib/prisma";
import {
  getPortfolioSourceData,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RECENT_ITEM_LIMIT = 4;

const JOB_STATUS_LABELS: Record<string, string> = {
  active: "관심",
  applied: "지원 완료",
  interviewing: "면접 중",
  closed: "마감",
  archived: "보관",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function recentArray<T>(items: T[]) {
  return [...items].reverse().slice(0, RECENT_ITEM_LIMIT);
}

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const userId = session.user.id;
    const [source, resumes, legacyPortfolios, showcasePortfolios, jobPostings] =
      await Promise.all([
        getPortfolioSourceData(userId),
        prisma.user_resumes.findMany({
          where: { user_id: userId },
          orderBy: { updated_at: "desc" },
          select: {
            id: true,
            title: true,
            is_active: true,
            updated_at: true,
          },
        }),
        portfolioDelegate().findMany({
          where: { user_id: userId },
          orderBy: { updated_at: "desc" },
        }),
        showcasePortfolioDelegate().findMany({
          where: { user_id: userId },
          orderBy: { updated_at: "desc" },
        }),
        prisma.user_job_postings.findMany({
          where: { user_id: userId },
          orderBy: { updated_at: "desc" },
          select: {
            id: true,
            company_name: true,
            role_title: true,
            status: true,
            updated_at: true,
          },
        }),
      ]);

    const projects: CareerOverviewItem[] = recentArray(source.projects).map(
      (project, index) => ({
        id: project.id || `project-${index}`,
        title: project.company?.trim() || "제목 없는 프로젝트",
        subtitle:
          project.position?.trim() ||
          project.description?.trim() ||
          "프로젝트 상세 내용을 확인하세요.",
        meta: project.period?.trim() || undefined,
        href: project.id
          ? `/career/projects?projectId=${encodeURIComponent(project.id)}`
          : "/career/projects",
      }),
    );

    const workExperiences: CareerOverviewItem[] = recentArray(
      source.workExperiences,
    ).map((experience, index) => ({
      id: experience.id || `work-experience-${index}`,
      title: experience.company?.trim() || "회사명 미입력",
      subtitle: experience.position?.trim() || "직무 미입력",
      meta: experience.period?.trim() || undefined,
      href: experience.id
        ? `/career/work-experience?experienceId=${encodeURIComponent(experience.id)}`
        : "/career/work-experience",
    }));

    const resumeItems: CareerOverviewItem[] = resumes
      .slice(0, RECENT_ITEM_LIMIT)
      .map((resume) => ({
        id: resume.id,
        title: resume.title?.trim() || "제목 없는 이력서",
        subtitle: resume.is_active ? "현재 사용 중인 이력서" : "저장된 이력서",
        meta: formatDate(resume.updated_at),
        href: `/resume?id=${encodeURIComponent(resume.id)}`,
      }));

    const sortedCoverLetters = [...source.coverLetters].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    const coverLetterItems: CareerOverviewItem[] = sortedCoverLetters
      .slice(0, RECENT_ITEM_LIMIT)
      .map((letter) => ({
        id: letter.id,
        title: letter.title?.trim() || "제목 없는 자기소개서",
        subtitle:
          [letter.company, letter.role].filter(Boolean).join(" · ") ||
          letter.applicationTarget?.trim() ||
          "지원 대상 미입력",
        meta: formatDate(letter.createdAt),
        href: `/career/cover-letters?id=${encodeURIComponent(letter.id)}`,
      }));

    const portfolioItems: CareerOverviewItem[] = [
      ...legacyPortfolios.map((portfolio) => ({
        id: portfolio.id,
        title: portfolio.title?.trim() || "제목 없는 포트폴리오",
        subtitle: portfolio.is_public ? "공개 포트폴리오" : "비공개 포트폴리오",
        meta: formatDate(portfolio.updated_at),
        href: `/career/portfolios/${encodeURIComponent(portfolio.id)}/edit`,
        updatedAt: portfolio.updated_at.getTime(),
      })),
      ...showcasePortfolios.map((portfolio) => ({
        id: portfolio.id,
        title: portfolio.title?.trim() || "제목 없는 포트폴리오",
        subtitle: portfolio.is_public ? "공개 웹 포트폴리오" : "비공개 웹 포트폴리오",
        meta: formatDate(portfolio.updated_at),
        href: `/career/portfolios/showcase-wizard?id=${encodeURIComponent(portfolio.id)}`,
        updatedAt: portfolio.updated_at.getTime(),
      })),
    ]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, RECENT_ITEM_LIMIT)
      .map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        meta: item.meta,
        href: item.href,
      }));

    const jobPostingItems: CareerOverviewItem[] = jobPostings
      .slice(0, RECENT_ITEM_LIMIT)
      .map((posting) => ({
        id: posting.id,
        title: posting.company_name?.trim() || "기업명 미입력",
        subtitle: posting.role_title?.trim() || "직무 미입력",
        meta: `${JOB_STATUS_LABELS[posting.status] || posting.status} · ${formatDate(posting.updated_at)}`,
        href: `/career/job-postings/${encodeURIComponent(posting.id)}`,
      }));

    const data: CareerOverviewData = {
      sections: {
        projects: { total: source.projects.length, items: projects },
        workExperiences: {
          total: source.workExperiences.length,
          items: workExperiences,
        },
        resumes: { total: resumes.length, items: resumeItems },
        coverLetters: {
          total: source.coverLetters.length,
          items: coverLetterItems,
        },
        portfolios: {
          total: legacyPortfolios.length + showcasePortfolios.length,
          items: portfolioItems,
        },
        jobPostings: { total: jobPostings.length, items: jobPostingItems },
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("커리어 요약 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "커리어 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
