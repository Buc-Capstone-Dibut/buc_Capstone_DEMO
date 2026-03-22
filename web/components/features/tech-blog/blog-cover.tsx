"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { getLogoUrl } from "@/lib/logos";
import type { Blog } from "@/lib/supabase";

interface BlogCoverProps {
  title: string;
  author: string;
  category: Blog["category"];
  thumbnailUrl: string | null;
  variant?: "card" | "list";
  className?: string;
  imageClassName?: string;
}

const CATEGORY_LABELS: Record<Exclude<Blog["category"], null>, string> = {
  FE: "Frontend",
  BE: "Backend",
  AI: "AI",
  APP: "Mobile",
};

function getGradientClass(seed: string) {
  const gradients = [
    "from-blue-500 to-cyan-400",
    "from-indigo-500 to-purple-500",
    "from-rose-500 to-orange-400",
    "from-emerald-500 to-teal-400",
    "from-violet-600 to-indigo-600",
    "from-amber-500 to-orange-500",
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return gradients[Math.abs(hash) % gradients.length];
}

export function BlogCover({
  title,
  author,
  category,
  thumbnailUrl,
  variant = "card",
  className,
  imageClassName,
}: BlogCoverProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const gradient = useMemo(
    () => getGradientClass(author || title),
    [author, title],
  );

  const label = category ? CATEGORY_LABELS[category] ?? category : "Tech Blog";
  const logoUrl = getLogoUrl(author);
  const showFallback = !thumbnailUrl || imageError;
  const isCard = variant === "card";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        showFallback ? `bg-gradient-to-br ${gradient}` : "",
        className,
      )}
    >
      {showFallback ? (
        <>
          <div className="absolute inset-0 bg-white/10 dark:bg-black/10 mix-blend-overlay" />
          <div
            className={cn(
              "absolute inset-0 opacity-20",
              isCard ? "" : "opacity-25",
            )}
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: isCard ? "16px 16px" : "14px 14px",
            }}
          />

          <div className="relative z-10 flex h-full flex-col justify-between p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  "inline-flex rounded-md bg-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-md shadow-sm",
                  isCard ? "" : "text-[9px]",
                )}
              >
                {label}
              </span>
              {logoUrl ? (
                <div className="rounded-lg bg-white/20 p-1.5 backdrop-blur-md shadow-sm">
                  <Image
                    src={logoUrl}
                    alt={author}
                    width={isCard ? 22 : 18}
                    height={isCard ? 22 : 18}
                    className="rounded object-contain"
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <p
                className={cn(
                  "text-white/80",
                  isCard ? "text-xs" : "text-[11px]",
                )}
              >
                {label}
              </p>
              <h2
                className={cn(
                  "max-w-[85%] break-keep font-black tracking-tight drop-shadow-md",
                  isCard ? "text-2xl leading-none" : "text-lg leading-tight",
                )}
              >
                {author || title}
              </h2>
            </div>
          </div>
        </>
      ) : (
        <>
          {!imageLoaded ? (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted/50" />
          ) : null}
          <Image
            src={thumbnailUrl!}
            alt={title}
            fill
            className={cn(
              "object-cover transition-all duration-500",
              imageLoaded ? "opacity-100" : "opacity-0",
              imageClassName,
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
          />
          {imageLoaded ? (
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          ) : null}
        </>
      )}
    </div>
  );
}
