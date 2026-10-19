export type ReopenWorkspaceResult = {
  success: true;
  reopened: boolean;
  workspace: {
    id: string;
    lifecycle_status: "IN_PROGRESS";
    completed_at: string | null;
  };
};

export type WorkspaceConsoleControl = {
  reopen(): Promise<ReopenWorkspaceResult>;
};

export function installWorkspaceConsole(
  target: { workspaceControl?: WorkspaceConsoleControl },
  workspaceId: string,
  {
    request = fetch,
    reload,
    notify,
  }: {
    request?: typeof fetch;
    reload: () => void;
    notify: (message: string) => void;
  },
) {
  let disposed = false;
  let pending: Promise<ReopenWorkspaceResult> | null = null;
  const commands: WorkspaceConsoleControl = {
    reopen() {
      if (disposed) {
        return Promise.reject(new Error("현재 워크스페이스 화면에서 다시 실행해 주세요."));
      }
      if (pending) return pending;

      pending = (async (): Promise<ReopenWorkspaceResult> => {
        const response = await request(
          `/api/workspaces/${encodeURIComponent(workspaceId)}/reopen`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: "{}",
            signal: AbortSignal.timeout(15_000),
          },
        );
        const result = await response.json().catch(() => null);
        if (
          !response.ok ||
          result?.success !== true ||
          typeof result.reopened !== "boolean" ||
          typeof result.workspace?.id !== "string" ||
          result.workspace.id.toLowerCase() !== workspaceId.toLowerCase() ||
          result.workspace?.lifecycle_status !== "IN_PROGRESS"
        ) {
          throw new Error(
            typeof result?.error === "string"
              ? result.error
              : "워크스페이스를 재개하지 못했습니다. 새로고침 후 다시 시도해 주세요.",
          );
        }
        if (!disposed) {
          notify(
            result.reopened
              ? "워크스페이스를 재개했습니다. 화면을 새로고침합니다."
              : "이미 진행 중인 워크스페이스입니다. 화면을 새로고침합니다.",
          );
          reload();
        }
        return result;
      })().finally(() => {
        pending = null;
      });
      return pending;
    },
  };

  target.workspaceControl = commands;
  notify("현재 공간 재개: await workspaceControl.reopen()");
  return () => {
    disposed = true;
    if (target.workspaceControl === commands) delete target.workspaceControl;
  };
}
