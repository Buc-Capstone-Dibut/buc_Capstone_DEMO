import type { ExperienceInput } from "@/app/career/experiences/actions";
import type { ExperienceTimelineSnapshotItem } from "./experience-timeline.types";

export const MAX_WIZARD_EXPERIENCES = 6;

function getDateString(periodStr?: string) {
  if (!periodStr) return "0000.00";
  const startPart = periodStr.split("~")[0].trim();
  const match = startPart.match(/(\d{4})[:./-](\d{1,2})/);
  if (match) {
    return `${match[1]}.${match[2].padStart(2, "0")}`;
  }
  return "0000.00";
}

export function sortExperiencesByPeriodDesc(experiences: ExperienceInput[]) {
  return [...experiences].sort((a, b) => {
    const dateA = getDateString(a.period);
    const dateB = getDateString(b.period);
    return dateB.localeCompare(dateA);
  });
}

export function clipExperienceText(value?: string, max = 500) {
  if (!value) return "미입력";
  const normalized = value.trim();
  if (!normalized) return "미입력";
  return normalized.slice(0, max);
}

export function buildExperienceContextString(experiences: ExperienceInput[]) {
  return experiences
    .map(
      (experience) => `
[경험 제목: ${experience.company}]
진행 기간: ${clipExperienceText(experience.period, 80)}
요약: ${clipExperienceText(experience.description, 240)}
태그: ${experience.tags?.join(", ") || "없음"}
상황(Situation): ${clipExperienceText(experience.situation, 500)}
역할(Role): ${clipExperienceText(experience.role, 320)}
행동(Solution): ${clipExperienceText(experience.solution, 500)}
어려움(Difficulty): ${clipExperienceText(experience.difficulty, 320)}
결과(Result): ${clipExperienceText(experience.result, 500)}
배운점(Lesson): ${clipExperienceText(experience.lesson, 320)}
      `.trim(),
    )
    .join("\n\n---\n\n");
}

export function buildExperienceSnapshot(
  experiences: ExperienceInput[],
): ExperienceTimelineSnapshotItem[] {
  return experiences.map((experience) => ({
    id: experience.id || crypto.randomUUID(),
    title: experience.company || "제목 없음",
    tags: experience.tags || [],
    period: clipExperienceText(experience.period, 80),
    description: clipExperienceText(experience.description, 240),
    situation: clipExperienceText(experience.situation, 500),
    role: clipExperienceText(experience.role, 320),
    solution: clipExperienceText(experience.solution, 500),
    difficulty: clipExperienceText(experience.difficulty, 320),
    result: clipExperienceText(experience.result, 500),
    lesson: clipExperienceText(experience.lesson, 320),
  }));
}

export function buildMinimalExperienceSnapshot(
  experiences: ExperienceInput[],
): ExperienceTimelineSnapshotItem[] {
  return experiences.map((experience) => ({
    id: experience.id || crypto.randomUUID(),
    title: experience.company || "제목 없음",
    tags: experience.tags || [],
  }));
}
