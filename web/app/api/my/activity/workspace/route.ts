import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type CountRow = {
  workspace_id: string;
  count: number;
};

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toCountMap(rows: CountRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.workspace_id, row.count || 0]));
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = (searchParams.get("handle") || "").trim().toLowerCase();

    if (!handle) {
      return NextResponse.json(
        { success: false, error: "handle is required" },
        { status: 400 },
      );
    }

    const profile = await prisma.profiles.findUnique({
      where: { handle },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
      );
    }

    const members = await prisma.workspace_members.findMany({
      where: { user_id: profile.id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            icon_url: true,
            category: true,
          },
        },
      },
      orderBy: { joined_at: "desc" },
    });

    if (members.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          workspaces: [],
        },
      });
    }

    const workspaceIds = Array.from(
      new Set(members.map((member) => member.workspace.id)),
    );
    const workspaceIdParams = Prisma.join(
      workspaceIds.map((workspaceId) => Prisma.sql`${workspaceId}::uuid`),
    );

    const docsPromise = prisma.workspace_docs
      .groupBy({
        by: ["workspace_id"],
        where: {
          author_id: profile.id,
          workspace_id: { in: workspaceIds },
          is_archived: false,
        },
        _count: { _all: true },
      })
      .then((rows) =>
        rows.map((row) => ({
          workspace_id: row.workspace_id,
          count: row._count._all,
        })),
      );

    const tasksAssignedPromise = prisma.$queryRaw<CountRow[]>`
      SELECT
        kc.workspace_id::text AS workspace_id,
        COUNT(*)::int AS count
      FROM "public"."kanban_tasks" kt
      JOIN "public"."kanban_columns" kc
        ON kc.id = kt.column_id
      WHERE kt.assignee_id = ${profile.id}::uuid
        AND kc.workspace_id IN (${workspaceIdParams})
      GROUP BY kc.workspace_id
    `;

    const messagesPromise = prisma.$queryRaw<CountRow[]>`
      SELECT
        wc.workspace_id::text AS workspace_id,
        COUNT(*)::int AS count
      FROM "public"."workspace_messages" wm
      JOIN "public"."workspace_channels" wc
        ON wc.id = wm.channel_id
      WHERE wm.sender_id = ${profile.id}::uuid
        AND wc.workspace_id IN (${workspaceIdParams})
      GROUP BY wc.workspace_id
    `;

    const [docsRows, assignedRows, messageRows] = await Promise.all([
      docsPromise,
      tasksAssignedPromise,
      messagesPromise,
    ]);

    const docsByWorkspace = toCountMap(docsRows);
    const assignedByWorkspace = toCountMap(assignedRows);
    const messagesByWorkspace = toCountMap(messageRows);

    const workspaces = members
      .map((member) => {
        const workspaceId = member.workspace.id;
        const docsCreated = docsByWorkspace.get(workspaceId) || 0;
        const tasksAssigned = assignedByWorkspace.get(workspaceId) || 0;
        const messagesSent = messagesByWorkspace.get(workspaceId) || 0;
        const totalActivities = docsCreated + tasksAssigned + messagesSent;

        return {
          id: workspaceId,
          name: member.workspace.name,
          iconUrl: member.workspace.icon_url,
          category: member.workspace.category,
          role: member.role,
          joinedAt: toIso(member.joined_at),
          stats: {
            docsCreated,
            tasksAssigned,
            messagesSent,
            totalActivities,
          },
        };
      })
      .sort(
        (a, b) => b.stats.totalActivities - a.stats.totalActivities,
      );

    return NextResponse.json({
      success: true,
      data: {
        workspaces,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error, "Failed to fetch workspace activity"),
      },
      { status: 500 },
    );
  }
}
