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

  // 디자인 템플릿(showcase) 진행 작업 — content_payload._generation 마커로 추적
  const { showcasePortfolioDelegate } = await import(
    "@/components/features/career/portfolio-showcase/server/showcase-portfolios"
  );
  const { readShowcaseGenerationMarker } = await import(
    "@/components/features/career/portfolio-showcase/shared/generation-marker"
  );
  const showcaseRows = await showcasePortfolioDelegate().findMany({
    where: {
      user_id: user.id,
      OR: [
        { content_payload: { path: ["_generation", "status"], equals: "running" } },
        { content_payload: { path: ["_generation", "status"], equals: "pending" } },
      ],
    },
    orderBy: { updated_at: "desc" },
  });
  const showcaseJobs = showcaseRows.flatMap((row) => {
    const marker = readShowcaseGenerationMarker(row.content_payload);
    // 스테일(10분 경과) 마커는 죽은 작업 — sync 목록에 올리지 않는다.
    // (위저드 재방문 시 generate 가 stale-running 을 감지하고 다시 시작함)
    const startedAt = marker?.startedAt ? Date.parse(marker.startedAt) : Number.NaN;
    if (Number.isFinite(startedAt) && Date.now() - startedAt > 10 * 60 * 1000) {
      return [];
    }
    return [
      {
        portfolioId: row.id,
        title: row.title || "(제목 없음)",
        format: "showcase",
        startedAt:
          marker?.startedAt || row.updated_at?.toISOString() || new Date().toISOString(),
        stage: "AI가 포트폴리오 내용을 채우는 중",
      },
    ];
  });

  return NextResponse.json({ jobs: [...jobs, ...showcaseJobs] });
}
