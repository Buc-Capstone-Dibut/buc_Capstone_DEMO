"use client";

import { useEffect, useMemo, useState } from "react";
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
  ExternalLink,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Sparkles,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = "posts" | "comments" | "bookmarks" | "resume" | "activity";
type BookmarkView = "card" | "list";

interface ActivityHeatmapPoint {
  date: string;
  count: number;
  level: number;
}

interface ResumePayload {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    intro: string;
    links: { github?: string; blog?: string; [key: string]: string | undefined };
  };
  education: any[];
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

interface InitialData {
  profile: {
    id: string;
    handle: string;
    nickname: string | null;
    avatarUrl: string | null;
    bio: string | null;
    techStack: string[];
    reputation: number;
    tier: string;
  };
  stats: {
    postCount: number;
    commentCount: number;
    workspaceCount: number;
    bookmarkCount: number;
  };
  resumeSummary: any;
  workspaceSummary: any;
  isOwner: boolean;
  posts: Array<{
    id: string;
    title: string;
    category: string | null;
    tags: string[];
    views: number;
    likes: number;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  comments: Array<{
    id: string;
    content: string;
    postId: string | null;
    postTitle: string;
    createdAt: string | null;
  }>;
  bookmarks: Array<{
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
    };
  }>;
  heatmap: ActivityHeatmapPoint[];
  resumePayload: any;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVEL_CLASS: Record<number, string> = {
  0: "bg-muted",
  1: "bg-emerald-200 dark:bg-emerald-900/70",
  2: "bg-emerald-300 dark:bg-emerald-700",
  3: "bg-emerald-500 dark:bg-emerald-500",
  4: "bg-emerald-700 dark:bg-emerald-300",
};

const TIER_BADGE: Record<string, string> = {
  Bronze:   "border-amber-400/70 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
  Silver:   "border-slate-400/60  text-slate-600  dark:text-slate-300  bg-slate-50  dark:bg-slate-800/30",
  Gold:     "border-yellow-400/70 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  Platinum: "border-cyan-400/70   text-cyan-700   dark:text-cyan-400   bg-cyan-50   dark:bg-cyan-900/20",
  Diamond:  "border-violet-400/70 text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20",
};

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "posts",     label: "글",    icon: FileText },
  { key: "comments",  label: "댓글",  icon: MessageSquare },
  { key: "bookmarks", label: "북마크", icon: Bookmark },
  { key: "resume",    label: "이력서", icon: BookOpen },
  { key: "activity",  label: "활동",  icon: Activity },
];

