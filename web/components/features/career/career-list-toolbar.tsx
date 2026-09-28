"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Filter, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface CareerQuickFilter {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
  activeClassName?: string;
}

export interface CareerSortOption {
  value: string;
  label: string;
}

export interface CareerActiveFilter {
  id: string;
  label: string;
  onRemove: () => void;
}

interface CareerListToolbarProps {
  ariaLabel: string;
  quickFilters?: CareerQuickFilter[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: CareerSortOption[];
  advancedFilterCount?: number;
  advancedFilters?: ReactNode;
  activeFilters?: CareerActiveFilter[];
  onReset?: () => void;
  resultCount?: number;
  totalCount?: number;
  trailingAction?: ReactNode;
  className?: string;
}

export function CareerListToolbar({
  ariaLabel,
  quickFilters = [],
  searchValue,
  onSearchChange,
  searchPlaceholder,
  sortValue,
  onSortChange,
  sortOptions,
  advancedFilterCount = 0,
  advancedFilters,
  activeFilters = [],
  onReset,
  resultCount,
  totalCount,
  trailingAction,
  className,
}: CareerListToolbarProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const filterTrigger = (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-10 shrink-0 gap-2 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
        advancedFilterCount > 0 && "border-primary/30 bg-primary/5 text-primary",
      )}
    >
      <Filter className="h-4 w-4" />
      필터
      {advancedFilterCount > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {advancedFilterCount}
        </span>
      ) : null}
    </Button>
  );

  const advancedControl = advancedFilters
    ? isMobile
      ? (
          <Sheet>
            <SheetTrigger asChild>{filterTrigger}</SheetTrigger>
            <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto rounded-t-3xl px-5 pb-6 pt-5">
              <SheetHeader className="mb-5 text-left">
                <SheetTitle>상세 필터</SheetTitle>
              </SheetHeader>
              <div className="space-y-5">{advancedFilters}</div>
              <SheetFooter className="mt-6 flex-row gap-2">
                {onReset ? (
                  <Button type="button" variant="outline" onClick={onReset} className="flex-1">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    초기화
                  </Button>
                ) : null}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )
      : (
          <Popover>
            <PopoverTrigger asChild>{filterTrigger}</PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] rounded-2xl p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">상세 필터</h3>
                {advancedFilterCount > 0 && onReset ? (
                  <button
                    type="button"
                    onClick={onReset}
                    className="text-xs font-semibold text-slate-400 transition-colors hover:text-primary"
                  >
                    초기화
                  </button>
                ) : null}
              </div>
              <div className="space-y-5">{advancedFilters}</div>
            </PopoverContent>
          </Popover>
        )
    : null;

  const hasCount = typeof resultCount === "number";
  const countLabel = hasCount
    ? typeof totalCount === "number" && totalCount !== resultCount
      ? `전체 ${totalCount.toLocaleString()}개 중 ${resultCount.toLocaleString()}개`
      : `총 ${resultCount.toLocaleString()}개`
    : null;

  return (
    <section
      className={cn("mb-7 space-y-3", className)}
      aria-label={ariaLabel}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {quickFilters.length > 0 ? (
          <div className="-mx-1 overflow-x-auto px-1 pb-1 no-scrollbar lg:min-w-0 lg:pb-0">
            <div className="flex w-max items-center gap-2 lg:w-auto lg:flex-wrap">
              {quickFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={filter.onClick}
                  aria-pressed={filter.active}
                  className={cn(
                    "h-9 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors",
                    filter.active
                      ? filter.activeClassName || "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                  )}
                >
                  {filter.active ? <Check className="mr-1.5 inline h-3.5 w-3.5" /> : null}
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        ) : <div />}

        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          <div className="relative min-w-[180px] flex-1 sm:min-w-[240px] lg:w-[280px] lg:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-9 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
              aria-label={searchPlaceholder}
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="검색어 지우기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {advancedControl}

          <Select value={sortValue} onValueChange={onSortChange}>
            <SelectTrigger className="h-10 w-[132px] shrink-0 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {trailingAction}
        </div>
      </div>

      {(activeFilters.length > 0 || countLabel) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {activeFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={filter.onRemove}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
                title={`${filter.label} 필터 해제`}
              >
                {filter.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            {activeFilters.length > 1 && onReset ? (
              <button
                type="button"
                onClick={onReset}
                className="ml-1 text-[11px] font-semibold text-slate-400 hover:text-primary"
              >
                모두 초기화
              </button>
            ) : null}
          </div>
          {countLabel ? (
            <span className="shrink-0 text-xs font-semibold text-slate-400">
              {countLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function CareerFilterSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function CareerFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
      )}
    >
      {children}
    </button>
  );
}
