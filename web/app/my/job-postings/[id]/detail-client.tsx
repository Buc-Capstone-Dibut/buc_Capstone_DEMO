"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarRange,
  ExternalLink,
  FileText,
  Info,
  Paperclip,
  Sparkles,
  StickyNote,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttachmentPicker } from "@/components/features/job-postings/attachment-picker";
import {
  KIND_COLOR,
  KIND_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/job-postings/visual-tokens";
import { cn } from "@/lib/utils";
import type {
  AttachmentRecord,
  JobPostingRecord,
  ScheduleRecord,
} from "@/lib/job-postings/types";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function JobPostingDetailClient({ postingId }: { postingId: string }) {
  const [posting, setPosting] = useState<JobPostingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [interviewLoading, setInterviewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my/job-postings/${postingId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) setPosting(json.data);
    } finally {
      setLoading(false);
    }
  }, [postingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeAttachment = async (attachmentId: string) => {
    await fetch(
      `/api/my/job-postings/${postingId}/attachments/${attachmentId}`,
      { method: "DELETE" },
    );
    void load();
  };

  const removeSchedule = async (scheduleId: string) => {
    await fetch(`/api/my/job-postings/${postingId}/schedules/${scheduleId}`, {
      method: "DELETE",
    });
    void load();
  };

  const removePosting = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("이 공고와 일정, 연결 자료를 모두 삭제할까요?")
    )
      return;
    await fetch(`/api/my/job-postings/${postingId}`, { method: "DELETE" });
    window.location.href = "/my/job-postings";
  };

  if (loading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  if (!posting)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        공고를 찾을 수 없습니다.
      </div>
    );

  const sortedSchedules = [...(posting.schedules ?? [])].sort(
    (a, b) => +new Date(a.startAt) - +new Date(b.startAt),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* 상단 네비게이션 (서류 바깥 영역) */}
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/my/job-postings">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />목록으로
          </Link>
        </Button>
        {posting.postingUrl && (
          <Button asChild variant="ghost" size="sm">
            <a href={posting.postingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />원문 공고
            </a>
          </Button>
        )}
      </div>

      {/* 서류 본체 */}
      <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* 문서 헤더 — 회사 / 직무 / 상태 */}
        <header className="border-b bg-muted/30 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                {posting.companyName}
              </p>
              <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-foreground">
                {posting.roleTitle}
              </h1>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
                STATUS_TONE[posting.status],
              )}
            >
              {STATUS_LABEL[posting.status]}
            </span>
          </div>

          {posting.techStack.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {posting.techStack.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-background px-2 py-0.5 text-xs text-foreground/80 ring-1 ring-inset ring-border"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* 본문 — 세로로 흐르는 섹션들 (각 섹션 사이는 단순 디바이더) */}
        <div className="divide-y">
          {/* 면접 시작 안내 + CTA */}
          <PrimarySection>
            <SectionTitle icon={Sparkles}>이 공고로 AI 모의면접 시작</SectionTitle>
            <SectionHint>
              아래에 연결된 이력서·자기소개서·포트폴리오와 공고 정보가 면접 설정에
              자동으로 채워집니다. 검토 단계부터 바로 시작할 수 있어요.
            </SectionHint>
            <div className="mt-3">
              <Button
                asChild
                disabled={interviewLoading}
                onClick={() => setInterviewLoading(true)}
              >
                <Link
                  href={`/interview/posting/setup?import=job_posting&postingId=${posting.id}`}
                >
                  {interviewLoading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      준비 중…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" aria-hidden />이 공고로 모의면접 시작
                    </>
                  )}
                </Link>
              </Button>
            </div>
          </PrimarySection>

          {/* 일정 섹션 */}
          <Section>
            <SectionTitle icon={CalendarRange}>일정</SectionTitle>
            <SectionHint>
              마감일·서류 제출·면접 일정을 등록하면 마이페이지 캘린더에 자동
              표시되고, 가장 가까운 일정이 카드의 D-day로 나타납니다.
            </SectionHint>
            {sortedSchedules.length > 0 ? (
              <ul className="mt-3 divide-y rounded-lg border">
                {sortedSchedules.map((s) => (
                  <ScheduleRow
                    key={s.id}
                    schedule={s}
                    onRemove={() => removeSchedule(s.id)}
                  />
                ))}
              </ul>
            ) : (
              <EmptyHint message="등록된 일정이 없습니다." />
            )}
          </Section>

          {/* 자료 연결 섹션 */}
          <Section>
            <SectionTitle icon={Paperclip}>연결된 자료</SectionTitle>
            <SectionHint>
              이력서·자기소개서·포트폴리오를 연결하면 모의면접 설정에 자동으로
              주입되어, 같은 공고로 여러 번 진행할 때마다 다시 고를 필요가 없습니다.
            </SectionHint>
            <div className="mt-3">
              <AttachmentPicker postingId={posting.id} onAdded={load} />
            </div>
            {posting.attachments && posting.attachments.length > 0 && (
              <ul className="mt-3 divide-y rounded-lg border">
                {posting.attachments.map((a) => (
                  <AttachmentRow
                    key={a.id}
                    attachment={a}
                    onRemove={() => removeAttachment(a.id)}
                  />
                ))}
              </ul>
            )}
          </Section>

          {/* 메모 섹션 */}
          {posting.memo && (
            <Section>
              <SectionTitle icon={StickyNote}>메모</SectionTitle>
              <SectionHint>
                이 메모는 모의면접 진행 중 컨텍스트로 활용되지 않습니다. 본인을
                위한 개인 노트 영역입니다.
              </SectionHint>
              <p className="mt-3 whitespace-pre-line rounded-lg border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground/90">
                {posting.memo}
              </p>
            </Section>
          )}

          {/* 상세 정보 섹션 (책임·요건·우대·문화) */}
          {(posting.responsibilities.length > 0 ||
            posting.requirements.length > 0 ||
            posting.preferred.length > 0 ||
            posting.teamCulture.length > 0 ||
            posting.companyDescription) && (
            <Section>
              <SectionTitle icon={Wrench}>채용 상세 정보</SectionTitle>
              <SectionHint>
                URL 자동 추출 또는 직접 입력한 채용공고의 본문입니다. 모의면접
                질문 생성 시 핵심 컨텍스트로 사용됩니다.
              </SectionHint>
              <dl className="mt-3 space-y-3 text-sm">
                {posting.companyDescription && (
                  <DefinitionRow term="회사 소개">
                    {posting.companyDescription}
                  </DefinitionRow>
                )}
                {posting.responsibilities.length > 0 && (
                  <DefinitionList
                    term="주요 업무"
                    items={posting.responsibilities}
                  />
                )}
                {posting.requirements.length > 0 && (
                  <DefinitionList
                    term="자격 요건"
                    items={posting.requirements}
                  />
                )}
                {posting.preferred.length > 0 && (
                  <DefinitionList term="우대 사항" items={posting.preferred} />
                )}
                {posting.teamCulture.length > 0 && (
                  <DefinitionList term="팀 문화" items={posting.teamCulture} />
                )}
              </dl>
            </Section>
          )}
        </div>

        {/* 푸터 — 위험 액션 */}
        <footer className="flex items-center justify-between border-t bg-muted/20 px-8 py-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" aria-hidden />
            공고를 삭제하면 등록된 일정과 자료 연결도 함께 사라집니다.
          </p>
          <Button variant="ghost" size="sm" onClick={removePosting} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />공고 삭제
          </Button>
        </footer>
      </article>
    </div>
  );
}

