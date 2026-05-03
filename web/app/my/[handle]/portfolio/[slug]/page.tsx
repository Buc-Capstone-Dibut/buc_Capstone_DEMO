import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  normalizePortfolioRowDocument,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";
import { PortfolioRenderer } from "@/components/features/career/portfolio-editor/portfolio-renderer";

export const dynamic = "force-dynamic";

export default async function PublicPortfolioPage({
  params,
}: {
  params: { handle: string; slug: string };
}) {
  const handle = decodeURIComponent(params.handle || "").toLowerCase();
  const slug = decodeURIComponent(params.slug || "");
  if (!handle || !slug) notFound();

  const profile = await prisma.profiles.findUnique({
    where: { handle },
    select: {
      id: true,
      nickname: true,
      avatar_url: true,
      handle: true,
    },
  });

  if (!profile) notFound();

  const portfolio = await portfolioDelegate().findFirst({
    where: {
      user_id: profile.id,
      slug,
      is_public: true,
    },
  });

  if (!portfolio) notFound();

  const document = normalizePortfolioRowDocument(portfolio);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-0 py-0 md:px-6 md:py-8">
        <PortfolioRenderer document={document} readonly />
      </div>
    </main>
  );
}
