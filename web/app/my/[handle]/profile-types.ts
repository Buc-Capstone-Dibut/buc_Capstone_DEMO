export type TabKey = "overview" | "content" | "bookmarks" | "activity";

export type ContentTabKey = "posts" | "comments";

export type ProfileDataKey = ContentTabKey | "bookmarks" | "activity";

export type BookmarkView = "card" | "list";

export interface PaginationState {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ProfileWorkspaceItem {
  id: string;
  name: string;
  iconUrl: string | null;
  category: string;
  role: string;
  startedAt: string | null;
  joinedAt: string | null;
  lifecycleStatus: "IN_PROGRESS" | "COMPLETED";
  completedAt: string | null;
  resultType: string | null;
  resultLink: string | null;
  resultNote: string | null;
  stats: {
    docsCreated: number;
    tasksAssigned: number;
    messagesSent: number;
    totalActivities: number;
  };
}

export interface ResumePayload {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    intro: string;
    links: {
      github?: string;
      blog?: string;
      [key: string]: string | undefined;
    };
  };
  education: unknown[];
  experience: Array<{
    id?: string;
    company: string;
    position: string;
    period: string;
    description: string;
  }>;
  timeline?: Array<{
    id?: string;
    company: string;
    position: string;
    period: string;
    description: string;
    tags?: string[];
    techStack?: string[];
    representativeImage?: {
      url: string;
      storagePath?: string;
      bucket?: string;
      alt?: string;
      caption?: string;
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      updatedAt?: string;
    };
    situation?: string;
    role?: string;
    solution?: string;
    difficulty?: string;
    result?: string;
    lesson?: string;
  }>;
  skills: Array<{ name: string; level: string; category?: string }>;
  selfIntroduction: string;
  projects: Array<{
    id?: string;
    name: string;
    period: string;
    description: string;
    techStack: string[];
    achievements: string[];
    tags?: string[];
    representativeImage?: {
      url: string;
      storagePath?: string;
      bucket?: string;
      alt?: string;
      caption?: string;
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      updatedAt?: string;
    };
    situation?: string;
    role?: string;
    solution?: string;
    difficulty?: string;
    result?: string;
    lesson?: string;
  }>;
  coverLetters?: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    sourceExperienceIds: string[];
    sourceExperienceSnapshot?: Array<{
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
    }>;
    applicationTarget?: string;
    company?: string;
    division?: string;
    role?: string;
    deadline?: string;
    workspaceName?: string;
    colorTag?: string;
    questions?: Array<{
      id: string;
      title: string;
      maxChars: number;
      answer?: string;
      status?: "draft" | "done";
      updatedAt?: string;
    }>;
    chatHistory?: Array<{
      role: "user" | "assistant";
      content: string;
      createdAt?: string;
      suggestedAnswer?: string;
    }>;
    perQuestionChatHistory?: Record<
      string,
      Array<{
        role: "user" | "assistant";
        content: string;
        createdAt?: string;
        suggestedAnswer?: string;
      }>
    >;
    perQuestionWorkflow?: Record<
      string,
      {
        stage: "direction" | "draft" | "refine" | "confirm";
        directionAgreedAt?: string;
        draftRequestedAt?: string;
        refineCount?: number;
        confirmedAt?: string;
        competency?: boolean;
        tone?: boolean;
        impact?: boolean;
        ready?: boolean;
      }
    >;
  }>;
}

export interface PublicResumeSummary {
  resumeTitle?: string;
  headline?: string;
  topSkills?: string[];
  recentExperience?: Array<{
    company: string;
    position: string;
    period: string;
  }>;
  topProjects?: Array<{
    name: string;
    techStack: string[];
  }>;
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
  workspaceSummary: Record<string, unknown> | null;
  isOwner: boolean;
  posts: ProfilePostItem[];
  comments: ProfileCommentItem[];
  bookmarks: ProfileBookmarkItem[];
  workspaces: ProfileWorkspaceItem[];
  prefetchedData?: Partial<Record<ProfileDataKey, boolean>>;
  pagination?: Partial<Record<ProfileDataKey, PaginationState>>;
}
