"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobPostingCalendar, type CalendarEvent } from "@/components/features/job-postings/job-posting-calendar";
import { JobPostingList } from "@/components/features/job-postings/job-posting-list";
import { JobPostingFormDialog } from "@/components/features/job-postings/job-posting-form-dialog";
import type { JobPostingInput, JobPostingRecord } from "@/lib/job-postings/types";

export function JobPostingsClient() {
  const [postings, setPostings] = useState<JobPostingRecord[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [postingsRes, calRes] = await Promise.all([
        fetch("/api/my/job-postings", { cache: "no-store" }),
        fetch("/api/my/job-postings/calendar", { cache: "no-store" }),
      ]);
      const pj = await postingsRes.json();
      const cj = await calRes.json();
      if (pj.success) setPostings(pj.data.items);
      if (cj.success) setEvents(cj.data.events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const active = useMemo(
    () => postings.filter((p) => p.status !== "archived" && p.status !== "closed"),
    [postings]
  );
  const inactive = useMemo(
    () => postings.filter((p) => p.status === "archived" || p.status === "closed"),
    [postings]
  );

  const handleCreate = async (payload: JobPostingInput) => {
    const res = await fetch("/api/my/job-postings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "저장 실패");
    await fetchAll();
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 채용공고 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            관심 공고를 등록하고 일정을 캘린더로 관리한 뒤, 바로 모의면접까지 진행하세요.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> 새 공고 등록
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <JobPostingCalendar events={events} />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              활성 공고 ({active.length})
            </h2>
            {loading ? <div className="text-sm text-muted-foreground">불러오는 중…</div> : <JobPostingList postings={active} />}
          </section>
          {inactive.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                보관/마감 ({inactive.length})
              </h2>
              <JobPostingList postings={inactive} />
            </section>
          )}
        </div>
      </div>

      <JobPostingFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreate} />
    </div>
  );
}
