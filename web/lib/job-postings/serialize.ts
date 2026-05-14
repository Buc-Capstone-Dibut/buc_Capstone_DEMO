import type {
  AttachmentRecord,
  CoverLetterRecord,
  JobPostingRecord,
  JobPostingStatus,
  ScheduleKind,
  ScheduleRecord,
  AttachmentType,
} from "./types";

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return "";
}

function toIsoStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

export function toRecord(row: any): JobPostingRecord {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    roleTitle: row.role_title,
    postingUrl: row.posting_url ?? null,
    techStack: row.tech_stack ?? [],
    responsibilities: row.responsibilities ?? [],
    requirements: row.requirements ?? [],
    preferred: row.preferred ?? [],
    companyDescription: row.company_description ?? null,
    teamCulture: row.team_culture ?? [],
    memo: row.memo ?? null,
    status: row.status as JobPostingStatus,
    isFavorite: row.is_favorite ?? false,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    schedules: (row.schedules ?? []).map(
      (s: any): ScheduleRecord => ({
        id: s.id,
        jobPostingId: s.job_posting_id,
        kind: s.kind as ScheduleKind,
        title: s.title ?? null,
        startAt: toIsoString(s.start_at),
        endAt: toIsoStringOrNull(s.end_at),
        memo: s.memo ?? null,
      }),
    ),
    attachments: (row.attachments ?? []).map(
      (a: any): AttachmentRecord => ({
        id: a.id,
        jobPostingId: a.job_posting_id,
        attachmentType: a.attachment_type as AttachmentType,
        resumeId: a.resume_id ?? null,
        coverLetterIndex: a.cover_letter_index ?? null,
        coverLetterLabel: a.cover_letter_label ?? null,
        coverLetterId: a.cover_letter_id ?? null,
        portfolioId: a.portfolio_id ?? null,
      }),
    ),
  };
}

export function serializeCoverLetter(row: any): CoverLetterRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? "",
    body: row.body ?? "",
    questions: Array.isArray(row.questions)
      ? row.questions
          .filter((q: unknown) => q && typeof q === "object")
          .map((q: any) => ({
            id: typeof q.id === "string" ? q.id : "",
            title: typeof q.title === "string" ? q.title : "",
            answer: typeof q.answer === "string" ? q.answer : "",
            maxChars:
              typeof q.maxChars === "number" && q.maxChars > 0 ? q.maxChars : 500,
            status: q.status === "done" ? "done" : "draft",
            updatedAt: typeof q.updatedAt === "string" ? q.updatedAt : undefined,
          }))
      : [],
    sourceResumeId: row.source_resume_id ?? null,
    sourceIndex: row.source_index ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    isActive: Boolean(row.is_active),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}
