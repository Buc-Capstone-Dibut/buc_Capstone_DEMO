export interface JobPostingDraft {
  companyName?: string;
  roleTitle?: string;
  techStack?: string[];
  responsibilities?: string[];
  requirements?: string[];
  memo?: string;
}

export interface ImportSourceAdapter<TRow> {
  key: "resume" | "cover_letter";
  extractSuggestion(row: TRow): JobPostingDraft;
}
