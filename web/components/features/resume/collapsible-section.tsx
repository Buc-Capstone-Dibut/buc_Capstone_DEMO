"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  /** 우측에 보이는 보조 정보 (예: "3개", "필수"). */
  badge?: string;
  /** 우측 액션 버튼 (예: "추가하기"). 헤더 클릭과 분리되도록 stopPropagation 처리 권장. */
  action?: React.ReactNode;
  /** 펼친 상태로 시작할지 여부. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * 이력서 편집기의 입력 카드를 접고 펼칠 수 있게 감싸는 래퍼.
 *
 * 카드 본문이 길어 스크롤이 과도해지는 문제를 완화한다. 핵심 섹션(기본 정보, 기술
 * 스택)은 defaultOpen=true 로, 그 외 섹션(자기소개·경력·프로젝트)은 defaultOpen=false
 * 로 시작해 첫 화면을 짧게 유지한다.
 */
export function CollapsibleSection({
  title,
  badge,
  action,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40",
          open && "border-b",
        )}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          {badge && (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">
              {badge}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {action && (
            <span onClick={(e) => e.stopPropagation()} className="inline-flex">
              {action}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
            aria-hidden
          />
        </span>
      </button>
      {open && (
        <CardContent className="space-y-4 p-5">{children}</CardContent>
      )}
    </Card>
  );
}
