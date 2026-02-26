"use client";

import useSWR from "swr";
import { ProjectHero } from "./overview/project-hero";
import { TeamPulse } from "./overview/team-pulse";

import { UpcomingEvents } from "./overview/upcoming-events";
import { DashboardCalendar } from "./overview/dashboard-calendar";
import { Loader2 } from "lucide-react";

interface DashboardOverviewProps {
  projectId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DashboardOverview({ projectId }: DashboardOverviewProps) {
  const swrOptions = {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  } as const;

  // 1. Fetch Project Details
  const { data: project, isLoading: isProjectLoading } = useSWR(
    `/api/workspaces/${projectId}`,
    fetcher,
    swrOptions,
  );

  // 2. Fetch Board Data (Tasks)
  const { data: boardData, isLoading: isBoardLoading } = useSWR(
    `/api/workspaces/${projectId}/board`,
    fetcher,
    swrOptions,
  );

  if (isProjectLoading || isBoardLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 3. Calc Stats
  const tasks = boardData?.tasks || [];
  const totalTasks = tasks.length;
  // Assuming 'done' status id is likely 'done' or 'completed' based on column title logic
  // API returns status as lowercase-hyphenated title.
  const completedTasks = tasks.filter(
    (t: { status?: string }) =>
      t.status === "done" ||
      t.status === "completed" ||
      t.status === "finished",
  ).length;
  const progress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Top Hero Section */}
      <ProjectHero
        project={project}
        progress={progress}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
      />

      {/* Main Grid Layout */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        {/* Left Column: Team & Stats */}
        <div className="md:col-span-4 space-y-6 flex flex-col">
          <div className="min-h-[300px]">
            <TeamPulse members={boardData?.members} projectId={projectId} />
          </div>
          <div className="min-h-[300px]">
            <UpcomingEvents projectId={projectId} tasks={tasks} />
          </div>
        </div>

        {/* Center/Right Column */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <div className="bg-background rounded-xl border shadow-sm overflow-hidden h-full min-h-[600px]">
            <DashboardCalendar projectId={projectId} tasks={tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
