"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteMemberModal } from "@/components/features/workspace/dialogs/invite-member-modal";

type WorkspaceMember = {
  id: string;
  name: string;
  nickname?: string | null;
  email?: string | null;
  avatar?: string | null;
  role: string;
  joined_at?: string | null;
};

type WorkspaceResponse = {
  my_role?: string | null;
  members?: WorkspaceMember[];
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
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
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
  const { data, isLoading, mutate } = useSWR(
    `/api/workspaces/${projectId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );

  const members = useMemo(() => data?.members ?? [], [data?.members]);
  const isOwner = data?.my_role === "owner";

  return (
    <div className="p-6 md:p-10 max-w-4xl min-w-0 mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">멤버 관리</h2>
          <p className="text-sm text-muted-foreground mt-2">
            워크스페이스에 참여 중인 팀원들의 권한과 정보를 확인하고 관리합니다.
          </p>
        </div>
        {isOwner && (
          <Button
            onClick={() => setInviteOpen(true)}
            className="gap-2 shadow-sm shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            새로운 팀원 초대
          </Button>
        )}
      </div>

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
                  <TableHead className="font-semibold w-[15%] py-4 px-6 text-foreground">
                    역할
                  </TableHead>
                  <TableHead className="font-semibold w-[10%] text-foreground text-center">
                    프로필
                  </TableHead>
                  <TableHead className="font-semibold w-[25%] text-foreground pl-10">
                    이름
                  </TableHead>
                  <TableHead className="font-semibold w-[35%] text-foreground">
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

      {isOwner && (
        <InviteMemberModal
          workspaceId={projectId}
          isOpen={inviteOpen}
          onClose={() => {
            setInviteOpen(false);
            void mutate();
          }}
        />
      )}
    </div>
  );
}
