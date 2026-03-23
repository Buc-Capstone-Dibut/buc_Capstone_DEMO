import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BoardView, Task, ViewColumn } from "../store/mock-data";

type StatusCategory = "todo" | "in-progress" | "done";

const CATEGORY_ORDER: StatusCategory[] = ["todo", "in-progress", "done"];

const CATEGORY_CONFIG: Record<
  StatusCategory,
  {
    label: string;
    description: string;
    badgeClass: string;
    inputPlaceholder: string;
  }
> = {
  todo: {
    label: "할 일",
    description: "시작 전 단계",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    inputPlaceholder: "예: 백로그, 보류",
  },
  "in-progress": {
    label: "진행 중",
    description: "작업 중 단계",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    inputPlaceholder: "예: 구현 중, 검토, QA",
  },
  done: {
    label: "완료",
    description: "마무리 단계",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    inputPlaceholder: "예: 배포 완료, 제출 완료",
  },
};

function normalizeCategory(value?: string | null): StatusCategory {
  if (value === "in-progress" || value === "done") return value;
  return "todo";
}

interface StatusManagerModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  activeView: BoardView | null;
  tasks: Task[];
  onCreateColumn: (title: string, category: string) => Promise<void>;
  onUpdateColumn: (
    columnId: string,
    updates: { title?: string; color?: string; category?: string },
  ) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
}

export function StatusManagerModal({
  isOpen,
  onClose,
  activeView,
  tasks,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
}: StatusManagerModalProps) {
  const [draftTitles, setDraftTitles] = useState<Record<StatusCategory, string>>({
    todo: "",
    "in-progress": "",
    done: "",
  });
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});

  const groupedColumns = useMemo(() => {
    const groups: Record<StatusCategory, ViewColumn[]> = {
      todo: [],
      "in-progress": [],
      done: [],
    };

    for (const column of activeView?.columns || []) {
      groups[normalizeCategory(column.category)].push(column);
    }

    return groups;
  }, [activeView?.columns]);

  const taskCountByColumnId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      if (!task.columnId) continue;
      counts.set(task.columnId, (counts.get(task.columnId) || 0) + 1);
    }
    return counts;
  }, [tasks]);

  useEffect(() => {
    const nextEdits: Record<string, string> = {};
    for (const column of activeView?.columns || []) {
      nextEdits[column.id] = column.title;
    }
    setTitleEdits(nextEdits);
    setDraftTitles({
      todo: "",
      "in-progress": "",
      done: "",
    });
  }, [activeView?.columns, activeView?.id, isOpen]);

  const handleAddColumn = async (category: StatusCategory, rawTitle: string) => {
    const nextTitle = rawTitle.trim();
    if (!nextTitle) return;
    await onCreateColumn(nextTitle, category);
    setDraftTitles((prev) => ({ ...prev, [category]: "" }));
  };

  const commitTitle = async (column: ViewColumn) => {
    const nextTitle = (titleEdits[column.id] || "").trim();
    if (!nextTitle) {
      setTitleEdits((prev) => ({ ...prev, [column.id]: column.title }));
      return;
    }
    if (nextTitle === column.title) return;
    await onUpdateColumn(column.id, { title: nextTitle });
  };

  if (!activeView) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            섹션 관리
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[78vh] overflow-y-auto p-6">
          <div className="text-sm text-muted-foreground">
            메인 보드는 <span className="font-medium text-foreground">할 일 / 진행 중 / 완료</span>
            3축을 유지합니다. 각 축 아래에 필요한 세부 단계만 추가해서 사용하세요.
          </div>

          <div className="mt-5 space-y-3">
            {CATEGORY_ORDER.map((category) => {
              const config = CATEGORY_CONFIG[category];
              const categoryColumns = groupedColumns[category];

              return (
                <section
                  key={category}
                  className="rounded-xl border bg-card"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={config.badgeClass}>
                        {config.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {categoryColumns.length}개
                    </span>
                  </div>

                  <div className="border-t px-3 py-2">
                    <div className="space-y-1.5">
                      {categoryColumns.map((column) => {
                        const taskCount = taskCountByColumnId.get(column.id) || 0;
                        const canDelete = categoryColumns.length > 1 && taskCount === 0;

                        return (
                          <div
                            key={column.id}
                            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/30"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground/60" />
                            <Input
                              className="h-8 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
                              value={titleEdits[column.id] ?? column.title}
                              onChange={(event) =>
                                setTitleEdits((prev) => ({
                                  ...prev,
                                  [column.id]: event.target.value,
                                }))
                              }
                              onBlur={() => void commitTitle(column)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void commitTitle(column);
                                }
                              }}
                            />
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {taskCount}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                              disabled={!canDelete}
                              onClick={() => void onDeleteColumn(column.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}

                      <div className="flex items-center gap-2 rounded-lg border border-dashed px-2 py-1.5">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                        <Input
                          className="h-8 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
                          value={draftTitles[category]}
                          placeholder={config.inputPlaceholder}
                          onChange={(event) =>
                            setDraftTitles((prev) => ({
                              ...prev,
                              [category]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void handleAddColumn(category, draftTitles[category]);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            void handleAddColumn(category, draftTitles[category])
                          }
                        >
                          추가
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
