import { AnalysisHubSession, computeRepresentativeAxes, deriveSessionTags, collectRecurringWeaknesses, collectRecommendedActions } from "@/lib/interview/report/analysis-hub";
import { Blog } from "@/lib/supabase";

export type RecommendedBlog = Blog & {
  recommendationReason: string;
  recommendationScore: number;
  matchedTags: string[];
};

const TECH_STACK_TAG_MAP: Record<string, string[]> = {
  react: ["react", "frontend", "typescript"],
  nextjs: ["nextjs", "react", "typescript", "frontend"],
  typescript: ["typescript", "javascript", "frontend"],
  javascript: ["javascript", "frontend"],
  css: ["css", "frontend", "ui/ux"],
  html: ["html", "frontend"],
  figma: ["ui/ux", "frontend"],
  java: ["java", "backend"],
  spring: ["spring", "java", "backend"],
  springboot: ["spring", "java", "backend"],
  node: ["node", "backend"],
  nodejs: ["node", "backend"],
  nest: ["nest", "node", "backend"],
  nestjs: ["nest", "node", "backend"],
  python: ["python", "backend", "ai"],
  go: ["go", "backend"],
  kotlin: ["kotlin", "mobile"],
  swift: ["swift", "ios", "mobile"],
  flutter: ["flutter", "mobile"],
  reactnative: ["react-native", "mobile"],
  aws: ["aws", "cloud", "devops"],
  docker: ["docker", "devops"],
  kubernetes: ["kubernetes", "devops"],
  sql: ["sql", "data"],
  postgresql: ["postgresql", "sql", "data"],
  mysql: ["mysql", "sql", "data"],
  mongodb: ["mongodb", "data"],
  supabase: ["backend", "database"],
};

const INTENT_TAG_RULES: Array<{ keywords: string[]; tags: string[] }> = [
  { keywords: ["성과", "수치", "지표", "metric", "latency", "응답", "성능"], tags: ["case-study", "monitoring", "scalability"] },
  { keywords: ["설계", "구조", "아키텍처", "system", "architecture"], tags: ["architecture", "system design", "backend"] },
  { keywords: ["장애", "안정", "운영", "모니터링", "sre", "observability"], tags: ["monitoring", "sre", "case-study"] },
  { keywords: ["api", "백엔드", "backend", "서버"], tags: ["backend", "api", "architecture"] },
  { keywords: ["frontend", "프론트", "ui", "ux", "react"], tags: ["frontend", "react", "typescript", "ui/ux"] },
  { keywords: ["협업", "조율", "설득", "커뮤니케이션", "기획"], tags: ["product", "business", "case-study"] },
  { keywords: ["배포", "cicd", "ci/cd", "github actions", "깃허브 액션"], tags: ["cicd", "devops", "cloud"] },
  { keywords: ["데이터", "sql", "postgres", "mysql", "mongodb"], tags: ["data", "sql", "database"] },
];

const KEYWORD_STOPWORDS = new Set([
  "답변",
  "먼저",
  "다음",
  "말하기",
  "설명",
  "설명하기",
  "경험",
  "프로젝트",
  "기반",
  "중심",
  "실제",
  "기록",
  "정리",
  "리포트",
  "면접",
  "보완",
  "액션",
  "분석",
  "질문",
  "세션",
  "것",
  "더",
  "있는",
  "있음",
  "있습니다",
  "도입",
  "직접",
  "도움",
  "도움이",
  "되는",
  "하기",
  "하기에",
  "맞춘",
  "관련",
  "최근",
  "먼저",
]);

function normalizeTechStack(value: string) {
  return value.toLowerCase().replace(/[\s._-]+/g, "");
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function addWeightedTags(
  target: Map<string, { score: number; sources: Set<string> }>,
  tags: string[],
  score: number,
  source: string,
) {
  tags.forEach((tag) => {
    const key = tag.trim().toLowerCase();
    if (!key) return;
    const current = target.get(key) ?? { score: 0, sources: new Set<string>() };
    current.score += score;
    current.sources.add(source);
    target.set(key, current);
  });
}

function trimKoreanParticle(token: string) {
  if (token.length <= 2) return token;
  return token.replace(/(으로|에서|에게|처럼|까지|부터|으로서|으로써|에게서|은|는|이|가|을|를|의|에|와|과|도|만|로)$/u, "");
}

function extractPhraseKeywords(phrases: string[]): string[] {
  const keywords: string[] = [];
  phrases.forEach((phrase) => {
    const normalized = phrase
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s/+-]/gu, " ")
      .split(/\s+/)
      .map((token) => trimKoreanParticle(token.trim()))
      .filter((token) => token.length >= 2 && !KEYWORD_STOPWORDS.has(token));
    keywords.push(...normalized);
  });
  return uniq(keywords);
}

