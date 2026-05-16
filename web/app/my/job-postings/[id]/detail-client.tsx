"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttachmentPicker } from "@/components/features/job-postings/attachment-picker";
import { InterviewLaunchOverlay } from "@/components/features/job-postings/interview-launch-overlay";
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

const DATE_TIME = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export interface TargetResumeRef {
  id: string;
  title: string;
  updatedAt: string;
  isActive: boolean;
}

export interface TargetCoverLetterRef {
  id: string;
  title: string;
  updatedAt: string;
}

export function JobPostingDetailClient({
  postingId,
  targetResumes,
  targetCoverLetters,
}: {
  postingId: string;
  targetResumes: TargetResumeRef[];
  targetCoverLetters: TargetCoverLetterRef[];
}) {
  const [posting, setPosting] = useState<JobPostingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [launchOpen, setLaunchOpen] = useState(false);

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
      !window.confirm("이 공고와 등록된 일정, 연결된 자료를 모두 삭제합니다. 진행할까요?")
    )
      return;
    await fetch(`/api/my/job-postings/${postingId}`, { method: "DELETE" });
    window.location.href = "/my/job-postings";
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }
  if (!posting) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        공고를 찾을 수 없습니다.
      </div>
    );
  }

  const sortedSchedules = [...(posting.schedules ?? [])].sort(
    (a, b) => +new Date(a.startAt) - +new Date(b.startAt),
  );
  const attachments = posting.attachments ?? [];

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950/70">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {/* 상단 네비게이션 */}
      <div className="mb-3 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-sm">
          <Link href="/my/job-postings">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />목록으로
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {posting.postingUrl && (
            <Button asChild variant="outline" size="sm" className="h-8 rounded-sm">
              <a href={posting.postingUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />원문 공고
              </a>
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 rounded-sm"
            onClick={() => setLaunchOpen(true)}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
            이 공고로 모의면접
          </Button>
        </div>
      </div>

      {/* 문서 표 본체 — 책상 위 종이 양식 */}
      <article className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.10)] dark:border-slate-800/80 dark:bg-slate-900">
        {/* 문서 헤더 */}
        <header className="border-b border-slate-200/80 bg-slate-50/60 px-6 py-5 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              채용공고 상세
            </span>
            <span className="text-xs text-muted-foreground/70 tabular-nums">
              · 마지막 수정 {DATE_TIME.format(new Date(posting.updatedAt))}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-semibold leading-snug text-foreground">
            {posting.companyName}
            <span className="mx-2 text-muted-foreground">|</span>
            <span className="text-foreground/90">{posting.roleTitle}</span>
          </h1>
        </header>

        {/* 기본 정보 표 */}
        <SectionHeader
          title="기본 정보"
          hint="등록한 채용공고의 기본 메타데이터입니다. 모의면접 질문 생성의 핵심 컨텍스트로 사용됩니다."
        />
        <FormTable>
          <FormRow label="회사명">{posting.companyName}</FormRow>
          <FormRow label="직무명">{posting.roleTitle}</FormRow>
          <FormRow label="상태">
            <span
              className={cn(
                "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                STATUS_TONE[posting.status],
              )}
            >
              {STATUS_LABEL[posting.status]}
            </span>
          </FormRow>
          <FormRow label="공고 URL">
            {posting.postingUrl ? (
              <a
                href={posting.postingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary underline-offset-2 hover:underline"
              >
                {posting.postingUrl}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : (
              <EmptyValue />
            )}
          </FormRow>
          <FormRow label="요구 기술">
            {posting.techStack.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {posting.techStack.map((t) => (
                  <span
                    key={t}
                    className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyValue />
            )}
          </FormRow>
          <FormRow label="메모" hint="개인 노트. 면접 컨텍스트로는 사용되지 않습니다.">
            {posting.memo ? (
              <p className="whitespace-pre-line leading-relaxed">{posting.memo}</p>
            ) : (
              <EmptyValue />
            )}
          </FormRow>
        </FormTable>

        {/* 일정 섹션 */}
        <SectionHeader
          title="일정"
          hint="등록한 일정은 마이페이지 캘린더에 자동 표시되며, 가장 가까운 일정이 카드의 D-day로 노출됩니다."
        />
        {sortedSchedules.length > 0 ? (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50/60 text-xs uppercase tracking-wider text-muted-foreground dark:bg-slate-950/30">
              <tr>
                <Th className="w-24">종류</Th>
                <Th className="w-56">일시</Th>
                <Th>제목 · 메모</Th>
                <Th className="w-16 text-right">관리</Th>
              </tr>
            </thead>
            <tbody>
              {sortedSchedules.map((s) => (
                <ScheduleTableRow
                  key={s.id}
                  schedule={s}
                  onRemove={() => removeSchedule(s.id)}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyBlock message="등록된 일정이 없습니다. 마감일·면접일을 추가해 일정 관리를 시작해 보세요." />
        )}

        {/* 연결 자료 섹션 */}
        <SectionHeader
          title="연결된 자료"
          hint="이력서·자기소개서·포트폴리오를 연결하면 모의면접 설정에 자동 주입되어, 같은 공고로 여러 번 진행할 때 다시 고를 필요가 없습니다."
        />
        <div className="border-t border-slate-200/70 bg-white px-6 py-4 dark:border-slate-800/70 dark:bg-slate-900">
          <AttachmentPicker postingId={posting.id} onAdded={load} />
        </div>
        {attachments.length > 0 ? (
          <table className="w-full border-collapse border-t border-slate-200/70 text-sm dark:border-slate-800/70">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th className="w-28">구분</Th>
                <Th>자료명</Th>
                <Th className="w-16 text-right">관리</Th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((a) => (
                <AttachmentTableRow
                  key={a.id}
                  attachment={a}
                  onRemove={() => removeAttachment(a.id)}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyBlock message="아직 연결된 자료가 없습니다. 위에서 이력서·자기소개서·포트폴리오를 선택해 연결하세요." />
        )}

        {/* 이 공고로 만든 자료 (target_job_posting_id 역방향) */}
        <SectionHeader
          title="이 공고로 만든 자료"
          hint="이력서·자기소개서를 작성할 때 ‘지원 대상’으로 이 공고를 선택하면 여기에 자동으로 모입니다. 위의 ‘연결된 자료’는 사용자가 직접 첨부한 것, 아래는 작성 시점에 기록된 출처입니다."
        />
        <TargetDocumentsBlock
          resumes={targetResumes}
          coverLetters={targetCoverLetters}
        />

        {/* 채용 상세 정보 */}
        {(posting.responsibilities.length > 0 ||
          posting.requirements.length > 0 ||
          posting.preferred.length > 0 ||
          posting.teamCulture.length > 0 ||
          posting.companyDescription) && (
          <>
            <SectionHeader
              title="채용 상세 정보"
              hint="URL 자동 추출 또는 직접 입력한 채용공고 본문입니다. 모의면접 질문 생성 시 핵심 컨텍스트로 사용됩니다."
            />
            <FormTable>
              {posting.companyDescription && (
                <FormRow label="회사 소개">
                  <p className="whitespace-pre-line leading-relaxed">
                    {posting.companyDescription}
                  </p>
                </FormRow>
              )}
              {posting.responsibilities.length > 0 && (
                <FormRow label="주요 업무">
                  <BulletList items={posting.responsibilities} />
                </FormRow>
              )}
              {posting.requirements.length > 0 && (
                <FormRow label="자격 요건">
                  <BulletList items={posting.requirements} />
                </FormRow>
              )}
              {posting.preferred.length > 0 && (
                <FormRow label="우대 사항">
                  <BulletList items={posting.preferred} />
                </FormRow>
              )}
              {posting.teamCulture.length > 0 && (
                <FormRow label="팀 문화">
                  <BulletList items={posting.teamCulture} />
                </FormRow>
              )}
            </FormTable>
          </>
        )}

        {/* 푸터 */}
        <footer className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/60 px-6 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
          <p className="text-xs text-muted-foreground">
            공고를 삭제하면 등록된 일정과 자료 연결도 함께 사라집니다.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={removePosting}
            className="h-8 rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />공고 삭제
          </Button>
        </footer>
      </article>
      </div>

      <InterviewLaunchOverlay
        postingId={posting.id}
        companyName={posting.companyName}
        roleTitle={posting.roleTitle}
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
      />
    </div>
  );
}

/* ---------- 빌딩블록 ---------- */

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border-t border-b border-slate-200/80 bg-slate-50/40 px-6 py-2.5 dark:border-slate-800/80 dark:bg-slate-950/30">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {hint && (
          <p className="hidden text-[11px] leading-snug text-muted-foreground sm:block sm:max-w-[60%] sm:text-right">
            {hint}
          </p>
        )}
      </div>
      {hint && (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:hidden">
          {hint}
        </p>
      )}
    </div>
  );
}

function FormTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-slate-200/70 border-t border-slate-200/70 dark:divide-slate-800/70 dark:border-slate-800/70">
      {children}
    </div>
  );
}

function FormRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr]">
      <div className="flex flex-col gap-0.5 border-b border-slate-200/70 bg-slate-50/50 px-6 py-3 sm:border-b-0 sm:border-r dark:border-slate-800/70 dark:bg-slate-950/30">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {hint && (
          <span className="text-[11px] leading-snug text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      <div className="px-6 py-3 text-sm text-foreground">{children}</div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-t border-slate-200/70 px-4 py-2 text-left font-semibold dark:border-slate-800/70",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-slate-200/70 px-4 py-2 align-middle text-sm dark:border-slate-800/70",
        className,
      )}
    >
      {children}
    </td>
  );
}

