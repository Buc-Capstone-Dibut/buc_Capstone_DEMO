"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";

import { InviteMemberModal } from "@/components/features/workspace/dialogs/invite-member-modal";
import { normalizeWorkspaceTeamRole } from "@/lib/workspace-team-roles";
import { TeamRolePickerDialog } from "@/components/features/workspace/dialogs/team-role-picker-dialog";

type WorkspaceMember = {
  id: string;
  name: string;
  nickname?: string | null;
  email?: string | null;
  avatar?: string | null;
  role: string;
  team_role?: string | null;
  joined_at?: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  team_role?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
};

type WorkspaceResponse = {
  my_role?: string | null;
  read_only?: boolean;
  lifecycle_status?: "IN_PROGRESS" | "COMPLETED";
  members?: WorkspaceMember[];
  pending_invites?: PendingInvite[];
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch workspace");
  }
  return response.json() as Promise<WorkspaceResponse>;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "오너",
  admin: "관리자",
  member: "멤버",
  viewer: "보기 전용",
};

const formatJoinedAt = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export function WorkspaceMembersView({ projectId }: { projectId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(
    null,
  );
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const { data, isLoading, mutate } = useSWR(
    `/api/workspaces/${projectId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );

  const members = useMemo(() => data?.members ?? [], [data?.members]);
  const pendingInvites = useMemo(
    () => data?.pending_invites ?? [],
    [data?.pending_invites],
  );
  const isOwner = data?.my_role === "owner";
  const isReadOnly =
    data?.read_only || data?.lifecycle_status === "COMPLETED";

  const handleSaveTeamRole = async (
    member: WorkspaceMember,
    nextValue: string | null,
  ) => {
    const nextTeamRole = normalizeWorkspaceTeamRole(nextValue);
    const currentTeamRole = normalizeWorkspaceTeamRole(member.team_role);

    if (nextTeamRole === currentTeamRole) {
      return true;
    }

    setSavingMemberId(member.id);

    try {
      const response = await fetch(
        `/api/workspaces/${projectId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teamRole: nextTeamRole }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "팀 역할 저장에 실패했습니다.");
      }

      toast.success("팀 역할을 저장했습니다.");
      await mutate();
      setEditingMember(null);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "팀 역할 저장에 실패했습니다.",
      );
      return false;
    } finally {
      setSavingMemberId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl min-w-0 mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">멤버 관리</h2>
          <p className="text-sm text-muted-foreground mt-2">
            팀원 정보와 팀 역할을 확인합니다. 팀 역할은 권한과 무관한
            식별용 텍스트입니다.
          </p>
        </div>
        {isOwner && !isReadOnly && (
          <Button
            onClick={() => setInviteOpen(true)}
            className="gap-2 shadow-sm shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            새로운 팀원 초대
          </Button>
        )}
      </div>

      {isReadOnly && (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          이 팀 공간은 종료되어 멤버 초대를 할 수 없습니다.
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-medium text-foreground">
            전체 멤버{" "}
            <span className="text-muted-foreground font-normal ml-1 border pl-2 pr-2 py-0.5 rounded-full text-xs">
              {members.length}명
            </span>
          </h3>
        </div>

        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="px-6 py-12 flex items-center justify-center">
              <span className="text-sm text-muted-foreground animate-pulse">
                멤버 정보를 불러오는 중입니다...
              </span>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="bg-muted/50 p-4 rounded-full border border-border/30 shadow-sm">
                <Users className="h-8 w-8 text-muted-foreground/70" />
              </div>
              <div className="mt-2">
                <p className="text-base font-semibold text-foreground">
                  등록된 팀원이 없습니다
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  우측 상단의 초대 버튼을 눌러 새로운 팀원을 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {/* List Header */}
              <div className="hidden sm:flex items-center justify-between px-6 py-3 text-xs font-semibold text-muted-foreground bg-muted/10 border-b border-border/40">
                <div className="min-w-[30%]">프로필</div>
                <div className="flex items-center gap-6 flex-1 max-w-[50%]">
                  <div className="w-[100px]">기본 권한</div>
                  <div className="w-[180px]">팀 역할 (구분용)</div>
                </div>
                <div className="w-[100px] text-right">참여 일자</div>
              </div>

              {/* List Body */}
              <div className="flex flex-col">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between py-4 px-6 hover:bg-muted/20 transition-colors border-b last:border-0 border-border/40 gap-4 sm:gap-0"
                  >
                    <div className="flex items-center gap-3.5 min-w-[30%]">
                      <WorkspaceUserAvatar
                        name={member.nickname || member.name}
                        avatarUrl={member.avatar}
                        className="h-9 w-9 ring-1 ring-border/50 shadow-sm"
                        fallbackClassName="bg-primary/5 text-primary text-xs font-medium"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm text-foreground truncate">
                          {member.nickname || member.name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {member.email || (
                            <span className="italic opacity-70">이메일 없음</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-1 max-w-[50%]">
                      <div className="w-[100px] shrink-0">
                        <Badge
                          variant="secondary"
                          className={`font-medium shadow-sm transition-colors text-xs ${
                            member.role === "owner"
                              ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                              : "bg-muted text-muted-foreground border-transparent"
                          }`}
                        >
                          {ROLE_LABELS[member.role] || member.role}
                        </Badge>
                      </div>

                      <div className="w-[180px] shrink-0 flex items-center gap-2">
                        {member.team_role ? (
                          <Badge variant="outline" className="font-normal text-xs text-muted-foreground/90 border-muted-foreground/20 bg-background shadow-sm hover:bg-muted/30 transition-colors">
                            {member.team_role}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">역할 미지정</span>
                        )}
                        {isOwner && !isReadOnly && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 shrink-0 shadow-sm"
                            onClick={() => setEditingMember(member)}
                          >
                            {member.team_role ? "변경" : "설정"}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground sm:w-[100px] sm:text-right hidden sm:block">
                      {formatJoinedAt(member.joined_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isOwner && pendingInvites.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-foreground">
              대기 중 초대
              <span className="text-muted-foreground font-normal ml-1 border pl-2 pr-2 py-0.5 rounded-full text-xs">
                {pendingInvites.length}건
              </span>
            </h3>
          </div>

          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="flex flex-col w-full">
              {/* Header */}
              <div className="hidden sm:flex items-center justify-between px-6 py-2.5 text-xs font-semibold text-muted-foreground bg-muted/10 border-b border-border/40">
                <div className="min-w-[40%] flex-1">이메일</div>
                <div className="flex items-center gap-6 flex-1 max-w-[40%]">
                  <div className="w-[100px]">예정 권한</div>
                  <div className="w-[140px]">팀 역할 (구분용)</div>
                </div>
                <div className="w-[100px] text-right">상태</div>
              </div>

              {/* Body */}
              <div className="flex flex-col">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="group flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-6 hover:bg-muted/20 transition-colors border-b last:border-0 border-border/40 gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 min-w-[40%] flex-1">
                      <div className="h-8 w-8 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center shrink-0 shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground">
                          {invite.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">{invite.email}</span>
                    </div>

                    <div className="flex items-center gap-6 flex-1 max-w-[40%]">
                      <div className="w-[100px] shrink-0">
                        <Badge variant="secondary" className="font-normal text-xs bg-muted text-muted-foreground/80 border-transparent shadow-sm">
                          {ROLE_LABELS[invite.role] || invite.role}
                        </Badge>
                      </div>
                      <div className="w-[140px] shrink-0">
                        {invite.team_role ? (
                          <Badge variant="outline" className="font-normal text-xs text-muted-foreground/90 border-muted-foreground/20 bg-background shadow-sm border-dashed">
                            {invite.team_role}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 italic">미지정</span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground sm:w-[100px] flex flex-col sm:items-end justify-center hidden sm:flex">
                      <span className="text-primary/80 font-medium">대기 중</span>
                      {invite.expires_at && (
                        <span className="text-[10px] opacity-60 mt-0.5">{formatJoinedAt(invite.expires_at)} 만료</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isOwner && !isReadOnly && (
        <InviteMemberModal
          workspaceId={projectId}
          isOpen={inviteOpen}
          onClose={() => {
            setInviteOpen(false);
            void mutate();
          }}
        />
      )}

      <TeamRolePickerDialog
        open={Boolean(editingMember)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMember(null);
          }
        }}
        title={
          editingMember
            ? `${editingMember.nickname || editingMember.name}님의 팀 역할 설정`
            : "팀 역할 설정"
        }
        value={editingMember?.team_role}
        pending={Boolean(
          editingMember && savingMemberId === editingMember.id,
        )}
        onSave={async (nextValue) => {
          if (!editingMember) return;
          await handleSaveTeamRole(editingMember, nextValue);
        }}
      />
    </div>
  );
}
