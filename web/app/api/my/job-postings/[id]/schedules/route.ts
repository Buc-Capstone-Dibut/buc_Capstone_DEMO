import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";

const KIND = new Set(["deadline", "document_due", "interview", "other"]);

export async function POST(request: Request, ctx: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as any;
  if (!body || typeof body.startAt !== "string" || !KIND.has(body.kind)) {
    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
  }

  try {
    // 소유 검증
    const own = await prisma.user_job_postings.findFirst({
      where: { id: ctx.params.id, user_id: session.user.id },
      select: { id: true },
    });
    if (!own) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const created = await prisma.user_job_posting_schedules.create({
      data: {
        job_posting_id: ctx.params.id,
        user_id: session.user.id,
        kind: body.kind,
        title: typeof body.title === "string" ? body.title : null,
        start_at: new Date(body.startAt),
        end_at: typeof body.endAt === "string" ? new Date(body.endAt) : null,
        memo: typeof body.memo === "string" ? body.memo : null,
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
