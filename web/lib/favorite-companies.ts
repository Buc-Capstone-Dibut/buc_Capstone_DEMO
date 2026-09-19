const MAX_FAVORITE_COMPANIES = 50;
const MAX_COMPANY_NAME_LENGTH = 100;

export function normalizeFavoriteCompanies(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const companies: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const company = item.replace(/\s+/g, " ").trim().slice(0, MAX_COMPANY_NAME_LENGTH);
    const key = company.toLocaleLowerCase("ko-KR");
    if (!company || seen.has(key)) continue;
    seen.add(key);
    companies.push(company);
    if (companies.length >= MAX_FAVORITE_COMPANIES) break;
  }

  return companies;
}

export function readFavoriteCompanies(settingsPayload: unknown): string[] {
  if (!settingsPayload || typeof settingsPayload !== "object" || Array.isArray(settingsPayload)) {
    return [];
  }

  return normalizeFavoriteCompanies(
    (settingsPayload as Record<string, unknown>).favoriteCompanies,
  );
}
