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

  // --- user_cover_letters 테이블에 같은 id로 upsert ---
  // 이게 있어야 자소서 카드의 "지원 대상" + "기반 이력서" chip이 자동 활성화됨.
  // jsonb 측엔 없는 source_resume_id는 활성 이력서로 기본 매핑 (사용자가 카드 액션으로 변경 가능).
  // target_job_posting_id는 모르므로 null. 사용자가 카드의 "공고 연결" 액션으로 사후 매칭.
  if (data.id) {
    try {
      await prisma.user_cover_letters.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          user_id: userId,
          title: data.title || "새 자기소개서",
          body: data.content || "",
          source_resume_id: activeResume.id,
        },
        update: {
          title: data.title || "새 자기소개서",
          body: data.content || "",
          updated_at: new Date(),
          // source_resume_id, target_job_posting_id 등은 사용자가 카드에서
          // 명시적으로 바꾼 값을 덮어쓰지 않도록 update에서 건드리지 않음
        },
      });
    } catch (err) {
      // jsonb 측 저장이 성공했으니 동기화 실패해도 전체 실패로 보지 않음.
      // 로그만 남기고 진행 (자소서 카드에서 target/source chip이 비어 보일 수는 있음)
      console.error("user_cover_letters upsert 실패 (jsonb 저장은 성공):", err);
    }
  }

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

  // 3. 동기화: user_cover_letters 테이블에서도 같은 id row 제거 (있다면)
  try {
    await prisma.user_cover_letters.deleteMany({
      where: { id, user_id: userId },
    });
  } catch (err) {
    console.error("user_cover_letters delete 실패:", err);
  }

  revalidatePath("/career/cover-letters");
  return { success: true };
}
