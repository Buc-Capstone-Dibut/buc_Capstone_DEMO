import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { isTeamType, normalizeTeamType } from "@/lib/team-types";
import { normalizeWorkspaceCategory } from "@/lib/server/workspace-bootstrap";

export const dynamic = "force-dynamic";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const userId = session.user.id;

    // Verify ownership
    const squad = await prisma.squads.findUnique({
      where: { id },
      select: { leader_id: true },
    });

    if (!squad) {
      return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    }

    if (squad.leader_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own squads" },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const linkedWorkspace = await tx.workspaces.findUnique({
        where: { from_squad_id: id },
        select: { id: true },
      });

      if (linkedWorkspace) {
        await tx.workspaces.delete({
          where: { id: linkedWorkspace.id },
        });
      }

      await tx.squads.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API: Delete Squad Error", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

// Update Squad (Status or Content)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const userId = session.user.id;
    const body = await request.json();

    // Verify ownership
    const squad = await prisma.squads.findUnique({
      where: { id },
      select: { leader_id: true, status: true },
    });

    if (!squad) {
      return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    }

    if (squad.leader_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine if it's a status update or full edit
    // If body contains 'status' and keys length is 1, it's a status update (from SquadActions)
    // Otherwise it's from SquadForm

    // However, to be safe, we can just update mostly everything provided in body that is allowed.
    // We should allow status updates here too.

    const {
      title,
      content,
      type,
      capacity,
      tech_stack,
      place_type,
      location,
      status,
    } = body;

    // Construct update data dynamically
    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (type) {
      if (!isTeamType(type)) {
        return NextResponse.json(
          { error: "Invalid team type" },
          { status: 400 },
        );
      }
      updateData.type = normalizeTeamType(type);
    }
    if (capacity) updateData.capacity = Number(capacity); // Ensure number
    if (tech_stack) updateData.tech_stack = tech_stack;
    if (place_type) updateData.place_type = place_type;
    // Handle location explicitly. If place_type is online, location might be cleared or set to something else.
    // SquadForm sends location even if online (as 'reference').
    if (location !== undefined) updateData.location = location;
    if (status) updateData.status = status;

    updateData.updated_at = new Date();

    const updatedSquad = await prisma.$transaction(async (tx) => {
      const nextSquad = await tx.squads.update({
        where: { id },
        data: updateData,
      });

      const linkedWorkspace = await tx.workspaces.findUnique({
        where: { from_squad_id: id },
        select: { id: true },
      });

      if (linkedWorkspace) {
        const workspaceUpdateData: Record<string, unknown> = {};

        if (title) workspaceUpdateData.name = title;
        if (content) workspaceUpdateData.description = content;
        if (type) {
          workspaceUpdateData.category = normalizeWorkspaceCategory(type);
        }

        if (Object.keys(workspaceUpdateData).length > 0) {
          await tx.workspaces.update({
            where: { id: linkedWorkspace.id },
            data: workspaceUpdateData,
          });
        }
      }

      return nextSquad;
    });

    return NextResponse.json(updatedSquad);
  } catch (error: unknown) {
    console.error("API: Update Squad Error", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
