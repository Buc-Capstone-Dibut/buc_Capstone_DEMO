import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";

function labelForKind(kind: string) {
  switch (kind) {
    case "deadline":
      return "마감";
    case "document_due":
      return "서류 마감";
    case "interview":
      return "면접";
    default:
      return "일정";
  }
}

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  try {
    const schedules = await prisma.user_job_posting_schedules.findMany({
      where: {
        user_id: session.user.id,
        ...(from || to
          ? {
              start_at: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        job_posting: {
          select: { id: true, company_name: true, role_title: true, status: true },
        },
      },
      orderBy: { start_at: "asc" },
    });

    const events = schedules.map((s) => ({
      id: s.id,
      jobPostingId: s.job_posting_id,
      title:
        s.title || `${s.job_posting.company_name} · ${labelForKind(s.kind)}`,
      start: s.start_at.toISOString(),
      end: s.end_at?.toISOString() ?? null,
      kind: s.kind,
      company: s.job_posting.company_name,
      role: s.job_posting.role_title,
    }));

    return NextResponse.json({ success: true, data: { events } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
