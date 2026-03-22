import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

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

      await prisma.$transaction(async (tx) => {
        await tx.squad_applications.updateMany({
          where: { squad_id, user_id },
          data: { status: "accepted" },
        });

        const existingSquadMember = await tx.squad_members.findFirst({
          where: { squad_id, user_id },
          select: { id: true },
        });

        if (!existingSquadMember) {
          await tx.squad_members.create({
            data: {
              squad_id,
              user_id,
              role: "member",
            },
          });

          await tx.squads.update({
            where: { id: squad_id },
            data: { recruited_count: { increment: 1 } },
          });
        }

        const linkedWorkspace = await tx.workspaces.findUnique({
          where: { from_squad_id: squad_id },
          select: { id: true, space_status: true },
        });

        if (!linkedWorkspace) {
          return;
        }

        if (linkedWorkspace.space_status === "DRAFT") {
          await tx.workspaces.update({
            where: { id: linkedWorkspace.id },
            data: {
              space_status: "ACTIVE",
              activated_at: new Date(),
            },
          });
        }

        const existingWorkspaceMember = await tx.workspace_members.findUnique({
          where: {
            workspace_id_user_id: {
              workspace_id: linkedWorkspace.id,
              user_id,
            },
          },
        });

        if (!existingWorkspaceMember) {
          await tx.workspace_members.create({
            data: {
              workspace_id: linkedWorkspace.id,
              user_id,
              role: "member",
            },
          });
        }
      });
    } else if (action === "reject") {
      await prisma.squad_applications.updateMany({
        where: { squad_id, user_id },
        data: { status: "rejected" },
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API: Squad Manage Exception", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
