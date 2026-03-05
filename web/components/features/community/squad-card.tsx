"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Database } from "@/lib/database.types";
import { Users, MapPin, Calendar, MessageCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Squad = Database["public"]["Tables"]["squads"]["Row"] & {
  leader: Database["public"]["Tables"]["profiles"]["Row"] | null;
  activity?: { id: string; title: string } | null; // Placeholder for join if needed
};

interface SquadCardProps {
  squad: Squad;
  className?: string;
}

export function SquadCard({ squad, className }: SquadCardProps) {
  const isRecruiting = squad.status === "recruiting";

  return (
    <Link
      href={`/community/squad/${squad.id}`}
      className={cn(
        "group block h-full border rounded-xl overflow-hidden bg-card hover:border-primary/50 hover:shadow-md transition-all duration-300",
        className
      )}
    >
      <div className="p-5 flex flex-col h-full">
        {/* Header: Status & Type */}
        <div className="flex items-center justify-between mb-3">
          <Badge
            variant={isRecruiting ? "default" : "secondary"}
            className={cn(
              "font-semibold",
              isRecruiting
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isRecruiting ? "모집중" : "모집완료"}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {squad.title}
        </h3>

        {/* Activity Tag (if linked) */}
        {squad.activity_id && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md max-w-full truncate">
              <Star className="w-3 h-3 fill-current" />
              관련 활동 연동됨
            </span>
          </div>
        )}

        {/* Footer: Tech Stack & Info */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 h-[52px] content-start overflow-hidden">
            {squad.tech_stack && squad.tech_stack.length > 0 ? (
              squad.tech_stack.slice(0, 4).map((tech: string) => (
                <Badge
                  key={tech}
                  variant="outline"
                  className="bg-secondary/30 text-secondary-foreground text-[10px] px-1.5 h-5 border-0"
                >
                  {tech}
                </Badge>
              ))
            ) : (
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground text-[10px] px-1.5 h-5 border-0"
              >
                언어/기술 무관
              </Badge>
            )}
            {squad.tech_stack && squad.tech_stack.length > 4 && (
              <span className="text-[10px] text-muted-foreground flex items-center h-5">
                +{squad.tech_stack.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>
              {squad.recruited_count} / {squad.capacity}명
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate max-w-[80px]">
              {squad.place_type === "online"
                ? "온라인"
                : squad.location || "오프라인"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="truncate max-w-[100px]">
              {squad.recruitment_period || "상시 모집"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
