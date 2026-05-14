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
