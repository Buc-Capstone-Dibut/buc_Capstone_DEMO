"use client";

import { useState } from "react";
import { useWorkspaceStore, Tag } from "../../store/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Check,
  MoreHorizontal,
  ChevronRight,
  Pen,
  Trash2,
  GripVertical,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  tags?: Tag[];
  onTagsUpdate?: () => void;
}

const TAG_COLORS = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

function getTextColor(color: string) {
  if (!color) return "text-foreground";
  if (color.includes("text-")) return color;
  return `text-${color}-700`;
}

function getBgColor(color: string) {
  if (!color) return "bg-muted";
  if (color.includes("bg-")) return color;
  return `bg-${color}-100`;
}

export function TagManagerModal({
  isOpen,
  onClose,
  workspaceId,
  tags = [],
  onTagsUpdate,
}: TagManagerModalProps) {
  // Removed useWorkspaceStore

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagNameInput, setTagNameInput] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");

  // Create / Edit Mode
  const [isCreating, setIsCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const resetForm = () => {
    setEditingTagId(null);
    setTagNameInput("");
    setIsCreating(false);
    setSelectedColor("blue");
  };

  const handleCreate = async () => {
    if (!tagNameInput.trim()) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tagNameInput.trim(),
          color: selectedColor,
        }),
      });
      onTagsUpdate?.();
      resetForm();
    } catch (error) {
      console.error("Failed to create tag", error);
    }
  };

  const handleUpdate = async () => {
    if (!editingTagId || !tagNameInput.trim()) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}/tags/${editingTagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tagNameInput.trim(),
          color: selectedColor,
        }),
      });
      onTagsUpdate?.();
      resetForm();
    } catch (error) {
      console.error("Failed to update tag", error);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (confirm("정말 이 태그를 삭제하시겠습니까?")) {
      try {
        await fetch(`/api/workspaces/${workspaceId}/tags/${tagId}`, {
          method: "DELETE",
        });
        onTagsUpdate?.();
        if (editingTagId === tagId) resetForm();
      } catch (error) {
        console.error("Failed to delete tag", error);
      }
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setTagNameInput(tag.name);
    // Try to extract color base name
    let colorBase = "gray";
    if (tag.color.includes("bg-")) {
      // legacy format: bg-red-100
      const parts = tag.color.split("-");
      if (parts.length > 2) colorBase = parts[1];
    } else {
      colorBase = tag.color;
    }
    setSelectedColor(colorBase);
    setIsCreating(false);
  };

  const reorderTags = (_oldIndex: number, _newIndex: number) => {
    onTagsUpdate?.();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tags.findIndex((t) => t.id === active.id);
      const newIndex = tags.findIndex((t) => t.id === over?.id);
      reorderTags(oldIndex, newIndex);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>태그 관리</DialogTitle>
          <DialogDescription>
            프로젝트에서 사용할 태그를 추가, 수정, 삭제합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tag List Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tags}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {tags.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      등록된 태그가 없습니다.
                    </div>
                  )}
                  {tags.map((tag) => (
                    <SortableTagItem
                      key={tag.id}
                      tag={tag}
                      onEdit={() => startEdit(tag)}
                      onDelete={() => handleDelete(tag.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Editor Area */}
          <div className="bg-muted/30 border-t p-4 space-y-4">
            {isCreating || editingTagId ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">
                    {isCreating ? "새 태그 만들기" : "태그 수정하기"}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={resetForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3">
                      <Input
                        placeholder="태그 이름"
                        value={tagNameInput}
                        onChange={(e) => setTagNameInput(e.target.value)}
                        className="h-9"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            isCreating ? handleCreate() : handleUpdate();
                        }}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-7 px-2",
                          getBgColor(selectedColor),
                          getTextColor(selectedColor),
                        )}
                      >
                        {tagNameInput || "미리보기"}
                      </Badge>
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-background border rounded-md h-24 overflow-y-auto">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "w-6 h-6 rounded-full border flex items-center justify-center transition-all hover:scale-110",
                          `bg-${color}-500`,
                          selectedColor === color
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : "opacity-80 hover:opacity-100",
                        )}
                        title={color}
                      >
                        {selectedColor === color && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={resetForm}>
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={isCreating ? handleCreate : handleUpdate}
                      disabled={!tagNameInput.trim()}
                    >
                      {isCreating ? "생성" : "저장"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                className="w-full dashed border-primary/50 text-primary hover:bg-primary/5"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> 새 태그 추가
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SortableTagItem({
  tag,
  onEdit,
  onDelete,
}: {
  tag: Tag;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // Use this to style dragging state
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 group touch-none",
        isDragging && "shadow-lg bg-accent",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="text-muted-foreground/40 cursor-grab hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <Badge
        variant="outline"
        className={cn(
          "px-2 py-0.5",
          getBgColor(tag.color),
          getTextColor(tag.color),
        )}
      >
        {tag.name}
      </Badge>

      <div className="flex-1" />

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pen className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-red-500"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
