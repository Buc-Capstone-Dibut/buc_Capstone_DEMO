import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  portfolioAssetDelegate,
  type PortfolioAssetRow,
  type PortfolioRow,
} from "@/lib/server/career-portfolios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "portfolio-assets";

async function getSessionUserId() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; assetId: string } },
) {
  const userId = await getSessionUserId();

  const asset = (await portfolioAssetDelegate().findFirst({
    where: {
      id: params.assetId,
      portfolio_id: params.id,
    },
    include: {
      portfolio: true,
    },
  })) as (PortfolioAssetRow & { portfolio?: PortfolioRow | null }) | null;

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const canRead = asset.user_id === userId || asset.portfolio?.is_public === true;
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(asset.storage_path, 60 * 10);

  if (error || !data?.signedUrl) {
    console.error("Portfolio asset signed URL failed", error);
    return NextResponse.json(
      { error: "이미지를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; assetId: string } },
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const asset = await portfolioAssetDelegate().findFirst({
    where: {
      id: params.assetId,
      portfolio_id: params.id,
      user_id: userId,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from(BUCKET).remove([asset.storage_path]);
  if (error) {
    console.error("Portfolio asset delete failed", error);
  }

  await portfolioAssetDelegate().delete({
    where: { id: asset.id },
  });

  return NextResponse.json({ success: true });
}
