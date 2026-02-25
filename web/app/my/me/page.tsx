"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { GlobalHeader } from "@/components/layout/global-header";

export default function MyMePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/my/me", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.success || !json?.data?.handle) {
          throw new Error(json?.error || "프로필 정보를 불러올 수 없습니다.");
        }
        router.replace(`/my/${json.data.handle}`);
      } catch (err: any) {
        setError(err.message || "마이페이지로 이동할 수 없습니다.");
      }
    };
    run();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />
      <main className="flex-1 flex items-center justify-center p-6">
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            마이페이지로 이동 중입니다...
          </div>
        )}
      </main>
    </div>
  );
}
