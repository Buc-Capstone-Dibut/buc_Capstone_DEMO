import type { ProjectSnapshot } from "../shared/project-snapshot-types";

/**
 * Take the user's full timeline + a list of ids the user selected, and
 * return a deep-cloned subset preserving the user's chosen order. The
 * clone protects callers from later timeline mutations (snapshot semantics).
 *
 * Pure function — no I/O, no `server-only`. Safe to import from tests.
 */
export function pickProjectSnapshotsByIds(
  timeline: ProjectSnapshot[],
  ids: string[],
): ProjectSnapshot[] {
  const byId = new Map<string, ProjectSnapshot>();
  for (const item of timeline) {
    const id = (item as { id?: string })?.id;
    if (typeof id === "string" && id) byId.set(id, item);
  }
  const picked: ProjectSnapshot[] = [];
  for (const id of ids) {
    const found = byId.get(id);
    if (!found) continue;
    picked.push(structuredClone(found));
  }
  return picked;
}

export function normalizeShowcaseSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
