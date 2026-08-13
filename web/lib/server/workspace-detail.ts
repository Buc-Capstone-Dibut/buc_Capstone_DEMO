import prisma from "@/lib/prisma";
import { fetchDevEventById } from "@/lib/server/dev-events";
import { getTeamTypeLabel } from "@/lib/team-types";
import { getTodayDateKey, normalizeDateOnly } from "@/lib/workspace/task-dates";
import { serializeTaskAssignees } from "@/lib/server/task-assignees";

type WorkspaceIdentityInput = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  from_squad_id: string | null;
  created_at: Date;
  squad?: {
    id: string;
    title: string;
    content: string;
    type: string;
    status: string | null;
    activity_id: string | null;
    recruitment_period: string | null;
    tech_stack: string[];
  } | null;
};

type ColumnSnapshot = {
  id: string;
  title: string;
  category: string | null;
};

type TaskSnapshot = {
  id: string;
  title: string;
  order?: number;
  start_date: Date | null;
  end_date: Date | null;
  priority: string | null;
  assignee_id: string | null;
  column_id: string;
  assignee: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
  assignees: Array<{
    user_id: string;
    user: {
      id: string;
      nickname: string | null;
      avatar_url: string | null;
    };
  }>;
};

const DONE_TITLES = new Set(["done", "completed", "finished"]);

function stripMarkup(content: string | null | undefined) {
  if (!content) return null;

  const plain = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plain || null;
}

