import type { PortfolioListItem } from "@/lib/career-portfolios";

/**
 * Unified item for /career/portfolios list.
 * Wraps both legacy `user_portfolios` rows and new `showcase_portfolios` rows
 * so the same list UI can render and filter both kinds.
 */
export type UnifiedPortfolioItem = {
  kind: "legacy" | "showcase";
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
  publishedAt: string | null;
  isPublic: boolean;
  publicUrl: string | null;
  /** Full PortfolioListItem for legacy rows — drives existing detail/export UI. */
  legacy?: PortfolioListItem;
  /** Minimal showcase fields — used to render badge + simpler detail. */
  showcase?: {
    templateId: string;
    templateLabel: string;
  };
};
