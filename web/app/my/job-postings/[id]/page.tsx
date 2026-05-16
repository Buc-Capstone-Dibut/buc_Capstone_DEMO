import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { JobPostingDetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function JobPostingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/login?redirect=/my/job-postings/${params.id}`);

  // target_job_posting_id 기반 역방향 자료 prefetch (서버에서 owner 검증 포함).
  // 본문/카드 fetch 는 기존 client-side /api/my/job-postings/[id] 흐름 그대로.
  const userId = session.user.id;
  const [resumeRows, coverLetterRows] = await Promise.all([
    prisma.user_resumes.findMany({
      where: { user_id: userId, target_job_posting_id: params.id },
      select: { id: true, title: true, updated_at: true, is_active: true },
      orderBy: { updated_at: "desc" },
    }),
    prisma.user_cover_letters.findMany({
      where: { user_id: userId, target_job_posting_id: params.id },
      select: { id: true, title: true, updated_at: true },
      orderBy: { updated_at: "desc" },
    }),
  ]);

  const targetResumes = resumeRows.map((r) => ({
    id: r.id,
    title: r.title ?? "",
    updatedAt: r.updated_at.toISOString(),
    isActive: Boolean(r.is_active),
  }));
  const targetCoverLetters = coverLetterRows.map((c) => ({
    id: c.id,
    title: c.title ?? "",
    updatedAt: c.updated_at.toISOString(),
  }));

  return (
    <JobPostingDetailClient
      postingId={params.id}
      targetResumes={targetResumes}
      targetCoverLetters={targetCoverLetters}
    />
  );
}
