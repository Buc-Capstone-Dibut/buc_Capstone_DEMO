import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import ResumesClient, { type ResumeListItem } from "./client";

export const dynamic = "force-dynamic";

export default async function CareerResumesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  const userResumes = await prisma.user_resumes.findMany({
    where: { user_id: userId },
    orderBy: { updated_at: 'desc' }
  });

  const resumes: ResumeListItem[] = userResumes.map(r => {
    const payload = (r.resume_payload as any) || {};
    const skills = payload.skills || [];
    const techStack = skills.slice(0, 5).map((s: any) => s.name).filter(Boolean);
    
    return {
      id: r.id,
      title: r.title || "(제목 없음)",
      updatedAt: r.updated_at.toISOString(),
      is_active: r.is_active,
      techStack
    };
  });

  return <ResumesClient resumes={resumes} />;
}
