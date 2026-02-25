import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureProfileForUser } from "@/lib/my-profile";

function buildWorkspacePublicSummary(settingsPayload: any) {
  const notifications = settingsPayload?.notifications || {};
  const channels = Array.isArray(settingsPayload?.defaultChannels)
    ? settingsPayload.defaultChannels
    : [];

  return {
    notificationsEnabled: Boolean(notifications?.enabled),
    defaultChannelCount: channels.length,
    visibility: "public-summary",
  };
}

export async function PATCH(req: Request) {
  try {
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

    const user = session.user;
    await ensureProfileForUser({
      userId: user.id,
      nickname: user.user_metadata?.nickname || user.user_metadata?.full_name || null,
      email: user.email ?? null,
    });

    const body = await req.json();
    const settingsPayload = body.settingsPayload || {};
    const publicSummary = body.publicSummary || buildWorkspacePublicSummary(settingsPayload);

    const row = await prisma.user_workspace_settings.upsert({
      where: { user_id: user.id },
      update: {
        settings_payload: settingsPayload,
        public_summary: publicSummary,
      },
      create: {
        user_id: user.id,
        settings_payload: settingsPayload,
        public_summary: publicSummary,
      },
      select: {
        user_id: true,
        public_summary: true,
        settings_payload: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: row.user_id,
        publicSummary: row.public_summary,
        settingsPayload: row.settings_payload,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save workspace settings" },
      { status: 500 },
    );
  }
}
