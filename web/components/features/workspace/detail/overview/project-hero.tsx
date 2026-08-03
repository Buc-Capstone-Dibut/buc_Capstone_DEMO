"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Check,
  FileText,
  ImagePlus,
  KanbanSquare,
  Loader2,
  Pencil,
  Settings,
  Trophy,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { getTeamTypeLabel } from "@/lib/team-types";

type ProjectContext = {
  team_type_label?: string | null;
  headline?: string | null;
  summary?: string | null;
  activity?: {
    title?: string | null;
    date?: string | null;
  } | null;
};

type HeroProject = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  my_role?: string | null;
  cover_image_url?: string | null;
  lifecycle_status?: "IN_PROGRESS" | "COMPLETED";
  project_context?: ProjectContext | null;
};

interface ProjectHeroProps {
  project: HeroProject | null | undefined;
}

export function ProjectHero({ project }: ProjectHeroProps) {
  const router = useRouter();
  const isOwner = project?.my_role === "owner";
  const context = project?.project_context;
  const [description, setDescription] = useState(project?.description || "");
  const [draftDescription, setDraftDescription] = useState(description);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    project?.cover_image_url || null,
  );
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const categoryLabel =
    context?.team_type_label || getTeamTypeLabel(project?.category);

  useEffect(() => {
    const nextDescription = project?.description || "";
    setDescription(nextDescription);
    setDraftDescription(nextDescription);
    setCoverImageUrl(project?.cover_image_url || null);
  }, [project?.cover_image_url, project?.description]);

  if (!project) return null;

  const descriptionText =
    description || context?.headline || "팀 공간 설명이 아직 없습니다.";
  const saveDescription = async () => {
    const nextDescription = draftDescription.trim();
    if (nextDescription === description) {
      setIsEditingDescription(false);
      return;
    }

    setIsSavingDescription(true);
    try {
      const response = await fetch(`/api/workspaces/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          category: project.category || "project",
          description: nextDescription,
        }),
      });
      if (!response.ok) throw new Error("설명을 저장하지 못했습니다.");

      setDescription(nextDescription);
      setIsEditingDescription(false);
      await Promise.all([
        mutate(`/api/workspaces/${project.id}`),
        mutate("/api/workspaces"),
      ]);
      toast.success("프로젝트 설명을 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "설명을 저장하지 못했습니다.",
      );
    } finally {
      setIsSavingDescription(false);
    }
  };

  const uploadCover = async (file: File | undefined) => {
    if (!file) return;
    if (
      !new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      toast.error("JPG, PNG, WebP 형식의 5MB 이하 이미지만 업로드할 수 있습니다.");
      return;
    }

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`/api/workspaces/${project.id}/cover`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "대표이미지를 업로드하지 못했습니다.");
      }

      setCoverImageUrl(result.coverImageUrl || null);
      await Promise.all([
        mutate(`/api/workspaces/${project.id}`),
        mutate("/api/workspaces"),
      ]);
      toast.success("프로젝트 대표이미지를 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "대표이미지를 업로드하지 못했습니다.",
      );
    } finally {
      setIsUploadingCover(false);
    }
  };

  return (
    <Card className="group/hero relative isolate overflow-hidden border bg-background shadow-sm">
      <div className="absolute inset-y-0 right-0 hidden w-[58%] lg:block">
        {coverImageUrl ? (
          // The workspace cover can be a Supabase public asset from any project-specific URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={`${project.name} 대표 이미지`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-8 text-center text-slate-400">
            <ImagePlus className="h-8 w-8" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              프로젝트 대표 이미지
            </p>
            <p className="mt-1 max-w-[15rem] text-xs leading-5">
              프로젝트의 분위기와 결과물을 한 장으로 남겨보세요.
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-background/80 to-background" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/30 to-transparent" />
      </div>
      <CardContent className="relative z-10 min-h-[250px] p-6 md:p-8">
        <div className="max-w-2xl space-y-5 lg:max-w-[62%]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/20 bg-background text-primary"
            >
              {categoryLabel}
            </Badge>
            {context?.activity?.title && (
              <Badge
                variant="outline"
                className="max-w-full gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              >
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{context.activity.title}</span>
              </Badge>
            )}
            {project.lifecycle_status === "COMPLETED" && (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                완료된 프로젝트
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {project.name}
            </h1>
            <div className="group/description relative pl-6">
              {isEditingDescription ? (
                <div className="flex items-start gap-2">
                  <textarea
                    aria-label="프로젝트 설명"
                    autoFocus
                    maxLength={200}
                    value={draftDescription}
                    onChange={(event) =>
                      setDraftDescription(event.target.value)
                    }
                    className="min-h-[76px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-lg leading-relaxed text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={isSavingDescription}
                      onClick={saveDescription}
                      aria-label="프로젝트 설명 저장"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={isSavingDescription}
                      onClick={() => {
                        setDraftDescription(description);
                        setIsEditingDescription(false);
                      }}
                      aria-label="프로젝트 설명 편집 취소"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    {descriptionText}
                  </p>
                  {isOwner ? (
                    <button
                      type="button"
                      className="absolute left-0 top-0.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/description:opacity-100"
                      onClick={() => setIsEditingDescription(true)}
                      aria-label="프로젝트 설명 편집"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
              <Button
                className="rounded-full shadow-sm"
                onClick={() =>
                  router.push(`/workspace/${project.id}?tab=board`)
                }
              >
                <KanbanSquare className="mr-2 h-4 w-4" />
                보드로 이동
              </Button>
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => router.push(`/workspace/${project.id}?tab=docs`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                문서 열기
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  router.push(`/workspace/${project.id}?tab=schedule`)
                }
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                일정 보기
              </Button>
              {isOwner && (
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    router.push(`/workspace/${project.id}?tab=settings`)
                  }
                >
                  <Settings className="mr-2 h-4 w-4" />
                  설정
                </Button>
              )}
          </div>
        </div>
        {isOwner ? (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="absolute bottom-2 right-2 bg-white/90 text-xs opacity-0 shadow-sm transition-opacity hover:bg-white focus-within:opacity-100 group-hover/hero:opacity-100"
            disabled={isUploadingCover}
          >
            <label className="cursor-pointer">
              {isUploadingCover ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isUploadingCover
                ? "업로드 중"
                : coverImageUrl
                  ? "이미지 변경"
                  : "이미지 설정"}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploadingCover}
                onChange={(event) => void uploadCover(event.target.files?.[0])}
              />
            </label>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
