"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Plus,
  MoreVertical,
  Trash2,
  Loader2,
  Pencil,
  ArrowRight,
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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const error: FetchError = new Error(
      errorBody?.error || "Failed to fetch",
    );
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
          팀 공간 조회/생성은 로그인 후 사용할 수 있습니다. 우측 상단의
          로그인 버튼으로 먼저 로그인해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">팀 공간</h2>
          <p className="text-muted-foreground">
            참여 중인 팀 공간 목록입니다.
          </p>
        </div>
        <Button
          asChild
          className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all gap-2"
        >
          <Link href="/community/squad">
            팀원 모집 보러가기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="relative group">
          <Link
            href="/workspace/p-2"
            className="block h-full"
          >
            <Card className="hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col relative overflow-hidden bg-card group shadow-sm hover:shadow-md">
              {/* Demo Project Actions */}
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
                    <EditWorkspaceDialog workspace={{ id: 'demo', name: 'Dibut 사이드 프로젝트', category: 'Demo Project', description: '개발자 커리어 플랫폼 클론 코딩 및 협업 도구 시연 프로젝트입니다.' }}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Pencil className="mr-2 h-4 w-4" />
                        정보 수정
                      </DropdownMenuItem>
                    </EditWorkspaceDialog>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.error("데모 프로젝트는 삭제할 수 없습니다.");
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제하기
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardHeader className="pb-3 space-y-3 pr-12">
                <div className="flex justify-between items-center">
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  >
                    {getTeamTypeLabel("Demo Project")}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="rounded-md px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  >
                    진행중
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                    Dibut 사이드 프로젝트
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-sm text-muted-foreground h-10">
                    개발자 커리어 플랫폼 클론 코딩 및 협업 도구 시연 프로젝트입니다.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="pb-4">
                <div className="flex items-center -space-x-2 overflow-hidden pl-1">
                  <WorkspaceUserAvatar
                    name="Junghwan"
                    className="h-8 w-8 ring-2 ring-background"
                    fallbackClassName="bg-muted text-xs"
                  />
                  <WorkspaceUserAvatar
                    name="Frontend"
                    className="h-8 w-8 ring-2 ring-background"
                    fallbackClassName="bg-muted text-xs"
                  />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-medium text-muted-foreground">
                    +1
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0 p-6 mt-auto border-t bg-muted/5">
                <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground/80">직무</span>
                    <span>프론트엔드</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground/80">최근 활동</span>
                    <span>방금 전</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground/80">생성일</span>
                    <span>데모</span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </Link>
        </div>

        {Array.isArray(workspaces) &&
          workspaces.map((workspace) => (
            <div key={workspace.id} className="relative group">
              <Link
                href={`/workspace/${workspace.id}`}
                className="block h-full"
              >
                <Card className="hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col relative overflow-hidden bg-card group shadow-sm hover:shadow-md">
                  <CardHeader
                    className={`pb-3 space-y-3 ${
                      workspace.my_role === "owner" ? "pr-12" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider"
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
                      <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
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
                        <span className="font-medium text-foreground/80">직무</span>
                        <span>{workspace.my_team_role?.trim() || "미설정"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground/80">최근 활동</span>
                        <span>{formatWorkspaceDate(workspace.updated_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground/80">생성일</span>
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
          ))}

        {/* New Team Space Placeholder */}
        <CreateWorkspaceDialog>
          <button className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-muted/30 transition-all h-full min-h-[250px]">
            <div className="h-14 w-14 rounded-full bg-muted group-hover:bg-background flex items-center justify-center shadow-sm">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-center">
              <span className="font-semibold block text-lg">
                새 팀 공간 만들기
              </span>
              <span className="text-sm opacity-70 mt-1 block">
                팀원을 초대하고 협업을 시작하세요
              </span>
            </div>
          </button>
        </CreateWorkspaceDialog>
      </div>

      {/* Delete Alert Dialog */}
      <AlertDialog
        open={!!workspaceToDelete}
        onOpenChange={(open) => !open && setWorkspaceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              팀 공간을 삭제하시겠습니까?
            </AlertDialogTitle>
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
    </div >
  );
}
