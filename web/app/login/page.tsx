"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModal } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (!next) return "/";
    if (!next.startsWith("/")) return "/";
    return next;
  }, [searchParams]);

  /**
   * 모달이 닫힐 때 — 로그인 성공인지 그냥 X 닫기인지 구분 필요.
   * - 로그인 성공: session 존재 → nextPath 로 이동 (원래 가려던 페이지)
   * - X 닫기 (로그인 안 함): session 없음 → 홈으로 이동
   *   (nextPath 로 가면 protected 페이지 → 다시 /login → 무한 루프!)
   */
  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      const { data: { session } } = await supabase.auth.getSession();
      router.replace(session ? nextPath : "/");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">로그인이 필요합니다</h1>
        <p className="mt-2 text-sm text-slate-500">
          커리어 기능을 사용하려면 먼저 로그인해 주세요.
        </p>
        <Button
          className="mt-5 w-full"
          onClick={() => setOpen(true)}
        >
          로그인 열기
        </Button>
      </div>

      <AuthModal open={open} onOpenChange={handleOpenChange} defaultTab="login" />
    </main>
  );
}
