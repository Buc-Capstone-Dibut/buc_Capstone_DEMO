import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  getPortfolioSourceData,
  mapPortfolioAsset,
  mapPortfolioRow,
  normalizePortfolioRowDocument,
  portfolioAssetDelegate,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";
import { PortfolioEditorClient } from "@/components/features/career/portfolio-editor/portfolio-editor-client";

export const dynamic = "force-dynamic";

export default async function PortfolioEditPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/login?next=/career/portfolios/${params.id}/edit`);
  }

  const row = await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: session.user.id },
  });

  if (!row) {
    redirect("/career/portfolios");
  }

  const [source, assets, profile] = await Promise.all([
    getPortfolioSourceData(session.user.id),
    portfolioAssetDelegate().findMany({
      where: { portfolio_id: row.id },
      orderBy: { created_at: "desc" },
    }),
    prisma.profiles.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    }),
  ]);

  const publicUrl =
    row.is_public && profile?.handle
      ? `/my/${encodeURIComponent(profile.handle)}/portfolio/${encodeURIComponent(row.slug)}`
      : null;

  return (
    <PortfolioEditorClient
      portfolio={mapPortfolioRow(row)}
      document={normalizePortfolioRowDocument(row)}
      source={source}
      assets={assets.map((asset) => mapPortfolioAsset(asset, row.id))}
      publicUrl={publicUrl}
    />
  );
}
