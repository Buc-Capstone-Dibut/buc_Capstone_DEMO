import type { ImportSourceAdapter, JobPostingDraft } from "./types";

type Row = {
  id: string;
  title?: string | null;
  body?: string | null;
  tags?: unknown;
};

const NOISE_TOKENS = new Set([
  "자기소개서",
  "자소서",
  "지원서",
  "지원동기",
  "이력서",
]);

/**
 * "삼성전자 백엔드 자기소개서" → companyName="삼성전자", roleTitle="백엔드"
 * 단순 휴리스틱: 공백/구두점 분할 후 첫 토큰을 회사, 다음 토큰들을 직무로.
 * 노이즈 토큰("자기소개서" 등) 제거.
 */
function splitTitle(title: string): { companyName?: string; roleTitle?: string } {
  const cleaned = title.replace(/[\[\]()<>,/|]+/g, " ").trim();
  if (!cleaned) return {};
  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !NOISE_TOKENS.has(t));
  if (tokens.length === 0) return {};
  if (tokens.length === 1) return { companyName: tokens[0] };
  return {
    companyName: tokens[0],
    roleTitle: tokens.slice(1).join(" "),
  };
}

export const coverLetterAdapter: ImportSourceAdapter<Row> = {
  key: "cover_letter",
  extractSuggestion(row: Row): JobPostingDraft {
    const draft: JobPostingDraft = {};
    if (row.title) {
      const { companyName, roleTitle } = splitTitle(row.title);
      if (companyName) draft.companyName = companyName;
      if (roleTitle) draft.roleTitle = roleTitle;
    }
    if (typeof row.body === "string" && row.body.trim().length > 0) {
      const memo = row.body.trim().slice(0, 200);
      draft.memo = memo;
    }
    if (Array.isArray(row.tags)) {
      const tags = (row.tags as unknown[]).filter(
        (t): t is string => typeof t === "string" && t.trim().length > 0,
      );
      if (tags.length > 0) draft.techStack = tags;
    }
    return draft;
  },
};
