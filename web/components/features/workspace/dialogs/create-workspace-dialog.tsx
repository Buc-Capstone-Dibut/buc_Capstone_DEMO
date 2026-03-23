"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth/auth-modal";

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

interface CreateWorkspaceDialogProps {
  children?: React.ReactNode;
  fromSquadId?: string;
}

export function CreateWorkspaceDialog({
  children,
  fromSquadId,
}: CreateWorkspaceDialogProps) {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: normalizeTeamType(undefined),
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!authLoading && !isAuthenticated) {
        toast.error("팀 공간 생성은 로그인 후 가능합니다.");
        setIsAuthModalOpen(true);
        return;
      }

      setLoading(true);
      const payload = {
        name: values.name,
        description: values.description,
        ...(fromSquadId ? {} : { category: values.category }),
        fromSquadId,
      };

      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.error ||
          (response.status === 401
            ? "로그인이 필요합니다."
            : "팀 공간 생성에 실패했습니다.");
        throw new Error(message);
      }

      const data = await response.json();

      toast.success("팀 공간이 생성되었습니다.");
      setOpen(false);
      form.reset({
        name: "",
        category: normalizeTeamType(undefined),
        description: "",
      });

      // Refresh list
      mutate("/api/workspaces");

      // Navigate to new workspace
      router.push(`/workspace/${data.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "오류가 발생했습니다.";
      toast.error(errorMessage);
      if (errorMessage.includes("로그인")) {
        setIsAuthModalOpen(true);
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen && !authLoading && !isAuthenticated) {
            toast.error("팀 공간 생성은 로그인 후 가능합니다.");
            setIsAuthModalOpen(true);
            return;
          }
          setOpen(nextOpen);
        }}
      >
        <DialogTrigger asChild>
          {children || (
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 새 팀 공간
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {fromSquadId ? "팀 공간 만들기" : "새 팀 공간 만들기"}
            </DialogTitle>
            <DialogDescription>
              {fromSquadId
                ? "팀 유형은 자동으로 이어지며 팀원들은 그대로 팀 공간에 연결됩니다."
                : "함께 협업할 새로운 팀 공간을 만듭니다."}
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
                    <Input
                      placeholder={
                        fromSquadId
                          ? "팀 이름 그대로 사용 가능"
                          : "예: 졸업작품 A팀"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!fromSquadId && (
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
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명 (선택)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="프로젝트에 대한 간단한 설명을 적어주세요."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fromSquadId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm text-blue-600 dark:text-blue-400">
                💡 <strong>팀 공간 안내</strong>
                <br />
                팀 유형은 자동으로 이어지고, 승인된 팀원은 별도 설정 없이 바로
                팀 공간에서 협업할 수 있습니다.
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {fromSquadId ? "팀 공간 만들기" : "팀 공간 만들기"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </DialogContent>
      </Dialog>
      <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </>
  );
}
