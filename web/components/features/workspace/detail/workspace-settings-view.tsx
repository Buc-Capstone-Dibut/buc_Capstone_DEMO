"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useSWR(`/api/workspaces/${projectId}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">워크스페이스 설정</h2>
        <p className="text-sm text-muted-foreground">
          이름, 유형, 설명을 이 탭에서 바로 관리할 수 있습니다.
        </p>
      </div>

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
    </div>
  );
}
