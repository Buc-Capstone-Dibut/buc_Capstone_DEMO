import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { ShowcaseWizardClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ShowcaseWizardPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id?.trim();
  if (!id) redirect("/career/portfolios");

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/career/portfolios/showcase-wizard?id=${id}`)}`);

  const row = await showcasePortfolioDelegate().findFirst({
    where: { id, user_id: session.user.id },
  });
  if (!row) notFound();

  return (
    <ShowcaseWizardClient
      portfolio={{
        id: row.id,
        slug: row.slug,
        title: row.title,
        templateId: row.template_id,
        isPublic: row.is_public,
      }}
      initialContent={row.content_payload as Record<string, unknown>}
      initialTokens={row.tokens_payload as Record<string, unknown>}
    />
  );
}
