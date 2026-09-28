"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JobPostingStatus } from "@/lib/job-postings/types";
import type {
  AttachFilter,
  FavoritesPolicy,
  Sort,
  ViewState,
} from "@/app/career/job-postings/use-job-postings-view";
import { STATUS_LABEL, STATUS_TONE_ACTIVE } from "@/lib/job-postings/visual-tokens";
import {
  CareerFilterChip,
  CareerFilterSection,
  CareerListToolbar,
} from "@/components/features/career/career-list-toolbar";

const STATUS_OPTIONS: Array<{ value: JobPostingStatus; label: string }> = (
  ["active", "applied", "interviewing", "closed", "archived"] as JobPostingStatus[]
).map((value) => ({ value, label: STATUS_LABEL[value] }));

const SORT_OPTIONS: Array<{ value: Sort; label: string }> = [
  { value: "created_desc", label: "최신순" },
  { value: "created_asc", label: "오래된순" },
  { value: "deadline_asc", label: "임박한 일정순" },
  { value: "company_asc", label: "회사명순" },
];

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
  const resetFilters = () => {
    for (const status of state.statusFilters) onToggleStatus(status);
    onSetFavoritesPolicy("off");
    onSetAttachFilter(null);
    onQueryChange("");
    onSetSort("created_desc");
  };

  const activeFilters = [
    ...state.statusFilters.map((status) => ({
      id: `status-${status}`,
      label: STATUS_LABEL[status],
      onRemove: () => onToggleStatus(status),
    })),
    ...(state.favoritesPolicy !== "off" ? [{
      id: "favorites",
      label: state.favoritesPolicy === "only" ? "즐겨찾기만" : "즐겨찾기 상단",
      onRemove: () => onSetFavoritesPolicy("off"),
    }] : []),
    ...(state.attachFilter ? [{
      id: "attachment",
      label: ATTACH_FILTER_OPTIONS.find((option) => option.value === state.attachFilter)?.label || "준비 상태",
      onRemove: () => onSetAttachFilter(null),
    }] : []),
  ];

  return (
    <div className="mb-6 space-y-5">
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

      <CareerListToolbar
        ariaLabel="채용공고 필터"
        className="mb-0"
        quickFilters={[
          {
            id: "all",
            label: "전체",
            active: state.statusFilters.length === 0,
            onClick: () => {
              for (const status of state.statusFilters) onToggleStatus(status);
            },
          },
          ...STATUS_OPTIONS.map((option) => ({
            id: option.value,
            label: option.label,
            active: state.statusFilters.includes(option.value),
            activeClassName: `${STATUS_TONE_ACTIVE[option.value]} border-transparent`,
            onClick: () => onToggleStatus(option.value),
          })),
        ]}
        searchValue={state.query}
        onSearchChange={onQueryChange}
        searchPlaceholder="회사·직무 검색"
        sortValue={state.sort}
        onSortChange={(value) => onSetSort(value as Sort)}
        sortOptions={SORT_OPTIONS}
        advancedFilterCount={(state.favoritesPolicy === "off" ? 0 : 1) + (state.attachFilter ? 1 : 0)}
        advancedFilters={
          <>
            <CareerFilterSection label="즐겨찾기">
              {([
                ["off", "미적용"],
                ["top", "상단 고정"],
                ["only", "즐겨찾기만"],
              ] as const).map(([value, label]) => (
                <CareerFilterChip key={value} active={state.favoritesPolicy === value} onClick={() => onSetFavoritesPolicy(value)}>
                  {label}
                </CareerFilterChip>
              ))}
            </CareerFilterSection>
            <CareerFilterSection label="지원 준비">
              {ATTACH_FILTER_OPTIONS.map((option) => (
                <CareerFilterChip
                  key={option.value}
                  active={state.attachFilter === option.value}
                  onClick={() => onSetAttachFilter(state.attachFilter === option.value ? null : option.value)}
                >
                  {option.label}
                </CareerFilterChip>
              ))}
            </CareerFilterSection>
          </>
        }
        activeFilters={activeFilters}
        onReset={resetFilters}
        resultCount={total}
        trailingAction={
          <button
            type="button"
            onClick={onToggleCalendar}
            className={cn(
              "h-10 shrink-0 rounded-xl border px-3 text-xs font-semibold shadow-sm transition-colors",
              state.calendarVisible
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-slate-200 bg-white text-muted-foreground hover:bg-accent",
            )}
          >
            캘린더 {state.calendarVisible ? "ON" : "OFF"}
          </button>
        }
      />
    </div>
  );
}
