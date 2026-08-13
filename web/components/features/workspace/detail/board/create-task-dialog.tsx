"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Check,
  Loader2,
  PencilLine,
  Plus,
  Tag as TagIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TaskAssigneePicker } from "@/components/features/workspace/common/task-assignee-picker";
import { cn } from "@/lib/utils";

type TaskColumnOption = {
  id: string;
  title: string;
  category?: string;
};

type TaskMemberOption = {
  id: string;
  name?: string | null;
  avatar?: string | null;
};

type TaskPriorityOption = {
  id: string;
  name: string;
  color?: string;
  order?: number;
};

type TaskTagOption = {
  id: string;
  name: string;
  color?: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  columnId?: string;
  status?: string;
  statusId?: string;
  columnCategory?: string;
  assigneeId?: string | null;
  assigneeIds?: string[];
  priorityId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tags?: string[];
};

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: TaskColumnOption[];
  members: TaskMemberOption[];
  priorities: TaskPriorityOption[];
  tags: TaskTagOption[];
  defaults?: Partial<CreateTaskInput>;
  onCreate: (input: CreateTaskInput) => Promise<boolean | void>;
  onCreateTag?: (name: string) => Promise<TaskTagOption | null>;
  onManageStatuses?: () => void;
  onManagePriorities?: () => void;
}

function getDefaultColumnId(
  columns: TaskColumnOption[],
  requestedColumnId?: string,
) {
  if (
    requestedColumnId &&
    columns.some((column) => column.id === requestedColumnId)
  ) {
    return requestedColumnId;
  }

  return (
    columns.find((column) => column.category === "todo")?.id ||
    columns[0]?.id ||
    ""
  );
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  columns,
  members,
  priorities,
  tags,
  defaults,
  onCreate,
  onCreateTag,
  onManageStatuses,
  onManagePriorities,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priorityId, setPriorityId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [createdTagOptions, setCreatedTagOptions] = useState<TaskTagOption[]>(
    [],
  );
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultPriorityId = useMemo(
    () =>
      priorities.find((priority) => priority.id === "medium")?.id ||
      priorities[0]?.id ||
      "",
    [priorities],
  );
  const availableTags = useMemo(() => {
    const byId = new Map<string, TaskTagOption>();
    for (const tag of [...tags, ...createdTagOptions]) {
      byId.set(tag.id, tag);
    }
    return Array.from(byId.values());
  }, [createdTagOptions, tags]);

  useEffect(() => {
    if (!open) return;

    setTitle(
      defaults?.title && defaults.title !== "새 작업" ? defaults.title : "",
    );
    setDescription(defaults?.description || "");
    setColumnId(getDefaultColumnId(columns, defaults?.columnId));
    setAssigneeIds(
      defaults?.assigneeIds || (defaults?.assigneeId ? [defaults.assigneeId] : []),
    );
    setPriorityId(defaults?.priorityId || defaultPriorityId);
    setStartDate(defaults?.startDate || "");
    setEndDate(defaults?.endDate || "");
    setSelectedTagIds(defaults?.tags || []);
    setNewTagName("");
    setCreatedTagOptions([]);
    setIsCreatingTag(false);
    setIsSubmitting(false);
  }, [columns, defaultPriorityId, defaults, open]);

  const hasInvalidDateRange = Boolean(
    startDate && endDate && startDate > endDate,
  );
  const canCreate = Boolean(
    title.trim() && columnId && !hasInvalidDateRange && !isSubmitting,
  );

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    setIsSubmitting(true);
    const created = await onCreate({
      title: title.trim(),
      description: description.trim(),
      columnId,
      assigneeIds,
      priorityId: priorityId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      tags: selectedTagIds,
    });
    setIsSubmitting(false);

    if (created !== false) {
      onOpenChange(false);
    }
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name || isCreatingTag) return;

    const existingTag = availableTags.find(
      (tag) => tag.name.toLowerCase() === name.toLowerCase(),
    );
    if (existingTag) {
      setSelectedTagIds((current) =>
        current.includes(existingTag.id)
          ? current
          : [...current, existingTag.id],
      );
      setNewTagName("");
      return;
    }

    if (!onCreateTag) return;

    setIsCreatingTag(true);
    try {
      const createdTag = await onCreateTag(name);
      if (!createdTag) return;

      setCreatedTagOptions((current) => [...current, createdTag]);
      setSelectedTagIds((current) =>
        current.includes(createdTag.id) ? current : [...current, createdTag.id],
      );
      setNewTagName("");
    } finally {
      setIsCreatingTag(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[620px]">
        <DialogHeader className="border-b bg-muted/20 px-6 py-4">
          <DialogTitle>새 작업 만들기</DialogTitle>
          <DialogDescription>
            작업을 만들기 전에 담당자와 진행 정보를 함께 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor="create-task-title" className="text-xs font-medium">
              제목 <span className="text-destructive">*</span>
            </label>
            <Input
              id="create-task-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="무엇을 해야 하나요?"
              onKeyDown={(event) => {
                if (event.key === "Enter" && canCreate) {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <div className="flex h-6 items-center justify-between">
                <span className="text-xs font-medium">상태</span>
                {onManageStatuses && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground"
                    onClick={onManageStatuses}
                  >
                    <PencilLine className="h-3 w-3" />
                    편집
                  </Button>
                )}
              </div>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex h-6 items-center">
                <span className="text-xs font-medium">담당자</span>
              </div>
              <TaskAssigneePicker
                members={members}
                value={assigneeIds}
                onValueChange={setAssigneeIds}
                placeholder="담당자 선택"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex h-6 items-center justify-between">
                <span className="text-xs font-medium">우선순위</span>
                {onManagePriorities && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground"
                    onClick={onManagePriorities}
                  >
                    <PencilLine className="h-3 w-3" />
                    편집
                  </Button>
                )}
              </div>
              <Select value={priorityId} onValueChange={setPriorityId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="우선순위 선택" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id}>
                      {priority.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              기간
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="새 작업 시작일"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                aria-label="새 작업 종료일"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-9"
              />
            </div>
            {hasInvalidDateRange && (
              <p className="text-xs text-destructive">
                종료일은 시작일보다 빠를 수 없습니다.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="create-task-description"
              className="text-xs font-medium"
            >
              설명
            </label>
            <Textarea
              id="create-task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="작업 배경이나 완료 기준을 간단히 적어주세요."
              className="min-h-24 resize-y"
            />
          </div>

          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
              태그
            </span>
            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={cn(
                        "flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "bg-background text-muted-foreground hover:bg-muted",
                      )}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                등록된 태그가 없습니다.
              </p>
            )}
            {onCreateTag && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/10 p-2">
                <Input
                  value={newTagName}
                  onChange={(event) => setNewTagName(event.target.value)}
                  placeholder="새 태그 이름"
                  className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleCreateTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 shrink-0 gap-1"
                  disabled={!newTagName.trim() || isCreatingTag}
                  onClick={() => void handleCreateTag()}
                >
                  {isCreatingTag ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  생성
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/10 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={!canCreate} onClick={() => void handleCreate()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            작업 만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
