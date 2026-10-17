"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { DevEvent } from "@/lib/types/dev-event";
import { formatDevEventDDay } from "@/lib/dev-event-dates";
import { Button } from "@/components/ui/button";

interface ClosingSoonWidgetProps {
  events: DevEvent[];
}

const ITEMS_PER_PAGE = 3;

export function ClosingSoonWidget({ events }: ClosingSoonWidgetProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentEvents = events.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <Card className="border-border/50 shadow-sm bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Timer className="h-5 w-5 text-red-500" />
          마감 임박 활동
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {currentEvents.length > 0 ? (
          currentEvents.map((e) => (
            <Link
              key={e.id}
              href={e.link} // External link or internal detail
              target="_blank"
              className="group block w-full overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h5 className="text-sm font-medium group-hover:text-primary truncate transition-colors leading-tight">
                    {e.title}
                  </h5>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {e.host || "주최 정보 없음"}
                  </p>
                </div>
                <Badge
                  variant="destructive"
                  className="shrink-0 text-[10px] px-1.5 h-5 font-normal"
                >
                  {formatDevEventDDay(e.end_date || e.date)}
                </Badge>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-sm text-muted-foreground py-2 text-center">
            마감 임박 행사가 없습니다.
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

        <Link
          href="/insights/activities?sort=deadline"
          className="text-xs text-center text-muted-foreground hover:text-primary flex items-center justify-center pt-2 border-t border-border/50 mt-1"
        >
          전체 보기 <ArrowRight className="h-3 w-3 ml-1" />
        </Link>
      </CardContent>
    </Card>
  );
}
