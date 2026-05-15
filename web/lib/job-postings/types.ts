export type JobPostingStatus =
  | "active" | "applied" | "interviewing" | "closed" | "archived";

export type ScheduleKind =
  | "deadline" | "document_due" | "interview" | "other";

export type AttachmentType = "resume" | "cover_letter" | "portfolio" | "project";

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
