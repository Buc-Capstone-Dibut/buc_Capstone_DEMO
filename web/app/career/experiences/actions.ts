"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { syncResumeToProfile } from "@/lib/my-profile";

export type ExperienceInput = ResumePayload["experience"][number];

export async function saveExperienceAction(data: ExperienceInput) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Find active resume
  let activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true }
  });

  if (!activeResume) {
    // try to fall back to ANY resume
    activeResume = await prisma.user_resumes.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    if (!activeResume) {
      // Create new active resume
      activeResume = await prisma.user_resumes.create({
        data: {
          user_id: userId,
          title: "새 이력서",
          is_active: true,
          resume_payload: { experience: [], personalInfo: { name: "", email: "", phone: "", intro: "", links: {} }, education: [], skills: [], selfIntroduction: "", projects: [], coverLetters: [] },
          public_summary: {}
        }
      });
    } else {
      // Set it active
      await prisma.user_resumes.update({
        where: { id: activeResume.id },
        data: { is_active: true }
      });
    }
  }

  const payload = (activeResume.resume_payload as any) || {};
  const experiences: ExperienceInput[] = payload.experience || [];

  if (data.id) {
    // Update existing
    const index = experiences.findIndex((e: any) => e.id === data.id);
    if (index !== -1) {
      experiences[index] = { ...experiences[index], ...data };
    } else {
      experiences.push(data);
    }
  } else {
    // Create new
    data.id = crypto.randomUUID();
    experiences.push(data);
  }

  payload.experience = experiences;

  await prisma.user_resumes.update({
    where: { id: activeResume.id },
    data: { resume_payload: payload as any }
  });

  // --- 전역 프로필 동기화 ---
  await syncResumeToProfile(userId, payload);

  revalidatePath("/career/experiences");
  return { success: true, experience: data };
}

export async function deleteExperienceAction(id: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: session.user.id, is_active: true }
  });

  if (!activeResume) throw new Error("No active resume");

  const payload = (activeResume.resume_payload as any) || {};
  let experiences: ExperienceInput[] = payload.experience || [];
  experiences = experiences.filter((e: any) => e.id !== id);
  payload.experience = experiences;

  await prisma.user_resumes.update({
    where: { id: activeResume.id },
    data: { resume_payload: payload as any }
  });

  // --- 전역 프로필 동기화 ---
  await syncResumeToProfile(session.user.id, payload);

  revalidatePath("/career/experiences");
  return { success: true };
}

export async function getExperiencesByIdsAction(ids: string[]) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Read from master profile first (authoritative source for career experiences)
  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId }
  });

  if (profile && profile.resume_payload) {
    const payload = profile.resume_payload as any;
    const experiences: ExperienceInput[] = payload.experience || [];
    const matched = experiences.filter(e => ids.includes(e.id!));
    if (matched.length > 0) return matched;
  }

  // Fallback to active resume
  const activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true }
  });

  if (!activeResume) return [];

  const payload = (activeResume.resume_payload as any) || {};
  const experiences: ExperienceInput[] = payload.experience || [];

  return experiences.filter(e => ids.includes(e.id!));
}
