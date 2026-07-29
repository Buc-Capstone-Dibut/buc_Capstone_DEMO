import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BoardView, Task, ViewColumn } from "../store/mock-data";

type StatusCategory = "todo" | "in-progress" | "done";

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
  isOpen: boolean;
  onClose: () => void;
  activeView: BoardView | null;
  tasks: Task[];
  onCreateColumn: (title: string, category: string) => Promise<boolean>;
  onUpdateColumn: (
    columnId: string,
    updates: { title?: string; color?: string; category?: string },
  ) => Promise<boolean>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onReorderColumns: (columnIds: string[]) => Promise<void>;
  categoryOrder: StatusCategory[];
  onReorderCategories: (categories: StatusCategory[]) => Promise<void>;
}

export function StatusManagerModal({
  isOpen,
  onClose,
  activeView,
  tasks,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderColumns,
  categoryOrder,
  onReorderCategories,
}: StatusManagerModalProps) {
  const [draftTitles, setDraftTitles] = useState<
    Record<StatusCategory, string>
  >({
    todo: "",
    "in-progress": "",
    done: "",
  });
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});
  const [pendingOperation, setPendingOperation] = useState<string | null>(null);

  const groupedColumns = useMemo(() => {
    const groups: Record<StatusCategory, ViewColumn[]> = {
      todo: [],
      "in-progress": [],
      done: [],
    };

    const orderMap = new Map(
      (activeView?.columnOrder || []).map((id, index) => [id, index]),
    );
    const orderedColumns = [...(activeView?.columns || [])].sort((a, b) => {
      const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });

    for (const column of orderedColumns) {
      groups[normalizeCategory(column.category)].push(column);
    }

    return groups;
  }, [activeView?.columnOrder, activeView?.columns]);

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
  }, [activeView?.columns]);

  useEffect(() => {
    if (!isOpen) return;

    setDraftTitles({
      todo: "",
      "in-progress": "",
      done: "",
    });
    setPendingOperation(null);
  }, [isOpen]);

  const handleAddColumn = async (
    category: StatusCategory,
    rawTitle: string,
  ) => {
    const nextTitle = rawTitle.trim();
    if (!nextTitle || pendingOperation) return;

    setPendingOperation(`create:${category}`);
    try {
      const created = await onCreateColumn(nextTitle, category);
      if (created) {
        setDraftTitles((prev) => ({ ...prev, [category]: "" }));
      }
    } finally {
      setPendingOperation(null);
    }
  };

  const commitTitle = async (column: ViewColumn) => {
    const nextTitle = (titleEdits[column.id] || "").trim();
    if (!nextTitle) {
      setTitleEdits((prev) => ({ ...prev, [column.id]: column.title }));
      return;
    }
    if (nextTitle === column.title) return;
    if (pendingOperation) return;

    setPendingOperation(`update:${column.id}`);
    try {
      await onUpdateColumn(column.id, { title: nextTitle });
    } finally {
      setPendingOperation(null);
    }
  };

  const moveColumn = async (
    category: StatusCategory,
    columnId: string,
    direction: -1 | 1,
  ) => {
    if (pendingOperation) return;

    const categoryColumns = groupedColumns[category];
    const currentIndex = categoryColumns.findIndex(
      (column) => column.id === columnId,
    );
    const nextIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= categoryColumns.length
    ) {
      return;
    }

    const reorderedCategory = [...categoryColumns];
    const [movedColumn] = reorderedCategory.splice(currentIndex, 1);
    reorderedCategory.splice(nextIndex, 0, movedColumn);
    const nextOrder = categoryOrder.flatMap((currentCategory) =>
      (currentCategory === category
        ? reorderedCategory
        : groupedColumns[currentCategory]
      ).map((column) => column.id),
    );

    setPendingOperation(`reorder:${columnId}`);
    try {
      await onReorderColumns(nextOrder);
    } finally {
      setPendingOperation(null);
    }
  };

  const moveCategory = async (category: StatusCategory, direction: -1 | 1) => {
    if (pendingOperation) return;

    const currentIndex = categoryOrder.indexOf(category);
    const nextIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= categoryOrder.length
    ) {
      return;
    }

    const nextOrder = [...categoryOrder];
    const [movedCategory] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(nextIndex, 0, movedCategory);

    setPendingOperation(`category:${category}`);
    try {
      await onReorderCategories(nextOrder);
    } finally {
      setPendingOperation(null);
    }
  };

  if (!activeView) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            상태 관리
          </DialogTitle>
          <DialogDescription>
            작업 흐름에 사용할 상태를 추가하거나 이름을 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[78vh] overflow-y-auto p-6">
          <div className="text-sm text-muted-foreground">
            메인 보드는{" "}
            <span className="font-medium text-foreground">
              할 일 / 진행 중 / 완료
            </span>
            3축을 유지합니다. 각 축 아래에 필요한 세부 단계만 추가해서
            사용하세요.
          </div>

          <div className="mt-5 space-y-3">
            {categoryOrder.map((category, categoryIndex) => {
              const config = CATEGORY_CONFIG[category];
              const categoryColumns = groupedColumns[category];
              const isMovingCategory =
                pendingOperation === `category:${category}`;

              return (
                <section key={category} className="rounded-xl border bg-card">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={config.badgeClass}>
                        {config.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="mr-1 text-xs text-muted-foreground">
                        {categoryColumns.length}개
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        disabled={
                          pendingOperation !== null || categoryIndex === 0
                        }
                        aria-label={`${config.label} 축을 위로 이동`}
                        title="상위 축을 위로 이동"
                        onClick={() => void moveCategory(category, -1)}
                      >
                        {isMovingCategory ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        disabled={
                          pendingOperation !== null ||
                          categoryIndex === categoryOrder.length - 1
                        }
                        aria-label={`${config.label} 축을 아래로 이동`}
                        title="상위 축을 아래로 이동"
                        onClick={() => void moveCategory(category, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="border-t px-3 py-2">
                    <div className="space-y-1.5">
                      {categoryColumns.map((column) => {
                        const columnIndex = categoryColumns.findIndex(
                          (item) => item.id === column.id,
                        );
                        const taskCount =
                          taskCountByColumnId.get(column.id) || 0;
                        const canDelete =
                          categoryColumns.length > 1 && taskCount === 0;
                        const isUpdating =
                          pendingOperation === `update:${column.id}`;
                        const isReordering =
                          pendingOperation === `reorder:${column.id}`;
                        const deleteReason =
                          taskCount > 0
                            ? `작업 ${taskCount}개를 먼저 다른 상태로 옮겨주세요.`
                            : categoryColumns.length <= 1
                              ? "각 큰 축에는 최소 하나의 상태가 필요합니다."
                              : `${column.title} 상태 삭제`;

                        return (
                          <div
                            key={column.id}
                            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/30"
                          >
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30"
                              aria-hidden="true"
                            />
                            <Input
                              aria-label={`${column.title} 상태 이름`}
                              className="h-8 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
                              value={titleEdits[column.id] ?? column.title}
                              disabled={isUpdating}
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
                            {isUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                작업 {taskCount}개
                              </span>
                            )}
                            <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground"
                                disabled={
                                  pendingOperation !== null || columnIndex === 0
                                }
                                aria-label={`${column.title} 상태를 위로 이동`}
                                title="위로 이동"
                                onClick={() =>
                                  void moveColumn(category, column.id, -1)
                                }
                              >
                                {isReordering ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ArrowUp className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground"
                                disabled={
                                  pendingOperation !== null ||
                                  columnIndex === categoryColumns.length - 1
                                }
                                aria-label={`${column.title} 상태를 아래로 이동`}
                                title="아래로 이동"
                                onClick={() =>
                                  void moveColumn(category, column.id, 1)
                                }
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                              disabled={!canDelete}
                              aria-label={deleteReason}
                              title={deleteReason}
                              onClick={() => void onDeleteColumn(column.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}

                      <div className="flex items-center gap-2 rounded-lg border border-dashed px-2 py-1.5 focus-within:border-primary/40 focus-within:bg-primary/[0.02]">
                        {pendingOperation === `create:${category}` ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Input
                          aria-label={`${config.label} 상태 추가`}
                          className="h-8 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
                          value={draftTitles[category]}
                          disabled={pendingOperation !== null}
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
                              void handleAddColumn(
                                category,
                                draftTitles[category],
                              );
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          disabled={
                            !draftTitles[category].trim() ||
                            pendingOperation !== null
                          }
                          onClick={() =>
                            void handleAddColumn(
                              category,
                              draftTitles[category],
                            )
                          }
                        >
                          {pendingOperation === `create:${category}`
                            ? "추가 중"
                            : "추가"}
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
