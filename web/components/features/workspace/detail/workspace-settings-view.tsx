"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle2, Loader2, Lock, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeTeamType, TEAM_TYPE_OPTIONS } from "@/lib/team-types";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "팀 공간 이름은 2글자 이상이어야 합니다.")
    .max(50),
  category: z.string().min(1, "유형을 선택해주세요."),
  description: z
    .string()
    .max(200, "설명은 200자 이내로 입력해주세요.")
    .optional(),
});

type WorkspaceResponse = {
  id: string;
  name: string;
  my_role?: string | null;
  read_only?: boolean;
  lifecycle_status?: "IN_PROGRESS" | "COMPLETED";
  completed_at?: string | null;
  result_type?: string | null;
  result_link?: string | null;
  result_note?: string | null;
  category?: string | null;
  description?: string | null;
  from_squad_id?: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch workspace");
  }
  return response.json() as Promise<WorkspaceResponse>;
};

export function WorkspaceSettingsView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [resultLink, setResultLink] = useState("");
  const [completionPeriod, setCompletionPeriod] = useState("");
  const [completionTags, setCompletionTags] = useState("");
  const [resultNote, setResultNote] = useState("");
  const { data, isLoading } = useSWR(`/api/workspaces/${projectId}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const workspaceName = data?.name ?? "";
  const canManageSettings = data?.my_role === "owner";
  const isCompleted =
    data?.lifecycle_status === "COMPLETED" || Boolean(data?.read_only);
  const canDelete =
    workspaceName.length > 0 && deleteConfirmName.trim() === workspaceName;
  const isSquadOrigin = Boolean(data?.from_squad_id);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: normalizeTeamType(undefined),
      description: "",
    },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
      name: data.name || "",
      category: normalizeTeamType(data.category),
      description: data.description || "",
    });
  }, [data, form]);

  useEffect(() => {
    if (!isLoading && data && !canManageSettings) {
      router.replace(`/workspace/${projectId}`);
    }
  }, [canManageSettings, data, isLoading, projectId, router]);

  useEffect(() => {
    if (!data) return;
    setResultLink(data.result_link || "");
    setResultNote(data.result_note || "");
  }, [data]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/workspaces/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "팀 공간 저장에 실패했습니다.");
      }

      toast.success("팀 공간 설정이 저장되었습니다.");
      void globalMutate(`/api/workspaces/${projectId}`);
      void globalMutate("/api/workspaces");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "팀 공간 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteWorkspace = async () => {
    if (isCompleted) return;
    try {
      setCompleting(true);
      const response = await fetch(`/api/workspaces/${projectId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultLink,
          periodLabel: completionPeriod,
          focusTags: completionTags,
          resultNote,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "팀 공간 종료에 실패했습니다.");
      }

      toast.success("팀 공간이 종료되어 읽기 전용 전환 및 커리어 후보 생성이 완료되었습니다.");
      setCompleteDialogOpen(false);
      void globalMutate(`/api/workspaces/${projectId}`);
      void globalMutate("/api/workspaces");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "팀 공간 종료 중 오류가 발생했습니다.",
      );
    } finally {
      setCompleting(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!canDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/workspaces/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.error || "팀 공간 삭제에 실패했습니다. 다시 시도해주세요.",
        );
      }

      toast.success("팀 공간이 삭제되었습니다.");
      setDeleteDialogOpen(false);
      setDeleteConfirmName("");
      void globalMutate("/api/workspaces");
      router.push("/workspace");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "팀 공간 삭제 중 오류가 발생했습니다.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">팀 공간 설정</h2>
          <Badge variant={isCompleted ? "secondary" : "outline"}>
            {isCompleted ? "종료" : "진행중"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          이름, 설명{isSquadOrigin ? "" : ", 유형"}을 이 탭에서 바로 관리할 수
          있습니다.
        </p>
        {isCompleted && (
          <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />이 팀 공간은 종료되어 읽기
            전용 상태입니다.
          </p>
        )}
      </div>

      <Separator />

      {isCompleted && (data?.result_type || data?.result_link || data?.result_note) && (
        <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              종료 결과
            </CardTitle>
            <CardDescription>
              이 팀 공간은 종료되었고 아래 내용으로 기록이 남아 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data?.result_type && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">결과 타입</span>
                <Badge variant="secondary">{data.result_type}</Badge>
              </div>
            )}
            {data?.result_note && (
              <p className="text-foreground leading-relaxed">{data.result_note}</p>
            )}
            {data?.result_link && (
              <a
                href={data.result_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-primary underline underline-offset-4"
              >
                GitHub 링크 열기
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-sm text-muted-foreground">
              설정 정보를 불러오는 중...
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="팀 공간 이름"
                          disabled={isCompleted}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isSquadOrigin && (
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>유형</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isCompleted}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="팀 공간 유형 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TEAM_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명 (선택)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="팀 공간 설명"
                          className="resize-none"
                          disabled={isCompleted}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving || isCompleted}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    저장하기
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm mt-8">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            팀 공간 관리
          </CardTitle>
          <CardDescription>
            팀 공간의 상태를 변경하거나 데이터를 영구적으로 삭제할 수
            있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">팀 공간 종료</h4>
              <p className="text-sm text-muted-foreground leading-snug">
                새로운 멤버를 초대할 수 없게 되며 읽기 전용으로 종료됩니다.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 h-9"
              disabled={isCompleted}
              onClick={() => setCompleteDialogOpen(true)}
            >
              {isCompleted ? "종료됨" : "종료"}
            </Button>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-destructive">
                팀 공간 삭제
              </h4>
              <p className="text-sm text-muted-foreground leading-snug">
                팀 공간과 관련된 모든 데이터가 삭제되며 되돌릴 수 없습니다.
              </p>
            </div>
            <Button
              variant="destructive"
              className="shrink-0 h-9"
              onClick={() => {
                setDeleteConfirmName("");
                setDeleteDialogOpen(true);
              }}
            >
              삭제
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={completeDialogOpen}
        onOpenChange={(open) => {
          setCompleteDialogOpen(open);
          if (!open && data) {
            setResultLink(data.result_link || "");
            setCompletionPeriod("");
            setCompletionTags("");
            setResultNote(data.result_note || "");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀 공간 종료</DialogTitle>
            <DialogDescription>
              종료하면 모든 쓰기 기능이 차단되고 읽기 전용으로 전환됩니다.
              입력한 진행 기간, 핵심 태그, 결과 메모는 참여자별 커리어관리 탭의
              경험 불러오기 후보 생성에 활용되어, 각자 경험 초안으로 바로 가져올 수
              있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resultLink">GitHub 링크 (선택)</Label>
              <Input
                id="resultLink"
                value={resultLink}
                onChange={(e) => setResultLink(e.target.value)}
                placeholder="https://... (예: GitHub 저장소)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completionPeriod">진행 기간 (커리어용, 선택)</Label>
              <div id="completionPeriod" className="rounded-lg border bg-muted/20 p-3">
                <MonthRangePicker
                  value={completionPeriod}
                  onChange={setCompletionPeriod}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="completionTags">핵심 태그 (커리어용, 선택)</Label>
              <Input
                id="completionTags"
                value={completionTags}
                onChange={(e) => setCompletionTags(e.target.value)}
                placeholder="예: React, 협업, 문제해결"
              />
              <p className="text-xs text-muted-foreground">
                쉼표(,)로 구분하면 커리어관리 경험 불러오기 후보 태그로 반영됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultNote">결과 메모 (선택)</Label>
              <Textarea
                id="resultNote"
                value={resultNote}
                onChange={(e) => setResultNote(e.target.value)}
                placeholder="종료 결과를 간단히 남겨주세요."
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                커리어관리에서 경험 불러오기 시 1줄 요약/결과 설명 초안으로 사용됩니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={completing}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleCompleteWorkspace}
              disabled={completing}
            >
              {completing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              종료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteConfirmName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀 공간 삭제</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 아래 안내를 확인하고 정확한
              팀 공간 이름을 입력해야 삭제가 가능합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              삭제하려면 팀 공간 이름{" "}
              <span className="font-bold">{workspaceName}</span>을(를) 정확히
              입력하세요.
            </p>
            <div className="space-y-2">
                <Input
                  value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="프로젝트 이름을 입력해 주세요"
                autoComplete="off"
              />
              {!canDelete && deleteConfirmName.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  입력한 이름이 팀 공간 이름과 일치하지 않습니다.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteWorkspace}
              disabled={!canDelete || deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
