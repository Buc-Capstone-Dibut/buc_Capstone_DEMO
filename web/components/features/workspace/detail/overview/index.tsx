"use client";

import { ProjectHero } from "./project-hero";
import { TeamWidget } from "./team-widget";
import { UpcomingEvents } from "./upcoming-events";
import { DashboardCalendar } from "./dashboard-calendar";

interface DashboardOverviewProps {
  projectId: string;
}

export function DashboardOverview({ projectId }: DashboardOverviewProps) {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Hero Section */}
      <ProjectHero projectId={projectId} />

      {/* Main Grid Layout */}
      <div className="grid gap-6 md:grid-cols-12 h-[600px]">
        {/* Left Column: Team & Schedule */}
        <div className="md:col-span-4 space-y-6 flex flex-col h-full">
          <div className="flex-1 min-h-0">
            <TeamWidget projectId={projectId} />
          </div>
          <div className="flex-1 min-h-0">
            <UpcomingEvents projectId={projectId} />
          </div>
        </div>

        {/* Right Column: Calendar */}
        <div className="md:col-span-8 h-full bg-background rounded-xl border shadow-sm overflow-hidden">
          <DashboardCalendar projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
