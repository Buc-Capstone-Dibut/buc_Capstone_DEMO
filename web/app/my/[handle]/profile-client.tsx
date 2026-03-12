"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Bookmark,
  BookOpen,
  FileText,
  Github,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
  Sparkles,
} from "lucide-react";
import type {
  BookmarkView,
  InitialData,
  ProfileBookmarkItem,
  ResumePayload,
  TabKey,
} from "./profile-types";
import { EMPTY_RESUME, normalizeResumePayload } from "./profile-utils";

const PostsTab = dynamic(() =>
  import("./tabs/posts-tab").then((module) => module.PostsTab),
);
const CommentsTab = dynamic(() =>
  import("./tabs/comments-tab").then((module) => module.CommentsTab),
);
const BookmarksTab = dynamic(() =>
  import("./tabs/bookmarks-tab").then((module) => module.BookmarksTab),
);
const ResumeTab = dynamic(() =>
  import("./tabs/resume-tab").then((module) => module.ResumeTab),
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

  // Backward compatibility for rows not migrated yet
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

const TABS: { key: TabKey; label: string; icon: ElementType }[] = [
  { key: "posts", label: "글", icon: FileText },
  { key: "comments", label: "댓글", icon: MessageSquare },
  { key: "bookmarks", label: "북마크", icon: Bookmark },
  { key: "activity", label: "스페이스 활동", icon: Activity },
];
// ─── Main Client Component ────────────────────────────────────────────────────

export function ProfileClient({ initialData }: { initialData: InitialData }) {
  const router = useRouter();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [bookmarkView, setBookmarkView] = useState<BookmarkView>("card");

  // Main payload is loaded lazily per tab to keep first paint fast.
  const [profile, setProfile] = useState(initialData.profile);
  const [stats] = useState(initialData.stats);
  const [resumeSummary, setResumeSummary] = useState(initialData.resumeSummary);
  const [posts, setPosts] = useState(initialData.posts || []);
  const [comments, setComments] = useState(initialData.comments || []);
  const [bookmarks, setBookmarks] = useState(initialData.bookmarks || []);
  const [workspaces, setWorkspaces] = useState(initialData.workspaces || []);
  const isOwner = initialData.isOwner;
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary>(
    parsePortfolioSummary(initialData.workspaceSummary),
  );
  const prefetchedTabs = initialData.prefetchedTabs || {};
  const [resumePayload, setResumePayload] = useState<ResumePayload>(
    normalizeResumePayload(initialData.resumePayload || null),
  );
  const [tabLoading, setTabLoading] = useState<
    Partial<Record<TabKey, boolean>>
  >({
    posts: !Boolean(prefetchedTabs.posts),
    comments: !Boolean(prefetchedTabs.comments),
    bookmarks: !Boolean(prefetchedTabs.bookmarks),
    activity: !Boolean(prefetchedTabs.activity),
    resume: !Boolean(prefetchedTabs.resume),
  });
  const [tabLoaded, setTabLoaded] = useState<Partial<Record<TabKey, boolean>>>({
    posts: Boolean(prefetchedTabs.posts),
    comments: Boolean(prefetchedTabs.comments),
    bookmarks: Boolean(prefetchedTabs.bookmarks),
    activity: Boolean(prefetchedTabs.activity),
    resume: Boolean(prefetchedTabs.resume),
  });
  const [tabError, setTabError] = useState<Partial<Record<TabKey, string>>>({});

  const visibleTabs = TABS;

  // Profile edit form — handle is NOT editable
  const [profileForm, setProfileForm] = useState({
    nickname: initialData.profile.nickname || "",
    bio: initialData.profile.bio || "",
    techStack: (initialData.profile.techStack || []).join(", "),
    github: portfolioSummary.links.github,
    blog: portfolioSummary.links.blog,
  });

  const tierStyle =
    TIER_BADGE[profile.tier] ?? "border-muted text-muted-foreground";
  const tabCounts: Partial<Record<TabKey, number>> = {
    posts: stats.postCount,
    comments: stats.commentCount,
    bookmarks: stats.bookmarkCount,
  };
  const bookmarkTotalCount = tabLoaded.bookmarks
    ? bookmarks.length
    : stats.bookmarkCount;
  const activeTabLoaded = Boolean(tabLoaded[activeTab]);

  useEffect(() => {
    let cancelled = false;

    const loadTabData = async () => {
      const tab = activeTab;
      if (activeTabLoaded) return;

      setTabLoading((prev) => ({ ...prev, [tab]: true }));
      setTabError((prev) => ({ ...prev, [tab]: "" }));

      try {
        if (tab === "posts") {
          const res = await fetch(
            `/api/my/content/posts?handle=${encodeURIComponent(profile.handle)}`,
            {
              cache: "no-store",
            },
          );
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "글을 불러오지 못했습니다.");
          }
          if (!cancelled) setPosts(json?.data?.items || []);
        }

        if (tab === "comments") {
          const res = await fetch(
            `/api/my/content/comments?handle=${encodeURIComponent(profile.handle)}`,
            {
              cache: "no-store",
            },
          );
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "댓글을 불러오지 못했습니다.");
          }
          if (!cancelled) setComments(json?.data?.items || []);
        }

        if (tab === "bookmarks") {
          const res = await fetch(
            `/api/my/bookmarks?handle=${encodeURIComponent(profile.handle)}`,
            {
              cache: "no-store",
            },
          );
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "북마크를 불러오지 못했습니다.");
          }
          if (!cancelled) {
            const rawItems = Array.isArray(json?.data?.items)
              ? json.data.items
              : [];
            const items = rawItems.map(toBookmarkItem);
            setBookmarks(items);
          }
        }

        if (tab === "activity") {
          const res = await fetch(
            `/api/my/activity/workspace?handle=${encodeURIComponent(profile.handle)}`,
            {
              cache: "no-store",
            },
          );
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(
              json?.error || "스페이스 활동 기록을 불러오지 못했습니다.",
            );
          }
          if (!cancelled) {
            setWorkspaces(json?.data?.workspaces || []);
          }
        }

        if (tab === "resume" && isOwner) {
          const res = await fetch("/api/my/resume/active", {
            cache: "no-store",
          });
          if (res.status === 404) {
            if (!cancelled) {
              setResumePayload(EMPTY_RESUME);
            }
          } else {
            const json = await res.json();
            if (!res.ok || !json?.success) {
              throw new Error(json?.error || "이력서를 불러오지 못했습니다.");
            }
            if (!cancelled) {
              setResumePayload(
                normalizeResumePayload(json?.data?.resumePayload || null),
              );
              setResumeSummary(json?.data?.publicSummary || null);
            }
          }
        }

        if (!cancelled) {
          setTabLoaded((prev) => ({ ...prev, [tab]: true }));
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const message = getErrorMessage(
            error,
            "데이터를 불러오지 못했습니다.",
          );
          setTabError((prev) => ({ ...prev, [tab]: message }));
          toast({
            title: "불러오기 실패",
            description: message,
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setTabLoading((prev) => ({ ...prev, [tab]: false }));
        }
      }
    };

    loadTabData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, activeTabLoaded, isOwner, profile.handle, toast]);

  // ── Actions ───────────────────────────────────────────────────────────────

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
              .map((v) => v.trim())
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

      // Update local state directly — no page reload needed
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

  const saveResume = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/my/resume/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumePayload,
          sourceType: "manual",
          sourceFileName: "마이페이지 입력",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success)
        throw new Error(json?.error || "이력서 저장 실패");
      setResumeSummary(json?.data?.publicSummary || resumeSummary);
      toast({ title: "이력서가 저장되었습니다." });
    } catch (err: unknown) {
      toast({
        title: "저장 실패",
        description: getErrorMessage(
          err,
          "이력서 저장 중 오류가 발생했습니다.",
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

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cover Banner */}
      <div className="relative h-36 sm:h-44 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/15 to-background" />
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute top-6 left-[38%] w-36 h-36 rounded-full bg-primary/8 blur-2xl pointer-events-none" />
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 pb-20">
        {/* Profile Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-16 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl shrink-0">
              <AvatarImage src={profile.avatarUrl ?? undefined} />
              <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                {(profile.nickname || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {profile.nickname || "사용자"}
                </h1>
                {isOwner && (
                  <Badge className="text-[10px] px-1.5 h-5 bg-primary/10 text-primary border-primary/20 font-normal">
                    내 프로필
                  </Badge>
                )}
                {profile.tier && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 h-5 font-normal ${tierStyle}`}
                  >
                    ★ {profile.tier}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 h-5 font-normal border-primary/30 text-primary"
                >
                  점수 {Math.max(0, profile.reputation || 0).toLocaleString()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            </div>
          </div>
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="self-start sm:self-auto shrink-0 gap-1.5"
              onClick={() => setEditSheetOpen(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
              프로필 편집
            </Button>
          )}
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[288px_1fr] gap-6 items-start">
          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-20">
            <Card className="overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {profile.bio ? (
                    profile.bio
                  ) : (
                    <span className="italic">소개가 없습니다.</span>
                  )}
                </p>
                {profile.techStack.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-1.5">
                      {profile.techStack.map((tech) => (
                        <Badge
                          key={tech}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-3 divide-x">
                  {[
                    { value: stats.postCount, label: "글" },
                    { value: stats.commentCount, label: "댓글" },
                    { value: stats.workspaceCount, label: "스페이스" },
                  ].map(({ value, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center py-5 gap-0.5"
                    >
                      <span className="text-2xl font-bold tabular-nums">
                        {value}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    링크
                  </span>
                </div>
                <Separator />
                {(portfolioSummary.links.github || portfolioSummary.links.blog) ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      {portfolioSummary.links.github && (
                        <a
                          href={portfolioSummary.links.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Github className="w-3 h-3" />
                          GitHub
                        </a>
                      )}
                      {portfolioSummary.links.blog && (
                        <a
                          href={portfolioSummary.links.blog}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Link2 className="w-3 h-3" />
                          Blog
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    외부 링크를 추가해 주세요.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      공개 이력서
                    </span>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] gap-1 px-2"
                      onClick={() => router.push("/resume?mode=setup")}
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      관리
                    </Button>
                  )}
                </div>
                <Separator />
                {resumeSummary?.headline ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-snug">
                      {resumeSummary.headline}
                    </p>
                    {(resumeSummary.topSkills || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(resumeSummary.topSkills as string[])
                          .slice(0, 5)
                          .map((s: string) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-[10px] h-4 px-1.5"
                            >
                              {s}
                            </Badge>
                          ))}
                      </div>
                    )}
                    <Badge className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-0">
                      면접 setup에 사용됨
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground italic">
                      이력서 정보가 없습니다.
                    </p>
                    {isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-2 py-5 border-dashed"
                        onClick={() => router.push("/resume?mode=setup")}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        AI와 함께 만들기
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Content */}
          <div className="min-w-0 space-y-4">
            {/* Tab Nav */}
            <div className="border-b">
              <nav className="flex" role="tablist">
                {visibleTabs.map(({ key, label, icon: Icon }) => {
                  const count = tabCounts[key];
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(key)}
                      className={[
                        "flex items-center gap-1.5 px-4 py-3 text-sm font-medium",
                        "border-b-2 -mb-px transition-colors whitespace-nowrap",
                        "focus-visible:outline-none",
                        active
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                      ].join(" ")}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                      {count !== undefined && count > 0 && (
                        <span
                          className={[
                            "ml-0.5 text-[10px] px-1.5 rounded-full tabular-nums font-normal",
                            active
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground",
                          ].join(" ")}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab: 글 */}
            {activeTab === "posts" && (
              <PostsTab
                loading={tabLoading.posts}
                error={tabError.posts}
                posts={posts}
                isOwner={isOwner}
                onOpenPost={(postId) =>
                  router.push(`/community/board/${postId}`)
                }
                onRemovePost={removePost}
              />
            )}

            {/* Tab: 댓글 */}
            {activeTab === "comments" && (
              <CommentsTab
                loading={tabLoading.comments}
                error={tabError.comments}
                comments={comments}
                isOwner={isOwner}
                onOpenCommentPost={(postId) => {
                  if (!postId) return;
                  router.push(`/community/board/${postId}`);
                }}
                onRemoveComment={removeComment}
              />
            )}

            {/* Tab: 북마크 */}
            {activeTab === "bookmarks" && (
              <BookmarksTab
                loading={tabLoading.bookmarks}
                error={tabError.bookmarks}
                bookmarks={bookmarks}
                bookmarkView={bookmarkView}
                onChangeBookmarkView={setBookmarkView}
                totalCount={bookmarkTotalCount}
              />
            )}

            {/* Tab: 이력서 */}
            {activeTab === "resume" && (
              <ResumeTab
                isOwner={isOwner}
                loading={tabLoading.resume}
                error={tabError.resume}
                resumePayload={resumePayload}
                onChangeResumePayload={setResumePayload}
                onSaveResume={saveResume}
                saving={saving}
                resumeSummary={resumeSummary}
              />
            )}

            {/* Tab: 활동 (스페이스) */}
            {activeTab === "activity" && (
              <WorkspaceActivityTab
                loading={tabLoading.activity}
                error={tabError.activity}
                workspaces={workspaces}
              />
            )}
          </div>
        </div>
      </div>

      {/* Profile Edit Sheet — handle field removed */}
      {isOwner && (
        <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
          <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <SheetTitle>프로필 편집</SheetTitle>
              <SheetDescription>
                변경 사항은 저장 즉시 반영됩니다.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1">
              <div className="px-6 py-5 space-y-5">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-dashed">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarImage src={profile.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                      {(profileForm.nickname || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {profileForm.nickname || "닉네임 없음"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{profile.handle}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    닉네임
                  </Label>
                  <Input
                    value={profileForm.nickname}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        nickname: e.target.value,
                      }))
                    }
                    placeholder="표시될 이름"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    한 줄 소개
                  </Label>
                  <Textarea
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, bio: e.target.value }))
                    }
                    placeholder="나를 한 줄로 소개하세요"
                    className="resize-none min-h-[80px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    기술 스택 (쉼표 구분)
                  </Label>
                  <Input
                    value={profileForm.techStack}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        techStack: e.target.value,
                      }))
                    }
                    placeholder="React, Node.js, Python..."
                  />
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    GitHub 링크
                  </Label>
                  <Input
                    value={profileForm.github}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        github: e.target.value,
                      }))
                    }
                    placeholder="https://github.com/..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Blog 링크
                  </Label>
                  <Input
                    value={profileForm.blog}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        blog: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </ScrollArea>
            <SheetFooter className="px-6 py-4 border-t flex-row gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setEditSheetOpen(false)}
                disabled={saving}
              >
                취소
              </Button>
              <Button
                onClick={saveProfile}
                disabled={saving}
                className="flex-1"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                저장
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
