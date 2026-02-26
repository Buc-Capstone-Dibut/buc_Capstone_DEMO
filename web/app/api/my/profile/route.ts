import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureProfileForUser } from "@/lib/my-profile";

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
    const body = await req.json();
    const profile = await ensureProfileForUser({
      userId: user.id,
      nickname: user.user_metadata?.nickname || user.user_metadata?.full_name || null,
      email: user.email ?? null,
    });

    const updates: any = {};

    if (body.nickname !== undefined) updates.nickname = String(body.nickname || "").slice(0, 50);
    if (body.bio !== undefined) updates.bio = String(body.bio || "").slice(0, 500);
    if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl || null;
    if (body.techStack !== undefined && Array.isArray(body.techStack)) {
      updates.tech_stack = body.techStack
        .map((item: any) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 20);
    }

    const updated = await prisma.profiles.update({
      where: { id: profile.id },
      data: updates,
      select: {
        id: true,
        handle: true,
        nickname: true,
        avatar_url: true,
        bio: true,
        tech_stack: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        handle: updated.handle,
        nickname: updated.nickname,
        avatarUrl: updated.avatar_url,
        bio: updated.bio,
        techStack: updated.tech_stack || [],
        updatedAt: updated.updated_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile" },
      { status: 500 },
    );
  }
}
