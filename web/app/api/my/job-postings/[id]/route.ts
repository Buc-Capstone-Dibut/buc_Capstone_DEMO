import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { validateJobPostingInput } from "@/lib/job-postings/validators";
import { toRecord } from "@/lib/job-postings/serialize";

async function authUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const userId = await authUser();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const row = await prisma.user_job_postings.findFirst({
      where: { id: ctx.params.id, user_id: userId },
      include: { schedules: { orderBy: { start_at: "asc" } }, attachments: true },
    });
    if (!row) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: toRecord(row) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  const userId = await authUser();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = validateJobPostingInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  const v = parsed.value;
  try {
    const updated = await prisma.user_job_postings.updateMany({
      where: { id: ctx.params.id, user_id: userId },
      data: {
        company_name: v.companyName,
        role_title: v.roleTitle,
        posting_url: v.postingUrl ?? null,
        tech_stack: v.techStack ?? [],
        responsibilities: v.responsibilities ?? [],
        requirements: v.requirements ?? [],
        preferred: v.preferred ?? [],
        company_description: v.companyDescription ?? null,
        team_culture: v.teamCulture ?? [],
        memo: v.memo ?? null,
        status: v.status ?? "active",
      },
    });
    if (updated.count === 0) {
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

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const userId = await authUser();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const r = await prisma.user_job_postings.deleteMany({
      where: { id: ctx.params.id, user_id: userId },
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
