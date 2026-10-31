export const isGoogleTranscriptProvider = (provider?: string) =>
  (provider || "").toLowerCase().includes("google-cloud-stt");

export function preferLongerCaption(current: string, candidate: string): string {
  const normalizedCurrent = (current || "").trim();
  const normalizedCandidate = (candidate || "").trim();

  if (!normalizedCurrent) return normalizedCandidate;
  if (!normalizedCandidate) return normalizedCurrent;
  if (normalizedCandidate.startsWith(normalizedCurrent)) return normalizedCandidate;
  if (normalizedCurrent.startsWith(normalizedCandidate)) return normalizedCurrent;

  const compactCurrent = normalizedCurrent.replace(/\s+/g, "");
  const compactCandidate = normalizedCandidate.replace(/\s+/g, "");
  return compactCandidate.length >= compactCurrent.length ? normalizedCandidate : normalizedCurrent;
}

export function selectUserCaptionText(current: string, candidate: string, provider?: string): string {
  // Cloud STT sends a complete snapshot, including revisions of the interim tail.
  // Keeping the longest previous snapshot would hide shorter corrections.
  if (isGoogleTranscriptProvider(provider)) return candidate.trim() || current.trim();
  return preferLongerCaption(current, candidate);
}
