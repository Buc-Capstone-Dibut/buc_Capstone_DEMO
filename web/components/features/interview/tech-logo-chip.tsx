"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTechLogo } from "@/lib/interview/tech-logos";

interface TechLogoChipProps {
  /** 기술명 (예: "React"). 로고 매칭에 사용되므로 순수 이름만 전달할 것. */
  label: string;
  /** 보조 표시 (예: 숙련도 "Intermediate"). 선택. */
  sublabel?: string;
  onRemove?: () => void;
  className?: string;
  iconClassName?: string;
}

export function TechLogoChip({
  label,
  sublabel,
  onRemove,
  className,
  iconClassName,
}: TechLogoChipProps) {
  const logo = getTechLogo(label);
  const fallback = label
    .split(/[\s./-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-full border border-[#dfe7ef] bg-white px-2.5 py-1 text-xs font-bold text-[#4f5b6b] shadow-sm",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f3f6f9] bg-contain bg-center bg-no-repeat text-[9px] font-black text-[#7cad46]",
          iconClassName,
        )}
        style={logo ? { backgroundImage: `url(${logo.src})` } : undefined}
      >
        {logo ? null : fallback || "#"}
      </span>
      <span>{logo ? logo.label : label}</span>
      {sublabel ? (
        <span className="ml-0.5 rounded-sm bg-[#f3f6f9] px-1.5 py-0.5 text-[10px] font-medium text-[#7c8898]">
          {sublabel}
        </span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full text-[#8a96a6] transition-colors hover:text-destructive"
          aria-label={`${label} 제거`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}
