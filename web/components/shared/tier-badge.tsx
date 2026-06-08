"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const TIER_TO_LEVEL: Record<string, number> = {
  "씨앗": 1,
  "새싹": 2,
  "묘목": 3,
  "나무": 4,
  "숲": 5,
  "거목": 6,
};

const SIZE = {
  xs: { icon: 16, gap: "gap-1", label: "text-[10px]" },
  sm: { icon: 20, gap: "gap-1.5", label: "text-xs" },
  md: { icon: 28, gap: "gap-2", label: "text-sm" },
  lg: { icon: 40, gap: "gap-2.5", label: "text-base font-bold" },
} as const;

export type TierBadgeProps = {
  tier?: string | null;
  size?: keyof typeof SIZE;
  showLabel?: boolean;
  className?: string;
};

export function TierBadge({
  tier,
  size = "sm",
  showLabel = true,
  className,
}: TierBadgeProps) {
  const safeTier = tier && TIER_TO_LEVEL[tier] ? tier : "씨앗";
  const level = TIER_TO_LEVEL[safeTier];
  const cfg = SIZE[size];

  return (
    <span className={cn("inline-flex items-center", cfg.gap, className)}>
      <Image
        src={`/level-icons/level-${level}.jpg`}
        alt={`레벨 ${level} ${safeTier}`}
        width={cfg.icon}
        height={cfg.icon}
        className="rounded-full ring-1 ring-slate-200 object-cover"
      />
      {showLabel && (
        <span className={cn(cfg.label, "font-semibold text-slate-700")}>
          {safeTier}
        </span>
      )}
    </span>
  );
}
