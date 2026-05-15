import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobPostingsClient } from "./job-postings-client";

export const dynamic = "force-dynamic";

export default async function JobPostingsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login?redirect=/my/job-postings");
  }
  return <JobPostingsClient />;
}
