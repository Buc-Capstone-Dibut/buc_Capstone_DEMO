"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Plus,
  Clock,
  Users,
  MoreVertical,
  Trash2,
  Loader2,
  Trophy,
  CheckCircle2,
  ArrowRight,
  Search,
  Settings,
  Pencil,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  my_role: string;
  member_count: number;
  recent_members?: {
    id: string;
    avatar_url: string | null;
    nickname: string | null;
  }[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch");
  }
  return res.json();
};

export function ProjectList() {
  const {
    data: workspaces,
    error,
    isLoading,
    mutate,
  } = useSWR<Workspace[]>("/api/workspaces", fetcher);
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
        throw new Error("워크스페이스 삭제 실패");
      }

      toast.success("워크스페이스가 삭제되었습니다.");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">워크스페이스</h2>
          <p className="text-muted-foreground">
            참여 중인 프로젝트 목록입니다.
          </p>
        </div>
        <CreateWorkspaceDialog>
          <Button className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all gap-2">
            <Plus className="w-5 h-5" /> 프로젝트 추가
          </Button>
        </CreateWorkspaceDialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="relative group">
          <Link
            href="/workspace/p-2"
            className="block h-full"
          >
            <Card className="hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col relative overflow-hidden bg-card group shadow-sm hover:shadow-md">
              {/* Demo Project Actions */}
              <div className="absolute top-4 right-4 z-20">
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

              <CardHeader className="pb-3 space-y-3">
                <div className="flex justify-between items-center">
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Demo Project
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
                  <Avatar className="h-8 w-8 ring-2 ring-background">
                    <AvatarFallback className="bg-muted text-xs">J</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 ring-2 ring-background">
                    <AvatarFallback className="bg-muted text-xs">F</AvatarFallback>
                  </Avatar>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-medium text-muted-foreground">
                    +1
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0 p-6 mt-auto border-t bg-muted/5 flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Active now
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
                  <CardHeader className="pb-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider"
                      >
                        {workspace.category || "Side Project"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                        {workspace.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-sm text-muted-foreground h-10">
                        {workspace.description ||
                          "프로젝트에 대한 설명이 없습니다."}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    <div className="flex items-center -space-x-2 overflow-hidden pl-1">
                      {workspace?.recent_members?.map((member) => (
                        <Avatar
                          key={member.id}
                          className="inline-block h-8 w-8 ring-2 ring-background transition-transform hover:-translate-y-1"
                        >
                          <AvatarImage src={member.avatar_url || ""} />
                          <AvatarFallback className="bg-muted text-xs">
                            {member.nickname?.slice(0, 1) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {workspace.member_count > 4 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-medium text-muted-foreground">
                          +{workspace.member_count - 4}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 p-6 mt-auto border-t bg-muted/5 flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDistanceToNow(new Date(workspace.updated_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </div>
                    <div className="text-xs font-medium text-orange-500">
                      {workspace.my_role === "owner" ? "Owner" : "Member"}
                    </div>
                  </CardFooter>
                </Card>
              </Link>

              {/* Owner Actions - Positioned absolutely but outside the Link */}
              {workspace.my_role === "owner" && (
                <div className="absolute top-4 right-4 z-20">
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

        {/* New Project Placeholder */}
        <CreateWorkspaceDialog>
          <button className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-muted/30 transition-all h-full min-h-[250px]">
            <div className="h-14 w-14 rounded-full bg-muted group-hover:bg-background flex items-center justify-center shadow-sm">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-center">
              <span className="font-semibold block text-lg">
                새 프로젝트 만들기
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
              워크스페이스를 삭제하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              '{workspaceToDelete?.name}' 워크스페이스와 관련된 모든
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
