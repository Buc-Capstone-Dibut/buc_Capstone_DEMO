"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { syncResumeToProfile } from "@/lib/my-profile";

export type CoverLetterInput = NonNullable<ResumePayload["coverLetters"]>[number];

export async function saveCoverLetterAction(data: CoverLetterInput) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  
  let activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true }
  });

  if (!activeResume) {
    activeResume = await prisma.user_resumes.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    if (!activeResume) {
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
        await prisma.user_resumes.update({
            where: { id: activeResume.id },
            data: { is_active: true }
        });
    }
  }

  const payload = (activeResume.resume_payload as any) || {};
  const coverLetters: CoverLetterInput[] = payload.coverLetters || [];

  if (data.id) {
    const index = coverLetters.findIndex((e: any) => e.id === data.id);
    if (index !== -1) {
      coverLetters[index] = { ...coverLetters[index], ...data };
    } else {
      coverLetters.push(data);
    }
  } else {
    data.id = crypto.randomUUID();
    data.createdAt = data.createdAt || new Date().toISOString();
    coverLetters.push(data);
  }

  payload.coverLetters = coverLetters;

  await prisma.user_resumes.update({
    where: { id: activeResume.id },
    data: { resume_payload: payload as any }
  });

  // --- 전역 프로필 동기화 ---
  await syncResumeToProfile(userId, payload);

  revalidatePath("/career/cover-letters");
  return { success: true, coverLetter: data };
}

export async function deleteCoverLetterAction(id: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  // 1. Delete from active resume (user_resumes)
  const activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true }
  });

  if (activeResume) {
    const payload = (activeResume.resume_payload as any) || {};
    let coverLetters: CoverLetterInput[] = payload.coverLetters || [];
    coverLetters = coverLetters.filter((e: any) => e.id !== id);
    payload.coverLetters = coverLetters;

    await prisma.user_resumes.update({
      where: { id: activeResume.id },
      data: { resume_payload: payload as any }
    });
  }

  // 2. Delete from master profile (user_resume_profiles) directly
  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId }
  });

  if (profile && profile.resume_payload) {
    const masterPayload = profile.resume_payload as any;
    let masterCoverLetters: CoverLetterInput[] = masterPayload.coverLetters || [];
    masterCoverLetters = masterCoverLetters.filter((e: any) => e.id !== id);
    masterPayload.coverLetters = masterCoverLetters;

    await prisma.user_resume_profiles.update({
      where: { user_id: userId },
      data: { resume_payload: masterPayload as any, updated_at: new Date() }
    });
  }

  revalidatePath("/career/cover-letters");
  return { success: true };
}
