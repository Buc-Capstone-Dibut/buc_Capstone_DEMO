import type { JobPostingInput } from "./types";

const STATUS = new Set(["active", "applied", "interviewing", "closed", "archived"]);
const KIND = new Set(["deadline", "document_due", "interview", "other"]);

export function validateJobPostingInput(
  raw: unknown,
): { ok: true; value: JobPostingInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid payload" };
  const r = raw as Record<string, unknown>;
  const companyName = typeof r.companyName === "string" ? r.companyName.trim() : "";
  const roleTitle = typeof r.roleTitle === "string" ? r.roleTitle.trim() : "";
  if (!companyName) return { ok: false, error: "회사명은 필수입니다" };
  if (!roleTitle) return { ok: false, error: "직무명은 필수입니다" };

  const status = (r.status as string | undefined) ?? "active";
  if (!STATUS.has(status)) return { ok: false, error: "Invalid status" };

  const arrField = (key: string) =>
    Array.isArray(r[key])
      ? ((r[key] as unknown[]).filter((x) => typeof x === "string") as string[])
      : [];

  const schedulesRaw = Array.isArray(r.schedules)
    ? (r.schedules as Array<Record<string, unknown>>)
    : [];
  const schedules: NonNullable<JobPostingInput["schedules"]> = [];
  for (const s of schedulesRaw) {
    const kind = s.kind as string;
    if (!KIND.has(kind)) return { ok: false, error: "Invalid schedule kind" };
    if (typeof s.startAt !== "string") return { ok: false, error: "schedule.startAt 필수" };
    schedules.push({
      kind: kind as NonNullable<JobPostingInput["schedules"]>[number]["kind"],
      title: typeof s.title === "string" ? s.title : null,
      startAt: s.startAt,
      endAt: typeof s.endAt === "string" ? s.endAt : null,
      memo: typeof s.memo === "string" ? s.memo : null,
    });
  }

  return {
    ok: true,
    value: {
      companyName,
      roleTitle,
      postingUrl: typeof r.postingUrl === "string" ? r.postingUrl : null,
      techStack: arrField("techStack"),
      responsibilities: arrField("responsibilities"),
      requirements: arrField("requirements"),
      preferred: arrField("preferred"),
      companyDescription: typeof r.companyDescription === "string" ? r.companyDescription : null,
      teamCulture: arrField("teamCulture"),
      memo: typeof r.memo === "string" ? r.memo : null,
      status: status as JobPostingInput["status"],
      schedules,
    },
  };
}
