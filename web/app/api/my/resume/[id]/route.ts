import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: 특정 이력서 상세 조회
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        if (!prisma || !(prisma as any).user_resumes) {
            return NextResponse.json({ success: false, error: "데이터베이스 연결 설정 중입니다." }, { status: 503 });
        }
        const resume = await (prisma as any).user_resumes.findFirst({
            where: {
                id: params.id,
                user_id: session.user.id
            },
        });

        if (!resume) {
            return NextResponse.json({ success: false, error: "Resume not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: resume });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PUT: 특정 이력서 수정
export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, resumePayload, publicSummary, isActive } = body;

        const { buildResumePublicSummary } = await import("@/lib/my-profile");
        const finalPublicSummary = (title !== undefined || resumePayload !== undefined)
            ? buildResumePublicSummary(resumePayload || {}, title)
            : publicSummary;

        const updatedResume = await (prisma as any).user_resumes.update({
            where: {
                id: params.id,
                user_id: session.user.id // Ensure ownership
            },
            data: {
                title: title !== undefined ? title : undefined,
                resume_payload: resumePayload !== undefined ? resumePayload : undefined,
                public_summary: finalPublicSummary !== undefined ? finalPublicSummary : undefined,
                is_active: isActive !== undefined ? isActive : undefined,
            },
        });

        // If isActive is becoming true, deactivate others and sync to profile
        if (isActive === true) {
            // 1. Deactivate other resumes
            await (prisma as any).user_resumes.updateMany({
                where: {
                    user_id: session.user.id,
                    id: { not: params.id }
                },
                data: { is_active: false }
            });

            // Sync to profile table (user_resume_profiles)
            const { buildResumePublicSummary } = await import("@/lib/my-profile");
            const publicSum = buildResumePublicSummary(updatedResume.resume_payload, updatedResume.title);

            await prisma.user_resume_profiles.upsert({
                where: { user_id: session.user.id },
                update: {
                    resume_payload: updatedResume.resume_payload as any,
                    public_summary: publicSum as any,
                    updated_at: new Date()
                },
                create: {
                    user_id: session.user.id,
                    resume_payload: updatedResume.resume_payload as any,
                    public_summary: publicSum as any
                }
            });
        }

        return NextResponse.json({ success: true, data: updatedResume });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: 특정 이력서 삭제
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        if (!prisma || !(prisma as any).user_resumes) {
            throw new Error("데이터베이스 연결 설정 중입니다.");
        }
        await (prisma as any).user_resumes.delete({
            where: {
                id: params.id,
                user_id: session.user.id // Ensure ownership
            },
        });

        return NextResponse.json({ success: true, message: "Deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
