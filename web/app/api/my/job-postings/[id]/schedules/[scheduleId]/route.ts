import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";

const KIND = new Set(["deadline", "document_due", "interview", "other"]);

export async function PATCH(
  request: Request,
  ctx: { params: { id: string; scheduleId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as any;
  const data: any = {};
  if (body.kind && KIND.has(body.kind)) data.kind = body.kind;
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.startAt === "string") data.start_at = new Date(body.startAt);
  if (body.endAt === null) data.end_at = null;
  else if (typeof body.endAt === "string") data.end_at = new Date(body.endAt);
  if (typeof body.memo === "string") data.memo = body.memo;

  try {
    const r = await prisma.user_job_posting_schedules.updateMany({
      where: {
        id: ctx.params.scheduleId,
        job_posting_id: ctx.params.id,
        user_id: session.user.id,
      },
      data,
    });
    if (r.count === 0) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _: Request,
  ctx: { params: { id: string; scheduleId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const r = await prisma.user_job_posting_schedules.deleteMany({
      where: {
        id: ctx.params.scheduleId,
        job_posting_id: ctx.params.id,
        user_id: session.user.id,
      },
    });
    if (r.count === 0) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
