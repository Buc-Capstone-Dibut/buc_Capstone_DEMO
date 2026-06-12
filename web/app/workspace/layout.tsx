import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PresenceProvider } from "@/components/providers/presence-provider";

export const dynamic = "force-dynamic";

/**
 * 워크스페이스 layout 에서 server-side 인증 체크.
 * 비로그인 시 /login?next=/workspace 로 redirect.
 * /login 페이지가 X 닫기 시 무한 루프 없이 홈으로 이동 (career 와 동일 흐름).
 */
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/workspace");
  }

  return <PresenceProvider>{children}</PresenceProvider>;
}
