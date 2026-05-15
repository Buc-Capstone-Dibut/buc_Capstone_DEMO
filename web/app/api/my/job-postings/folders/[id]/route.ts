import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { serializeFolder } from "@/lib/job-postings/serialize";
import type { ColorPreset } from "@/lib/job-postings/types";

const COLOR_PRESETS = new Set<ColorPreset>([
  "slate", "red", "orange", "amber", "emerald", "sky", "violet", "pink",
]);

/**
 * PATCH  /api/my/job-postings/folders/[id]   { name?, color?, sortOrder? }
 *   폴더 이름·색·정렬 변경.
 *
 * DELETE /api/my/job-postings/folders/[id]
 *   폴더 삭제. 공고는 유지되고 folder_id 만 NULL 로 변경 (DB FK ON DELETE SET NULL).
 */

export async function PATCH(
  request: Request,
  ctx: { params: { id: string } },
) {
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
  const data: Record<string, unknown> = {};

  if (body && typeof body === "object") {
    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { success: false, error: "name must be non-empty string" },
          { status: 400 },
        );
      }
      data.name = body.name.trim().slice(0, 50);
    }
    if ("color" in body) {
      if (body.color === null) data.color = null;
      else if (
        typeof body.color === "string" &&
        COLOR_PRESETS.has(body.color as ColorPreset)
      ) {
        data.color = body.color;
      } else {
        return NextResponse.json(
          { success: false, error: "color must be one of presets or null" },
          { status: 400 },
        );
      }
    }
    if ("sortOrder" in body) {
      if (typeof body.sortOrder !== "number" || !Number.isFinite(body.sortOrder)) {
        return NextResponse.json(
          { success: false, error: "sortOrder must be number" },
          { status: 400 },
        );
      }
      data.sort_order = Math.floor(body.sortOrder);
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { success: false, error: "No fields to update" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.user_job_posting_folders.updateMany({
      where: { id: ctx.params.id, user_id: session.user.id },
      data,
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }
    const row = await prisma.user_job_posting_folders.findUnique({
      where: { id: ctx.params.id },
    });
    return NextResponse.json({
      success: true,
      data: row ? serializeFolder(row) : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
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
    const r = await prisma.user_job_posting_folders.deleteMany({
      where: { id: ctx.params.id, user_id: session.user.id },
    });
    if (r.count === 0) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