function deriveIntentTags(phrases: string[]): string[] {
  const source = phrases.join(" ").toLowerCase();
  const tags: string[] = [];
  INTENT_TAG_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => source.includes(keyword))) {
      tags.push(...rule.tags);
    }
  });
  return uniq(tags);
}

function sanitizeReasonPhrase(phrase: string): string {
  return phrase
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.。]+$/g, "")
    .replace(/^[-*•\s]+/, "")
    .slice(0, 36);
}

function getSourcePriority(sources: Set<string>) {
  if (sources.has("action")) return 4;
  if (sources.has("weakness")) return 3;
  if (sources.has("tech")) return 2;
  if (sources.has("session")) return 1;
  return 0;
}

function buildAxisTags(sessions: AnalysisHubSession[], representativeLabels: string[]): string[] {
  const representativeAxes = computeRepresentativeAxes(sessions);
  const tags: string[] = [];

  if (representativeAxes.approach >= 50) {
    tags.push("architecture", "system design", "case-study");
  } else {
    tags.push("product", "case-study");
  }

  if (representativeAxes.scope >= 50) {
    tags.push("backend", "scalability", "monitoring");
  } else {
    tags.push("frontend", "typescript", "react");
  }

  if (representativeAxes.decision >= 50) {
    tags.push("monitoring", "sre", "case-study");
  } else {
    tags.push("cicd", "ai", "product");
  }

  if (representativeAxes.execution >= 50) {
    tags.push("api", "java", "spring", "node", "go", "react");
  } else {
    tags.push("business", "product", "case-study");
  }

  representativeLabels.forEach((label) => {
    if (label.includes("시스템")) tags.push("architecture", "backend");
    if (label.includes("구현")) tags.push("frontend", "react", "typescript");
    if (label.includes("안정")) tags.push("monitoring", "sre");
    if (label.includes("실험")) tags.push("product", "case-study", "ai");
    if (label.includes("구축")) tags.push("backend", "api");
    if (label.includes("조정")) tags.push("product", "business");
  });

  return uniq(tags);
}

function scoreBlogTextMatches(blog: Blog, keywords: string[], multiplier: number) {
  const haystack = `${blog.title} ${blog.summary || ""}`.toLowerCase();
  return keywords.reduce((score, keyword) => (haystack.includes(keyword) ? score + multiplier : score), 0);
}

function getRecencyBonus(blog: Blog) {
  const publishedAt = Date.parse(blog.published_at || "");
  if (Number.isNaN(publishedAt)) return 0;
  const days = Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60 * 24));
  if (days <= 30) return 3;
  if (days <= 90) return 2;
  if (days <= 180) return 1;
  return 0;
}

function buildRecommendationReason(
  params: {
    matchedTags: string[];
    matchedActionPhrase: string | null;
    matchedWeaknessPhrase: string | null;
  },
): string {
  const { matchedTags, matchedActionPhrase, matchedWeaknessPhrase } = params;
  if (matchedActionPhrase) {
    return `다음 액션인 "${matchedActionPhrase}"에 도움이 되는 글`;
  }
  if (matchedWeaknessPhrase) {
    return `반복 약점인 "${matchedWeaknessPhrase}" 보완에 맞춘 글`;
  }
  if (matchedTags.length > 0) {
    return `${matchedTags.slice(0, 2).join(", ")} 태그가 현재 면접 흐름과 잘 맞는 글`;
  }
  return "최근 면접 기록을 기준으로 함께 읽기 좋은 글";
}

