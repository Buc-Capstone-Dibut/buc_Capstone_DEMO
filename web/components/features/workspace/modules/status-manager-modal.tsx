import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Plus, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";
import { useWorkspaceStore } from "../store/mock-data";
import { Badge } from "@/components/ui/badge";

interface StatusManagerModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  activeView: any;
  onCreateColumn: (title: string, category: string) => Promise<void>;
  onUpdateColumn: (columnId: string, updates: any) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
}

export function StatusManagerModal({
  isOpen,
  onClose,
  activeView,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
}: StatusManagerModalProps) {
  const [newColumnTitle, setNewColumnTitle] = useState("");

  if (!activeView) return null;

  const handleAddColumn = (category: "todo" | "in-progress" | "done") => {
    const titleMap = {
      todo: "할 일",
      "in-progress": "진행 중",
      done: "완료",
    };
    // Add logic to generate a unique title if needed, or just standard
    onCreateColumn(titleMap[category], category);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            섹션 관리
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <Label>새 섹션 추가</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 hover:bg-slate-50 hover:border-slate-300"
                onClick={() => handleAddColumn("todo")}
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="font-semibold text-slate-700">할 일</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => handleAddColumn("in-progress")}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="font-semibold text-blue-700">진행 중</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 hover:bg-green-50 hover:border-green-300"
                onClick={() => handleAddColumn("done")}
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="font-semibold text-green-700">완료</span>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Label>현재 섹션 목록 ({activeView.columns?.length || 0})</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {activeView.columns?.map((col: any, index: number) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move opacity-0 group-hover:opacity-100" />
                    <Badge
                      variant="outline"
                      className={
                        col.category === "todo"
                          ? "bg-slate-50 text-slate-600 border-slate-200"
                          : col.category === "in-progress"
                            ? "bg-blue-50 text-blue-600 border-blue-200"
                            : "bg-green-50 text-green-600 border-green-200"
                      }
                    >
                      {col.category === "todo"
                        ? "할 일"
                        : col.category === "in-progress"
                          ? "진행 중"
                          : "완료"}
                    </Badge>
                    <Input
                      className="h-7 w-40 text-sm font-medium border-transparent hover:border-input focus:border-input bg-transparent px-2"
                      value={col.title}
                      onChange={(e) =>
                        onUpdateColumn(col.id, {
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (
                        confirm(
                          `'${col.title}' 섹션을 삭제하시겠습니까? 포함된 태스크는 삭제되지 않습니다.`,
                        )
                      ) {
                        onDeleteColumn(col.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
