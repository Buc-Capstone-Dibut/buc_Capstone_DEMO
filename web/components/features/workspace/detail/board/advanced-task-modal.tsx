"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Calendar as CalendarIcon,
  User,
  Flag,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";

// --- Types ---
interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  columnId: string;
  projectId: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string | null;
  assignee?: { id: string; name: string; avatar?: string };
  tags?: any[];
  [key: string]: any;
}

interface AdvancedTaskModalProps {
  taskId: string | null;
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AdvancedTaskModal({
  taskId,
  projectId,
  open,
  onOpenChange,
}: AdvancedTaskModalProps) {
  const { mutate } = useSWRConfig();

  // --- Data Fetching ---
  const swrOptions = {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  } as const;
  const { data: boardData } = useSWR(
    projectId && open ? `/api/workspaces/${projectId}/board` : null,
    fetcher,
    swrOptions,
  );

  const tasks: Task[] = boardData?.tasks || [];
  const columns: any[] = boardData?.columns || [];
  const members = boardData?.members || [];

  const task = tasks.find((t) => t.id === taskId);

  // --- Local State ---
  // We use a local state to drive the UI immediately (Optimistic UI)
  const [localTask, setLocalTask] = useState<Partial<Task>>({});

  useEffect(() => {
    if (task) {
      setLocalTask({
        title: task.title,
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        assigneeId: task.assigneeId || "unassigned",
        dueDate: task.dueDate,
        tags: task.tags || [],
      });
    }
  }, [task]);

  // --- Handlers ---

  const handleUpdate = async (updates: Partial<Task>) => {
    if (!task || !projectId) return;

    // 1. Optimistic Update Local State
    setLocalTask((prev) => ({ ...prev, ...updates }));

    // 2. Optimistic Update SWR Cache
    const endpoint = `/api/workspaces/${projectId}/board`;
    await mutate(
      endpoint,
      (current: any) => {
        if (!current) return current;
        const newTasks = current.tasks.map((t: Task) =>
          t.id === task.id ? { ...t, ...updates } : t,
        );
        return { ...current, tasks: newTasks };
      },
      false,
    );

    // 3. API Call
    try {
      const res = await fetch(
        `/api/workspaces/${projectId}/board/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );

      if (!res.ok) throw new Error("Failed to update");

      // Success: Revalidate to ensure consistency
      mutate(endpoint);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save changes");
      mutate(endpoint); // Revert on error by re-fetching
    }
  };

  const handleStatusChange = (newStatus: string) => {
    // Helper to find column ID from status string
    const col = columns.find(
      (c) =>
        c.statusId === newStatus ||
        c.id === newStatus ||
        c.title.toLowerCase() === newStatus,
    );
    if (col) {
      handleUpdate({ status: newStatus, columnId: col.id });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await fetch(`/api/workspaces/${projectId}/board/tasks/${taskId}`, {
        method: "DELETE",
      });
      toast.success("Task deleted");
      onOpenChange(false);
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e) {
      toast.error("Failed to delete task");
    }
  };

  // --- Helpers ---
  const currentMember = members.find((m: any) => m.id === localTask.assigneeId);
  const selectedDate = localTask.dueDate
    ? new Date(localTask.dueDate)
    : undefined;

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col gap-0 bg-background overflow-hidden outline-none sm:rounded-lg">
        <DialogTitle className="sr-only">Task Details</DialogTitle>

        {/* Header Section */}
        <div className="flex-shrink-0 border-b p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs font-mono uppercase text-muted-foreground"
              >
                {task.id.slice(-6)}
              </Badge>
              {/* Status Select */}
              <Select
                value={localTask.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="h-7 w-[130px] text-xs border-dashed">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        localTask.status === "done"
                          ? "bg-green-500"
                          : localTask.status === "in-progress"
                            ? "bg-blue-500"
                            : "bg-gray-400",
                      )}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.statusId || col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 
              Removed manual Close button as DialogContent provides one automatically.
              If you want spacing, we can keep an empty div or nothing.
              Justify-between will push the left content to the left.
            */}
          </div>

          <Input
            value={localTask.title || ""}
            onChange={(e) =>
              setLocalTask((prev) => ({ ...prev, title: e.target.value }))
            }
            onBlur={(e) => {
              if (e.target.value !== task.title)
                handleUpdate({ title: e.target.value });
            }}
            className="text-2xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
            placeholder="Task Title"
          />
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col md:flex-row h-full">
            {/* Main Content (Left) */}
            <div className="flex-1 p-6 space-y-8 border-r">
              {/* Description */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Description
                </div>
                <Textarea
                  value={localTask.description || ""}
                  onChange={(e) =>
                    setLocalTask((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  onBlur={(e) => {
                    if (e.target.value !== task.description)
                      handleUpdate({ description: e.target.value });
                  }}
                  placeholder="Add a more detailed description..."
                  className="min-h-[200px] resize-none border-none bg-muted/30 focus-visible:ring-0 p-4"
                />
              </div>
            </div>

            {/* Sidebar (Right) */}
            <div className="w-full md:w-[300px] bg-muted/10 p-6 space-y-6">
              {/* Assignee */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Assignee
                </span>
                <Select
                  value={localTask.assigneeId || "unassigned"}
                  onValueChange={(val) =>
                    handleUpdate({
                      assigneeId: val === "unassigned" ? null : val,
                    })
                  }
                >
                  <SelectTrigger className="w-full justify-start bg-transparent border-muted-foreground/20 hover:bg-muted/50">
                    <div className="flex items-center gap-2 text-sm">
                      {localTask.assigneeId &&
                      localTask.assigneeId !== "unassigned" ? (
                        <>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={currentMember?.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {currentMember?.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{currentMember?.name}</span>
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Unassigned
                          </span>
                        </>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={m.avatar} />
                            <AvatarFallback>{m.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span>{m.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Priority
                </span>
                <Select
                  value={localTask.priority || "medium"}
                  onValueChange={(val) => handleUpdate({ priority: val })}
                >
                  <SelectTrigger className="w-full justify-start bg-transparent border-muted-foreground/20 hover:bg-muted/50">
                    <div className="flex items-center gap-2 text-sm capitalize">
                      <Flag
                        className={cn(
                          "h-4 w-4",
                          localTask.priority === "urgent"
                            ? "text-red-500 fill-red-500"
                            : localTask.priority === "high"
                              ? "text-orange-500"
                              : localTask.priority === "low"
                                ? "text-gray-400"
                                : "text-blue-500",
                        )}
                      />
                      {localTask.priority || "Medium"}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Due Date
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-transparent border-muted-foreground/20 hover:bg-muted/50",
                        !selectedDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) =>
                        handleUpdate({ dueDate: date?.toISOString() })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Delete */}
              <div className="pt-6 border-t mt-4">
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
