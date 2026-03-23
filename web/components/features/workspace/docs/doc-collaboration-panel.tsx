"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Link2, MessageSquare, CalendarIcon, Flag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocCommentsPanel } from "@/components/features/workspace/docs/doc-comments-panel";

type LinkedTaskRelation = {
  id: string;
  relation_type: string;
  is_primary: boolean;
  task: {
    id: string;
    title: string;
    priority: string | null;
    due_date: string | null;
    column: {
      id: string;
      title: string;
      category: string | null;
    };
  };
};

interface DocCollaborationPanelProps {
  workspaceId: string;
  docId: string;
  readOnly?: boolean;
  currentUserId?: string | null;
  onOpenTask?: (taskId: string) => void;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch panel data");
  }
  return response.json();
};



function priorityLabel(value?: string | null) {
  switch (value) {
    case "urgent":
      return "긴급";
    case "high":
      return "높음";
    case "low":
      return "낮음";
    default:
      return "보통";
  }
}

export function DocCollaborationPanel({
  workspaceId,
  docId,
  readOnly = false,
  currentUserId,
  onOpenTask,
}: DocCollaborationPanelProps) {
  const tasksKey = `/api/workspaces/${workspaceId}/docs/${docId}/tasks`;

  const { data: linkedTasks, mutate: mutateTasks } = useSWR<LinkedTaskRelation[]>(
    tasksKey,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 20_000 },
  );

  const handleOpenTask = (taskId: string) => {
    onOpenTask?.(taskId);
    void mutateTasks();
  };

  return (
    <aside className="hidden w-[340px] shrink-0 border-l bg-muted/10 lg:flex lg:flex-col">
      <Tabs defaultValue="tasks" className="flex h-full flex-col">
        <div className="border-b px-4 py-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks" className="gap-1.5">
              <Link2 className="h-4 w-4" />
              연결 작업
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              댓글
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tasks" className="mt-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full px-4 py-4">
            <div className="space-y-3">
              {linkedTasks && linkedTasks.length > 0 ? (
                linkedTasks.map((relation) => (
                  <button
                    type="button"
                    key={relation.id}
                    onClick={() => handleOpenTask(relation.task.id)}
                    className="w-full rounded-lg border bg-background p-3 text-left transition-all hover:border-foreground/20 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {relation.task.column.title}
                          </span>
                          {relation.is_primary && (
                            <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">
                              대표
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {relation.task.title}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {relation.task.priority && relation.task.priority !== "none" && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground border rounded-sm px-1.5 py-0.5 bg-muted/30">
                          <Flag className="h-3 w-3" />
                          <span>{priorityLabel(relation.task.priority)}</span>
                        </div>
                      )}

                      {relation.task.due_date && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground border rounded-sm px-1.5 py-0.5 bg-muted/30">
                          <CalendarIcon className="h-3 w-3" />
                          <span>
                            {format(new Date(relation.task.due_date), "M/d", {
                              locale: ko,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  아직 연결된 태스크가 없습니다.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="comments"
          className="mt-0 flex-1 data-[state=inactive]:hidden"
        >
          <DocCommentsPanel
            workspaceId={workspaceId}
            docId={docId}
            readOnly={readOnly}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
