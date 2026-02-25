import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      type,
      capacity,
      tech_stack,
      place_type,
      location,
      activity_id,
      user_id,
    } = body;

    // Validation
    const missing = [];
    if (!title) missing.push("title");
    if (!content) missing.push("content");
    if (!type) missing.push("type");
    if (!user_id) missing.push("user_id");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const leaderId = user_id;

    // Ensure Basic Profile Exists (Fix for foreign key constraint)
    const profile = await prisma.profiles.findUnique({
      where: { id: leaderId },
    });

    if (!profile) {
      // Create a minimal profile if it doesn't exist
      await prisma.profiles.create({
        data: {
          id: leaderId,
          handle: `user-${String(leaderId).slice(0, 8).toLowerCase()}`,
          nickname: "User", // Default nickname
          // other fields have defaults or are optional
        },
      });
    }

    // Transaction: Create Squad + Add Leader
    const squad = await prisma.$transaction(async (tx) => {
      const newSquad = await tx.squads.create({
        data: {
          title,
          content,
          type,
          capacity: parseInt(capacity),
          tech_stack: tech_stack || [],
          place_type,
          location,
          activity_id: activity_id || null,
          leader_id: leaderId,
          recruited_count: 1,
        },
      });

      await tx.squad_members.create({
        data: {
          squad_id: newSquad.id,
          user_id: leaderId,
          role: "leader",
        },
      });

      return newSquad;
    });

    return NextResponse.json({ success: true, id: squad.id });
  } catch (e: any) {
    console.error("API: Squad Create Exception", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
