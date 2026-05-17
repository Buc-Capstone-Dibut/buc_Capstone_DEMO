import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import CoverLettersClient, { type CoverLetterListItem } from "./client";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

export const dynamic = "force-dynamic";

export default async function CareerCoverLettersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/career/cover-letters");
  }

  const userId = session.user.id;

  // Retrieve master profile to get consolidated cover letters
  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId }
  });

  let coverLetters: NonNullable<ResumePayload["coverLetters"]> = [];
  let timeline: NonNullable<ResumePayload["timeline"]> = [];
  if (profile && profile.resume_payload) {
    const payload = profile.resume_payload as unknown as ResumePayload;
    coverLetters = payload.coverLetters || [];
    timeline = payload.timeline || [];
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
      coverLetters = payload.coverLetters || [];
      timeline = payload.timeline || [];
    }
  }

  // user_cover_letters 테이블에서 target/source 메타데이터 일괄 조회.
  // jsonb 측 coverLetters[].id 와 일치하는 row 만 보강 — 매핑 없으면 빈 target.
  const letterIds = coverLetters.map((l) => l.id).filter((id): id is string => typeof id === "string" && id.length > 0);
  const enrichmentRows = letterIds.length > 0
    ? await prisma.user_cover_letters.findMany({
        where: { user_id: userId, id: { in: letterIds } },
        select: {
          id: true,
          source_resume_id: true,
          target_job_posting_id: true,
          target_meta: true,
          target_posting: {
            select: {
              id: true,
              company_name: true,
              role_title: true,
              status: true,
            },
          },
        },
      })
    : [];
  const enrichmentById = new Map(enrichmentRows.map((row) => [row.id, row]));

  // 기반 이력서 (sourceResume) 매핑: id → title
  const sourceResumeIds = Array.from(
    new Set(
      enrichmentRows
        .map((row) => row.source_resume_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const sourceResumeRows = sourceResumeIds.length > 0
    ? await prisma.user_resumes.findMany({
        where: { user_id: userId, id: { in: sourceResumeIds } },
        select: { id: true, title: true },
      })
    : [];
  const sourceResumeById = new Map(sourceResumeRows.map((r) => [r.id, r]));

  type SourceExperienceSnapshotItem = NonNullable<
    NonNullable<ResumePayload["coverLetters"]>[number]["sourceExperienceSnapshot"]
  >[number];

  const timelineMap = new Map<string, SourceExperienceSnapshotItem>(
    (timeline || [])
      .filter((exp) => exp.id)
      .map((exp) => [
        exp.id as string,
        {
          id: exp.id as string,
          title: exp.company || "제목 없음",
          tags: exp.tags || [],
          period: exp.period || "",
          description: exp.description || "",
          situation: exp.situation || "",
          role: exp.role || "",
          solution: exp.solution || "",
          difficulty: exp.difficulty || "",
          result: exp.result || "",
          lesson: exp.lesson || "",
        },
      ]),
  );

  coverLetters = coverLetters.map((letter) => {
    if (Array.isArray(letter.sourceExperienceSnapshot) && letter.sourceExperienceSnapshot.length) {
      return letter;
    }
    const fallbackSnapshot = (letter.sourceExperienceIds || [])
      .map((id: string) => timelineMap.get(id))
      .filter((item): item is SourceExperienceSnapshotItem => Boolean(item));
    return {
      ...letter,
      sourceExperienceSnapshot: fallbackSnapshot,
    };
  });

  // Ensure coverLetters are sorted by createdAt descending
  coverLetters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // jsonb 자소서 + user_cover_letters 보강 → CoverLetterListItem
  const enrichedLetters: CoverLetterListItem[] = coverLetters.map((letter) => {
    const enrich = enrichmentById.get(letter.id);
    const meta = enrich?.target_meta && typeof enrich.target_meta === "object" && !Array.isArray(enrich.target_meta)
      ? (enrich.target_meta as Record<string, unknown>)
      : null;
    const sourceResume = enrich?.source_resume_id
      ? sourceResumeById.get(enrich.source_resume_id) ?? null
      : null;
    return {
      ...letter,
      // 테이블에 매핑되는 row 가 있어야만 target 변경 액션 노출
      tableRowExists: Boolean(enrich),
      targetPosting: enrich?.target_posting
        ? {
            id: enrich.target_posting.id,
            companyName: enrich.target_posting.company_name,
            roleTitle: enrich.target_posting.role_title,
            status: enrich.target_posting.status,
          }
        : null,
      targetMeta: meta
        ? {
            company: typeof meta.company === "string" ? meta.company : "",
            division: typeof meta.division === "string" ? meta.division : "",
            role: typeof meta.role === "string" ? meta.role : "",
            deadline: typeof meta.deadline === "string" ? meta.deadline : "",
          }
        : null,
      sourceResume: sourceResume
        ? { id: sourceResume.id, title: sourceResume.title || "(제목 없음)" }
        : null,
    };
  });

  return <CoverLettersClient initialLetters={enrichedLetters} />;
}
