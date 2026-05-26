import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import {
  portfolioDelegate,
  type PortfolioRow,
} from "@/lib/server/career-portfolios";

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
 * 경량 status endpoint — polling 용.
 * 전체 document 안 가져옴 (큰 JSON 파싱 오버헤드 회피).
 * 반환: { status, stage: { label, progress } | null }
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = (await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
    select: {
      id: true,
      generation_status: true,
      generation_quality: true,
    },
  } as never)) as Pick<PortfolioRow, "id" | "generation_status" | "generation_quality"> | null;

  if (!row) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });

  const quality =
    row.generation_quality && typeof row.generation_quality === "object"
      ? (row.generation_quality as Record<string, unknown>)
      : {};
  const currentStage =
    quality.currentStage && typeof quality.currentStage === "object"
      ? (quality.currentStage as { label?: string; progress?: number })
      : null;

  return NextResponse.json({
    status: row.generation_status || "idle",
    stage: currentStage
      ? {
          label: typeof currentStage.label === "string" ? currentStage.label : null,
          progress:
            typeof currentStage.progress === "number" ? currentStage.progress : null,
        }
      : null,
    cancelReason: typeof quality.cancelReason === "string" ? quality.cancelReason : null,
  });
}
