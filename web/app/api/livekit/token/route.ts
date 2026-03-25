import { AccessToken } from "livekit-server-sdk";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getWorkspaceLifecycle, isWorkspaceCompleted } from "@/lib/server/workspace-lifecycle";
import { extractAuthProfileSeed } from "@/lib/my-profile";
import {
  buildWorkspaceVoiceRoomName,
  isWorkspaceVoiceRoomAlias,
} from "@/lib/workspace-voice";

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

    let resolvedRoom = room;

    // 1. Authenticate User
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;
    const seed = extractAuthProfileSeed(user);

    if (workspaceId) {
      if (!isWorkspaceVoiceRoomAlias(room)) {
        return NextResponse.json(
          { error: "Invalid workspace voice room" },
          { status: 400 },
        );
      }

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

      resolvedRoom = buildWorkspaceVoiceRoomName(workspaceId, room);
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        nickname: true,
        avatar_url: true,
      },
    });

    const name = profile?.nickname || seed.nickname || seed.email || "Unknown";
    const avatarUrl = profile?.avatar_url || seed.avatarUrl || "";
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

    at.addGrant({ roomJoin: true, room: resolvedRoom });

    return NextResponse.json({
      token: await at.toJwt(),
      room: resolvedRoom,
    });
  } catch (error) {
    console.error("LiveKit Token Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
