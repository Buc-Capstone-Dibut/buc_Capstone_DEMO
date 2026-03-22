import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { logUserActivityEvent, MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { normalizeTeamType } from "@/lib/team-types";
import {
  normalizeWorkspaceCategory,
  seedWorkspaceDefaults,
} from "@/lib/server/workspace-bootstrap";

type WorkspaceMembership = {
  role: string;
  joined_at: Date;
  workspace: {
    id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    category: string;
    space_status: "ACTIVE" | "DRAFT";
    activated_at: Date | null;
    lifecycle_status: "IN_PROGRESS" | "COMPLETED";
    completed_at: Date | null;
    result_type: string | null;
    result_link: string | null;
    result_note: string | null;
    created_at: Date;
    updated_at: Date;
    from_squad_id: string | null;
    _count: { members: number };
  };
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

// GET: List My Workspaces
export async function GET() {
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
    let memberships: WorkspaceMembership[] = [];
    try {
      memberships = await prisma.workspace_members.findMany({
        where: {
          user_id: userId,
          workspace: {
            is: {
              space_status: "ACTIVE",
            },
          },
        },
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
              space_status: true,
              activated_at: true,
              lifecycle_status: true,
              completed_at: true,
              result_type: true,
              result_link: true,
              result_note: true,
              created_at: true,
              updated_at: true,
              from_squad_id: true,
              _count: { select: { members: true } },
            },
          },
        },
        orderBy: { joined_at: "desc" },
      });
    } catch {
      // Fallback for pre-migration environments.
      const legacyMemberships = await prisma.workspace_members.findMany({
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
      memberships = legacyMemberships.map((row) => ({
        ...row,
        workspace: {
          ...row.workspace,
          space_status: "ACTIVE" as const,
          activated_at: row.workspace.created_at,
          lifecycle_status: "IN_PROGRESS" as const,
          completed_at: null,
          result_type: null,
          result_link: null,
          result_note: null,
        },
      }));
    }

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
  } catch (error: unknown) {
    console.error("API: List Workspaces Error", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
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

    const linkedSquad = fromSquadId
      ? await prisma.squads.findUnique({
          where: { id: fromSquadId },
          select: { id: true, type: true },
        })
      : null;

    if (fromSquadId && !linkedSquad) {
      return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    }

    if (fromSquadId) {
      const existingLinkedWorkspace = await prisma.workspaces.findUnique({
        where: { from_squad_id: fromSquadId },
        select: {
          id: true,
          space_status: true,
        },
      });

      if (existingLinkedWorkspace) {
        if (existingLinkedWorkspace.space_status === "ACTIVE") {
          return NextResponse.json(
            {
              error: "이미 팀 공간이 생성되어 있습니다.",
              workspaceId: existingLinkedWorkspace.id,
            },
            { status: 409 },
          );
        }
      }
    }

    const normalizedCategory = linkedSquad
      ? normalizeWorkspaceCategory(linkedSquad.type)
      : normalizeTeamType(category);

    // Transaction to ensure atomicity
    const workspace = await prisma.$transaction(async (tx) => {
      if (fromSquadId) {
        const existingDraftWorkspace = await tx.workspaces.findUnique({
          where: { from_squad_id: fromSquadId },
          select: {
            id: true,
            space_status: true,
          },
        });

        if (existingDraftWorkspace?.space_status === "DRAFT") {
          const activatedWorkspace = await tx.workspaces.update({
            where: { id: existingDraftWorkspace.id },
            data: {
              name,
              description,
              category: normalizedCategory,
              space_status: "ACTIVE",
              activated_at: new Date(),
            },
          });

          const ownerMembership = await tx.workspace_members.findUnique({
            where: {
              workspace_id_user_id: {
                workspace_id: activatedWorkspace.id,
                user_id: userId,
              },
            },
          });

          if (!ownerMembership) {
            await tx.workspace_members.create({
              data: {
                workspace_id: activatedWorkspace.id,
                user_id: userId,
                role: "owner",
              },
            });
          }

          const squadMembers = await tx.squad_members.findMany({
            where: { squad_id: fromSquadId },
          });

          const membersToAdd = squadMembers
            .filter((member) => member.user_id && member.user_id !== userId)
            .map((member) => ({
              workspace_id: activatedWorkspace.id,
              user_id: member.user_id!,
              role: "member",
            }));

          if (membersToAdd.length > 0) {
            await tx.workspace_members.createMany({
              data: membersToAdd,
              skipDuplicates: true,
            });

            await tx.notifications.createMany({
              data: membersToAdd.map((member) => ({
                user_id: member.user_id,
                type: "SQUAD",
                title: "팀 공간 생성 알림",
                message: `'${name}' 팀 공간이 생성되었습니다. 지금 바로 확인해보세요!`,
                link: `/workspace/${activatedWorkspace.id}`,
              })),
            });
          }

          return activatedWorkspace;
        }
      }

      // 1. Create Workspace
      const newWorkspace = await tx.workspaces.create({
        data: {
          name,
          description,
          category: normalizedCategory,
          from_squad_id: fromSquadId || null,
          space_status: "ACTIVE",
          activated_at: new Date(),
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

      await seedWorkspaceDefaults(tx, newWorkspace.id);

      // 3. If from Squad, copy members
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
            skipDuplicates: true,
          });

          // 4. Send Notification to Squad Members
          const notifications = membersToAdd.map((m) => ({
            user_id: m.user_id,
            type: "SQUAD",
            title: "팀 공간 생성 알림",
            message: `'${name}' 팀 공간이 생성되었습니다. 지금 바로 확인해보세요!`,
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
  } catch (error: unknown) {
    console.error("API: Create Workspace Error", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
