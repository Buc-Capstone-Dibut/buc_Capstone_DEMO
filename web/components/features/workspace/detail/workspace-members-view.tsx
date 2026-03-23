"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
              <div className="bg-muted/50 p-4 rounded-full">
                <Users className="h-8 w-8 text-muted-foreground/70" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">
                  등록된 팀원이 없습니다
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  우측 상단의 초대 버튼을 눌러 새로운 팀원을 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold w-[14%] py-4 px-6 text-foreground">
                    권한
                  </TableHead>
                  <TableHead className="font-semibold w-[20%] text-foreground">
                    팀 역할
                  </TableHead>
                  <TableHead className="font-semibold w-[10%] text-foreground text-center">
                    프로필
                  </TableHead>
                  <TableHead className="font-semibold w-[18%] text-foreground pl-10">
                    이름
                  </TableHead>
                  <TableHead className="font-semibold w-[23%] text-foreground">
                    이메일
                  </TableHead>
                  <TableHead className="font-semibold w-[15%] text-foreground">
                    참여 일자
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow
                    key={member.id}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="py-4 px-6">
                      <Badge
                        variant="secondary"
                        className={`font-medium shadow-sm ${member.role === "owner" ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground"}`}
                      >
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 pr-4">
                      {member.team_role ? (
                        <Badge variant="outline" className="font-normal">
                          {member.team_role}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                      {isOwner && !isReadOnly && (
                        <div className="mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingMember(member)}
                          >
                            {member.team_role ? "팀 역할 변경" : "팀 역할 설정"}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Avatar className="h-9 w-9 ring-1 ring-border shadow-sm">
                          <AvatarImage src={member.avatar || ""} />
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                            {(member.nickname || member.name || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </TableCell>
                    <TableCell className="pl-10">
                      <span className="truncate font-medium text-foreground">
                        {member.nickname || member.name || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {member.email || (
                        <span className="text-muted-foreground/50 italic">
                          이메일 정보 없음
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatJoinedAt(member.joined_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6">이메일</TableHead>
                  <TableHead>기본 권한</TableHead>
                  <TableHead>팀 역할</TableHead>
                  <TableHead>초대일</TableHead>
                  <TableHead>만료일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="px-6 text-sm text-foreground">
                      {invite.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium">
                        {ROLE_LABELS[invite.role] || invite.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invite.team_role || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatJoinedAt(invite.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatJoinedAt(invite.expires_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
