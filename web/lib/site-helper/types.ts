export type SiteHelperCategory =
  | "core"
  | "insights"
  | "community"
  | "career"
  | "interview"
  | "workspace"
  | "account";

export interface SiteHelperKnowledgeItem {
  id: string;
  category: SiteHelperCategory;
  title: string;
  route: string;
  summary: string;
  keywords: string[];
  commonQuestions: string[];
  details?: string[];
}

export interface SiteHelperSource {
  id: string;
  title: string;
  route: string;
  summary: string;
  category: SiteHelperCategory;
  details?: string[];
  score: number;
}

export interface SiteHelperChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SiteHelperRetrieveResult {
  matches: SiteHelperSource[];
  currentPage: SiteHelperSource | null;
}
