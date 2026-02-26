import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

function fallbackWorkspaceSummary() {
  return {
    version: 1,
    links: {
      github: "",
      blog: "",
    },
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
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
    const row = await prisma.user_workspace_settings.findUnique({
      where: { user_id: profile.id },
    });
    const summary = row?.public_summary || fallbackWorkspaceSummary();

    return NextResponse.json({
      success: true,
      data: {
        isOwner,
        publicSummary: summary,
        settingsPayload: isOwner ? (row?.settings_payload || {}) : null,
        updatedAt: row?.updated_at || null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to fetch workspace settings"),
      },
      { status: 500 },
    );
  }
}
