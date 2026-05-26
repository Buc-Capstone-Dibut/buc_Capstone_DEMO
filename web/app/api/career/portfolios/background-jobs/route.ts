import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { portfolioDelegate } from "@/lib/server/career-portfolios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

/**
 * 현재 사용자의 진행 중 (generation_status="running") 포트폴리오 작업 리스트.
 *
 * 클라이언트의 useBackgroundJobsStore 가 페이지 로드 시 호출 →
 * 새로고침이나 다른 디바이스에서 시작된 작업도 store 에 sync.
 *
 * 반환 형식:
 *   { jobs: Array<{ portfolioId, title, format, startedAt, stage }> }
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await portfolioDelegate().findMany({
    where: { user_id: user.id, generation_status: "running" },
    orderBy: { updated_at: "desc" },
  });

  type Row = (typeof rows)[number];
  const jobs = rows.map((row: Row) => {
    const quality =
      row.generation_quality && typeof row.generation_quality === "object"
        ? (row.generation_quality as Record<string, unknown>)
        : {};
    return {
      portfolioId: row.id,
      title: row.title || "(제목 없음)",
      format: row.format || "site",
      startedAt: row.updated_at?.toISOString() || new Date().toISOString(),
      stage: typeof quality.stage === "string" ? quality.stage : null,
    };
  });

  return NextResponse.json({ jobs });
}
