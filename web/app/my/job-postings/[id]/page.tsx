import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobPostingDetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function JobPostingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/login?redirect=/my/job-postings/${params.id}`);
  return <JobPostingDetailClient postingId={params.id} />;
}
