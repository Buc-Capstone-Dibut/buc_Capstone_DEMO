import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import CoverLettersClient from "./client";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

export const dynamic = "force-dynamic";

export default async function CareerCoverLettersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Retrieve active resume to get cover letters
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

  let coverLetters = [];
  if (activeResume && activeResume.resume_payload) {
    const payload = activeResume.resume_payload as unknown as ResumePayload;
    coverLetters = payload.coverLetters || [];
  }

  // Ensure coverLetters are sorted by createdAt descending
  coverLetters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return <CoverLettersClient initialLetters={coverLetters} />;
}
