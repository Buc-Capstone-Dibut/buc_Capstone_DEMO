import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Trash } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, BoardView } from "../../store/mock-data";

interface ViewManagerModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  view: BoardView | null;
  availableColors?: string[];
  onUpdateView?: (
    viewId: string,
    updates: Partial<BoardView>,
  ) => Promise<void> | void;
  onDeleteView?: (viewId: string) => Promise<boolean | void> | boolean | void;
}

export function ViewManagerModal({
  projectId,
  isOpen,
  onClose,
  view,
  availableColors: availableColorsProp,
  onUpdateView,
  onDeleteView,
}: ViewManagerModalProps) {
  const { updateView, deleteView, tags } = useWorkspaceStore();
  const [viewName, setViewName] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");

  const availableColors = availableColorsProp || Array.from(new Set(tags.map(t => t.color)));

  // Sync state when view changes - THIS FIXES THE BUG
  useEffect(() => {
    if (view && isOpen) {
       setViewName(view.name);
       setSelectedColor(view.color || 'blue');
       setSelectedIcon(view.icon || '📋');
    }
  }, [view, isOpen]);

  if (!view) return null;

  const handleUpdate = async () => {
    if (!viewName.trim()) return;

    const updates = {
      name: viewName,
      color: selectedColor,
      icon: selectedIcon,
    };

    if (onUpdateView) {
      await onUpdateView(view.id, updates);
    } else {
      updateView(projectId, view.id, updates);
    }

    onClose();
  };

  const handleDelete = async () => {
      if (confirm("정말 이 뷰를 삭제하시겠습니까?")) {
          if (onDeleteView) {
              const result = await onDeleteView(view.id);
              if (result === false) return;
          } else {
              deleteView(projectId, view.id);
          }
          onClose();
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
            <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                뷰 관리하기
            </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
             <div className="space-y-3">
                <Label>뷰 이름</Label>
                <Input
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                <Label>탭 색상 (태그 기반 제한)</Label>
                <div className="flex flex-wrap gap-2">
                    {availableColors.length > 0 ? availableColors.map(c => (
                        <div
                            key={c}
                            onClick={() => setSelectedColor(c)}
                            className={cn(
                                "w-8 h-8 rounded-full cursor-pointer ring-2 ring-offset-2 transition-all hover:scale-110",
                                `bg-${c}-500`,
                                selectedColor === c ? "ring-primary" : "ring-transparent"
                            )}
                        />
                    )) : (
                         <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                             사용 가능한 태그 색상이 없습니다.
                         </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <Label>아이콘</Label>
                <div className="flex flex-wrap gap-2">
                    {['📋', '📅', '🚀', '💻', '🎨', '🔥', '🐛', '📈'].map(icon => (
                        <div
                            key={icon}
                            onClick={() => setSelectedIcon(icon)}
                            className={cn("w-8 h-8 flex items-center justify-center rounded cursor-pointer hover:bg-muted font-emoji text-lg", selectedIcon === icon ? "bg-primary/10 ring-1 ring-primary" : "")}
                        >
                            {icon}
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-2 border-t mt-4">
                 <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
                     <Trash className="w-4 h-4 mr-2" />
                     이 뷰 삭제하기
                 </Button>
                 <p className="text-xs text-center text-muted-foreground mt-2">
                     * 이름, 색상, 아이콘 및 삭제만 가능합니다.<br/>
                     그룹 기준 변경은 새로운 뷰를 생성해주세요.
                 </p>
            </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/20 border-t">
            <Button variant="ghost" onClick={onClose}>취소</Button>
            <Button onClick={handleUpdate}>저장하기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
