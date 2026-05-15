"use client";

import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AttachFilter,
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
  off: "미적용",
  top: "상단 고정",
  only: "만 보기",
};

const NEXT_FAVORITES: Record<FavoritesPolicy, FavoritesPolicy> = {
  off: "top",
  top: "only",
  only: "off",
};

const ATTACH_FILTER_OPTIONS: Array<{ value: AttachFilter & string; label: string }> = [
  { value: "missing_resume", label: "이력서 미연결" },
  { value: "missing_cover_letter", label: "자소서 미작성" },
  { value: "ready", label: "준비 완료" },
];

interface JobPostingsHeaderProps {
  state: ViewState;
  total: number;
  onQueryChange: (value: string) => void;
  onToggleStatus: (status: JobPostingStatus) => void;
  onSetSort: (sort: Sort) => void;
  onToggleCalendar: () => void;
  onSetFavoritesPolicy: (policy: FavoritesPolicy) => void;
  onSetAttachFilter: (filter: AttachFilter) => void;
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
  onSetAttachFilter,
  onClickCreate,
}: JobPostingsHeaderProps) {
  return (
    <div className="mb-6 space-y-3">
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

      <div className="space-y-2 rounded-lg border bg-card/40 px-3 py-2.5">
        {/* 검색 + 정렬 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={state.query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="회사·직무 검색"
              className="h-8 pl-7 text-sm"
              aria-label="채용공고 검색"
            />
          </div>
          <Select value={state.sort} onValueChange={(v) => onSetSort(v as Sort)}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
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
          <button
            type="button"
            onClick={onToggleCalendar}
            className={cn(
              "h-8 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors",
              state.calendarVisible
                ? "border-primary/30 bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            캘린더 {state.calendarVisible ? "ON" : "OFF"}
          </button>
        </div>

        {/* 필터 행 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <FilterGroup label="상태">
            {STATUS_OPTIONS.map((opt) => {
              const active = state.statusFilters.includes(opt.value);
              return (
                <Chip
                  key={opt.value}
                  active={active}
                  activeClass={STATUS_TONE_ACTIVE[opt.value]}
                  onClick={() => onToggleStatus(opt.value)}
                >
                  {opt.label}
                </Chip>
              );
            })}
          </FilterGroup>

          <span className="hidden text-border sm:inline">|</span>

          <FilterGroup label="즐겨찾기">
            <button
              type="button"
              onClick={() => onSetFavoritesPolicy(NEXT_FAVORITES[state.favoritesPolicy])}
              className={cn(
                "rounded-full border px-2 py-0.5 font-medium transition-colors",
                state.favoritesPolicy === "off"
                  ? "border-input text-muted-foreground hover:bg-accent"
                  : "border-transparent bg-amber-100 text-amber-700",
              )}
            >
              {FAVORITES_LABEL[state.favoritesPolicy]}
            </button>
          </FilterGroup>

          <span className="hidden text-border sm:inline">|</span>

          <FilterGroup label="준비">
            {ATTACH_FILTER_OPTIONS.map((opt) => {
              const active = state.attachFilter === opt.value;
              return (
                <Chip
                  key={opt.value}
                  active={active}
                  activeClass={
                    opt.value === "ready"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }
                  onClick={() => onSetAttachFilter(active ? null : opt.value)}
                >
                  {opt.label}
                </Chip>
              );
            })}
          </FilterGroup>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  activeClass,
  onClick,
  children,
}: {
  active: boolean;
  activeClass: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 font-medium transition-colors",
        active
          ? activeClass + " border-transparent"
          : "border-input text-muted-foreground hover:bg-accent",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
