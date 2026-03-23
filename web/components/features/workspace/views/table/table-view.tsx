"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Task } from "../../store/mock-data";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Filter, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";

interface TableViewProps {
  tasks: Task[];
  columns: any[];
  priorities: any[];
  tags: any[];
  onTaskClick: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: any) => void;
}

type FilterType = "status" | "priority" | "tag" | "assignee";

export function TableView({
  tasks,
  columns,
  priorities,
  tags,
  onTaskClick,
  onUpdateTask,
}: TableViewProps) {
  const [editingCell, setEditingCell] = useState<{
    taskId: string;
    field: string;
  } | null>(null);

  // Filters State: { "status": ["todo", "in-progress"], "priority": ["high"] }
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(
    {},
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState<FilterType | null>(
    null,
  );

  const [editValue, setEditValue] = useState("");
  const colorMap: Record<string, string> = {
    Blue: "bg-blue-50 text-blue-700 border-blue-200",
    Red: "bg-red-50 text-red-700 border-red-200",
    Green: "bg-green-50 text-green-700 border-green-200",
    Orange: "bg-orange-50 text-orange-700 border-orange-200",
    Yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Violet: "bg-violet-50 text-violet-700 border-violet-200",
    Pink: "bg-pink-50 text-pink-700 border-pink-200",
    Indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Gray: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const getStatusColor = (statusId: string) => {
    const col = columns.find(
      (c) =>
        c.id === statusId ||
        ("statusId" in c && c.statusId === statusId) ||
        c.category === statusId,
    );
    if (!col) return "bg-slate-100 text-slate-700 border-slate-200";

    // Check if col.color is a mapped key (e.g. "Blue")
    if (col.color && colorMap[col.color]) {
      return colorMap[col.color];
    }

    // Check if it's already a tailwind class
    if (col.color && col.color.includes("bg-")) {
      return col.color.includes("text-")
        ? col.color
        : `${col.color} text-slate-700 border-transparent`;
    }

    // Fallback based on category
    switch (col.category) {
      case "todo":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "in-progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "done":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPriorityColor = (priorityId: string) => {
    const p = priorities.find((item) => item.id === priorityId);
    if (!p) return "bg-slate-100 text-slate-500";
    return cn("border-transparent", p.color);
  };

  const getTagColor = (tagIdOrName: string) => {
    const t = tags.find(
      (tag) => tag.id === tagIdOrName || tag.name === tagIdOrName,
    );

    if (t && t.color) {
      // 1. Check for legacy/full Tailwind classes (e.g. "bg-red-500", "text-white")
      if (t.color.includes("bg-")) {
        // If it's a specific format like "bg-red-500", we might want to make it soft for badges
        // But if it's "bg-red-100", it's perfect.
        // TaskDetailModal logic: split by '-' to get base color
        const parts = t.color.split("-");
        const base = parts[1] || "slate";
        // Ensure consistent badge style: bg-{color}-100 text-{color}-700
        return `bg-${base}-100 text-${base}-700 border-${base}-200`;
      }

      // 2. Handle simple color names (e.g. "red", "blue", "Pink")
      // Convert to lowercase for safety
      const base = t.color.toLowerCase();
      return `bg-${base}-100 text-${base}-700 border-${base}-200`;
    }

    // Hash fallback for ad-hoc tags or undefined colors
    const colors = [
      "bg-slate-100 text-slate-700 border-slate-200",
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-green-100 text-green-700 border-green-200",
      "bg-orange-100 text-orange-700 border-orange-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-pink-100 text-pink-700 border-pink-200",
    ];
    const hash = tagIdOrName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleStartEdit = (taskId: string, field: string, value: string) => {
    setEditingCell({ taskId, field });
    setEditValue(value);
  };

  const handleSaveEdit = (taskId: string, field: string, value: any) => {
    onUpdateTask(taskId, { [field]: value });
    setEditingCell(null);
  };

  // --- Filtering Logic ---

  const handleAddFilter = (type: string, value: string) => {
    const current = activeFilters[type] || [];
    if (!current.includes(value)) {
      setActiveFilters({
        ...activeFilters,
        [type]: [...current, value],
      });
    }
  };

  const handleRemoveFilter = (type: string, value: string) => {
    const current = activeFilters[type] || [];
    const updated = current.filter((v) => v !== value);
    if (updated.length === 0) {
      const nextFilters = { ...activeFilters };
      delete nextFilters[type];
      setActiveFilters(nextFilters);
    } else {
      setActiveFilters({
        ...activeFilters,
        [type]: updated,
      });
    }
  };

  const getFilterOptions = (type: FilterType) => {
    switch (type) {
      case "status":
        return columns.map((c) => ({
          label: c.title,
          value: c.statusId || c.category,
        }));
      case "priority":
        return priorities.map((p) => ({ label: p.name, value: p.id }));
      case "tag":
        return tags.map((t) => ({ label: t.name, value: t.id })); // Use ID for internal logic
      default:
        return [];
    }
  };

  const filteredTasks = tasks.filter((task) => {
    // AND Logic between different filter types
    return Object.entries(activeFilters).every(([type, values]) => {
      if (values.length === 0) return true;

      // OR Logic within the same filter type
      switch (type) {
        case "status":
          // Filter values are statusIds (todo, in-progress, etc.)
          // We should check task.status primarily.
          // Fallback: If task.status matches a column statusId.
          return values.includes(task.status);
        case "priority":
          return values.includes(task.priorityId || "");
        case "tag":
          // values are Tag IDs.
          // task.tags can be ID or Name.
          return task.tags?.some((tTag) => {
            // 1. Direct match (ID === ID or Name === Name if simplistic)
            if (values.includes(tTag)) return true;
            // 2. Resolve selected Filter IDs to Names and check if task tag is that Name
            const matchedTag = tags.find((t) => values.includes(t.id));
            if (matchedTag && matchedTag.name === tTag) return true;
            // 3. Resolve task tag to ID (if it's a name) and check
            const resolvedTag = tags.find((t) => t.name === tTag);
            if (resolvedTag && values.includes(resolvedTag.id)) return true;

            return false;
          });
        // case "assignee": return values.includes(task.assignee || "");
        default:
          return true;
      }
    });
  });

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Filter Toolbar */}
      <div className="flex items-center p-2 px-4 gap-2 border-b">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <Filter className="h-3.5 w-3.5" />
              필터
              {Object.keys(activeFilters).length > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal lg:hidden"
                >
                  {Object.keys(activeFilters).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              {currentFilterType ? (
                <>
                  <div className="flex items-center border-b px-2 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 px-1 text-xs"
                      onClick={() => setCurrentFilterType(null)}
                    >
                      &lt; Back
                    </Button>
                    <span className="flex-1 text-center text-xs font-medium capitalize">
                      {currentFilterType}
                    </span>
                  </div>
                  <CommandInput placeholder="Search values..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {getFilterOptions(currentFilterType).map((option) => {
                        const isSelected = (
                          activeFilters[currentFilterType] || []
                        ).includes(option.value);
                        return (
                          <CommandItem
                            key={option.value}
                            onSelect={() => {
                              if (isSelected) {
                                handleRemoveFilter(
                                  currentFilterType,
                                  option.value,
                                );
                              } else {
                                handleAddFilter(
                                  currentFilterType,
                                  option.value,
                                );
                              }
                            }}
                          >
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible",
                              )}
                            >
                              <Check className={cn("h-4 w-4")} />
                            </div>
                            <span>{option.label}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </>
              ) : (
                <CommandList>
                  <CommandGroup heading="Filter by...">
                    <CommandItem
                      onSelect={() => setCurrentFilterType("status")}
                    >
                      상태 (Status)
                    </CommandItem>
                    <CommandItem
                      onSelect={() => setCurrentFilterType("priority")}
                    >
                      우선순위 (Priority)
                    </CommandItem>
                    <CommandItem onSelect={() => setCurrentFilterType("tag")}>
                      태그 (Tags)
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              )}
            </Command>
          </PopoverContent>
        </Popover>

        {/* Active Filters Display */}
        <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
          {Object.entries(activeFilters).map(([type, values]) => {
            if (values.length === 0) return null;
            return (
              <div
                key={type}
                className="flex items-center gap-1 rounded-sm border border-dashed px-2 py-1 text-xs bg-muted/50"
              >
                <span className="font-medium capitalize text-muted-foreground mr-1">
                  {type === "status"
                    ? "상태"
                    : type === "priority"
                      ? "우선순위"
                      : "태그"}
                </span>
                <Separator orientation="vertical" className="mx-1 h-3" />
                <div className="flex gap-1">
                  {values.length > 2 ? (
                    <Badge variant="secondary" className="rounded-sm px-1">
                      {values.length} items
                    </Badge>
                  ) : (
                    values.map((v) => {
                      // Resolve Label
                      let label = v;
                      if (type === "status")
                        label =
                          columns.find(
                            (c) => c.statusId === v || c.category === v,
                          )?.title || v;
                      if (type === "priority")
                        label = priorities.find((p) => p.id === v)?.name || v;
                      if (type === "tag")
                        label = tags.find((t) => t.id === v)?.name || v;

                      return (
                        <Badge
                          key={v}
                          variant="secondary"
                          className="rounded-sm px-1 font-normal bg-background"
                        >
                          {label}
                        </Badge>
                      );
                    })
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-transparent"
                  onClick={() => {
                    const nextFilters = { ...activeFilters };
                    delete nextFilters[type];
                    setActiveFilters(nextFilters);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
          {Object.keys(activeFilters).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setActiveFilters({})}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full overflow-auto p-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[400px]">이름</TableHead>
                <TableHead className="w-[120px]">상태</TableHead>
                <TableHead className="w-[120px]">우선순위</TableHead>
                <TableHead className="w-[150px]">담당자</TableHead>
                <TableHead>마감일</TableHead>
                <TableHead>태그</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const statusCol = columns.find(
                  (c) => c.id === task.columnId || c.statusId === task.status,
                );
                const statusLabel = statusCol ? statusCol.title : task.status;

                return (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-muted/50 group/row"
                    onClick={() => onTaskClick(task.id)}
                  >
                    <TableCell className="font-medium">
                      {editingCell?.taskId === task.id &&
                      editingCell.field === "title" ? (
                        <Input
                          className="h-8 text-sm"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() =>
                            handleSaveEdit(task.id, "title", editValue)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleSaveEdit(task.id, "title", editValue);
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div
                          className="flex items-center gap-2 text-sm py-1 cursor-text hover:bg-muted/50 rounded px-1 -ml-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(task.id, "title", task.title);
                          }}
                        >
                          {task.title}
                        </div>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize font-normal border cursor-pointer hover:bg-muted",
                              getStatusColor(task.columnId || task.status),
                            )}
                          >
                            {statusLabel || "No Status"}
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-[150px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Change status..."
                              className="h-8"
                            />
                            <CommandList>
                              <CommandEmpty>No status found.</CommandEmpty>
                              <CommandGroup>
                                {columns.map((col) => (
                                  <CommandItem
                                    key={col.id}
                                    value={col.title}
                                    onSelect={() => {
                                      handleSaveEdit(
                                        task.id,
                                        "status",
                                        col.statusId || col.category,
                                      );
                                      // Also update columnId if needed by backend, though updateTask usually handles generic updates
                                      // Assuming onUpdateTask handles the mapping logic or we pass both.
                                      // For now passing status.
                                      // Ideally we should pass columnId if it's a kanban.
                                      onUpdateTask(task.id, {
                                        columnId: col.id,
                                        status: col.statusId || col.category,
                                      });
                                    }}
                                  >
                                    {col.title}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            {task.priorityId ? (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px] px-1.5 h-5 font-medium cursor-pointer hover:opacity-80",
                                  getPriorityColor(task.priorityId),
                                )}
                              >
                                {task.priorityId}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs opacity-50 cursor-pointer hover:bg-muted px-1 rounded">
                                -
                              </span>
                            )}
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[120px] p-0"
                            align="start"
                          >
                            <div className="p-1">
                              {priorities.map((p) => (
                                <div
                                  key={p.id}
                                  className={cn(
                                    "px-2 py-1.5 rounded cursor-pointer text-xs mb-0.5 hover:opacity-80 flex items-center gap-2",
                                    p.color,
                                  )}
                                  onClick={() =>
                                    handleSaveEdit(task.id, "priorityId", p.id)
                                  }
                                >
                                  {p.name}
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <WorkspaceUserAvatar
                            name={task.assignee}
                            avatarUrl={task.assigneeProfile?.avatar}
                            className="h-5 w-5"
                            fallbackClassName="text-[10px]"
                          />
                          <span className="text-sm text-foreground/80">
                            {task.assignee}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs opacity-50">
                          미할당
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {task.tags &&
                          task.tags.map((tag) => {
                            const tagName =
                              tags.find((t) => t.id === tag || t.name === tag)
                                ?.name || tag;
                            return (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className={cn(
                                  "px-1.5 py-0 font-normal text-[10px]",
                                  getTagColor(tag),
                                )}
                              >
                                {tagName}
                              </Badge>
                            );
                          })}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    테스크가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
