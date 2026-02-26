"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { WorkspaceSidebar } from "@/components/features/workspace/detail/workspace-sidebar";
import { DashboardOverview } from "@/components/features/workspace/detail/dashboard-overview";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function WorkspaceDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { activeTaskId, setActiveTaskId } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState("overview");

  const { connectSocket, disconnectSocket } = useSocketStore();
  const { user } = useAuth({ loadProfile: false });

  useEffect(() => {
    if (projectId && user) {
      const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
      connectSocket(url, user.id, projectId);
    }
    return () => {
      disconnectSocket();
    };
  }, [projectId, user, connectSocket, disconnectSocket]);

  const renderContent = () => {
    // ... (existing switch case) ...
    // Copy existing renderContent logic here
    if (activeTab.startsWith("chat-")) {
      return <TeamChat projectId={projectId} />;
    }

    if (activeTab === "huddle") {
      return (
        <LiveHuddle
          projectId={projectId}
          onClose={() => setActiveTab("overview")}
        />
      );
    }

    switch (activeTab) {
      case "board":
        return (
          <div className="h-full p-6">
            <KanbanBoard
              projectId={projectId}
              onNavigateToDoc={() => setActiveTab("docs")}
            />
          </div>
        );
      case "schedule":
        return <ScheduleView projectId={projectId} />;
      case "docs":
        return <DocsView projectId={projectId} />;
      case "ideas":
        return (
          <div className="h-full">
            <IdeaBoard projectId={projectId} />
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
        onTabChange={setActiveTab}
      />
      <main className="flex-1 overflow-y-auto h-full">
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
