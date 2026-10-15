"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";

import { Input } from "@/components/ui/input";

interface CommunitySearchProps {
  placeholder: string;
}

export function CommunitySearch({ placeholder }: CommunitySearchProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const submittedSearchRef = useRef(urlSearch);

  useEffect(() => {
    if (urlSearch === submittedSearchRef.current) return;
    submittedSearchRef.current = urlSearch;
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();
    if (normalizedSearch === urlSearch) return;

    const params = new URLSearchParams(searchParams.toString());
    if (normalizedSearch) {
      params.set("search", normalizedSearch);
    } else {
      params.delete("search");
    }
    params.delete("page");

    const query = params.toString();
    submittedSearchRef.current = normalizedSearch;
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, pathname, router, searchParams, urlSearch]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 rounded-xl bg-muted/50 pl-9"
      />
    </div>
  );
}
