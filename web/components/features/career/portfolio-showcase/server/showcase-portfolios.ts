import "server-only";

import prisma from "@/lib/prisma";
import {
  normalizeShowcaseSlug as normalizeShowcaseSlugImpl,
  pickProjectSnapshotsByIds,
} from "./showcase-portfolios-pure";

export { pickProjectSnapshotsByIds };
export const normalizeShowcaseSlug = normalizeShowcaseSlugImpl;

export type ShowcasePortfolioRow = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  template_id: string;
  content_payload: unknown;
  tokens_payload: unknown;
  is_public: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type ShowcaseDelegate = {
  findMany(args: unknown): Promise<ShowcasePortfolioRow[]>;
  findFirst(args: unknown): Promise<ShowcasePortfolioRow | null>;
  create(args: unknown): Promise<ShowcasePortfolioRow>;
  update(args: unknown): Promise<ShowcasePortfolioRow>;
  delete(args: unknown): Promise<ShowcasePortfolioRow>;
};

export function showcasePortfolioDelegate() {
  return (prisma as unknown as { showcase_portfolios: ShowcaseDelegate }).showcase_portfolios;
}

export async function createUniqueShowcaseSlug(userId: string, title: string): Promise<string> {
  const base = normalizeShowcaseSlugImpl(title || "portfolio") || `portfolio-${Date.now().toString(36)}`;
  const delegate = showcasePortfolioDelegate();
  let candidate = base;
  let n = 2;
  while (await delegate.findFirst({ where: { user_id: userId, slug: candidate } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}
