"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  ArrowRight,
  Bookmark,
  FileText,
  Github,
  LayoutDashboard,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
} from "lucide-react";
import type {
  BookmarkView,
  ContentTabKey,
  InitialData,
  ProfileBookmarkItem,
  ProfileDataKey,
  TabKey,
} from "./profile-types";
import { formatDate } from "./profile-utils";

const PostsTab = dynamic(() =>
  import("./tabs/posts-tab").then((module) => module.PostsTab),
);
const CommentsTab = dynamic(() =>
  import("./tabs/comments-tab").then((module) => module.CommentsTab),
);
const BookmarksTab = dynamic(() =>
  import("./tabs/bookmarks-tab").then((module) => module.BookmarksTab),
);
const WorkspaceActivityTab = dynamic(() =>
  import("./tabs/workspace-activity-tab").then(
    (module) => module.WorkspaceActivityTab,
  ),
);

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input === "object" && input !== null) {
    return input as Record<string, unknown>;
  }
  return {};
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toBookmarkItem(item: unknown): ProfileBookmarkItem {
  const row = asRecord(item);
  const blogRow = asRecord(row.blog);

  const idRaw = row.id;
  const id =
    typeof idRaw === "string" || typeof idRaw === "number" ? String(idRaw) : "";

  const hasBlog = Object.keys(blogRow).length > 0;
  const blog = hasBlog
    ? {
        id: String(blogRow.id ?? ""),
        title: readNullableString(blogRow.title),
        summary: readNullableString(blogRow.summary),
        author: readNullableString(blogRow.author),
        tags: readStringArray(blogRow.tags),
        externalUrl: readNullableString(blogRow.externalUrl),
        thumbnailUrl: readNullableString(blogRow.thumbnailUrl),
        publishedAt: readNullableString(blogRow.publishedAt),
      }
    : null;

  return {
    id,
    createdAt: readNullableString(row.createdAt),
    blog,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.length > 0) return error;
  return fallback;
}

type PortfolioSummary = {
  links: {
    github: string;
    blog: string;
  };
};

const EMPTY_PORTFOLIO_SUMMARY: PortfolioSummary = {
  links: {
    github: "",
    blog: "",
  },
};

function parsePortfolioSummary(
  input: Record<string, unknown> | null,
): PortfolioSummary {
  if (!input) return EMPTY_PORTFOLIO_SUMMARY;
  const linksSource = asRecord(input.links);
  const links = Object.keys(linksSource).length > 0 ? linksSource : input;
  return {
    links: {
      github: readNullableString(links.github) || "",
      blog: readNullableString(links.blog) || "",
    },
  };
}

function CompactEmptyState({
  icon: Icon,
  message,
}: {
  icon: ElementType;
  message: string;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      <Icon className="h-5 w-5 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

function CompactLoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  );
}

const TIER_BADGE: Record<string, string> = {
  씨앗:
    "border-zinc-300/70 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/30",
  새싹:
    "border-lime-400/70 text-lime-700 dark:text-lime-300 bg-lime-50 dark:bg-lime-900/20",
  묘목:
    "border-emerald-400/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20",
  나무:
    "border-green-500/70 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20",
  숲: "border-teal-500/70 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20",
  거목:
    "border-cyan-500/70 text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20",

  Unranked:
    "border-zinc-300/70 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/30",
  Bronze:
    "border-lime-400/70 text-lime-700 dark:text-lime-300 bg-lime-50 dark:bg-lime-900/20",
  Silver:
    "border-emerald-400/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20",
  Gold: "border-green-500/70 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20",
  Platinum: "border-teal-500/70 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20",
  Diamond:
    "border-cyan-500/70 text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20",
};

const NAV_ITEMS: {
  key: TabKey;
  label: string;
  description: string;
  icon: ElementType;
}[] = [
  {
    key: "overview",
    label: "개요",
    description: "내 활동을 한눈에 보는 대시보드",
    icon: LayoutDashboard,
  },
  {
    key: "content",
    label: "콘텐츠",
    description: "글과 댓글을 함께 관리",
    icon: FileText,
  },
  {
    key: "bookmarks",
    label: "북마크",
    description: "저장한 아티클 모아보기",
    icon: Bookmark,
  },
  {
    key: "activity",
    label: "스페이스",
    description: "워크스페이스 활동 기록",
    icon: Activity,
  },
];

