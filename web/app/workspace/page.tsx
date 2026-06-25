import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectList } from "@/components/features/workspace/hub/project-list";
import { Footer } from "@/components/layout/footer";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  // 비로그인 상태에서 빈 화면 + 안내문 뜨던 문제 → 커리어 관리쪽처럼 로그인 모달로
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/workspace");
  }

  return (
    <SidebarLayout>
      <div className="container mx-auto max-w-7xl flex-1 py-8 px-4">
        <ProjectList />
      </div>
      <Footer />
    </SidebarLayout>
  );
}
