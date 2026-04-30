import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import CareerProjectsClient from "./client";

export const dynamic = "force-dynamic";

export default async function CareerProjectsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/career/projects");
  }

  const userId = session.user.id;

  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId },
  });

  let projects: NonNullable<ResumePayload["timeline"]> = [];
  if (profile?.resume_payload) {
    const payload = profile.resume_payload as unknown as ResumePayload;
    projects = payload.timeline || [];
  } else {
    let activeResume = await prisma.user_resumes.findFirst({
      where: { user_id: userId, is_active: true },
    });

    if (!activeResume) {
      activeResume = await prisma.user_resumes.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
      });
    }

    if (activeResume?.resume_payload) {
      const payload = activeResume.resume_payload as unknown as ResumePayload;
      projects = payload.timeline || [];
    }
  }

  return <CareerProjectsClient initialProjects={projects} />;
}