const EMPTY_RESUME: ResumePayload = {
  personalInfo: { name: "", email: "", phone: "", intro: "", links: {} },
  education: [],
  experience: [],
  skills: [],
  projects: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function normalizeResumePayload(rp: any): ResumePayload {
  if (!rp) return EMPTY_RESUME;
  return {
    personalInfo: {
      name:  rp.personalInfo?.name  || "",
      email: rp.personalInfo?.email || "",
      phone: rp.personalInfo?.phone || "",
      intro: rp.personalInfo?.intro || "",
      links: rp.personalInfo?.links || {},
    },
    education:  rp.education  || [],
    experience: (rp.experience || []).map((e: any) => ({
      company:     e.company     || "",
      position:    e.position    || "",
      period:      e.period      || "",
      description: e.description || "",
    })),
    skills: (rp.skills || []).map((s: any) =>
      typeof s === "string"
        ? { name: s, level: "Intermediate" }
        : { name: s.name || "", level: s.level || "Intermediate", category: s.category }
    ),
    projects: (rp.projects || []).map((p: any) => ({
      name:         p.name         || "",
      period:       p.period        || "",
      description:  p.description  || "",
      techStack:    p.techStack     || [],
      achievements: p.achievements  || [],
    })),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground select-none">
      <Icon className="w-10 h-10 opacity-20" strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Resume Editor ────────────────────────────────────────────────────────────

function ResumeEditor({
  payload,
  onChange,
  onSave,
  saving,
  onGoSetup,
}: {
  payload: ResumePayload;
  onChange: (p: ResumePayload) => void;
  onSave: () => void;
  saving: boolean;
  onGoSetup: () => void;
}) {
  const [newSkill, setNewSkill] = useState("");

  const pi = payload.personalInfo;

  const setPI = (patch: Partial<ResumePayload["personalInfo"]>) =>
    onChange({ ...payload, personalInfo: { ...pi, ...patch } });

  const setLinks = (patch: Partial<typeof pi.links>) =>
    onChange({ ...payload, personalInfo: { ...pi, links: { ...pi.links, ...patch } } });

  const addSkill = () => {
    const name = newSkill.trim();
    if (!name) return;
    onChange({ ...payload, skills: [...payload.skills, { name, level: "Intermediate" }] });
    setNewSkill("");
  };

  const removeSkill = (i: number) => {
    const next = [...payload.skills];
    next.splice(i, 1);
    onChange({ ...payload, skills: next });
  };

  const setExp = (i: number, patch: Partial<ResumePayload["experience"][number]>) => {
    const next = [...payload.experience];
    next[i] = { ...next[i], ...patch };
    onChange({ ...payload, experience: next });
  };

  const addExp = () =>
    onChange({
      ...payload,
      experience: [...payload.experience, { company: "", position: "", period: "", description: "" }],
    });

  const removeExp = (i: number) => {
    const next = [...payload.experience];
    next.splice(i, 1);
    onChange({ ...payload, experience: next });
  };

  const setPrj = (i: number, patch: Partial<ResumePayload["projects"][number]>) => {
    const next = [...payload.projects];
    next[i] = { ...next[i], ...patch };
    onChange({ ...payload, projects: next });
  };

  const addPrj = () =>
    onChange({
      ...payload,
      projects: [
        ...payload.projects,
        { name: "", period: "", description: "", techStack: [], achievements: [] },
      ],
    });

  const removePrj = (i: number) => {
    const next = [...payload.projects];
    next.splice(i, 1);
    onChange({ ...payload, projects: next });
  };

  const setAch = (pi_: number, ai: number, val: string) => {
    const next = [...payload.projects];
    const achs = [...(next[pi_].achievements || [])];
    achs[ai] = val;
    next[pi_] = { ...next[pi_], achievements: achs };
    onChange({ ...payload, projects: next });
  };

  const addAch = (pi_: number) => {
    const next = [...payload.projects];
    next[pi_] = { ...next[pi_], achievements: [...(next[pi_].achievements || []), ""] };
    onChange({ ...payload, projects: next });
  };

  const removeAch = (pi_: number, ai: number) => {
    const next = [...payload.projects];
    const achs = [...(next[pi_].achievements || [])];
    achs.splice(ai, 1);
    next[pi_] = { ...next[pi_], achievements: achs };
    onChange({ ...payload, projects: next });
  };

  return (
    <div className="space-y-5">
      {/* CTA banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">이 이력서가 면접 세션에 사용됩니다</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI 면접 시 이력서 기반으로 맞춤 질문이 생성됩니다.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onGoSetup} className="shrink-0 gap-1.5 text-xs">
          면접 시작하기
        </Button>
      </div>

      {/* Personal Info */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">기본 정보</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "이름", key: "name" as const, placeholder: "홍길동" },
              { label: "이메일", key: "email" as const, placeholder: "email@example.com" },
              { label: "전화번호", key: "phone" as const, placeholder: "010-0000-0000" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  value={pi[key]}
                  onChange={(e) => setPI({ [key]: e.target.value })}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">한 줄 소개</Label>
            <Textarea
              value={pi.intro}
              onChange={(e) => setPI({ intro: e.target.value })}
              placeholder="간략한 자기소개를 작성하세요"
              className="resize-none min-h-[72px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "GitHub", key: "github" as const, placeholder: "https://github.com/..." },
              { label: "Blog / Portfolio", key: "blog" as const, placeholder: "https://..." },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  value={pi.links[key] || ""}
                  onChange={(e) => setLinks({ [key]: e.target.value || undefined })}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">기술 스택</p>
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {payload.skills.map((s, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-xs gap-1 pl-2.5 pr-1 h-7 cursor-default"
              >
                {s.name}
                <button
                  onClick={() => removeSkill(i)}
                  className="opacity-50 hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="기술명 입력 후 Enter"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addSkill}>추가</Button>
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">경력</p>
          {payload.experience.map((exp, i) => (
            <div key={i} className="relative rounded-lg border p-4 space-y-3 bg-muted/20">
              <button
                onClick={() => removeExp(i)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">회사명</Label>
                  <Input
                    value={exp.company}
                    onChange={(e) => setExp(i, { company: e.target.value })}
                    placeholder="(주)회사명"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">직책</Label>
                  <Input
                    value={exp.position}
                    onChange={(e) => setExp(i, { position: e.target.value })}
                    placeholder="Frontend Developer"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">기간</Label>
                <Input
                  value={exp.period}
                  onChange={(e) => setExp(i, { period: e.target.value })}
                  placeholder="2022.03 ~ 2024.02"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">주요 업무</Label>
                <Textarea
                  value={exp.description}
                  onChange={(e) => setExp(i, { description: e.target.value })}
                  placeholder="담당한 주요 업무를 입력하세요"
                  className="resize-none min-h-[64px] text-sm"
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed py-5"
            onClick={addExp}
          >
            <Plus className="w-4 h-4 mr-2" /> 경력 추가
          </Button>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">프로젝트</p>
          {payload.projects.map((prj, pi_) => (
            <div key={pi_} className="relative rounded-lg border p-4 space-y-3 bg-muted/20">
              <button
                onClick={() => removePrj(pi_)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">프로젝트명</Label>
                  <Input
                    value={prj.name}
                    onChange={(e) => setPrj(pi_, { name: e.target.value })}
                    placeholder="프로젝트 이름"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">기간</Label>
                  <Input
                    value={prj.period}
                    onChange={(e) => setPrj(pi_, { period: e.target.value })}
                    placeholder="2023.06 ~ 2023.12"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">설명</Label>
                <Textarea
                  value={prj.description}
                  onChange={(e) => setPrj(pi_, { description: e.target.value })}
                  placeholder="프로젝트 개요 및 본인의 역할"
                  className="resize-none min-h-[64px] text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">기술 스택 (쉼표 구분)</Label>
                <Input
                  value={prj.techStack.join(", ")}
                  onChange={(e) =>
                    setPrj(pi_, {
                      techStack: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="React, TypeScript, Node.js"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-muted-foreground">주요 성과</Label>
                {(prj.achievements || []).map((ach, ai) => (
                  <div key={ai} className="flex gap-2">
                    <Input
                      value={ach}
                      onChange={(e) => setAch(pi_, ai, e.target.value)}
                      placeholder="성과를 입력하세요"
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAch(pi_, ai)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7 px-2"
                  onClick={() => addAch(pi_)}
                >
                  <Plus className="w-3 h-3 mr-1" /> 성과 추가
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed py-5"
            onClick={addPrj}
          >
            <Plus className="w-4 h-4 mr-2" /> 새 프로젝트 추가하기
          </Button>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={onSave} disabled={saving} size="lg" className="gap-2 px-8">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          이력서 저장
        </Button>
      </div>
    </div>
  );
}

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
  const [heatmap, setHeatmap] = useState(initialData.heatmap || []);
  const [resumePayload, setResumePayload] = useState<ResumePayload>(
    normalizeResumePayload(initialData.resumePayload || null)
  );
  const [tabLoading, setTabLoading] = useState<Partial<Record<TabKey, boolean>>>({
    posts: (initialData.posts || []).length === 0,
  });
  const [tabLoaded, setTabLoaded] = useState<Partial<Record<TabKey, boolean>>>({
    posts: (initialData.posts || []).length > 0,
    comments: (initialData.comments || []).length > 0,
    bookmarks: (initialData.bookmarks || []).length > 0,
    activity: (initialData.heatmap || []).length > 0,
    resume: Boolean(initialData.resumePayload),
  });
  const [tabError, setTabError] = useState<Partial<Record<TabKey, string>>>({});

  const isOwner = initialData.isOwner;

  // Profile edit form — handle is NOT editable
  const [profileForm, setProfileForm] = useState({
    nickname: initialData.profile.nickname || "",
    bio: initialData.profile.bio || "",
    techStack: (initialData.profile.techStack || []).join(", "),
  });

  const tierStyle = TIER_BADGE[profile.tier] ?? "border-muted text-muted-foreground";
  const tabCounts: Partial<Record<TabKey, number>> = {
    posts: stats.postCount,
    comments: stats.commentCount,
    bookmarks: stats.bookmarkCount,
  };
  const activityTotal = useMemo(
    () => heatmap.reduce((sum, p) => sum + p.count, 0),
    [heatmap]
  );
  const bookmarkTotalCount = tabLoaded.bookmarks ? bookmarks.length : stats.bookmarkCount;
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
          const res = await fetch(`/api/my/content/posts?handle=${encodeURIComponent(profile.handle)}`, {
            cache: "no-store",
          });
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "글을 불러오지 못했습니다.");
          }
          if (!cancelled) setPosts(json?.data?.items || []);
        }

        if (tab === "comments") {
          const res = await fetch(`/api/my/content/comments?handle=${encodeURIComponent(profile.handle)}`, {
            cache: "no-store",
          });
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "댓글을 불러오지 못했습니다.");
          }
          if (!cancelled) setComments(json?.data?.items || []);
        }

        if (tab === "bookmarks") {
          const res = await fetch(`/api/my/bookmarks?handle=${encodeURIComponent(profile.handle)}`, {
            cache: "no-store",
          });
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "북마크를 불러오지 못했습니다.");
          }
          if (!cancelled) {
            const items = (json?.data?.items || []).map((item: any) => ({
              ...item,
              blog: item?.blog
                ? {
                    ...item.blog,
                    id: String(item.blog.id),
                  }
                : null,
            }));
            setBookmarks(items);
          }
        }

        if (tab === "activity") {
          const res = await fetch(`/api/my/activity/heatmap?handle=${encodeURIComponent(profile.handle)}`, {
            cache: "no-store",
          });
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || "활동 기록을 불러오지 못했습니다.");
          }
          if (!cancelled) {
            setHeatmap(json?.data?.points || []);
          }
        }

        if (tab === "resume" && isOwner) {
          const res = await fetch("/api/my/resume/active", { cache: "no-store" });
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
              setResumePayload(normalizeResumePayload(json?.data?.resumePayload || null));
              setResumeSummary(json?.data?.publicSummary || null);
            }
          }
        }

        if (!cancelled) {
          setTabLoaded((prev) => ({ ...prev, [tab]: true }));
        }
      } catch (error: any) {
        if (!cancelled) {
          const message = error?.message || "데이터를 불러오지 못했습니다.";
          setTabError((prev) => ({ ...prev, [tab]: message }));
          toast({ title: "불러오기 실패", description: message, variant: "destructive" });
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
  }, [
    activeTab,
    activeTabLoaded,
    isOwner,
    profile.handle,
    toast,
  ]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/my/profile", {
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
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "프로필 저장 실패");
      toast({ title: "프로필이 저장되었습니다." });
      setEditSheetOpen(false);
      // Update local state directly — no page reload needed
      setProfile((prev) => ({
        ...prev,
        nickname: json.data.nickname ?? prev.nickname,
        avatarUrl: json.data.avatarUrl ?? prev.avatarUrl,
        bio: json.data.bio ?? prev.bio,
        techStack: json.data.techStack ?? prev.techStack,
      }));
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
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
      if (!res.ok || !json?.success) throw new Error(json?.error || "이력서 저장 실패");
      setResumeSummary(json?.data?.publicSummary || resumeSummary);
      toast({ title: "이력서가 저장되었습니다." });
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removePost = async (postId: string) => {
    if (!confirm("해당 글을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (!res.ok) { toast({ title: "삭제 실패", variant: "destructive" }); return; }
    setPosts((prev) => prev.filter((item) => item.id !== postId));
  };

  const removeComment = async (commentId: string) => {
    if (!confirm("해당 댓글을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) { toast({ title: "삭제 실패", variant: "destructive" }); return; }
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
                  <Badge variant="outline" className={`text-[10px] px-1.5 h-5 font-normal ${tierStyle}`}>
                    ★ {profile.tier}
                  </Badge>
                )}
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
                  {profile.bio ? profile.bio : <span className="italic">소개가 없습니다.</span>}
                </p>
                {profile.techStack.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-1.5">
                      {profile.techStack.map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-xs font-normal">
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
                    { value: stats.postCount,      label: "글" },
                    { value: stats.commentCount,   label: "댓글" },
                    { value: stats.workspaceCount, label: "스페이스" },
                  ].map(({ value, label }) => (
                    <div key={label} className="flex flex-col items-center py-5 gap-0.5">
                      <span className="text-2xl font-bold tabular-nums">{value}</span>
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    공개 이력서
                  </span>
                </div>
                <Separator />
                {resumeSummary?.headline ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-snug">
                      {resumeSummary.headline}
                    </p>
                    {(resumeSummary.topSkills || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(resumeSummary.topSkills as string[]).slice(0, 5).map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[10px] h-4 px-1.5">
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
                  <p className="text-xs text-muted-foreground italic">이력서 정보가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Content */}
          <div className="min-w-0 space-y-4">

            {/* Tab Nav */}
            <div className="border-b">
              <nav className="flex" role="tablist">
                {TABS.map(({ key, label, icon: Icon }) => {
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
                            active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
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
              <div className="space-y-2">
                {tabLoading.posts ? (
                  <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    글 목록을 불러오는 중...
                  </div>
                ) : tabError.posts ? (
                  <p className="text-sm text-red-500 py-10 text-center">{tabError.posts}</p>
                ) : posts.length === 0 ? (
                  <EmptyState icon={FileText} message="작성한 글이 없습니다." />
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className="group flex items-start justify-between gap-3 rounded-xl border bg-card px-5 py-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => router.push(`/community/board/${post.id}`)}
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="font-semibold text-sm leading-snug truncate group-hover:text-primary transition-colors">
                          {post.title}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          {post.category && (
                            <span className="px-1.5 py-0.5 rounded bg-muted">{post.category}</span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <ThumbsUp className="w-3 h-3" /> {post.likes ?? 0}
                          </span>
                          <span>조회 {post.views ?? 0}</span>
                          {post.createdAt && (
                            <span>{formatDate(post.createdAt)}</span>
                          )}
                          {(post.tags || []).slice(0, 3).map((tag: string) => (
                            <span key={tag} className="px-1.5 py-0.5 rounded-full bg-primary/8 text-primary text-[10px]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition" />
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                            onClick={(e) => { e.stopPropagation(); removePost(post.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: 댓글 */}
            {activeTab === "comments" && (
              <div className="space-y-2">
                {tabLoading.comments ? (
                  <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    댓글 목록을 불러오는 중...
                  </div>
                ) : tabError.comments ? (
                  <p className="text-sm text-red-500 py-10 text-center">{tabError.comments}</p>
                ) : comments.length === 0 ? (
                  <EmptyState icon={MessageSquare} message="작성한 댓글이 없습니다." />
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="group flex items-start justify-between gap-3 rounded-xl border bg-card px-5 py-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() =>
                        comment.postId
                          ? router.push(`/community/board/${comment.postId}`)
                          : undefined
                      }
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-sm leading-relaxed line-clamp-2">{comment.content}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="truncate font-medium group-hover:text-primary transition-colors">
                            {comment.postTitle || "원문 없음"}
                          </span>
                          {comment.createdAt && (
                            <span className="shrink-0">{formatDate(comment.createdAt)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {comment.postId && (
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition" />
                        )}
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                            onClick={(e) => { e.stopPropagation(); removeComment(comment.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: 북마크 */}
            {activeTab === "bookmarks" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {bookmarkTotalCount > 0 ? `북마크 ${bookmarkTotalCount}개` : ""}
                  </p>
                  {bookmarkTotalCount > 0 && (
                    <div className="flex items-center rounded-md border overflow-hidden">
                      {(["card", "list"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setBookmarkView(v)}
                          title={v === "card" ? "카드 보기" : "리스트 보기"}
                          className={[
                            "px-2.5 py-1.5 transition-colors",
                            bookmarkView === v
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          ].join(" ")}
                        >
                          {v === "card"
                            ? <LayoutGrid className="w-3 h-3" />
                            : <List className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {tabLoading.bookmarks ? (
                  <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    북마크를 불러오는 중...
                  </div>
                ) : tabError.bookmarks ? (
                  <p className="text-sm text-red-500 py-10 text-center">{tabError.bookmarks}</p>
                ) : bookmarks.length === 0 ? (
                  <EmptyState icon={Bookmark} message="북마크한 글이 없습니다." />
                ) : bookmarkView === "card" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {bookmarks.map((row) => (
                      <div
                        key={row.id}
                        className="group rounded-lg border bg-card overflow-hidden hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col"
                        onClick={() =>
                          row.blog?.externalUrl &&
                          window.open(row.blog.externalUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        <div className="h-20 bg-muted overflow-hidden relative shrink-0">
                          {row.blog?.thumbnailUrl ? (
                            <img
                              src={row.blog.thumbnailUrl}
                              alt={row.blog.title ?? ""}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                              <span className="text-2xl font-bold text-primary/20 select-none uppercase">
                                {(row.blog?.title || "B").charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition bg-background/90 rounded-full p-1.5 shadow">
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                        <div className="px-2.5 py-2 flex flex-col gap-1 flex-1 min-w-0">
                          <p className="text-[11px] font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {row.blog?.title}
                          </p>
                          <div className="flex items-center gap-1 mt-auto text-[10px] text-muted-foreground truncate">
                            {row.blog?.author && (
                              <span className="truncate font-medium">{row.blog.author}</span>
                            )}
                            {row.blog?.publishedAt && (
                              <>
                                <span className="shrink-0">·</span>
                                <span className="shrink-0">{formatDate(row.blog.publishedAt)}</span>
                              </>
                            )}
                          </div>
                          {(row.blog?.tags || []).length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {(row.blog.tags as string[]).slice(0, 2).map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary/70 font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card divide-y overflow-hidden">
                    {bookmarks.map((row) => (
                      <div
                        key={row.id}
                        className="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() =>
                          row.blog?.externalUrl &&
                          window.open(row.blog.externalUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        <div className="w-9 h-9 rounded-md bg-muted overflow-hidden shrink-0">
                          {row.blog?.thumbnailUrl ? (
                            <img
                              src={row.blog.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                              <span className="text-xs font-bold text-primary/30 uppercase">
                                {(row.blog?.title || "B").charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-none truncate group-hover:text-primary transition-colors">
                            {row.blog?.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                            {row.blog?.author && (
                              <span className="truncate max-w-[80px] font-medium">{row.blog.author}</span>
                            )}
                            {(row.blog?.tags || []).slice(0, 2).map((tag: string) => (
                              <span
                                key={tag}
                                className="shrink-0 px-1.5 py-0.5 rounded-full bg-primary/8 text-primary/70"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {row.blog?.publishedAt && (
                            <span className="text-[10px] text-muted-foreground hidden sm:block">
                              {formatDate(row.blog.publishedAt)}
                            </span>
                          )}
                          <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: 이력서 */}
            {activeTab === "resume" && (
              isOwner ? (
                tabLoading.resume ? (
                  <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    이력서를 불러오는 중...
                  </div>
                ) : tabError.resume ? (
                  <p className="text-sm text-red-500 py-10 text-center">{tabError.resume}</p>
                ) : (
                <ResumeEditor
                  payload={resumePayload}
                  onChange={setResumePayload}
                  onSave={saveResume}
                  saving={saving}
                  onGoSetup={() => router.push("/interview/setup?import=active_resume")}
                />
                )
              ) : (
                <div className="rounded-xl border bg-card px-5 py-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">공개 이력서</span>
                    <Badge className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-0">
                      면접 setup에 사용됨
                    </Badge>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <p className="text-xs text-muted-foreground">한 줄 소개</p>
                    <p className="font-medium">{resumeSummary?.headline || "—"}</p>
                    <p className="text-xs text-muted-foreground pt-2">핵심 스킬</p>
                    <p>{(resumeSummary?.topSkills || []).join(", ") || "—"}</p>
                  </div>
                </div>
              )
            )}

            {/* Tab: 활동 */}
            {activeTab === "activity" && (
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">활동 기록</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      최근 1년 · 총 {activityTotal}회
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>적음</span>
                    {([0, 1, 2, 3, 4] as const).map((l) => (
                      <div key={l} className={`w-3 h-3 rounded-[2px] ${LEVEL_CLASS[l]}`} />
                    ))}
                    <span>많음</span>
                  </div>
                </div>
                {tabLoading.activity ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    활동 기록을 불러오는 중...
                  </div>
                ) : tabError.activity ? (
                  <p className="text-sm text-red-500 py-10 text-center">{tabError.activity}</p>
                ) : heatmap.length === 0 ? (
                  <EmptyState icon={Activity} message="최근 1년간 활동 기록이 없습니다." />
                ) : (
                  <div className="overflow-x-auto">
                    <div
                      className="grid gap-[3px]"
                      style={{
                        gridTemplateColumns: "repeat(53, minmax(0, 1fr))",
                        minWidth: "530px",
                      }}
                    >
                      {heatmap.map((point) => (
                        <div
                          key={point.date}
                          className={`h-3.5 rounded-[2px] ${LEVEL_CLASS[point.level] ?? LEVEL_CLASS[0]}`}
                          title={`${point.date}: ${point.count}회`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
              <SheetDescription>변경 사항은 저장 즉시 반영됩니다.</SheetDescription>
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
                  <Label className="text-xs text-muted-foreground">닉네임</Label>
                  <Input
                    value={profileForm.nickname}
                    onChange={(e) => setProfileForm((p) => ({ ...p, nickname: e.target.value }))}
                    placeholder="표시될 이름"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">한 줄 소개</Label>
                  <Textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="나를 한 줄로 소개하세요"
                    className="resize-none min-h-[80px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">기술 스택 (쉼표 구분)</Label>
                  <Input
                    value={profileForm.techStack}
                    onChange={(e) => setProfileForm((p) => ({ ...p, techStack: e.target.value }))}
                    placeholder="React, Node.js, Python..."
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
              <Button onClick={saveProfile} disabled={saving} className="flex-1">
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
