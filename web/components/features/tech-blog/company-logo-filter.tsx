"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Building2, Globe } from "lucide-react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  className?: string;
}

export function CompanyLogoFilter({
  value,
  onChange,
  className,
}: CompanyLogoFilterProps) {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCompanies = async () => {
      try {
        const { companies: nextCompanies } = await fetchAvailableBlogs();
        if (!cancelled) {
          setCompanies(nextCompanies);
        }
      } catch (error) {
        console.error("기업 로고 필터 로드 실패:", error);
        if (!cancelled) {
          setCompanies([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCompanies();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border/50 bg-background/70 p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">기업별 보기</h2>
          <p className="text-xs text-muted-foreground">
            로고를 클릭하면 해당 기업 글만 표시됩니다.
          </p>
        </div>
        <div className="text-xs font-medium text-muted-foreground">
          {value === "all" ? "전체 기업" : value}
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-[84px] w-[72px] shrink-0 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      ) : (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex min-w-max gap-3 pb-3">
            <button
              type="button"
              onClick={() => onChange("all")}
              aria-pressed={value === "all"}
              className={cn(
                "flex h-[84px] w-[72px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border transition-colors",
                value === "all"
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              title="전체 기업 보기"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Globe className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium">전체</span>
            </button>

            {companies.map((company) => {
              const logoUrl = getLogoUrl(company.author);
              const isSelected = value === company.author;

              return (
                <button
                  key={company.author}
                  type="button"
                  onClick={() => onChange(isSelected ? "all" : company.author)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex h-[84px] w-[72px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border px-2 transition-colors",
                    isSelected
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                  title={`${company.author} 글만 보기`}
                >
                  <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={company.author}
                        fill
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <span className="w-full truncate text-[11px] font-medium">
                    {company.author}
                  </span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
