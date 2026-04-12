"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { WorkspaceSidebar } from "@/components/features/workspace/detail/workspace-sidebar";
import { DashboardOverview } from "@/components/features/workspace/detail/dashboard-overview";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const KanbanBoard = dynamic(
  () =>
    import("@/components/features/workspace/detail/kanban-board").then(
      (mod) => mod.KanbanBoard,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
const ScheduleView = dynamic(
  () =>
    import("@/components/features/workspace/detail/schedule-view").then(
      (mod) => mod.ScheduleView,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
const DocsView = dynamic(
  () =>
    import("@/components/features/workspace/detail/docs-view").then(
      (mod) => mod.DocsView,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
const IdeaBoard = dynamic(
  () =>
    import("@/components/features/workspace/detail/idea-board").then(
      (mod) => mod.IdeaBoard,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
const TeamChat = dynamic(
  () =>
    import("@/components/features/workspace/detail/chat/team-chat").then(
      (mod) => mod.TeamChat,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
const WorkspaceMembersView = dynamic(
  () =>
    import("@/components/features/workspace/detail/workspace-members-view").then(
      (mod) => mod.WorkspaceMembersView,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
const WorkspaceSettingsView = dynamic(
  () =>
    import(
      "@/components/features/workspace/detail/workspace-settings-view"
    ).then((mod) => mod.WorkspaceSettingsView),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
const LiveHuddle = dynamic(
  () =>
    import("@/components/features/workspace/detail/huddle/live-huddle").then(
      (mod) => mod.LiveHuddle,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
const UnifiedInbox = dynamic(
  () =>
    import("@/components/features/workspace/personal/unified-inbox").then(
      (mod) => mod.UnifiedInbox,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
const MyBriefcase = dynamic(
  () =>
    import("@/components/features/workspace/personal/my-briefcase").then(
      (mod) => mod.MyBriefcase,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  },
);
import { AdvancedTaskModal } from "@/components/features/workspace/detail/board/advanced-task-modal";
import { useWorkspaceStore } from "@/components/features/workspace/store/mock-data";
import { useSocketStore } from "@/components/features/workspace/store/socket-store";
import { useAuth } from "@/hooks/use-auth";

const ALLOWED_TABS = new Set([
  "overview",
  "board",
  "schedule",
  "docs",
  "ideas",
  "members",
  "settings",
  "inbox",
  "briefcase",
  "huddle",
]);

const normalizeTab = (tab: string | null) => {
  if (!tab) return "overview";
  if (tab.startsWith("chat-")) return tab;
  return ALLOWED_TABS.has(tab) ? tab : "overview";
};

type WorkspaceMeta = {
  read_only?: boolean;
  lifecycle_status?: "IN_PROGRESS" | "COMPLETED";
  result_type?: string | null;
  result_link?: string | null;
  career_import_status?: "NONE" | "PENDING" | "IMPORTED";
  career_imported_experience_id?: string | null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch workspace");
  }
  return res.json() as Promise<WorkspaceMeta>;
};

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const { activeTaskId, setActiveTaskId } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState(() =>
    normalizeTab(searchParams.get("tab")),
  );

  const { connectSocket, disconnectSocket } = useSocketStore();
  const { user } = useAuth({ loadProfile: false });
  const { data: workspaceMeta } = useSWR(
    projectId ? `/api/workspaces/${projectId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );
  const isReadOnly = Boolean(
    workspaceMeta?.read_only || workspaceMeta?.lifecycle_status === "COMPLETED",
  );
  const isCompleted = workspaceMeta?.lifecycle_status === "COMPLETED";
  const hasWorkspaceMeta = Boolean(workspaceMeta);

  const handleTabChange = (
    tab: string,
    options?: { docId?: string | null },
  ) => {
    const normalized = normalizeTab(tab);
    setActiveTab(normalized);

    const nextParams = new URLSearchParams(searchParams.toString());
    if (normalized === "overview") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", normalized);
    }

    if (normalized === "docs" && options?.docId) {
      nextParams.set("doc", options.docId);
    } else if (normalized !== "docs") {
      nextParams.delete("doc");
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get("tab"));
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
  }, [searchParams]);

  useEffect(() => {
    const taskId = searchParams.get("task");
    const nextTab = normalizeTab(searchParams.get("tab"));
    if (nextTab === "board" && taskId) {
      setActiveTaskId(taskId);
    }
  }, [searchParams, setActiveTaskId]);

  useEffect(() => {
    if (!projectId || !user || !hasWorkspaceMeta) {
      return;
    }

    if (isReadOnly) {
      disconnectSocket();
      return;
    }

    const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
    connectSocket(url, user.id, projectId);

    return () => {
      disconnectSocket();
    };
  }, [
    connectSocket,
    disconnectSocket,
    isReadOnly,
    projectId,
    user,
    hasWorkspaceMeta,
  ]);

  const renderContent = () => {
    if (isReadOnly && (activeTab.startsWith("chat-") || activeTab === "huddle")) {
      return (
        <div className="h-full p-6">
          <div className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
            종료된 워크스페이스는 실시간 채팅/음성 기능이 중지됩니다.
            개요, 보드, 문서 등 읽기 전용 탭에서 기록을 확인할 수 있습니다.
          </div>
        </div>
      );
    }

    // ... (existing switch case) ...
    // Copy existing renderContent logic here
    if (activeTab.startsWith("chat-")) {
      return (
        <TeamChat
          projectId={projectId}
          onNavigateToDoc={(docId) => handleTabChange("docs", { docId })}
        />
      );
    }

    if (activeTab === "huddle") {
      return (
        <LiveHuddle
          projectId={projectId}
          onClose={() => handleTabChange("overview")}
        />
      );
    }

    switch (activeTab) {
      case "board":
        return (
          <div className="h-full p-6">
            <KanbanBoard
              projectId={projectId}
              onNavigateToDoc={(docId) =>
                handleTabChange("docs", { docId })
              }
            />
          </div>
        );
      case "schedule":
        return (
          <ScheduleView
            projectId={projectId}
            onNavigateToDoc={(docId) => handleTabChange("docs", { docId })}
          />
        );
      case "docs":
        return (
          <DocsView
            projectId={projectId}
            initialDocId={searchParams.get("doc")}
            onNavigateToTask={(taskId) => {
              setActiveTaskId(taskId);
            }}
          />
        );
      case "ideas":
        if (isCompleted) {
          return (
            <div className="h-full p-6">
              <div className="flex h-full items-center justify-center rounded-xl border bg-muted/30 p-8">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border bg-background text-muted-foreground">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">종료된 워크스페이스입니다</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    아이디어 보드는 종료 후 편집이 잠깁니다. 개요, 문서, 결과 탭에서
                    기록만 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="h-full">
            <IdeaBoard projectId={projectId} readOnly={isReadOnly} />
          </div>
        );
      case "members":
        return (
          <div className="h-full overflow-y-auto p-6">
            <WorkspaceMembersView projectId={projectId} />
          </div>
        );
      case "settings":
        return (
          <div className="h-full overflow-y-auto p-6">
            <WorkspaceSettingsView projectId={projectId} />
          </div>
        );
      case "inbox":
        return (
          <div className="h-full">
            <UnifiedInbox />
          </div>
        );
      case "briefcase":
        return (
          <div className="h-full">
            <MyBriefcase />
          </div>
        );
      default:
        return (
          <div className="h-full overflow-y-auto">
            <DashboardOverview projectId={projectId} />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 top-14 flex overflow-hidden bg-background">
      <WorkspaceSidebar
        projectId={projectId}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <main className="flex-1 overflow-y-auto h-full">
        {isReadOnly && (
          <div className="px-6 pt-4">
            <div className="rounded-lg border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  이 워크스페이스는 종료되어 읽기 전용입니다. 수정, 초대,
                  전송은 비활성화됩니다.
                </span>
                {workspaceMeta?.result_type && (
                  <span className="font-medium text-foreground">
                    결과: {workspaceMeta.result_type}
                  </span>
                )}
                {workspaceMeta?.result_link && (
                  <a
                    href={workspaceMeta.result_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    결과 링크
                  </a>
                )}
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                >
                  <a
                    href={
                      workspaceMeta?.career_import_status === "IMPORTED"
                        ? "/career/experiences"
                        : `/career/experiences/new?workspaceId=${projectId}`
                    }
                  >
                    {workspaceMeta?.career_import_status === "IMPORTED"
                      ? "수정하러 가기"
                      : "내 경험으로 등록하기"}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
        {renderContent()}
      </main>

      <AdvancedTaskModal
        open={!!activeTaskId}
        onOpenChange={(open) => {
          if (!open) setActiveTaskId(null);
        }}
        taskId={activeTaskId}
        projectId={projectId}
      />
    </div>
  );
}
