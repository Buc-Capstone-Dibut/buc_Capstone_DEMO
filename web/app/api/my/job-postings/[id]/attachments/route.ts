import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";

const TYPES = new Set(["resume", "cover_letter", "portfolio", "project"]);

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
    let coverLetterId: string | null = null;
    let coverLetterLabelFromRow: string | null = null;
    let resumeIdToPersist: string | null = null;
    let coverLetterIndexToPersist: number | null = null;

    if (body.attachmentType === "resume") {
      if (typeof body.resumeId !== "string") {
        return NextResponse.json({ success: false, error: "resumeId 필수" }, { status: 400 });
      }
      const r = await prisma.user_resumes.findFirst({
        where: { id: body.resumeId, user_id: session.user.id },
        select: { id: true },
      });
      if (!r) {
        return NextResponse.json({ success: false, error: "이력서 없음" }, { status: 404 });
      }
      resumeIdToPersist = body.resumeId;
    } else if (body.attachmentType === "cover_letter") {
      // 신규 방식 우선: coverLetterId
      if (typeof body.coverLetterId === "string" && body.coverLetterId.length > 0) {
        const cl = await (prisma as any).user_cover_letters.findFirst({
          where: { id: body.coverLetterId, user_id: session.user.id },
          select: { id: true, title: true },
        });
        if (!cl) {
          return NextResponse.json(
            { success: false, error: "자기소개서 없음" },
            { status: 404 },
          );
        }
        coverLetterId = cl.id;
        coverLetterLabelFromRow = cl.title ?? null;
      } else {
        // legacy: resumeId + coverLetterIndex
        if (typeof body.resumeId !== "string") {
          return NextResponse.json(
            { success: false, error: "coverLetterId 또는 resumeId 필수" },
            { status: 400 },
          );
        }
        if (typeof body.coverLetterIndex !== "number") {
          return NextResponse.json(
            { success: false, error: "coverLetterIndex 필수" },
            { status: 400 },
          );
        }
        const r = await prisma.user_resumes.findFirst({
          where: { id: body.resumeId, user_id: session.user.id },
          select: { id: true, resume_payload: true },
        });
        if (!r) {
          return NextResponse.json({ success: false, error: "이력서 없음" }, { status: 404 });
        }
        resumeIdToPersist = body.resumeId;
        coverLetterIndexToPersist = body.coverLetterIndex;
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
    } else if (body.attachmentType === "project") {
      // project 는 별도 테이블이 없고 user_resume_profiles.resume_payload 의
      // projects[] JSON 안에 있으므로, 클라이언트가 보낸 (projectId, projectLabel)
      // 을 그대로 신뢰해 저장한다. 사용자 본인의 프로필만 읽도록 RLS 가 막아줌.
      if (typeof body.projectId !== "string" || body.projectId.trim() === "") {
        return NextResponse.json(
          { success: false, error: "projectId 필수" },
          { status: 400 },
        );
      }
    }

    // label 결정: 신규 방식이면 cover_letter 의 title 우선, 없으면 body.coverLetterLabel
    const coverLetterLabel =
      coverLetterLabelFromRow ??
      (typeof body.coverLetterLabel === "string" ? body.coverLetterLabel : null);

    const created = await prisma.user_job_posting_attachments.create({
      data: {
        job_posting_id: ctx.params.id,
        user_id: session.user.id,
        attachment_type: body.attachmentType,
        resume_id: resumeIdToPersist,
        cover_letter_index: coverLetterIndexToPersist,
        cover_letter_label: coverLetterLabel,
        cover_letter_id: coverLetterId,
        portfolio_id: body.portfolioId ?? null,
        project_id:
          body.attachmentType === "project" && typeof body.projectId === "string"
            ? body.projectId
            : null,
        project_label:
          body.attachmentType === "project" && typeof body.projectLabel === "string"
            ? body.projectLabel
            : null,
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
