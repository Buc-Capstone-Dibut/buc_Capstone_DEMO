"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTechLogo } from "@/lib/interview/tech-logos";

interface TechLogoChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
  iconClassName?: string;
}

export function TechLogoChip({ label, onRemove, className, iconClassName }: TechLogoChipProps) {
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
      <span>{label}</span>
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
