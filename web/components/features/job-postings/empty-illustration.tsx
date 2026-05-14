"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyJobPostings({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/20 px-6 py-14 text-center">
      <Image
        src="/interview/avatar/dibut-idle.svg"
        alt=""
        width={96}
        height={96}
        priority
        aria-hidden
        className="opacity-90"
      />
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">
          아직 등록된 채용공고가 없어요
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          관심 공고를 등록하면 캘린더로 일정을 관리하고, 바로 모의면접까지 이어갈 수 있습니다.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1.5">
        <Plus className="h-4 w-4" aria-hidden />첫 채용공고 등록하기
      </Button>
    </div>
  );
}
