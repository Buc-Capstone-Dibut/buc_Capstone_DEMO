export const WORKSPACE_TEAM_ROLE_SUGGESTIONS = [
  "프론트엔드",
  "백엔드",
  "디자인",
  "PM",
  "기획",
  "AI",
  "데이터",
  "인프라",
  "마케팅",
  "기타",
] as const;

export function normalizeWorkspaceTeamRole(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, 80);
}
