"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttachmentPicker } from "@/components/features/job-postings/attachment-picker";
import type { JobPostingRecord } from "@/lib/job-postings/types";

export function JobPostingDetailClient({ postingId }: { postingId: string }) {
  const [posting, setPosting] = useState<JobPostingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/my/job-postings/${postingId}`, { cache: "no-store" });
    const json = await res.json();
    if (json.success) setPosting(json.data);
    setLoading(false);
  }, [postingId]);

  useEffect(() => { void load(); }, [load]);

  const removeAttachment = async (attachmentId: string) => {
    await fetch(`/api/my/job-postings/${postingId}/attachments/${attachmentId}`, { method: "DELETE" });
    void load();
  };

  const removeSchedule = async (scheduleId: string) => {
    await fetch(`/api/my/job-postings/${postingId}/schedules/${scheduleId}`, { method: "DELETE" });
    void load();
  };

  const removePosting = async () => {
    if (!confirm("이 공고와 일정/연결 자료를 모두 삭제할까요?")) return;
    await fetch(`/api/my/job-postings/${postingId}`, { method: "DELETE" });
    window.location.href = "/my/job-postings";
  };

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">불러오는 중…</div>;
  if (!posting) return <div className="mx-auto max-w-5xl px-4 py-10">공고를 찾을 수 없습니다.</div>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/my/job-postings"><ArrowLeft className="mr-1 h-4 w-4" />목록으로</Link>
        </Button>
        <div className="flex gap-2">
          {posting.postingUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={posting.postingUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />원문 공고
              </a>
            </Button>
          )}
          <Button asChild>
            <Link href={`/interview/posting/setup?import=job_posting&postingId=${posting.id}`}>
              <Sparkles className="mr-1 h-4 w-4" />이 공고로 모의면접 시작
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 p-6">
          <div className="text-sm text-muted-foreground">{posting.companyName}</div>
          <h1 className="text-2xl font-bold">{posting.roleTitle}</h1>
          <div className="flex flex-wrap gap-1 pt-2">
            {posting.techStack.map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
          {posting.memo && (
            <p className="whitespace-pre-line pt-3 text-sm text-foreground">{posting.memo}</p>
          )}
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-base font-semibold">일정</h2>
        {posting.schedules && posting.schedules.length > 0 ? (
          <div className="space-y-2">
            {posting.schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{s.title || labelKind(s.kind)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.startAt).toLocaleString("ko-KR")}
                    {s.endAt && ` ~ ${new Date(s.endAt).toLocaleString("ko-KR")}`}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeSchedule(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            등록된 일정이 없습니다.
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">연결된 자료</h2>
        <AttachmentPicker postingId={posting.id} onAdded={load} />
        {posting.attachments && posting.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {posting.attachments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                <div className="text-sm">
                  <Badge variant="outline" className="mr-2">{labelType(a.attachmentType)}</Badge>
                  {a.attachmentType === "cover_letter"
                    ? a.coverLetterLabel ?? `자소서 #${(a.coverLetterIndex ?? 0) + 1}`
                    : a.attachmentType === "resume"
                      ? "이력서"
                      : "포트폴리오"}
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeAttachment(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-end pt-4">
        <Button variant="destructive" onClick={removePosting}>공고 삭제</Button>
      </div>
    </div>
  );
}

function labelKind(k: string) {
  return k === "deadline" ? "마감일" : k === "document_due" ? "서류 마감" : k === "interview" ? "면접일" : "기타";
}
function labelType(t: string) {
  return t === "resume" ? "이력서" : t === "cover_letter" ? "자소서" : "포트폴리오";
}
