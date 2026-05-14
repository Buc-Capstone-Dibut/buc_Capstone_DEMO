import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";

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

    // 우선순위: 첨부된 이력서 > 활성 이력서
    let resumeData: { fileName: string; parsedContent: unknown } | null = null;
    let resumePrefillSource: "job_posting_attachment" | "active_resume" | null = null;

    const attachedResumeId =
      posting.attachments.find((a) => a.attachment_type === "resume")?.resume_id ?? null;

    const resume = attachedResumeId
      ? await prisma.user_resumes.findFirst({
          where: { id: attachedResumeId, user_id: session.user.id },
        })
      : await prisma.user_resumes.findFirst({
          where: { user_id: session.user.id, is_active: true },
        });

    if (resume) {
      resumeData = {
        fileName: resume.source_file_name || resume.title || "마이페이지 이력서",
        parsedContent: resume.resume_payload,
      };
      resumePrefillSource = attachedResumeId ? "job_posting_attachment" : "active_resume";
    }

    // 자소서 (resume_payload.coverLetters[index])
    let suggestedCoverLetter: { title: string; body: string } | null = null;
    const coverAttachment = posting.attachments.find(
      (a) => a.attachment_type === "cover_letter",
    );
    if (
      coverAttachment &&
      coverAttachment.resume_id != null &&
      coverAttachment.cover_letter_index != null
    ) {
      const r = await prisma.user_resumes.findFirst({
        where: { id: coverAttachment.resume_id, user_id: session.user.id },
      });
      const payload = r?.resume_payload as any;
      const cls = Array.isArray(payload?.coverLetters) ? payload.coverLetters : [];
      const picked = cls[coverAttachment.cover_letter_index];
      if (picked) {
        suggestedCoverLetter = {
          title:
            typeof picked.title === "string"
              ? picked.title
              : coverAttachment.cover_letter_label ?? "",
          body: typeof picked.body === "string" ? picked.body : "",
        };
      }
    }

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
        },
        resumeData,
        resumePrefillSource,
        suggestedCoverLetter,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
