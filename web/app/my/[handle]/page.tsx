"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { GlobalHeader } from "@/components/layout/global-header";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";

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

const LEVEL_CLASS: Record<number, string> = {
  0: "bg-muted",
  1: "bg-primary/20",
  2: "bg-primary/35",
  3: "bg-primary/55",
  4: "bg-primary/80",
};

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function buildResumePayloadFromForm(input: {
  intro: string;
  skills: string;
  experiences: string;
}) {
  const skills = parseCommaList(input.skills).map((name) => ({
    name,
    category: "General",
    level: "Intermediate",
  }));

  const experience = input.experiences
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      company: line,
      position: "Developer",
      period: "",
      description: line,
    }));

  return {
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      intro: input.intro,
      links: {},
    },
    education: [],
    experience,
    skills,
    projects: [],
  };
}

export default function MyProfilePage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const handle = decodeURIComponent(params.handle || "").toLowerCase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [publicView, setPublicView] = useState<PublicProfileView | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<ActivityHeatmapPoint[]>([]);

  const [profileForm, setProfileForm] = useState({
    nickname: "",
    handle: "",
    bio: "",
    techStack: "",
  });
  const [resumeForm, setResumeForm] = useState({
    intro: "",
    skills: "",
    experiences: "",
  });
  const [workspaceDraft, setWorkspaceDraft] = useState("{}");

  const isOwner = Boolean(publicView?.isOwner);

  const loadPage = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    setError(null);
    try {
      const profileRes = await fetch(`/api/my/profile/${encodeURIComponent(handle)}`, {
        cache: "no-store",
      });
      const profileJson = await profileRes.json();
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

      const [postsRes, commentsRes, bookmarksRes, heatmapRes, workspaceRes] = await Promise.all([
        fetch(`/api/my/content/posts?handle=${encodeURIComponent(handle)}`, { cache: "no-store" }),
        fetch(`/api/my/content/comments?handle=${encodeURIComponent(handle)}`, { cache: "no-store" }),
        fetch(`/api/my/bookmarks?handle=${encodeURIComponent(handle)}`, { cache: "no-store" }),
        fetch(`/api/my/activity/heatmap?handle=${encodeURIComponent(handle)}`, { cache: "no-store" }),
        fetch(`/api/my/workspace-settings/${encodeURIComponent(handle)}`, { cache: "no-store" }),
      ]);

      const [postsJson, commentsJson, bookmarksJson, heatmapJson, workspaceJson] = await Promise.all([
        postsRes.json(),
        commentsRes.json(),
        bookmarksRes.json(),
        heatmapRes.json(),
        workspaceRes.json(),
      ]);

      setPosts(postsJson?.data?.items || []);
      setComments(commentsJson?.data?.items || []);
      setBookmarks(bookmarksJson?.data?.items || []);
      setHeatmap(heatmapJson?.data?.points || []);
      setWorkspaceData(workspaceJson?.data || null);

      if (profileData.isOwner) {
        const resumeRes = await fetch("/api/my/resume/active", { cache: "no-store" });
        const resumeJson = await resumeRes.json().catch(() => null);
        const resumePayload = resumeJson?.data?.resumePayload;
        if (resumeRes.ok && resumeJson?.success && resumePayload) {
          setResumeForm({
            intro: resumePayload?.personalInfo?.intro || "",
            skills: Array.isArray(resumePayload?.skills)
              ? resumePayload.skills.map((s: any) => s?.name).filter(Boolean).join(", ")
              : "",
            experiences: Array.isArray(resumePayload?.experience)
              ? resumePayload.experience
                  .map((e: any) => [e?.company, e?.position, e?.period].filter(Boolean).join(" / "))
                  .filter(Boolean)
                  .join("\n")
              : "",
          });
        }

        if (workspaceJson?.data?.settingsPayload) {
          setWorkspaceDraft(JSON.stringify(workspaceJson.data.settingsPayload, null, 2));
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
          techStack: parseCommaList(profileForm.techStack),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "프로필 저장 실패");
      toast({ title: "프로필이 저장되었습니다." });
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
      const resumePayload = buildResumePayloadFromForm(resumeForm);
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
      toast({ title: "활성 이력서가 저장되었습니다." });
      await loadPage();
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveWorkspaceSettings = async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(workspaceDraft || "{}");
      const res = await fetch("/api/my/workspace-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingsPayload: parsed }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "설정 저장 실패");
      toast({ title: "워크스페이스 설정이 저장되었습니다." });
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

  const activityTotal = useMemo(() => heatmap.reduce((sum, p) => sum + p.count, 0), [heatmap]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            마이페이지를 불러오는 중입니다...
          </div>
        </main>
      </div>
    );
  }

  if (error || !publicView) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        <main className="flex-1 max-w-5xl mx-auto w-full p-6">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>페이지를 불러오지 못했습니다.</CardTitle>
              <CardDescription>{error || "프로필을 찾을 수 없습니다."}</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-2xl">{publicView.profile.nickname || "사용자"}</CardTitle>
                <CardDescription>@{publicView.profile.handle}</CardDescription>
                <p className="text-sm text-muted-foreground">{publicView.profile.bio || "소개가 없습니다."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Posts {publicView.stats.postCount}</Badge>
                <Badge variant="secondary">Comments {publicView.stats.commentCount}</Badge>
                <Badge variant="secondary">Workspace {publicView.stats.workspaceCount}</Badge>
                {isOwner && <Badge className="bg-primary/10 text-primary">내 프로필</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {publicView.profile.techStack.map((tech) => (
                <Badge key={tech} variant="outline">{tech}</Badge>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="resume" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="resume">이력서</TabsTrigger>
            <TabsTrigger value="posts">글</TabsTrigger>
            <TabsTrigger value="comments">댓글</TabsTrigger>
            <TabsTrigger value="bookmarks">북마크</TabsTrigger>
            <TabsTrigger value="workspace">워크스페이스</TabsTrigger>
            <TabsTrigger value="activity">활동</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>공개 이력서 요약</CardTitle>
                <CardDescription>열람은 모두 가능하며, 편집은 본인만 가능합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Badge className="bg-primary/10 text-primary">면접 setup에 사용됨</Badge>
                <p><span className="font-semibold">한 줄 소개:</span> {publicView.resumeSummary?.headline || "-"}</p>
                <p><span className="font-semibold">핵심 스킬:</span> {(publicView.resumeSummary?.topSkills || []).join(", ") || "-"}</p>
              </CardContent>
            </Card>

            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>활성 이력서 관리</CardTitle>
                  <CardDescription>저장하면 `/interview/setup?import=active_resume`에서 자동으로 채워집니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="한 줄 소개"
                    value={resumeForm.intro}
                    onChange={(e) => setResumeForm((p) => ({ ...p, intro: e.target.value }))}
                  />
                  <Input
                    placeholder="기술 스택 (쉼표 구분)"
                    value={resumeForm.skills}
                    onChange={(e) => setResumeForm((p) => ({ ...p, skills: e.target.value }))}
                  />
                  <Textarea
                    placeholder="주요 경력 (한 줄에 하나씩)"
                    value={resumeForm.experiences}
                    onChange={(e) => setResumeForm((p) => ({ ...p, experiences: e.target.value }))}
                    className="min-h-[120px]"
                  />
                  <Button onClick={saveResume} disabled={saving}>
                    활성 이력서 저장
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-3 mt-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="pt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{post.title}</p>
                    <p className="text-xs text-muted-foreground">{post.category} · 조회 {post.views}</p>
                  </div>
                  {isOwner && (
                    <Button variant="ghost" size="icon" onClick={() => removePost(post.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {posts.length === 0 && <p className="text-sm text-muted-foreground">작성한 글이 없습니다.</p>}
          </TabsContent>

          <TabsContent value="comments" className="space-y-3 mt-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="pt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm">{comment.content}</p>
                    <p className="text-xs text-muted-foreground">{comment.postTitle || "원문 없음"}</p>
                  </div>
                  {isOwner && (
                    <Button variant="ghost" size="icon" onClick={() => removeComment(comment.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground">작성한 댓글이 없습니다.</p>}
          </TabsContent>

          <TabsContent value="bookmarks" className="space-y-3 mt-4">
            {bookmarks.map((row) => (
              <Card key={row.id}>
                <CardContent className="pt-4">
                  <p className="font-semibold">{row.blog?.title}</p>
                  <p className="text-xs text-muted-foreground">{row.blog?.author}</p>
                </CardContent>
              </Card>
            ))}
            {bookmarks.length === 0 && <p className="text-sm text-muted-foreground">북마크가 없습니다.</p>}
          </TabsContent>

          <TabsContent value="workspace" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>워크스페이스 설정 요약</CardTitle>
                <CardDescription>공개 페이지에는 요약만 노출됩니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted/40 p-3 rounded-md overflow-auto">
                  {JSON.stringify(workspaceData?.publicSummary || {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>워크스페이스 설정 편집</CardTitle>
                  <CardDescription>본인에게만 보이는 상세 설정입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    className="min-h-[180px] font-mono text-xs"
                    value={workspaceDraft}
                    onChange={(e) => setWorkspaceDraft(e.target.value)}
                  />
                  <Button onClick={saveWorkspaceSettings} disabled={saving}>
                    설정 저장
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>활동 잔디 그래프</CardTitle>
                <CardDescription>최근 1년 활동 {activityTotal}회 (필터 없음)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(53, minmax(0, 1fr))" }}>
                  {heatmap.map((point) => (
                    <div
                      key={point.date}
                      className={`h-2.5 rounded-[2px] ${LEVEL_CLASS[point.level] || LEVEL_CLASS[0]}`}
                      title={`${point.date}: ${point.count}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>프로필 편집</CardTitle>
              <CardDescription>수정은 본인만 가능합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="닉네임"
                value={profileForm.nickname}
                onChange={(e) => setProfileForm((p) => ({ ...p, nickname: e.target.value }))}
              />
              <Input
                placeholder="핸들 (URL)"
                value={profileForm.handle}
                onChange={(e) => setProfileForm((p) => ({ ...p, handle: e.target.value }))}
              />
              <Textarea
                placeholder="한 줄 소개"
                value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
              />
              <Input
                placeholder="기술 스택 (쉼표 구분)"
                value={profileForm.techStack}
                onChange={(e) => setProfileForm((p) => ({ ...p, techStack: e.target.value }))}
              />
              <Button onClick={saveProfile} disabled={saving}>
                프로필 저장
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
