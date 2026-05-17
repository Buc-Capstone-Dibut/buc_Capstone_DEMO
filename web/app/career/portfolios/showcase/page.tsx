import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import ShowcaseListClient from "./client";

export const dynamic = "force-dynamic";

export default async function ShowcaseListPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login?next=/career/portfolios/showcase");

  const [rows, profile] = await Promise.all([
    showcasePortfolioDelegate().findMany({
      where: { user_id: session.user.id },
      orderBy: { updated_at: "desc" },
    }),
    prisma.profiles.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    templateId: r.template_id,
    isPublic: r.is_public,
    updatedAt: r.updated_at?.toISOString?.() || new Date().toISOString(),
    publishedAt: r.published_at?.toISOString?.() || null,
    publicUrl: r.is_public && profile?.handle
      ? `/p/${encodeURIComponent(profile.handle.toLowerCase())}/${encodeURIComponent(r.slug)}`
      : null,
  }));

  return <ShowcaseListClient initialItems={items} />;
}
