import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import {
  portfolioDelegate,
  type PortfolioRow,
} from "@/lib/server/career-portfolios";
import { requestCancel } from "@/lib/server/portfolio-generation-jobs";

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
 * 진행 중인 포트폴리오 생성 작업 취소.
 *
 * 흐름:
 *   1. registry 에 있으면 cancel 신호 전송 → generate route 가 다음 stage 에서 throw
 *      → 그쪽 catch 가 DB status="failed" + cancelReason="user_cancelled" 기록
 *   2. registry 에 없으면 (이미 끝났거나 다른 서버 인스턴스) → fallback 으로 여기서 직접
 *      DB status 업데이트. 단, 이미 "completed" 면 무시.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = (await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  })) as PortfolioRow | null;
  if (!row) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });

  // 이미 끝난 작업은 취소 불가
  if (row.generation_status === "completed") {
    return NextResponse.json({ ok: false, reason: "already_completed" }, { status: 409 });
  }

  // registry 에 있으면 in-memory signal — generate route 가 알아서 정리
  const signaled = requestCancel(user.id, row.id);

  if (!signaled) {
    // fallback: 직접 DB 업데이트 (작업이 다른 인스턴스에서 돌고 있거나 이미 끝남)
    await portfolioDelegate().update({
      where: { id: row.id },
      data: {
        generation_status: "failed",
        generation_quality: {
          stage: "cancelled",
          cancelReason: "user_cancelled",
          cancelledAt: new Date().toISOString(),
        },
        updated_at: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true, signaled });
}
