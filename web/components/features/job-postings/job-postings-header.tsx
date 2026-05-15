"use client";

import { CalendarDays, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { JobPostingStatus } from "@/lib/job-postings/types";
import type {
  FavoritesPolicy,
  Sort,
  ViewState,
} from "@/app/my/job-postings/use-job-postings-view";
import { STATUS_LABEL, STATUS_TONE_ACTIVE } from "@/lib/job-postings/visual-tokens";

const STATUS_OPTIONS: Array<{ value: JobPostingStatus; label: string }> = (
  ["active", "applied", "interviewing", "closed", "archived"] as JobPostingStatus[]
).map((value) => ({ value, label: STATUS_LABEL[value] }));

const SORT_OPTIONS: Array<{ value: Sort; label: string }> = [
  { value: "created_desc", label: "최신순" },
  { value: "created_asc", label: "오래된순" },
  { value: "deadline_asc", label: "임박한 일정순" },
  { value: "company_asc", label: "회사명순" },
];

const FAVORITES_LABEL: Record<FavoritesPolicy, string> = {
  off: "★ 미적용",
  top: "★ 상단",
  only: "★ 만 보기",
};

const NEXT_FAVORITES: Record<FavoritesPolicy, FavoritesPolicy> = {
  off: "top",
  top: "only",
  only: "off",
};

interface JobPostingsHeaderProps {
  state: ViewState;
  total: number;
  onQueryChange: (value: string) => void;
  onToggleStatus: (status: JobPostingStatus) => void;
  onSetSort: (sort: Sort) => void;
  onToggleCalendar: () => void;
  onSetFavoritesPolicy: (policy: FavoritesPolicy) => void;
  onClickCreate: () => void;
}

export function JobPostingsHeader({
  state,
  total,
  onQueryChange,
  onToggleStatus,
  onSetSort,
  onToggleCalendar,
  onSetFavoritesPolicy,
  onClickCreate,
}: JobPostingsHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            내 채용공고 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            관심 공고와 일정을 한 곳에서 관리하고, 바로 모의면접까지 이어가세요.
            <span className="ml-2 font-medium text-foreground">총 {total.toLocaleString()}개</span>
          </p>
        </div>
        <Button onClick={onClickCreate} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" />새 공고 등록
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={state.query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="회사·직무 검색"
              className="pl-8"
              aria-label="채용공고 검색"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const active = state.statusFilters.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggleStatus(opt.value)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                    active
                      ? STATUS_TONE_ACTIVE[opt.value] + " border-transparent"
                      : "border-input bg-background text-muted-foreground hover:bg-accent",
                  )}
                  aria-pressed={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onSetFavoritesPolicy(NEXT_FAVORITES[state.favoritesPolicy])}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              state.favoritesPolicy === "off"
                ? "border-input bg-background text-muted-foreground hover:bg-accent"
                : "border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
            )}
            aria-label="즐겨찾기 표시 정책"
          >
            <Star
              className={cn(
                "h-3.5 w-3.5 transition-all",
                state.favoritesPolicy === "off"
                  ? "text-muted-foreground"
                  : "fill-amber-400 text-amber-500 drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)]",
              )}
            />
            {FAVORITES_LABEL[state.favoritesPolicy]}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={state.sort} onValueChange={(v) => onSetSort(v as Sort)}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>


          <label
            htmlFor="calendar-toggle"
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 transition-colors",
              state.calendarVisible
                ? "border-primary/40 bg-primary/5"
                : "hover:bg-accent",
            )}
          >
            <CalendarDays
              className={cn(
                "h-4 w-4 transition-colors",
                state.calendarVisible ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden
            />
            <span className="hidden text-xs font-medium sm:inline">캘린더</span>
            <Switch
              id="calendar-toggle"
              checked={state.calendarVisible}
              onCheckedChange={onToggleCalendar}
              aria-label="캘린더 표시 여부"
            />
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                state.calendarVisible
                  ? "text-primary"
                  : "text-muted-foreground/70",
              )}
            >
              {state.calendarVisible ? "ON" : "OFF"}
            </span>
          </label>
        </div>
      </div>

      {(state.statusFilters.length > 0 || state.query || state.favoritesPolicy !== "off") && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>활성 필터:</span>
          {state.query && <Badge variant="secondary">검색: {state.query}</Badge>}
          {state.statusFilters.map((s) => {
            const label = STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
            return (
              <Badge key={s} variant="secondary">
                {label}
              </Badge>
            );
          })}
          {state.favoritesPolicy !== "off" && (
            <Badge variant="secondary">{FAVORITES_LABEL[state.favoritesPolicy]}</Badge>
          )}
        </div>
      )}
    </div>
  );
}
