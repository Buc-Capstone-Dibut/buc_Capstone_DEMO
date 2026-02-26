export type TabKey = "posts" | "comments" | "bookmarks" | "resume" | "activity";

export type BookmarkView = "card" | "list";

export interface ActivityHeatmapPoint {
  date: string;
  count: number;
  level: number;
}

export interface ResumePayload {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    intro: string;
    links: { github?: string; blog?: string; [key: string]: string | undefined };
  };
  education: unknown[];
  experience: Array<{
    company: string;
    position: string;
    period: string;
    description: string;
  }>;
  skills: Array<{ name: string; level: string; category?: string }>;
  projects: Array<{
    name: string;
    period: string;
    description: string;
    techStack: string[];
    achievements: string[];
  }>;
}

export interface PublicResumeSummary {
  headline?: string;
  topSkills?: string[];
  [key: string]: unknown;
}

export interface ProfileSummary {
  id: string;
  handle: string;
  nickname: string | null;
  avatarUrl: string | null;
  bio: string | null;
  techStack: string[];
  reputation: number;
  tier: string;
}

export interface ProfileStats {
  postCount: number;
  commentCount: number;
  workspaceCount: number;
  bookmarkCount: number;
}

export interface ProfilePostItem {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  views: number;
  likes: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProfileCommentItem {
  id: string;
  content: string;
  postId: string | null;
  postTitle: string;
  createdAt: string | null;
}

export interface ProfileBookmarkItem {
  id: string;
  createdAt: string | null;
  blog: {
    id: string;
    title: string | null;
    summary: string | null;
    author: string | null;
    tags: string[];
    externalUrl: string | null;
    thumbnailUrl: string | null;
    publishedAt: string | null;
  } | null;
}

export interface InitialData {
  profile: ProfileSummary;
  stats: ProfileStats;
  resumeSummary: PublicResumeSummary | null;
  workspaceSummary: Record<string, unknown> | null;
  isOwner: boolean;
  posts: ProfilePostItem[];
  comments: ProfileCommentItem[];
  bookmarks: ProfileBookmarkItem[];
  heatmap: ActivityHeatmapPoint[];
  resumePayload: unknown;
}
