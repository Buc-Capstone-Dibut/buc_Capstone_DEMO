import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { resumeAdapter, coverLetterAdapter } from "@/lib/job-postings/import-sources";

type Source = "resume" | "cover_letter" | "portfolio" | "project";

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get("source") as Source | null;
  const id = url.searchParams.get("id");

  const VALID_SOURCES = new Set<Source>(["resume", "cover_letter", "portfolio", "project"]);
  if (!source || !VALID_SOURCES.has(source)) {
    return NextResponse.json(
      { success: false, error: "source must be 'resume', 'cover_letter', 'portfolio', or 'project'" },
      { status: 400 },
    );
  }

  try {
    if (source === "resume") {
      if (!prisma || !(prisma as any).user_resumes) {
        return NextResponse.json(
          { success: false, error: "데이터베이스 연결 설정 중입니다." },
          { status: 503 },
        );
      }
      let row = null as any;
      if (id) {
        row = await (prisma as any).user_resumes.findFirst({
          where: { id, user_id: session.user.id },
        });
      } else {
        // 활성 항목 우선
        row = await (prisma as any).user_resumes.findFirst({
          where: { user_id: session.user.id, is_active: true },
          orderBy: { updated_at: "desc" },
        });
        if (!row) {
          row = await (prisma as any).user_resumes.findFirst({
            where: { user_id: session.user.id },
            orderBy: { updated_at: "desc" },
          });
        }
      }
      if (!row) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }
      const draft = resumeAdapter.extractSuggestion(row);
      const label = row.title || row.source_file_name || "이력서";
      return NextResponse.json({
        success: true,
        data: {
          draft,
          sourceLabel: `이력서: ${label}`,
          suggestedAttachment: { type: "resume" as const, id: row.id },
        },
      });
    }

    if (source === "portfolio") {
      let row = null as any;
      if (id) {
        row = await prisma.user_portfolios.findFirst({
          where: { id, user_id: session.user.id },
          select: { id: true, title: true, template_id: true, format: true },
        });
      } else {
        row = await prisma.user_portfolios.findFirst({
          where: { user_id: session.user.id },
          orderBy: { updated_at: "desc" },
          select: { id: true, title: true, template_id: true, format: true },
        });
      }
      if (!row) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          draft: {},
          sourceLabel: `포트폴리오: ${row.title || "포트폴리오"}`,
          suggestedAttachment: { type: "portfolio" as const, id: row.id },
        },
      });
    }

    if (source === "project") {
      const profile = await prisma.user_resume_profiles.findUnique({
        where: { user_id: session.user.id },
        select: { resume_payload: true },
      });
      const projects = (profile?.resume_payload as any)?.projects as any[] | undefined;
      if (!projects || projects.length === 0) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }
      const proj = id ? projects.find((p: any) => p.id === id) : projects[0];
      if (!proj) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          draft: {},
          sourceLabel: `프로젝트: ${proj.name || "프로젝트"}`,
          suggestedAttachment: { type: "project" as const, id: proj.id, label: proj.name },
        },
      });
    }

    // cover_letter
    if (!prisma || !(prisma as any).user_cover_letters) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 설정 중입니다." },
        { status: 503 },
      );
    }
    let row = null as any;
    if (id) {
      row = await (prisma as any).user_cover_letters.findFirst({
        where: { id, user_id: session.user.id },
      });
    } else {
      row = await (prisma as any).user_cover_letters.findFirst({
        where: { user_id: session.user.id, is_active: true },
        orderBy: { updated_at: "desc" },
      });
      if (!row) {
        row = await (prisma as any).user_cover_letters.findFirst({
          where: { user_id: session.user.id },
          orderBy: { updated_at: "desc" },
        });
      }
    }
    if (!row) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    const draft = coverLetterAdapter.extractSuggestion(row);
    const label = row.title || "자기소개서";
    return NextResponse.json({
      success: true,
      data: {
        draft,
        sourceLabel: `자기소개서: ${label}`,
        suggestedAttachment: { type: "cover_letter" as const, id: row.id },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
