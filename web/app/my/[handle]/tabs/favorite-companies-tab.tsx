"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Search, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getLogoUrl } from "@/lib/logos";
import { fetchAvailableBlogs } from "@/lib/supabase";

interface CompanyOption {
  author: string;
}

export function FavoriteCompaniesTab() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [{ companies: available }, response] = await Promise.all([
          fetchAvailableBlogs(),
          fetch("/api/my/favorite-companies", { cache: "no-store" }),
        ]);
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
          throw new Error(json?.error || "관심 기업을 불러오지 못했습니다.");
        }
        if (!cancelled) {
          setCompanies(available);
          setFavorites(Array.isArray(json?.data?.companies) ? json.data.companies : []);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          toast({
            title: "관심 기업 불러오기 실패",
            description: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const filteredCompanies = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    if (!normalized) return companies;
    return companies.filter((company) =>
      company.author.toLocaleLowerCase("ko-KR").includes(normalized),
    );
  }, [companies, query]);

  const toggleFavorite = async (company: string) => {
    const previous = favorites;
    const next = favoriteSet.has(company)
      ? favorites.filter((item) => item !== company)
      : [...favorites, company];
    setFavorites(next);
    setSavingCompany(company);

    try {
      const response = await fetch("/api/my/favorite-companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companies: next }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "관심 기업을 저장하지 못했습니다.");
      }
      setFavorites(Array.isArray(json?.data?.companies) ? json.data.companies : next);
    } catch (error: unknown) {
      setFavorites(previous);
      toast({
        title: "관심 기업 저장 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setSavingCompany("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        기업 목록을 불러오는 중입니다.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">등록된 관심 기업 {favorites.length}곳</p>
          <p className="mt-1 text-xs text-muted-foreground">관심 기업을 등록하면 기술 블로그에서 해당 기업의 글만 모아 보여줍니다.</p>
        </div>
        {favorites.length > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link href="/insights/tech-blog">관심 기업 기술 블로그 보기</Link>
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="기업명 검색"
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredCompanies.map((company) => {
          const selected = favoriteSet.has(company.author);
          const logoUrl = getLogoUrl(company.author);
          return (
            <button
              key={company.author}
              type="button"
              onClick={() => void toggleFavorite(company.author)}
              disabled={Boolean(savingCompany)}
              aria-pressed={selected}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all disabled:opacity-60 ${
                selected ? "border-primary/40 bg-primary/[0.06]" : "hover:border-primary/25 hover:bg-muted/20"
              }`}
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background">
                {logoUrl ? (
                  <Image src={logoUrl} alt="" fill sizes="44px" className="object-contain p-1.5" />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{company.author}</span>
              {savingCompany === company.author ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Star className={`h-5 w-5 ${selected ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              )}
            </button>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="rounded-2xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
          검색 결과에 해당하는 기업이 없습니다.
        </div>
      )}
    </div>
  );
}
