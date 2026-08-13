"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceStore } from "../store/mock-data";
import { Calendar as CalendarIcon, FileText } from "lucide-react";
import { TaskAssigneePicker } from "@/components/features/workspace/common/task-assignee-picker";
import { getTaskAssigneeIds } from "@/lib/workspace/task-assignees";

interface TaskSidePanelProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToDoc?: (docId: string) => void;
}

export function TaskSidePanel({ taskId, open, onOpenChange, onNavigateToDoc }: TaskSidePanelProps) {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const updateTask = useWorkspaceStore((s) => s.updateTask);
  const projects = useWorkspaceStore((s) => s.projects);
  const task = tasks.find(t => t.id === taskId);
  const members = projects.find((project) => project.id === task?.projectId)?.members || [];

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="uppercase font-bold text-xs border px-1 rounded bg-muted">
              {task.projectId.split('-')[1]}-{task.id.split('-')[1]}
            </span>
            <span>in {task.status}</span>
          </div>
          <SheetTitle>
            <Input
              value={task.title}
              onChange={(e) => updateTask(task.id, { title: e.target.value })}
              className="text-xl font-bold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
            />
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Status & Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select defaultValue={task.status} onValueChange={(v: any) => updateTask(task.id, { status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <TaskAssigneePicker
                members={members}
                value={getTaskAssigneeIds(task)}
                onValueChange={(assigneeIds) =>
                  updateTask(task.id, { assigneeIds })
                }
              />
            </div>
          </div>

          {/* Date & Doc Link */}
          <div className="space-y-2">
             <Label>Due Date</Label>
             <div className="relative">
               <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input
                 type="date"
                 className="pl-8"
                 value={task.dueDate || ''}
                 onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
               />
             </div>
          </div>

          {task.docRef && (
            <div className="p-4 border rounded-lg bg-muted/20 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <FileText className="h-5 w-5 text-blue-500" />
                 <div className="text-sm font-medium">Linked Document</div>
               </div>
               <Button variant="outline" size="sm" onClick={() => {
                 onOpenChange(false);
                 onNavigateToDoc?.(task.docRef!);
               }}>
                 Open Doc
               </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              className="min-h-[150px]"
              placeholder="Add a description..."
              value={task.description || ''}
              onChange={(e) => updateTask(task.id, { description: e.target.value })}
            />
          </div>
        </div>

        <SheetFooter>
           {/* Actions */}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
