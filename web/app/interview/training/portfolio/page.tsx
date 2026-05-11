"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LegacyPortfolioTrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    const repoUrl = searchParams.get("repoUrl");
    if (repoUrl) params.set("repoUrl", repoUrl);
    router.replace(`/interview/training/setup${params.toString() ? `?${params.toString()}` : ""}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#7cad46]" />
          <p className="mt-4 text-sm font-bold text-[#5f6b7a]">포트폴리오 디펜스 셋업으로 이동 중입니다.</p>
        </div>
      </main>
    </div>
  );
}
