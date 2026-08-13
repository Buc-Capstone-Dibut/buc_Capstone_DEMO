"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
  TaskAssigneePicker,
} from "@/components/features/workspace/common/task-assignee-picker";
import {
  TaskTagPicker,
  TaskTagSummary,
  type TaskTagOption,
} from "@/components/features/workspace/common/task-tag-picker";
import {
  DocumentPicker,
  DocumentPickerItem,
} from "@/components/features/workspace/docs/document-picker";
import { LinkedDocumentPreviewDialog } from "@/components/features/workspace/detail/board/linked-document-preview-dialog";
import { cn } from "@/lib/utils";
import { mergeTableTaskGroups } from "@/lib/workspace/table-task-groups";
import {
  getTaskAssigneeIds,
  getTaskAssigneeSearchText,
  isTaskAssignedTo,
  isTaskUnassigned,
} from "@/lib/workspace/task-assignees";
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
  onCreateTag?: (name: string) => Promise<TaskTagOption | null>;
  allGroupsCollapsed?: boolean;
}

type FilterType = "status" | "priority" | "tag" | "assignee";

type TaskGroup = {
  key: string;
  label: string;
  accent: string;
  icon: "status" | "assignee" | "priority" | "tag";
  category?: "todo" | "in-progress" | "done";
  avatarUrl?: string | null;
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

const PRIORITY_SOFT_CLASSES: Record<string, string> = {
  urgent: "bg-red-50/80 text-red-600 hover:bg-red-100/70",
  high: "bg-orange-50/80 text-orange-600 hover:bg-orange-100/70",
  medium: "bg-amber-50/80 text-amber-600 hover:bg-amber-100/70",
  low: "bg-slate-50 text-slate-500 hover:bg-slate-100/70",
};

const PRIORITY_GROUP_ACCENTS: Record<string, string> = {
  urgent: "#D05C5C",
  high: "#C77B30",
  medium: "#B28B28",
  low: "#5D865F",
};

const ASSIGNEE_GROUP_ACCENTS = [
  "#4D7C9B",
  "#8067A8",
  "#5D865F",
  "#B35C81",
  "#A47A44",
  "#547E82",
] as const;

function getStableAssigneeAccent(value: string) {
  const hash = Array.from(value).reduce(
    (result, character) => (result * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return ASSIGNEE_GROUP_ACCENTS[hash % ASSIGNEE_GROUP_ACCENTS.length];
}

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
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 pt-1">
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          연결 문서
        </span>
        <div className="flex min-w-0 flex-wrap gap-1">
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
  onCreateTag,
  allGroupsCollapsed,
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
  const collapseCommandRef = useRef<boolean | undefined>(undefined);

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
        getTaskAssigneeSearchText(task),
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
            return values.some((value) =>
              value === "unassigned"
                ? isTaskUnassigned(task)
                : isTaskAssignedTo(task, value),
            );
        }
      });
    });
  }, [activeFilters, columns, query, tags, tasks]);

  const groups = useMemo<TaskGroup[]>(() => {
    const grouped = new Map<string, TaskGroup>();

    const configuredGroups: TaskGroup[] =
      groupBy === "status"
        ? columns.map((column) => ({
            key: column.id,
            label: column.title,
            accent: column.color
              ? getColorAccent(column.color)
              : column.category === "done"
                ? "#22c55e"
                : column.category === "in-progress"
                  ? "#3b82f6"
                  : "#64748b",
            icon: "status" as const,
            category: column.category || "todo",
            tasks: [],
            completed: 0,
          }))
        : groupBy === "assignee"
          ? [
              {
                key: "__unassigned__",
                label: "담당자 없음",
                accent: "#8B8B87",
                icon: "assignee" as const,
                tasks: [],
                completed: 0,
              },
              ...members.map((member) => ({
                key: member.id,
                label: member.name,
                accent: getStableAssigneeAccent(member.id),
                icon: "assignee" as const,
                avatarUrl: member.avatar,
                tasks: [],
                completed: 0,
              })),
            ]
          : groupBy === "priority"
            ? [
                {
                  key: "__no-priority__",
                  label: "우선순위 없음",
                  accent: "#94a3b8",
                  icon: "priority" as const,
                  tasks: [],
                  completed: 0,
                },
                ...priorities.map((priority) => ({
                  key: priority.id,
                  label: priority.name,
                  accent:
                    PRIORITY_GROUP_ACCENTS[priority.id] ||
                    getColorAccent(priority.color),
                  icon: "priority" as const,
                  tasks: [],
                  completed: 0,
                })),
              ]
            : [
                {
                  key: "__no-tag__",
                  label: "태그 없음",
                  accent: "#94a3b8",
                  icon: "tag" as const,
                  tasks: [],
                  completed: 0,
                },
                ...tags.map((tag) => ({
                  key: tag.id,
                  label: tag.name,
                  accent: getColorAccent(tag.color),
                  icon: "tag" as const,
                  tasks: [],
                  completed: 0,
                })),
              ];

    filteredTasks.forEach((task) => {
      const column = getTaskColumn(task, columns);
      const priority = priorities.find((item) => item.id === task.priorityId);
      const primaryTag = task.tags?.[0] ? resolveTag(task.tags[0], tags) : null;

      if (groupBy === "assignee") {
        const assigneeIds = getTaskAssigneeIds(task);
        const groupIds = assigneeIds.length > 0 ? assigneeIds : ["__unassigned__"];
        groupIds.forEach((groupId) => {
          const assigneeMember = members.find((item) => item.id === groupId);
          const descriptor = {
            key: groupId,
            label: assigneeMember?.name || "담당자 없음",
            accent: assigneeMember
              ? getStableAssigneeAccent(assigneeMember.id)
              : "#8B8B87",
            icon: "assignee" as const,
            avatarUrl: assigneeMember?.avatar,
          };
          const existing = grouped.get(groupId);
          if (existing) {
            existing.tasks.push(task);
            if (isTaskDone(task, columns)) existing.completed += 1;
          } else {
            grouped.set(groupId, {
              ...descriptor,
              tasks: [task],
              completed: isTaskDone(task, columns) ? 1 : 0,
            });
          }
        });
        return;
      }

      const descriptor =
        groupBy === "status"
          ? {
              key: column?.id || "__no-status__",
              label: column?.title || "상태 없음",
              accent: column?.color
                ? getColorAccent(column.color)
                : column?.category === "done"
                  ? "#22c55e"
                  : column?.category === "in-progress"
                    ? "#3b82f6"
                    : "#64748b",
              icon: "status" as const,
              category: column?.category || "todo",
            }
          : groupBy === "priority"
              ? {
                  key: priority?.id || "__no-priority__",
                  label: priority?.name || "우선순위 없음",
                  accent:
                    PRIORITY_GROUP_ACCENTS[priority?.id || ""] ||
                    getColorAccent(priority?.color),
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

    return mergeTableTaskGroups(
      configuredGroups,
      Array.from(grouped.values()),
    );
  }, [columns, filteredTasks, groupBy, members, priorities, tags]);

  useEffect(() => {
    if (
      typeof allGroupsCollapsed !== "boolean" ||
      collapseCommandRef.current === allGroupsCollapsed
    ) {
      return;
    }

    collapseCommandRef.current = allGroupsCollapsed;
    setCollapsedGroups(
      allGroupsCollapsed
        ? new Set(groups.map((group) => group.key))
        : new Set(),
    );
  }, [allGroupsCollapsed, groups]);

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
          <div
            className={cn(
              compact ? "space-y-1.5 bg-slate-50/60 pb-1.5" : "space-y-4",
            )}
          >
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
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center text-left transition-[background-color,filter]",
                      compact
                        ? "gap-2.5 px-4 py-2.5 hover:brightness-[0.98]"
                        : "gap-3 px-4 py-3 hover:bg-slate-50",
                    )}
                    style={{
                      backgroundColor: compact
                        ? `color-mix(in srgb, ${group.accent} 12%, white)`
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
                        "flex items-center justify-center",
                        compact ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-lg",
                      )}
                      style={{
                        backgroundColor: `color-mix(in srgb, ${group.accent} 16%, white)`,
                      }}
                    >
                      {group.icon === "tag" ? (
                        <CircleDot
                          className="h-4 w-4"
                          style={{ color: group.accent }}
                        />
                      ) : group.icon === "assignee" ? (
                        group.key === "__unassigned__" ? (
                          <UserRound
                            className="h-4 w-4"
                            style={{ color: group.accent }}
                          />
                        ) : (
                          <WorkspaceUserAvatar
                            name={group.label}
                            avatarUrl={group.avatarUrl}
                            className={cn(compact ? "h-5 w-5" : "h-7 w-7")}
                            fallbackClassName="text-[9px]"
                          />
                        )
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
                        <h3
                          className={cn(
                            "truncate font-semibold",
                            compact ? "text-[15px]" : "text-sm",
                          )}
                        >
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
                        <span className="text-xs font-medium text-muted-foreground">
                          {progress}%
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
                  </button>

                  {!collapsed && (
                    <Table
                      className={cn(
                        "animate-in fade-in slide-in-from-top-1 duration-150",
                        compact && "[&_td]:py-1.5 [&_td]:text-xs",
                      )}
                    >
                      <TableHeader>
                        <TableRow
                          className={cn(
                            compact
                              ? "h-5 bg-slate-50/40 text-slate-400 hover:bg-slate-50/40"
                              : "bg-slate-50/80 hover:bg-slate-50/80",
                          )}
                        >
                          <TableHead
                            className={cn(
                              "relative min-w-[280px] pl-6",
                              compact &&
                                "h-5 py-0 text-[9px] font-normal tracking-wide text-slate-400",
                            )}
                          >
                            {compact && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-y-0 left-0 w-[3px]"
                                style={{ backgroundColor: group.accent }}
                              />
                            )}
                            제목
                          </TableHead>
                          <TableHead
                            className={cn(
                              "w-[130px]",
                              compact &&
                                "h-5 py-0 text-[9px] font-normal tracking-wide text-slate-400",
                            )}
                          >
                            {groupBy === "status" ? "기간" : "상태"}
                          </TableHead>
                          <TableHead
                            className={cn(
                              "hidden w-[120px] lg:table-cell",
                              compact &&
                                "h-5 py-0 text-[9px] font-normal tracking-wide text-slate-400",
                            )}
                          >
                            {groupBy === "priority" ? "기간" : "우선순위"}
                          </TableHead>
                          <TableHead
                            className={cn(
                              "hidden w-[150px] md:table-cell",
                              compact &&
                                "h-5 py-0 text-[9px] font-normal tracking-wide text-slate-400",
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
                                "h-5 py-0 text-[9px] font-normal tracking-wide text-slate-400",
                            )}
                          >
                            기간
                          </TableHead>
                          <TableHead
                            className={cn(
                              "hidden min-w-[150px] lg:table-cell",
                              compact &&
                                "h-5 py-0 text-[9px] font-normal tracking-wide text-slate-400",
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
                          const taskAssigneeIds = getTaskAssigneeIds(task);
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
                                    if (current.has(task.id)) return new Set();
                                    return new Set([task.id]);
                                  });
                                }}
                                aria-expanded={isExpanded}
                              >
                                <TableCell
                                  className={cn(
                                    "relative font-medium",
                                    compact ? "pl-5" : "pl-6",
                                  )}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="absolute inset-y-0 left-0 w-[3px]"
                                    style={{ backgroundColor: group.accent }}
                                  />
                                  <div
                                    className={cn(
                                      "flex items-center",
                                      compact ? "gap-1.5" : "gap-2",
                                    )}
                                  >
                                    <ChevronRight
                                      className={cn(
                                        compact ? "h-3 w-3" : "h-3.5 w-3.5",
                                        "text-muted-foreground transition-transform",
                                        isExpanded
                                          ? "rotate-90"
                                          : "group-hover:translate-x-0.5",
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        "line-clamp-1",
                                        compact ? "text-xs" : "text-sm",
                                        isExpanded
                                          ? "font-semibold text-slate-950"
                                          : compact
                                            ? "font-normal text-slate-700"
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
                                            PRIORITY_SOFT_CLASSES[
                                              priority?.id || ""
                                            ],
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
                                    <TaskAssigneePicker
                                      members={members}
                                      value={taskAssigneeIds}
                                      onValueChange={(assigneeIds) =>
                                        void onUpdateTask(task.id, {
                                          assigneeIds,
                                        })
                                      }
                                      disabled={readOnly}
                                      className="h-8 max-w-[145px] border-0 bg-transparent px-1 shadow-none hover:bg-muted"
                                    />
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

                                <TableCell className="hidden lg:table-cell">
                                  <TaskTagSummary
                                    tags={taskTags}
                                    maxVisible={2}
                                    className="max-w-[180px]"
                                  />
                                </TableCell>
                              </TableRow>

                              {isExpanded && (
                                <TableRow
                                  className="animate-in border-b fade-in slide-in-from-top-1 duration-150 hover:bg-transparent"
                                >
                                  <TableCell
                                    colSpan={6}
                                    className="relative bg-slate-100/55 p-0 shadow-[inset_0_3px_7px_rgba(15,23,42,0.09),inset_0_-1px_2px_rgba(15,23,42,0.04)]"
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="absolute inset-y-0 left-0 z-10 w-[3px]"
                                      style={{ backgroundColor: group.accent }}
                                    />
                                    <div className="border-t border-slate-200/70 py-2 pl-12 pr-4">
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
                                                  className="h-7 rounded-none border-0 border-b border-transparent bg-transparent px-0 text-sm font-semibold shadow-none transition-colors hover:border-slate-200 focus-visible:border-slate-300 focus-visible:ring-0"
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
                                                  className="min-h-14 resize-none rounded-none border-0 bg-transparent px-0 py-1 text-xs leading-5 shadow-none transition-colors hover:bg-slate-100/40 focus-visible:bg-white/70 focus-visible:ring-0"
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
                                                    className="h-8 min-w-0 rounded-none border-0 border-b bg-transparent px-1 text-[11px] shadow-none focus-visible:ring-0"
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
                                                    className="h-8 min-w-0 rounded-none border-0 border-b bg-transparent px-1 text-[11px] shadow-none focus-visible:ring-0"
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
                                                <TaskTagPicker
                                                  tags={tags}
                                                  selectedTagIds={taskTags.map(
                                                    (tag) => tag.id,
                                                  )}
                                                  onChange={(nextTags) =>
                                                    onUpdateTask(task.id, {
                                                      tags: nextTags,
                                                    })
                                                  }
                                                  onCreateTag={onCreateTag}
                                                  readOnly={readOnly}
                                                  compact
                                                  className="min-h-8 border-0 bg-transparent px-0 py-1"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="grid border-y border-slate-200/80 md:grid-cols-[minmax(0,1.5fr)_minmax(190px,0.7fr)_minmax(150px,0.55fr)] md:divide-x md:divide-slate-200/80">
                                            <button
                                              type="button"
                                              className="min-w-0 py-2 pr-5 text-left transition-colors hover:bg-slate-100/60"
                                              onClick={() =>
                                                !readOnly &&
                                                setEditingTaskId(task.id)
                                              }
                                            >
                                              <span className="text-[10px] font-medium text-muted-foreground">
                                                설명
                                              </span>
                                              <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-700">
                                                {task.description?.trim() ||
                                                  "설명을 클릭해 내용을 추가하세요."}
                                              </p>
                                            </button>
                                            <button
                                              type="button"
                                              className="min-w-0 border-t border-slate-200/80 py-2 text-left transition-colors hover:bg-slate-100/60 md:border-t-0 md:px-4"
                                              onClick={() =>
                                                !readOnly &&
                                                setEditingTaskId(task.id)
                                              }
                                            >
                                              <span className="text-[10px] font-medium text-muted-foreground">
                                                기간
                                              </span>
                                              <p className="mt-1 truncate text-xs text-slate-700">
                                                {task.startDate ||
                                                  "시작일 미정"}{" "}
                                                →{" "}
                                                {task.endDate || "종료일 미정"}
                                              </p>
                                            </button>
                                            <button
                                              type="button"
                                              className="min-w-0 border-t border-slate-200/80 py-2 text-left transition-colors hover:bg-slate-100/60 md:border-t-0 md:pl-4"
                                              onClick={() =>
                                                !readOnly &&
                                                setEditingTaskId(task.id)
                                              }
                                            >
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
                                            </button>
                                          </div>
                                        )}
                                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                                          <div className="min-w-0">
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
                                              className="h-6 shrink-0 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
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
                                                  저장
                                                </>
                                              ) : (
                                                <>
                                                  <Pencil className="h-3.5 w-3.5" />
                                                  편집
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
