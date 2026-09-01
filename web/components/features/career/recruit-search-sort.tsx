"use client";

import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useDebounce } from "use-debounce";

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

    params.delete("sort");
    params.delete("page");

    router.push(`?${params.toString()}`);
  }, [debouncedSearch, router, searchParams]);

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
