import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

function fallbackWorkspaceSummary(stats: {
  workspaceCount: number;
  ownerCount: number;
  memberCount: number;
}) {
  return {
    workspaceCount: stats.workspaceCount,
    ownerCount: stats.ownerCount,
    memberCount: stats.memberCount,
    message: "공개 페이지에서는 워크스페이스 설정 요약만 표시됩니다.",
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { handle: string } },
) {
  try {
    const handle = decodeURIComponent(params.handle || "").trim().toLowerCase();
    if (!handle) {
      return NextResponse.json(
        { success: false, error: "Handle is required" },
        { status: 400 },
      );
    }

    const profile = await prisma.profiles.findUnique({
      where: { handle },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const isOwner = Boolean(session?.user?.id && session.user.id === profile.id);
    const [row, allMemberships] = await Promise.all([
      prisma.user_workspace_settings.findUnique({
        where: { user_id: profile.id },
      }),
      prisma.workspace_members.findMany({
        where: { user_id: profile.id },
        select: { role: true },
      }),
    ]);

    const ownerCount = allMemberships.filter((item) => item.role === "owner").length;
    const memberCount = allMemberships.filter((item) => item.role !== "owner").length;
    const summary =
      row?.public_summary ||
      fallbackWorkspaceSummary({
        workspaceCount: allMemberships.length,
        ownerCount,
        memberCount,
      });

    return NextResponse.json({
      success: true,
      data: {
        isOwner,
        publicSummary: summary,
        settingsPayload: isOwner ? (row?.settings_payload || {}) : null,
        updatedAt: row?.updated_at || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch workspace settings" },
      { status: 500 },
    );
  }
}