function ScheduleTableRow({
  schedule,
  onRemove,
}: {
  schedule: ScheduleRecord;
  onRemove: () => void;
}) {
  return (
    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30">
      <Td>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: KIND_COLOR[schedule.kind] }}
          />
          <span className="font-medium" style={{ color: KIND_COLOR[schedule.kind] }}>
            {KIND_LABEL[schedule.kind]}
          </span>
        </span>
      </Td>
      <Td className="tabular-nums text-muted-foreground">
        {DATE_TIME.format(new Date(schedule.startAt))}
        {schedule.endAt && (
          <>
            <span className="mx-1">~</span>
            {DATE_TIME.format(new Date(schedule.endAt))}
          </>
        )}
      </Td>
      <Td>
        {schedule.title ? (
          <span className="text-foreground">{schedule.title}</span>
        ) : (
          <EmptyValue />
        )}
        {schedule.memo && (
          <div className="mt-0.5 text-xs text-muted-foreground">{schedule.memo}</div>
        )}
      </Td>
      <Td className="text-right">
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          aria-label="일정 삭제"
          className="h-7 w-7"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </Td>
    </tr>
  );
}

function AttachmentTableRow({
  attachment,
  onRemove,
}: {
  attachment: AttachmentRecord;
  onRemove: () => void;
}) {
  const typeLabel =
    attachment.attachmentType === "resume"
      ? "이력서"
      : attachment.attachmentType === "cover_letter"
        ? "자기소개서"
        : attachment.attachmentType === "portfolio"
          ? "포트폴리오"
          : "프로젝트";
  const name =
    attachment.attachmentType === "resume"
      ? "이력서"
      : attachment.attachmentType === "cover_letter"
        ? attachment.coverLetterLabel ?? "자기소개서"
        : attachment.attachmentType === "portfolio"
          ? "포트폴리오"
          : attachment.projectLabel ?? "프로젝트";
  return (
    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30">
      <Td>
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80">
          {typeLabel}
        </span>
      </Td>
      <Td className="text-foreground">{name}</Td>
      <Td className="text-right">
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          aria-label="연결 해제"
          className="h-7 w-7"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </Td>
    </tr>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 leading-relaxed">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span
            aria-hidden
            className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyValue() {
  return <span className="text-muted-foreground/60">—</span>;
}

function TargetDocumentsBlock({
  resumes,
  coverLetters,
}: {
  resumes: TargetResumeRef[];
  coverLetters: TargetCoverLetterRef[];
}) {
  const isEmpty = resumes.length === 0 && coverLetters.length === 0;

  return (
    <div className="border-t border-slate-200/70 bg-white px-6 py-4 dark:border-slate-800/70 dark:bg-slate-900">
      {isEmpty ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            이 공고를 대상으로 작성된 자료가 아직 없습니다. 새 이력서·자기소개서를
            만들 때 우측 패널에서 이 공고를 선택하면 자동으로 이곳에 모입니다.
          </p>
          <TargetCreateLinks />
        </div>
      ) : (
        <div className="space-y-4">
          {resumes.length > 0 && (
            <TargetGroup
              label="이력서"
              count={resumes.length}
              items={resumes.map((r) => ({
                id: r.id,
                title: r.title || "(제목 없음)",
                href: "/career/resumes",
                updatedAt: r.updatedAt,
                badge: r.isActive ? "기본" : null,
              }))}
            />
          )}
          {coverLetters.length > 0 && (
            <TargetGroup
              label="자기소개서"
              count={coverLetters.length}
              items={coverLetters.map((c) => ({
                id: c.id,
                title: c.title || "(제목 없음)",
                href: "/career/cover-letters",
                updatedAt: c.updatedAt,
                badge: null,
              }))}
            />
          )}
          <TargetCreateLinks />
        </div>
      )}
    </div>
  );
}

function TargetGroup({
  label,
  count,
  items,
}: {
  label: string;
  count: number;
  items: Array<{
    id: string;
    title: string;
    href: string;
    updatedAt: string;
    badge: string | null;
  }>;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label} ({count})
      </h3>
      <ul className="mt-1.5 divide-y divide-slate-200/60 rounded-sm border border-slate-200/70 dark:divide-slate-800/60 dark:border-slate-800/70">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-foreground hover:bg-slate-50/70 dark:hover:bg-slate-950/40"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <span className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {DATE_TIME.format(new Date(item.updatedAt))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TargetCreateLinks() {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Button asChild size="sm" variant="outline" className="h-7 rounded-sm text-xs">
        <Link href="/career/resumes">이력서 만들기</Link>
      </Button>
      <Button asChild size="sm" variant="outline" className="h-7 rounded-sm text-xs">
        <Link href="/career/cover-letters">자기소개서 만들기</Link>
      </Button>
      <p className="text-[11px] text-muted-foreground">
        작성 화면에서 ‘지원 대상 공고’로 이 공고를 선택하세요.
      </p>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="border-t border-slate-200/70 bg-white px-6 py-8 text-center text-xs text-muted-foreground dark:border-slate-800/70 dark:bg-slate-900">
      {message}
    </div>
  );
}
