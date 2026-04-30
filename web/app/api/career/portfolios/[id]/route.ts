import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import {
  buildNextPortfolioUpdate,
  getPortfolioSourceData,
  mapPortfolioAsset,
  mapPortfolioRow,
  normalizePortfolioRowDocument,
  portfolioAssetDelegate,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

async function getOwnedPortfolio(id: string, userId: string) {
  return portfolioDelegate().findFirst({
    where: { id, user_id: userId },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await getOwnedPortfolio(params.id, user.id);
  if (!row) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const [assets, source] = await Promise.all([
    portfolioAssetDelegate().findMany({
      where: { portfolio_id: row.id },
      orderBy: { created_at: "desc" },
    }),
    getPortfolioSourceData(user.id),
  ]);

  return NextResponse.json({
    item: mapPortfolioRow(row),
    document: normalizePortfolioRowDocument(row),
    source,
    assets: assets.map((asset) => mapPortfolioAsset(asset, row.id)),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const current = await getOwnedPortfolio(params.id, user.id);
  if (!current) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const next = buildNextPortfolioUpdate({
    title: body.title,
    templateId: body.templateId,
    document: body.document,
    format: body.format,
    pageSize: body.pageSize,
    orientation: body.orientation,
    generationPreset: body.generationPreset,
  });

  const row = await portfolioDelegate().update({
    where: { id: current.id },
    data: {
      title: next.title,
      template_id: next.templateId,
      format: next.format,
      page_size: next.pageSize,
      orientation: next.orientation,
      generation_preset: next.generationPreset,
      document_payload: next.document,
      public_summary: next.publicSummary,
      thumbnail_url: next.thumbnailUrl,
      updated_at: new Date(),
    },
  });

  return NextResponse.json({
    item: mapPortfolioRow(row),
    document: normalizePortfolioRowDocument(row),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const current = await getOwnedPortfolio(params.id, user.id);
  if (!current) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  await portfolioDelegate().delete({
    where: { id: current.id },
  });

  return NextResponse.json({ success: true });
}
