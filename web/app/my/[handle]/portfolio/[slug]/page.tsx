import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  normalizePortfolioRowDocument,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";
import { PortfolioRenderer } from "@/components/features/career/portfolio-editor/portfolio-renderer";
import { PortfolioSiteRenderer } from "@/components/features/career/portfolio-site/portfolio-site-renderer";

// Public, anonymous-facing portfolio keyed by stable handle+slug (is_public).
// ISR: cache the render + DB reads for 60s so shared/social links don't hit
// Postgres on every view, while edits still surface within a minute.
export const revalidate = 60;

// Prerender none at build; generate + cache each public portfolio on first
// request (on-demand ISR), then serve the cached render for `revalidate`s.
export function generateStaticParams() {
  return [];
}

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

  if (document.format === "site") {
    return <PortfolioSiteRenderer document={document} readonly />;
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-0 py-0 md:px-6 md:py-8">
        <PortfolioRenderer document={document} readonly />
      </div>
    </main>
  );
}
