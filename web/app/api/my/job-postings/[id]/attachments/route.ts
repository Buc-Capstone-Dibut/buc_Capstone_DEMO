import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";

const TYPES = new Set(["resume", "cover_letter", "portfolio"]);

export async function POST(request: Request, ctx: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as any;
  if (!body || !TYPES.has(body.attachmentType)) {
    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  }

  try {
    const own = await prisma.user_job_postings.findFirst({
      where: { id: ctx.params.id, user_id: session.user.id },
      select: { id: true },
    });
    if (!own) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // 자료 존재 검증
    if (body.attachmentType === "resume" || body.attachmentType === "cover_letter") {
      if (typeof body.resumeId !== "string") {
        return NextResponse.json({ success: false, error: "resumeId 필수" }, { status: 400 });
      }
      const r = await prisma.user_resumes.findFirst({
        where: { id: body.resumeId, user_id: session.user.id },
        select: { id: true, resume_payload: true },
      });
      if (!r) {
        return NextResponse.json({ success: false, error: "이력서 없음" }, { status: 404 });
      }
      if (body.attachmentType === "cover_letter") {
        if (typeof body.coverLetterIndex !== "number") {
          return NextResponse.json(
            { success: false, error: "coverLetterIndex 필수" },
            { status: 400 },
          );
        }
      }
    } else if (body.attachmentType === "portfolio") {
      if (typeof body.portfolioId !== "string") {
        return NextResponse.json({ success: false, error: "portfolioId 필수" }, { status: 400 });
      }
      const p = await prisma.user_portfolios.findFirst({
        where: { id: body.portfolioId, user_id: session.user.id },
        select: { id: true },
      });
      if (!p) {
        return NextResponse.json({ success: false, error: "포트폴리오 없음" }, { status: 404 });
      }
    }

    const created = await prisma.user_job_posting_attachments.create({
      data: {
        job_posting_id: ctx.params.id,
        user_id: session.user.id,
        attachment_type: body.attachmentType,
        resume_id: body.resumeId ?? null,
        cover_letter_index:
          typeof body.coverLetterIndex === "number" ? body.coverLetterIndex : null,
        cover_letter_label:
          typeof body.coverLetterLabel === "string" ? body.coverLetterLabel : null,
        portfolio_id: body.portfolioId ?? null,
      },
    });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
