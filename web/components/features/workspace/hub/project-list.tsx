"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Plus,
  MoreVertical,
  Trash2,
  Loader2,
  Pencil,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { CreateWorkspaceDialog } from "../dialogs/create-workspace-dialog";
import { EditWorkspaceDialog } from "../dialogs/edit-workspace-dialog";
import { getTeamTypeLabel } from "@/lib/team-types";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  category?: string;
  lifecycle_status: "IN_PROGRESS" | "COMPLETED";
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  my_role: string;
  my_team_role?: string | null;
  member_count: number;
  recent_members?: {
    id: string;
    avatar_url: string | null;
    nickname: string | null;
  }[];
}

type FetchError = Error & { status?: number };
type WorkspaceStatusFilter = "all" | "in_progress" | "completed";
type WorkspaceSort = "latest" | "oldest";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const error: FetchError = new Error(errorBody?.error || "Failed to fetch");
    error.status = res.status;
    throw error;
  }
  return res.json();
};

function workspaceStatusLabel(status: Workspace["lifecycle_status"]) {
  return status === "COMPLETED" ? "종료" : "진행중";
}

function workspaceStatusBadgeClass(status: Workspace["lifecycle_status"]) {
  return status === "COMPLETED"
    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200";
}

function formatWorkspaceDate(value: string | null | undefined) {
  if (!value) return "미정";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "미정";
  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function ProjectList() {
  const {
    data: workspaces,
    error,
    isLoading,
    mutate,
  } = useSWR<Workspace[]>("/api/workspaces", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    focusThrottleInterval: 300_000,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
    null,
  );
  const [statusFilter, setStatusFilter] =
    useState<WorkspaceStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceSort, setWorkspaceSort] =
    useState<WorkspaceSort>("latest");

  const workspaceCounts = useMemo(() => {
    const items = Array.isArray(workspaces) ? workspaces : [];
    return {
      all: items.length,
      in_progress: items.filter(
        (workspace) => workspace.lifecycle_status === "IN_PROGRESS",
      ).length,
      completed: items.filter(
        (workspace) => workspace.lifecycle_status === "COMPLETED",
      ).length,
    };
  }, [workspaces]);

  const visibleWorkspaces = useMemo(() => {
    const items = Array.isArray(workspaces) ? [...workspaces] : [];
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("ko-KR");
    const filtered = items.filter((workspace) => {
      if (statusFilter === "in_progress") {
        if (workspace.lifecycle_status !== "IN_PROGRESS") return false;
      }
      if (statusFilter === "completed") {
        if (workspace.lifecycle_status !== "COMPLETED") return false;
      }
      if (!normalizedSearch) return true;

      return [
        workspace.name,
        workspace.description,
        getTeamTypeLabel(workspace.category),
        workspace.my_team_role,
      ].some((value) =>
        value?.toLocaleLowerCase("ko-KR").includes(normalizedSearch),
      );
    });

    return filtered.sort((left, right) => {
      const leftRank = left.lifecycle_status === "IN_PROGRESS" ? 0 : 1;
      const rightRank = right.lifecycle_status === "IN_PROGRESS" ? 0 : 1;
      if (leftRank !== rightRank) return leftRank - rightRank;

      const leftCreatedAt = Date.parse(left.created_at) || 0;
      const rightCreatedAt = Date.parse(right.created_at) || 0;
      return workspaceSort === "latest"
        ? rightCreatedAt - leftCreatedAt
        : leftCreatedAt - rightCreatedAt;
    });
  }, [searchQuery, statusFilter, workspaceSort, workspaces]);

  const statusFilters: {
    value: WorkspaceStatusFilter;
    label: string;
  }[] = [
    { value: "all", label: "전체" },
    { value: "in_progress", label: "진행중" },
    { value: "completed", label: "종료" },
  ];

  const handleDelete = async () => {
    if (!workspaceToDelete) return;

    try {
      setDeletingId(workspaceToDelete.id);
      const response = await fetch(`/api/workspaces/${workspaceToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("팀 공간 삭제 실패");
      }

      toast.success("팀 공간이 삭제되었습니다.");
      mutate(workspaces?.filter((w) => w.id !== workspaceToDelete.id)); // Optimistic update
    } catch (error) {
      toast.error("삭제 중 오류가 발생했습니다.");
      console.error(error);
    } finally {
      setDeletingId(null);
      setWorkspaceToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const isUnauthorized =
    error instanceof Error && (error as FetchError).status === 401;

  if (isUnauthorized) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h3 className="text-lg font-semibold">로그인이 필요합니다</h3>
        <p className="mt-2 text-sm">
          팀 공간 조회/생성은 로그인 후 사용할 수 있습니다. 우측 상단의 로그인
          버튼으로 먼저 로그인해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div>
          <h2 className="text-4xl font-black tracking-tighter">워크스페이스</h2>
          <p className="text-muted-foreground">참여 중인 팀 목록입니다.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            variant={statusFilter === filter.value ? "default" : "outline"}
            size="sm"
            className="rounded-full px-4"
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
            <span className="ml-1.5 text-xs opacity-70">
              {workspaceCounts[filter.value]}
            </span>
          </Button>
        ))}
        <div className="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="워크스페이스 검색..."
              aria-label="워크스페이스 검색"
              className="h-10 rounded-xl bg-muted/50 pl-9"
            />
          </div>
          <Select
            value={workspaceSort}
            onValueChange={(value) => setWorkspaceSort(value as WorkspaceSort)}
          >
            <SelectTrigger
              aria-label="워크스페이스 정렬"
              className="h-10 w-full rounded-xl bg-muted/50 sm:w-[130px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
            </SelectContent>
          </Select>
          <CreateWorkspaceDialog>
            <Button className="h-10 w-full gap-2 rounded-xl px-5 shadow-sm sm:w-auto">
              <Plus className="h-4 w-4" />
              새 워크스페이스 추가
            </Button>
          </CreateWorkspaceDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleWorkspaces.map((workspace) => {
          const isCompleted = workspace.lifecycle_status === "COMPLETED";
          return (
            <div
              key={workspace.id}
              className={`relative group transition-opacity ${
                isCompleted ? "opacity-75 hover:opacity-90" : ""
              }`}
            >
              <Link
                href={`/workspace/${workspace.id}`}
                className="block h-full"
              >
                <Card
                  className={`transition-all cursor-pointer h-full flex flex-col relative overflow-hidden group shadow-sm ${
                    isCompleted
                      ? "border-slate-300/70 bg-muted/30 saturate-50 hover:border-slate-400 hover:shadow-sm dark:border-slate-700"
                      : "bg-card hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  <CardHeader
                    className={`pb-3 space-y-3 ${
                      workspace.my_role === "owner" ? "pr-12" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <Badge
                        variant="secondary"
                        className={`rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                          isCompleted
                            ? "bg-slate-200/70 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        {getTeamTypeLabel(workspace.category)}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${workspaceStatusBadgeClass(
                          workspace.lifecycle_status,
                        )}`}
                      >
                        {workspaceStatusLabel(workspace.lifecycle_status)}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <CardTitle
                        className={`text-xl font-bold leading-tight transition-colors ${
                          isCompleted
                            ? "text-muted-foreground"
                            : "group-hover:text-primary"
                        }`}
                      >
                        {workspace.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-sm text-muted-foreground h-10">
                        {workspace.description ||
                          "팀 공간에 대한 설명이 없습니다."}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    <div className="flex items-center -space-x-2 overflow-hidden pl-1">
                      {workspace?.recent_members?.map((member) => (
                        <WorkspaceUserAvatar
                          key={member.id}
                          name={member.nickname}
                          avatarUrl={member.avatar_url}
                          className="inline-block h-8 w-8 ring-2 ring-background transition-transform hover:-translate-y-1"
                          fallbackClassName="bg-muted text-xs"
                        />
                      ))}
                      {workspace.member_count > 4 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-medium text-muted-foreground">
                          +{workspace.member_count - 4}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 p-6 mt-auto border-t bg-muted/5">
                    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground/80">
                          직무
                        </span>
                        <span>
                          {workspace.my_team_role?.trim() || "미설정"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground/80">
                          {isCompleted ? "종료일" : "최근 활동"}
                        </span>
                        <span>
                          {formatWorkspaceDate(
                            isCompleted
                              ? workspace.completed_at
                              : workspace.updated_at,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground/80">
                          생성일
                        </span>
                        <span>{formatWorkspaceDate(workspace.created_at)}</span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </Link>

              {/* Owner Actions - Positioned absolutely but outside the Link */}
              {workspace.my_role === "owner" && (
                <div className="absolute top-3 right-3 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted/80 bg-background/50 backdrop-blur-sm shadow-sm"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <EditWorkspaceDialog workspace={workspace}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Pencil className="mr-2 h-4 w-4" />
                          정보 수정
                        </DropdownMenuItem>
                      </EditWorkspaceDialog>

                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => setWorkspaceToDelete(workspace)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제하기
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}

        {visibleWorkspaces.length === 0 && (
          <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
            <p className="font-semibold">
              {searchQuery.trim()
                ? "검색 결과가 없습니다."
                : statusFilter === "completed"
                ? "종료된 워크스페이스가 없습니다."
                : statusFilter === "in_progress"
                  ? "진행 중인 워크스페이스가 없습니다."
                  : "참여 중인 워크스페이스가 없습니다."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "다른 검색어 또는 상태 필터로 다시 시도해보세요."
                : statusFilter === "completed"
                ? "종료한 팀 공간이 이곳에 표시됩니다."
                : "새 팀 공간을 만들거나 팀에 참여해보세요."}
            </p>
            {workspaceCounts.all === 0 &&
              !searchQuery.trim() &&
              statusFilter === "all" && (
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link href="/community/squad">팀원 모집 둘러보기</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Delete Alert Dialog */}
      <AlertDialog
        open={!!workspaceToDelete}
        onOpenChange={(open) => !open && setWorkspaceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>팀 공간을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{workspaceToDelete?.name}&apos; 팀 공간과 관련된 모든
              데이터(문서, 칸반 보드, 알림 등)가 영구적으로 삭제됩니다. 이
              작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deletingId === workspaceToDelete?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
