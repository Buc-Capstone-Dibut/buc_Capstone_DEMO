import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";
import { getPortfolioSourceData } from "@/lib/server/career-portfolios";
import {
  showcasePortfolioDelegate,
  pickProjectSnapshotsByIds,
  createUniqueShowcaseSlug,
  type ShowcasePortfolioRow,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import {
  getShowcaseTemplate,
  isShowcaseTemplateId,
} from "@/components/features/career/portfolio-showcase/templates/registry";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await showcasePortfolioDelegate().findMany({
    where: { user_id: user.id },
    orderBy: { updated_at: "desc" },
  });
  return NextResponse.json({ items: rows.map(mapShowcaseRow) });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seed = extractAuthProfileSeed(user);
  await ensureProfileForUser({
    userId: user.id,
    nickname: seed.nickname,
    email: seed.email,
    avatarUrl: seed.avatarUrl,
  });

  const body = await request.json().catch(() => ({}));
  const projectIds: string[] = Array.isArray(body.projectIds)
    ? body.projectIds.filter((x: unknown): x is string => typeof x === "string")
    : [];
  const rawTemplateId = typeof body.templateId === "string" ? body.templateId : "neon-editorial";
  const templateKey = isShowcaseTemplateId(rawTemplateId) ? rawTemplateId : "neon-editorial";
  const template = getShowcaseTemplate(templateKey);
  const titleInput = typeof body.title === "string" ? body.title.trim() : "";
  const title = titleInput || "새 포트폴리오";

  // Snapshot the selected timeline projects.
  const source = await getPortfolioSourceData(user.id);
  const snapshots = pickProjectSnapshotsByIds(source.projects, projectIds);

  const displayName = source.personalInfo?.name?.trim() || (seed.nickname ?? "PORTFOLIO");
  const defaultContent = template.createDefaultContent({ name: displayName, projects: snapshots });
  defaultContent.contact.email = source.personalInfo?.email ?? "";

  // AI fill — best-effort, returns input unchanged on error or no projects.
  const { aiFillNeonEditorialContent } = await import(
    "@/components/features/career/portfolio-showcase/server/ai-fill"
  );
  const filledContent = await aiFillNeonEditorialContent({
    content: defaultContent,
    source,
    snapshots,
  });

  const tokens = template.createDefaultTokens();
  const slug = await createUniqueShowcaseSlug(user.id, title);

  const row = await showcasePortfolioDelegate().create({
    data: {
      user_id: user.id,
      slug,
      title,
      template_id: templateKey,
      content_payload: filledContent,
      tokens_payload: tokens,
      is_public: false,
    },
  });

  return NextResponse.json({ item: mapShowcaseRow(row) }, { status: 201 });
}

function mapShowcaseRow(row: ShowcasePortfolioRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    templateId: row.template_id,
    isPublic: row.is_public,
    publishedAt: row.published_at?.toISOString?.() || null,
    updatedAt: row.updated_at?.toISOString?.() || new Date().toISOString(),
  };
}
