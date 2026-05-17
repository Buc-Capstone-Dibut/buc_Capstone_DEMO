import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serializeCoverLetter } from "@/lib/job-postings/serialize";

// GET: 사용자의 자기소개서 목록 조회
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!prisma || !(prisma as any).user_cover_letters) {
      return NextResponse.json({ success: true, data: { items: [] } });
    }
    const rows = await (prisma as any).user_cover_letters.findMany({
      where: { user_id: session.user.id },
      orderBy: { updated_at: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { items: rows.map(serializeCoverLetter) },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

// POST: 신규 자기소개서 생성
export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => null)) as any;

    const rawTitle = typeof body?.title === "string" ? body.title.trim() : "";
    const title = rawTitle.length > 0 ? rawTitle : "새 자기소개서";
    const bodyText = typeof body?.body === "string" ? body.body : "";
    const sourceResumeId =
      typeof body?.sourceResumeId === "string" && body.sourceResumeId.length > 0
        ? body.sourceResumeId
        : null;
    const sourceIndex = typeof body?.sourceIndex === "number" ? body.sourceIndex : null;
    const tags = Array.isArray(body?.tags)
      ? body.tags.filter((t: unknown): t is string => typeof t === "string")
      : [];
    // 문항 배열 검증. shape 가 어긋난 항목은 무시한다.
    const questions = Array.isArray(body?.questions)
      ? body.questions
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
          .filter(Boolean)
      : [];

    if (!prisma || !(prisma as any).user_cover_letters) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 설정 중입니다." },
        { status: 503 },
      );
    }

    // target 처리: 공고 FK는 본인 소유만 허용 + 직접 입력 메타는 그대로
    let safeTargetPostingId: string | null = null;
    const rawTargetPostingId =
      typeof body?.targetJobPostingId === "string" ? body.targetJobPostingId : "";
    if (rawTargetPostingId.length > 0) {
      const owned = await (prisma as any).user_job_postings.findFirst({
        where: { id: rawTargetPostingId, user_id: session.user.id },
        select: { id: true },
      });
      if (owned) safeTargetPostingId = owned.id;
    }
    // 자소서가 어떤 이력서 기반이라면 그 이력서의 target을 자동 상속 (명시적 target이 없을 때만)
    if (!safeTargetPostingId && sourceResumeId) {
      const base = await (prisma as any).user_resumes.findFirst({
        where: { id: sourceResumeId, user_id: session.user.id },
        select: { target_job_posting_id: true },
      });
      if (base?.target_job_posting_id) safeTargetPostingId = base.target_job_posting_id;
    }
    const targetMeta =
      body?.targetMeta && typeof body.targetMeta === "object" ? body.targetMeta : null;

    const created = await (prisma as any).user_cover_letters.create({
      data: {
        user_id: session.user.id,
        title,
        body: bodyText,
        questions,
        source_resume_id: sourceResumeId,
        source_index: sourceIndex,
        tags,
        is_active: false,
        target_job_posting_id: safeTargetPostingId,
        target_meta: targetMeta,
      },
    });

    return NextResponse.json(
      { success: true, data: serializeCoverLetter(created) },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
