import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import {
  showcasePortfolioDelegate,
  pickProjectSnapshotsByIds,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { getShowcaseTemplate } from "@/components/features/career/portfolio-showcase/templates/registry";
import { readShowcaseGenerationMarker } from "@/components/features/career/portfolio-showcase/shared/generation-marker";
import { getPortfolioSourceData } from "@/lib/server/career-portfolios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// AI 채움이 수 초~수십 초 걸릴 수 있음 — 요청을 열어 둔 채 작업 (웹 슬라이드 generate 와 동일 패턴)
export const maxDuration = 120;

/** 이 시간 안에 시작된 running 마커는 진행 중으로 보고 재시작하지 않는다 (중복 호출 가드) */
const RUNNING_FRESH_MS = 3 * 60 * 1000;

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

/**
 * showcase 포트폴리오 AI 채움 실행.
 *
 * 클라이언트(위저드)가 호출하고 응답을 기다리는 동안 "백그라운드에서 계속하기"로
 * 떠날 수 있다 — 요청은 서버에서 계속 실행되고 결과는 _generation 마커로 기록되므로
 * BackgroundJobsRunner 의 status polling 이 완료를 감지한다.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await showcasePortfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const marker = readShowcaseGenerationMarker(row.content_payload);

  // 마커가 없으면 구버전(동기 생성) 행 — 이미 채워진 상태로 취급
  if (!marker || marker.status === "completed") {
    return NextResponse.json({ status: "completed" });
  }
  if (marker.status === "running") {
    const startedAt = marker.startedAt ? Date.parse(marker.startedAt) : Number.NaN;
    if (Number.isFinite(startedAt) && Date.now() - startedAt < RUNNING_FRESH_MS) {
      // 최근에 시작된 작업이 진행 중 — 중복 실행하지 않음
      return NextResponse.json({ status: "running" }, { status: 202 });
    }
    // stale running (서버 재시작 등으로 죽은 작업) → 아래에서 재시작
  }

  const template = getShowcaseTemplate(row.template_id);
  const baseContent = template.contentSchema.parse(row.content_payload);
  const projectIds = marker.projectIds ?? [];
  const startedAtIso = new Date().toISOString();

  await showcasePortfolioDelegate().update({
    where: { id: row.id },
    data: {
      content_payload: {
        ...(baseContent as Record<string, unknown>),
        _generation: { status: "running", projectIds, startedAt: startedAtIso },
      },
      updated_at: new Date(),
    },
  });

  try {
    const source = await getPortfolioSourceData(user.id);
    const snapshots = pickProjectSnapshotsByIds(source.projects, projectIds);

    const { aiFillNeonEditorialContent } = await import(
      "@/components/features/career/portfolio-showcase/server/ai-fill"
    );
    const filled = await aiFillNeonEditorialContent({
      content: baseContent,
      source,
      snapshots,
    });

    await showcasePortfolioDelegate().update({
      where: { id: row.id },
      data: {
        content_payload: {
          ...(filled as Record<string, unknown>),
          _generation: {
            status: "completed",
            projectIds,
            startedAt: startedAtIso,
            finishedAt: new Date().toISOString(),
          },
        },
        updated_at: new Date(),
      },
    });
    return NextResponse.json({ status: "completed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 채움 실패";
    await showcasePortfolioDelegate()
      .update({
        where: { id: row.id },
        data: {
          content_payload: {
            ...(baseContent as Record<string, unknown>),
            _generation: {
              status: "failed",
              projectIds,
              startedAt: startedAtIso,
              finishedAt: new Date().toISOString(),
              error: message,
            },
          },
          updated_at: new Date(),
        },
      })
      .catch(() => undefined);
    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }
}
