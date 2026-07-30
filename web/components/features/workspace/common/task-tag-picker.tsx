"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Tag as TagIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface TaskTagOption {
  id: string;
  name: string;
  color?: string | null;
}

interface TaskTagSummaryProps {
  tags: TaskTagOption[];
  maxVisible?: number;
  className?: string;
}

interface TaskTagPickerProps {
  tags: TaskTagOption[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void | Promise<void>;
  onCreateTag?: (name: string) => Promise<TaskTagOption | null | undefined>;
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
}

const TAG_BADGE_CLASS: Record<string, string> = {
  gray: "border-slate-200 bg-slate-100 text-slate-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  red: "border-red-200 bg-red-50 text-red-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  purple: "border-purple-200 bg-purple-50 text-purple-700",
  pink: "border-pink-200 bg-pink-50 text-pink-700",
};

const TAG_DOT_CLASS: Record<string, string> = {
  gray: "bg-slate-400",
  slate: "bg-slate-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  amber: "bg-amber-400",
  yellow: "bg-yellow-400",
  green: "bg-emerald-400",
  emerald: "bg-emerald-400",
  blue: "bg-blue-400",
  indigo: "bg-indigo-400",
  violet: "bg-violet-400",
  purple: "bg-purple-400",
  pink: "bg-pink-400",
};

function normalizeTagColor(color?: string | null) {
  if (!color) return "gray";
  const firstToken = color.toLowerCase().split(" ")[0];
  return firstToken
    .replace(/^bg-/, "")
    .replace(/-(50|100|200|400|500|600|700)$/, "");
}

export function getTaskTagBadgeClass(color?: string | null) {
  return TAG_BADGE_CLASS[normalizeTagColor(color)] || TAG_BADGE_CLASS.gray;
}

function getTaskTagDotClass(color?: string | null) {
  return TAG_DOT_CLASS[normalizeTagColor(color)] || TAG_DOT_CLASS.gray;
}

export function TaskTagSummary({
  tags,
  maxVisible = 2,
  className,
}: TaskTagSummaryProps) {
  if (tags.length === 0) {
    return (
      <span className={cn("text-[10px] text-muted-foreground/70", className)}>
        —
      </span>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      {tags.slice(0, maxVisible).map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={cn(
            "h-5 max-w-[78px] shrink truncate rounded-[3px] px-1.5 text-[10px] font-normal",
            getTaskTagBadgeClass(tag.color),
          )}
          title={tag.name}
        >
          {tag.name}
        </Badge>
      ))}
      {tags.length > maxVisible ? (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          +{tags.length - maxVisible}
        </span>
      ) : null}
    </div>
  );
}

export function TaskTagPicker({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  readOnly = false,
  compact = false,
  className,
  align = "start",
}: TaskTagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);
  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedSet.has(tag.id)),
    [selectedSet, tags],
  );
  const availableTags = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return tags.filter(
      (tag) =>
        !selectedSet.has(tag.id) &&
        (!normalizedQuery ||
          tag.name.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [query, selectedSet, tags]);
  const exactMatch = tags.some(
    (tag) => tag.name.toLocaleLowerCase() === query.trim().toLocaleLowerCase(),
  );
  const canCreate = Boolean(onCreateTag && query.trim() && !exactMatch);

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || !onCreateTag || isCreating) return;

    setIsCreating(true);
    try {
      const createdTag = await onCreateTag(name);
      if (!createdTag) return;
      await onChange([...selectedTagIds, createdTag.id]);
      setQuery("");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-1", className)}>
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={cn(
            "h-6 max-w-[120px] gap-1 truncate rounded-[3px] px-1.5 text-[10px] font-normal",
            getTaskTagBadgeClass(tag.color),
          )}
        >
          <span className="truncate">{tag.name}</span>
          {!readOnly ? (
            <button
              type="button"
              className="shrink-0 opacity-60 hover:opacity-100"
              aria-label={`${tag.name} 태그 제거`}
              onClick={() =>
                void onChange(
                  selectedTagIds.filter((tagId) => tagId !== tag.id),
                )
              }
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </Badge>
      ))}

      {!readOnly ? (
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) setQuery("");
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "shrink-0 border-dashed text-muted-foreground",
                compact ? "h-6 px-1.5 text-[10px]" : "h-7 px-2 text-xs",
              )}
            >
              <TagIcon className="mr-1 h-3 w-3" />
              추가
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align={align}>
            <form
              className="flex items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreate();
              }}
            >
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="태그 검색 또는 새 태그 만들기"
                className="h-8 text-xs"
              />
              {canCreate ? (
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={isCreating}
                  aria-label="새 태그 만들기"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              ) : null}
            </form>

            <div className="mt-2 max-h-52 space-y-0.5 overflow-y-auto">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    void onChange([...selectedTagIds, tag.id]);
                    setQuery("");
                  }}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      getTaskTagDotClass(tag.color),
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                </button>
              ))}
              {availableTags.length === 0 && !canCreate ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  {selectedTags.length === tags.length && tags.length > 0
                    ? "모든 태그를 선택했습니다."
                    : "검색 결과가 없습니다."}
                </div>
              ) : null}
              {canCreate ? (
                <button
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-primary hover:bg-muted"
                  onClick={() => void handleCreate()}
                  disabled={isCreating}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="min-w-0 truncate">
                    ‘{query.trim()}’ 태그 만들기
                  </span>
                </button>
              ) : null}
            </div>

            {selectedTags.length > 0 ? (
              <div className="mt-2 border-t pt-2">
                <div className="mb-1 px-1 text-[10px] text-muted-foreground">
                  선택됨 {selectedTags.length}
                </div>
                {selectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs hover:bg-muted"
                    onClick={() =>
                      void onChange(
                        selectedTagIds.filter((tagId) => tagId !== tag.id),
                      )
                    }
                  >
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
