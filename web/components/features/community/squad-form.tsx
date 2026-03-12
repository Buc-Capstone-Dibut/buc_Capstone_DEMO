"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSquad } from "@/lib/actions/community";
import { testServerAction } from "@/lib/actions/test";
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
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

// Dynamic import for Editor
const MarkdownEditor = dynamic(
  () => import("@/components/shared/markdown-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center bg-muted/20">
        에디터 로딩 중...
      </div>
    ),
  },
);

interface SquadFormProps {
  initialData?: {
    id: string;
    title: string;
    content: string;
    type: string;
    capacity: number;
    place_type: "online" | "offline" | "hybrid";
    location?: string;
    tech_stack: string[];
    recruitment_period?: string;
    activity_id?: string;
    activity_title?: string;
  };
}

export default function SquadForm({ initialData }: SquadFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityId = initialData?.activity_id || searchParams.get("activityId");
  const activityTitle =
    initialData?.activity_title || searchParams.get("activityTitle");

  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(initialData?.content || "");
  const [placeType, setPlaceType] = useState(
    initialData?.place_type || "online",
  );
  const [date, setDate] = useState<Date | undefined>(
    initialData?.recruitment_period ? new Date(initialData.recruitment_period) : undefined,
  );

  // Tag Managment
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialData?.tech_stack || []);
  const [noTechStack, setNoTechStack] = useState(false);
  const { user } = useAuth({ loadProfile: false }); // Get user from auth hook

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, "");
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Ref for form
  const formRef = useRef<HTMLFormElement>(null);

  const handleManualSubmit = async () => {
    try {
      if (!formRef.current) return;

      const formData = new FormData(formRef.current);
      const titleVal = formData.get("title");
      const capacityVal = formData.get("capacity");
      const locationVal = formData.get("location");

      // Validation
      const missingFields = [];
      if (!titleVal) missingFields.push("제목");
      if (!content) missingFields.push("상세 내용");
      if (placeType !== "online" && !locationVal)
        missingFields.push("주 활동 지역");

      if (missingFields.length > 0) {
        toast.error(`다음 항목을 확인해주세요: ${missingFields.join(", ")}`);
        return;
      }

      const capacityNum = Number(capacityVal);
      if (isNaN(capacityNum) || capacityNum < 2 || capacityNum > 20) {
        toast.error("모집 인원은 2명 이상 20명 이하로 설정해주세요.");
        return;
      }

      if (!user?.id) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      setLoading(true);

      const payload = {
        title: titleVal,
        content,
        type: "general",
        capacity: capacityVal,
        tech_stack: noTechStack ? [] : tags,
        place_type: placeType,
        location: locationVal,
        recruitment_period: date ? format(date, "yyyy-MM-dd") : null,
        activity_id: activityId,
        user_id: user.id,
      };

      const isEdit = !!initialData?.id;
      const url = isEdit ? `/api/squads/${initialData.id}` : "/api/squads";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "작성 중 오류가 발생했습니다.");
        setLoading(false);
      } else {
        toast.success(
          isEdit ? "모집글이 수정되었습니다." : "모집글이 등록되었습니다.",
        );
        router.push(`/community/squad/${isEdit ? initialData.id : result.id}`);
        router.refresh();
      }
    } catch (e: any) {
      console.error(e);
      toast.error("전송 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <form
      ref={formRef}
      className="space-y-8 max-w-4xl mx-auto"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Activity Context Banner */}
      {activityId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
          <div className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-bold">
            연동됨
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {activityTitle || "대외활동"} 팀원 모집
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              이 모집글은 해당 활동 페이지에도 노출됩니다.
            </p>
          </div>
        </div>
      )}

      {/* Basic Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-2">
          <Label htmlFor="recruitment_period">모집 기간</Label>
          <div className="flex flex-col gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="recruitment_period"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ko }) : <span>날짜를 선택하세요 (상시 모집 시 비워둠)</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-[0.75rem] text-muted-foreground leading-none px-1">
              * 미선택 시 '상시 모집'으로 표시됩니다.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">모집 인원 (본인 포함)</Label>
          <Input
            id="capacity"
            type="number"
            name="capacity"
            className="h-10"
            defaultValue={initialData?.capacity || 4}
            min={2}
            max={20}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="place_type">진행 방식</Label>
          <Select
            value={placeType}
            onValueChange={(val: any) => setPlaceType(val)}
            name="place_type"
          >
            <SelectTrigger>
              <SelectValue placeholder="방식 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">온라인</SelectItem>
              <SelectItem value="offline">오프라인</SelectItem>
              <SelectItem value="hybrid">온/오프라인 혼합</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">
            {placeType === "online" ? "참고 사항 (선택)" : "주 활동 지역"}
          </Label>
          <Input
            name="location"
            defaultValue={initialData?.location || ""}
            placeholder={
              placeType === "online"
                ? "예: 디스코드, 게더타운"
                : "예: 강남역, 판교 등"
            }
          />
        </div>
      </div>

      {/* Tech Stack Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>기술 스택 / 키워드</Label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="noTech"
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={noTechStack}
              onChange={(e) => {
                setNoTechStack(e.target.checked);
                if (e.target.checked) setTags([]);
              }}
            />
            <Label
              htmlFor="noTech"
              className="text-sm font-normal cursor-pointer text-muted-foreground"
            >
              언어/기술 무관
            </Label>
          </div>
        </div>

        <div
          className={`border rounded-md px-3 py-2 bg-background focus-within:ring-2 focus-within:ring-primary/20 flex flex-wrap gap-2 min-h-[42px] ${noTechStack ? "opacity-50 cursor-not-allowed bg-muted" : ""
            }`}
        >
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1.5 animate-in fade-in zoom-in-50 duration-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            disabled={noTechStack}
            className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] disabled:cursor-not-allowed"
            placeholder={
              noTechStack
                ? "기술 무관이 선택되었습니다."
                : tags.length === 0
                  ? "기술 스택을 입력하고 엔터를 누르세요 (예: React, Java)"
                  : "태그 추가..."
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initialData?.title || ""}
          placeholder="모집글 제목을 입력하세요"
          required
          className="text-lg font-medium"
        />
      </div>

      <div className="space-y-2">
        <Label>상세 내용</Label>
        <div className="border rounded-lg min-h-[400px] bg-card shadow-sm p-4 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <MarkdownEditor
            onChange={setContent}
            className="min-h-[400px]"
            initialContent={
              initialData?.content ||
              `
### 1. 프로젝트/스터디 소개
어떤 주제로 무엇을 만들거나 공부하는지 알려주세요.

### 2. 모집 대상
원하는 팀원의 역할이나 자격 요건을 적어주세요.

### 3. 진행 방식
예상 일정, 회의 주기, 사용 툴 등을 적어주세요.
`
            }
          />
        </div>
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
        {/* Manual submit handler */}
        <Button type="button" onClick={handleManualSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "수정 완료" : "작성 완료"}
        </Button>
      </div>
    </form>
  );
}
