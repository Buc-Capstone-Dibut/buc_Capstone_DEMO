"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  JobPostingCalendar,
  type CalendarEvent,
} from "@/components/features/job-postings/job-posting-calendar";
import { JobPostingList } from "@/components/features/job-postings/job-posting-list";
import { JobPostingListView } from "@/components/features/job-postings/job-posting-list-view";
import { JobPostingFormDialog } from "@/components/features/job-postings/job-posting-form-dialog";
import { JobPostingsHeader } from "@/components/features/job-postings/job-postings-header";
import { JobPostingsPagination } from "@/components/features/job-postings/job-postings-pagination";
import { CalendarDayModal } from "@/components/features/job-postings/calendar-day-modal";
import { EmptyJobPostings } from "@/components/features/job-postings/empty-illustration";
import type { JobPostingRecord } from "@/lib/job-postings/types";
import { useJobPostingsView } from "./use-job-postings-view";

interface ListResponse {
  success: boolean;
  data?: {
    items: JobPostingRecord[];
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
  error?: string;
}

export function JobPostingsClient() {
  const {
    state,
    setQuery,
    toggleStatus,
    setSort,
    setView,
    toggleCalendar,
    setFavoritesPolicy,
    setPage,
  } = useJobPostingsView();

  const [postings, setPostings] = useState<JobPostingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarModalDate, setCalendarModalDate] = useState<Date | null>(null);

  // 검색 디바운스
  const [debouncedQuery, setDebouncedQuery] = useState(state.query);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(state.query), 300);
    return () => clearTimeout(id);
  }, [state.query]);

  const fetchListRef = useRef<AbortController | null>(null);
  const fetchList = useCallback(async () => {
    fetchListRef.current?.abort();
    const ctrl = new AbortController();
    fetchListRef.current = ctrl;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      if (state.statusFilters.length > 0) {
        params.set("status", state.statusFilters.join(","));
      }
      if (state.sort) params.set("sort", state.sort);
      if (state.favoritesPolicy !== "off") {
        params.set("favorites", state.favoritesPolicy);
      }
      params.set("page", String(state.page));
      params.set("pageSize", String(state.pageSize));

      const res = await fetch(`/api/my/job-postings?${params.toString()}`, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      const json: ListResponse = await res.json();
      if (json.success && json.data) {
        setPostings(json.data.items ?? []);
        setTotal(json.data.total ?? (json.data.items ?? []).length);
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== "AbortError") {
        // 무시: 사용자가 빠르게 입력 시 발생 가능
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [
    debouncedQuery,
    state.statusFilters,
    state.sort,
    state.favoritesPolicy,
    state.page,
    state.pageSize,
  ]);

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch("/api/my/job-postings/calendar", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setEvents(json.data.events);
    } catch {
      // 무시
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  const handleDialogCreated = useCallback(async () => {
    await Promise.all([fetchList(), fetchCalendar()]);
  }, [fetchList, fetchCalendar]);

  const handleToggleFavorite = useCallback(
    async (id: string, next: boolean) => {
      // 낙관적 업데이트
      setPostings((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFavorite: next } : p)),
      );
      try {
        const res = await fetch(`/api/my/job-postings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFavorite: next }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "즐겨찾기 변경 실패");
        // 정렬 정책이 즐겨찾기 의존이면 재조회로 순서 반영
        if (state.favoritesPolicy !== "off") {
          await fetchList();
        }
      } catch {
        // 롤백
        setPostings((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isFavorite: !next } : p)),
        );
      }
    },
    [state.favoritesPolicy, fetchList],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (typeof window !== "undefined" && !window.confirm("이 채용공고를 삭제하시겠습니까?")) {
        return;
      }
      try {
        const res = await fetch(`/api/my/job-postings/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "삭제 실패");
        await Promise.all([fetchList(), fetchCalendar()]);
      } catch (e: unknown) {
        if (typeof window !== "undefined") {
          window.alert((e as { message?: string })?.message ?? "삭제에 실패했습니다.");
        }
      }
    },
    [fetchList, fetchCalendar],
  );

  const hasFilters = useMemo(
    () =>
      state.query.trim().length > 0 ||
      state.statusFilters.length > 0 ||
      state.favoritesPolicy === "only",
    [state.query, state.statusFilters, state.favoritesPolicy],
  );

  const emptyMessage = hasFilters ? (
    <>조건에 맞는 채용공고가 없습니다. 검색어나 필터를 조정해 보세요.</>
  ) : (
    <>
      등록된 채용공고가 없습니다. 상단 <b>+ 새 공고 등록</b> 버튼으로 첫 공고를 추가해 보세요.
    </>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <JobPostingsHeader
        state={state}
        total={total}
        onQueryChange={setQuery}
        onToggleStatus={toggleStatus}
        onSetSort={setSort}
        onSetView={setView}
        onToggleCalendar={toggleCalendar}
        onSetFavoritesPolicy={setFavoritesPolicy}
        onClickCreate={() => setDialogOpen(true)}
      />

      <div className={state.calendarVisible ? "grid gap-6 lg:grid-cols-12" : "grid gap-6"}>
        {state.calendarVisible && (
          <div className="lg:col-span-5">
            <JobPostingCalendar
              events={events}
              onDateClick={setCalendarModalDate}
              onEventClick={(ev) => setCalendarModalDate(new Date(ev.start))}
            />
          </div>
        )}

        <div className={state.calendarVisible ? "lg:col-span-7" : "w-full"}>
          {loading && postings.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
              불러오는 중…
            </div>
          ) : postings.length === 0 ? (
            hasFilters ? (
              <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <EmptyJobPostings onCreate={() => setDialogOpen(true)} />
            )
          ) : state.view === "cards" ? (
            <JobPostingList
              postings={postings}
              onToggleFavorite={handleToggleFavorite}
              emptyMessage={emptyMessage}
            />
          ) : (
            <JobPostingListView
              postings={postings}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
            />
          )}

          <JobPostingsPagination
            page={state.page}
            pageSize={state.pageSize}
            total={total}
            onPageChange={setPage}
          />
        </div>
      </div>

      <JobPostingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleDialogCreated}
      />

      <CalendarDayModal
        open={calendarModalDate !== null}
        onOpenChange={(o) => !o && setCalendarModalDate(null)}
        date={calendarModalDate}
        events={events}
        onCreate={() => setDialogOpen(true)}
      />
    </div>
  );
}