/* ---------- 작은 빌딩블록 ---------- */

function Section({ children }: { children: React.ReactNode }) {
  return <section className="px-8 py-6">{children}</section>;
}

function PrimarySection({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-primary/5 px-8 py-6">{children}</section>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      {children}
    </h2>
  );
}

function SectionHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
      <span aria-hidden className="mt-1 inline-block h-0.5 w-3 shrink-0 bg-muted-foreground/30" />
      <span>{children}</span>
    </p>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function ScheduleRow({
  schedule,
  onRemove,
}: {
  schedule: ScheduleRecord;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: KIND_COLOR[schedule.kind] }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium"
              style={{ color: KIND_COLOR[schedule.kind] }}
            >
              {KIND_LABEL[schedule.kind]}
            </span>
            {schedule.title && (
              <span className="truncate text-sm text-foreground">
                · {schedule.title}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {DATE_TIME_FORMATTER.format(new Date(schedule.startAt))}
            {schedule.endAt &&
              ` ~ ${DATE_TIME_FORMATTER.format(new Date(schedule.endAt))}`}
          </div>
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onRemove}
        aria-label="일정 삭제"
        className="h-8 w-8 shrink-0"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </li>
  );
}

function AttachmentRow({
  attachment,
  onRemove,
}: {
  attachment: AttachmentRecord;
  onRemove: () => void;
}) {
  const label =
    attachment.attachmentType === "resume"
      ? "이력서"
      : attachment.attachmentType === "cover_letter"
        ? attachment.coverLetterLabel ?? "자기소개서"
        : "포트폴리오";
  const typeLabel =
    attachment.attachmentType === "resume"
      ? "이력서"
      : attachment.attachmentType === "cover_letter"
        ? "자소서"
        : "포트폴리오";
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            {typeLabel}
          </div>
          <div className="truncate text-sm text-foreground">{label}</div>
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onRemove}
        aria-label="연결 해제"
        className="h-8 w-8 shrink-0"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </li>
  );
}

function DefinitionRow({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:pt-0.5">
        {term}
      </dt>
      <dd className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {children}
      </dd>
    </div>
  );
}

function DefinitionList({ term, items }: { term: string; items: string[] }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:pt-0.5">
        {term}
      </dt>
      <dd>
        <ul className="space-y-1 text-sm leading-relaxed text-foreground/90">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}
