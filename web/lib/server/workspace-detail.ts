import prisma from "@/lib/prisma";
import { fetchDevEventById } from "@/lib/server/dev-events";
import { getTeamTypeLabel } from "@/lib/team-types";

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
  due_date: Date | null;
  priority: string | null;
  assignee_id: string | null;
  column_id: string;
  assignee: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
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

function formatAssignee(task: TaskSnapshot) {
  if (!task.assignee) return null;

  return {
    id: task.assignee.id,
    name: task.assignee.nickname || "Unknown",
    avatar: task.assignee.avatar_url,
  };
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

  const [tasks, docsCount, channelCount, recentDocs, activity] = await Promise.all([
    columnIds.length > 0
      ? prisma.kanban_tasks.findMany({
          where: { column_id: { in: columnIds } },
          select: {
            id: true,
            title: true,
            order: true,
            due_date: true,
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
          },
          orderBy: [{ due_date: "asc" }, { order: "asc" }],
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
  const now = Date.now();
  const overdueTasks = tasks.filter((task) => {
    if (!task.due_date) return false;
    if (isDoneColumn(columnById.get(task.column_id))) return false;
    return task.due_date.getTime() < now;
  }).length;
  const scheduledTasks = tasks.filter((task) => {
    if (!task.due_date) return false;
    return !isDoneColumn(columnById.get(task.column_id));
  }).length;

  const nextActions = tasks
    .filter((task) => !isDoneColumn(columnById.get(task.column_id)))
    .sort((a, b) => {
      const aTime = a.due_date?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.due_date?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      return (a.order ?? 0) - (b.order ?? 0);
    })
    .slice(0, 4)
    .map((task) => {
      const column = columnById.get(task.column_id);

      return {
        id: task.id,
        title: task.title,
        dueDate: task.due_date,
        priority: task.priority || "medium",
        isOverdue: Boolean(task.due_date && task.due_date.getTime() < now),
        column: column
          ? {
              id: column.id,
              title: column.title,
              category: column.category || "todo",
            }
          : null,
        assignee: formatAssignee(task),
      };
    });

  const currentFocus = nextActions[0]
    ? `${nextActions[0].title}${nextActions[0].column?.title ? ` · ${nextActions[0].column.title}` : ""}`
    : recentDocs[0]
      ? `${recentDocs[0].title} 문서 정리`
      : workspace.name;
  const goalSummary =
    truncateText(workspace.description, 200) ||
    truncateText(activity?.summary || activity?.description || activity?.content, 200) ||
    truncateText(workspace.squad?.content, 200) ||
    null;
  const deliverable =
    activity?.title ||
    workspace.squad?.title ||
    workspace.name;

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
            summary: truncateText(activity.summary || activity.description || activity.content, 160),
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