function pickBestMatchingPhrase(blog: Blog, phrases: string[], relatedTags: Set<string>) {
  const haystack = `${blog.title} ${blog.summary || ""}`.toLowerCase();
  const blogTags = new Set((blog.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean));

  const ranked = phrases
    .map((phrase) => {
      const keywords = extractPhraseKeywords([phrase]);
      const keywordMatches = keywords.reduce((count, keyword) => (haystack.includes(keyword) ? count + 1 : count), 0);
      const phraseTags = deriveIntentTags([phrase]).filter((tag) => relatedTags.has(tag));
      const matchedTagCount = phraseTags.reduce((count, tag) => (blogTags.has(tag) ? count + 1 : count), 0);
      return {
        phrase,
        score: keywordMatches * 4 + matchedTagCount * 3,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!ranked[0] || ranked[0].score <= 0) {
    return null;
  }

  return sanitizeReasonPhrase(ranked[0].phrase);
}

export function rankRecommendedBlogs(params: {
  blogs: Blog[];
  sessions: AnalysisHubSession[];
  representativeLabels: string[];
  techStack: string[];
  limit?: number;
}) {
  const { blogs, sessions, representativeLabels, techStack, limit = 3 } = params;
  const recurringWeaknesses = collectRecurringWeaknesses(sessions, 5);
  const recommendedActions = collectRecommendedActions(sessions, 5);
  const sessionTags = deriveSessionTags(sessions);
  const techTags = uniq(
    techStack.flatMap((item) => TECH_STACK_TAG_MAP[normalizeTechStack(item)] ?? []),
  );
  const axisTags = buildAxisTags(sessions, representativeLabels);
  const weaknessTags = deriveIntentTags(recurringWeaknesses);
  const actionTags = deriveIntentTags(recommendedActions);
  const weaknessKeywords = extractPhraseKeywords(recurringWeaknesses);
  const actionKeywords = extractPhraseKeywords(recommendedActions);
  const actionTagSet = new Set(actionTags);
  const weaknessTagSet = new Set(weaknessTags);

  const weightedTags = new Map<string, { score: number; sources: Set<string> }>();
  addWeightedTags(weightedTags, techTags, 3, "tech");
  addWeightedTags(weightedTags, axisTags, 2, "axis");
  addWeightedTags(weightedTags, sessionTags, 2, "session");
  addWeightedTags(weightedTags, weaknessTags, 6, "weakness");
  addWeightedTags(weightedTags, actionTags, 7, "action");

  const ranked = blogs
    .map((blog) => {
      const blogTags = (blog.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
      const matchedTags = blogTags.filter((tag) => weightedTags.has(tag));
      const tagScore = matchedTags.reduce((sum, tag) => sum + (weightedTags.get(tag)?.score ?? 0), 0);
      const matchedWeaknessKeywords = weaknessKeywords.filter((keyword) =>
        `${blog.title} ${blog.summary || ""}`.toLowerCase().includes(keyword),
      );
      const matchedActionKeywords = actionKeywords.filter((keyword) =>
        `${blog.title} ${blog.summary || ""}`.toLowerCase().includes(keyword),
      );
      const textScore =
        scoreBlogTextMatches(blog, matchedWeaknessKeywords, 4)
        + scoreBlogTextMatches(blog, matchedActionKeywords, 5);
      const sourceDiversityBonus = new Set(matchedTags.flatMap((tag) => Array.from(weightedTags.get(tag)?.sources ?? []))).size;
      const matchedActionPhrase = pickBestMatchingPhrase(blog, recommendedActions, actionTagSet);
      const matchedWeaknessPhrase = pickBestMatchingPhrase(blog, recurringWeaknesses, weaknessTagSet);
      const hasActionMatch =
        matchedActionPhrase !== null
        || matchedActionKeywords.length > 0
        || blogTags.some((tag) => actionTagSet.has(tag));
      const hasWeaknessMatch =
        matchedWeaknessPhrase !== null
        || matchedWeaknessKeywords.length > 0
        || blogTags.some((tag) => weaknessTagSet.has(tag));
      const score = tagScore + textScore + sourceDiversityBonus + getRecencyBonus(blog);

      return {
        ...blog,
        matchedTags,
        recommendationScore: score,
        recommendationReason: buildRecommendationReason({
          matchedTags,
          matchedActionPhrase: hasActionMatch ? matchedActionPhrase : null,
          matchedWeaknessPhrase: hasWeaknessMatch ? matchedWeaknessPhrase : null,
        }),
      } satisfies RecommendedBlog;
    })
    .sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      return Date.parse(b.published_at || "") - Date.parse(a.published_at || "");
    });

  const recommendedBlogs = ranked.slice(0, limit);
  const rankedTagCandidates = new Map<string, { score: number; sourcePriority: number }>();

  recommendedBlogs.forEach((blog, index) => {
    const rankBonus = Math.max(limit - index, 1) * 4;
    blog.matchedTags.forEach((tag) => {
      const weighted = weightedTags.get(tag);
      const current = rankedTagCandidates.get(tag) ?? { score: 0, sourcePriority: 0 };
      current.score += (weighted?.score ?? 0) + rankBonus;
      current.sourcePriority = Math.max(current.sourcePriority, getSourcePriority(weighted?.sources ?? new Set<string>()));
      rankedTagCandidates.set(tag, current);
    });
  });

  Array.from(weightedTags.entries())
    .filter(([tag]) => blogs.some((blog) => (blog.tags ?? []).map((item) => item.toLowerCase()).includes(tag)))
    .forEach(([tag, value]) => {
      if (rankedTagCandidates.has(tag)) return;
      rankedTagCandidates.set(tag, {
        score: value.score,
        sourcePriority: getSourcePriority(value.sources),
      });
    });

  const resolvedRecommendationTags = Array.from(rankedTagCandidates.entries())
    .sort((a, b) => {
      if (b[1].sourcePriority !== a[1].sourcePriority) {
        return b[1].sourcePriority - a[1].sourcePriority;
      }
      return b[1].score - a[1].score;
    })
    .slice(0, 8)
    .map(([tag]) => tag);

  return {
    recommendedBlogs,
    resolvedRecommendationTags,
  };
}
