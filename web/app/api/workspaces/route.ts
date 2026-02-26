import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { logUserActivityEvent, MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";

// GET: List My Workspaces
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1단계: 내 멤버십 + 워크스페이스 기본 정보 + 멤버 수만 조회 (N+1 없음)
    const memberships = await prisma.workspace_members.findMany({
      where: { user_id: userId },
      select: {
        role: true,
        joined_at: true,
        workspace: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            category: true,
            created_at: true,
            updated_at: true,
            from_squad_id: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joined_at: "desc" },
    });

    const workspaceIds = memberships.map((m) => m.workspace.id);

    // 2단계: 워크스페이스별 최근 멤버 4명만 SQL 레벨에서 조회
    type RecentMemberRow = {
      workspace_id: string;
      id: string;
      nickname: string | null;
      avatar_url: string | null;
    };
    const workspaceIdParams = Prisma.join(
      workspaceIds.map((workspaceId) => Prisma.sql`${workspaceId}::uuid`),
    );
    const recentMembersRaw = workspaceIds.length
      ? await prisma.$queryRaw<RecentMemberRow[]>`
          SELECT
            ranked.workspace_id,
            ranked.user_id::text AS id,
            p.nickname,
            p.avatar_url
          FROM (
            SELECT
              wm.workspace_id,
              wm.user_id,
              ROW_NUMBER() OVER (
                PARTITION BY wm.workspace_id
                ORDER BY wm.joined_at DESC
              ) AS rn
            FROM "public"."workspace_members" wm
            WHERE wm.workspace_id IN (${workspaceIdParams})
          ) ranked
          LEFT JOIN "public"."profiles" p
            ON p.id = ranked.user_id
          WHERE ranked.rn <= 4
          ORDER BY ranked.workspace_id, ranked.rn
        `
      : [];

    const recentMembersByWs = new Map<
      string,
      { id: string; nickname: string | null; avatar_url: string | null }[]
    >();
    for (const row of recentMembersRaw) {
      const list = recentMembersByWs.get(row.workspace_id) ?? [];
      list.push({
        id: row.id,
        nickname: row.nickname,
        avatar_url: row.avatar_url,
      });
      recentMembersByWs.set(row.workspace_id, list);
    }

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      my_role: m.role,
      member_count: m.workspace._count.members,
      recent_members: recentMembersByWs.get(m.workspace.id) ?? [],
    }));

    return NextResponse.json(workspaces);
  } catch (error: any) {
    console.error("API: List Workspaces Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create Workspace (Standalone or From Squad)
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, description, category, fromSquadId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Transaction to ensure atomicity
    const workspace = await prisma.$transaction(async (tx) => {
      // 1. Create Workspace
      const newWorkspace = await tx.workspaces.create({
        data: {
          name,
          description,
          category: category || "Side Project",
          from_squad_id: fromSquadId || null,
        },
      });

      // 2. Add Creator as Owner
      await tx.workspace_members.create({
        data: {
          workspace_id: newWorkspace.id,
          user_id: userId,
          role: "owner",
        },
      });

      // 3. Create Default Columns
      const columns = [
        { title: "To Do", category: "todo", order: 0 },
        { title: "In Progress", category: "in-progress", order: 1 },
        { title: "Done", category: "done", order: 2 },
      ];

      await tx.kanban_columns.createMany({
        data: columns.map((col) => ({
          workspace_id: newWorkspace.id,
          title: col.title,
          category: col.category,
          order: col.order,
        })),
      });

      // 4. Create Default Tags
      const defaultTags = [
        { name: "Bug", color: "red" },
        { name: "Feature", color: "blue" },
        { name: "Enhancement", color: "purple" },
      ];

      await tx.kanban_tags.createMany({
        data: defaultTags.map((tag) => ({
          workspace_id: newWorkspace.id,
          name: tag.name,
          color: tag.color,
        })),
      });

      // 5. If from Squad, copy members
      if (fromSquadId) {
        const squadMembers = await tx.squad_members.findMany({
          where: { squad_id: fromSquadId },
        });

        // Filter out the creator (already added as owner)
        const membersToAdd = squadMembers
          .filter((m) => m.user_id && m.user_id !== userId)
          .map((m) => ({
            workspace_id: newWorkspace.id,
            user_id: m.user_id!,
            role: "member", // Default role for team members
          }));

        if (membersToAdd.length > 0) {
          await tx.workspace_members.createMany({
            data: membersToAdd,
          });

          // 6. Send Notification to Squad Members
          const notifications = membersToAdd.map((m) => ({
            user_id: m.user_id,
            type: "SQUAD",
            title: "워크스페이스 생성 알림",
            message: `'${name}' 워크스페이스가 생성되었습니다. 지금 바로 확인해보세요!`,
            link: `/workspace/${newWorkspace.id}`,
          }));

          await tx.notifications.createMany({
            data: notifications,
          });
        }
      }

      return newWorkspace;
    });

    await logUserActivityEvent(
      userId,
      MY_ACTIVITY_EVENT_TYPES.workspaceCreated,
      workspace.id,
    );

    return NextResponse.json(workspace);
  } catch (error: any) {
    console.error("API: Create Workspace Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
