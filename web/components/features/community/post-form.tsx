"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/lib/actions/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import for Editor to avoid SSR "window is not defined" error
const MarkdownEditor = dynamic(
  () => import("@/components/shared/markdown-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[500px] flex items-center justify-center bg-muted/20">
        에디터 로딩 중...
      </div>
    ),
  },
);
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface PostFormProps {
  initialData?: {
    id: string;
    title: string;
    content: string;
    category: string;
    tags?: string[];
  };
}

export default function PostForm({ initialData }: PostFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(initialData?.content || "");
  const [category, setCategory] = useState(initialData?.category || "");

  const { user } = useAuth({ loadProfile: false });

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent reload absolutely

    const formData = new FormData(e.currentTarget);
    const titleVal = formData.get("title");

    // Validation
    const missingFields = [];
    if (!titleVal) missingFields.push("제목");
    if (!category) missingFields.push("카테고리");
    if (!content.trim()) missingFields.push("내용");

    if (missingFields.length > 0) {
      toast.error(`다음 항목을 확인해주세요: ${missingFields.join(", ")}`);
      return;
    }

    if (!user?.id) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setLoading(true);

    // Prepare API Payload
    const payload = {
      title: titleVal,
      content,
      category,
      tags: [], // Basic implementation for now
      user_id: user.id,
    };

    try {
      const isEdit = !!initialData?.id;
      const url = isEdit ? `/api/posts/${initialData.id}` : "/api/posts";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error);
        setLoading(false);
      } else {
        toast.success(
          isEdit ? "게시글이 수정되었습니다." : "게시글이 작성되었습니다.",
        );
        router.push(`/community/board/${isEdit ? initialData.id : result.id}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("전송 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <Label htmlFor="category">카테고리</Label>
        <Select name="category" onValueChange={setCategory} value={category}>
          <SelectTrigger>
            <SelectValue placeholder="카테고리를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="qna">Q&A (질문답변)</SelectItem>
            <SelectItem value="tech">Tech 토론</SelectItem>
            <SelectItem value="codereview">코드 리뷰</SelectItem>
            <SelectItem value="showcase">프로젝트 자랑</SelectItem>
            <SelectItem value="daily">잡담</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initialData?.title || ""}
          placeholder="제목을 입력하세요 (예: React Query 캐싱 질문있습니다)"
          className="text-lg font-medium"
        />
      </div>

      <div className="space-y-2">
        <Label>내용</Label>
        <div className="border rounded-lg min-h-[500px] bg-card shadow-sm p-4 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <MarkdownEditor
            onChange={setContent}
            className="min-h-[500px]"
            initialContent={initialData?.content}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Markdown 문법을 지원합니다. 슬래시(/)를 입력하여 메뉴를 호출하세요.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          취소
        </Button>
        <Button type="submit" disabled={loading || !content}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "수정 완료" : "작성 완료"}
        </Button>
      </div>
    </form>
  );
}
