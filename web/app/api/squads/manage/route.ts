import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, squad_id, user_id } = body;

    if (!action || !squad_id || !user_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (action === "accept") {
      // Ensure User Profile Exists (Defensive Check)
      const profile = await prisma.profiles.findUnique({
        where: { id: user_id },
      });

      if (!profile) {
        await prisma.profiles.create({
          data: {
            id: user_id,
            handle: `user-${String(user_id).slice(0, 8).toLowerCase()}`,
            nickname: "User",
          },
        });
      }

      // Transaction: Update App -> Add Member -> Increment Count
      await prisma.$transaction([
        // Update Application
        prisma.squad_applications.updateMany({
          where: { squad_id, user_id },
          data: { status: "accepted" },
        }),
        // Add Member
        prisma.squad_members.create({
          data: {
            squad_id,
            user_id,
            role: "member",
          },
        }),
        // Increment Count
        prisma.squads.update({
          where: { id: squad_id },
          data: { recruited_count: { increment: 1 } },
        }),
      ]);
    } else if (action === "reject") {
      await prisma.squad_applications.updateMany({
        where: { squad_id, user_id },
        data: { status: "rejected" },
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2002") {
      // Member already exists constraint
      console.warn("Member already exists, ignoring duplicate insert attempt");
      return NextResponse.json({ success: true });
    }
    console.error("API: Squad Manage Exception", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
