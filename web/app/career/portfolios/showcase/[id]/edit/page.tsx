import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { ShowcaseEditorClient } from "@/components/features/career/portfolio-showcase/editor/showcase-editor-client";

export const dynamic = "force-dynamic";

export default async function ShowcaseEditPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/login?next=/career/portfolios/showcase/${params.id}/edit`);

  const row = await showcasePortfolioDelegate().findFirst({
    where: { id: params.id, user_id: session.user.id },
  });
  if (!row) notFound();

  return (
    <ShowcaseEditorClient
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
