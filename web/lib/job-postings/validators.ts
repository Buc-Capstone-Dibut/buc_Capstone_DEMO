import type { ColorPreset, JobPostingInput } from "./types";

const STATUS = new Set(["active", "applied", "interviewing", "closed", "archived"]);
const KIND = new Set(["deadline", "document_due", "interview", "other"]);
const COLOR_PRESETS = new Set<ColorPreset>([
  "slate", "red", "orange", "amber", "emerald", "sky", "violet", "pink",
]);

function asUuidOrNull(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  // 매우 가벼운 UUID 형태 검증
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  return ok ? v : undefined;
}

function asColorOrNull(v: unknown): ColorPreset | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  return COLOR_PRESETS.has(v as ColorPreset) ? (v as ColorPreset) : undefined;
}

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
      folderId: "folderId" in r ? asUuidOrNull(r.folderId) ?? null : null,
      color: "color" in r ? asColorOrNull(r.color) ?? null : null,
      schedules,
    },
  };
}

export type JobPostingPartialInput = Partial<JobPostingInput> & { isFavorite?: boolean };

/**
 * Partial 업데이트용 validator. 제공된 필드만 검증한다.
 * isFavorite은 별도 필드로 boolean이면 허용.
 * 알 수 없는 필드는 무시.
 */
export function validateJobPostingPartial(
  raw: unknown,
): { ok: true; value: JobPostingPartialInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid payload" };
  const r = raw as Record<string, unknown>;
  const value: JobPostingPartialInput = {};

  if ("companyName" in r) {
    if (typeof r.companyName !== "string") return { ok: false, error: "companyName must be string" };
    const trimmed = r.companyName.trim();
    if (!trimmed) return { ok: false, error: "회사명은 비어 있을 수 없습니다" };
    value.companyName = trimmed;
  }
  if ("roleTitle" in r) {
    if (typeof r.roleTitle !== "string") return { ok: false, error: "roleTitle must be string" };
    const trimmed = r.roleTitle.trim();
    if (!trimmed) return { ok: false, error: "직무명은 비어 있을 수 없습니다" };
    value.roleTitle = trimmed;
  }
  if ("postingUrl" in r) {
    if (r.postingUrl === null) value.postingUrl = null;
    else if (typeof r.postingUrl === "string") value.postingUrl = r.postingUrl;
    else return { ok: false, error: "postingUrl must be string or null" };
  }
  if ("companyDescription" in r) {
    if (r.companyDescription === null) value.companyDescription = null;
    else if (typeof r.companyDescription === "string") value.companyDescription = r.companyDescription;
    else return { ok: false, error: "companyDescription must be string or null" };
  }
  if ("memo" in r) {
    if (r.memo === null) value.memo = null;
    else if (typeof r.memo === "string") value.memo = r.memo;
    else return { ok: false, error: "memo must be string or null" };
  }
  if ("status" in r) {
    if (typeof r.status !== "string" || !STATUS.has(r.status)) {
      return { ok: false, error: "Invalid status" };
    }
    value.status = r.status as JobPostingInput["status"];
  }
  for (const key of ["techStack", "responsibilities", "requirements", "preferred", "teamCulture"] as const) {
    if (key in r) {
      if (!Array.isArray(r[key])) return { ok: false, error: `${key} must be array` };
      value[key] = (r[key] as unknown[]).filter((x): x is string => typeof x === "string");
    }
  }
  if ("isFavorite" in r) {
    if (typeof r.isFavorite !== "boolean") return { ok: false, error: "isFavorite must be boolean" };
    value.isFavorite = r.isFavorite;
  }
  if ("folderId" in r) {
    const f = asUuidOrNull(r.folderId);
    if (f === undefined) return { ok: false, error: "folderId must be uuid or null" };
    value.folderId = f;
  }
  if ("color" in r) {
    const c = asColorOrNull(r.color);
    if (c === undefined) return { ok: false, error: "color must be one of presets or null" };
    value.color = c;
  }
  if ("schedules" in r) {
    if (!Array.isArray(r.schedules)) return { ok: false, error: "schedules must be array" };
    const schedules: NonNullable<JobPostingInput["schedules"]> = [];
    for (const s of r.schedules as Array<Record<string, unknown>>) {
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
    value.schedules = schedules;
  }

  return { ok: true, value };
}
