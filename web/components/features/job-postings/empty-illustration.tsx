"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 채용공고가 0개일 때 표시하는 빈 상태 일러스트.
 *
 * Dibut 마스코트(idle)를 중앙에 배치하고, 뒤쪽에 부드러운 amber blur로
 * 따뜻한 분위기를 만든다. "첫 공고 등록" CTA를 제공한다.
 */
export function EmptyJobPostings({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed bg-gradient-to-br from-amber-50 via-orange-50/40 to-white p-10 text-center">
      <div className="relative">
        {/* 마스코트 뒤쪽 amber blur — 후광 효과 */}
        <div
          className="absolute inset-0 -z-10 animate-pulse rounded-full bg-amber-200/40 blur-2xl"
          aria-hidden
        />
        <Image
          src="/interview/avatar/dibut-idle.svg"
          alt="Dibut 마스코트"
          width={140}
          height={140}
          priority
          className="drop-shadow-md"
        />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">
          아직 등록된 채용공고가 없어요
        </p>
        <p className="text-sm text-muted-foreground">
          관심 공고를 등록하면 일정 관리부터 모의면접까지 한 번에 진행할 수 있어요.
        </p>
      </div>
      <Button onClick={onCreate} size="lg" className="gap-2">
        <Sparkles className="h-4 w-4" />첫 채용공고 등록하기
      </Button>
    </div>
  );
}
