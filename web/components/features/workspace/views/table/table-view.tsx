"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileText,
  Filter,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Tags,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";
import {
  DocumentPicker,
  DocumentPickerItem,
} from "@/components/features/workspace/docs/document-picker";
import { LinkedDocumentPreviewDialog } from "@/components/features/workspace/detail/board/linked-document-preview-dialog";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import {
  Priority,
  ProjectMember,
  Tag,
  Task,
  ViewColumn,
} from "../../store/mock-data";

type TaskUpdate = Partial<Task> & {
  startDate?: string | null;
  endDate?: string | null;
};

interface TableViewProps {
  tasks: Task[];
  columns: ViewColumn[];
  priorities: Priority[];
  tags: Tag[];
  members: ProjectMember[];
  groupBy: "status" | "assignee" | "priority" | "tag";
  showToolbar?: boolean;
  compact?: boolean;
  readOnly?: boolean;
  onTaskClick: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: TaskUpdate) => void | Promise<void>;
  onCreateTask: (task: Partial<Task>) => void | Promise<void>;
}

type FilterType = "status" | "priority" | "tag" | "assignee";

type TaskGroup = {
  key: string;
  label: string;
  accent: string;
  icon: "status" | "assignee" | "priority" | "tag";
  category?: "todo" | "in-progress" | "done";
  tasks: Task[];
  completed: number;
};

type FilterOption = {
  label: string;
  value: string;
};

type TaskDocumentRelation = {
  id: string;
  doc: {
    id: string;
    title: string;
    emoji?: string | null;
  };
};

const STATUS_COLOR_CLASSES: Record<string, string> = {
  todo: "border-slate-200 bg-slate-50 text-slate-700",
  "in-progress": "border-blue-200 bg-blue-50 text-blue-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const STATUS_CATEGORY_LABELS = {
  todo: "할 일",
  "in-progress": "진행 중",
  done: "완료",
} as const;

const TAG_ACCENTS: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  pink: "#ec4899",
  gray: "#64748b",
  slate: "#64748b",
};

