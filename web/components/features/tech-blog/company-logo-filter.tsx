"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Building2, Sparkles } from "lucide-react";

import { SearchBar } from "@/components/features/tech-blog/search-bar";
import { ViewToggle } from "@/components/features/tech-blog/view-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAvailableBlogs } from "@/lib/supabase";
import { getLogoUrl } from "@/lib/logos";
import { cn } from "@/lib/utils";

interface CompanyOption {
  author: string;
  blog_type: "company";
  category?: "FE" | "BE" | "AI" | "APP" | null;
}

interface CompanyLogoFilterProps {
  value: string;
  onChange: (value: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  viewMode: "gallery" | "list";
  onViewModeChange: (value: "gallery" | "list") => void;
  className?: string;
}

function CompanyMark({ company }: { company: CompanyOption }) {
  const logoUrl = getLogoUrl(company.author);

  return (
    <div className="flex h-16 w-36 shrink-0 items-center justify-center gap-2.5 rounded-2xl border border-border/35 bg-background/45 px-4 opacity-45 grayscale">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background/80">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            fill
            sizes="36px"
            className="object-contain p-1.5"
          />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <span className="truncate text-xs font-bold text-foreground/70">
        {company.author}
      </span>
    </div>
  );
}

export function CompanyLogoFilter({
  value,
  onChange,
  searchValue,
  onSearchChange,
  viewMode,
  onViewModeChange,
  className,
}: CompanyLogoFilterProps) {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCompanies = async () => {
      try {
        const { companies: nextCompanies } = await fetchAvailableBlogs();
        if (!cancelled) setCompanies(nextCompanies);
      } catch (error) {
        console.error("기업 목록 로드 실패:", error);
        if (!cancelled) setCompanies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/[0.04] via-muted/50 to-primary/[0.04] px-5 py-5">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background/95 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background/95 to-transparent" />
        <div className="relative z-20 mb-4 flex items-center gap-2 text-sm font-bold text-foreground/80">
          <Sparkles className="h-4 w-4 text-primary" />
          우리는 다양한 테크 기업의 기술 블로그를 한곳에 모아 소개합니다.
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-hidden" aria-label="기업 목록 불러오는 중">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-16 w-36 shrink-0 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden" aria-hidden="true">
            <div className="tech-company-marquee flex min-w-max">
              {[0, 1].map((setIndex) => (
                <div key={setIndex} className="flex gap-3 pr-3">
                  {companies.map((company) => (
                    <CompanyMark
                      key={`${setIndex}-${company.author}`}
                      company={company}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col items-stretch justify-end gap-3 md:flex-row md:items-center">
        <div className="w-full md:w-[320px]">
          <SearchBar
            value={searchValue}
            onChange={onSearchChange}
            placeholder="제목, 기업명 검색..."
          />
        </div>

        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            aria-label="기술 블로그 기업 선택"
            className="h-10 w-full rounded-xl bg-muted/50 md:w-[210px]"
          >
            <SelectValue placeholder="기업 선택" />
          </SelectTrigger>
          <SelectContent className="max-h-[360px]">
            <SelectItem value="all">전체 기업</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.author} value={company.author}>
                {company.author}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </div>
  );
}
