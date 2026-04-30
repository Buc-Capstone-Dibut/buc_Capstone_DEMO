import { workspace_lifecycle_status } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  REPUTATION_DELTAS,
  REPUTATION_EVENT_TYPES,
  tryApplyReputationEvent,
} from "@/lib/server/reputation";
import { upsertWorkspaceCareerImportCandidate } from "@/lib/server/workspace-career-import";

const DONE_COLUMN_TITLES = new Set(["done", "completed", "finished"]);

function isDoneColumn(column: { title: string; category: string | null }) {
  const category = (column.category || "").trim().toLowerCase();
  if (category === "done" || category === "completed") {
    return true;
  }
  const normalizedTitle = column.title.trim().toLowerCase().replace(/\s+/g, "-");
  return DONE_COLUMN_TITLES.has(normalizedTitle);
}

function buildTaskSummary(taskTitles: string[]) {
  if (taskTitles.length === 0) {
    return "개인 담당 완료 태스크가 없습니다.";
  }

  const preview = taskTitles.slice(0, 3).join(", ");
  if (taskTitles.length <= 3) {
    return `완료 태스크 ${taskTitles.length}건: ${preview}`;
  }

  return `완료 태스크 ${taskTitles.length}건: ${preview} 외 ${taskTitles.length - 3}건`;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTagList(value: unknown): string[] {
  const source =
    Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  if (!Array.isArray(source)) return [];

  const dedupe = new Set<string>();
  for (const item of source) {
    if (typeof item !== "string") continue;
    const tag = item.trim();
    if (!tag) continue;
    dedupe.add(tag.slice(0, 40));
    if (dedupe.size >= 12) break;
  }

  return Array.from(dedupe.values());
}

type CompleteWorkspaceBody = {
  resultType?: unknown;
  resultLink?: unknown;
  resultNote?: unknown;
  periodLabel?: unknown;
  focusTags?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workspaceId } = await params;

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      },
      select: { role: true },
    });

    if (!membership || membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only the workspace owner can complete it." },
        { status: 403 },
      );
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const body = (await request.json().catch(() => ({}))) as CompleteWorkspaceBody;
    const resultType = normalizeOptionalText(body.resultType);
    const resultLink = normalizeOptionalText(body.resultLink);
    const resultNote = normalizeOptionalText(body.resultNote);
    const periodLabel = normalizeOptionalText(body.periodLabel);
    const focusTags = normalizeTagList(body.focusTags);

    const workspaceSummary = await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        category: true,
        created_at: true,
        activated_at: true,
      },
    });

    if (!workspaceSummary) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const members = await prisma.workspace_members.findMany({
      where: { workspace_id: workspaceId },
      select: {
        user_id: true,
        role: true,
        team_role: true,
      },
    });

    const columns = await prisma.kanban_columns.findMany({
      where: { workspace_id: workspaceId },
      select: {
        id: true,
        title: true,
        category: true,
      },
    });

    const doneColumnIds = columns.filter(isDoneColumn).map((column) => column.id);
    const memberIds = members.map((member) => member.user_id);

    const completedTasks =
      doneColumnIds.length > 0 && memberIds.length > 0
        ? await prisma.kanban_tasks.findMany({
            where: {
              column_id: { in: doneColumnIds },
              assignee_id: { in: memberIds },
            },
            select: {
              assignee_id: true,
              title: true,
            },
            orderBy: {
              updated_at: "desc",
            },
          })
        : [];

    const completedTaskTitlesByUser = new Map<string, string[]>();
    for (const task of completedTasks) {
      if (!task.assignee_id) continue;
      const title = task.title.trim();
      if (!title) continue;
      const current = completedTaskTitlesByUser.get(task.assignee_id) || [];
      if (!current.includes(title)) {
        current.push(title);
      }
      completedTaskTitlesByUser.set(task.assignee_id, current);
    }

    const completedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const nextWorkspace = await tx.workspaces.update({
        where: { id: workspaceId },
        data: {
          lifecycle_status: workspace_lifecycle_status.COMPLETED,
          completed_at: completedAt,
          result_type: resultType,
          result_link: resultLink,
          result_note: resultNote,
        },
        select: {
          id: true,
          lifecycle_status: true,
          completed_at: true,
          result_type: true,
          result_link: true,
          result_note: true,
        },
      });

      await Promise.all(
        members.map((member) => {
          const completedTaskTitles =
            completedTaskTitlesByUser.get(member.user_id) || [];

          return upsertWorkspaceCareerImportCandidate(
            member.user_id,
            {
              workspaceId,
              workspaceName: workspaceSummary.name,
              workspaceCategory: workspaceSummary.category,
              role: member.role || "member",
              teamRole: member.team_role || null,
              periodLabel,
              focusTags,
              startedAt:
                workspaceSummary.activated_at?.toISOString() ||
                workspaceSummary.created_at.toISOString(),
              completedAt: completedAt.toISOString(),
              resultType,
              resultLink,
              resultNote,
              completedTaskTitles,
              taskSummary: buildTaskSummary(completedTaskTitles),
              status: "PENDING",
              importedExperienceId: null,
              importedAt: null,
            },
            tx,
          );
        }),
      );

      const notificationTargets = Array.from(
        new Set(
          members
            .map((member) => member.user_id)
            .filter((memberUserId): memberUserId is string => Boolean(memberUserId)),
        ),
      );

      if (notificationTargets.length > 0) {
        await tx.notifications.createMany({
          data: notificationTargets.map((memberUserId) => ({
            user_id: memberUserId,
            type: "SYSTEM",
            title: "워크스페이스 종료",
            message: `'${workspaceSummary.name}' 워크스페이스가 종료되었습니다. 새 프로젝트 추가에서 결과물을 불러와 커리어에 반영해보세요.`,
            link: `/career/projects/new?source=workspace-complete&workspaceId=${workspaceId}`,
            is_read: false,
          })),
        });
      }

      return nextWorkspace;
    });

    await Promise.all(
      members
        .filter((member) => Boolean(member.user_id))
        .map((member) =>
          tryApplyReputationEvent({
            userId: member.user_id,
            eventType: REPUTATION_EVENT_TYPES.workspaceCompleted,
            delta: REPUTATION_DELTAS.workspaceCompleted,
            sourceType: "workspace",
            sourceId: workspaceId,
            actorId: userId,
            dedupeKey: `workspace_completed:${workspaceId}:${member.user_id}`,
          }),
        ),
    );

    return NextResponse.json({ success: true, workspace: updated });
  } catch (error: unknown) {
    console.error("API: Complete Workspace Error", error);
    return NextResponse.json(
      { error: "Failed to complete workspace" },
      { status: 500 },
    );
  }
}
