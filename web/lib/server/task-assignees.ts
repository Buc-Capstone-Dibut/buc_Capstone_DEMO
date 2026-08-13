export interface TaskAssigneeRecord {
  user_id: string;
  user: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  };
}

export interface LegacyTaskAssigneeRecord {
  assignee_id: string | null;
  assignee?: {
    id?: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
}

export function parseTaskAssigneeIds(
  input: Record<string, unknown>,
): string[] | undefined {
  if (Object.prototype.hasOwnProperty.call(input, "assigneeIds")) {
    if (!Array.isArray(input.assigneeIds)) {
      throw new Error("담당자 목록 형식이 올바르지 않습니다.");
    }
    if (
      !input.assigneeIds.every(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    ) {
      throw new Error("담당자 ID가 올바르지 않습니다.");
    }
    return Array.from(new Set(input.assigneeIds.map((id) => id.trim())));
  }

  const legacyKey = Object.prototype.hasOwnProperty.call(input, "assigneeId")
    ? "assigneeId"
    : Object.prototype.hasOwnProperty.call(input, "assignee_id")
      ? "assignee_id"
      : null;
  if (!legacyKey) return undefined;

  const legacyId = input[legacyKey];
  if (legacyId === null || legacyId === undefined || legacyId === "") return [];
  if (typeof legacyId !== "string" || !legacyId.trim()) {
    throw new Error("담당자 ID가 올바르지 않습니다.");
  }
  return [legacyId.trim()];
}

export function serializeTaskAssignees(
  assignments: TaskAssigneeRecord[],
  legacyTask: LegacyTaskAssigneeRecord,
) {
  const canonical = assignments.map((assignment) => ({
    id: assignment.user_id,
    name: assignment.user.nickname,
    avatar: assignment.user.avatar_url,
  }));
  const assignees =
    canonical.length === 0 && legacyTask.assignee_id && legacyTask.assignee
      ? [
          {
            id: legacyTask.assignee_id,
            name: legacyTask.assignee.nickname,
            avatar: legacyTask.assignee.avatar_url,
          },
        ]
      : canonical;
  const primary = assignees[0] ?? null;

  return {
    assignees,
    assigneeIds: assignees.map((assignee) => assignee.id),
    assignee: primary?.name ?? null,
    assigneeId: primary?.id ?? null,
    assigneeProfile: primary,
  };
}
