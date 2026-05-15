import type { ImportSourceAdapter, JobPostingDraft } from "./types";

type Row = {
  id: string;
  title?: string | null;
  source_file_name?: string | null;
  resume_payload?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const arr = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return arr.length > 0 ? arr : null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function pickStringArray(record: Record<string, unknown>, keys: string[]): string[] | undefined {
  for (const key of keys) {
    const arr = asStringArray(record[key]);
    if (arr) return arr;
  }
  return undefined;
}

export const resumeAdapter: ImportSourceAdapter<Row> = {
  key: "resume",
  extractSuggestion(row: Row): JobPostingDraft {
    const draft: JobPostingDraft = {};
    const payload = asRecord(row.resume_payload);
    if (!payload) {
      return appendMemo(draft, row);
    }

    // experience 배열 (가장 최근 또는 첫 항목)
    const experienceArr = Array.isArray(payload.experience)
      ? (payload.experience as unknown[])
      : Array.isArray(payload.experiences)
        ? (payload.experiences as unknown[])
        : [];

    let firstExperience: Record<string, unknown> | null = null;
    for (const item of experienceArr) {
      const rec = asRecord(item);
      if (rec) {
        firstExperience = rec;
        break;
      }
    }

    if (firstExperience) {
      const company = pickString(firstExperience, ["companyName", "company", "organization", "employer"]);
      if (company) draft.companyName = company;
      const role = pickString(firstExperience, ["role", "title", "position", "roleTitle", "jobTitle"]);
      if (role) draft.roleTitle = role;
      const responsibilities = pickStringArray(firstExperience, [
        "responsibilities",
        "bullets",
        "achievements",
        "tasks",
      ]);
      if (responsibilities) draft.responsibilities = responsibilities;
    }

    // skills / techStack (payload 최상위)
    const techStack = pickStringArray(payload, ["techStack", "skills", "stack", "technologies"]);
    if (techStack) draft.techStack = techStack;

    return appendMemo(draft, row);
  },
};

function appendMemo(draft: JobPostingDraft, row: Row): JobPostingDraft {
  const payload = asRecord(row.resume_payload);
  const payloadTitle = payload ? pickString(payload, ["title", "headline"]) : undefined;
  const label = payloadTitle || row.title || row.source_file_name;
  if (label) {
    draft.memo = `기반 이력서: ${label}`;
  }
  return draft;
}
