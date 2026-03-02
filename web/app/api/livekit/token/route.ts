import { AccessToken } from "livekit-server-sdk";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getWorkspaceLifecycle, isWorkspaceCompleted } from "@/lib/server/workspace-lifecycle";

export async function GET(req: NextRequest) {
  try {
    const room = req.nextUrl.searchParams.get("room");
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (!room) {
      return NextResponse.json(
        { error: "Missing 'room' parameter" },
        { status: 400 },
      );
    }

    // 1. Authenticate User
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;

    if (workspaceId) {
      const membership = await prisma.workspace_members.findUnique({
        where: {
          workspace_id_user_id: {
            workspace_id: workspaceId,
            user_id: user.id,
          },
        },
        select: { user_id: true },
      });

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const workspace = await getWorkspaceLifecycle(workspaceId);
      if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }

      if (isWorkspaceCompleted(workspace)) {
        return NextResponse.json(
          { error: "이 워크스페이스는 종료되어 음성 채널에 참여할 수 없습니다." },
          { status: 403 },
        );
      }
    }

    const name =
      user.user_metadata?.nickname ||
      user.user_metadata?.name ||
      user.email ||
      "Unknown";
    const avatarUrl = user.user_metadata?.avatar_url || "";
    const identity = user.id;

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      );
    }

    // 2. Generate Token
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: identity,
        name: name,
        metadata: JSON.stringify({ avatarUrl }),
      },
    );

    at.addGrant({ roomJoin: true, room: room });

    return NextResponse.json({ token: await at.toJwt() });
  } catch (error) {
    console.error("LiveKit Token Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
