"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Link2, MessageSquare } from "lucide-react";
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

function relationLabel(value: string) {
  switch (value) {
    case "spec":
      return "명세";
    case "meeting_note":
      return "회의록";
    case "result":
      return "결과";
    case "qa":
      return "QA";
    case "design":
      return "디자인";
    default:
      return "참고";
  }
}

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
                    className="w-full rounded-xl border bg-background px-3 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {relation.task.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {relation.task.column.title}
                        </p>
                      </div>
                      {relation.is_primary && (
                        <Badge variant="secondary" className="text-[10px]">
                          대표
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="outline">
                        {relationLabel(relation.relation_type)}
                      </Badge>
                      <Badge variant="outline">
                        우선순위 {priorityLabel(relation.task.priority)}
                      </Badge>
                      {relation.task.due_date && (
                        <Badge variant="outline">
                          {format(new Date(relation.task.due_date), "M/d", {
                            locale: ko,
                          })}
                        </Badge>
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
