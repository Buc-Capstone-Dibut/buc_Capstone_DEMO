import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import type { JobPostingInterviewPrefill, ProjectPrefill } from "@/store/interview-setup-store";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function dereferenceProjects(
  attachments: { attachment_type: string; project_id: string | null; project_label: string | null }[],
  resumePayload: unknown,
): ProjectPrefill[] {
  const projectAttachments = attachments.filter(
    (a) => a.attachment_type === "project" && a.project_id,
  );
  if (!projectAttachments.length) return [];

  const payload = asRecord(resumePayload);
  const projects = Array.isArray(payload.projects) ? payload.projects.map(asRecord) : [];
  return projectAttachments
    .map((att): ProjectPrefill | null => {
      const found = projects.find((p) => p.id === att.project_id);
      if (found) {
        return {
          id: typeof found.id === "string" ? found.id : att.project_id!,
          name: typeof found.name === "string" ? found.name : typeof found.title === "string" ? found.title : att.project_label ?? "",
          period: typeof found.period === "string" ? found.period : "",
          techStack: Array.isArray(found.techStack) ? found.techStack.filter((item): item is string => typeof item === "string") : [],
          description: typeof found.description === "string" ? found.description : "",
        };
      }
      if (att.project_label) {
        return { id: att.project_id!, name: att.project_label, period: "", techStack: [], description: "" };
      }
      return null;
    })
    .filter((item): item is ProjectPrefill => item !== null);
}

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posting = await prisma.user_job_postings.findFirst({
      where: { id: ctx.params.id, user_id: session.user.id },
      include: { attachments: true },
    });
    if (!posting) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // 자소서: 신규 방식 (user_cover_letters 테이블) 우선, 없으면 legacy (resume_payload.coverLetters[index])
    let suggestedCoverLetter: { title: string; body: string } | null = null;
    let coverLetterResumeId: string | null = null;
    const coverAttachment = posting.attachments.find(
      (a) => a.attachment_type === "cover_letter",
    );
    if (coverAttachment) {
      if (coverAttachment.cover_letter_id != null) {
        const cl = await prisma.user_cover_letters.findFirst({
          where: { id: coverAttachment.cover_letter_id, user_id: session.user.id },
        });
        if (cl) {
          coverLetterResumeId = cl.source_resume_id;
          suggestedCoverLetter = {
            title:
              (typeof cl.title === "string" && cl.title.length > 0 ? cl.title : null) ??
              coverAttachment.cover_letter_label ??
              "",
            body: typeof cl.body === "string" ? cl.body : "",
          };
        }
      } else if (
        coverAttachment.resume_id != null &&
        coverAttachment.cover_letter_index != null
      ) {
        const r = await prisma.user_resumes.findFirst({
          where: { id: coverAttachment.resume_id, user_id: session.user.id },
        });
        const payload = asRecord(r?.resume_payload);
        const cls = Array.isArray(payload?.coverLetters) ? payload.coverLetters : [];
        const picked = asRecord(cls[coverAttachment.cover_letter_index]);
        if (r && Object.keys(picked).length) {
          coverLetterResumeId = r.id;
          suggestedCoverLetter = {
            title:
              typeof picked.title === "string"
                ? picked.title
                : coverAttachment.cover_letter_label ?? "",
            body: typeof picked.body === "string" ? picked.body : typeof picked.content === "string" ? picked.content : "",
          };
        }
      }
    }
    // 첨부가 없으면 이 공고를 지원 대상으로 작성한 자소서 중 가장 최근 것
    if (!suggestedCoverLetter) {
      const targetCoverLetter = await prisma.user_cover_letters.findFirst({
        where: { user_id: session.user.id, target_job_posting_id: posting.id, body: { not: "" } },
        orderBy: { updated_at: "desc" },
      });
      if (targetCoverLetter) {
        coverLetterResumeId = targetCoverLetter.source_resume_id;
        suggestedCoverLetter = {
          title: targetCoverLetter.title ?? "",
          body: targetCoverLetter.body ?? "",
        };
      }
    }

    // 직접 첨부, 지원 대상, 자기소개서의 기반 이력서, 활성 이력서 순으로 사용한다.
    const attachedResumeIds = posting.attachments.flatMap((attachment) =>
      attachment.attachment_type === "resume" && attachment.resume_id ? [attachment.resume_id] : [],
    );
    const attachedResumes = attachedResumeIds.length
      ? await prisma.user_resumes.findMany({
          where: { id: { in: attachedResumeIds }, user_id: session.user.id },
        })
      : [];
    const attachedResume = attachedResumeIds
      .map((id) => attachedResumes.find((resume) => resume.id === id))
      .find(Boolean);
    const postingResume = attachedResume ?? await prisma.user_resumes.findFirst({
      where: { user_id: session.user.id, target_job_posting_id: posting.id },
      orderBy: { updated_at: "desc" },
    });
    const coverLetterResume = !postingResume && coverLetterResumeId
      ? await prisma.user_resumes.findFirst({
          where: { id: coverLetterResumeId, user_id: session.user.id },
        })
      : null;
    const resume = postingResume ?? coverLetterResume ?? await prisma.user_resumes.findFirst({
      where: { user_id: session.user.id, is_active: true },
    });
    const resumeData = resume ? {
      fileName: resume.title || resume.source_file_name || "마이페이지 이력서",
      parsedContent: resume.resume_payload,
    } : null;
    const resumePrefillSource: JobPostingInterviewPrefill["resumePrefillSource"] =
      attachedResume ? "job_posting_attachment"
      : postingResume ? "job_posting_target"
      : coverLetterResume ? "job_posting_cover_letter"
      : resume ? "active_resume"
      : null;

    // 포트폴리오: 첨부된 portfolio_id 로 조회
    const portfolioIds = posting.attachments
      .filter((a) => a.attachment_type === "portfolio" && a.portfolio_id)
      .map((a) => a.portfolio_id!);

    const attachedPortfolios = portfolioIds.length
      ? (
          await prisma.user_portfolios.findMany({
            where: { id: { in: portfolioIds }, user_id: session.user.id },
            select: { id: true, title: true, template_id: true, format: true },
          })
        ).map((p) => ({ id: p.id, title: p.title }))
      : [];

    // 프로젝트: resume_payload.projects[] 에서 dereference
    const masterProfile = await prisma.user_resume_profiles.findUnique({
      where: { user_id: session.user.id },
    });
    const profilePayload = masterProfile?.resume_payload ?? resume?.resume_payload;
    const attachedProjects = dereferenceProjects(
      posting.attachments,
      profilePayload,
    );

    return NextResponse.json({
      success: true,
      data: {
        targetUrl: posting.posting_url ?? "",
        jobData: {
          role: posting.role_title,
          company: posting.company_name,
          techStack: posting.tech_stack ?? [],
          responsibilities: posting.responsibilities ?? [],
          requirements: posting.requirements ?? [],
          preferred: posting.preferred ?? [],
          companyDescription: posting.company_description ?? "",
          teamCulture: posting.team_culture ?? [],
          supportingMaterials: {
            portfolioIds: attachedPortfolios.map((portfolio) => portfolio.id),
            projects: attachedProjects,
            coverLetter: suggestedCoverLetter,
          },
        },
        resumeData,
        resumePrefillSource,
        suggestedCoverLetter,
        attachedPortfolios,
        attachedProjects,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
