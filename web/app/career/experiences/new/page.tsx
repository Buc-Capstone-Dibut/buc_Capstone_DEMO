import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ExperienceWizardClient from "./wizard";

export default async function NewExperiencePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="fixed inset-0 z-[50] bg-white dark:bg-[#111] overflow-hidden">
      <ExperienceWizardClient />
    </div>
  );
}
