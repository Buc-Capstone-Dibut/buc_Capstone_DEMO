"use client";

import { usePresence } from "@/components/providers/presence-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, ExternalLink } from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type PulseMember = {
  id: string;
  avatar_url: string | null;
  nickname: string | null;
};

type PulseWorkspace = {
  recent_members?: PulseMember[];
};

export function GlobalPulseSidebar() {
    const { onlineUsers } = usePresence();
    const { data: workspaces } = useSWR<PulseWorkspace[]>("/api/workspaces", fetcher);

    // Extract all unique members across all workspaces
    const allMembers = workspaces ? Array.from(
        new Map(
            workspaces.flatMap((workspace) => workspace.recent_members || []).map((member) => [member.id, member])
        ).values()
    ) : [];

    const onlineCount = allMembers.filter((member) => onlineUsers.has(member.id)).length;

    return (
        <div className="space-y-6">
            {/* Global Activity Pulse */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-background">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            글로벌 팀 펄스
                        </span>
                        <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-none">
                            {onlineCount} Online
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    <div className="flex -space-x-2 overflow-hidden py-1">
                        {allMembers.map((member) => (
                            <div key={member.id} className="relative group">
                                <WorkspaceUserAvatar
                                    name={member.nickname}
                                    avatarUrl={member.avatar_url}
                                    className={cn(
                                    "h-8 w-8 ring-2 ring-background border-2 transition-transform hover:-translate-y-1",
                                    onlineUsers.has(member.id) ? "border-green-500/50" : "border-transparent"
                                )}
                                    fallbackClassName="text-[10px]"
                                />
                                {onlineUsers.has(member.id) && (
                                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-1 ring-background" />
                                )}
                            </div>
                        ))}
                        {allMembers.length === 0 && (
                            <p className="text-[11px] text-muted-foreground italic pl-2">현재 활동 중인 팀원이 없습니다.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Central Schedule (Placeholder/Simplified) */}
            <Card className="border-none shadow-sm bg-card/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        통합 주요 일정
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                    <div className="text-[11px] bg-muted/30 p-3 rounded-lg border border-dashed text-center text-muted-foreground">
                        연동된 전체 일정을 불러오는 중입니다.
                    </div>
                </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="px-2 space-y-2">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">시스템 도구</h4>
                <Link href="/insights/tech-blog" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-xs font-medium">
                    기술 블로그 탐색 <ExternalLink className="h-3 w-3 opacity-50" />
                </Link>
                <Link href="/community/squad" className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-xs font-medium">
                    팀 찾기 / 만들기 <ExternalLink className="h-3 w-3 opacity-50" />
                </Link>
            </div>
        </div>
    );
}
