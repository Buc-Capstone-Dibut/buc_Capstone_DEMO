import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  WORKSPACE_VOICE_ROOM_ALIASES,
  buildWorkspaceVoiceRoomName,
} from "@/lib/workspace-voice";

export const dynamic = "force-dynamic";

type LiveKitParticipantMetadata = {
  avatarUrl?: string;
};

type LiveKitParticipantSummary = {
  identity: string;
  name?: string | null;
  avatarUrl: string;
  isSpeaking: boolean;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "";

const getErrorCode = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string"
    ? error.code
    : "";

const getErrorStatus = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  typeof error.status === "number"
    ? error.status
    : 0;

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate (Optional but good practice)
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !process.env.LIVEKIT_API_KEY ||
      !process.env.LIVEKIT_API_SECRET ||
      !process.env.NEXT_PUBLIC_LIVEKIT_URL
    ) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      );
    }

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (workspaceId) {
      const membership = await prisma.workspace_members.findUnique({
        where: {
          workspace_id_user_id: {
            workspace_id: workspaceId,
            user_id: session.user.id,
          },
        },
        select: { user_id: true },
      });

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // 2. Init Service Client
    // Note: RoomServiceClient typically expects the HTTP/HTTPS url, but LiveKit cloud often uses WSS.
    // The SDK handles protocol replacement usually, but let's pass the env var directly.
    const svc = new RoomServiceClient(
      process.env.NEXT_PUBLIC_LIVEKIT_URL,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
    );

    // 3. Fetch Participants for target rooms
    const targetRooms = WORKSPACE_VOICE_ROOM_ALIASES.map((roomAlias) => ({
      roomAlias,
      roomName: workspaceId
        ? buildWorkspaceVoiceRoomName(workspaceId, roomAlias)
        : roomAlias,
    }));
    const roomsData: Record<string, LiveKitParticipantSummary[]> = {};

    await Promise.all(
      targetRooms.map(async ({ roomAlias, roomName }) => {
        try {
          const participants = await svc.listParticipants(roomName);
          // Map to simplified objects
          roomsData[roomAlias] = participants.map((p) => {
            let avatarUrl = "";
            try {
              if (p.metadata) {
                const metadata = JSON.parse(
                  p.metadata,
                ) as LiveKitParticipantMetadata;
                avatarUrl = metadata.avatarUrl || "";
              }
            } catch {}

            return {
              identity: p.identity,
              name: p.name,
              avatarUrl: avatarUrl,
              isSpeaking: false, // server side doesn't know speaking status easily w/o webhooks, so ignore
            };
          });
        } catch (error: unknown) {
          // If room doesn't exist, it means 0 participants. This is expected.
          if (
            getErrorMessage(error).includes("not exist") ||
            getErrorCode(error) === "not_found" ||
            getErrorStatus(error) === 404
          ) {
            roomsData[roomAlias] = [];
          } else {
            console.error(
              `[API] Failed to list participants for ${roomName}:`,
              error,
            );
            roomsData[roomAlias] = [];
          }
        }
      }),
    );

    return NextResponse.json(roomsData);
  } catch (error) {
    console.error("LiveKit Rooms Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
