"use client";

import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Megaphone, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { getTeamTypeLabel } from "@/lib/team-types";

interface PopularTopicItem {
  tag: string;
  count: number;
}

interface RecruitingSquadItem {
  id: string;
  title: string;
  type: string;
  place_type: string | null;
  location: string | null;
  created_at: string;
}

interface CommunitySidebarPayload {
  popularTopics: PopularTopicItem[];
  recruitingSquads: RecruitingSquadItem[];
  meta: {
    popularTopicsWindowDays: number;
    popularTopicsMaxPosts: number;
  };
}

const fetcher = async (url: string): Promise<CommunitySidebarPayload> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load sidebar data");
  }
  return res.json();
};

function getPlaceText(placeType: string | null, location: string | null) {
  if (placeType === "online") return "온라인";
  if (placeType === "offline") return location || "오프라인";
  if (placeType === "hybrid") return location || "온/오프라인";
  return location || "장소 미정";
}

export function CommunitySidebar() {
  const { data } = useSWR<CommunitySidebarPayload>(
    "/api/community/sidebar",
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60_000,
      dedupingInterval: 30_000,
    },
  );

  const popularTopics = data?.popularTopics || [];
  const recruitingSquads = data?.recruitingSquads || [];

  return (
    <div className="space-y-6">
      {/* 1. Write Button (Mobile prominent, but good to have here too or just info) */}

      {/* 2. Popular Tags / Topics */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            인기 토픽 (Weekly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {popularTopics.length > 0 ? (
              popularTopics.map((topic) => (
                <Badge
                  key={topic.tag}
                  variant="secondary"
                  className="font-normal"
                >
                  #{topic.tag}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                아직 집계된 토픽이 없습니다.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Recommended Squads */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              모집 중인 팀
            </div>
            <Link
              href="/community/squad"
              className="text-xs font-normal text-muted-foreground hover:text-primary transition-colors"
            >
              전체보기
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recruitingSquads.length > 0 ? (
            recruitingSquads.map((squad, idx) => (
              <div key={squad.id}>
                {idx > 0 && <div className="h-px bg-border mb-4" />}
                <Link
                  href={`/community/squad/${squad.id}`}
                  className="block group"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium group-hover:text-primary truncate">
                      {squad.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getTeamTypeLabel(squad.type)} ·{" "}
                      {getPlaceText(squad.place_type, squad.location)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(squad.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">
              현재 모집 중인 팀이 없습니다.
            </div>
          )}

          <Link href="/community/squad">
            <Button
              variant="link"
              size="sm"
              className="w-full text-muted-foreground h-auto p-0 mt-2"
            >
              더보기
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* 4. Notices */}
      <Card className="shadow-sm bg-muted/40 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            공지사항
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="text-xs text-muted-foreground">
            등록된 공지사항이 없습니다.
          </div>
        </CardContent>
      </Card>

      {/* Footer / Copyright */}
      <div className="text-xs text-muted-foreground px-1">
        © 2026 Dibut Community
      </div>
    </div>
  );
}
