import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  User,
  Tag,
  Clock,
  MessageSquare,
  X,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskAssigneePicker } from "@/components/features/workspace/common/task-assignee-picker";
import { getTaskAssigneeIds } from "@/lib/workspace/task-assignees";

interface TaskDetailModalProps {
  taskId: string;
  task: any; // Using any for flexibility with real/mock data mismatch
  members: any[];
  availableTags?: any[];
  detailedTags?: any[]; // For color lookup
  onClose: () => void;
  onUpdate: (taskId: string, updates: any) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskDetailModal({
  taskId,
  task,
  members = [],
  availableTags = [],
  detailedTags = [],
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
    }
  }, [task]);

  if (!task) return null;

  // Filter available tags to exclude already added ones
  const filteredAvailableTags = availableTags.filter(
    (t) =>
      !task.tags?.includes(t.id) &&
      t.name.toLowerCase().includes(newTag.toLowerCase()),
  );

  const handleSelectTag = (tagId: string) => {
    const currentTags = task.tags || [];
    if (!currentTags.includes(tagId)) {
      onUpdate(task.id, { tags: [...currentTags, tagId] });
    }
  };

  const handleTitleBlur = () => {
    if (title !== task.title) {
      onUpdate(task.id, { title });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
      onUpdate(task.id, { description });
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const currentTags = task.tags || [];
    if (!currentTags.includes(newTag.trim())) {
      onUpdate(task.id, { tags: [...currentTags, newTag.trim()] });
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagIdToRemove: string) => {
    const currentTags = task.tags || [];
    onUpdate(task.id, {
      tags: currentTags.filter((t: string) => t !== tagIdToRemove),
    });
  };

  const priorities = [
    {
      id: "urgent",
      name: "긴급",
      color: "text-red-600 bg-red-50 border-red-200",
    },
    {
      id: "high",
      name: "높음",
      color: "text-orange-600 bg-orange-50 border-orange-200",
    },
    {
      id: "medium",
      name: "중간",
      color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    },
    {
      id: "low",
      name: "낮음",
      color: "text-green-600 bg-green-50 border-green-200",
    },
  ];

  const currentPriority =
    priorities.find((p) => p.id === (task.priorityId || task.priority)) ||
    priorities.find((p) => p.id === "medium") ||
    priorities[2];

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-3xl h-[85vh] p-0 flex flex-col overflow-hidden bg-background"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-6 bg-muted/20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {task.columnId ? "Task" : "Task"}
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="capitalize">{task.status}</span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <ScrollArea className="flex-1">
            <div className="p-8 max-w-2xl mx-auto space-y-8 pb-20">
              {/* Title */}
              <Input
                className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto rounded-none bg-transparent placeholder:text-muted-foreground/40 px-0"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Task Title"
              />

              {/* Properties */}
              <div className="grid grid-cols-[100px_1fr] gap-y-4 text-sm items-center">
                {/* Assignee */}
                <div className="text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" /> 담당자
                </div>
                <div>
                  <TaskAssigneePicker
                    members={members}
                    value={getTaskAssigneeIds(task)}
                    onValueChange={(assigneeIds) =>
                      onUpdate(task.id, { assigneeIds })
                    }
                    className="-ml-2 border-0 bg-transparent shadow-none"
                  />
                </div>

                {/* Priority */}
                <div className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> 우선순위
                </div>
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-2 -ml-2 justify-start font-normal",
                          currentPriority.color,
                        )}
                      >
                        {currentPriority.name}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-32 p-1" align="start">
                      {priorities.map((p) => (
                        <div
                          key={p.id}
                          className={cn(
                            "px-2 py-1.5 rounded cursor-pointer text-xs mb-0.5 last:mb-0 hover:opacity-80",
                            p.color,
                          )}
                          onClick={() => onUpdate(task.id, { priority: p.id })}
                        >
                          {p.name}
                        </div>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Due Date */}
                <div className="text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" /> 마감일
                </div>
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-2 -ml-2 justify-start font-normal",
                          !task.dueDate && "text-muted-foreground/50",
                        )}
                      >
                        {task.dueDate
                          ? format(new Date(task.dueDate), "PPP")
                          : "설정 안 함"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          task.dueDate ? new Date(task.dueDate) : undefined
                        }
                        onSelect={(date) =>
                          onUpdate(task.id, { dueDate: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tags */}
                <div className="text-muted-foreground flex items-center gap-2 self-start mt-1.5">
                  <Tag className="h-4 w-4" /> 태그
                </div>
                <div className="flex flex-wrap gap-2">
                  {task.tags?.map((tagId: string) => {
                    // Lookup color
                    const tagInfo = detailedTags.find(
                      (t) => t.id === tagId || t.name === tagId,
                    );
                    const tagName = tagInfo ? tagInfo.name : tagId;

                    let colorClass = "bg-slate-100 text-slate-700";

                    if (tagInfo) {
                      // Use defined color helper or logic
                      if (tagInfo.color?.includes("bg-")) {
                        // legacy
                        const parts = tagInfo.color.split("-");
                        const base = parts[1] || "slate";
                        colorClass = `bg-${base}-100 text-${base}-700`;
                      } else {
                        colorClass = `bg-${tagInfo.color}-100 text-${tagInfo.color}-700`;
                      }
                    } else {
                      // Hash fallback
                      const colors = [
                        "bg-slate-100 text-slate-700",
                        "bg-blue-100 text-blue-700",
                        "bg-green-100 text-green-700",
                        "bg-orange-100 text-orange-700",
                        "bg-purple-100 text-purple-700",
                        "bg-pink-100 text-pink-700",
                      ];
                      const colorIndex =
                        (tagName.length + (tagName.charCodeAt(0) || 0)) %
                        colors.length;
                      colorClass = colors[colorIndex];
                    }

                    return (
                      <Badge
                        key={tagId}
                        variant="secondary"
                        className={cn("px-1.5 font-normal", colorClass)}
                      >
                        {tagName}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer opacity-50"
                          onClick={() => handleRemoveTag(tagId)}
                        />
                      </Badge>
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-5 px-2 text-[10px] border-dashed text-muted-foreground font-normal hover:bg-muted"
                      >
                        + 추가
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <div className="space-y-2">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddTag();
                          }}
                          className="flex gap-2"
                        >
                          <Input
                            className="h-7 text-xs"
                            placeholder="태그 검색/생성..."
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="h-7 w-7 p-0"
                          >
                            +
                          </Button>
                        </form>

                        {/* Available Tags List */}
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {filteredAvailableTags.length > 0 && (
                            <div className="text-[10px] text-muted-foreground px-1 mb-1">
                              기존 태그 선택
                            </div>
                          )}
                          {filteredAvailableTags.map((tag) => (
                            <div
                              key={tag.id}
                              onClick={() => handleSelectTag(tag.id)}
                              className="px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-xs flex items-center"
                            >
                              <Tag className="w-3 h-3 mr-2 opacity-50" />
                              {tag.name}
                            </div>
                          ))}
                          {newTag &&
                            !filteredAvailableTags.find(
                              (t) => t.name === newTag,
                            ) && (
                              <div className="text-[10px] text-muted-foreground px-1 mt-1">
                                Enter를 눌러 "{newTag}" 생성
                              </div>
                            )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-3">
                <div className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> 설명
                </div>
                <Textarea
                  className="min-h-[200px] resize-none border-none bg-muted/20 p-4 text-sm leading-relaxed focus-visible:ring-0"
                  placeholder="태스크에 대한 상세 설명을 작성하세요."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                />
              </div>

              {/* Delete Option */}
              {onDelete && (
                <div className="pt-10 flex justify-end">
                  <Button
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm("정말로 이 태스크를 삭제하시겠습니까?")) {
                        onDelete(task.id);
                        onClose();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> 태스크 삭제
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
