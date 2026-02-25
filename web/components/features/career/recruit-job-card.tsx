"use client";

import { RecruitJob } from "@/lib/types/recruit";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Calendar, Eye, MapPin, Briefcase } from "lucide-react";

interface RecruitJobCardProps {
  job: RecruitJob;
}

// 1. Consistent Gradient Generator
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

// 2. D-Day Helper
function getDDay(deadline: string) {
  if (deadline.includes("상시"))
    return {
      text: "Always",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    };
  if (deadline.includes("채용시"))
    return {
      text: "Open",
      color:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };

  try {
    const matches = deadline.match(/(\d+)\/(\d+)/);
    if (!matches) return null;

    const month = parseInt(matches[1]);
    const day = parseInt(matches[2]);
    const now = new Date();
    const currentYear = now.getFullYear();
    let targetYear = currentYear;
    if (month < now.getMonth() + 1) targetYear += 1;

    const targetDate = new Date(targetYear, month - 1, day);
    targetDate.setHours(23, 59, 59);

    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return {
        text: "Closed",
        color: "bg-slate-200 text-slate-500 dark:bg-slate-800",
      };
    if (diffDays === 0)
      return {
        text: "D-Day",
        color:
          "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300 font-bold",
      };
    if (diffDays <= 7)
      return {
        text: `D-${diffDays}`,
        color:
          "bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300 font-medium",
      };
    return {
      text: `D-${diffDays}`,
      color:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    };
  } catch {
    return null;
  }
}

export function RecruitJobCard({ job }: RecruitJobCardProps) {
  const gradient = useMemo(() => getGradientClass(job.company), [job.company]);
  const dDay = getDDay(job.deadline);

  // Mock Views
  const views = useMemo(
    () => 100 + (parseInt(job.id.slice(-3)) || 0),
    [job.id]
  );

  return (
    <Link
      href={job.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        {/* 1. Thumbnail Area (Generative Cover or Real Image) */}
        <div
          className={cn(
            "relative h-40 bg-gradient-to-br p-6 flex flex-col justify-between overflow-hidden",
            gradient
          )}
        >
          {/* Real Image Overlay */}
          {job.image_url ? (
            <>
              <img
                src={job.image_url}
                alt={job.company}
                className="absolute inset-0 w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-white/10 dark:bg-black/10 mix-blend-overlay" />
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, white 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />
            </>
          )}

          {/* Content on Cover */}
          <div className="relative z-10 pointer-events-none">
            <span className="inline-block px-2 py-1 rounded-md bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-wide uppercase shadow-sm">
              Recruit
            </span>
          </div>

          <h2 className="relative z-10 text-white font-black text-2xl tracking-tight leading-none drop-shadow-md opacity-95 break-keep pointer-events-none">
            {job.company}
          </h2>
        </div>

        {/* 2. Content Area */}
        <div className="flex-1 p-5 flex flex-col">
          {/* Title */}
          <h3 className="text-[17px] font-bold text-slate-900 dark:text-slate-100 mb-3 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 min-h-[3.25rem]">
            {job.title}
          </h3>

          {/* Meta Tags */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {job.tags.slice(0, 4).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="font-normal text-[11px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {tag}
              </Badge>
            ))}
            {job.tags.length > 4 && (
              <span className="text-[10px] text-slate-400 flex items-center">
                +{job.tags.length - 4}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {job.experience.slice(0, 2)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {job.location.split(" ")[0]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {views}
              </span>
              {dDay && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded font-medium ml-1",
                    dDay.color
                  )}
                >
                  {dDay.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
