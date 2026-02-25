"use client";

import { useState, useMemo } from "react";
import { DevEvent } from "@/lib/types/dev-event";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: DevEvent;
}

// Helper to get gradient based on host string (consistent with RecruitJobCard)
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

export function EventCard({ event }: EventCardProps) {
  const [imgError, setImgError] = useState(false);
  const gradient = useMemo(
    () => getGradientClass(event.host || event.title),
    [event.host, event.title]
  );

  // Use DB thumbnail if available
  const displayImage = event.thumbnail;
  const showFallback = !displayImage || imgError;

  return (
    <Link
      href={`/insights/activities/${event.id}`}
      className="group relative block h-full cursor-pointer focus:outline-none"
    >
      <div className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
        {/* Header: Image or Gradient Fallback */}
        <div
          className={cn(
            "relative h-40 flex flex-col justify-between overflow-hidden",
            showFallback
              ? `bg-gradient-to-br p-6 ${gradient}`
              : "bg-zinc-100 dark:bg-zinc-800"
          )}
        >
          {showFallback ? (
            <>
              {/* Pattern Overlay */}
              <div className="absolute inset-0 bg-white/10 dark:bg-black/10 mix-blend-overlay" />
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, white 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />
              {/* Content on Cover */}
              <div className="relative z-10 pointer-events-none">
                <span className="inline-block px-2 py-1 rounded-md bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-wide uppercase shadow-sm">
                  {event.category || "Activity"}
                </span>
              </div>
              <h2 className="relative z-10 text-white font-black text-2xl tracking-tight leading-none drop-shadow-md opacity-95 break-keep pointer-events-none">
                {event.host || "Activity"}
              </h2>
            </>
          ) : (
            <img
              src={displayImage!}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        <div className="relative z-10 flex flex-col flex-1 p-5">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full border shadow-sm bg-white dark:bg-slate-800
                    ${
                      tag.includes("유료")
                        ? "text-rose-500 border-rose-100 dark:border-rose-900"
                        : ""
                    }
                    ${
                      tag.includes("무료")
                        ? "text-emerald-600 border-emerald-100 dark:border-emerald-900"
                        : ""
                    }
                    ${
                      !tag.includes("유료") && !tag.includes("무료")
                        ? "text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                        : ""
                    }
                  `}
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="mb-2 text-lg font-bold leading-tight text-slate-900 dark:text-slate-100 transition-colors group-hover:text-primary line-clamp-2">
            {event.title}
          </h3>

          <div className="mt-auto space-y-3 pt-2">
            <div className="flex items-center text-sm text-muted-foreground bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2">
              <span className="font-semibold text-foreground text-xs uppercase w-10 shrink-0">
                Host
              </span>
              <span className="truncate text-xs">{event.host}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                {event.date}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
