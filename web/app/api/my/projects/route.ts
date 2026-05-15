import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";

/**
 * GET /api/my/projects
 *
 * 사용자의 master resume profile(`user_resume_profiles.resume_payload`) 안에
 * 들어있는 projects[] 배열을 가벼운 옵션 형태로 반환한다.
 * 채용공고 첨부(AttachmentPicker)에서 프로젝트를 골라 연결하기 위해 사용.
 *
 * 응답: { success: true, data: { items: Array<{ id, title, period, techStack }> } }
 */
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const profile = await prisma.user_resume_profiles.findUnique({
      where: { user_id: session.user.id },
      select: { resume_payload: true },
    });

    let payload = profile?.resume_payload as any;
    if (!payload) {
      const active = await prisma.user_resumes.findFirst({
        where: { user_id: session.user.id, is_active: true },
        select: { resume_payload: true },
      });
      payload = active?.resume_payload as any;
    }

    const projects = Array.isArray(payload?.projects) ? payload.projects : [];
    const items = projects
      .map((p: any, idx: number) => {
        const id =
          typeof p?.id === "string" && p.id.trim()
            ? p.id
            : `idx-${idx}`;
        const name =
          typeof p?.name === "string" && p.name.trim()
            ? p.name
            : `프로젝트 #${idx + 1}`;
        const period =
          typeof p?.period === "string" ? p.period : "";
        const techStack = Array.isArray(p?.techStack)
          ? p.techStack.filter((t: unknown) => typeof t === "string")
          : [];
        return { id, title: name, period, techStack };
      })
      .filter((x: { title: string }) => x.title);

    return NextResponse.json({ success: true, data: { items } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
