import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";
import { EMPTY_RESUME } from "@/app/my/[handle]/profile-utils";
import { educationListSchema, normalizeEducation } from "@/lib/resume/education";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.user_resume_profiles.findUnique({
      where: { user_id: user.id },
      select: { resume_payload: true },
    });
    const payload = profile?.resume_payload;
    const education = payload && typeof payload === "object" && !Array.isArray(payload)
      ? normalizeEducation(payload.education)
      : [];
    return NextResponse.json({ success: true, data: { education } });
  } catch (error) {
    console.error("[resume-education] GET", error);
    return NextResponse.json({ success: false, error: "저장된 학력을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const result = educationListSchema.safeParse(body?.education);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.issues[0]?.message || "학력 정보를 확인해 주세요." }, { status: 400 });
    }

    const seed = extractAuthProfileSeed(user);
    await ensureProfileForUser({ userId: user.id, nickname: seed.nickname, email: seed.email, avatarUrl: seed.avatarUrl });
    const education = result.data.map((item) => ({ ...item, included: true }));

    // JSON의 학력 키만 갱신해 경력·프로젝트 등 공통 자료의 동시 저장을 보존한다.
    await prisma.$executeRaw`
      INSERT INTO public.user_resume_profiles (user_id, resume_payload, public_summary, updated_at)
      VALUES (${user.id}::uuid, ${JSON.stringify({ ...EMPTY_RESUME, education })}::jsonb, '{}'::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        resume_payload = jsonb_set(COALESCE(user_resume_profiles.resume_payload, '{}'::jsonb), '{education}', ${JSON.stringify(education)}::jsonb, true),
        updated_at = NOW()
    `;
    return NextResponse.json({ success: true, data: { education } });
  } catch (error) {
    console.error("[resume-education] PUT", error);
    return NextResponse.json({ success: false, error: "학력을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
