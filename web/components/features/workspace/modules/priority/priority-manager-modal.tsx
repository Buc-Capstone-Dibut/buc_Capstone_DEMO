"use client";

import { useState } from "react";
import { useWorkspaceStore, Priority } from "../../store/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Check, MoreHorizontal, ChevronRight, Pen, Trash2, GripVertical, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PriorityManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Predefined colors suitable for priorities (backgrounds + text colors)
const PRIORITY_COLORS = [
  { name: "Red", class: "bg-red-100 text-red-700 hover:bg-red-200" },
  { name: "Orange", class: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  { name: "Amber", class: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { name: "Yellow", class: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
  { name: "Green", class: "bg-green-100 text-green-700 hover:bg-green-200" },
  { name: "Emerald", class: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  { name: "Teal", class: "bg-teal-100 text-teal-700 hover:bg-teal-200" },
  { name: "Cyan", class: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200" },
  { name: "Sky", class: "bg-sky-100 text-sky-700 hover:bg-sky-200" },
  { name: "Blue", class: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { name: "Indigo", class: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" },
  { name: "Violet", class: "bg-violet-100 text-violet-700 hover:bg-violet-200" },
  { name: "Purple", class: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { name: "Fuchsia", class: "bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200" },
  { name: "Pink", class: "bg-pink-100 text-pink-700 hover:bg-pink-200" },
  { name: "Rose", class: "bg-rose-100 text-rose-700 hover:bg-rose-200" },
  { name: "Slate", class: "bg-slate-100 text-slate-700 hover:bg-slate-200" },
  { name: "Gray", class: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
];

export function PriorityManagerModal({ isOpen, onClose }: PriorityManagerModalProps) {
  const priorities = useWorkspaceStore((s) => s.priorities);
  const createPriority = useWorkspaceStore((s) => s.createPriority);
  const updatePriority = useWorkspaceStore((s) => s.updatePriority);
  const deletePriority = useWorkspaceStore((s) => s.deletePriority);
  const reorderPriorities = useWorkspaceStore((s) => s.reorderPriorities);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [selectedColorClass, setSelectedColorClass] = useState(PRIORITY_COLORS[0].class);

  // Create / Edit Mode
  const [isCreating, setIsCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const resetForm = () => {
    setEditingId(null);
    setNameInput("");
    setIsCreating(false);
    setSelectedColorClass(PRIORITY_COLORS[0].class);
  };

  const handleCreate = () => {
    if (!nameInput.trim()) return;
    createPriority(nameInput.trim(), selectedColorClass);
    resetForm();
  };

  const handleUpdate = () => {
     if (!editingId || !nameInput.trim()) return;
     updatePriority(editingId, { name: nameInput.trim(), color: selectedColorClass });
     resetForm();
  };

  const handleDelete = (id: string) => {
     if (confirm("정말 이 우선순위를 삭제하시겠습니까?")) {
        deletePriority(id);
        if (editingId === id) resetForm();
     }
  };

  const startEdit = (priority: Priority) => {
     setEditingId(priority.id);
     setNameInput(priority.name);
     setSelectedColorClass(priority.color);
     setIsCreating(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
       const oldIndex = priorities.findIndex((p) => p.id === active.id);
       const newIndex = priorities.findIndex((p) => p.id === over?.id);
       reorderPriorities(arrayMove(priorities, oldIndex, newIndex)); // Note: reorderPriorities likely expects the new array
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>우선순위 관리</DialogTitle>
          <DialogDescription>
            프로젝트에서 사용할 우선순위를 설정하고 순서를 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
            {/* List Area */}
            <div className="flex-1 overflow-y-auto p-6">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={priorities} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {priorities.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground">
                                    등록된 우선순위가 없습니다.
                                </div>
                            )}
                            {priorities.map((item) => (
                                <SortablePriorityItem
                                    key={item.id}
                                    priority={item}
                                    onEdit={() => startEdit(item)}
                                    onDelete={() => handleDelete(item.id)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Editor Area */}
            <div className="bg-muted/30 border-t p-4 space-y-4">
                {(isCreating || editingId) ? (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">
                                {isCreating ? "새 우선순위 만들기" : "우선순위 수정하기"}
                            </h4>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={resetForm}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-3">
                             <div className="grid grid-cols-4 gap-2">
                                <div className="col-span-3">
                                    <Input
                                        placeholder="우선순위 이름 (예: 긴급, 중요)"
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                        className="h-9"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') isCreating ? handleCreate() : handleUpdate();
                                        }}
                                    />
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "h-7 px-2 border-transparent",
                                            selectedColorClass
                                        )}
                                    >
                                        {nameInput || "미리보기"}
                                    </Badge>
                                </div>
                             </div>

                             {/* Color Palette */}
                             <div className="flex flex-wrap gap-1.5 p-2 bg-background border rounded-md h-28 overflow-y-auto">
                                 {PRIORITY_COLORS.map((colorOption, idx) => (
                                     <button
                                        key={idx}
                                        onClick={() => setSelectedColorClass(colorOption.class)}
                                        className={cn(
                                            "w-6 h-6 rounded-full border flex items-center justify-center transition-all hover:scale-110",
                                            // Extract bg color for the circle preview
                                            colorOption.class.split(' ')[0],
                                            selectedColorClass === colorOption.class ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-80 hover:opacity-100"
                                        )}
                                        title={colorOption.name}
                                     >
                                         {selectedColorClass === colorOption.class && <Check className="h-3 w-3 text-current opacity-70" />}
                                     </button>
                                 ))}
                             </div>

                             <div className="flex justify-end gap-2 pt-2">
                                 <Button variant="outline" size="sm" onClick={resetForm}>취소</Button>
                                 <Button size="sm" onClick={isCreating ? handleCreate : handleUpdate} disabled={!nameInput.trim()}>
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
                        <Plus className="mr-2 h-4 w-4" /> 새 우선순위 추가
                    </Button>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SortablePriorityItem({ priority, onEdit, onDelete }: { priority: Priority, onEdit: () => void, onDelete: () => void }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: priority.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 50 : 'auto',
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
            "flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 group touch-none",
            isDragging && "shadow-lg bg-accent"
        )}
      >
        <div {...attributes} {...listeners} className="text-muted-foreground/40 cursor-grab hover:text-foreground">
            <GripVertical className="h-4 w-4" />
        </div>

        <Badge
            variant="outline"
            className={cn(
                "px-2 py-0.5 border-transparent",
                priority.color
            )}
        >
            {priority.name}
        </Badge>

        {/* Helper text for color code if needed, simplified for now */}
        {/* <span className="text-xs text-muted-foreground">{priority.color.split(' ')[0]}</span> */}

        <div className="flex-1" />

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}>
                <Pen className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
      </div>
    );
}
