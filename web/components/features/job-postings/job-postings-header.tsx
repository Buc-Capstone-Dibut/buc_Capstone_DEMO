"use client";

import { Briefcase, CalendarDays, LayoutGrid, List, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  View,
  ViewState,
} from "@/app/my/job-postings/use-job-postings-view";
import { STATUS_LABEL, STATUS_TONE_ACTIVE } from "@/lib/job-postings/visual-tokens";
import { GlossyIcon } from "./icons/glossy-icon";

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
  onSetView: (view: View) => void;
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
  onSetView,
  onToggleCalendar,
  onSetFavoritesPolicy,
  onClickCreate,
}: JobPostingsHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GlossyIcon icon={Briefcase} size={48} className="hidden sm:inline-flex" />
          <div>
            <h1 className="text-2xl font-bold">내 채용공고 관리</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              관심 공고를 등록하고 일정을 캘린더로 관리한 뒤, 바로 모의면접까지 진행하세요.
              <span className="ml-2 font-medium text-foreground">총 {total}개</span>
            </p>
          </div>
        </div>
        <Button onClick={onClickCreate} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" />
          새 공고 등록
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

          <div className="inline-flex overflow-hidden rounded-md border" role="group" aria-label="뷰 전환">
            <Button
              type="button"
              variant={state.view === "cards" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 px-2.5"
              onClick={() => onSetView("cards")}
              aria-pressed={state.view === "cards"}
              aria-label="카드 뷰"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={state.view === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 px-2.5"
              onClick={() => onSetView("list")}
              aria-pressed={state.view === "list"}
              aria-label="리스트 뷰"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant={state.calendarVisible ? "default" : "outline"}
            size="sm"
            onClick={onToggleCalendar}
            aria-pressed={state.calendarVisible}
            aria-label="캘린더 토글"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">캘린더</span>
          </Button>
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
