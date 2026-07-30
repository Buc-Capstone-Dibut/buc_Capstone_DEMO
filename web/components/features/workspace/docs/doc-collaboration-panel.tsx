"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import useSWR from "swr";
import {
  Link2,
  MessageSquare,
  CalendarIcon,
  Flag,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocCommentsPanel } from "@/components/features/workspace/docs/doc-comments-panel";
import { cn } from "@/lib/utils";

type LinkedTaskRelation = {
  id: string;
  relation_type: string;
  is_primary: boolean;
  task: {
    id: string;
    title: string;
    priority: string | null;
    start_date: string | null;
    end_date: string | null;
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

const PANEL_DEFAULT_WIDTH = 340;
const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 520;
const PANEL_COLLAPSED_WIDTH = 44;
const PANEL_COLLAPSE_THRESHOLD = 150;

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
  const [activeTab, setActiveTab] = useState<"tasks" | "comments">("tasks");
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const lastExpandedWidthRef = useRef(PANEL_DEFAULT_WIDTH);
  const tasksKey = `/api/workspaces/${workspaceId}/docs/${docId}/tasks`;

  const { data: linkedTasks, mutate: mutateTasks } = useSWR<
    LinkedTaskRelation[]
  >(tasksKey, fetcher, { revalidateOnFocus: false, dedupingInterval: 20_000 });

  const handleOpenTask = (taskId: string) => {
    onOpenTask?.(taskId);
    void mutateTasks();
  };

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      if (current) {
        setPanelWidth(lastExpandedWidthRef.current);
      } else {
        lastExpandedWidthRef.current = panelWidth;
      }
      return !current;
    });
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = isCollapsed ? PANEL_COLLAPSED_WIDTH : panelWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const rawWidth = startWidth + startX - moveEvent.clientX;
      if (rawWidth < PANEL_COLLAPSE_THRESHOLD) {
        setIsCollapsed(true);
        return;
      }

      const nextWidth = Math.min(
        PANEL_MAX_WIDTH,
        Math.max(PANEL_MIN_WIDTH, rawWidth),
      );
      lastExpandedWidthRef.current = nextWidth;
      setPanelWidth(nextWidth);
      setIsCollapsed(false);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "Home") {
      event.preventDefault();
      if (panelWidth > PANEL_MIN_WIDTH && event.key === "ArrowRight") {
        const nextWidth = Math.max(PANEL_MIN_WIDTH, panelWidth - 16);
        lastExpandedWidthRef.current = nextWidth;
        setPanelWidth(nextWidth);
      } else {
        setIsCollapsed(true);
      }
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const nextWidth = isCollapsed
        ? lastExpandedWidthRef.current
        : Math.min(PANEL_MAX_WIDTH, panelWidth + 16);
      lastExpandedWidthRef.current = nextWidth;
      setPanelWidth(nextWidth);
      setIsCollapsed(false);
    }

    if (event.key === "End") {
      event.preventDefault();
      lastExpandedWidthRef.current = PANEL_DEFAULT_WIDTH;
      setPanelWidth(PANEL_DEFAULT_WIDTH);
      setIsCollapsed(false);
    }
  };

  return (
    <>
      <div
        role="separator"
        aria-label="문서 협업 패널 너비 조절"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={handleResizeStart}
        onKeyDown={handleResizeKeyDown}
        onDoubleClick={toggleCollapsed}
        className={cn(
          "group relative hidden w-1 shrink-0 cursor-col-resize bg-transparent lg:block",
          isResizing ? "bg-border/80" : "hover:bg-border/60",
        )}
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
      </div>

      <aside
        className="hidden shrink-0 bg-muted/10 lg:flex lg:flex-col"
        style={{ width: isCollapsed ? PANEL_COLLAPSED_WIDTH : panelWidth }}
      >
        {isCollapsed ? (
          <div className="flex h-full w-full flex-col items-center gap-1 border-l py-2">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              title="협업 패널 펼치기"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
            <div className="my-1 h-px w-6 bg-border" />
            <button
              type="button"
              onClick={() => {
                setActiveTab("tasks");
                toggleCollapsed();
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                activeTab === "tasks" && "bg-muted text-foreground",
              )}
              title="연결 작업"
            >
              <Link2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("comments");
                toggleCollapsed();
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                activeTab === "comments" && "bg-muted text-foreground",
              )}
              title="댓글"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "tasks" | "comments")
            }
            className="flex h-full min-w-0 flex-col border-l"
          >
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <TabsList className="grid min-w-0 flex-1 grid-cols-2">
                <TabsTrigger value="tasks" className="gap-1.5">
                  <Link2 className="h-4 w-4" />
                  연결 작업
                </TabsTrigger>
                <TabsTrigger value="comments" className="gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  댓글
                </TabsTrigger>
              </TabsList>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                title="협업 패널 접기"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>

            <TabsContent
              value="tasks"
              className="mt-0 flex-1 data-[state=inactive]:hidden"
            >
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
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1 text-[9px] bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"
                                >
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
                          {relation.task.priority &&
                            relation.task.priority !== "none" && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground border rounded-sm px-1.5 py-0.5 bg-muted/30">
                                <Flag className="h-3 w-3" />
                                <span>
                                  {priorityLabel(relation.task.priority)}
                                </span>
                              </div>
                            )}

                          {(relation.task.start_date ||
                            relation.task.end_date) && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground border rounded-sm px-1.5 py-0.5 bg-muted/30">
                              <CalendarIcon className="h-3 w-3" />
                              <span>
                                {relation.task.start_date
                                  ?.slice(5)
                                  .replace("-", "/") || "미정"}
                                {" → "}
                                {relation.task.end_date
                                  ?.slice(5)
                                  .replace("-", "/") || "미정"}
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
        )}
      </aside>
    </>
  );
}
