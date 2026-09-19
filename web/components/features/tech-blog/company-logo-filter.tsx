"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { Building2, Loader2, Sparkles, Star, X } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";

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
  onFavoriteCompaniesChange?: (companies: string[]) => void;
  className?: string;
}

const companyTones = [
  "text-emerald-600 dark:text-emerald-400",
  "text-sky-600 dark:text-sky-400",
  "text-violet-600 dark:text-violet-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-600 dark:text-rose-400",
  "text-indigo-600 dark:text-indigo-400",
] as const;

function getCompanyTone(companyName: string) {
  const toneIndex = Array.from(companyName).reduce(
    (total, character) => total + (character.codePointAt(0) ?? 0),
    0,
  ) % companyTones.length;

  return companyTones[toneIndex];
}

function CompanyMark({
  company,
  isFavorite,
  saving,
  tabIndex,
  onToggle,
}: {
  company: CompanyOption;
  isFavorite: boolean;
  saving: boolean;
  tabIndex?: number;
  onToggle: (companyName: string) => void;
}) {
  const logoUrl = getLogoUrl(company.author);
  const companyTone = getCompanyTone(company.author);

  return (
    <button
      type="button"
      onClick={() => onToggle(company.author)}
      disabled={saving}
      tabIndex={tabIndex}
      aria-pressed={isFavorite}
      aria-label={`${company.author} 관심 기업 ${isFavorite ? "해제" : "추가"}`}
      title={`관심 기업 ${isFavorite ? "해제" : "추가"}`}
      className="group flex h-14 min-w-36 shrink-0 items-center justify-center gap-3 px-2 transition-opacity hover:opacity-70 focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-wait disabled:opacity-60"
    >
      <div
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden",
          companyTone,
        )}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            fill
            sizes="40px"
            draggable={false}
            className="object-contain p-0.5"
          />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
      </div>
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-black">
        <span className="truncate">{company.author}</span>
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
        ) : (
          <Star
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-colors",
              isFavorite
                ? "fill-primary text-primary"
                : "text-muted-foreground/55 group-hover:text-primary",
            )}
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}

function FavoriteCompanyMark({
  companyName,
  removing,
  onRemove,
}: {
  companyName: string;
  removing: boolean;
  onRemove: (companyName: string) => void;
}) {
  const logoUrl = getLogoUrl(companyName);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-background/80 py-1 pl-2 pr-1 text-xs font-extrabold text-foreground shadow-sm">
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            fill
            sizes="20px"
            className="object-contain"
          />
        ) : (
          <Building2 className="h-3.5 w-3.5 text-primary" />
        )}
      </span>
      <span>{companyName}</span>
      <button
        type="button"
        onClick={() => onRemove(companyName)}
        disabled={removing}
        aria-label={`${companyName} 관심 기업 해제`}
        className="ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-wait disabled:opacity-60"
      >
        {removing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}

