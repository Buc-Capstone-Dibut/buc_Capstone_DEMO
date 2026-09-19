"use client";

import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useDebounce } from "use-debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RecruitSearchSortProps {
  recommendationTags?: string[];
}

export function RecruitSearchSort({
  recommendationTags = [],
}: RecruitSearchSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial States
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const sort = searchParams.get("sort") || "latest";

  // Debounce search input
  const [debouncedSearch] = useDebounce(searchTerm, 300);

  // Update URL on change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }

    params.delete("page");

    router.push(`?${params.toString()}`);
  }, [debouncedSearch, router, searchParams]);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "latest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center">
      <div className="relative w-full sm:w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="활동명, 주최기관 검색..."
          className="pl-9 h-10 rounded-xl bg-muted/50 border-none focus-visible:ring-1"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Select value={sort} onValueChange={handleSortChange}>
        <SelectTrigger aria-label="대외활동 정렬" className="h-10 w-full rounded-xl bg-muted/50 sm:w-[150px]">
          <SelectValue placeholder="정렬" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="latest">최신순</SelectItem>
          <SelectItem value="deadline">마감 임박순</SelectItem>
          <SelectItem value="name">가나다순</SelectItem>
          <SelectItem value="oldest">오래된순</SelectItem>
          <SelectItem value="recommended">맞춤 추천순</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.06] px-3 text-xs font-bold text-primary sm:w-auto">
        <Sparkles className="h-4 w-4" />
        <span>프로필 맞춤 추천</span>
        {recommendationTags.length > 0 ? (
          <span className="max-w-[150px] truncate text-[11px] font-medium text-muted-foreground">
            {recommendationTags.slice(0, 3).join(" · ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
