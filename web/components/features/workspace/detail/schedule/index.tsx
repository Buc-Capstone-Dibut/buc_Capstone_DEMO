"use client";

import { useWorkspaceStore, Task } from "../../store/mock-data";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { TaskSidePanel } from "../task-side-panel";
import { useState } from "react";
import { Card } from "@/components/ui/card";

interface ScheduleViewProps {
  projectId: string;
}

export function ScheduleView({ projectId }: ScheduleViewProps) {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Filter tasks with dueDate and belongs to project
  const events = tasks
    .filter(t => t.projectId === projectId && t.dueDate)
    .map(t => ({
       id: t.id,
       title: t.title,
       date: t.dueDate,
       backgroundColor: t.status === 'done' ? '#10b981' : t.status === 'in-progress' ? '#3b82f6' : '#6b7280',
       borderColor: 'transparent',
       extendedProps: { status: t.status }
    }));

  const handleEventClick = (info: any) => {
     setEditingTaskId(info.event.id);
  };

  return (
    <div className="h-full p-6 flex flex-col">
       <div className="mb-6 flex items-center justify-between">
         <h2 className="text-2xl font-bold">Schedule</h2>
       </div>

       <Card className="flex-1 p-4 shadow-sm border-none bg-background h-full overflow-hidden">
          <div className="h-full w-full calendar-wrapper">
             <FullCalendar
               plugins={[dayGridPlugin, interactionPlugin]}
               initialView="dayGridMonth"
               events={events}
               eventClick={handleEventClick}
               headerToolbar={{
                 left: 'prev,next today',
                 center: 'title',
                 right: 'dayGridMonth,dayGridWeek'
               }}
               height="100%"
               dayMaxEvents={true}
             />
          </div>
       </Card>

       <TaskSidePanel
         taskId={editingTaskId}
         open={!!editingTaskId}
         onOpenChange={(open) => !open && setEditingTaskId(null)}
       />

       <style jsx global>{`
         .calendar-wrapper .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 700; }
         .calendar-wrapper .fc-button {
             background-color: transparent;
             color: hsl(var(--foreground));
             border: 1px solid hsl(var(--border));
             box-shadow: none;
         }
         .calendar-wrapper .fc-button:hover {
             background-color: hsl(var(--muted));
             color: hsl(var(--foreground));
         }
         .calendar-wrapper .fc-button-primary:not(:disabled).fc-button-active {
             background-color: hsl(var(--primary));
             color: hsl(var(--primary-foreground));
         }
       `}</style>
    </div>
  );
}
