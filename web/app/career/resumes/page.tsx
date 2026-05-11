import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import ResumesClient, { type ResumeListItem } from "./client";
import { normalizeResumePayload } from "@/app/my/[handle]/profile-utils";

export const dynamic = "force-dynamic";

export default async function CareerResumesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login?next=/career/resumes");
  }

  const userId = session.user.id;

  const userResumes = await prisma.user_resumes.findMany({
    where: { user_id: userId },
    orderBy: { updated_at: 'desc' }
  });

  const resumes: ResumeListItem[] = userResumes.map(r => {
    const payload = normalizeResumePayload(r.resume_payload);
    const techStack = payload.skills
      .slice(0, 5)
      .map((skill) => skill.name)
      .filter(Boolean);
    
    return {
      id: r.id,
      title: r.title || "(제목 없음)",
      updatedAt: r.updated_at.toISOString(),
      is_active: r.is_active,
      techStack,
      payload,
    };
  });

  return <ResumesClient resumes={resumes} />;
}
