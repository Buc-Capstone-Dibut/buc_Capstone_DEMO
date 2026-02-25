import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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

    // 2. Init Service Client
    // Note: RoomServiceClient typically expects the HTTP/HTTPS url, but LiveKit cloud often uses WSS.
    // The SDK handles protocol replacement usually, but let's pass the env var directly.
    const svc = new RoomServiceClient(
      process.env.NEXT_PUBLIC_LIVEKIT_URL,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
    );

    // 3. Fetch Participants for target rooms
    const targetRooms = ["dev-room", "lounge"];
    const roomsData: Record<string, any[]> = {};

    await Promise.all(
      targetRooms.map(async (roomName) => {
        try {
          const participants = await svc.listParticipants(roomName);
          console.log(
            `[API] Room ${roomName} participants:`,
            participants.length,
          );
          // Map to simplified objects
          roomsData[roomName] = participants.map((p) => {
            let avatarUrl = "";
            try {
              if (p.metadata) {
                avatarUrl = JSON.parse(p.metadata).avatarUrl;
              }
            } catch (e) {}

            return {
              identity: p.identity,
              name: p.name,
              avatarUrl: avatarUrl,
              isSpeaking: false, // server side doesn't know speaking status easily w/o webhooks, so ignore
            };
          });
        } catch (e: any) {
          // If room doesn't exist, it means 0 participants. This is expected.
          if (
            e.message?.includes("not exist") ||
            e.code === "not_found" ||
            e.status === 404
          ) {
            roomsData[roomName] = [];
          } else {
            console.error(
              `[API] Failed to list participants for ${roomName}:`,
              e,
            );
            roomsData[roomName] = [];
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