const CONTENT_VIEWS: {
  key: ContentTabKey;
  label: string;
  icon: ElementType;
}[] = [
  { key: "posts", label: "글", icon: FileText },
  { key: "comments", label: "댓글", icon: MessageSquare },
];

export function ProfileClient({ initialData }: { initialData: InitialData }) {
  const router = useRouter();
  const { toast } = useToast();
  const pendingLoads = useRef<Set<ProfileDataKey>>(new Set());

  const [saving, setSaving] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [contentView, setContentView] = useState<ContentTabKey>("posts");
  const [bookmarkView, setBookmarkView] = useState<BookmarkView>("card");

  const [profile, setProfile] = useState(initialData.profile);
  const [stats] = useState(initialData.stats);
  const [posts, setPosts] = useState(initialData.posts || []);
  const [comments, setComments] = useState(initialData.comments || []);
  const [bookmarks, setBookmarks] = useState(initialData.bookmarks || []);
  const [workspaces, setWorkspaces] = useState(initialData.workspaces || []);
  const isOwner = initialData.isOwner;
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary>(
    parsePortfolioSummary(initialData.workspaceSummary),
  );
  const prefetchedData = initialData.prefetchedData || {};
  const [dataLoading, setDataLoading] = useState<
    Partial<Record<ProfileDataKey, boolean>>
  >({
    posts: !Boolean(prefetchedData.posts),
    comments: !Boolean(prefetchedData.comments),
    bookmarks: !Boolean(prefetchedData.bookmarks),
    activity: !Boolean(prefetchedData.activity),
  });
  const [dataLoaded, setDataLoaded] = useState<
    Partial<Record<ProfileDataKey, boolean>>
  >({
    posts: Boolean(prefetchedData.posts),
    comments: Boolean(prefetchedData.comments),
    bookmarks: Boolean(prefetchedData.bookmarks),
    activity: Boolean(prefetchedData.activity),
  });
  const [dataError, setDataError] = useState<
    Partial<Record<ProfileDataKey, string>>
  >({});

  const [profileForm, setProfileForm] = useState({
    nickname: initialData.profile.nickname || "",
    bio: initialData.profile.bio || "",
    techStack: (initialData.profile.techStack || []).join(", "),
    github: portfolioSummary.links.github,
    blog: portfolioSummary.links.blog,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get("tab") as TabKey | null;
    const content = searchParams.get("content") as ContentTabKey | null;

    if (tab && NAV_ITEMS.some((item) => item.key === tab)) {
      setActiveTab(tab);
    }
    if (content && CONTENT_VIEWS.some((item) => item.key === content)) {
      setContentView(content);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);

    if (activeTab === "content") {
      url.searchParams.set("content", contentView);
    } else {
      url.searchParams.delete("content");
    }

    window.history.replaceState({}, "", url);
  }, [activeTab, contentView]);

  const loadData = useCallback(
    async (key: ProfileDataKey) => {
      if (dataLoaded[key] || pendingLoads.current.has(key)) return;

      pendingLoads.current.add(key);
      setDataLoading((prev) => ({ ...prev, [key]: true }));
      setDataError((prev) => ({ ...prev, [key]: "" }));

      try {
        if (key === "posts") {
          const res = await fetch(
            `/api/my/content/posts?profileId=${encodeURIComponent(profile.id)}`,
            { cache: "no-store" },
          );
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "글을 불러오지 못했습니다.");
          }
          setPosts(json?.data?.items || []);
        }

        if (key === "comments") {
          const res = await fetch(
            `/api/my/content/comments?profileId=${encodeURIComponent(profile.id)}`,
            { cache: "no-store" },
          );
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "댓글을 불러오지 못했습니다.");
          }
          setComments(json?.data?.items || []);
        }

        if (key === "bookmarks") {
          const res = await fetch(
            `/api/my/bookmarks?profileId=${encodeURIComponent(profile.id)}`,
            { cache: "no-store" },
          );
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "북마크를 불러오지 못했습니다.");
          }
          const rawItems = Array.isArray(json?.data?.items)
            ? json.data.items
            : [];
          setBookmarks(rawItems.map(toBookmarkItem));
        }

        if (key === "activity") {
          const res = await fetch(
            `/api/my/activity/workspace?profileId=${encodeURIComponent(profile.id)}`,
            { cache: "no-store" },
          );
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(
              json?.error || "스페이스 활동 기록을 불러오지 못했습니다.",
            );
          }
          setWorkspaces(json?.data?.workspaces || []);
        }

        setDataLoaded((prev) => ({ ...prev, [key]: true }));
      } catch (error: unknown) {
        const message = getErrorMessage(error, "데이터를 불러오지 못했습니다.");
        setDataError((prev) => ({ ...prev, [key]: message }));
        toast({
          title: "불러오기 실패",
          description: message,
          variant: "destructive",
        });
      } finally {
        pendingLoads.current.delete(key);
        setDataLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [dataLoaded, profile.id, toast],
  );

  const requiredKeys = useMemo(() => {
    if (activeTab === "overview") {
      return ["comments", "bookmarks", "activity"] as ProfileDataKey[];
    }
    if (activeTab === "content") {
      return [contentView] as ProfileDataKey[];
    }
    if (activeTab === "bookmarks") {
      return ["bookmarks"] as ProfileDataKey[];
    }
    if (activeTab === "activity") {
      return ["activity"] as ProfileDataKey[];
    }
    return [] as ProfileDataKey[];
  }, [activeTab, contentView]);

  useEffect(() => {
    requiredKeys.forEach((key) => {
      if (!dataLoaded[key] && !dataLoading[key]) {
        void loadData(key);
      }
    });
  }, [requiredKeys, dataLoaded, dataLoading, loadData]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const summaryPayload = {
        version: 1,
        links: {
          github: profileForm.github,
          blog: profileForm.blog,
        },
      };

      const [profileRes, workspaceRes] = await Promise.all([
        fetch("/api/my/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nickname: profileForm.nickname,
            bio: profileForm.bio,
            techStack: profileForm.techStack
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          }),
        }),
        fetch("/api/my/workspace-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicSummary: summaryPayload,
          }),
        }),
      ]);

      const profileJson = await profileRes.json();
      const workspaceJson = await workspaceRes.json();
      if (!profileRes.ok || !profileJson?.success) {
        throw new Error(profileJson?.error || "프로필 저장 실패");
      }
      if (!workspaceRes.ok || !workspaceJson?.success) {
        throw new Error(workspaceJson?.error || "링크 저장 실패");
      }

      toast({ title: "프로필이 저장되었습니다." });
      setEditSheetOpen(false);

      const nextPortfolio = parsePortfolioSummary(
        asRecord(workspaceJson?.data?.publicSummary ?? summaryPayload),
      );
      setPortfolioSummary(nextPortfolio);

      setProfile((prev) => ({
        ...prev,
        nickname: profileJson.data.nickname ?? prev.nickname,
        avatarUrl: profileJson.data.avatarUrl ?? prev.avatarUrl,
        bio: profileJson.data.bio ?? prev.bio,
        techStack: profileJson.data.techStack ?? prev.techStack,
      }));
    } catch (err: unknown) {
      toast({
        title: "저장 실패",
        description: getErrorMessage(
          err,
          "프로필 저장 중 오류가 발생했습니다.",
        ),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removePost = async (postId: string) => {
    if (!confirm("해당 글을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "삭제 실패", variant: "destructive" });
      return;
    }
    setPosts((prev) => prev.filter((item) => item.id !== postId));
  };

  const removeComment = async (commentId: string) => {
    if (!confirm("해당 댓글을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "삭제 실패", variant: "destructive" });
      return;
    }
    setComments((prev) => prev.filter((item) => item.id !== commentId));
  };

  const handleTabChange = (
    nextTab: TabKey,
    nextContentView?: ContentTabKey,
  ) => {
    setActiveTab(nextTab);
    if (nextContentView) {
      setContentView(nextContentView);
    }
  };

  const tierStyle =
    TIER_BADGE[profile.tier] ?? "border-muted text-muted-foreground";

  const displayStats = {
    postCount: dataLoaded.posts ? posts.length : stats.postCount,
    commentCount: dataLoaded.comments ? comments.length : stats.commentCount,
    bookmarkCount: dataLoaded.bookmarks ? bookmarks.length : stats.bookmarkCount,
    workspaceCount: dataLoaded.activity ? workspaces.length : stats.workspaceCount,
  };

  const contentCount = displayStats.postCount + displayStats.commentCount;
  const featuredWorkspaces = workspaces.slice(0, 3);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative h-40 overflow-hidden shrink-0 sm:h-48">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/45 via-primary/15 to-background" />
        <div className="absolute -right-10 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-[28%] top-8 h-36 w-36 rounded-full bg-emerald-200/40 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 sm:px-6 lg:px-8">
        <div className="-mt-14 mb-8 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl sm:h-28 sm:w-28">
              <AvatarImage src={profile.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-3xl font-bold text-primary">
                {(profile.nickname || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {profile.nickname || "사용자"}
                </h1>
                {isOwner && (
                  <Badge className="h-5 border-primary/20 bg-primary/10 px-1.5 text-[10px] font-normal text-primary">
                    내 프로필
                  </Badge>
                )}
                {profile.tier && (
                  <Badge
                    variant="outline"
                    className={`h-5 px-1.5 text-[10px] font-normal ${tierStyle}`}
                  >
                    ★ {profile.tier}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="h-5 border-primary/30 px-1.5 text-[10px] font-normal text-primary"
                >
                  점수 {Math.max(0, profile.reputation || 0).toLocaleString()}
                </Badge>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {profile.bio || "내 활동과 아카이브를 대시보드로 정리할 수 있는 공간입니다."}
              </p>
            </div>
          </div>
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="self-start gap-1.5 sm:self-auto"
              onClick={() => setEditSheetOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              프로필 편집
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <div className="border-b border-border/70">
            <div className="flex min-w-max items-center gap-6 overflow-x-auto px-1">
              {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key;
                const count =
                  key === "overview"
                    ? undefined
                    : key === "content"
                      ? contentCount
                      : key === "bookmarks"
                        ? displayStats.bookmarkCount
                        : displayStats.workspaceCount;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTabChange(key)}
                    className={[
                      "relative inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-semibold transition-colors",
                      isActive
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    {typeof count === "number" && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="space-y-4 xl:sticky xl:top-20">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">티어</CardTitle>
                      <CardDescription className="mt-1">
                        현재 프로필 등급입니다.
                      </CardDescription>
                    </div>
                    <Link
                      href="/tier-system"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      자세히 보기
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border bg-muted/20 px-4 py-6 text-center">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Rank
                    </p>
                    <div className="mt-3 flex justify-center">
                      <Badge
                        variant="outline"
                        className={`h-8 px-3 text-sm font-medium ${tierStyle}`}
                      >
                        ★ {profile.tier}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">링크</CardTitle>
                  <CardDescription>
                    외부 포트폴리오와 주요 링크를 정리합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {portfolioSummary.links.github && (
                    <a
                      href={portfolioSummary.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        GitHub
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                  {portfolioSummary.links.blog && (
                    <a
                      href={portfolioSummary.links.blog}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Blog
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                  {!portfolioSummary.links.github && !portfolioSummary.links.blog && (
                    <p className="text-sm text-muted-foreground">
                      아직 등록된 외부 링크가 없습니다.
                    </p>
                  )}
                </CardContent>
              </Card>
            </aside>

            <section className="min-w-0 space-y-6">
              {activeTab === "overview" && (
                <>
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/10 pb-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <CardTitle className="text-xl">소개</CardTitle>
                          <CardDescription>
                            프로필 소개와 핵심 상태를 한 화면에 배치했습니다.
                          </CardDescription>
                        </div>
                        {isOwner && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setEditSheetOpen(true)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            프로필 편집
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 py-6">
                      <div className="space-y-4">
                        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                          {profile.bio ||
                            "아직 소개가 없습니다. 이 영역은 내 성향, 관심사, 현재 집중하고 있는 기술과 프로젝트를 한눈에 보여주는 공간입니다."}
                        </p>
                        {profile.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {profile.techStack.map((tech) => (
                              <Badge key={tech} variant="secondary">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 xl:grid-cols-3">
                    <Card className="min-h-[320px]">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">최근 글</CardTitle>
                            <CardDescription>
                              최근에 작성한 게시글을 바로 확인합니다.
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 px-2"
                            onClick={() => handleTabChange("content", "posts")}
                          >
                            전체
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {dataLoading.posts && posts.length === 0 ? (
                          <CompactLoadingState message="글을 불러오는 중..." />
                        ) : dataError.posts ? (
                          <CompactEmptyState
                            icon={FileText}
                            message={dataError.posts}
                          />
                        ) : posts.length === 0 ? (
                          <CompactEmptyState
                            icon={FileText}
                            message="작성한 글이 없습니다."
                          />
                        ) : (
                          posts.slice(0, 4).map((post) => (
                            <button
                              key={post.id}
                              type="button"
                              onClick={() =>
                                router.push(`/community/board/${post.id}`)
                              }
                              className="w-full rounded-xl border px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/20"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold">
                                  {post.title}
                                </p>
                                {post.createdAt && (
                                  <span className="shrink-0 text-[11px] text-muted-foreground">
                                    {formatDate(post.createdAt)}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                {post.category && (
                                  <span className="rounded-full bg-muted px-2 py-0.5">
                                    {post.category}
                                  </span>
                                )}
                                <span>좋아요 {post.likes ?? 0}</span>
                                <span>조회 {post.views ?? 0}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="min-h-[320px]">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">최근 댓글</CardTitle>
                            <CardDescription>
                              어떤 글에 참여했는지 바로 이어서 볼 수 있습니다.
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 px-2"
                            onClick={() => handleTabChange("content", "comments")}
                          >
                            전체
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {dataLoading.comments && comments.length === 0 ? (
                          <CompactLoadingState message="댓글을 불러오는 중..." />
                        ) : dataError.comments ? (
                          <CompactEmptyState
                            icon={MessageSquare}
                            message={dataError.comments}
                          />
                        ) : comments.length === 0 ? (
                          <CompactEmptyState
                            icon={MessageSquare}
                            message="작성한 댓글이 없습니다."
                          />
                        ) : (
                          comments.slice(0, 4).map((comment) => (
                            <button
                              key={comment.id}
                              type="button"
                              onClick={() => {
                                if (!comment.postId) return;
                                router.push(`/community/board/${comment.postId}`);
                              }}
                              className="w-full rounded-xl border px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/20"
                            >
                              <p className="line-clamp-3 text-sm leading-relaxed">
                                {comment.content}
                              </p>
                              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="truncate font-medium">
                                  {comment.postTitle || "원문 없음"}
                                </span>
                                {comment.createdAt && (
                                  <span className="shrink-0">
                                    {formatDate(comment.createdAt)}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="min-h-[320px]">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">북마크</CardTitle>
                            <CardDescription>
                              저장한 콘텐츠를 다시 읽기 쉬운 목록으로 정리합니다.
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 px-2"
                            onClick={() => handleTabChange("bookmarks")}
                          >
                            전체
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {dataLoading.bookmarks && bookmarks.length === 0 ? (
                          <CompactLoadingState message="북마크를 불러오는 중..." />
                        ) : dataError.bookmarks ? (
                          <CompactEmptyState
                            icon={Bookmark}
                            message={dataError.bookmarks}
                          />
                        ) : bookmarks.length === 0 ? (
                          <CompactEmptyState
                            icon={Bookmark}
                            message="북마크한 글이 없습니다."
                          />
                        ) : (
                          bookmarks.slice(0, 4).map((bookmark) => (
                            <button
                              key={bookmark.id}
                              type="button"
                              onClick={() => {
                                if (!bookmark.blog?.externalUrl) return;
                                window.open(
                                  bookmark.blog.externalUrl,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              }}
                              className="w-full rounded-xl border px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/20"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="line-clamp-2 text-sm font-semibold">
                                  {bookmark.blog?.title || "제목 없음"}
                                </p>
                                {bookmark.blog?.publishedAt && (
                                  <span className="shrink-0 text-[11px] text-muted-foreground">
                                    {formatDate(bookmark.blog.publishedAt)}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                {bookmark.blog?.author && (
                                  <span>{bookmark.blog.author}</span>
                                )}
                                {(bookmark.blog?.tags || []).slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-primary/8 px-1.5 py-0.5 text-primary"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </button>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">스페이스 활동</CardTitle>
                          <CardDescription>
                            참여한 스페이스를 최근 기준으로 바로 확인합니다.
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 px-2"
                          onClick={() => handleTabChange("activity")}
                        >
                          전체
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dataLoading.activity && workspaces.length === 0 ? (
                        <CompactLoadingState message="스페이스를 불러오는 중..." />
                      ) : dataError.activity ? (
                        <CompactEmptyState
                          icon={Activity}
                          message={dataError.activity}
                        />
                      ) : featuredWorkspaces.length === 0 ? (
                        <CompactEmptyState
                          icon={Activity}
                          message="참여 중인 스페이스 활동이 없습니다."
                        />
                      ) : (
                        featuredWorkspaces.map((workspace) => (
                          <div
                            key={workspace.id}
                            className="rounded-xl border px-4 py-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {workspace.name}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {workspace.category || "스페이스"} ·{" "}
                                  {workspace.role === "owner" ? "리더" : "멤버"}
                                </p>
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                  참여 시작{" "}
                                  {formatDate(
                                    workspace.startedAt || workspace.joinedAt,
                                  )}
                                  {workspace.completedAt
                                    ? ` · 종료 ${formatDate(workspace.completedAt)}`
                                    : ""}
                                </p>
                              </div>
                              {workspace.resultLink && (
                                <a
                                  href={workspace.resultLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
                                >
                                  결과 링크
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                            {workspace.resultNote && (
                              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                {workspace.resultNote}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

            {activeTab === "content" && (
              <Card>
                <CardHeader className="gap-4 pb-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-xl">콘텐츠 활동</CardTitle>
                      <CardDescription>
                        글과 댓글을 한 곳에서 오가며 확인할 수 있도록 묶었습니다.
                      </CardDescription>
                    </div>
                    <div className="inline-flex rounded-xl border bg-muted/30 p-1">
                      {CONTENT_VIEWS.map(({ key, label, icon: Icon }) => {
                        const isActive = contentView === key;
                        const count =
                          key === "posts"
                            ? displayStats.postCount
                            : displayStats.commentCount;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setContentView(key)}
                            className={[
                              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                            ].join(" ")}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {contentView === "posts" ? (
                    <PostsTab
                      loading={dataLoading.posts}
                      error={dataError.posts}
                      posts={posts}
                      isOwner={isOwner}
                      onOpenPost={(postId) =>
                        router.push(`/community/board/${postId}`)
                      }
                      onRemovePost={removePost}
                    />
                  ) : (
                    <CommentsTab
                      loading={dataLoading.comments}
                      error={dataError.comments}
                      comments={comments}
                      isOwner={isOwner}
                      onOpenCommentPost={(postId) => {
                        if (!postId) return;
                        router.push(`/community/board/${postId}`);
                      }}
                      onRemoveComment={removeComment}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "bookmarks" && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">북마크 아카이브</CardTitle>
                  <CardDescription>
                    저장한 콘텐츠를 카드형과 리스트형으로 오가며 볼 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BookmarksTab
                    loading={dataLoading.bookmarks}
                    error={dataError.bookmarks}
                    bookmarks={bookmarks}
                    bookmarkView={bookmarkView}
                    onChangeBookmarkView={setBookmarkView}
                    totalCount={displayStats.bookmarkCount}
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === "activity" && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">스페이스 활동</CardTitle>
                  <CardDescription>
                    참여한 워크스페이스를 한 페이지에서 바로 확인합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkspaceActivityTab
                    loading={dataLoading.activity}
                    error={dataError.activity}
                    workspaces={workspaces}
                  />
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>

      {isOwner && (
        <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
          <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
            <SheetHeader className="border-b px-6 pb-4 pt-6">
              <SheetTitle>프로필 편집</SheetTitle>
              <SheetDescription>
                변경 사항은 저장 즉시 반영됩니다.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1">
              <div className="space-y-5 px-6 py-5">
                <div className="flex items-center gap-4 rounded-xl border border-dashed bg-muted/40 p-4">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarImage src={profile.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                      {(profileForm.nickname || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{profile.nickname}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      프로필 기본 정보
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nickname">닉네임</Label>
                  <Input
                    id="nickname"
                    value={profileForm.nickname}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        nickname: event.target.value,
                      }))
                    }
                    maxLength={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">소개</Label>
                  <Textarea
                    id="bio"
                    value={profileForm.bio}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        bio: event.target.value,
                      }))
                    }
                    rows={5}
                    placeholder="자신을 소개해 주세요."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tech-stack">기술 스택</Label>
                  <Input
                    id="tech-stack"
                    value={profileForm.techStack}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        techStack: event.target.value,
                      }))
                    }
                    placeholder="React, TypeScript, Python"
                  />
                  <p className="text-xs text-muted-foreground">
                    쉼표로 구분해 입력합니다.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="github">GitHub 링크</Label>
                  <Input
                    id="github"
                    value={profileForm.github}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        github: event.target.value,
                      }))
                    }
                    placeholder="https://github.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blog">블로그 링크</Label>
                  <Input
                    id="blog"
                    value={profileForm.blog}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        blog: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </ScrollArea>
            <SheetFooter className="border-t px-6 py-4">
              <Button onClick={saveProfile} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                저장하기
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
