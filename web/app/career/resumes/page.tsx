import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import ResumesClient, { type ResumeListItem } from "./client";
import { normalizeResumePayload } from "@/app/my/[handle]/profile-utils";

export const dynamic = "force-dynamic";

export default async function CareerResumesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login?next=/career/resumes");
  }

  const userId = session.user.id;

  const userResumes = await prisma.user_resumes.findMany({
    where: { user_id: userId },
    orderBy: { updated_at: 'desc' },
    include: {
      target_posting: {
        select: {
          id: true,
          company_name: true,
          role_title: true,
          status: true,
        },
      },
    },
  });

  // 이력서 ↔ 채용공고 연결 (user_job_posting_attachments) — 한 번에 조회
  const resumeIds = userResumes.map((r) => r.id);
  const attachmentRows = resumeIds.length > 0
    ? await prisma.user_job_posting_attachments.findMany({
        where: {
          user_id: userId,
          attachment_type: "resume",
          resume_id: { in: resumeIds },
        },
        include: {
          job_posting: {
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

  const linkedByResumeId = new Map<string, ResumeListItem["linkedPostings"]>();
  for (const a of attachmentRows) {
    if (!a.resume_id || !a.job_posting) continue;
    const list = linkedByResumeId.get(a.resume_id) ?? [];
    list.push({
      id: a.job_posting.id,
      companyName: a.job_posting.company_name,
      roleTitle: a.job_posting.role_title,
      status: a.job_posting.status,
    });
    linkedByResumeId.set(a.resume_id, list);
  }

  // 이력서 → 자소서 역방향 (user_cover_letters.source_resume_id) — 한 번에 조회
  const derivedCoverLettersByResumeId = new Map<string, Array<{ id: string; title: string }>>();
  if (resumeIds.length > 0) {
    const coverLetters = await prisma.user_cover_letters.findMany({
      where: {
        user_id: userId,
        source_resume_id: { in: resumeIds },
      },
      select: {
        id: true,
        title: true,
        source_resume_id: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'desc' },
    });
    for (const cl of coverLetters) {
      if (!cl.source_resume_id) continue;
      const list = derivedCoverLettersByResumeId.get(cl.source_resume_id) ?? [];
      list.push({ id: cl.id, title: cl.title });
      derivedCoverLettersByResumeId.set(cl.source_resume_id, list);
    }
  }

  const resumes: ResumeListItem[] = userResumes.map(r => {
    const payload = normalizeResumePayload(r.resume_payload);
    const techStack = payload.skills
      .slice(0, 5)
      .map((skill) => skill.name)
      .filter(Boolean);

    // target_meta는 jsonb. 안전하게 좁히기
    const meta = r.target_meta && typeof r.target_meta === "object" && !Array.isArray(r.target_meta)
      ? (r.target_meta as Record<string, unknown>)
      : null;

    return {
      id: r.id,
      title: r.title || "(제목 없음)",
      updatedAt: r.updated_at.toISOString(),
      is_active: r.is_active,
      techStack,
      payload,
      linkedPostings: linkedByResumeId.get(r.id) ?? [],
      derivedCoverLetters: derivedCoverLettersByResumeId.get(r.id) ?? [],
      targetPosting: r.target_posting
        ? {
            id: r.target_posting.id,
            companyName: r.target_posting.company_name,
            roleTitle: r.target_posting.role_title,
            status: r.target_posting.status,
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
    };
  });

  return <ResumesClient resumes={resumes} />;
}
