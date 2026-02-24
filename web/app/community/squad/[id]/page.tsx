import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Viewer } from "@/components/features/community/squad-viewer";
import {
  MapPin,
  Calendar,
  Users,
  Star,
  Monitor,
  Share2,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import { fetchDevEventById } from "@/lib/server/dev-events";

// Components
import ApplicationButton from "@/components/features/community/squad/application-button";
import ApplicantManager from "@/components/features/community/squad/applicant-manager";
import SquadActions from "@/components/features/community/squad-actions";
import { CreateWorkspaceDialog } from "@/components/features/workspace/dialogs/create-workspace-dialog";
import { SquadHeaderActions } from "@/components/features/community/squad-header-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SquadDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const supabase = await createClient();

  // Fetch Squad with Relations
  const { data: squadData, error } = await supabase
    .from("squads")
    .select(
      `
      *,
      leader:leader_id (
        id, nickname, avatar_url, tier, bio
      ),
      members:squad_members (
        user_id, role,
        profile:user_id (id, nickname, avatar_url)
      )
    `,
    )
    .eq("id", id)
    .single();

  // @ts-ignore
  let squad = squadData as any;
  let isMember = false;
  let isLeader = false;
  let user = null;

  if (id === "squad-demo-1") {
    squad = {
      id: "squad-demo-1",
      title: "Dibut 개발자 플랫폼 클론 코딩 팀원 모집 (데모)",
      content: "### 프로젝트 소개\n\n개발자들의 성장을 돕는 Dibut 플랫폼을 클론 코딩하며 실무 역량을 쌓을 팀원을 모집합니다!\n이미 기획과 기본 디자인은 완료된 상태이며, 함께 기능을 구현해나갈 분들을 찾고 있습니다.\n\n### 진행 방식\n- 주 1회 정기 온라인 회의 (Discord)\n- GitHub를 통한 협업 및 코드 리뷰 진행\n\n### 모집 인원\n- Frontend (React/Next.js): 2명\n- Backend (Supabase/Node.js): 1명\n- UI/UX Designer: 1명",
      type: "side-project",
      status: "recruiting",
      capacity: 4,
      recruited_count: 4, // 꽉 찬 상태로 가정 (시연용)
      leader_id: "demo-leader",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      tech_stack: ["Next.js", "Tailwind CSS", "Supabase", "TypeScript"],
      place_type: "online",
      leader: {
        nickname: "Junghwan",
        avatar_url: null,
        tier: "Gold"
      },
      members: [
        { user_id: "demo-leader", role: "leader", profile: { nickname: "Junghwan", avatar_url: null } },
        { user_id: "u2", role: "member", profile: { nickname: "Frontend", avatar_url: null } },
        { user_id: "u3", role: "member", profile: { nickname: "Designer", avatar_url: null } },
        { user_id: "current-user", role: "member", profile: { nickname: "당신 (데모)", avatar_url: null } },
      ]
    };
    isMember = true; // 데모를 위해 접속 유저가 멤버인 것으로 처리
    isLeader = false;
  } else {
    if (error || !squad) {
      notFound();
    }

    const { data: userData } = await supabase.auth.getUser();
    user = userData.user;
    const currentUserId = user?.id;
    isLeader = currentUserId === squad.leader_id;
    isMember = squad.members?.some((m: any) => m.user_id === currentUserId);
  }

  // Fetch Applications and Activity (Original Logic)
  let applications: any[] = [];
  let applicationStatus = null;
  let activity = null;

  if (id !== "squad-demo-1") {
    const currentUserId = user?.id;
    if (currentUserId && !isMember) {
      const { data: application } = await supabase
        .from("squad_applications")
        .select("status")
        .eq("squad_id", id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (application) {
        applicationStatus = application.status;
      }
    }

    if (isLeader) {
      const { data: apps } = await supabase
        .from("squad_applications")
        .select(`*, user:user_id(id, nickname, avatar_url, tier)`)
        .eq("squad_id", id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      applications = apps || [];
    }

    if (squad.activity_id) {
      activity = await fetchDevEventById(squad.activity_id);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge
                variant={
                  // @ts-ignore
                  squad.status === "recruiting" ? "default" : "secondary"
                }
              >
                {squad.status === "recruiting" ? "모집중" : "모집마감"}
              </Badge>
              <span className="text-sm font-medium text-muted-foreground uppercase">
                {squad.type}
              </span>
            </div>

            <h1 className="text-3xl font-bold mb-4 leading-tight">
              {squad.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  {/* @ts-ignore */}
                  <AvatarImage src={squad.leader?.avatar_url} />
                  <AvatarFallback>{squad.leader?.nickname?.[0]}</AvatarFallback>
                </Avatar>
                {/* @ts-ignore */}
                <span className="font-medium text-foreground">
                  {squad.leader?.nickname}
                </span>
              </div>
              <span>·</span>
              <span>
                {formatDistanceToNow(new Date(squad.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {isLeader && (
                  <SquadHeaderActions squadId={squad.id} isLeader={isLeader} />
                )}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                >
                  <AlertTriangle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Activity Link Banner */}
          {activity && (
            <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg">
                  <Star className="w-5 h-5 text-blue-600 dark:text-blue-300 fill-current" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                    관련 활동
                  </p>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {activity.title}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto" asChild>
                  <a
                    href={`/career/activities/${activity.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    자세히 보기
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Body Content */}
          <div className="prose dark:prose-invert max-w-none min-h-[300px]">
            <Viewer content={squad.content} />
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card className="shadow-sm border-border relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-end mb-2">
                <CardTitle className="text-base font-semibold">
                  모집 현황
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">
                    {squad.recruited_count}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    / {squad.capacity}명
                  </span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-secondary/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(squad.recruited_count / squad.capacity) * 100}%`,
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {isLeader ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {/* @ts-ignore */}
                    <ApplicantManager
                      squadId={squad.id}
                      initialApplications={applications}
                    />

                    {/* Management Buttons */}
                    <SquadActions
                      squadId={squad.id}
                      isLeader={isLeader}
                      status={squad.status}
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <CreateWorkspaceDialog fromSquadId={squad.id}>
                      <Button className="w-full" variant="default">
                        <Monitor className="w-4 h-4 mr-2" />
                        워크스페이스 생성
                      </Button>
                    </CreateWorkspaceDialog>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      팀원이 모두 모였다면 워크스페이스로 이동하여 협업을
                      시작하세요.
                    </p>
                  </div>
                </div>
              ) : isMember ? (
                <div className="space-y-3 pt-2">
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl text-center">
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Star className="w-6 h-6 text-primary fill-current" />
                    </div>
                    <p className="font-bold text-foreground mb-1">팀 합류 완료!</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      팀원들과 협업을 시작할 준비가 되었습니다.
                    </p>
                    <Link href="/workspace/p-2">
                      <Button className="w-full gap-2 shadow-md" asChild>
                        <Link href="/workspace/p-2">
                          <Monitor className="w-4 h-4" />
                          워크스페이스로 이동
                        </Link>
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  {/* @ts-ignore */}
                  <ApplicationButton
                    squadId={squad.id}
                    currentUserId={user?.id}
                    status={applicationStatus}
                    isRecruiting={squad.status === "recruiting"}
                    leaderId={squad.leader_id}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">상세 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Monitor className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <span className="font-semibold block mb-0.5">진행 방식</span>
                  <span className="text-muted-foreground">
                    {squad.place_type === "online"
                      ? "온라인"
                      : squad.place_type === "offline"
                        ? "오프라인"
                        : "온/오프라인 혼합"}
                  </span>
                </div>
              </div>
              {(squad.location || squad.place_type !== "online") && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <span className="font-semibold block mb-0.5">
                      활동 지역/플랫폼
                    </span>
                    <span className="text-muted-foreground">
                      {squad.location || "-"}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <span className="font-semibold block mb-0.5">모집 마감</span>
                  <span className="text-muted-foreground">
                    상시 모집 (인원 충원 시 마감)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tech Stack */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">필요 기술 / 언어</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {squad.tech_stack?.map((tech: string) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
                {(!squad.tech_stack || squad.tech_stack.length === 0) && (
                  <span className="text-sm text-muted-foreground">무관</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                참여 멤버 ({squad.recruited_count})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {/* @ts-ignore */}
                {squad.members?.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.profile?.avatar_url} />
                      <AvatarFallback>
                        {member.profile?.nickname?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.profile?.nickname}
                        {member.role === "leader" && (
                          <span className="ml-1 text-xs text-primary font-bold">
                            👑
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
