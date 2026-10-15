import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  buildResumePublicSummary,
  ensureProfileForUser,
  extractAuthProfileSeed,
} from "@/lib/my-profile";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "";
}

async function getSessionUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Read from active user_resumes (individual resume document)
    let activeResume = await prisma.user_resumes.findFirst({
      where: { user_id: user.id, is_active: true },
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

    if (!activeResume) {
      // Fallback: latest resume
      activeResume = await prisma.user_resumes.findFirst({
        where: { user_id: user.id },
        orderBy: { updated_at: "desc" },
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
    }

    if (!activeResume) {
      return NextResponse.json({
        success: true,
        data: null,
        exists: false,
      });
    }

    const finalPayload: any = activeResume.resume_payload || {};

    return NextResponse.json({
      success: true,
      exists: true,
      data: {
        id: activeResume.id,
        userId: activeResume.user_id,
        resumePayload: finalPayload,
        publicSummary: activeResume.public_summary,
        sourceType: null,
        sourceFileName: null,
        updatedAt: activeResume.updated_at,
        title: activeResume.title,
        targetJobPostingId: activeResume.target_job_posting_id,
        targetMeta: activeResume.target_meta,
        targetPosting: activeResume.target_posting
          ? {
              id: activeResume.target_posting.id,
              companyName: activeResume.target_posting.company_name,
              roleTitle: activeResume.target_posting.role_title,
              status: activeResume.target_posting.status,
            }
          : null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || "Failed to fetch active resume",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const seed = extractAuthProfileSeed(user);
    await ensureProfileForUser({
      userId: user.id,
      nickname: seed.nickname,
      email: seed.email,
      avatarUrl: seed.avatarUrl,
    });

    const body = await req.json();
    const resumePayload = body.resumePayload || body.parsedContent;

    if (!resumePayload || typeof resumePayload !== "object") {
      return NextResponse.json(
        { success: false, error: "resumePayload is required" },
        { status: 400 },
      );
    }

    const publicSummary = buildResumePublicSummary(resumePayload, body.title);

    let safeTargetPostingId: string | null | undefined;
    if (body.targetJobPostingId === null) {
      safeTargetPostingId = null;
    } else if (
      typeof body.targetJobPostingId === "string" &&
      body.targetJobPostingId.length > 0
    ) {
      const ownedPosting = await prisma.user_job_postings.findFirst({
        where: { id: body.targetJobPostingId, user_id: user.id },
        select: { id: true },
      });
      safeTargetPostingId = ownedPosting?.id;
    }

    // Only write to user_resumes — do NOT touch user_resume_profiles (master career data)
    let activeResume = await prisma.user_resumes.findFirst({
      where: { user_id: user.id, is_active: true },
    });

    if (activeResume) {
      await prisma.user_resumes.update({
        where: { id: activeResume.id },
        data: {
          title: body.title || activeResume.title,
          resume_payload: resumePayload as any,
          public_summary: publicSummary as any,
          target_job_posting_id: safeTargetPostingId,
          target_meta:
            body.targetMeta !== undefined ? (body.targetMeta as any) : undefined,
          updated_at: new Date(),
        },
      });
    } else {
      activeResume = await prisma.user_resumes.create({
        data: {
          user_id: user.id,
          title: body.title || `${user.user_metadata?.nickname || '회원'}님의 이력서`,
          resume_payload: resumePayload as any,
          public_summary: publicSummary as any,
          is_active: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        publicSummary: publicSummary,
        sourceType: null,
        sourceFileName: null,
        updatedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || "Failed to save active resume",
      },
      { status: 500 },
    );
  }
}
