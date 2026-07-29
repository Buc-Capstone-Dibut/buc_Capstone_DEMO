"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Archive,
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  FolderKanban,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatTaskDateRange } from "@/lib/workspace/task-dates";
import { KanbanBoard } from "./kanban-board";

type WorkspaceBoardSummary = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  archivedAt: string | null;
  taskCount: number;
  completedCount: number;
  memberCount: number;
  startDate: string | null;
  endDate: string | null;
};

const fetchBoards = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "보드를 불러오지 못했습니다.");
  }
  return payload as WorkspaceBoardSummary[];
};

export function WorkspaceBoards({
  projectId,
  readOnly = false,
  initialBoardId = null,
  onBoardSelectionChange,
}: {
  projectId: string;
  readOnly?: boolean;
  initialBoardId?: string | null;
  onBoardSelectionChange?: (boardId: string | null) => void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(
    initialBoardId,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingBoard, setEditingBoard] =
    useState<WorkspaceBoardSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const key = `/api/workspaces/${projectId}/boards${
    showArchived ? "?archived=true" : ""
  }`;
  const { data, error, isLoading, mutate } = useSWR(key, fetchBoards, {
    revalidateOnFocus: false,
  });

  const boards = useMemo(
    () =>
      (data || []).filter((board) =>
        showArchived ? Boolean(board.archivedAt) : !board.archivedAt,
      ),
    [data, showArchived],
  );
  const focusedBoard = expandedBoardId
    ? boards.find((board) => board.id === expandedBoardId)
    : null;

  useEffect(() => {
    setExpandedBoardId(initialBoardId);
  }, [initialBoardId]);

  const selectBoard = (boardId: string | null) => {
    setExpandedBoardId(boardId);
    onBoardSelectionChange?.(boardId);
  };

  const createBoard = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${projectId}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "보드를 만들지 못했습니다.");
      }
      await mutate();
      setName("");
      setDescription("");
      setIsCreating(false);
      toast.success("보드를 만들었습니다.");
      selectBoard(payload.id);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "보드를 만들지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const setArchived = async (
    board: WorkspaceBoardSummary,
    archived: boolean,
  ) => {
    try {
      const response = await fetch(
        `/api/workspaces/${projectId}/boards/${board.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "보드 상태를 변경하지 못했습니다.");
      }
      await mutate();
      toast.success(archived ? "보드를 보관했습니다." : "보드를 복원했습니다.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "보드 상태를 변경하지 못했습니다.",
      );
    }
  };

  const openEdit = (board: WorkspaceBoardSummary) => {
    setEditingBoard(board);
    setEditName(board.name);
    setEditDescription(board.description || "");
  };

  const saveBoard = async () => {
    if (!editingBoard || !editName.trim()) return;
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/workspaces/${projectId}/boards/${editingBoard.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            description: editDescription,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "보드를 수정하지 못했습니다.");
      }
      await mutate();
      setEditingBoard(null);
      toast.success("보드 정보를 수정했습니다.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "보드를 수정하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`mx-auto flex h-full w-full max-w-7xl flex-col ${
        expandedBoardId ? "p-3" : "px-5 py-5"
      }`}
    >
      {!expandedBoardId && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight">보드</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              업무 흐름별로 보드를 나누고 각 보드 안에서 작업을 관리합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setShowArchived((value) => !value);
                selectBoard(null);
                setIsCreating(false);
              }}
            >
              <Archive className="mr-2 h-4 w-4" />
              {showArchived ? "활성 보드" : "보관함"}
            </Button>
            {!readOnly && !showArchived && (
              <Button
                size="sm"
                variant={isCreating ? "secondary" : "default"}
                onClick={() => {
                  setIsCreating((value) => !value);
                  selectBoard(null);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />새 보드
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          보드를 불러오는 중입니다.
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
            {error.message}
          </div>
        </div>
      ) : focusedBoard ? (
        <div className="min-h-0 flex-1 animate-in overflow-hidden rounded-xl border bg-background fade-in slide-in-from-bottom-2 duration-300">
          <KanbanBoard
            projectId={projectId}
            boardId={focusedBoard.id}
            embedded
            onBackToBoards={() => selectBoard(null)}
          />
        </div>
      ) : expandedBoardId ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">보드를 찾을 수 없습니다.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => selectBoard(null)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              모든 보드
            </Button>
          </div>
        </div>
      ) : boards.length === 0 && !isCreating ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-sm rounded-2xl border border-dashed p-8 text-center">
            <Archive className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {showArchived
                ? "보관된 보드가 없습니다."
                : "아직 보드가 없습니다."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_72px_90px_150px_40px] items-center gap-3 border-b bg-muted/20 px-4 py-2 text-[11px] font-medium text-muted-foreground md:grid">
            <span>보드</span>
            <span>진행률</span>
            <span>작업</span>
            <span>담당</span>
            <span>기간</span>
            <span />
          </div>

          {isCreating && !showArchived && (
            <div className="border-b bg-primary/[0.03] p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(180px,0.7fr)_minmax(240px,1.3fr)_auto] md:items-center">
                <Input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="보드 이름"
                  maxLength={80}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && name.trim()) {
                      void createBoard();
                    }
                  }}
                />
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="보드 설명 (선택)"
                  maxLength={300}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && name.trim()) {
                      void createBoard();
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      setName("");
                      setDescription("");
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    disabled={!name.trim() || isSaving}
                    onClick={() => void createBoard()}
                  >
                    {isSaving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    만들기
                  </Button>
                </div>
              </div>
            </div>
          )}

          {boards.map((board) => {
            const progress =
              board.taskCount > 0
                ? Math.round((board.completedCount / board.taskCount) * 100)
                : 0;
            return (
              <section key={board.id} className="border-b last:border-b-0">
                <div className="flex items-stretch">
                  <button
                    type="button"
                    aria-expanded={false}
                    aria-label={`${board.name} 열기`}
                    className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_110px_72px_90px_150px] md:gap-3"
                    onClick={() => selectBoard(board.id)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="min-w-0 truncate text-sm font-semibold">
                          {board.name}
                        </h2>
                        {board.isDefault && (
                          <Badge
                            variant="secondary"
                            className="h-5 text-[10px]"
                          >
                            기본
                          </Badge>
                        )}
                        <span className="hidden truncate text-xs text-muted-foreground lg:inline">
                          {board.description || "설명이 없습니다."}
                        </span>
                      </div>
                    </div>
                    <div className="hidden items-center gap-1.5 text-xs md:flex">
                      <span className="font-medium">{progress}%</span>
                      <span className="text-muted-foreground">
                        {board.completedCount}/{board.taskCount}
                      </span>
                    </div>
                    <span className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {board.taskCount}
                    </span>
                    <span className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
                      <Users className="h-3.5 w-3.5" />
                      {board.memberCount}
                    </span>
                    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
                      <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                      {formatTaskDateRange(board.startDate, board.endDate) ||
                        "기간 미정"}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground md:hidden">
                      {progress}%
                    </span>
                  </button>

                  {!readOnly && (
                    <div className="flex w-11 shrink-0 items-center justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`${board.name} 메뉴`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!board.archivedAt && (
                            <DropdownMenuItem onClick={() => openEdit(board)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              이름·설명 수정
                            </DropdownMenuItem>
                          )}
                          {board.archivedAt ? (
                            <DropdownMenuItem
                              onClick={() => void setArchived(board, false)}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              복원
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled={board.isDefault}
                              onClick={() => void setArchived(board, true)}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              보관
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(editingBoard)}
        onOpenChange={(open) => {
          if (!open) setEditingBoard(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>보드 정보 수정</DialogTitle>
            <DialogDescription>
              보드 이름과 관리 범위를 알아보기 쉽게 정리합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              maxLength={80}
            />
            <Textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBoard(null)}>
              취소
            </Button>
            <Button
              disabled={!editName.trim() || isSaving}
              onClick={() => void saveBoard()}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
