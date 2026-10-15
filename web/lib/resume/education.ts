import { z } from "zod";

export const EDUCATION_STATUS_LABELS = {
  enrolled: "재학",
  expected: "졸업 예정",
  graduated: "졸업",
  leave: "휴학",
  withdrawn: "중퇴",
} as const;

export type EducationStatus = keyof typeof EDUCATION_STATUS_LABELS;

export interface ResumeEducation {
  id: string;
  school: string;
  major: string;
  startDate: string;
  endDate: string;
  status: EducationStatus;
  /** 이력서별 출력 선택. 공통 학력에는 항상 true로 저장한다. */
  included: boolean;
  /** 업로드한 기존 이력서의 연도 단위 기간을 보존한다. */
  period?: string;
}

const monthSchema = z.string().refine(
  (value) => value === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(value),
  "기간은 연도와 월로 입력해 주세요.",
);

export const educationListSchema = z.array(z.object({
  id: z.string().min(1).max(150),
  school: z.string().trim().min(1, "학교명을 입력해 주세요.").max(100),
  major: z.string().trim().max(100),
  startDate: monthSchema,
  endDate: monthSchema,
  status: z.enum(["enrolled", "expected", "graduated", "leave", "withdrawn"]),
  included: z.boolean().default(true),
  period: z.string().max(100).optional(),
})).max(20, "학력은 최대 20개까지 등록할 수 있습니다.").superRefine((items, ctx) => {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    if (ids.has(item.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "id"], message: "중복된 학력 항목입니다." });
    }
    ids.add(item.id);
    if (item.startDate && item.endDate && item.endDate < item.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "endDate"], message: "종료일은 입학일 이후여야 합니다." });
    }
  });
});

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && Boolean(value.trim()))?.trim() || "";
}

function month(value: unknown) {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{4})[.\/-](\d{1,2})(?:[.\/-]\d{1,2})?$/);
  if (!match || +match[2] < 1 || +match[2] > 12) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}`;
}

function legacyId(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return `education-${(hash >>> 0).toString(36)}`;
}

export function normalizeEducation(input: unknown): ResumeEducation[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input.flatMap((value) => {
    const row = record(value);
    const school = text(row.school, row.schoolName, row.institution, row.name);
    if (!school) return [];
    const major = text(row.major, row.department, row.fieldOfStudy);
    const period = text(row.period);
    const periodMonths = period.match(/\d{4}[.\/-]\d{1,2}(?:[.\/-]\d{1,2})?/g) || [];
    const startDate = month(row.startDate ?? row.start_date) || month(periodMonths[0]);
    const endDate = month(row.endDate ?? row.end_date) || month(periodMonths[1]);
    const rawStatus = text(row.status);
    const status = Object.hasOwn(EDUCATION_STATUS_LABELS, rawStatus)
      ? rawStatus as EducationStatus
      : Object.entries(EDUCATION_STATUS_LABELS).find(([, label]) => label === rawStatus)?.[0] as EducationStatus | undefined;
    const id = text(row.id) || legacyId([school, major, startDate, endDate, period].join("|"));
    if (seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      school,
      major,
      startDate,
      endDate,
      status: status || (/현재|재학|present|now/i.test(period) ? "enrolled" : "graduated"),
      included: row.included !== false,
      ...(period ? { period } : {}),
    }];
  });
}

export function formatEducationPeriod(item: ResumeEducation) {
  const start = item.startDate.replace("-", ".");
  const end = item.endDate.replace("-", ".") ||
    (item.status === "enrolled" || item.status === "leave" ? "현재" : "");
  if (!start && !item.endDate) return item.period || "";
  if (!start) return end;
  return end ? `${start} – ${end}` : `${start} –`;
}

export function getVisibleEducation(input: unknown) {
  return normalizeEducation(input)
    .filter((item) => item.included)
    .sort((a, b) => {
      const rank = (item: ResumeEducation) =>
        (item.status === "enrolled" || item.status === "leave") && !item.endDate
          ? "9999-12"
          : item.endDate || item.startDate || item.period || "";
      return rank(b).localeCompare(rank(a)) || b.startDate.localeCompare(a.startDate);
    });
}
