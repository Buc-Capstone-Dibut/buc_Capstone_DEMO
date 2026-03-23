import type { ComponentProps } from "react";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import SquadForm from "@/components/features/community/squad-form";

type EditableSquad = NonNullable<ComponentProps<typeof SquadForm>["initialData"]> & {
  leader_id: string;
};

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

  const { data } = await supabase
    .from("squads")
    .select("*")
    .eq("id", id)
    .single();

  const squad = data as EditableSquad | null;

  if (!squad) {
    notFound();
  }

  // Permission Check
  if (squad.leader_id !== user.id) {
    return (
      <div className="container mx-auto py-20 text-center">
        수정 권한이 없습니다.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8 text-center">팀 정보 수정</h1>
      <SquadForm initialData={squad} />
    </div>
  );
}
