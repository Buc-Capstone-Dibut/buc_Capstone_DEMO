"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Plus, Search, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getLogoUrl } from "@/lib/logos";
import { fetchAvailableBlogs } from "@/lib/supabase";

interface CompanyOption {
  author: string;
}

const MAX_FAVORITE_COMPANIES = 50;

export function FavoriteCompaniesTab() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftCompanies, setDraftCompanies] = useState<string[]>([]);
  const [savingAdditions, setSavingAdditions] = useState(false);

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
  const draftSet = useMemo(() => new Set(draftCompanies), [draftCompanies]);
  const filteredAvailableCompanies = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    return companies.filter((company) => {
      if (favoriteSet.has(company.author)) return false;
      return !normalized ||
        company.author.toLocaleLowerCase("ko-KR").includes(normalized);
    });
  }, [companies, favoriteSet, query]);

  const removeFavorite = async (company: string) => {
    const previous = favorites;
    const next = favorites.filter((item) => item !== company);
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

  const handleDialogOpenChange = (open: boolean) => {
    if (savingAdditions) return;
    setDialogOpen(open);
    setQuery("");
    setDraftCompanies([]);
  };

  const toggleDraftCompany = (company: string) => {
    if (draftSet.has(company)) {
      setDraftCompanies((current) => current.filter((item) => item !== company));
      return;
    }

    if (favorites.length + draftCompanies.length >= MAX_FAVORITE_COMPANIES) {
      toast({
        title: "관심 기업은 최대 50곳까지 등록할 수 있습니다.",
      });
      return;
    }
    setDraftCompanies((current) => [...current, company]);
  };

  const addSelectedCompanies = async () => {
    if (draftCompanies.length === 0 || savingAdditions) return;

    const next = [...favorites, ...draftCompanies];
    setSavingAdditions(true);
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
      setDialogOpen(false);
      setQuery("");
      setDraftCompanies([]);
    } catch (error: unknown) {
      toast({
        title: "관심 기업 추가 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setSavingAdditions(false);
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
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">등록된 관심 기업 {favorites.length}곳</p>
            <p className="mt-1 text-xs text-muted-foreground">관심 기업을 등록하면 기술 블로그에서 해당 기업의 글만 모아 보여줍니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {favorites.length > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/insights/tech-blog">관심 기업 기술 블로그 보기</Link>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => handleDialogOpenChange(true)}
              disabled={favorites.length >= MAX_FAVORITE_COMPANIES}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              관심 기업 추가
            </Button>
          </div>
        </div>

        {favorites.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((company) => {
              const logoUrl = getLogoUrl(company);
              return (
                <div
                  key={company}
                  className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/[0.06] p-4"
                >
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="" fill sizes="44px" className="object-contain p-1.5" />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{company}</span>
                  <button
                    type="button"
                    onClick={() => void removeFavorite(company)}
                    disabled={Boolean(savingCompany)}
                    aria-label={`${company} 관심 기업 해제`}
                    title="관심 기업 해제"
                    className="rounded-full p-2 text-primary transition-colors hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60"
                  >
                    {savingCompany === company ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Star className="h-5 w-5 fill-current" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/10 px-5 py-10 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Star className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold">아직 등록한 관심 기업이 없습니다.</p>
            <p className="mt-1 text-xs text-muted-foreground">관심 있는 기업을 추가하고 기술 블로그 글을 모아보세요.</p>
            <Button className="mt-5" size="sm" onClick={() => handleDialogOpenChange(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              첫 관심 기업 추가하기
            </Button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-6 py-5 pr-12">
            <DialogTitle>관심 기업 추가</DialogTitle>
            <DialogDescription>
              관심 있는 기업을 여러 곳 선택한 뒤 한 번에 추가할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="기업명 검색"
                className="pl-9"
                autoFocus
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {draftCompanies.length > 0
                ? `${draftCompanies.length}곳 선택됨 · 등록 후 총 ${favorites.length + draftCompanies.length}곳`
                : `추가할 기업을 선택해 주세요. · 최대 ${MAX_FAVORITE_COMPANIES}곳`}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {filteredAvailableCompanies.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredAvailableCompanies.map((company) => {
                  const selected = draftSet.has(company.author);
                  const logoUrl = getLogoUrl(company.author);
                  return (
                    <button
                      key={company.author}
                      type="button"
                      onClick={() => toggleDraftCompany(company.author)}
                      disabled={savingAdditions}
                      aria-pressed={selected}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all disabled:opacity-60 ${
                        selected ? "border-primary/40 bg-primary/[0.06]" : "hover:border-primary/25 hover:bg-muted/20"
                      }`}
                    >
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background">
                        {logoUrl ? (
                          <Image src={logoUrl} alt="" fill sizes="40px" className="object-contain p-1.5" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{company.author}</span>
                      <Star className={`h-5 w-5 ${selected ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed px-5 text-center text-sm text-muted-foreground">
                {query.trim()
                  ? "검색 결과에 해당하는 기업이 없습니다."
                  : "추가할 수 있는 기업이 없습니다."}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t bg-muted/20 px-6 py-4 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={savingAdditions}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => void addSelectedCompanies()}
              disabled={draftCompanies.length === 0 || savingAdditions}
            >
              {savingAdditions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              선택한 기업 {draftCompanies.length}곳 추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
