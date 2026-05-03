import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  mapPortfolioAsset,
  portfolioAssetDelegate,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "portfolio-assets";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ASSETS_PER_PORTFOLIO = 80;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

function extensionFromFile(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && ["jpg", "jpeg", "png", "webp"].includes(byName)) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portfolio = await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const assets = await portfolioAssetDelegate().findMany({
    where: { portfolio_id: portfolio.id },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    items: assets.map((asset) => mapPortfolioAsset(asset, portfolio.id)),
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portfolio = await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const assetCount = await portfolioAssetDelegate().count({
    where: { portfolio_id: portfolio.id },
  });

  if (assetCount >= MAX_ASSETS_PER_PORTFOLIO) {
    return NextResponse.json(
      { error: `포트폴리오당 이미지는 최대 ${MAX_ASSETS_PER_PORTFOLIO}개까지 업로드할 수 있습니다.` },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "JPG, PNG, WebP 이미지만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "이미지는 10MB 이하만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const assetId = crypto.randomUUID();
  const extension = extensionFromFile(file);
  const storagePath = `${user.id}/${portfolio.id}/${assetId}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminSupabaseClient();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Portfolio asset upload failed", uploadError);
    return NextResponse.json(
      { error: "포트폴리오 이미지 업로드에 실패했습니다." },
      { status: 500 },
    );
  }

  const row = await portfolioAssetDelegate().create({
    data: {
      id: assetId,
      portfolio_id: portfolio.id,
      user_id: user.id,
      storage_path: storagePath,
      filename: file.name || "portfolio-image",
      mime_type: file.type,
      size_bytes: file.size,
    },
  });

  return NextResponse.json(
    { item: mapPortfolioAsset(row, portfolio.id) },
    { status: 201 },
  );
}
