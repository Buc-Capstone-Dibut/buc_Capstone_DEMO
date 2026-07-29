"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FocusTask = {
  id: string;
  title: string;
  assigneeId?: string | null;
  status?: string;
  priorityId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

interface MyFocusProps {
  tasks: FocusTask[];
  userId?: string;
}

export function MyFocus({ tasks, userId }: MyFocusProps) {
  // Filter for my pending tasks
  const myTasks = tasks
    .filter(
      (t) =>
        t.assigneeId === userId &&
        t.status !== "done" &&
        t.status !== "completed",
    )
    .slice(0, 5); // Top 5

  const handleComplete = (taskId: string) => {
    void taskId;
    toast.success("Task marked as complete! (Mock)");
    // Here we would call API to update status
  };

  return (
    <Card className="flex flex-col h-full border-none shadow-sm bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          My Focus
          <Badge variant="secondary" className="ml-2 rounded-md">
            {myTasks.length} Pending
          </Badge>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
        >
          View All <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {myTasks.length > 0 ? (
          <ScrollArea className="h-[240px] px-6">
            <div className="space-y-3 py-2">
              {myTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-xl border bg-background hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => handleComplete(task.id)}
                >
                  <div className="mt-1">
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 h-5 border-none",
                          task.priorityId === "high"
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {task.priorityId || "Normal"}
                      </Badge>
                      {(task.startDate || task.endDate) && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.startDate || "미정"} → {task.endDate || "미정"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 opacity-20" />
            </div>
            <p className="text-sm">You&apos;re all caught up!</p>
            <Button variant="link" size="sm" className="mt-2 text-primary">
              Pick a new task from Board
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
