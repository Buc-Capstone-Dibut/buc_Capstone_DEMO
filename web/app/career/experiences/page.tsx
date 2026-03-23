import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import CareerTimelineClient from "./client";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

export const dynamic = "force-dynamic";

export default async function CareerExperiencesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Retrieve active resume to get experience
  let activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true }
  });

  if (!activeResume) {
    // If no active, try grabbing the first one
    activeResume = await prisma.user_resumes.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
  }

  let experiences = [];
  if (activeResume && activeResume.resume_payload) {
    const payload = activeResume.resume_payload as unknown as ResumePayload;
    // The database payload contains raw objects. The client expects ExperienceInput.
    experiences = payload.experience || [];
  }

  return <CareerTimelineClient initialExperiences={experiences} />;
}
