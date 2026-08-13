"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { ProjectHero } from "./overview/project-hero";
import { WorkspaceResultCard } from "./overview/workspace-result-card";
import { TeamPulse } from "./overview/team-pulse";
import dynamic from "next/dynamic";

interface DashboardOverviewProps {
  projectId: string;
}

type WorkspaceProject = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  my_role?: string | null;
  members?: Array<unknown>;
  lifecycle_status?: "IN_PROGRESS" | "COMPLETED";
  completed_at?: string | null;
  result_type?: string | null;
  result_link?: string | null;
  result_note?: string | null;
};

type BoardTask = {
  id: string;
  title: string;
  status?: string;
  category?: string | null;
  columnTitle?: string | null;
  endDate?: string | null;
  assignee?: string | null;
  assigneeIds?: string[];
  assignees?: Array<{
    id: string;
    name?: string | null;
    avatar?: string | null;
  }>;
};

type BoardData = {
  tasks?: BoardTask[];
  members?: Array<{ id: string; name?: string | null; avatar?: string | null }>;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// FullCalendar (~250KB: react adapter + core + daygrid + interaction) is the
// heaviest dependency on the workspace route and was pulled into the eager
// page bundle through this overview. Load it client-side after paint so it no
// longer blocks initial render. ssr:false — FullCalendar is browser-only.
const DashboardCalendar = dynamic(
  () =>
    import("./overview/dashboard-calendar").then((m) => m.DashboardCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[480px] items-center justify-center rounded-xl border bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export function DashboardOverview({ projectId }: DashboardOverviewProps) {
  const swrOptions = {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  } as const;

  const { data: project, isLoading: isProjectLoading } =
    useSWR<WorkspaceProject>(
      `/api/workspaces/${projectId}`,
      fetcher,
      swrOptions,
    );

  const { data: boardData, isLoading: isBoardLoading } = useSWR<BoardData>(
    `/api/workspaces/${projectId}/board`,
    fetcher,
    swrOptions,
  );

  if (isProjectLoading || isBoardLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tasks = boardData?.tasks ?? [];
  const showResultCard =
    project?.lifecycle_status === "COMPLETED" ||
    Boolean(
      project?.result_type || project?.result_link || project?.result_note,
    );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 animate-in fade-in duration-500">
      <ProjectHero project={project} />

      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <TeamPulse tasks={tasks} projectId={projectId} />
          {showResultCard && (
            <WorkspaceResultCard
              lifecycleStatus={project?.lifecycle_status}
              completedAt={project?.completed_at}
              resultType={project?.result_type}
              resultLink={project?.result_link}
              resultNote={project?.result_note}
            />
          )}
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-md border bg-background shadow-sm">
            <DashboardCalendar projectId={projectId} tasks={tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
