import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectWizardClient from "./wizard";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/career/projects/new");
  }

  return (
    <div className="fixed inset-0 z-[50] overflow-hidden bg-white dark:bg-[#111]">
      <ProjectWizardClient />
    </div>
  );
}
