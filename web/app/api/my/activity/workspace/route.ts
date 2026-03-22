import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  buildCreatedAtCursorWhere,
  decodeProfileCursor,
  encodeProfileCursor,
  parsePageLimit,
} from "@/lib/server/my-profile-pagination";

type CountRow = {
  workspace_id: string;
  count: number;
};

type WorkspaceActivityMember = {
  id: string;
  role: string;
  joined_at: Date;
  workspace: {
    id: string;
    name: string;
    icon_url: string | null;
    category: string;
    created_at: Date;
    lifecycle_status: "IN_PROGRESS" | "COMPLETED";
    completed_at: Date | null;
    result_type: string | null;
    result_link: string | null;
    result_note: string | null;
  };
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
    const profileIdParam = (searchParams.get("profileId") || "").trim();
    const handle = (searchParams.get("handle") || "").trim().toLowerCase();
    const limit = parsePageLimit(searchParams.get("limit"));
    const cursor = decodeProfileCursor(searchParams.get("cursor"));

    if (!handle && !profileIdParam) {
      return NextResponse.json(
        { success: false, error: "handle or profileId is required" },
        { status: 400 },
      );
    }

    const resolvedProfileId =
      profileIdParam ||
      (
        await prisma.profiles.findUnique({
          where: { handle },
          select: { id: true },
        })
      )?.id;

    if (!resolvedProfileId) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
      );
    }

    const memberCursorWhere = buildCreatedAtCursorWhere(cursor, "joined_at");

    let members: WorkspaceActivityMember[] = [];
    try {
      members = await prisma.workspace_members.findMany({
        where: {
          user_id: resolvedProfileId,
          workspace: {
            is: {
              space_status: "ACTIVE",
            },
          },
          ...(memberCursorWhere as Prisma.workspace_membersWhereInput),
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              icon_url: true,
              category: true,
              created_at: true,
              lifecycle_status: true,
              completed_at: true,
              result_type: true,
              result_link: true,
              result_note: true,
            },
          },
        },
        orderBy: [{ joined_at: "desc" }, { id: "desc" }],
        take: limit + 1,
      });
    } catch {
      const legacyMembers = await prisma.workspace_members.findMany({
        where: {
          user_id: resolvedProfileId,
          ...(memberCursorWhere as Prisma.workspace_membersWhereInput),
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              icon_url: true,
              category: true,
              created_at: true,
            },
          },
        },
        orderBy: [{ joined_at: "desc" }, { id: "desc" }],
        take: limit + 1,
      });
      members = legacyMembers.map((member) => ({
        ...member,
        workspace: {
          ...member.workspace,
          lifecycle_status: "IN_PROGRESS" as const,
          completed_at: null,
          result_type: null,
          result_link: null,
          result_note: null,
        },
      }));
    }
    const pageMembers = members.slice(0, limit);
    const hasMore = members.length > limit;

    if (pageMembers.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          hasMore: false,
          nextCursor: null,
        },
      });
    }

    const workspaceIds = Array.from(
      new Set(pageMembers.map((member) => member.workspace.id)),
    );
    const workspaceIdParams = Prisma.join(
      workspaceIds.map((workspaceId) => Prisma.sql`${workspaceId}::uuid`),
    );

    const docsPromise = prisma.workspace_docs
      .groupBy({
        by: ["workspace_id"],
        where: {
          author_id: resolvedProfileId,
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
      WHERE kt.assignee_id = ${resolvedProfileId}::uuid
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
      WHERE wm.sender_id = ${resolvedProfileId}::uuid
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

    const items = pageMembers.map((member) => {
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
          startedAt: toIso(member.workspace.created_at),
          joinedAt: toIso(member.joined_at),
          lifecycleStatus: member.workspace.lifecycle_status,
          completedAt: toIso(member.workspace.completed_at),
          resultType: member.workspace.result_type,
          resultLink: member.workspace.result_link,
          resultNote: member.workspace.result_note,
          stats: {
            docsCreated,
            tasksAssigned,
            messagesSent,
            totalActivities,
          },
        };
      });
    const lastMember = pageMembers[pageMembers.length - 1];

    return NextResponse.json({
      success: true,
      data: {
        items,
        hasMore,
        nextCursor: hasMore
          ? encodeProfileCursor({
              createdAt: lastMember?.joined_at,
              id: lastMember?.id,
            })
          : null,
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
