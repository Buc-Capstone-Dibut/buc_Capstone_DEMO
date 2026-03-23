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

    const row = await prisma.user_resume_profiles.findUnique({
      where: { user_id: user.id },
      select: {
        user_id: true,
        resume_payload: true,
        public_summary: true,
        source_type: true,
        source_file_name: true,
        updated_at: true,
      },
    });

    if (!row) {
      return NextResponse.json({
        success: true,
        data: null,
        exists: false,
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      data: {
        userId: row.user_id,
        resumePayload: row.resume_payload,
        publicSummary: row.public_summary,
        sourceType: row.source_type,
        sourceFileName: row.source_file_name,
        updatedAt: row.updated_at,
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

    const sourceType = String(body.sourceType || "manual");
    const sourceFileName = body.sourceFileName ? String(body.sourceFileName) : null;
    const publicSummary = buildResumePublicSummary(resumePayload, body.title);

    const upserted = await prisma.user_resume_profiles.upsert({
      where: { user_id: user.id },
      update: {
        resume_payload: resumePayload,
        public_summary: publicSummary,
        source_type: sourceType,
        source_file_name: sourceFileName,
      },
      create: {
        user_id: user.id,
        resume_payload: resumePayload,
        public_summary: publicSummary,
        source_type: sourceType,
        source_file_name: sourceFileName,
      },
      select: {
        user_id: true,
        public_summary: true,
        source_type: true,
        source_file_name: true,
        updated_at: true,
      },
    });

    // user_resumes (이력서 목록) 테이블에도 동기화
    // Prisma 클라이언트 생성 이슈 대응: 모델 존재 여부 확인
    if (prisma && (prisma as any).user_resumes) {
      const activeResume = await (prisma as any).user_resumes.findFirst({
        where: { user_id: user.id, is_active: true }
      });

      if (activeResume) {
        await (prisma as any).user_resumes.update({
          where: { id: activeResume.id },
          data: {
            title: body.title || activeResume.title,
            resume_payload: resumePayload as any,
            public_summary: publicSummary as any,
            updated_at: new Date(),
          }
        });
      } else {
        await (prisma as any).user_resumes.create({
          data: {
            user_id: user.id,
            title: body.title || `${user.user_metadata?.nickname || '회원'}님의 이력서`,
            resume_payload: resumePayload as any,
            public_summary: publicSummary as any,
            is_active: true,
          }
        });
      }
    } else {
      console.warn("prisma.user_resumes is not defined. Skipping sync.");
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: upserted.user_id,
        publicSummary: upserted.public_summary,
        sourceType: upserted.source_type,
        sourceFileName: upserted.source_file_name,
        updatedAt: upserted.updated_at,
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
