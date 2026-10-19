import prisma from "@/lib/prisma";
import { isCareerDemoJobUrl } from "@/lib/career/demo/job-posting";
import { selectCareerDemoProjects } from "@/lib/career/demo/cover-letter";

/** Resolve only the signed-in user's selected records; client text cannot select another user's data. */
export async function getCareerDemoProjects(userId: string, postingId: unknown, projectIds: unknown) {
  if (typeof postingId !== "string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(postingId)) return null;
  const posting = await prisma.user_job_postings.findFirst({
    where: { id: postingId, user_id: userId },
    select: { posting_url: true },
  });
  if (!posting || !isCareerDemoJobUrl(posting.posting_url)) return null;

  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId }, select: { resume_payload: true },
  });
  const resume = profile ? null : await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true }, select: { resume_payload: true },
  });
  const payload = profile?.resume_payload ?? resume?.resume_payload;
  const timeline = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload.timeline : [];
  return selectCareerDemoProjects(timeline, projectIds);
}
