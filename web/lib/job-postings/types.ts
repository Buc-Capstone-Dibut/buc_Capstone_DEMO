export type JobPostingStatus =
  | "active" | "applied" | "interviewing" | "closed" | "archived";

export type ScheduleKind =
  | "deadline" | "document_due" | "interview" | "other";

export type AttachmentType = "resume" | "cover_letter" | "portfolio" | "project";

/**
 * 사용자가 카드/폴더에 지정 가능한 색 프리셋. 자유 hex 대신 8개 토큰으로
 * 일관된 톤을 보장한다. visual-tokens.ts 의 COLOR_PRESET_BAR / DOT 와 매칭.
 */
export type ColorPreset =
  | "slate" | "red" | "orange" | "amber"
  | "emerald" | "sky" | "violet" | "pink";

export interface FolderInput {
  name: string;
  color?: ColorPreset | null;
  sortOrder?: number;
}

export interface FolderRecord {
  id: string;
  userId: string;
  name: string;
  color: ColorPreset | null;
  sortOrder: number;
  createdAt: string;
}

export interface JobPostingInput {
  companyName: string;
  roleTitle: string;
  postingUrl?: string | null;
  techStack?: string[];
  responsibilities?: string[];
  requirements?: string[];
  preferred?: string[];
  companyDescription?: string | null;
  teamCulture?: string[];
  memo?: string | null;
  status?: JobPostingStatus;
  folderId?: string | null;
  color?: ColorPreset | null;
  schedules?: Array<{
    kind: ScheduleKind;
    title?: string | null;
    startAt: string;
    endAt?: string | null;
    memo?: string | null;
  }>;
}

export interface JobPostingRecord {
  id: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  postingUrl: string | null;
  techStack: string[];
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
  companyDescription: string | null;
  teamCulture: string[];
  memo: string | null;
  status: JobPostingStatus;
  isFavorite: boolean;
  folderId: string | null;
  color: ColorPreset | null;
  createdAt: string;
  updatedAt: string;
  schedules?: ScheduleRecord[];
  attachments?: AttachmentRecord[];
}

export interface ScheduleRecord {
  id: string;
  jobPostingId: string;
  kind: ScheduleKind;
  title: string | null;
  startAt: string;
  endAt: string | null;
  memo: string | null;
}

export interface AttachmentRecord {
  id: string;
  jobPostingId: string;
  attachmentType: AttachmentType;
  resumeId: string | null;
  coverLetterIndex: number | null;
  coverLetterLabel: string | null;
  coverLetterId: string | null;
  portfolioId: string | null;
  projectId: string | null;
  projectLabel: string | null;
  snapshotPayload: Record<string, unknown> | null;
}

export interface CoverLetterQuestion {
  id: string;
  title: string;
  answer: string;
  maxChars: number;
  status: "draft" | "done";
  updatedAt?: string;
}

export interface CoverLetterRecord {
  id: string;
  userId: string;
  title: string;
  body: string;
  questions: CoverLetterQuestion[];
  sourceResumeId: string | null;
  sourceIndex: number | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
