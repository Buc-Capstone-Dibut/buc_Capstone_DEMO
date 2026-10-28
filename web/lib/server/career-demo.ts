import prisma from "@/lib/prisma";
import { getAllCareerDemoEvidence, selectCareerDemoProjects } from "@/lib/career/demo/cover-letter";

/**
 * Map the signed-in user's selected projects onto the prepared evidence. Only the user's own
 * records are read; when nothing matches (or the lookup fails) all three entries are used so the
 * demo never rejects a request.
 */
export async function getCareerDemoProjects(userId: string, projectIds: unknown) {
  if (!Array.isArray(projectIds) || projectIds.length === 0) return getAllCareerDemoEvidence();
  try {
    const profile = await prisma.user_resume_profiles.findUnique({
      where: { user_id: userId }, select: { resume_payload: true },
    });
    const resume = profile ? null : await prisma.user_resumes.findFirst({
      where: { user_id: userId, is_active: true }, select: { resume_payload: true },
    });
    const payload = profile?.resume_payload ?? resume?.resume_payload;
    const timeline = payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload.timeline : [];
    const selected = selectCareerDemoProjects(timeline, projectIds);
    return selected.length ? selected : getAllCareerDemoEvidence();
  } catch (error) {
    console.warn("[career-demo] project lookup failed; using all demo evidence", error);
    return getAllCareerDemoEvidence();
  }
}
