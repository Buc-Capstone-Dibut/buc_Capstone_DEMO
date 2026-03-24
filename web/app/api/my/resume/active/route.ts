import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
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
    });

    if (!activeResume) {
      // Fallback: latest resume
      activeResume = await prisma.user_resumes.findFirst({
        where: { user_id: user.id },
        orderBy: { updated_at: "desc" },
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
        userId: activeResume.user_id,
        resumePayload: finalPayload,
        publicSummary: activeResume.public_summary,
        sourceType: null,
        sourceFileName: null,
        updatedAt: activeResume.updated_at,
        title: activeResume.title,
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
