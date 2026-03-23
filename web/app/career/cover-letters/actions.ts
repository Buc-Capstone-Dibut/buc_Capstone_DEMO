"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

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

  revalidatePath("/career/cover-letters");
  return { success: true, coverLetter: data };
}

export async function deleteCoverLetterAction(id: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: session.user.id, is_active: true }
  });

  if (!activeResume) throw new Error("No active resume");

  const payload = (activeResume.resume_payload as any) || {};
  let coverLetters: CoverLetterInput[] = payload.coverLetters || [];
  coverLetters = coverLetters.filter((e: any) => e.id !== id);
  payload.coverLetters = coverLetters;

  await prisma.user_resumes.update({
    where: { id: activeResume.id },
    data: { resume_payload: payload as any }
  });

  revalidatePath("/career/cover-letters");
  return { success: true };
}
