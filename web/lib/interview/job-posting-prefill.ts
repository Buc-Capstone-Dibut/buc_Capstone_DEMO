import type { JobPostingInterviewPrefill } from "@/store/interview-setup-store";

export async function fetchJobPostingPrefill(
  postingId: string,
): Promise<JobPostingInterviewPrefill> {
  const response = await fetch(
    `/api/my/job-postings/${encodeURIComponent(postingId)}/interview-prefill`,
    { cache: "no-store" },
  );
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success || !json.data?.jobData) {
    throw new Error(json?.error || "채용공고를 불러오지 못했습니다.");
  }
  return json.data;
}
