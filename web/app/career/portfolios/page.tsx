import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  getPortfolioSourceData,
  mapPortfolioRow,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { SHOWCASE_TEMPLATES, isShowcaseTemplateId } from "@/components/features/career/portfolio-showcase/templates/registry";
import PortfoliosClient from "./client";
import type { UnifiedPortfolioItem } from "./types";

export const dynamic = "force-dynamic";

export default async function CareerPortfoliosPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/career/portfolios");
  }

  const [rows, showcaseRows, source, profile] = await Promise.all([
    portfolioDelegate().findMany({
      where: { user_id: session.user.id },
      orderBy: { updated_at: "desc" },
    }),
    showcasePortfolioDelegate().findMany({
      where: { user_id: session.user.id },
      orderBy: { updated_at: "desc" },
    }),
    getPortfolioSourceData(session.user.id),
    prisma.profiles.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    }),
  ]);

  const legacyUnified: UnifiedPortfolioItem[] = rows.map((row) => {
    const item = mapPortfolioRow(row);
    const publicUrl =
      item.isPublic && profile?.handle
        ? `/my/${encodeURIComponent(profile.handle)}/portfolio/${encodeURIComponent(item.slug)}`
        : null;
    const legacy = { ...item, publicUrl };
    return {
      kind: "legacy",
      id: legacy.id,
      title: legacy.title,
      slug: legacy.slug,
      updatedAt: legacy.updatedAt,
      publishedAt: legacy.publishedAt ?? null,
      isPublic: legacy.isPublic,
      publicUrl,
      legacy,
    };
  });

  const showcaseUnified: UnifiedPortfolioItem[] = showcaseRows.map((row) => {
    const templateLabel = isShowcaseTemplateId(row.template_id)
      ? SHOWCASE_TEMPLATES[row.template_id].label
      : row.template_id;
    const publicUrl =
      row.is_public && profile?.handle
        ? `/p/${encodeURIComponent(profile.handle)}/${encodeURIComponent(row.slug)}`
        : null;
    return {
      kind: "showcase",
      id: row.id,
      title: row.title,
      slug: row.slug,
      updatedAt: row.updated_at.toISOString(),
      publishedAt: row.published_at ? row.published_at.toISOString() : null,
      isPublic: row.is_public,
      publicUrl,
      showcase: {
        templateId: row.template_id,
        templateLabel,
      },
    };
  });

  const merged = [...legacyUnified, ...showcaseUnified].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <PortfoliosClient
      initialPortfolios={merged}
      sourceStats={{
        projects: source.projects.length,
        workExperiences: source.workExperiences.length,
        coverLetters: source.coverLetters.length,
        skills: source.skills.length,
      }}
    />
  );
}
