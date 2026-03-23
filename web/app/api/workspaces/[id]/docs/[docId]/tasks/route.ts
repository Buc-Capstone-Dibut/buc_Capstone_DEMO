import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string; docId: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, docId } = params;

    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const relations = await prisma.kanban_task_documents.findMany({
      where: {
        workspace_id: workspaceId,
        doc_id: docId,
      },
      orderBy: [{ is_primary: "desc" }, { created_at: "asc" }],
      select: {
        id: true,
        relation_type: true,
        is_primary: true,
        task: {
          select: {
            id: true,
            title: true,
            priority: true,
            due_date: true,
            column: {
              select: {
                id: true,
                title: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      relations.map((relation) => ({
        id: relation.id,
        relation_type: relation.relation_type,
        is_primary: relation.is_primary,
        task: {
          id: relation.task.id,
          title: relation.task.title,
          priority: relation.task.priority || "medium",
          due_date: relation.task.due_date,
          column: {
            id: relation.task.column.id,
            title: relation.task.column.title,
            category: relation.task.column.category || "todo",
          },
        },
      })),
    );
  } catch (error) {
    console.error("Error fetching document tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch linked tasks" },
      { status: 500 },
    );
  }
}
