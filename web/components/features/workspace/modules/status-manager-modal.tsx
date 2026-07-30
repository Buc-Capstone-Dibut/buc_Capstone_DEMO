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
  Check,
  Loader2,
  Palette,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const STATUS_COLOR_OPTIONS = [
  { value: "gray", label: "회색", accent: "#787774" },
  { value: "red", label: "빨강", accent: "#C4554D" },
  { value: "orange", label: "주황", accent: "#C77B30" },
  { value: "yellow", label: "노랑", accent: "#A98A32" },
  { value: "green", label: "초록", accent: "#5D865F" },
  { value: "blue", label: "파랑", accent: "#4D7C9B" },
  { value: "indigo", label: "남색", accent: "#5F6FA6" },
  { value: "violet", label: "보라", accent: "#8067A8" },
  { value: "pink", label: "분홍", accent: "#B35C81" },
] as const;

function getDefaultColor(category: StatusCategory) {
  if (category === "in-progress") return "blue";
  if (category === "done") return "green";
  return "gray";
}

function normalizeStatusColor(
  color: string | undefined,
  category: StatusCategory,
) {
  const normalized = (color || "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/^(bg|text|border)-/, "")
    .replace(/-\d+(?:\/\d+)?$/, "");

  return STATUS_COLOR_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : getDefaultColor(category);
}

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
  const [colorPickerColumnId, setColorPickerColumnId] = useState<string | null>(
    null,
  );

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
    setColorPickerColumnId(null);
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

  const changeColumnColor = async (
    column: ViewColumn,
    category: StatusCategory,
    color: string,
  ) => {
    if (pendingOperation) return;
    const currentColor = normalizeStatusColor(column.color, category);
    if (currentColor === color) {
      setColorPickerColumnId(null);
      return;
    }

    setPendingOperation(`update:${column.id}`);
    try {
      const updated = await onUpdateColumn(column.id, { color });
      if (updated) setColorPickerColumnId(null);
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
          <div className="border-b pb-4">
            <div className="text-sm font-medium text-foreground">
              업무 단계 → 세부 상태
            </div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              할 일 · 진행 중 · 완료가 상위 업무 단계이고, 그 아래 항목이 작업에
              직접 지정되는 세부 상태입니다.
            </div>
          </div>

          <div className="mt-2">
            {categoryOrder.map((category, categoryIndex) => {
              const config = CATEGORY_CONFIG[category];
              const categoryColumns = groupedColumns[category];
              const isMovingCategory =
                pendingOperation === `category:${category}`;

              return (
                <section key={category} className="border-b first:border-t">
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

                  <div className="border-t px-4 py-1">
                    <div className="divide-y">
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
                        const selectedColor = normalizeStatusColor(
                          column.color,
                          category,
                        );
                        const selectedColorOption =
                          STATUS_COLOR_OPTIONS.find(
                            (option) => option.value === selectedColor,
                          ) || STATUS_COLOR_OPTIONS[0];
                        const deleteReason =
                          taskCount > 0
                            ? `작업 ${taskCount}개를 먼저 다른 상태로 옮겨주세요.`
                            : categoryColumns.length <= 1
                              ? "각 큰 축에는 최소 하나의 상태가 필요합니다."
                              : `${column.title} 상태 삭제`;

                        return (
                          <div
                            key={column.id}
                            className="group flex items-center gap-2 py-1.5 hover:bg-muted/30"
                          >
                            <Popover
                              open={colorPickerColumnId === column.id}
                              onOpenChange={(open) =>
                                setColorPickerColumnId(open ? column.id : null)
                              }
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="group/color relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  aria-label={`${column.title} 상태 색상 변경`}
                                  title="상태 색상 변경"
                                  disabled={pendingOperation !== null}
                                >
                                  <span
                                    className="h-3 w-3 rounded-full ring-1 ring-black/5 transition-transform group-hover/color:scale-110"
                                    style={{
                                      backgroundColor:
                                        selectedColorOption.accent,
                                    }}
                                  />
                                  <Palette className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-background p-px text-muted-foreground opacity-0 transition-opacity group-hover/color:opacity-100 group-focus-visible/color:opacity-100" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="start"
                                className="w-48 p-3"
                              >
                                <div className="mb-2 text-xs font-medium">
                                  상태 색상
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {STATUS_COLOR_OPTIONS.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      className="flex h-9 items-center justify-center rounded-md border border-transparent hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      aria-label={`${option.label}으로 변경`}
                                      title={option.label}
                                      onClick={() =>
                                        void changeColumnColor(
                                          column,
                                          category,
                                          option.value,
                                        )
                                      }
                                    >
                                      <span
                                        className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                                        style={{
                                          backgroundColor: option.accent,
                                        }}
                                      >
                                        {selectedColor === option.value ? (
                                          <Check className="h-3 w-3" />
                                        ) : null}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
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

                      <div className="flex items-center gap-2 border-t border-dashed py-1.5 focus-within:border-primary/40 focus-within:bg-primary/[0.02]">
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
