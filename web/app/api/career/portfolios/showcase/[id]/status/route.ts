import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { readShowcaseGenerationMarker } from "@/components/features/career/portfolio-showcase/shared/generation-marker";

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
 * showcase 포트폴리오 생성 상태 — BackgroundJobsRunner polling 용.
 * 웹 슬라이드의 /portfolios/[id]/status 와 같은 응답 형태를 따른다.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await showcasePortfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  });
  if (!row) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });

  const marker = readShowcaseGenerationMarker(row.content_payload);
  // 마커 없음 = 구버전(동기 생성) 행 → 완료 취급
  let status = !marker
    ? "completed"
    : marker.status === "pending" || marker.status === "running"
      ? "running"
      : marker.status;

  // 자기치유: 서버 재시작 등으로 죽은 작업이 영원히 running 으로 남지 않게,
  // 시작 후 10분이 지나도 진행 중이면 실패로 보고한다. (실제 채움은 ~2분 한도)
  if (status === "running") {
    const startedAt = marker?.startedAt ? Date.parse(marker.startedAt) : Number.NaN;
    if (Number.isFinite(startedAt) && Date.now() - startedAt > 10 * 60 * 1000) {
      status = "failed";
    }
  }

  return NextResponse.json({
    status,
    stage:
      status === "running"
        ? { label: "AI가 포트폴리오 내용을 채우는 중", progress: null }
        : null,
    cancelReason: null,
  });
}
