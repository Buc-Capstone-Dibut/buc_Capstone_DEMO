"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "use-debounce";

export function ActivitySearchSort() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initial States
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [sort, setSort] = useState(searchParams.get("sort") || "latest");

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

    if (sort && sort !== "latest") {
      params.set("sort", sort);
    } else {
      params.delete("sort");
    }

    params.delete("page");

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [debouncedSearch, sort, pathname, router, searchParams]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center">
      <div className="relative w-full sm:w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="행사명, 주최 검색..."
          className="pl-9 h-10 rounded-xl bg-muted/50 border-none focus-visible:ring-1"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-10 w-full sm:w-[130px] rounded-xl bg-muted/50 border-none">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="deadline">마감임박순</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export const RecruitSearchSort = ActivitySearchSort;
