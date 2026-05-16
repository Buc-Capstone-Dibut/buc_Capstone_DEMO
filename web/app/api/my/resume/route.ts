import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: 사용자의 모든 이력서 목록 조회
export async function GET() {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        if (!prisma || !(prisma as any).user_resumes) {
            return NextResponse.json({ success: true, data: { items: [] } });
        }
        const resumes = await (prisma as any).user_resumes.findMany({
            where: { user_id: session.user.id },
            orderBy: { created_at: "desc" },
        });

        return NextResponse.json({ success: true, data: { items: resumes } });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: 신규 이력서 생성
export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            title,
            resumePayload,
            sourceType,
            sourceFileName,
            targetJobPostingId,
            targetMeta,
        } = body;

        if (!prisma || !(prisma as any).user_resumes) {
            throw new Error("데이터베이스 연결 설정 중입니다. 잠시 후 다시 시도해 주세요.");
        }

        const { buildResumePublicSummary } = await import("@/lib/my-profile");
        const publicSummary = buildResumePublicSummary(resumePayload || {}, title);

        // 본인 소유 공고만 target으로 허용 (다른 사용자 공고 ID 주입 방지)
        let safeTargetPostingId: string | null = null;
        if (typeof targetJobPostingId === "string" && targetJobPostingId.length > 0) {
            const owned = await (prisma as any).user_job_postings.findFirst({
                where: { id: targetJobPostingId, user_id: session.user.id },
                select: { id: true },
            });
            if (owned) safeTargetPostingId = owned.id;
        }

        const newResume = await (prisma as any).user_resumes.create({
            data: {
                user_id: session.user.id,
                title: title || "새 이력서",
                resume_payload: resumePayload || {},
                public_summary: publicSummary || {},
                source_type: sourceType || "manual",
                source_file_name: sourceFileName || null,
                target_job_posting_id: safeTargetPostingId,
                target_meta: targetMeta && typeof targetMeta === "object" ? targetMeta : null,
            },
        });

        return NextResponse.json({ success: true, data: newResume });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
