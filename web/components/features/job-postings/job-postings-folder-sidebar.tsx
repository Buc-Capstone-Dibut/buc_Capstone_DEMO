"use client";

import { forwardRef, useEffect, useState, useCallback } from "react";
import {
  Check,
  FolderClosed,
  FolderPlus,
  GripVertical,
  Inbox,
  Loader2,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  COLOR_PRESET_DOT,
  COLOR_PRESET_LABEL,
  COLOR_PRESET_LIST,
} from "@/lib/job-postings/visual-tokens";
import type { ColorPreset, FolderRecord } from "@/lib/job-postings/types";

export interface FolderListItem extends FolderRecord {
  count: number;
}

export type FolderFilter =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "folder"; id: string }
  | { kind: "unfiled" };

export interface JobPostingsFolderSidebarProps {
  filter: FolderFilter;
  onChangeFilter: (next: FolderFilter) => void;
  /** 폴더가 변경(생성/수정/삭제)됐을 때 부모에 신호 — 카드 리스트 재조회용 */
  onFoldersChanged?: () => void;
  /** 부모에서 강제 새로고침 트리거. 카드 측에서 폴더로 이동시킬 때 +1 */
  refreshKey?: number;
}

export function JobPostingsFolderSidebar({
  filter,
  onChangeFilter,
  onFoldersChanged,
  refreshKey = 0,
}: JobPostingsFolderSidebarProps) {
  const [folders, setFolders] = useState<FolderListItem[]>([]);
  const [unfiledCount, setUnfiledCount] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = folders.findIndex((f) => f.id === active.id);
      const newIdx = folders.findIndex((f) => f.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;
      const reordered = arrayMove(folders, oldIdx, newIdx);
      setFolders(reordered);
      await fetch(`/api/my/job-postings/folders/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: newIdx }),
      });
      onFoldersChanged?.();
    },
    [folders, onFoldersChanged],
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my/job-postings/folders", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        setFolders(json.data.items ?? []);
        setUnfiledCount(json.data.unfiledCount ?? 0);
        setTotalAll(json.data.totalAll ?? 0);
        setTotalFavorites(json.data.totalFavorites ?? 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [refreshKey]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/my/job-postings/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if ((await res.json()).success) {
        setNewName("");
        await load();
        onFoldersChanged?.();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch(`/api/my/job-postings/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    await load();
    onFoldersChanged?.();
  };

  const handleColor = async (id: string, color: ColorPreset | null) => {
    await fetch(`/api/my/job-postings/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    await load();
    onFoldersChanged?.();
  };

  const handleDelete = async (id: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "이 폴더를 삭제할까요? 안에 있던 채용공고는 사라지지 않고 '미분류'로 이동합니다.",
      )
    ) {
      return;
    }
    await fetch(`/api/my/job-postings/folders/${id}`, { method: "DELETE" });
    await load();
    onFoldersChanged?.();
  };

  return (
    <aside className="space-y-2">
      {/* 시스템 항목 */}
      <NavItem
        icon={<Inbox className="h-3.5 w-3.5" />}
        label="전체"
        count={totalAll}
        active={filter.kind === "all"}
        onClick={() => onChangeFilter({ kind: "all" })}
      />
      <NavItem
        icon={<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
        label="즐겨찾기"
        count={totalFavorites}
        active={filter.kind === "favorites"}
        onClick={() => onChangeFilter({ kind: "favorites" })}
      />

      {/* 폴더 */}
      <div className="pt-3">
        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          폴더
        </p>
        {loading ? (
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            불러오는 중
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={folders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-0.5">
                {folders.map((f) => (
                  <SortableFolderRow
                    key={f.id}
                    folder={f}
                    active={filter.kind === "folder" && filter.id === f.id}
                    onClick={() => onChangeFilter({ kind: "folder", id: f.id })}
                    onRename={(name) => handleRename(f.id, name)}
                    onColor={(c) => handleColor(f.id, c)}
                    onDelete={() => handleDelete(f.id)}
                  />
                ))}
                {unfiledCount > 0 && (
                  <li>
                    <NavItem
                      icon={<FolderClosed className="h-3.5 w-3.5 text-muted-foreground" />}
                      label="미분류"
                      count={unfiledCount}
                      active={filter.kind === "unfiled"}
                      onClick={() => onChangeFilter({ kind: "unfiled" })}
                    />
                  </li>
                )}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {/* 폴더 추가 */}
        <div className="mt-2 flex items-center gap-1 px-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="새 폴더…"
            className="h-7 flex-1 border-dashed bg-transparent text-xs shadow-none focus-visible:ring-1"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            disabled={!newName.trim() || creating}
            onClick={() => void handleCreate()}
            aria-label="폴더 추가"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-foreground/[0.06] font-semibold text-foreground"
          : "text-foreground/80 hover:bg-foreground/[0.04]",
      )}
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <span
        className={cn(
          "ml-auto text-[11px] tabular-nums",
          active ? "text-foreground/70" : "text-muted-foreground/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SortableFolderRow(props: {
  folder: FolderListItem;
  active: boolean;
  onClick: () => void;
  onRename: (name: string) => void;
  onColor: (c: ColorPreset | null) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.folder.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <FolderRow
      {...props}
      ref={setNodeRef}
      style={style}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

const FolderRow = forwardRef<
  HTMLLIElement,
  {
    folder: FolderListItem;
    active: boolean;
    onClick: () => void;
    onRename: (name: string) => void;
    onColor: (c: ColorPreset | null) => void;
    onDelete: () => void;
    style?: React.CSSProperties;
    dragHandleProps?: Record<string, unknown>;
  }
>(function FolderRow(
  { folder, active, onClick, onRename, onColor, onDelete, style, dragHandleProps },
  ref,
) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState(folder.name);

  const dot = folder.color
    ? COLOR_PRESET_DOT[folder.color]
    : "bg-muted-foreground/40";

  return (
    <li
      ref={ref}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-foreground/[0.06] font-semibold text-foreground"
          : "text-foreground/80 hover:bg-foreground/[0.04]",
      )}
    >
      <span
        {...(dragHandleProps as React.HTMLAttributes<HTMLSpanElement>)}
        className="flex h-5 w-4 shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing"
        aria-label="드래그하여 순서 변경"
      >
        <GripVertical className="h-3 w-3" />
      </span>
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span
          aria-hidden
          className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", dot)}
        />
        <span className="flex-1 truncate">{folder.name}</span>
        <span
          className={cn(
            "text-[11px] tabular-nums",
            active ? "text-foreground/70" : "text-muted-foreground/70",
          )}
        >
          {folder.count}
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="폴더 옵션"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setRenameVal(folder.name);
              setRenameOpen(true);
            }}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            이름 변경
          </DropdownMenuItem>

          <Popover>
            <PopoverTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <span
                  aria-hidden
                  className={cn(
                    "mr-2 inline-block h-3 w-3 rounded-full",
                    dot,
                  )}
                />
                색 변경
              </DropdownMenuItem>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-44 p-2">
              <div className="grid grid-cols-4 gap-1.5">
                <ColorSwatch
                  color={null}
                  selected={folder.color === null}
                  onClick={() => onColor(null)}
                />
                {COLOR_PRESET_LIST.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    selected={folder.color === c}
                    onClick={() => onColor(c)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete()}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            폴더 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {renameOpen && (
        <div className="absolute left-0 right-0 z-10 mt-7 px-2">
          <div className="flex items-center gap-1 rounded-md border bg-popover p-1 shadow">
            <Input
              autoFocus
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onRename(renameVal);
                  setRenameOpen(false);
                }
                if (e.key === "Escape") setRenameOpen(false);
              }}
              className="h-7 text-xs"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                onRename(renameVal);
                setRenameOpen(false);
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
});

function ColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: ColorPreset | null;
  selected: boolean;
  onClick: () => void;
}) {
  const dot = color ? COLOR_PRESET_DOT[color] : "bg-transparent";
  const label = color ? COLOR_PRESET_LABEL[color] : "색 없음";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md border transition",
        selected ? "border-foreground" : "border-transparent hover:border-foreground/30",
      )}
    >
      {color ? (
        <span aria-hidden className={cn("h-4 w-4 rounded-full", dot)} />
      ) : (
        <span
          aria-hidden
          className="h-4 w-4 rounded-full border border-dashed border-muted-foreground/60"
        />
      )}
    </button>
  );
}
