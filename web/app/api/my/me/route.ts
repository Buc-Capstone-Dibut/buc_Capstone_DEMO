import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";

export const dynamic = "force-dynamic";

export async function GET() {
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
    const seed = extractAuthProfileSeed(user);
    const profile = await ensureProfileForUser({
      userId: user.id,
      nickname: seed.nickname,
      email: seed.email,
      avatarUrl: seed.avatarUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        handle: profile.handle,
        nickname: profile.nickname,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        techStack: profile.tech_stack || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch profile" },
      { status: 500 },
    );
  }
}
