import { SITE_HELPER_KNOWLEDGE } from "./knowledge";
import type {
  SiteHelperKnowledgeItem,
  SiteHelperRetrieveResult,
  SiteHelperSource,
} from "./types";

const TOKEN_MIN_LENGTH = 2;

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= TOKEN_MIN_LENGTH),
    ),
  );
}

function scoreField(query: string, queryTokens: string[], field: string, exactWeight: number) {
  const normalizedField = normalizeText(field);
  if (!normalizedField) return 0;

  let score = 0;
  if (normalizedField === query && query.length >= TOKEN_MIN_LENGTH) {
    score += exactWeight * 2;
  } else if (normalizedField.length >= TOKEN_MIN_LENGTH && query.includes(normalizedField)) {
    score += exactWeight;
  }
  if (normalizedField.includes(query) && query.length >= TOKEN_MIN_LENGTH) {
    score += Math.max(2, Math.floor(exactWeight / 2));
  }

  for (const token of queryTokens) {
    if (normalizedField === token) score += 3;
    else if (normalizedField.includes(token)) score += 1;
  }

  return score;
}

function toSource(item: SiteHelperKnowledgeItem, score: number): SiteHelperSource {
  return {
    id: item.id,
    title: item.title,
    route: item.route,
    summary: item.summary,
    category: item.category,
    details: item.details,
    score,
  };
}

export function findCurrentSiteHelperPage(pathname?: string | null) {
  const normalizedPath = pathname?.split("?")[0]?.split("#")[0] || "";
  if (!normalizedPath) return null;

  const matches = SITE_HELPER_KNOWLEDGE.filter((item) => {
    if (item.route === "/") return normalizedPath === "/";
    return normalizedPath === item.route || normalizedPath.startsWith(`${item.route}/`);
  }).sort((a, b) => b.route.length - a.route.length);

  return matches[0] ? toSource(matches[0], 0) : null;
}

export function retrieveSiteHelperKnowledge(
  message: string,
  currentPath?: string | null,
  limit = 5,
): SiteHelperRetrieveResult {
  const query = normalizeText(message);
  const queryTokens = tokenize(message);
  const currentPage = findCurrentSiteHelperPage(currentPath);

  const scored = SITE_HELPER_KNOWLEDGE.map((item) => {
    let score = 0;
    score += scoreField(query, queryTokens, item.title, 10);
    score += scoreField(query, queryTokens, item.route, 5);
    score += scoreField(query, queryTokens, item.summary, 2);

    for (const keyword of item.keywords) {
      score += scoreField(query, queryTokens, keyword, 8);
    }
    for (const question of item.commonQuestions) {
      score += scoreField(query, queryTokens, question, 4);
    }
    for (const detail of item.details || []) {
      score += scoreField(query, queryTokens, detail, 2);
    }

    if (currentPage?.id === item.id) score += 3;
    return toSource(item, score);
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ko"));

  const matches = scored.slice(0, limit);
  if (matches.length === 0 && currentPage) {
    return { matches: [currentPage], currentPage };
  }

  return { matches, currentPage };
}

export function buildFallbackSiteHelperAnswer(result: SiteHelperRetrieveResult) {
  const [primary, ...rest] = result.matches;

  if (!primary) {
    return [
      "Dibut 사이트 기능 안에서 정확히 맞는 항목을 찾지 못했습니다.",
      "",
      "다시 물어볼 때는 이런 식으로 적어보세요.",
      "- 게시글 작성",
      "- 팀원 모집",
      "- 포트폴리오 만들기",
      "- AI 면접 시작",
    ].join("\n");
  }

  const details = primary.details?.length
    ? `\n\n여기서 할 수 있는 일\n${primary.details
        .slice(0, 3)
        .map((detail) => `- ${detail}`)
        .join("\n")}`
    : "";

  const related = rest.length
    ? `\n\n함께 볼 만한 곳: ${rest
        .slice(0, 2)
        .map((item) => item.title)
        .join(", ")}`
    : "";

  return `${primary.title} 페이지가 가장 가깝습니다.\n${primary.summary}${details}\n\n아래 관련 페이지 버튼으로 이동할 수 있습니다.${related}`;
}
