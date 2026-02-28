"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "워크스페이스 이름은 2글자 이상이어야 합니다.")
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
  category?: string | null;
  description?: string | null;
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
  const { data, isLoading } = useSWR(`/api/workspaces/${projectId}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const workspaceName = data?.name ?? "";
  const canManageSettings = data?.my_role === "owner";
  const canDelete =
    workspaceName.length > 0 && deleteConfirmName.trim() === workspaceName;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "Side Project",
      description: "",
    },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
      name: data.name || "",
      category: data.category || "Side Project",
      description: data.description || "",
    });
  }, [data, form]);

  useEffect(() => {
    if (!isLoading && data && !canManageSettings) {
      router.replace(`/workspace/${projectId}`);
    }
  }, [canManageSettings, data, isLoading, projectId, router]);

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
        throw new Error(data.error || "워크스페이스 저장에 실패했습니다.");
      }

      toast.success("워크스페이스 설정이 저장되었습니다.");
      void globalMutate(`/api/workspaces/${projectId}`);
      void globalMutate("/api/workspaces");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "워크스페이스 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
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
          result.error || "워크스페이스 삭제에 실패했습니다. 다시 시도해주세요.",
        );
      }

      toast.success("워크스페이스가 삭제되었습니다.");
      setDeleteDialogOpen(false);
      setDeleteConfirmName("");
      void globalMutate("/api/workspaces");
      router.push("/workspace");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "워크스페이스 삭제 중 오류가 발생했습니다.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-semibold">워크스페이스 설정</h2>
        <p className="text-sm text-muted-foreground mt-1">
          이름, 유형, 설명을 이 탭에서 바로 관리할 수 있습니다.
        </p>
      </div>

      <Separator />

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
                        <Input placeholder="워크스페이스 이름" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>유형</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="워크스페이스 유형 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Side Project">
                            사이드 프로젝트
                          </SelectItem>
                          <SelectItem value="Startup">스타트업</SelectItem>
                          <SelectItem value="Competition">
                            공모전/대회
                          </SelectItem>
                          <SelectItem value="School">학교/동아리</SelectItem>
                          <SelectItem value="Personal">개인용</SelectItem>
                          <SelectItem value="Enterprise">기업</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명 (선택)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="프로젝트 설명"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
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
            워크스페이스 관리
          </CardTitle>
          <CardDescription>
            워크스페이스의 상태를 변경하거나 데이터를 영구적으로 삭제할 수
            있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">워크스페이스 종료</h4>
              <p className="text-sm text-muted-foreground leading-snug">
                새로운 멤버를 초대할 수 없게 되며 읽기 전용으로 종료됩니다.
              </p>
            </div>
            <Button variant="outline" className="shrink-0 h-9">
              종료
            </Button>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-destructive">
                워크스페이스 삭제
              </h4>
              <p className="text-sm text-muted-foreground leading-snug">
                워크스페이스와 관련된 모든 데이터가 삭제되며 되돌릴 수 없습니다.
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
            <DialogTitle>워크스페이스 삭제</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 아래 안내를 확인하고 정확한
              워크스페이스 이름을 입력해야 삭제가 가능합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              삭제하려면 워크스페이스 이름{" "}
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
                  입력한 이름이 워크스페이스 이름과 일치하지 않습니다.
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
