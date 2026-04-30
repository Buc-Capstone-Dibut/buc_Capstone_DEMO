import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  getPortfolioSourceData,
  mapPortfolioRow,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";
import PortfoliosClient from "./client";

export const dynamic = "force-dynamic";

export default async function CareerPortfoliosPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/career/portfolios");
  }

  const [rows, source, profile] = await Promise.all([
    portfolioDelegate().findMany({
      where: { user_id: session.user.id },
      orderBy: { updated_at: "desc" },
    }),
    getPortfolioSourceData(session.user.id),
    prisma.profiles.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    }),
  ]);

  const mappedPortfolios = rows.map((row) => {
    const item = mapPortfolioRow(row);
    return {
      ...item,
      publicUrl:
        item.isPublic && profile?.handle
          ? `/my/${encodeURIComponent(profile.handle)}/portfolio/${encodeURIComponent(item.slug)}`
          : null,
    };
  });

  return (
    <PortfoliosClient
      initialPortfolios={mappedPortfolios}
      sourceStats={{
        projects: source.projects.length,
        workExperiences: source.workExperiences.length,
        coverLetters: source.coverLetters.length,
        skills: source.skills.length,
      }}
    />
  );
}
