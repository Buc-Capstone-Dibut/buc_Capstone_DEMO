import type { ResumePayload } from "./profile-types";

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input === "object" && input !== null) {
    return input as Record<string, unknown>;
  }
  return {};
}

export const EMPTY_RESUME: ResumePayload = {
  personalInfo: { name: "", email: "", phone: "", intro: "", links: {} },
  education: [],
  experience: [],
  skills: [],
  selfIntroduction: "",
  projects: [],
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function normalizeResumePayload(input: unknown): ResumePayload {
  if (!input) return EMPTY_RESUME;

  const rp = asRecord(input);
  const personalInfo = asRecord(rp.personalInfo);
  const skillsRaw = Array.isArray(rp.skills) ? rp.skills : [];
  const experienceRaw = Array.isArray(rp.experience) ? rp.experience : [];
  const projectsRaw = Array.isArray(rp.projects) ? rp.projects : [];

  return {
    personalInfo: {
      name: typeof personalInfo.name === "string" ? personalInfo.name : "",
      email: typeof personalInfo.email === "string" ? personalInfo.email : "",
      phone: typeof personalInfo.phone === "string" ? personalInfo.phone : "",
      intro: typeof personalInfo.intro === "string" ? personalInfo.intro : "",
      links: asRecord(personalInfo.links) as ResumePayload["personalInfo"]["links"],
    },
    education: Array.isArray(rp.education) ? rp.education : [],
    experience: experienceRaw.map((item) => {
      const row = asRecord(item);
      return {
        id: typeof row.id === "string" ? row.id : Math.random().toString(36).substring(2, 11),
        company: typeof row.company === "string" ? row.company : "",
        position: typeof row.position === "string" ? row.position : "",
        period: typeof row.period === "string" ? row.period : "",
        description: typeof row.description === "string" ? row.description : "",
      };
    }),
    skills: skillsRaw.map((item) => {
      if (typeof item === "string") {
        return { name: item, level: "Intermediate" };
      }
      const row = asRecord(item);
      return {
        name: typeof row.name === "string" ? row.name : "",
        level: typeof row.level === "string" ? row.level : "Intermediate",
        category: typeof row.category === "string" ? row.category : undefined,
      };
    }),
    selfIntroduction: typeof rp.selfIntroduction === "string" ? rp.selfIntroduction : "",
    projects: projectsRaw.map((item) => {
      const row = asRecord(item);
      return {
        id: typeof row.id === "string" ? row.id : Math.random().toString(36).substring(2, 11),
        name: typeof row.name === "string" ? row.name : "",
        period: typeof row.period === "string" ? row.period : "",
        description: typeof row.description === "string" ? row.description : "",
        techStack: Array.isArray(row.techStack)
          ? row.techStack.filter((value): value is string => typeof value === "string")
          : [],
        achievements: Array.isArray(row.achievements)
          ? row.achievements.filter((value): value is string => typeof value === "string")
          : [],
      };
    }),
    coverLetters: Array.isArray(rp.coverLetters) ? rp.coverLetters : [],
  };
}
