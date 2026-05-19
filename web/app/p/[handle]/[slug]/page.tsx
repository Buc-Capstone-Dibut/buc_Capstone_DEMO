import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { getShowcaseTemplate } from "@/components/features/career/portfolio-showcase/templates/registry";

export const dynamic = "force-dynamic";

export default async function PublicShowcasePage({
  params,
}: {
  params: { handle: string; slug: string };
}) {
  const handle = decodeURIComponent(params.handle || "").toLowerCase();
  const slug = decodeURIComponent(params.slug || "");
  if (!handle || !slug) notFound();

  const profile = await prisma.profiles.findUnique({
    where: { handle },
    select: { id: true },
  });
  if (!profile) notFound();

  const row = await showcasePortfolioDelegate().findFirst({
    where: { user_id: profile.id, slug, is_public: true },
  });
  if (!row) notFound();

  const template = getShowcaseTemplate(row.template_id);
  const Template = template.Component;

  // Parse with safeParse to tolerate older saved rows.
  const content = template.contentSchema.safeParse(row.content_payload).data
    ?? template.createDefaultContent({ name: "PORTFOLIO" });
  const tokens = template.tokensSchema.safeParse(row.tokens_payload).data
    ?? template.createDefaultTokens();

  return <Template content={content} tokens={tokens} />;
}
