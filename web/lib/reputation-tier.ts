export const RANK_THRESHOLDS = [
  { tier: "Diamond", minScore: 1800 },
  { tier: "Platinum", minScore: 900 },
  { tier: "Gold", minScore: 400 },
  { tier: "Silver", minScore: 150 },
  { tier: "Bronze", minScore: 30 },
  { tier: "Unranked", minScore: 0 },
] as const;

export type RankTier = (typeof RANK_THRESHOLDS)[number]["tier"];

export function resolveTierByScore(score: number): RankTier {
  const normalized = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;

  const found = RANK_THRESHOLDS.find((item) => normalized >= item.minScore);
  return found?.tier ?? "Unranked";
}
