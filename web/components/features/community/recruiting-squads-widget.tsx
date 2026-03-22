"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronRight, ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { getTeamTypeLabel } from "@/lib/team-types";

interface Squad {
  id: string;
  title: string;
  type: string;
  status: string | null;
  created_at: string | null;
  recruited_count: number | null;
  capacity: number | null;
}

interface RecruitingSquadsWidgetProps {
  squads: Squad[];
}

const ITEMS_PER_PAGE = 3;

export function RecruitingSquadsWidget({
  squads,
}: RecruitingSquadsWidgetProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(squads.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentSquads = squads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <Card className="border-border/50 shadow-sm bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          모집 중인 팀
        </CardTitle>
        <Link
          href="/community/squad"
          className="text-xs text-muted-foreground hover:text-primary flex items-center"
        >
          더보기 <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="grid gap-2">
        {currentSquads.length > 0 ? (
          currentSquads.map((squad) => (
            <Link
              key={squad.id}
              href={`/community/squad/${squad.id}`}
              className="group block"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 h-5 shrink-0"
                  >
                    {getTeamTypeLabel(squad.type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {squad.created_at &&
                      formatDistanceToNow(new Date(squad.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                  </span>
                </div>
                <h4 className="font-medium text-sm group-hover:text-primary truncate transition-colors">
                  {squad.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="text-primary/80 font-medium">
                    {squad.recruited_count}/{squad.capacity}명
                  </span>
                  <span>모집 중</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            현재 모집 중인 팀이 없습니다.
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground mx-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}

        <Link href="/community/squad/write">
          <button className="w-full mt-2 text-xs py-2 rounded-md border border-dashed border-border hover:bg-accent/50 transition-colors text-muted-foreground">
            + 내 팀 만들기
          </button>
        </Link>
      </CardContent>
    </Card>
  );
}
