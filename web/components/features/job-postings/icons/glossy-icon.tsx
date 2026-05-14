"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 3D-look 광택 아이콘 래퍼.
 *
 * lucide 아이콘을 둥근 그라데이션 배지 안에 배치하고
 * inset highlight + drop shadow를 추가하여 살짝 떠 있는 듯한 느낌을 준다.
 *
 * Dibut 마스코트와 톤을 맞추기 위해 기본 그라데이션을 따뜻한 amber 계열로 잡았다.
 */
export function GlossyIcon({
  icon: Icon,
  gradient = "linear-gradient(135deg,#fde68a,#f59e0b 55%,#d97706)",
  size = 40,
  className = "",
  iconClassName = "",
}: {
  icon: LucideIcon;
  gradient?: string;
  size?: number;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl shadow-lg ring-1 ring-black/5",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: gradient,
        boxShadow:
          "0 10px 20px -8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 6px rgba(0,0,0,0.15)",
      }}
      aria-hidden
    >
      {/* 상단 하이라이트 layer — 광택 표현 */}
      <span className="pointer-events-none absolute inset-1 rounded-xl bg-white/15" aria-hidden />
      <Icon className={cn("relative h-1/2 w-1/2 text-white drop-shadow", iconClassName)} />
    </span>
  );
}
