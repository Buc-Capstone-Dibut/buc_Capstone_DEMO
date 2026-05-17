import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";
import { getPortfolioSourceData } from "@/lib/server/career-portfolios";
import {
  showcasePortfolioDelegate,
  pickProjectSnapshotsByIds,
  createUniqueShowcaseSlug,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { getShowcaseTemplate } from "@/components/features/career/portfolio-showcase/templates/registry";

export const dynamic = "force-dynamic";

export default async function NewShowcasePage({
  searchParams,
}: {
  searchParams: { projectIds?: string | string[]; templateId?: string; title?: string };
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const back = `/career/portfolios/showcase/new`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  const seed = extractAuthProfileSeed(session.user);
  await ensureProfileForUser({
    userId: session.user.id,
    nickname: seed.nickname,
    email: seed.email,
    avatarUrl: seed.avatarUrl,
  });

  const raw = searchParams.projectIds;
  const projectIds = (Array.isArray(raw) ? raw : raw ? raw.split(",") : [])
    .map((s) => s.trim())
    .filter(Boolean);

  const templateKey = "neon-editorial";
  const template = getShowcaseTemplate(templateKey);
  const title = searchParams.title?.trim() || `Portfolio ${new Date().toISOString().slice(0, 10)}`;

  const source = await getPortfolioSourceData(session.user.id);
  const snapshots = pickProjectSnapshotsByIds(source.projects, projectIds);
  const displayName = source.personalInfo?.name?.trim() || seed.nickname || "PORTFOLIO";

  const content = template.createDefaultContent({ name: displayName, projects: snapshots });
  content.contact.email = source.personalInfo?.email ?? "";

  const slug = await createUniqueShowcaseSlug(session.user.id, title);
  const row = await showcasePortfolioDelegate().create({
    data: {
      user_id: session.user.id,
      slug,
      title,
      template_id: templateKey,
      content_payload: content,
      tokens_payload: template.createDefaultTokens(),
      is_public: false,
    },
  });

  redirect(`/career/portfolios/showcase/${row.id}/edit`);
}
