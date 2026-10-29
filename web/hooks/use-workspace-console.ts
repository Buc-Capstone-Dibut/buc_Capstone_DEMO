"use client";

import { useEffect } from "react";
import {
  installWorkspaceConsole,
  type WorkspaceConsoleControl,
} from "@/lib/workspace/console-control";

declare global {
  interface Window {
    workspaceControl?: WorkspaceConsoleControl;
  }
}

export function useWorkspaceConsole(workspaceId: string, role?: string) {
  useEffect(() => {
    if (!workspaceId || role !== "owner") return;

    return installWorkspaceConsole(window, workspaceId, {
      reload: () => window.location.reload(),
      notify: (message) => console.info(`[Debut 워크스페이스] ${message}`),
    });
  }, [workspaceId, role]);
}
