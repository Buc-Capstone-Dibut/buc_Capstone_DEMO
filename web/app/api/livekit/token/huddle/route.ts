import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { AccessToken } from "livekit-server-sdk";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getWorkspaceLifecycle, isWorkspaceCompleted } from "@/lib/server/workspace-lifecycle";

const schema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  username: z.string().optional(),
  workspaceId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.errors },
        { status: 400 }
      );
    }

    const { roomId, username, workspaceId } = result.data;

    // 1. Authenticate User
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    /*
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    */

    // [DEV MODE]: Guest Falback
    const effectiveUser = user || {
        id: "guest-" + Math.floor(Math.random() * 10000),
        email: "guest@dev.local",
        user_metadata: { name: "Guest Developer" }
    };

    if (workspaceId && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (workspaceId && user) {
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

    // 3. Generate Token
    const apiKey = process.env.LIVEKIT_API_KEY_WORKSPACE;
    const apiSecret = process.env.LIVEKIT_API_SECRET_WORKSPACE;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const participantName = username || effectiveUser.user_metadata?.name || effectiveUser.email || "Teammate";
    const participantIdentity = effectiveUser.id;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomId,
    });

    return NextResponse.json({
      token: await at.toJwt(),
    });

  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
