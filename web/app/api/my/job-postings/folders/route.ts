import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { serializeFolder } from "@/lib/job-postings/serialize";
import type { ColorPreset } from "@/lib/job-postings/types";

const COLOR_PRESETS = new Set<ColorPreset>([
  "slate", "red", "orange", "amber", "emerald", "sky", "violet", "pink",
]);

function asColor(v: unknown): ColorPreset | null {
  if (typeof v !== "string") return null;
  return COLOR_PRESETS.has(v as ColorPreset) ? (v as ColorPreset) : null;
}

/**
 * GET  /api/my/job-postings/folders
 *   채용공고 분류 폴더 목록 + 각 폴더의 공고 카운트.
 *   응답: { success, data: { items: [{ ...folder, count }], unfiledCount } }
 *
 * POST /api/my/job-postings/folders   { name, color? }
 *   새 폴더 생성. sort_order 는 마지막 순서 + 1.
 */

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const [folders, counts, totalAll, totalFavorites] = await Promise.all([
      prisma.user_job_posting_folders.findMany({
        where: { user_id: session.user.id },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      }),
      prisma.user_job_postings.groupBy({
        by: ["folder_id"],
        where: { user_id: session.user.id },
        _count: { _all: true },
      }),
      prisma.user_job_postings.count({ where: { user_id: session.user.id } }),
      prisma.user_job_postings.count({
        where: { user_id: session.user.id, is_favorite: true },
      }),
    ]);
    const countByFolder = new Map<string | null, number>();
    counts.forEach((c) => countByFolder.set(c.folder_id, c._count._all));

    const items = folders.map((f) => ({
      ...serializeFolder(f),
      count: countByFolder.get(f.id) ?? 0,
    }));
    const unfiledCount = countByFolder.get(null) ?? 0;

    return NextResponse.json({
      success: true,
      data: { items, unfiledCount, totalAll, totalFavorites },
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
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { success: false, error: "name is required" },
      { status: 400 },
    );
  }
  if (name.length > 50) {
    return NextResponse.json(
      { success: false, error: "name must be 50 chars or less" },
      { status: 400 },
    );
  }
  const color = asColor(body?.color);

  try {
    // 마지막 sort_order + 1
    const last = await prisma.user_job_posting_folders.findFirst({
      where: { user_id: session.user.id },
      orderBy: { sort_order: "desc" },
      select: { sort_order: true },
    });
    const nextOrder = (last?.sort_order ?? -1) + 1;

    const created = await prisma.user_job_posting_folders.create({
      data: {
        user_id: session.user.id,
        name,
        color,
        sort_order: nextOrder,
      },
    });
    return NextResponse.json(
      { success: true, data: serializeFolder(created) },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
