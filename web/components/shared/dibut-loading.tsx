"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * 디벗 브랜드 로딩 애니메이션(무한 루프 mp4).
 * 리포트 생성처럼 풀스크린으로 기다리는 큰 대기 화면에 사용한다.
 * (인라인 버튼/리스트의 작은 스피너 대체용은 아님.)
 */
export function DebutLoading({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // React가 muted 속성을 누락하는 경우 대비 — autoplay 보장
    video.muted = true;
    void video.play().catch(() => undefined);
  }, []);

  return (
    <video
      ref={ref}
      src="/dibut-loading.mp4"
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      className={cn("h-auto w-28 select-none object-contain", className)}
    />
  );
}
