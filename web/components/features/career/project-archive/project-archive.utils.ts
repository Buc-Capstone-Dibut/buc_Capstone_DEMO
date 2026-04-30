import type { ProjectInput } from "@/app/career/projects/types";
import type { ProjectArchiveSnapshotItem } from "./project-archive.types";

export const MAX_WIZARD_PROJECTS = 6;

function getDateString(periodStr?: string) {
  if (!periodStr) return "0000.00";
  const startPart = periodStr.split("~")[0].trim();
  const match = startPart.match(/(\d{4})[:./-](\d{1,2})/);
  if (match) {
    return `${match[1]}.${match[2].padStart(2, "0")}`;
  }
  return "0000.00";
}

export function sortProjectsByPeriodDesc(projects: ProjectInput[]) {
  return [...projects].sort((a, b) => {
    const dateA = getDateString(a.period);
    const dateB = getDateString(b.period);
    return dateB.localeCompare(dateA);
  });
}

export function clipProjectText(value?: string, max = 500) {
  if (!value) return "미입력";
  const normalized = value.trim();
  if (!normalized) return "미입력";
  return normalized.slice(0, max);
}

export function buildProjectContextString(projects: ProjectInput[]) {
  return projects
    .map(
      (project) => `
[프로젝트명: ${project.company}]
진행 기간: ${clipProjectText(project.period, 80)}
요약: ${clipProjectText(project.description, 240)}
태그: ${project.tags?.join(", ") || "없음"}
기술 스택: ${project.techStack?.join(", ") || "없음"}
배경(Situation): ${clipProjectText(project.situation, 500)}
역할(Role): ${clipProjectText(project.role, 320)}
실행(Solution): ${clipProjectText(project.solution, 500)}
어려움(Difficulty): ${clipProjectText(project.difficulty, 320)}
결과(Result): ${clipProjectText(project.result, 500)}
배운점(Lesson): ${clipProjectText(project.lesson, 320)}
      `.trim(),
    )
    .join("\n\n---\n\n");
}

export function buildProjectSnapshot(
  projects: ProjectInput[],
): ProjectArchiveSnapshotItem[] {
  return projects.map((project) => ({
    id: project.id || crypto.randomUUID(),
    title: project.company || "제목 없음",
    tags: project.tags || [],
    techStack: project.techStack || [],
    period: clipProjectText(project.period, 80),
    description: clipProjectText(project.description, 240),
    situation: clipProjectText(project.situation, 500),
    role: clipProjectText(project.role, 320),
    solution: clipProjectText(project.solution, 500),
    difficulty: clipProjectText(project.difficulty, 320),
    result: clipProjectText(project.result, 500),
    lesson: clipProjectText(project.lesson, 320),
  }));
}

export function buildMinimalProjectSnapshot(
  projects: ProjectInput[],
): ProjectArchiveSnapshotItem[] {
  return projects.map((project) => ({
    id: project.id || crypto.randomUUID(),
    title: project.company || "제목 없음",
    tags: project.tags || [],
    techStack: project.techStack || [],
  }));
}
