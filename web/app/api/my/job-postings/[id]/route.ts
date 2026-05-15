import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { validateJobPostingPartial } from "@/lib/job-postings/validators";
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
  const parsed = validateJobPostingPartial(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  const v = parsed.value;
  const data: Record<string, unknown> = {};
  if (v.companyName !== undefined) data.company_name = v.companyName;
  if (v.roleTitle !== undefined) data.role_title = v.roleTitle;
  if (v.postingUrl !== undefined) data.posting_url = v.postingUrl;
  if (v.techStack !== undefined) data.tech_stack = v.techStack;
  if (v.responsibilities !== undefined) data.responsibilities = v.responsibilities;
  if (v.requirements !== undefined) data.requirements = v.requirements;
  if (v.preferred !== undefined) data.preferred = v.preferred;
  if (v.companyDescription !== undefined) data.company_description = v.companyDescription;
  if (v.teamCulture !== undefined) data.team_culture = v.teamCulture;
  if (v.memo !== undefined) data.memo = v.memo;
  if (v.status !== undefined) data.status = v.status;
  if (v.isFavorite !== undefined) data.is_favorite = v.isFavorite;
  if (v.folderId !== undefined) data.folder_id = v.folderId;
  if (v.color !== undefined) data.color = v.color;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.user_job_postings.updateMany({
      where: { id: ctx.params.id, user_id: userId },
      data,
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
