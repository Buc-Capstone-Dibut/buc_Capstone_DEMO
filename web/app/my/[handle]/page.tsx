"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { GlobalHeader } from "@/components/layout/global-header";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  AlertCircle,
  Bookmark,
  BookOpen,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  FolderGit2,
  LayoutGrid,
  List,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Sparkles,
  ThumbsUp,
  Trash2,
  User,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicProfileView {
  profile: {
    id: string;
    handle: string;
    nickname: string | null;
    avatarUrl: string | null;
    bio: string | null;
    techStack: string[];
    tier: string;
  };
  stats: {
    postCount: number;
    commentCount: number;
    workspaceCount: number;
  };
  resumeSummary: any;
  workspaceSummary: any;
  isOwner: boolean;
}

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

type TabKey = "posts" | "comments" | "bookmarks" | "resume" | "activity";
type BookmarkView = "card" | "list";

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

function formatDate(iso: string | undefined): string {
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground select-none">
      <Icon className="w-10 h-10 opacity-20" strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />
      <div className="h-36 sm:h-44 bg-gradient-to-br from-primary/20 via-primary/5 to-background animate-pulse" />
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-end justify-between -mt-12 mb-8">
          <div className="flex items-end gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="pb-1 space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[288px_1fr] gap-6">
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Resume Section ───────────────────────────────────────────────────────────

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
        <div>
          <p className="text-sm font-semibold">이 이력서가 AI 면접에 그대로 활용됩니다</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            저장 후 면접 setup에서 자동으로 불러와집니다.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={onGoSetup}>
          <Sparkles className="w-3.5 h-3.5" />
          면접 setup 바로가기
        </Button>
      </div>

      {/* ── 기본 정보 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" /> 기본 정보 & 한 줄 소개
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">이름</Label>
              <Input
                value={pi.name}
                onChange={(e) => setPI({ name: e.target.value })}
                placeholder="홍길동"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">이메일</Label>
              <Input
                value={pi.email}
                onChange={(e) => setPI({ email: e.target.value })}
                placeholder="you@example.com"
                type="email"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">한 줄 소개 (Elevator Pitch)</Label>
            <Input
              value={pi.intro}
              onChange={(e) => setPI({ intro: e.target.value })}
              placeholder="예: 사용자 경험을 최우선으로 생각하는 3년차 프론트엔드 개발자"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderGit2 className="w-3 h-3" /> GitHub
              </Label>
              <Input
                value={pi.links?.github ?? ""}
                onChange={(e) => setLinks({ github: e.target.value })}
                placeholder="https://github.com/..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" /> 블로그 / 노션
              </Label>
              <Input
                value={pi.links?.blog ?? ""}
                onChange={(e) => setLinks({ blog: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 보유 스킬 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">보유 스킬</CardTitle>
          <CardDescription>면접관이 주목할 기술 역량입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {payload.skills.map((skill, i) => (
              <Badge
                key={`${skill.name}-${i}`}
                variant="secondary"
                className="pl-3 pr-1.5 py-1.5 text-sm gap-2 flex items-center"
              >
                <span>{skill.name}</span>
                <span className="text-[10px] bg-background/60 px-1.5 py-0.5 rounded text-muted-foreground">
                  {skill.level}
                </span>
                <button
                  onClick={() => removeSkill(i)}
                  className="ml-0.5 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {payload.skills.length === 0 && (
              <p className="text-xs text-muted-foreground italic self-center">
                스킬을 추가해주세요
              </p>
            )}
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input
              placeholder="React, TypeScript..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            />
            <Button size="icon" variant="ghost" onClick={addSkill} disabled={!newSkill.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 주요 경력 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" /> 주요 경력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {payload.experience.length === 0 && (
            <p className="text-xs text-muted-foreground italic">경력을 추가해주세요.</p>
          )}
          {payload.experience.map((exp, i) => (
            <div
              key={i}
              className="relative pl-6 border-l-2 border-muted hover:border-primary transition-colors pb-6 last:pb-0"
            >
              <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-background border-2 border-muted" />
              <div className="space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="grid sm:grid-cols-2 gap-2 flex-1">
                    <Input
                      value={exp.company}
                      placeholder="회사명"
                      className="font-semibold"
                      onChange={(e) => setExp(i, { company: e.target.value })}
                    />
                    <Input
                      value={exp.position}
                      placeholder="직무 / 직책"
                      onChange={(e) => setExp(i, { position: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeExp(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Input
                    className="h-8 text-xs w-52"
                    value={exp.period}
                    placeholder="2023.01 – 재직중"
                    onChange={(e) => setExp(i, { period: e.target.value })}
                  />
                </div>
                <Textarea
                  value={exp.description}
                  placeholder="주요 업무 및 성과를 서술해주세요."
                  className="resize-none min-h-[80px]"
                  onChange={(e) => setExp(i, { description: e.target.value })}
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full border-dashed py-5 mt-2"
            onClick={addExp}
          >
            <Plus className="w-4 h-4 mr-2" /> 경력 추가하기
          </Button>
        </CardContent>
      </Card>

      {/* ── 프로젝트 (STAR) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-muted-foreground" /> 프로젝트 경험 (STAR)
          </CardTitle>
          <CardDescription>
            문제(Situation)와 해결(Action), 수치화된 성과(Result)를 강조하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {payload.projects.length === 0 && (
            <p className="text-xs text-muted-foreground italic">프로젝트를 추가해주세요.</p>
          )}
          {payload.projects.map((prj, i) => (
            <div
              key={i}
              className="relative pl-6 border-l-2 border-muted hover:border-primary transition-colors pb-4"
            >
              <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-background border-2 border-muted" />
              <div className="space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">프로젝트명</Label>
                    <Input
                      value={prj.name}
                      className="font-semibold"
                      onChange={(e) => setPrj(i, { name: e.target.value })}
                    />
                  </div>
                  <div className="w-36 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">기간</Label>
                    <Input
                      value={prj.period}
                      placeholder="2024.03 – 2024.06"
                      onChange={(e) => setPrj(i, { period: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive mb-0.5 shrink-0"
                    onClick={() => removePrj(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">상황 및 해결 (Situation & Action)</Label>
                  <Textarea
                    value={prj.description}
                    className="resize-none min-h-[80px]"
                    placeholder="어떤 문제를 어떻게 해결했는지 서술해주세요."
                    onChange={(e) => setPrj(i, { description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-primary font-semibold">
                    ✨ 핵심 성과 (Result — 수치화 권장)
                  </Label>
                  {(prj.achievements || []).map((ach, ai) => (
                    <div key={ai} className="flex gap-2">
                      <Input
                        value={ach}
                        placeholder="예: 응답 속도 40% 개선"
                        onChange={(e) => setAch(i, ai, e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => removeAch(i, ai)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    onClick={() => addAch(i)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> 성과 추가하기
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyProfilePage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const handle = decodeURIComponent(params.handle || "").toLowerCase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [bookmarkView, setBookmarkView] = useState<BookmarkView>("card");

  const [publicView, setPublicView] = useState<PublicProfileView | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<ActivityHeatmapPoint[]>([]);

  const [profileForm, setProfileForm] = useState({
    nickname: "",
    handle: "",
    bio: "",
    techStack: "",
  });
  const [resumePayload, setResumePayload] = useState<ResumePayload>(EMPTY_RESUME);

  const isOwner = Boolean(publicView?.isOwner);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadPage = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    setError(null);
    try {
      const enc = encodeURIComponent(handle);
      const [profileRes, postsRes, commentsRes, bookmarksRes, heatmapRes] = await Promise.all([
        fetch(`/api/my/profile/${enc}`, { cache: "no-store" }),
        fetch(`/api/my/content/posts?handle=${enc}`, { cache: "no-store" }),
        fetch(`/api/my/content/comments?handle=${enc}`, { cache: "no-store" }),
        fetch(`/api/my/bookmarks?handle=${enc}`, { cache: "no-store" }),
        fetch(`/api/my/activity/heatmap?handle=${enc}`, { cache: "no-store" }),
      ]);

      const [profileJson, postsJson, commentsJson, bookmarksJson, heatmapJson] = await Promise.all([
        profileRes.json(),
        postsRes.json(),
        commentsRes.json(),
        bookmarksRes.json(),
        heatmapRes.json(),
      ]);

      if (!profileRes.ok || !profileJson?.success) {
        throw new Error(profileJson?.error || "프로필을 불러오지 못했습니다.");
      }

      const profileData: PublicProfileView = profileJson.data;
      setPublicView(profileData);
      setProfileForm({
        nickname: profileData.profile.nickname || "",
        handle: profileData.profile.handle || "",
        bio: profileData.profile.bio || "",
        techStack: (profileData.profile.techStack || []).join(", "),
      });

      setPosts(postsJson?.data?.items || []);
      setComments(commentsJson?.data?.items || []);
      setBookmarks(bookmarksJson?.data?.items || []);
      setHeatmap(heatmapJson?.data?.points || []);

      if (profileData.isOwner) {
        const resumeRes = await fetch("/api/my/resume/active", { cache: "no-store" });
        const resumeJson = await resumeRes.json().catch(() => null);
        const rp = resumeJson?.data?.resumePayload;
        if (resumeRes.ok && resumeJson?.success && rp) {
          setResumePayload({
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
          });
        } else {
          setResumePayload(EMPTY_RESUME);
        }
      }
    } catch (err: any) {
      setError(err.message || "페이지를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/my/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: profileForm.nickname,
          handle: profileForm.handle,
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
      if (json?.data?.handle && json.data.handle !== handle) {
        router.replace(`/my/${json.data.handle}`);
        return;
      }
      await loadPage();
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
      toast({ title: "이력서가 저장되었습니다." });
      await loadPage();
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

  const activityTotal = useMemo(
    () => heatmap.reduce((sum, p) => sum + p.count, 0),
    [heatmap]
  );

  // ── Render states ─────────────────────────────────────────────────────────

  if (loading) return <ProfileSkeleton />;

  if (error || !publicView) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">불러오지 못했습니다</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {error || "프로필을 찾을 수 없습니다."}
              </p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              돌아가기
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const { profile, stats } = publicView;
  const tierStyle = TIER_BADGE[profile.tier] ?? "border-muted text-muted-foreground";
  const tabCounts: Partial<Record<TabKey, number>> = {
    posts: posts.length,
    comments: comments.length,
    bookmarks: bookmarks.length,
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      {/* ── Cover Banner ── */}
      <div className="relative h-36 sm:h-44 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/15 to-background" />
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute top-6 left-[38%] w-36 h-36 rounded-full bg-primary/8 blur-2xl pointer-events-none" />
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 pb-20">

        {/* ── Profile Header Row ── */}
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

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[288px_1fr] gap-6 items-start">

          {/* ════ Sidebar ════ */}
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
                {publicView.resumeSummary?.headline ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-snug">
                      {publicView.resumeSummary.headline}
                    </p>
                    {(publicView.resumeSummary.topSkills || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(publicView.resumeSummary.topSkills as string[]).slice(0, 5).map((s) => (
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

          {/* ════ Content ════ */}
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

            {/* ── Tab: 글 ── */}
            {activeTab === "posts" && (
              <div className="space-y-2">
                {posts.length === 0 ? (
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

            {/* ── Tab: 댓글 ── */}
            {activeTab === "comments" && (
              <div className="space-y-2">
                {comments.length === 0 ? (
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

            {/* ── Tab: 북마크 ── */}
            {activeTab === "bookmarks" && (
              <div className="space-y-3">
                {/* Header row: count + toggle */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {bookmarks.length > 0 ? `북마크 ${bookmarks.length}개` : ""}
                  </p>
                  {bookmarks.length > 0 && (
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

                {bookmarks.length === 0 ? (
                  <EmptyState icon={Bookmark} message="북마크한 글이 없습니다." />
                ) : bookmarkView === "card" ? (

                  /* ─── Mini card grid (3열) ─── */
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
                        {/* Compact thumbnail — h-24 대신 h-20 */}
                        <div className="h-20 bg-muted overflow-hidden relative shrink-0">
                          {row.blog?.thumbnailUrl ? (
                            <img
                              src={row.blog.thumbnailUrl}
                              alt={row.blog.title ?? ""}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            /* 썸네일 없을 때: 첫 글자 이니셜 플레이스홀더 */
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                              <span className="text-2xl font-bold text-primary/20 select-none uppercase">
                                {(row.blog?.title || "B").charAt(0)}
                              </span>
                            </div>
                          )}
                          {/* hover overlay: 외부링크 아이콘 */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition bg-background/90 rounded-full p-1.5 shadow">
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          </div>
                        </div>

                        {/* Mini body */}
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

                  /* ─── Ultra-compact list (단일 행, 밀집) ─── */
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
                        {/* Square thumb 36×36 */}
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

                        {/* Title + meta (single line) */}
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

                        {/* Date + link icon */}
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

            {/* ── Tab: 이력서 ── */}
            {activeTab === "resume" && (
              isOwner ? (
                <ResumeEditor
                  payload={resumePayload}
                  onChange={setResumePayload}
                  onSave={saveResume}
                  saving={saving}
                  onGoSetup={() => router.push("/interview/setup?import=active_resume")}
                />
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
                    <p className="font-medium">{publicView.resumeSummary?.headline || "—"}</p>
                    <p className="text-xs text-muted-foreground pt-2">핵심 스킬</p>
                    <p>{(publicView.resumeSummary?.topSkills || []).join(", ") || "—"}</p>
                  </div>
                </div>
              )
            )}

            {/* ── Tab: 활동 ── */}
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
                {heatmap.length === 0 ? (
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

      {/* ── Profile Edit Sheet ── */}
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
                      @{profileForm.handle || handle}
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
                  <Label className="text-xs text-muted-foreground">핸들 (URL 주소)</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground shrink-0 select-none">@</span>
                    <Input
                      value={profileForm.handle}
                      onChange={(e) => setProfileForm((p) => ({ ...p, handle: e.target.value }))}
                      placeholder="handle"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">변경 시 프로필 URL이 바뀝니다.</p>
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
