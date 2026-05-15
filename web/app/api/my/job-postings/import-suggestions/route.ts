import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { resumeAdapter, coverLetterAdapter } from "@/lib/job-postings/import-sources";

type Source = "resume" | "cover_letter";

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

  if (!source || (source !== "resume" && source !== "cover_letter")) {
    return NextResponse.json(
      { success: false, error: "source must be 'resume' or 'cover_letter'" },
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
