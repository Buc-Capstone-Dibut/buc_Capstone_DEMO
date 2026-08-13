export interface TaskAssigneeSummary {
  id: string;
  name?: string | null;
  avatar?: string | null;
}

export interface TaskAssignmentShape {
  assignee?: string | null;
  assigneeId?: string | null;
  assigneeIds?: string[];
  assignees?: TaskAssigneeSummary[];
  assigneeProfile?: {
    id?: string;
    name?: string | null;
    avatar?: string | null;
  } | null;
}

function uniqueIds(ids: Array<string | null | undefined>) {
  return Array.from(
    new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0)),
  );
}

/**
 * Canonical assignment arrays take precedence even when they are empty.
 * Legacy fields are only a rolling-deployment fallback for older API payloads.
 */
export function getTaskAssigneeIds(task: TaskAssignmentShape): string[] {
  if (Array.isArray(task.assigneeIds)) {
    return uniqueIds(task.assigneeIds);
  }

  if (Array.isArray(task.assignees)) {
    return uniqueIds(task.assignees.map((assignee) => assignee.id));
  }

  return uniqueIds([task.assigneeId, task.assigneeProfile?.id]);
}

export function getTaskAssignees(
  task: TaskAssignmentShape,
): TaskAssigneeSummary[] {
  if (Array.isArray(task.assignees)) {
    const seen = new Set<string>();
    return task.assignees.filter((assignee) => {
      if (!assignee.id || seen.has(assignee.id)) return false;
      seen.add(assignee.id);
      return true;
    });
  }

  const ids = getTaskAssigneeIds(task);
  if (ids.length === 0) return [];

  return ids.map((id, index) => {
    if (task.assigneeProfile?.id === id || index === 0) {
      return {
        id,
        name: task.assigneeProfile?.name ?? task.assignee ?? null,
        avatar: task.assigneeProfile?.avatar ?? null,
      };
    }
    return { id };
  });
}

export function isTaskAssignedTo(
  task: TaskAssignmentShape,
  userId: string,
): boolean {
  return getTaskAssigneeIds(task).includes(userId);
}

export function isTaskUnassigned(task: TaskAssignmentShape): boolean {
  return getTaskAssigneeIds(task).length === 0;
}

export function getPrimaryTaskAssignee(
  task: TaskAssignmentShape,
): TaskAssigneeSummary | null {
  return getTaskAssignees(task)[0] ?? null;
}

export function getTaskAssigneeSearchText(task: TaskAssignmentShape): string {
  return getTaskAssignees(task)
    .map((assignee) => assignee.name || "")
    .join(" ");
}

export function buildTaskAssignmentFields(
  assigneeIds: string[],
  members: TaskAssigneeSummary[],
) {
  const uniqueAssigneeIds = uniqueIds(assigneeIds);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const assignees = uniqueAssigneeIds.map(
    (id) => memberById.get(id) ?? { id, name: null, avatar: null },
  );
  const primary = assignees[0] ?? null;

  return {
    assigneeIds: uniqueAssigneeIds,
    assignees,
    assigneeId: primary?.id ?? null,
    assignee: primary?.name ?? null,
    assigneeProfile: primary,
  };
}

export function moveTaskAssigneeIds(
  currentAssigneeIds: string[],
  sourceAssigneeId: string | null,
  targetAssigneeId: string,
) {
  const current = uniqueIds(currentAssigneeIds);
  if (sourceAssigneeId === targetAssigneeId) return current;
  if (targetAssigneeId === "unassigned") return [];
  if (!sourceAssigneeId || sourceAssigneeId === "unassigned") {
    return uniqueIds([...current, targetAssigneeId]);
  }

  const sourceIndex = current.indexOf(sourceAssigneeId);
  if (sourceIndex < 0) return uniqueIds([...current, targetAssigneeId]);

  const next = [...current];
  next.splice(sourceIndex, 1, targetAssigneeId);
  return uniqueIds(next);
}
