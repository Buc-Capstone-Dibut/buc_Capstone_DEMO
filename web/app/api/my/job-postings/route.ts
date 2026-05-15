import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { validateJobPostingInput } from "@/lib/job-postings/validators";
import { toRecord } from "@/lib/job-postings/serialize";

type SortKey = "created_desc" | "created_asc" | "deadline_asc" | "company_asc";

const VALID_STATUSES = new Set(["active", "applied", "interviewing", "closed", "archived"]);

function parseSort(raw: string | null): SortKey {
  if (raw === "created_asc" || raw === "deadline_asc" || raw === "company_asc") return raw;
  return "created_desc";
}

function parseStatuses(raw: string | null): string[] | null {
  if (!raw) return null;
  const list = raw.split(",").map((s) => s.trim()).filter((s) => VALID_STATUSES.has(s));
  return list.length > 0 ? list : null;
}

function parseFavorites(raw: string | null): "off" | "top" | "only" {
  if (raw === "top" || raw === "only") return raw;
  return "off";
}

function clampPage(raw: string | null): number {
  const n = Number(raw ?? "1");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function clampPageSize(raw: string | null): number {
  const n = Number(raw ?? "20");
  if (!Number.isFinite(n) || n <= 0) return 20;
  return Math.min(100, Math.floor(n));
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
  const statuses = parseStatuses(url.searchParams.get("status"));
  const q = (url.searchParams.get("q") ?? "").trim();
  const sort = parseSort(url.searchParams.get("sort"));
  const favorites = parseFavorites(url.searchParams.get("favorites"));
  const page = clampPage(url.searchParams.get("page"));
  const pageSize = clampPageSize(url.searchParams.get("pageSize"));
  const folder = url.searchParams.get("folder"); // 'unfiled' | <uuid> | null

  const where: any = { user_id: session.user.id };
  if (statuses) where.status = { in: statuses };
  if (favorites === "only") where.is_favorite = true;
  if (folder === "unfiled") where.folder_id = null;
  else if (folder) where.folder_id = folder;
  if (q) {
    where.OR = [
      { company_name: { contains: q, mode: "insensitive" } },
      { role_title: { contains: q, mode: "insensitive" } },
    ];
  }

  const orderBy: any[] = [];
  if (favorites === "top") orderBy.push({ is_favorite: "desc" });
  switch (sort) {
    case "created_asc":
      orderBy.push({ created_at: "asc" });
      break;
    case "company_asc":
      orderBy.push({ company_name: "asc" });
      break;
    case "deadline_asc":
      orderBy.push({ created_at: "desc" });
      break;
    case "created_desc":
    default:
      orderBy.push({ created_at: "desc" });
      break;
  }

  try {
    const total = await prisma.user_job_postings.count({ where });

    let rows = await prisma.user_job_postings.findMany({
      where,
      orderBy,
      include: {
        schedules: { orderBy: { start_at: "asc" } },
        attachments: true,
      },
      ...(sort === "deadline_asc"
        ? {}
        : { skip: (page - 1) * pageSize, take: pageSize }),
    });

    if (sort === "deadline_asc") {
      const now = Date.now();
      rows = rows
        .map((r) => {
          const next = (r.schedules ?? [])
            .map((s: any) => new Date(s.start_at).getTime())
            .filter((t) => t >= now)
            .sort((a, b) => a - b)[0];
          return { row: r, nextTs: next ?? Number.MAX_SAFE_INTEGER };
        })
        .sort((a, b) => {
          if (favorites === "top") {
            const fa = a.row.is_favorite ? 0 : 1;
            const fb = b.row.is_favorite ? 0 : 1;
            if (fa !== fb) return fa - fb;
          }
          return a.nextTs - b.nextTs;
        })
        .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
        .map((entry) => entry.row);
    }

    return NextResponse.json({
      success: true,
      data: {
        items: rows.map(toRecord),
        page,
        pageSize,
        total,
        hasMore: page * pageSize < total,
      },
    });
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
        folder_id: v.folderId ?? null,
        color: v.color ?? null,
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
