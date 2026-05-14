import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { validateJobPostingInput } from "@/lib/job-postings/validators";
import { toRecord } from "@/lib/job-postings/serialize";

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  try {
    const rows = await prisma.user_job_postings.findMany({
      where: {
        user_id: session.user.id,
        ...(status ? { status } : {}),
      },
      orderBy: { created_at: "desc" },
      include: {
        schedules: { orderBy: { start_at: "asc" } },
        attachments: true,
      },
    });

    return NextResponse.json({ success: true, data: { items: rows.map(toRecord) } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = validateJobPostingInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }
  const v = parsed.value;
  try {
    const created = await prisma.user_job_postings.create({
      data: {
        user_id: session.user.id,
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
        schedules:
          v.schedules && v.schedules.length > 0
            ? {
                create: v.schedules.map((s) => ({
                  user_id: session.user.id,
                  kind: s.kind,
                  title: s.title ?? null,
                  start_at: new Date(s.startAt),
                  end_at: s.endAt ? new Date(s.endAt) : null,
                  memo: s.memo ?? null,
                })),
              }
            : undefined,
      },
      include: { schedules: true, attachments: true },
    });
    return NextResponse.json({ success: true, data: toRecord(created) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
