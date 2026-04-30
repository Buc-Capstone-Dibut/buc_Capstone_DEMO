import type { ProjectInput } from "@/app/career/projects/types";

export type ProjectArchiveFormData = Partial<ProjectInput>;
export type ProjectArchiveViewMode = "cards" | "timeline";

export interface ProjectArchiveQuestionDraft {
  id: string;
  title: string;
  maxChars: number;
  answer?: string;
  status?: "draft" | "done";
  updatedAt?: string;
}

export interface ProjectArchiveWizardDraft {
  company: string;
  division: string;
  role: string;
  deadline: string;
  workspaceName: string;
  colorTag: string;
  questions: ProjectArchiveQuestionDraft[];
}

export interface ProjectArchiveSnapshotItem {
  id: string;
  title: string;
  tags: string[];
  techStack?: string[];
  period?: string;
  description?: string;
  situation?: string;
  role?: string;
  solution?: string;
  difficulty?: string;
  result?: string;
  lesson?: string;
}

export interface ProjectArchiveSeedQuestion {
  id: string;
  title: string;
  maxChars: number;
  answer: string;
  status: "draft" | "done";
  updatedAt: string;
}

export interface ProjectArchiveSeed {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  sourceExperienceIds: string[];
  sourceExperienceSnapshot: ProjectArchiveSnapshotItem[];
  applicationTarget: string;
  company: string;
  division?: string;
  role: string;
  deadline: string;
  workspaceName: string;
  colorTag: string;
  questions: ProjectArchiveSeedQuestion[];
  chatHistory: unknown[];
  perQuestionWorkflow: Record<string, { stage: "direction"; refineCount: number }>;
}