export function CompanyLogoFilter({
  value,
  onChange,
  searchValue,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onFavoriteCompaniesChange,
  className,
}: CompanyLogoFilterProps) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [favoriteCompanies, setFavoriteCompanies] = useState<string[]>([]);
  const [savingCompany, setSavingCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const marqueeViewportRef = useRef<HTMLDivElement>(null);
  const autoScrollPausedRef = useRef(false);
  const resumeAutoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseDragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
  });
  const suppressClickRef = useRef(false);

  const pauseAutoScroll = useCallback((resumeAfterMs?: number) => {
    autoScrollPausedRef.current = true;
    if (resumeAutoScrollTimerRef.current) {
      clearTimeout(resumeAutoScrollTimerRef.current);
      resumeAutoScrollTimerRef.current = null;
    }

    if (resumeAfterMs) {
      resumeAutoScrollTimerRef.current = setTimeout(() => {
        autoScrollPausedRef.current = false;
        resumeAutoScrollTimerRef.current = null;
      }, resumeAfterMs);
    }
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      try {
        const response = await fetch("/api/my/favorite-companies", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        const nextFavorites = response.ok && json?.success && Array.isArray(json?.data?.companies)
          ? json.data.companies as string[]
          : [];
        if (!cancelled) {
          setFavoriteCompanies(nextFavorites);
          onFavoriteCompaniesChange?.(nextFavorites);
        }
      } catch {
        if (!cancelled) {
          setFavoriteCompanies([]);
          onFavoriteCompaniesChange?.([]);
        }
      }
    };

    void loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [onFavoriteCompaniesChange]);

  useEffect(() => {
    const viewport = marqueeViewportRef.current;
    if (!viewport || loading || companies.length === 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const loopWidth = viewport.scrollWidth / 2;
    if (loopWidth <= 0) return;

    let animationFrame = 0;
    let previousTime = performance.now();

    const move = (currentTime: number) => {
      const elapsed = Math.min(currentTime - previousTime, 50);
      previousTime = currentTime;

      if (!autoScrollPausedRef.current && !document.hidden) {
        const nextScrollLeft = viewport.scrollLeft + (loopWidth / 90_000) * elapsed;
        viewport.scrollLeft = nextScrollLeft >= loopWidth
          ? nextScrollLeft - loopWidth
          : nextScrollLeft;
      }

      animationFrame = requestAnimationFrame(move);
    };

    animationFrame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(animationFrame);
  }, [companies.length, loading]);

  useEffect(() => () => {
    if (resumeAutoScrollTimerRef.current) {
      clearTimeout(resumeAutoScrollTimerRef.current);
    }
  }, []);

  const favoriteCompanySet = new Set(favoriteCompanies);
  const marqueeCompanies = companies.length > 0
    ? Array.from(
        { length: Math.max(companies.length, 8) },
        (_, index) => companies[index % companies.length],
      )
    : [];

  useEffect(() => {
    if (value === "all" || loading) return;
    if (!companies.some((company) => company.author === value)) {
      onChange("all");
    }
  }, [companies, loading, onChange, value]);

  const toggleFavoriteCompany = async (companyName: string) => {
    if (savingCompany) return;

    const previous = favoriteCompanies;
    const isRemoving = favoriteCompanySet.has(companyName);
    const next = isRemoving
      ? favoriteCompanies.filter((company) => company !== companyName)
      : [...favoriteCompanies, companyName];

    setSavingCompany(companyName);
    setFavoriteCompanies(next);
    onFavoriteCompaniesChange?.(next);

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

      const savedCompanies = Array.isArray(json?.data?.companies)
        ? json.data.companies as string[]
        : next;
      setFavoriteCompanies(savedCompanies);
      onFavoriteCompaniesChange?.(savedCompanies);
    } catch (error: unknown) {
      setFavoriteCompanies(previous);
      onFavoriteCompaniesChange?.(previous);
      toast({
        title: `관심 기업 ${isRemoving ? "해제" : "추가"} 실패`,
        description:
          error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setSavingCompany("");
    }
  };

  const finishManualScroll = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = mouseDragRef.current;
    if (drag.active && event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }
    if (drag.moved) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    drag.active = false;
    pauseAutoScroll(1_800);
  };

  const handleMarqueePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pauseAutoScroll();
    if (event.pointerType !== "mouse") return;

    mouseDragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
    };
  };

  const handleMarqueePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = mouseDragRef.current;
    if (!drag.active) return;

    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < 5) return;

    drag.moved = true;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.startScrollLeft - distance;
  };

  const handleMarqueeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    pauseAutoScroll(1_800);
    event.currentTarget.scrollBy({
      left: event.key === "ArrowLeft" ? -180 : 180,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/[0.04] via-muted/50 to-primary/[0.04] px-5 py-5">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background/95 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background/95 to-transparent" />
        <div className="relative z-20 mb-4 flex flex-wrap items-center gap-2 text-sm font-bold text-foreground/80">
          <Sparkles className="h-4 w-4 text-primary" />
          다양한 테크 기업을 둘러보세요.
          {favoriteCompanies.length > 0 && (
            <>
              <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
              <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                <Star className="h-3.5 w-3.5 fill-primary" />
                관심 기업
              </span>
              {favoriteCompanies.map((companyName) => (
                <FavoriteCompanyMark
                  key={companyName}
                  companyName={companyName}
                  removing={savingCompany === companyName}
                  onRemove={(name) => void toggleFavoriteCompany(name)}
                />
              ))}
            </>
          )}
        </div>

        {loading ? (
          <div className="flex gap-8 overflow-hidden" aria-label="기업 목록 불러오는 중">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="flex h-14 w-36 shrink-0 items-center gap-3 px-2"
              >
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={marqueeViewportRef}
            role="region"
            tabIndex={0}
            aria-label="기술 기업 목록. 좌우로 스크롤하거나 드래그해서 탐색할 수 있습니다."
            onPointerDown={handleMarqueePointerDown}
            onPointerMove={handleMarqueePointerMove}
            onPointerUp={finishManualScroll}
            onPointerCancel={finishManualScroll}
            onWheel={() => pauseAutoScroll(1_800)}
            onKeyDown={handleMarqueeKeyDown}
            onClickCapture={(event) => {
              if (!suppressClickRef.current) return;
              event.preventDefault();
              event.stopPropagation();
            }}
            className="no-scrollbar cursor-grab touch-pan-x select-none overflow-x-auto overscroll-x-contain active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="flex min-w-max">
              {[0, 1].map((setIndex) => (
                <div key={setIndex} className="flex gap-8 pr-8" aria-hidden={setIndex === 1}>
                  {marqueeCompanies.map((company, index) => (
                    <CompanyMark
                      key={`${setIndex}-${company.author}-${index}`}
                      company={company}
                      isFavorite={favoriteCompanySet.has(company.author)}
                      saving={savingCompany === company.author}
                      tabIndex={setIndex === 1 ? -1 : undefined}
                      onToggle={(name) => void toggleFavoriteCompany(name)}
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
                {company.author}{favoriteCompanySet.has(company.author) ? " ★" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </div>
  );
}
