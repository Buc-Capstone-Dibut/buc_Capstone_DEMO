import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { squad_id, user_id, message } = body;

    // Validation
    const missing = [];
    if (!squad_id) missing.push("squad_id");
    if (!user_id) missing.push("user_id");
    if (!message) missing.push("message");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    // Ensure Profile Exists
    const profile = await prisma.profiles.findUnique({
      where: { id: user_id },
    });

    if (!profile) {
      // Create a minimal profile if it doesn't exist
      await prisma.profiles.create({
        data: {
          id: user_id,
          handle: `user-${String(user_id).slice(0, 8).toLowerCase()}`,
          nickname: "User", // Default nickname
        },
      });
    }

    // Insert Application via Prisma
    await prisma.squad_applications.create({
      data: {
        squad_id,
        user_id,
        message,
        status: "pending",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "이미 지원하셨습니다." },
        { status: 409 },
      );
    }
    console.error("API: Application Insert Exception", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
