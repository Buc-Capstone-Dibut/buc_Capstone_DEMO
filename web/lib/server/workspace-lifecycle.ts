import { workspace_lifecycle_status } from "@prisma/client";
import prisma from "@/lib/prisma";

export const WORKSPACE_READ_ONLY_ERROR =
  "이 워크스페이스는 종료되어 읽기 전용입니다.";

type WorkspaceLifecycleRow = {
  id: string;
  lifecycle_status: workspace_lifecycle_status;
  completed_at: Date | null;
  result_type: string | null;
  result_link: string | null;
  result_note: string | null;
};

export async function getWorkspaceLifecycle(
  workspaceId: string,
): Promise<WorkspaceLifecycleRow | null> {
  try {
    return await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        lifecycle_status: true,
        completed_at: true,
        result_type: true,
        result_link: true,
        result_note: true,
      },
    });
  } catch (error) {
    // Before migration is applied, lifecycle columns can be missing.
    // In that case fallback to existing workspace row and treat it as IN_PROGRESS.
    const fallback = await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!fallback) return null;

    return {
      id: fallback.id,
      lifecycle_status: workspace_lifecycle_status.IN_PROGRESS,
      completed_at: null,
      result_type: null,
      result_link: null,
      result_note: null,
    };
  }
}

export function isWorkspaceCompleted(
  workspace:
    | Pick<WorkspaceLifecycleRow, "lifecycle_status">
    | null
    | undefined,
): boolean {
  return workspace?.lifecycle_status === workspace_lifecycle_status.COMPLETED;
}

export async function ensureWorkspaceWritable(workspaceId: string): Promise<
  | { ok: true; workspace: WorkspaceLifecycleRow }
  | { ok: false; status: number; error: string }
> {
  const workspace = await getWorkspaceLifecycle(workspaceId);

  if (!workspace) {
    return { ok: false, status: 404, error: "Workspace not found" };
  }

  if (isWorkspaceCompleted(workspace)) {
    return { ok: false, status: 409, error: WORKSPACE_READ_ONLY_ERROR };
  }

  return { ok: true, workspace };
}
