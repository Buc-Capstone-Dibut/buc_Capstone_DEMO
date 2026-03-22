export const TEAM_TYPE_OPTIONS = [
  { value: "project", label: "프로젝트" },
  { value: "study", label: "스터디" },
  { value: "contest", label: "공모전" },
  { value: "mogakco", label: "모각코" },
] as const;

export type TeamType = (typeof TEAM_TYPE_OPTIONS)[number]["value"];

const TEAM_TYPE_LABELS: Record<TeamType, string> = {
  project: "프로젝트",
  study: "스터디",
  contest: "공모전",
  mogakco: "모각코",
};

const LEGACY_TEAM_TYPE_MAP: Record<string, TeamType> = {
  project: "project",
  study: "study",
  contest: "contest",
  mogakco: "mogakco",
  general: "project",
  "side-project": "project",
  "Side Project": "project",
  Startup: "project",
  Enterprise: "project",
  Competition: "contest",
  School: "study",
  Personal: "study",
};

export function isTeamType(value: unknown): value is TeamType {
  return typeof value === "string" && value in TEAM_TYPE_LABELS;
}

export function normalizeTeamType(value: string | null | undefined): TeamType {
  if (!value) return "project";
  return LEGACY_TEAM_TYPE_MAP[value] ?? "project";
}

export function getTeamTypeLabel(value: string | null | undefined): string {
  return TEAM_TYPE_LABELS[normalizeTeamType(value)];
}

export function getTeamTypeQueryValues(
  value: string | null | undefined,
): string[] {
  const normalized = normalizeTeamType(value);

  if (normalized === "project") {
    return ["project", "general", "side-project"];
  }

  return [normalized];
}