function slugify(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function resolveTag(tagRef: string, tags: Tag[]) {
  const resolved = tags.find((tag) => tag.id === tagRef || tag.name === tagRef);
  return resolved ?? { id: tagRef, name: tagRef, color: "gray" };
}

function getColorAccent(color?: string | null) {
  if (!color) return "#94a3b8";
  if (color.startsWith("#")) return color;

  const normalized = color
    .toLowerCase()
    .replace(/^bg-/, "")
    .replace(/-\d+$/, "");

  return TAG_ACCENTS[normalized] || "#94a3b8";
}

function getTaskColumn(task: Task, columns: ViewColumn[]) {
  const exactColumn = columns.find((column) => column.id === task.columnId);
  if (exactColumn) return exactColumn;

  return columns.find(
    (column) =>
      column.statusId === task.status ||
      column.category === task.status ||
      slugify(column.title) === task.status,
  );
}

function isTaskDone(task: Task, columns: ViewColumn[]) {
  const column = getTaskColumn(task, columns);
  return column?.category === "done" || task.status === "done";
}

const workspaceFetcher = (url: string) =>
  fetch(url).then((response) => response.json());

function InlineTaskDocuments({
  task,
  isEditing,
  readOnly,
}: {
  task: Task;
  isEditing: boolean;
  readOnly: boolean;
}) {
  const [docSearch, setDocSearch] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const relationEndpoint = `/api/workspaces/${task.projectId}/board/tasks/${task.id}/documents`;
  const { data: linkedDocs = [], mutate: refreshLinkedDocs } = useSWR<
    TaskDocumentRelation[]
  >(relationEndpoint, workspaceFetcher, {
    revalidateOnFocus: false,
  });
  const { data: docs = [] } = useSWR<DocumentPickerItem[]>(
    isEditing && !readOnly ? `/api/workspaces/${task.projectId}/docs` : null,
    workspaceFetcher,
    { revalidateOnFocus: false },
  );

  const linkDocument = async (docId: string) => {
    const response = await fetch(relationEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docId,
        relationType: "reference",
        isPrimary: linkedDocs.length === 0,
      }),
    });

    if (!response.ok) return;
    setDocSearch("");
    await refreshLinkedDocs();
  };

  const unlinkDocument = async (relationId: string) => {
    const response = await fetch(`${relationEndpoint}/${relationId}`, {
      method: "DELETE",
    });

    if (!response.ok) return;
    await refreshLinkedDocs();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200/80 py-2">
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          연결 문서
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {linkedDocs.length > 0 ? (
            linkedDocs.map((relation) => (
              <div
                key={relation.id}
                className="flex h-6 max-w-[180px] items-center rounded bg-slate-100/80 text-[10px]"
              >
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-1 px-2 hover:text-primary"
                  onClick={() =>
                    setPreviewDoc({
                      id: relation.doc.id,
                      title: relation.doc.title,
                    })
                  }
                >
                  <span className="shrink-0">{relation.doc.emoji || "📄"}</span>
                  <span className="truncate">{relation.doc.title}</span>
                </button>
                {isEditing && !readOnly && (
                  <button
                    type="button"
                    className="mr-1 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`${relation.doc.title} 연결 해제`}
                    onClick={() => void unlinkDocument(relation.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <span className="self-center text-[10px] text-muted-foreground">
              연결된 문서가 없습니다.
            </span>
          )}
        </div>

        {isEditing && !readOnly && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-6 shrink-0 gap-1 px-2 text-[10px]"
              >
                <Link2 className="h-3 w-3" />
                문서 연결
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              <Input
                value={docSearch}
                onChange={(event) => setDocSearch(event.target.value)}
                placeholder="문서 또는 폴더 검색"
                className="h-8 text-xs"
              />
              <DocumentPicker
                docs={docs}
                linkedDocIds={linkedDocs.map((relation) => relation.doc.id)}
                search={docSearch}
                onSelect={(docId) => void linkDocument(docId)}
                className="mt-2 max-h-64"
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
      <LinkedDocumentPreviewDialog
        workspaceId={task.projectId}
        docId={previewDoc?.id || null}
        fallbackTitle={previewDoc?.title}
        open={Boolean(previewDoc)}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
      />
    </>
  );
}

export function TableView({
  tasks,
  columns,
  priorities,
  tags,
  members,
  groupBy,
  showToolbar = true,
  compact = false,
  readOnly = false,
  onUpdateTask,
  onCreateTask,
}: TableViewProps) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<
    Partial<Record<FilterType, string[]>>
  >({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState<FilterType | null>(
    null,
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const getFilterOptions = (type: FilterType): FilterOption[] => {
    switch (type) {
      case "status":
        return columns.map((column) => ({
          label: column.title,
          value: column.id,
        }));
      case "priority":
        return priorities.map((priority) => ({
          label: priority.name,
          value: priority.id,
        }));
      case "tag":
        return tags.map((tag) => ({ label: tag.name, value: tag.id }));
      case "assignee":
        return [
          { label: "담당자 없음", value: "unassigned" },
          ...members.map((member) => ({
            label: member.name,
            value: member.id,
          })),
        ];
    }
  };

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return tasks.filter((task) => {
      const tagNames = (task.tags || []).map(
        (tagRef) => resolveTag(tagRef, tags).name,
      );
      const searchableText = [
        task.title,
        task.description,
        task.assignee,
        ...tagNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      if (normalizedQuery && !searchableText.includes(normalizedQuery)) {
        return false;
      }

      return Object.entries(activeFilters).every(([type, values]) => {
        if (!values || values.length === 0) return true;

        switch (type as FilterType) {
          case "status": {
            const column = getTaskColumn(task, columns);
            return Boolean(column && values.includes(column.id));
          }
          case "priority":
            return values.includes(task.priorityId || "");
          case "tag":
            return (task.tags || []).some((tagRef) => {
              const tag = resolveTag(tagRef, tags);
              return values.includes(tag.id) || values.includes(tag.name);
            });
          case "assignee":
            return task.assigneeId
              ? values.includes(task.assigneeId)
              : values.includes("unassigned");
        }
      });
    });
  }, [activeFilters, columns, query, tags, tasks]);

  const groups = useMemo<TaskGroup[]>(() => {
    const grouped = new Map<string, TaskGroup>();

    filteredTasks.forEach((task) => {
      const column = getTaskColumn(task, columns);
      const priority = priorities.find((item) => item.id === task.priorityId);
      const member = members.find((item) => item.id === task.assigneeId);
      const primaryTag = task.tags?.[0] ? resolveTag(task.tags[0], tags) : null;

      const descriptor =
        groupBy === "status"
          ? {
              key: column?.id || "__no-status__",
              label: column?.title || "상태 없음",
              accent:
                column?.category === "done"
                  ? "#22c55e"
                  : column?.category === "in-progress"
                    ? "#3b82f6"
                    : "#64748b",
              icon: "status" as const,
              category: column?.category || "todo",
            }
          : groupBy === "assignee"
            ? {
                key: member?.id || "__unassigned__",
                label: member?.name || "담당자 없음",
                accent: member?.role === "leader" ? "#8b5cf6" : "#3b82f6",
                icon: "assignee" as const,
              }
            : groupBy === "priority"
              ? {
                  key: priority?.id || "__no-priority__",
                  label: priority?.name || "우선순위 없음",
                  accent: getColorAccent(priority?.color),
                  icon: "priority" as const,
                }
              : {
                  key: primaryTag?.id || "__no-tag__",
                  label: primaryTag?.name || "태그 없음",
                  accent: getColorAccent(primaryTag?.color),
                  icon: "tag" as const,
                };

      const existing = grouped.get(descriptor.key);
      if (existing) {
        existing.tasks.push(task);
        if (isTaskDone(task, columns)) existing.completed += 1;
      } else {
        grouped.set(descriptor.key, {
          ...descriptor,
          tasks: [task],
          completed: isTaskDone(task, columns) ? 1 : 0,
        });
      }
    });

    const result = Array.from(grouped.values());
    if (groupBy !== "status") return result;

    const orderMap = new Map(
      columns.map((column, index) => [column.id, index]),
    );
    return result.sort(
      (left, right) =>
        (orderMap.get(left.key) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(right.key) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [columns, filteredTasks, groupBy, members, priorities, tags]);

  const summary = useMemo(() => {
    let completed = 0;
    let inProgress = 0;

    tasks.forEach((task) => {
      const column = getTaskColumn(task, columns);
      if (column?.category === "done") completed += 1;
      if (column?.category === "in-progress") inProgress += 1;
    });

    return {
      total: tasks.length,
      inProgress,
      completed,
    };
  }, [columns, tasks]);

  const activeFilterCount = Object.values(activeFilters).filter(
    (values) => values && values.length > 0,
  ).length;

  const updateFilter = (type: FilterType, value: string, selected: boolean) => {
    setActiveFilters((current) => {
      const values = current[type] || [];
      const nextValues = selected
        ? values.filter((item) => item !== value)
        : [...values, value];
      const next = { ...current };

      if (nextValues.length === 0) {
        delete next[type];
      } else {
        next[type] = nextValues;
      }

      return next;
    });
  };

  const getFilterLabel = (type: FilterType, value: string) =>
    getFilterOptions(type).find((option) => option.value === value)?.label ||
    value;

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="outline" className="h-7 gap-1.5 rounded-lg px-2.5">
              전체 <span className="font-semibold">{summary.total}</span>
            </Badge>
            <Badge
              variant="outline"
              className="h-7 gap-1.5 rounded-lg border-blue-200 bg-blue-50 px-2.5 text-blue-700"
            >
              진행 중{" "}
              <span className="font-semibold">{summary.inProgress}</span>
            </Badge>
            <Badge
              variant="outline"
              className="h-7 gap-1.5 rounded-lg border-emerald-200 bg-emerald-50 px-2.5 text-emerald-700"
            >
              완료 <span className="font-semibold">{summary.completed}</span>
            </Badge>
          </div>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-initial">
            <div className="relative min-w-0 flex-1 sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="작업 검색"
                className="h-8 bg-white pl-8 text-xs"
              />
            </div>

            <Popover
              open={isFilterOpen}
              onOpenChange={(open) => {
                setIsFilterOpen(open);
                if (!open) setCurrentFilterType(null);
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  필터
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-0" align="end">
                <Command>
                  {currentFilterType ? (
                    <>
                      <div className="flex items-center border-b px-2 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setCurrentFilterType(null)}
                        >
                          <ChevronRight className="mr-1 h-3.5 w-3.5 rotate-180" />
                          뒤로
                        </Button>
                        <span className="ml-auto pr-2 text-xs font-medium">
                          {currentFilterType === "status"
                            ? "상태"
                            : currentFilterType === "priority"
                              ? "우선순위"
                              : currentFilterType === "assignee"
                                ? "담당자"
                                : "태그"}
                        </span>
                      </div>
                      <CommandInput placeholder="항목 검색" />
                      <CommandList>
                        <CommandEmpty>일치하는 항목이 없습니다.</CommandEmpty>
                        <CommandGroup>
                          {getFilterOptions(currentFilterType).map((option) => {
                            const selected = (
                              activeFilters[currentFilterType] || []
                            ).includes(option.value);

                            return (
                              <CommandItem
                                key={option.value}
                                value={option.label}
                                onSelect={() =>
                                  updateFilter(
                                    currentFilterType,
                                    option.value,
                                    selected,
                                  )
                                }
                              >
                                <span
                                  className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded border",
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border",
                                  )}
                                >
                                  {selected && <Check className="h-3 w-3" />}
                                </span>
                                {option.label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </>
                  ) : (
                    <CommandList>
                      <CommandGroup heading="필터 기준">
                        {(
                          [
                            ["status", "상태"],
                            ["priority", "우선순위"],
                            ["assignee", "담당자"],
                            ["tag", "태그"],
                          ] as const
                        ).map(([type, label]) => (
                          <CommandItem
                            key={type}
                            onSelect={() => setCurrentFilterType(type)}
                          >
                            <span className="flex-1">{label}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  )}
                </Command>
              </PopoverContent>
            </Popover>

            {!readOnly && (
              <Button
                size="sm"
                className="h-8 shrink-0 gap-1.5"
                onClick={() => void onCreateTask({ title: "새 작업" })}
              >
                <Plus className="h-3.5 w-3.5" />
                작업
              </Button>
            )}
          </div>

          {activeFilterCount > 0 && (
            <div className="flex w-full flex-wrap items-center gap-1.5 border-t pt-2">
              {(
                Object.entries(activeFilters) as [
                  FilterType,
                  string[] | undefined,
                ][]
              ).flatMap(([type, values]) =>
                (values || []).map((value) => (
                  <Badge
                    key={`${type}:${value}`}
                    variant="secondary"
                    className="h-6 gap-1 rounded-md pl-2 pr-1 font-normal"
                  >
                    {getFilterLabel(type, value)}
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-black/5"
                      onClick={() => updateFilter(type, value, true)}
                      aria-label={`${getFilterLabel(type, value)} 필터 제거`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )),
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground"
                onClick={() => setActiveFilters({})}
              >
                모두 지우기
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex-1 overflow-auto",
          compact ? "bg-white" : "bg-slate-50/40 p-4",
        )}
      >
        {groups.length > 0 ? (
          <div className={cn(compact ? "divide-y" : "space-y-4")}>
            {compact && (
              <div className="grid h-5 grid-cols-[minmax(0,1fr)_80px_64px] items-center border-b bg-slate-50/60 px-4 text-[9px] font-medium tracking-wide text-muted-foreground">
                <span>분류</span>
                <span className="text-right">완료</span>
                <span className="text-right">진행률</span>
              </div>
            )}
            {groups.map((group) => {
              const collapsed = collapsedGroups.has(group.key);
              const progress =
                group.tasks.length > 0
                  ? Math.round((group.completed / group.tasks.length) * 100)
                  : 0;

              return (
                <section
                  key={group.key}
                  className={cn(
                    "overflow-hidden bg-white",
                    compact ? "" : "rounded-xl border shadow-sm",
                  )}
                  style={{ borderLeftColor: group.accent }}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center text-left transition-[background-color,filter]",
                      compact
                        ? "gap-2 border-l-2 px-4 py-2 hover:brightness-[0.98]"
                        : "gap-3 border-l-4 px-4 py-3 hover:bg-slate-50",
                    )}
                    style={{
                      borderLeftColor: group.accent,
                      backgroundColor: compact
                        ? `color-mix(in srgb, ${group.accent} 9%, white)`
                        : undefined,
                    }}
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={!collapsed}
                  >
                    {collapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div
                      className={cn(
                        "flex items-center justify-center bg-slate-100",
                        compact ? "h-6 w-6 rounded-md" : "h-8 w-8 rounded-lg",
                      )}
                    >
                      {group.icon === "tag" ? (
                        <CircleDot
                          className="h-4 w-4"
                          style={{ color: group.accent }}
                        />
                      ) : group.icon === "assignee" ? (
                        <UserRound
                          className="h-4 w-4"
                          style={{ color: group.accent }}
                        />
                      ) : group.icon === "priority" ? (
                        <CircleDot
                          className="h-4 w-4"
                          style={{ color: group.accent }}
                        />
                      ) : (
                        <ListChecks
                          className="h-4 w-4"
                          style={{ color: group.accent }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {group.label}
                        </h3>
                        {groupBy === "status" && group.category && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-4 rounded px-1.5 text-[9px] font-medium",
                              STATUS_COLOR_CLASSES[group.category],
                            )}
                          >
                            {STATUS_CATEGORY_LABELS[group.category]}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {group.completed}/{group.tasks.length} 완료
                        </span>
                      </div>
                      {!compact && (
                        <div className="mt-1 h-1.5 max-w-48 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {progress}%
                    </span>
                  </button>

                  {!collapsed && (
                    <Table className={compact ? "[&_td]:py-2" : undefined}>
                      <TableHeader>
                        <TableRow
                          className={cn(
                            compact
                              ? "h-5 bg-white hover:bg-white"
                              : "bg-slate-50/80 hover:bg-slate-50/80",
                          )}
                        >
                          <TableHead
                            className={cn(
                              "min-w-[280px] pl-6",
                              compact &&
                                "h-5 py-0 text-[9px] font-medium tracking-wide",
                            )}
                          >
                            제목
                          </TableHead>
                          <TableHead
                            className={cn(
                              "w-[130px]",
                              compact &&
                                "h-5 py-0 text-[9px] font-medium tracking-wide",
                            )}
                          >
                            {groupBy === "status" ? "기간" : "상태"}
                          </TableHead>
                          <TableHead
                            className={cn(
                              "hidden w-[120px] lg:table-cell",
                              compact &&
                                "h-5 py-0 text-[9px] font-medium tracking-wide",
                            )}
                          >
                            {groupBy === "priority" ? "기간" : "우선순위"}
                          </TableHead>
                          <TableHead
                            className={cn(
                              "hidden w-[150px] md:table-cell",
                              compact &&
                                "h-5 py-0 text-[9px] font-medium tracking-wide",
                            )}
                          >
                            {groupBy === "assignee" ? "기간" : "담당자"}
                          </TableHead>
                          <TableHead
                            className={cn(
                              groupBy === "tag"
                                ? "hidden w-[230px] xl:table-cell"
                                : "hidden",
                              compact &&
                                "h-5 py-0 text-[9px] font-medium tracking-wide",
                            )}
                          >
                            기간
                          </TableHead>
                          <TableHead
                            className={cn(
                              groupBy === "tag"
                                ? "hidden"
                                : "hidden min-w-[180px] 2xl:table-cell",
                              compact &&
                                "h-5 py-0 text-[9px] font-medium tracking-wide",
                            )}
                          >
                            태그
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.tasks.map((task) => {
                          const column = getTaskColumn(task, columns);
                          const category = column?.category || "todo";
                          const priority = priorities.find(
                            (item) => item.id === task.priorityId,
                          );
                          const taskTags = (task.tags || []).map((tagRef) =>
                            resolveTag(tagRef, tags),
                          );
                          const isExpanded = expandedTaskIds.has(task.id);
                          const dateSummary = (
                            <span className="block max-w-[180px] truncate text-[11px] text-muted-foreground">
                              {task.startDate || task.endDate
                                ? `${task.startDate || "미정"} → ${
                                    task.endDate || "미정"
                                  }`
                                : "기간 미정"}
                            </span>
                          );

                          return (
                            <Fragment key={task.id}>
                              <TableRow
                                className={cn(
                                  "group cursor-pointer hover:bg-slate-50/80",
                                  isExpanded &&
                                    "border-b-0 bg-slate-100/70 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] hover:bg-slate-100/70",
                                )}
                                onClick={() => {
                                  setEditingTaskId(null);
                                  setExpandedTaskIds((current) => {
                                    const next = new Set(current);
                                    if (next.has(task.id)) {
                                      next.delete(task.id);
                                    } else {
                                      next.add(task.id);
                                    }
                                    return next;
                                  });
                                }}
                                aria-expanded={isExpanded}
                              >
                                <TableCell className="pl-6 font-medium">
                                  <div className="flex items-center gap-2">
                                    <ChevronRight
                                      className={cn(
                                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                                        isExpanded
                                          ? "rotate-90"
                                          : "group-hover:translate-x-0.5",
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        "line-clamp-1 text-sm",
                                        isExpanded
                                          ? "font-bold text-slate-950"
                                          : "font-medium",
                                      )}
                                    >
                                      {task.title}
                                    </span>
                                  </div>
                                </TableCell>

                                <TableCell
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {groupBy === "status" ? (
                                    dateSummary
                                  ) : (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={readOnly}
                                          className={cn(
                                            "h-7 max-w-[120px] justify-start truncate rounded-full px-2.5 text-xs font-medium",
                                            STATUS_COLOR_CLASSES[category] ||
                                              STATUS_COLOR_CLASSES.todo,
                                          )}
                                        >
                                          {column?.title ||
                                            task.status ||
                                            "상태 없음"}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-44 p-1"
                                        align="start"
                                      >
                                        {columns.map((option) => (
                                          <Button
                                            key={option.id}
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-full justify-start text-xs"
                                            onClick={() =>
                                              void onUpdateTask(task.id, {
                                                columnId: option.id,
                                                status:
                                                  option.statusId ||
                                                  option.category ||
                                                  slugify(option.title),
                                              })
                                            }
                                          >
                                            {option.title}
                                          </Button>
                                        ))}
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </TableCell>

                                <TableCell
                                  className="hidden lg:table-cell"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {groupBy === "priority" ? (
                                    dateSummary
                                  ) : (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={readOnly}
                                          className={cn(
                                            "h-7 justify-start px-2 text-xs",
                                            priority?.color,
                                          )}
                                        >
                                          {priority?.name || "미지정"}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-40 p-1"
                                        align="start"
                                      >
                                        {priorities.map((option) => (
                                          <Button
                                            key={option.id}
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-full justify-start text-xs"
                                            onClick={() =>
                                              void onUpdateTask(task.id, {
                                                priorityId: option.id,
                                              })
                                            }
                                          >
                                            {option.name}
                                          </Button>
                                        ))}
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </TableCell>

                                <TableCell
                                  className="hidden md:table-cell"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {groupBy === "assignee" ? (
                                    dateSummary
                                  ) : (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={readOnly}
                                          className="h-8 max-w-[140px] justify-start gap-2 px-1.5 text-xs font-normal"
                                        >
                                          {task.assignee ? (
                                            <>
                                              <WorkspaceUserAvatar
                                                name={task.assignee}
                                                avatarUrl={
                                                  task.assigneeProfile?.avatar
                                                }
                                                className="h-5 w-5"
                                                fallbackClassName="text-[9px]"
                                              />
                                              <span className="truncate">
                                                {task.assignee}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <UserRound className="h-4 w-4 text-muted-foreground" />
                                              <span className="text-muted-foreground">
                                                미할당
                                              </span>
                                            </>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-52 p-1"
                                        align="start"
                                      >
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-full justify-start text-xs text-muted-foreground"
                                          onClick={() =>
                                            void onUpdateTask(task.id, {
                                              assigneeId: null,
                                            })
                                          }
                                        >
                                          담당자 없음
                                        </Button>
                                        {members.map((member) => (
                                          <Button
                                            key={member.id}
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-full justify-start gap-2 text-xs"
                                            onClick={() =>
                                              void onUpdateTask(task.id, {
                                                assigneeId: member.id,
                                              })
                                            }
                                          >
                                            <WorkspaceUserAvatar
                                              name={member.name}
                                              avatarUrl={member.avatar}
                                              className="h-5 w-5"
                                              fallbackClassName="text-[9px]"
                                            />
                                            <span className="truncate">
                                              {member.name}
                                            </span>
                                          </Button>
                                        ))}
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </TableCell>

                                <TableCell
                                  className={
                                    groupBy === "tag"
                                      ? "hidden xl:table-cell"
                                      : "hidden"
                                  }
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {groupBy === "tag" ? dateSummary : null}
                                </TableCell>

                                <TableCell className="hidden 2xl:table-cell">
                                  <div className="flex max-w-[260px] flex-wrap gap-1">
                                    {taskTags.slice(0, 3).map((tag) => (
                                      <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        className="h-5 max-w-[100px] truncate rounded-md px-1.5 text-[10px] font-normal"
                                      >
                                        {tag.name}
                                      </Badge>
                                    ))}
                                    {taskTags.length > 3 && (
                                      <span className="text-[10px] text-muted-foreground">
                                        +{taskTags.length - 3}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>

                              {isExpanded && (
                                <TableRow className="animate-in border-b bg-slate-50/40 fade-in slide-in-from-top-1 duration-200 hover:bg-slate-50/40">
                                  <TableCell colSpan={6} className="p-0">
                                    <div className="py-1.5 pl-12 pr-4">
                                      <div className="min-w-0">
                                        {editingTaskId === task.id ? (
                                          <div className="grid gap-4 border-y border-slate-200/80 py-2.5 lg:grid-cols-[minmax(0,1fr)_300px]">
                                            <div className="min-w-0 space-y-2.5">
                                              <div>
                                                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                                                  제목
                                                </span>
                                                <Input
                                                  defaultValue={task.title}
                                                  className="h-8 bg-white text-sm font-medium"
                                                  onBlur={(event) => {
                                                    const title =
                                                      event.target.value.trim();
                                                    if (
                                                      title &&
                                                      title !== task.title
                                                    ) {
                                                      void onUpdateTask(
                                                        task.id,
                                                        { title },
                                                      );
                                                    }
                                                  }}
                                                />
                                              </div>
                                              <div>
                                                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                                                  설명
                                                </span>
                                                <Textarea
                                                  defaultValue={
                                                    task.description || ""
                                                  }
                                                  placeholder="작업 설명을 입력하세요."
                                                  className="min-h-20 resize-y bg-white text-xs leading-5"
                                                  onBlur={(event) => {
                                                    if (
                                                      event.target.value !==
                                                      (task.description || "")
                                                    ) {
                                                      void onUpdateTask(
                                                        task.id,
                                                        {
                                                          description:
                                                            event.target.value,
                                                        },
                                                      );
                                                    }
                                                  }}
                                                />
                                              </div>
                                            </div>

                                            <div className="space-y-3">
                                              <div>
                                                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                                                  기간
                                                </span>
                                                <div className="flex items-center gap-1">
                                                  <Input
                                                    type="date"
                                                    aria-label={`${task.title} 상세 시작일`}
                                                    value={task.startDate || ""}
                                                    max={
                                                      task.endDate || undefined
                                                    }
                                                    className="h-8 min-w-0 bg-white px-2 text-[11px]"
                                                    onChange={(event) =>
                                                      void onUpdateTask(
                                                        task.id,
                                                        {
                                                          startDate:
                                                            event.target
                                                              .value || null,
                                                        },
                                                      )
                                                    }
                                                  />
                                                  <span className="text-xs text-muted-foreground">
                                                    –
                                                  </span>
                                                  <Input
                                                    type="date"
                                                    aria-label={`${task.title} 상세 종료일`}
                                                    value={task.endDate || ""}
                                                    min={
                                                      task.startDate ||
                                                      undefined
                                                    }
                                                    className="h-8 min-w-0 bg-white px-2 text-[11px]"
                                                    onChange={(event) =>
                                                      void onUpdateTask(
                                                        task.id,
                                                        {
                                                          endDate:
                                                            event.target
                                                              .value || null,
                                                        },
                                                      )
                                                    }
                                                  />
                                                </div>
                                              </div>

                                              <div>
                                                <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
                                                  태그
                                                </span>
                                                <Popover>
                                                  <PopoverTrigger asChild>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-8 w-full justify-start gap-2 bg-white px-2 text-xs font-normal"
                                                    >
                                                      <Tags className="h-3.5 w-3.5 text-muted-foreground" />
                                                      {taskTags.length > 0
                                                        ? `${taskTags.length}개 선택`
                                                        : "태그 선택"}
                                                    </Button>
                                                  </PopoverTrigger>
                                                  <PopoverContent
                                                    className="w-56 p-1"
                                                    align="start"
                                                  >
                                                    {tags.length > 0 ? (
                                                      tags.map((tag) => {
                                                        const selected = (
                                                          task.tags || []
                                                        ).some(
                                                          (tagRef) =>
                                                            tagRef === tag.id ||
                                                            tagRef === tag.name,
                                                        );

                                                        return (
                                                          <Button
                                                            key={tag.id}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-full justify-start gap-2 text-xs"
                                                            onClick={() => {
                                                              const nextTags =
                                                                selected
                                                                  ? (
                                                                      task.tags ||
                                                                      []
                                                                    ).filter(
                                                                      (
                                                                        tagRef,
                                                                      ) =>
                                                                        tagRef !==
                                                                          tag.id &&
                                                                        tagRef !==
                                                                          tag.name,
                                                                    )
                                                                  : [
                                                                      ...(task.tags ||
                                                                        []),
                                                                      tag.id,
                                                                    ];

                                                              void onUpdateTask(
                                                                task.id,
                                                                {
                                                                  tags: nextTags,
                                                                },
                                                              );
                                                            }}
                                                          >
                                                            <span
                                                              className="h-2.5 w-2.5 rounded-full"
                                                              style={{
                                                                backgroundColor:
                                                                  getColorAccent(
                                                                    tag.color,
                                                                  ),
                                                              }}
                                                            />
                                                            <span className="min-w-0 flex-1 truncate text-left">
                                                              {tag.name}
                                                            </span>
                                                            {selected && (
                                                              <Check className="h-3.5 w-3.5" />
                                                            )}
                                                          </Button>
                                                        );
                                                      })
                                                    ) : (
                                                      <p className="px-2 py-3 text-xs text-muted-foreground">
                                                        사용할 수 있는 태그가
                                                        없습니다.
                                                      </p>
                                                    )}
                                                  </PopoverContent>
                                                </Popover>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="grid border-y border-slate-200/80 md:grid-cols-[minmax(0,1.5fr)_minmax(190px,0.7fr)_minmax(150px,0.55fr)] md:divide-x md:divide-slate-200/80">
                                            <div className="min-w-0 py-2 pr-5">
                                              <span className="text-[10px] font-medium text-muted-foreground">
                                                설명
                                              </span>
                                              <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-700">
                                                {task.description?.trim() ||
                                                  "설명이 없습니다. 수정을 눌러 내용을 추가하세요."}
                                              </p>
                                            </div>
                                            <div className="min-w-0 border-t border-slate-200/80 py-2 md:border-t-0 md:px-4">
                                              <span className="text-[10px] font-medium text-muted-foreground">
                                                기간
                                              </span>
                                              <p className="mt-1 truncate text-xs text-slate-700">
                                                {task.startDate ||
                                                  "시작일 미정"}{" "}
                                                →{" "}
                                                {task.endDate || "종료일 미정"}
                                              </p>
                                            </div>
                                            <div className="min-w-0 border-t border-slate-200/80 py-2 md:border-t-0 md:pl-4">
                                              <span className="text-[10px] font-medium text-muted-foreground">
                                                태그
                                              </span>
                                              <div className="mt-1 flex min-h-5 flex-wrap gap-1">
                                                {taskTags.length > 0 ? (
                                                  taskTags
                                                    .slice(0, 3)
                                                    .map((tag) => (
                                                      <Badge
                                                        key={tag.id}
                                                        variant="secondary"
                                                        className="h-5 max-w-[90px] truncate rounded px-1.5 text-[10px] font-normal"
                                                      >
                                                        {tag.name}
                                                      </Badge>
                                                    ))
                                                ) : (
                                                  <span className="text-xs text-muted-foreground">
                                                    없음
                                                  </span>
                                                )}
                                                {taskTags.length > 3 && (
                                                  <span className="self-center text-[10px] text-muted-foreground">
                                                    +{taskTags.length - 3}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        <div className="flex items-end gap-2">
                                          <div className="min-w-0 flex-1">
                                            <InlineTaskDocuments
                                              task={task}
                                              isEditing={
                                                editingTaskId === task.id
                                              }
                                              readOnly={readOnly}
                                            />
                                          </div>
                                          {!readOnly && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="mb-0.5 h-6 shrink-0 gap-1.5 px-2 text-[11px]"
                                              onClick={() =>
                                                setEditingTaskId((current) =>
                                                  current === task.id
                                                    ? null
                                                    : task.id,
                                                )
                                              }
                                            >
                                              {editingTaskId === task.id ? (
                                                <>
                                                  <Check className="h-3.5 w-3.5" />
                                                  완료
                                                </>
                                              ) : (
                                                <>
                                                  <Pencil className="h-3.5 w-3.5" />
                                                  수정
                                                </>
                                              )}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-white p-8 text-center">
            <div>
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                <ListChecks className="h-5 w-5 text-slate-500" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">
                표시할 작업이 없습니다
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                검색어나 필터를 지우거나 새 작업을 만들어 보세요.
              </p>
              {!readOnly && (
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => void onCreateTask({ title: "새 작업" })}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  작업 만들기
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
