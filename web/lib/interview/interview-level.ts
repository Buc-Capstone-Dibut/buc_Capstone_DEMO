import type { InterviewLevel, JobData, ResumeData } from "@/store/interview-setup-store";

export const INTERVIEW_LEVEL_OPTIONS: Array<{ value: InterviewLevel; label: string }> = [
  { value: "auto", label: "자동 추천" },
  { value: "new_grad", label: "신입" },
  { value: "junior", label: "주니어" },
  { value: "mid", label: "미들" },
  { value: "senior", label: "시니어" },
];

const YEAR_PATTERN = /(19|20)\d{2}/g;
const PRESENT_PATTERN = /(현재|재직\s*중|present|current|now)/i;
const NEW_GRAD_PATTERN = /(신입|인턴|entry[-\s]?level|new[-\s]?grad)/i;
const SENIOR_PATTERN = /\b(senior|staff|principal|architect|lead|manager|head|director)\b/i;
const MID_PATTERN = /\b(mid|middle)\b/i;
const JUNIOR_PATTERN = /\b(junior|associate)\b/i;

export function normalizeInterviewLevel(level: unknown): InterviewLevel {
  const normalized = String(level || "").trim().toLowerCase().replace(/-/g, "_");
  if (
    normalized === "auto"
    || normalized === "new_grad"
    || normalized === "junior"
    || normalized === "mid"
    || normalized === "senior"
  ) {
    return normalized;
  }
  if (normalized === "newgrad" || normalized === "entry" || normalized === "entry_level") {
    return "new_grad";
  }
  if (normalized === "middle" || normalized === "mid_level") {
    return "mid";
  }
  return "auto";
}

export function interviewLevelLabel(level: InterviewLevel): string {
  return INTERVIEW_LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? "자동 추천";
}

export function recommendInterviewLevel(jobData?: Partial<JobData> | null, resumeData?: ResumeData | null): Exclude<InterviewLevel, "auto"> {
  const jobBlob = [
    jobData?.role,
    jobData?.company,
    jobData?.companyDescription,
    ...(jobData?.requirements || []),
    ...(jobData?.responsibilities || []),
    ...(jobData?.preferred || []),
  ].join(" ");
  const experienceItems = resumeData?.parsedContent?.experience || [];
  const titleBlob = experienceItems.map((item) => item.position || "").join(" ");
  const combined = `${jobBlob} ${titleBlob}`.trim();

  if (NEW_GRAD_PATTERN.test(combined)) return "new_grad";
  if (SENIOR_PATTERN.test(combined)) return "senior";

  const experienceYears = estimateExperienceYears(resumeData);
  if (experienceYears >= 7) return "senior";
  if (experienceYears >= 3) return "mid";
  if (experienceYears >= 1 || experienceItems.length > 0) return "junior";

  if (MID_PATTERN.test(combined)) return "mid";
  if (JUNIOR_PATTERN.test(combined)) return "junior";
  return "new_grad";
}

function estimateExperienceYears(resumeData?: ResumeData | null): number {
  const experiences = resumeData?.parsedContent?.experience || [];
  if (experiences.length === 0) return 0;

  const currentYear = new Date().getFullYear();
  return experiences.reduce((total, experience) => {
    const period = experience.period || "";
    const yearMatches = Array.from(period.matchAll(YEAR_PATTERN)).map((match) => Number(match[0]));
    if (yearMatches.length >= 2) {
      return total + Math.max(0, yearMatches[1] - yearMatches[0]);
    }
    if (yearMatches.length === 1) {
      const endYear = PRESENT_PATTERN.test(period) ? currentYear : yearMatches[0] + 1;
      return total + Math.max(0, endYear - yearMatches[0]);
    }
    return total + 1;
  }, 0);
}
