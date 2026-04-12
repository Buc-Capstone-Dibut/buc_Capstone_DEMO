import type { ExperienceInput } from "@/app/career/experiences/actions";

export type ExperienceTimelineFormData = Partial<ExperienceInput>;

export interface ExperienceTimelineQuestionDraft {
  id: string;
  title: string;
  maxChars: number;
  answer?: string;
  status?: "draft" | "done";
  updatedAt?: string;
}

export interface ExperienceTimelineWizardDraft {
  company: string;
  division: string;
  role: string;
  deadline: string;
  workspaceName: string;
  colorTag: string;
  questions: ExperienceTimelineQuestionDraft[];
}

export interface ExperienceTimelineSnapshotItem {
  id: string;
  title: string;
  tags: string[];
  period?: string;
  description?: string;
  situation?: string;
  role?: string;
  solution?: string;
  difficulty?: string;
  result?: string;
  lesson?: string;
}

export interface ExperienceTimelineSeedQuestion {
  id: string;
  title: string;
  maxChars: number;
  answer: string;
  status: "draft" | "done";
  updatedAt: string;
}

export interface ExperienceTimelineSeed {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  sourceExperienceIds: string[];
  sourceExperienceSnapshot: ExperienceTimelineSnapshotItem[];
  applicationTarget: string;
  company: string;
  division?: string;
  role: string;
  deadline: string;
  workspaceName: string;
  colorTag: string;
  questions: ExperienceTimelineSeedQuestion[];
  chatHistory: unknown[];
  perQuestionWorkflow: Record<string, { stage: "direction"; refineCount: number }>;
}
