import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import WorkExperienceClient from "./client";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

export const dynamic = "force-dynamic";

export default async function WorkExperiencePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/career/work-experience");
  }

  const userId = session.user.id;

  // Retrieve master profile
  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId }
  });

  let experiences: ResumePayload["experience"] = [];
  if (profile && profile.resume_payload) {
    const payload = profile.resume_payload as unknown as ResumePayload;
    experiences = payload.experience || [];
  } else {
    // Fallback to active resume
    let activeResume = await prisma.user_resumes.findFirst({
      where: { user_id: userId, is_active: true }
    });
    if (!activeResume) {
      activeResume = await prisma.user_resumes.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });
    }
    if (activeResume && activeResume.resume_payload) {
      const payload = activeResume.resume_payload as unknown as ResumePayload;
      experiences = payload.experience || [];
    }
  }

  return <WorkExperienceClient initialExperiences={experiences} />;
}
