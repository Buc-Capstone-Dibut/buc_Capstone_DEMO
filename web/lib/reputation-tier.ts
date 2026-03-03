export const RANK_THRESHOLDS = [
  { tier: "거목", minScore: 1800 },
  { tier: "숲", minScore: 900 },
  { tier: "나무", minScore: 400 },
  { tier: "묘목", minScore: 150 },
  { tier: "새싹", minScore: 30 },
  { tier: "씨앗", minScore: 0 },
] as const;

export type RankTier = (typeof RANK_THRESHOLDS)[number]["tier"];

export function resolveTierByScore(score: number): RankTier {
  const normalized = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;

  const found = RANK_THRESHOLDS.find((item) => normalized >= item.minScore);
  return found?.tier ?? "씨앗";
}
