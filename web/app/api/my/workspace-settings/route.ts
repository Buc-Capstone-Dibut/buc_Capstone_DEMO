import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureProfileForUser } from "@/lib/my-profile";

function sanitizeText(value: unknown, maxLen: number): string {
  return String(value || "").trim().slice(0, maxLen);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

function buildWorkspacePublicSummary(input: unknown) {
  const source = asRecord(input);
  const linksSource = asRecord(source.links);
  const rawLinks = Object.keys(linksSource).length > 0 ? linksSource : source;

  const links = {
    github: sanitizeText(rawLinks.github, 200),
    blog: sanitizeText(rawLinks.blog, 200),
  };

  return {
    version: 1,
    links,
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

    const bodyRaw = await req.json();
    const body = asRecord(bodyRaw);
    const hasSettingsPayload = Object.prototype.hasOwnProperty.call(
      body,
      "settingsPayload",
    );
    const settingsPayload = hasSettingsPayload ? body.settingsPayload : undefined;
    const publicSummary = buildWorkspacePublicSummary(body.publicSummary ?? {});

    const updateData: Record<string, unknown> = {
      public_summary: publicSummary,
    };
    if (hasSettingsPayload) {
      updateData.settings_payload = settingsPayload ?? {};
    }

    const row = await prisma.user_workspace_settings.upsert({
      where: { user_id: user.id },
      update: updateData,
      create: {
        user_id: user.id,
        settings_payload: settingsPayload ?? {},
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
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to save workspace settings"),
      },
      { status: 500 },
    );
  }
}
