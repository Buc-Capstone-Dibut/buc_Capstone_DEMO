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
      if (typeof body.projectId !== "string" || body.projectId.trim() === "") {
        return NextResponse.json(
          { success: false, error: "projectId 필수" },
          { status: 400 },
        );
      }
      const profile = await prisma.user_resume_profiles.findUnique({
        where: { user_id: session.user.id },
        select: { resume_payload: true },
      });
      const projects = (profile?.resume_payload as any)?.projects as any[] | undefined;
      if (!projects?.some((p: any) => p.id === body.projectId)) {
        return NextResponse.json(
          { success: false, error: "프로필에 존재하지 않는 프로젝트입니다" },
          { status: 404 },
        );
      }
    }

    // label 결정: 신규 방식이면 cover_letter 의 title 우선, 없으면 body.coverLetterLabel
    const coverLetterLabel =
      coverLetterLabelFromRow ??
      (typeof body.coverLetterLabel === "string" ? body.coverLetterLabel : null);

    // snapshot: 첨부 시점의 자료 핵심 필드를 캡처
    let snapshotPayload: Record<string, unknown> | null = null;
    try {
      if (body.attachmentType === "resume" && resumeIdToPersist) {
        const doc = await prisma.user_resumes.findFirst({
          where: { id: resumeIdToPersist, user_id: session.user.id },
          select: { title: true, resume_payload: true },
        });
        if (doc) {
          const p = doc.resume_payload as Record<string, unknown> | null;
          snapshotPayload = {
            title: doc.title,
            name: p?.name,
            careerSummary: p?.careerSummary,
            experienceCount: Array.isArray(p?.experiences) ? (p.experiences as unknown[]).length : 0,
          };
        }
      } else if (body.attachmentType === "cover_letter" && coverLetterId) {
        const doc = await (prisma as any).user_cover_letters.findFirst({
          where: { id: coverLetterId, user_id: session.user.id },
          select: { title: true, body: true, questions: true },
        });
        if (doc) {
          snapshotPayload = {
            title: doc.title,
            bodyLength: (doc.body as string)?.length ?? 0,
            questionCount: Array.isArray(doc.questions) ? (doc.questions as unknown[]).length : 0,
          };
        }
      } else if (body.attachmentType === "portfolio" && body.portfolioId) {
        const doc = await prisma.user_portfolios.findFirst({
          where: { id: body.portfolioId, user_id: session.user.id },
          select: { title: true, template_id: true, format: true },
        });
        if (doc) {
          snapshotPayload = { title: doc.title, templateId: doc.template_id, format: doc.format };
        }
      } else if (body.attachmentType === "project" && body.projectId) {
        const profile = await prisma.user_resume_profiles.findUnique({
          where: { user_id: session.user.id },
          select: { resume_payload: true },
        });
        if (profile) {
          const projects = (profile.resume_payload as any)?.projects as any[] | undefined;
          const proj = projects?.find((p: any) => p.id === body.projectId);
          if (proj) {
            snapshotPayload = {
              name: proj.name,
              period: proj.period,
              techStack: proj.techStack,
              description: proj.description,
            };
          }
        }
      }
    } catch {
      // snapshot 실패해도 첨부 자체는 진행
    }

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
        snapshot_payload: snapshotPayload,
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
