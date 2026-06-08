import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanSquare, List, Calendar, User, Tag, Flag, Clock, Layout, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "../../store/mock-data";

interface ViewBuilderModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (viewId: string) => void;
  initialView?: any; // BoardView type effectively
}

export function ViewBuilderModal({ projectId, isOpen, onClose, onCreated, initialView }: ViewBuilderModalProps) {
  const addView = useWorkspaceStore((s) => s.addView);
  const updateView = useWorkspaceStore((s) => s.updateView);
  const [step, setStep] = useState(1);

  // Initialize state with initialView if provided
  const [viewName, setViewName] = useState(initialView?.name || "");
  const [viewType, setViewType] = useState<'kanban' | 'list' | 'calendar'>(initialView?.type || 'kanban');
  const [grouping, setGrouping] = useState<'status' | 'assignee' | 'priority' | 'dueDate' | 'tag'>(initialView?.groupBy || 'status');
  const [selectedColor, setSelectedColor] = useState(initialView?.color || 'bg-blue-500');
  const [selectedIcon, setSelectedIcon] = useState(initialView?.icon || '📋');

  // Reset state when modal opens/closes or initialView changes
  // (In a real app, use useEffect on isOpen/initialView. Here relying on mount)

  const handleCreate = () => {
    if (!viewName.trim()) return;

    if (initialView) {
        // Edit Mode
        updateView(projectId, initialView.id, {
            name: viewName,
            type: viewType,
            groupBy: grouping as any,
            color: selectedColor,
            icon: selectedIcon
        });
        onCreated(initialView.id);
    } else {
        // Create Mode
        const viewId = `v-${Date.now()}`;
        addView(projectId, {
            id: viewId,
            projectId,
            name: viewName,
            type: viewType,
            groupBy: grouping as any,
            color: selectedColor,
            icon: selectedIcon,
            columns: []
        });
        onCreated(viewId);
    }

    onClose();
    // Reset defaults (optional, as component likely remounts or we can manually reset)
    if (!initialView) {
        setStep(1);
        setViewName("");
        setGrouping('status');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
            <DialogTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5 text-primary" />
                {initialView ? '뷰 설정 수정' : '새로운 뷰 만들기'}
            </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-8">
            {/* Step 1: Basic Info */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>뷰 이름</Label>
                    <Input
                        placeholder="예: 프론트엔드 태스크, 이번 주 마감"
                        value={viewName}
                        onChange={(e) => setViewName(e.target.value)}
                        className="text-lg font-medium"
                        autoFocus
                    />
                </div>
            </div>

            {/* Step 2: View Type Selection */}
            <div className="space-y-3">
                <Label>보기 방식 (Type)</Label>
                <div className="grid grid-cols-3 gap-3">
                    <ViewTypeCard
                        id="kanban"
                        label="보드 (Kanban)"
                        icon={<KanbanSquare className="h-6 w-6" />}
                        selected={viewType === 'kanban'}
                        onClick={() => setViewType('kanban')}
                        desc="상태 흐름 파악에 최적"
                    />
                    <ViewTypeCard
                        id="list"
                        label="리스트 (Table)"
                        icon={<List className="h-6 w-6" />}
                        selected={viewType === 'list'}
                        onClick={() => setViewType('list')}
                        desc="많은 데이터 빠른 관리"
                    />
                    <ViewTypeCard
                        id="calendar"
                        label="캘린더 (Calendar)"
                        icon={<Calendar className="h-6 w-6" />}
                        selected={viewType === 'calendar'}
                        onClick={() => setViewType('calendar')}
                        desc="일정 및 마감일 중심"
                    />
                </div>
            </div>

            {/* Step 3: Grouping Standard */}
            <div className="space-y-3">
                <Label>그룹 기준 (Grouping)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                     <GroupingOption id="status" label="진행 상태" icon={<CheckCircle2 className="h-4 w-4" />} selected={grouping === 'status'} onClick={() => setGrouping('status')} />
                     <GroupingOption id="assignee" label="담당자" icon={<User className="h-4 w-4" />} selected={grouping === 'assignee'} onClick={() => setGrouping('assignee')} />
                     <GroupingOption id="tag" label="태그 (파트)" icon={<Tag className="h-4 w-4" />} selected={grouping === 'tag'} onClick={() => setGrouping('tag')} />
                     <GroupingOption id="dueDate" label="마감일" icon={<Clock className="h-4 w-4" />} selected={grouping === 'dueDate'} onClick={() => setGrouping('dueDate')} />
                     <GroupingOption id="priority" label="중요도" icon={<Flag className="h-4 w-4" />} selected={grouping === 'priority'} onClick={() => setGrouping('priority')} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Step 4: Color Selection */}
                <div className="space-y-3">
                    <Label>탭 색상</Label>
                    <div className="flex flex-wrap gap-2">
                        {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-slate-500'].map(c => (
                            <div
                                key={c}
                                onClick={() => setSelectedColor(c)}
                                className={cn(
                                    "w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ring-2 ring-offset-2",
                                    c,
                                    selectedColor === c ? "ring-primary" : "ring-transparent"
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Step 5: Icon Selection */}
                <div className="space-y-3">
                    <Label>아이콘</Label>
                    <div className="flex flex-wrap gap-2">
                        {['📋', '📅', '🚀', '💻', '🎨', '🐛', '🔥'].map(icon => (
                            <div
                                key={icon}
                                onClick={() => setSelectedIcon(icon)}
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-lg hover:bg-muted font-emoji",
                                    selectedIcon === icon ? "bg-primary/10 ring-1 ring-primary" : ""
                                )}
                            >
                                {icon}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/20 border-t flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>취소</Button>
            <Button onClick={handleCreate} disabled={!viewName.trim()}>
                {initialView ? '수정 저장' : '뷰 생성하기'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewTypeCard({ id, label, icon, selected, onClick, desc }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-muted/50",
                selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-muted-foreground/20"
            )}
        >
            <div className={cn("mb-2", selected ? "text-primary" : "text-muted-foreground")}>{icon}</div>
            <div className="font-semibold text-sm">{label}</div>
            <div className="text-[10px] text-muted-foreground mt-1 text-center">{desc}</div>
            {selected && <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />}
        </div>
    )
}

function GroupingOption({ id, label, icon, selected, onClick }: any) {
    return (
        <Button
            variant="outline"
            className={cn(
                "justify-start h-10 px-3 transition-all",
                selected && "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
            )}
            onClick={onClick}
        >
            <span className={cn("mr-2", selected ? "text-primary" : "text-muted-foreground")}>{icon}</span>
            {label}
        </Button>
    )
}
