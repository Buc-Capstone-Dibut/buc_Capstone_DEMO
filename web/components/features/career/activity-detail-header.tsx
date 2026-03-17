"use client";

import { DevEvent } from "@/lib/types/dev-event";
import { cn } from "@/lib/utils";
import { ArrowLeft, Calendar, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

interface ActivityDetailHeaderProps {
  event: DevEvent;
}

// Consistent Gradient Generator
function getGradientClass(str: string) {
  const gradients = [
    "from-blue-500 to-cyan-400",
    "from-indigo-500 to-purple-500",
    "from-rose-500 to-orange-400",
    "from-emerald-500 to-teal-400",
    "from-violet-600 to-indigo-600",
    "from-amber-500 to-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function ActivityDetailHeader({ event }: ActivityDetailHeaderProps) {
  const [imgError, setImgError] = useState(false);
  const displayHost = event.host || event.source_title || "주최 정보 없음";
  const gradient = useMemo(
    () => getGradientClass(displayHost || event.title),
    [displayHost, event.title]
  );

  const displayImage = event.thumbnail;
  const showFallback = !displayImage || imgError;

  return (
    <div className="relative w-full">
      {/* Background Cover */}
      <div
        className={cn(
          "relative w-full h-[400px] bg-gradient-to-br flex items-end",
          gradient
        )}
      >
        {/* Use Real Image if available as background */}
        {!showFallback ? (
          <>
            <img
              src={displayImage!}
              alt={event.title}
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-white/10 dark:bg-black/10 mix-blend-overlay" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </>
        )}

        {/* Content Container */}
        <div className="container mx-auto px-4 max-w-5xl z-10 pb-12">
          <Link
            href="/insights/activities"
            className="inline-flex items-center text-white/80 hover:text-white mb-6 text-sm group transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />{" "}
            목록으로 돌아가기
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end justify-between">
            <div className="space-y-4 flex-1">
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 hover:bg-white/30 text-foreground backdrop-blur-md border-transparent text-sm px-3 py-1 rounded-full font-medium inline-block text-white">
                  {event.category || "Activity"}
                </span>
                {event.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="bg-white/10 text-white/90 backdrop-blur-sm border-white/10 text-xs px-2.5 py-1 rounded-full border"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-foreground drop-shadow-sm">
                {event.title}
              </h1>

              <div className="flex flex-wrap gap-4 text-muted-foreground/90 font-medium text-base">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-5 h-5" />
                  {event.date}
                </span>
                <span className="flex items-center gap-1.5">
                  Hosted by {displayHost}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div className="w-full md:w-auto shrink-0 flex flex-col gap-3">
              <div className="p-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-xl">
                <Link
                  href={event.link}
                  target="_blank"
                  className="w-full md:w-auto h-14 px-8 flex items-center justify-center text-lg bg-background text-foreground hover:bg-background/90 rounded-lg font-bold transition-colors"
                >
                  공식 홈페이지 방문
                  <ExternalLink className="w-5 h-5 ml-2 text-muted-foreground" />
                </Link>
              </div>

              {/* Recruit Team Button */}
              <Link
                href={`/community/squad/write?activityId=${event.id
                  }&activityTitle=${encodeURIComponent(event.title)}`}
                className="w-full md:w-auto h-12 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-lg flex items-center justify-center font-medium transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                팀원 모집하기
              </Link>

              {/* Status Badge below button */}
              <div className="flex justify-center">
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded",
                    event.status === "recruiting" &&
                    "bg-emerald-100 text-emerald-700",
                    event.status === "closed" && "bg-slate-100 text-slate-500",
                    !["recruiting", "closed"].includes(event.status) &&
                    "bg-blue-100 text-blue-700"
                  )}
                >
                  {event.status === "recruiting"
                    ? "모집중"
                    : event.status === "closed"
                      ? "마감됨"
                      : event.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
