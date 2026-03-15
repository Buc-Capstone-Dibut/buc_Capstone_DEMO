import type { RoleCategoryTemplate, RoleTemplate } from "@/lib/interview/role-taxonomy";
import type { JobData, RolePrepData } from "@/store/interview-setup-store";

const uniqueList = (values: string[], limit: number) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) break;
  }

  return result;
};

const aggregateCategoryValues = (
  category: RoleCategoryTemplate,
  pick: (role: RoleTemplate) => string[],
  limit: number,
) => uniqueList(category.roles.flatMap(pick), limit);

export const getRoleTrackKeywords = (
  category: RoleCategoryTemplate,
  selectedRole: RoleTemplate | undefined,
) => {
  if (selectedRole) return uniqueList(selectedRole.techStack, 6);
  return aggregateCategoryValues(category, (role) => role.techStack, 8);
};

export const getRoleTrackFocusAreas = (
  category: RoleCategoryTemplate,
  selectedRole: RoleTemplate | undefined,
  storedFocusAreas?: string[],
) => {
  if (storedFocusAreas && storedFocusAreas.length > 0) {
    return uniqueList(storedFocusAreas, 4);
  }

  if (selectedRole) return uniqueList(selectedRole.focusAreas, 4);
  return aggregateCategoryValues(category, (role) => role.focusAreas, 4);
};

export const buildRoleTrainingJobData = (
  category: RoleCategoryTemplate,
  selectedRole: RoleTemplate | undefined,
  prep: RolePrepData,
): JobData => {
  const keywords = getRoleTrackKeywords(category, selectedRole);
  const focusAreas = getRoleTrackFocusAreas(category, selectedRole, prep.focusAreas);
  const responsibilities = selectedRole
    ? uniqueList(selectedRole.responsibilities, 5)
    : aggregateCategoryValues(category, (role) => role.responsibilities, 5);
  const requirements = selectedRole
    ? uniqueList(selectedRole.requirements, 5)
    : aggregateCategoryValues(category, (role) => role.requirements, 5);
  const preferred = selectedRole
    ? uniqueList(selectedRole.preferred, 5)
    : aggregateCategoryValues(category, (role) => role.preferred, 5);
  const teamCulture = selectedRole
    ? uniqueList(selectedRole.teamCulture, 4)
    : aggregateCategoryValues(category, (role) => role.teamCulture, 4);

  return {
    role: selectedRole?.label ?? `${category.label} 공통 트랙`,
    company: "직무 기반 모의면접",
    companyDescription: selectedRole
      ? `${selectedRole.label} 직무를 기준으로 질문을 구성합니다.`
      : `${category.label} 범주의 공통 직무 기준으로 질문을 구성합니다.`,
    teamCulture,
    techStack: keywords,
    responsibilities: uniqueList(
      [...responsibilities, `${focusAreas.join(", ")} 관련 판단 근거를 설명하는 질문을 포함합니다.`],
      6,
    ),
    requirements: requirements,
    preferred: uniqueList(
      [...preferred, ...focusAreas.map((area) => `${area} 관련 경험 또는 접근 방식을 설명할 수 있는지 확인`)],
      6,
    ),
  };
};
