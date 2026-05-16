import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializeCoverLetter } from "@/lib/job-postings/serialize";

// GET: 특정 자기소개서 상세 조회
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!prisma || !(prisma as any).user_cover_letters) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 설정 중입니다." },
        { status: 503 },
      );
    }
    const row = await (prisma as any).user_cover_letters.findFirst({
      where: { id: params.id, user_id: session.user.id },
    });

    if (!row) {
      return NextResponse.json({ success: false, error: "Cover letter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: serializeCoverLetter(row) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

// PATCH: 특정 자기소개서 수정
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => null)) as any;

    if (!prisma || !(prisma as any).user_cover_letters) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 설정 중입니다." },
        { status: 503 },
      );
    }

    // 소유권 검증
    const existing = await (prisma as any).user_cover_letters.findFirst({
      where: { id: params.id, user_id: session.user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Cover letter not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body?.title === "string") {
      const trimmed = body.title.trim();
      data.title = trimmed.length > 0 ? trimmed : "새 자기소개서";
    }
    if (typeof body?.body === "string") {
      data.body = body.body;
    }
    if (body?.sourceResumeId !== undefined) {
      data.source_resume_id =
        typeof body.sourceResumeId === "string" && body.sourceResumeId.length > 0
          ? body.sourceResumeId
          : null;
    }
    if (body?.sourceIndex !== undefined) {
      data.source_index = typeof body.sourceIndex === "number" ? body.sourceIndex : null;
    }
    if (Array.isArray(body?.tags)) {
      data.tags = body.tags.filter((t: unknown): t is string => typeof t === "string");
    }
    if (typeof body?.isActive === "boolean") {
      data.is_active = body.isActive;
    }
    // target 변경: 본인 소유 공고만 허용, null 명시 해제 가능
    if (body?.targetJobPostingId === null) {
      data.target_job_posting_id = null;
    } else if (typeof body?.targetJobPostingId === "string" && body.targetJobPostingId.length > 0) {
      const owned = await (prisma as any).user_job_postings.findFirst({
        where: { id: body.targetJobPostingId, user_id: session.user.id },
        select: { id: true },
      });
      if (owned) data.target_job_posting_id = owned.id;
    }
    if (body?.targetMeta !== undefined) {
      data.target_meta = body.targetMeta;
    }
    if (Array.isArray(body?.questions)) {
      data.questions = body.questions
        .map((raw: unknown) => {
          if (!raw || typeof raw !== "object") return null;
          const q = raw as Record<string, unknown>;
          const id =
            typeof q.id === "string" && q.id.length > 0
              ? q.id
              : crypto.randomUUID();
          const qTitle = typeof q.title === "string" ? q.title : "";
          if (!qTitle.trim()) return null;
          const answer = typeof q.answer === "string" ? q.answer : "";
          const maxChars =
            typeof q.maxChars === "number" && q.maxChars > 0
              ? Math.floor(q.maxChars)
              : 500;
          const status =
            q.status === "draft" || q.status === "done" ? q.status : "draft";
          return {
            id,
            title: qTitle,
            answer,
            maxChars,
            status,
            updatedAt: new Date().toISOString(),
          };
        })
        .filter(Boolean);
    }
    data.updated_at = new Date();

    const updated = await (prisma as any).user_cover_letters.update({
      where: { id: params.id },
      data,
    });

    // is_active=true 로 설정될 때 같은 user의 다른 자소서는 비활성화
    if (body?.isActive === true) {
      await (prisma as any).user_cover_letters.updateMany({
        where: {
          user_id: session.user.id,
          id: { not: params.id },
        },
        data: { is_active: false },
      });
    }

    return NextResponse.json({ success: true, data: serializeCoverLetter(updated) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

// DELETE: 특정 자기소개서 삭제
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!prisma || !(prisma as any).user_cover_letters) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 설정 중입니다." },
        { status: 503 },
      );
    }

    const existing = await (prisma as any).user_cover_letters.findFirst({
      where: { id: params.id, user_id: session.user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Cover letter not found" }, { status: 404 });
    }

    await (prisma as any).user_cover_letters.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
