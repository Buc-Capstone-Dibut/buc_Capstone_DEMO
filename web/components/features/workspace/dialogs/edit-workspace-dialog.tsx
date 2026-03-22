"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface EditWorkspaceDialogProps {
  workspace: {
    id: string;
    name: string;
    description?: string;
    category?: string;
  };
  children?: React.ReactNode;
}

export function EditWorkspaceDialog({
  workspace,
  children,
}: EditWorkspaceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: workspace.name,
      category: normalizeTeamType(workspace.category),
      description: workspace.description || "",
    },
  });

  // Reset form when opening or workspace changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: workspace.name,
        category: normalizeTeamType(workspace.category),
        description: workspace.description || "",
      });
    }
  }, [open, workspace, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);

      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH", // Update
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("팀 공간 수정에 실패했습니다.");
      }

      toast.success("팀 공간 정보가 수정되었습니다.");
      setOpen(false);

      // Refresh data
      mutate("/api/workspaces");
      mutate(`/api/workspaces/${workspace.id}`);

      router.refresh();
    } catch (error) {
      toast.error("오류가 발생했습니다.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" /> 설정
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>팀 공간 설정</DialogTitle>
          <DialogDescription>
            팀 공간의 이름과 설명을 수정합니다.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="팀 공간 이름" {...field} />
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
                        <SelectValue placeholder="팀 공간 유형 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEAM_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                      placeholder="팀 공간 설명"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                저장하기
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