function truncateText(content: string | null | undefined, maxLength = 180) {
  const plain = stripMarkup(content);
  if (!plain) return null;
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trim()}…`;
}

function isDoneColumn(column?: ColumnSnapshot | null) {
  if (!column) return false;
  const category = (column.category || "").toLowerCase();
  const normalizedTitle = column.title.toLowerCase().replace(/\s+/g, "-");

  return (
    category === "done" ||
    category === "completed" ||
    DONE_TITLES.has(normalizedTitle)
  );
}

export async function buildWorkspaceDetailPayload(
  workspace: WorkspaceIdentityInput & {
    members: Array<{
      user_id: string;
      role: string;
      joined_at: Date;
      user: {
        nickname: string | null;
        avatar_url: string | null;
        users: { email: string | null } | null;
      } | null;
    }>;
  },
) {
  const columns = await prisma.kanban_columns.findMany({
    where: { workspace_id: workspace.id },
    select: {
      id: true,
      title: true,
      category: true,
    },
    orderBy: { order: "asc" },
  });

  const columnById = new Map(columns.map((column) => [column.id, column]));
  const columnIds = columns.map((column) => column.id);

  const [tasks, docsCount, channelCount, recentDocs, activity] =
    await Promise.all([
      columnIds.length > 0
        ? prisma.kanban_tasks.findMany({
            where: { column_id: { in: columnIds } },
            select: {
              id: true,
              title: true,
              order: true,
              start_date: true,
              end_date: true,
              priority: true,
              assignee_id: true,
              column_id: true,
              assignee: {
                select: {
                  id: true,
                  nickname: true,
                  avatar_url: true,
                },
              },
              assignees: {
                orderBy: [
                  { position: "asc" },
                  { assigned_at: "asc" },
                  { user_id: "asc" },
                ],
                select: {
                  user_id: true,
                  user: {
                    select: {
                      id: true,
                      nickname: true,
                      avatar_url: true,
                    },
                  },
                },
              },
            },
            orderBy: [{ end_date: "asc" }, { order: "asc" }],
          })
        : Promise.resolve<TaskSnapshot[]>([]),
      prisma.workspace_docs.count({
        where: {
          workspace_id: workspace.id,
          is_archived: false,
        },
      }),
      prisma.workspace_channels.count({
        where: {
          workspace_id: workspace.id,
        },
      }),
      prisma.workspace_docs.findMany({
        where: {
          workspace_id: workspace.id,
          is_archived: false,
        },
        select: {
          id: true,
          title: true,
          emoji: true,
          updated_at: true,
        },
        orderBy: { updated_at: "desc" },
        take: 3,
      }),
      workspace.squad?.activity_id
        ? fetchDevEventById(workspace.squad.activity_id)
        : Promise.resolve(null),
    ]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) =>
    isDoneColumn(columnById.get(task.column_id)),
  ).length;
  const openTasks = totalTasks - completedTasks;
  const today = getTodayDateKey();
  const overdueTasks = tasks.filter((task) => {
    const endDate = normalizeDateOnly(task.end_date);
    if (!endDate) return false;
    if (isDoneColumn(columnById.get(task.column_id))) return false;
    return endDate < today;
  }).length;
  const scheduledTasks = tasks.filter((task) => {
    if (!task.start_date && !task.end_date) return false;
    return !isDoneColumn(columnById.get(task.column_id));
  }).length;

  const nextActions = tasks
    .filter((task) => !isDoneColumn(columnById.get(task.column_id)))
    .sort((a, b) => {
      const aDate = normalizeDateOnly(a.end_date) ?? "9999-12-31";
      const bDate = normalizeDateOnly(b.end_date) ?? "9999-12-31";
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return (a.order ?? 0) - (b.order ?? 0);
    })
    .slice(0, 4)
    .map((task) => {
      const column = columnById.get(task.column_id);

      return {
        id: task.id,
        title: task.title,
        startDate: normalizeDateOnly(task.start_date),
        endDate: normalizeDateOnly(task.end_date),
        priority: task.priority || "medium",
        isOverdue: Boolean(
          normalizeDateOnly(task.end_date) &&
          normalizeDateOnly(task.end_date)! < today,
        ),
        column: column
          ? {
              id: column.id,
              title: column.title,
              category: column.category || "todo",
            }
          : null,
        ...serializeTaskAssignees(task.assignees, task),
      };
    });

  const currentFocus = nextActions[0]
    ? `${nextActions[0].title}${nextActions[0].column?.title ? ` · ${nextActions[0].column.title}` : ""}`
    : recentDocs[0]
      ? `${recentDocs[0].title} 문서 정리`
      : workspace.name;
  const goalSummary =
    truncateText(workspace.description, 200) ||
    truncateText(
      activity?.summary || activity?.description || activity?.content,
      200,
    ) ||
    truncateText(workspace.squad?.content, 200) ||
    null;
  const deliverable =
    activity?.title || workspace.squad?.title || workspace.name;

  return {
    goal_summary: goalSummary,
    deliverable,
    origin: {
      squadTitle: workspace.squad?.title ?? null,
      activityTitle: activity?.title ?? null,
      recruitmentPeriod: workspace.squad?.recruitment_period ?? null,
      techStack: workspace.squad?.tech_stack || [],
    },
    project_context: {
      team_type: workspace.category,
      team_type_label: getTeamTypeLabel(workspace.category),
      source: workspace.from_squad_id ? "squad" : "workspace",
      headline:
        activity?.title ||
        workspace.squad?.title ||
        workspace.description ||
        null,
      summary: goalSummary,
      sourceUrl: workspace.from_squad_id
        ? `/community/squad/${workspace.from_squad_id}`
        : null,
      squad: workspace.squad
        ? {
            id: workspace.squad.id,
            title: workspace.squad.title,
            type: workspace.squad.type,
            typeLabel: getTeamTypeLabel(workspace.squad.type),
            status: workspace.squad.status,
            recruitmentPeriod: workspace.squad.recruitment_period,
            techStack: workspace.squad.tech_stack || [],
            summary: truncateText(workspace.squad.content, 160),
            href: `/community/squad/${workspace.squad.id}`,
          }
        : null,
      activity: activity
        ? {
            id: activity.id,
            title: activity.title,
            host: activity.host,
            link: activity.link,
            date: activity.date,
            status: activity.status,
            category: activity.category,
            summary: truncateText(
              activity.summary || activity.description || activity.content,
              160,
            ),
            href: `/insights/activities/${activity.id}`,
          }
        : null,
    },
    progress_summary: {
      memberCount: workspace.members.length,
      totalTasks,
      completedTasks,
      openTasks,
      overdueTasks,
      scheduledTasks,
      docsCount,
      channelCount,
      completionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    recent_docs: recentDocs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      emoji: doc.emoji,
      updatedAt: doc.updated_at,
      updated_at: doc.updated_at,
    })),
    next_actions: nextActions,
    current_focus: currentFocus,
  };
}
