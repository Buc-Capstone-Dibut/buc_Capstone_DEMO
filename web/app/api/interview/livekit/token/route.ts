import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { room, identity, name } = body as {
      room: string;
      identity: string;
      name?: string;
    };

    if (!room || !identity) {
      return NextResponse.json(
        { success: false, error: "room and identity are required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: "LiveKit not configured on server" },
        { status: 503 },
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: name || identity,
      ttl: "2h",
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

    return NextResponse.json({ success: true, data: { token, url } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Token generation failed" },
      { status: 500 },
    );
  }
}
