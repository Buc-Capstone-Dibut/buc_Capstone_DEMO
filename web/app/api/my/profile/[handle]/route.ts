import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

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
      select: {
        id: true,
        handle: true,
        nickname: true,
        avatar_url: true,
        bio: true,
        tech_stack: true,
        reputation: true,
        tier: true,
        created_at: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const [
      { data: { session } },
      postCount,
      commentCount,
      workspaceCount,
      resume,
      workspaceSettings,
    ] = await Promise.all([
      supabase.auth.getSession(),
      prisma.posts.count({ where: { author_id: profile.id } }),
      prisma.comments.count({ where: { author_id: profile.id } }),
      prisma.workspace_members.count({ where: { user_id: profile.id } }),
      prisma.user_resume_profiles.findUnique({
        where: { user_id: profile.id },
        select: { public_summary: true, updated_at: true },
      }),
      prisma.user_workspace_settings.findUnique({
        where: { user_id: profile.id },
        select: { public_summary: true, updated_at: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          handle: profile.handle,
          nickname: profile.nickname,
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          techStack: profile.tech_stack || [],
          reputation: profile.reputation ?? 0,
          tier: profile.tier || "씨앗",
          createdAt: profile.created_at,
        },
        stats: {
          postCount,
          commentCount,
          workspaceCount,
        },
        resumeSummary: resume?.public_summary || null,
        workspaceSummary: workspaceSettings?.public_summary || null,
        isOwner: Boolean(session?.user?.id && session.user.id === profile.id),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch public profile";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
