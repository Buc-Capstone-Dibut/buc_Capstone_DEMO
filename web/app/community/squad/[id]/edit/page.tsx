import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import SquadForm from "@/components/features/community/squad-form";

export default async function SquadEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: squad } = await supabase
    .from("squads")
    .select("*")
    .eq("id", id)
    .single();

  if (!squad) {
    notFound();
  }

  // Permission Check
  if ((squad as any).leader_id !== user.id) {
    return (
      <div className="container mx-auto py-20 text-center">
        수정 권한이 없습니다.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8 text-center">모집글 수정</h1>
      {/* @ts-ignore */}
      <SquadForm initialData={squad} />
    </div>
  );
}
