"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ResumeOption = { id: string; title: string; coverLetters: { title: string }[] };
type PortfolioOption = { id: string; title: string };

export function AttachmentPicker({
  postingId,
  onAdded,
}: {
  postingId: string;
  onAdded: () => void;
}) {
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [coverIdx, setCoverIdx] = useState("");
  const [portfolioId, setPortfolioId] = useState("");

  useEffect(() => {
    (async () => {
      const [rRes, pRes] = await Promise.all([
        fetch("/api/my/resume", { cache: "no-store" }),
        fetch("/api/career/portfolios", { cache: "no-store" }),
      ]);
      const rj = await rRes.json();
      const pj = await pRes.json();
      const items = (rj?.data?.items ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? "이력서",
        coverLetters: Array.isArray(r.resume_payload?.coverLetters)
          ? r.resume_payload.coverLetters.map((c: any) => ({ title: c.title ?? "자기소개서" }))
          : [],
      }));
      setResumes(items);
      setPortfolios((pj?.items ?? []).map((x: any) => ({ id: x.id, title: x.title ?? "포트폴리오" })));
    })();
  }, []);

  const post = async (payload: any) => {
    const res = await fetch(`/api/my/job-postings/${postingId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if ((await res.json()).success) onAdded();
  };

  const selectedResume = resumes.find((r) => r.id === resumeId);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <div className="mb-1 text-sm font-medium">이력서 연결</div>
        <div className="flex gap-2">
          <Select value={resumeId} onValueChange={setResumeId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="이력서 선택" /></SelectTrigger>
            <SelectContent>
              {resumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => resumeId && post({ attachmentType: "resume", resumeId })} disabled={!resumeId}>
            연결
          </Button>
        </div>
      </div>

      {selectedResume && selectedResume.coverLetters.length > 0 && (
        <div>
          <div className="mb-1 text-sm font-medium">자기소개서 연결</div>
          <div className="flex gap-2">
            <Select value={coverIdx} onValueChange={setCoverIdx}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="자소서 선택" /></SelectTrigger>
              <SelectContent>
                {selectedResume.coverLetters.map((c, i) => (
                  <SelectItem key={i} value={String(i)}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => coverIdx && post({
                attachmentType: "cover_letter",
                resumeId,
                coverLetterIndex: Number(coverIdx),
                coverLetterLabel: selectedResume.coverLetters[Number(coverIdx)]?.title ?? null,
              })}
              disabled={!coverIdx}
            >연결</Button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 text-sm font-medium">포트폴리오 연결</div>
        <div className="flex gap-2">
          <Select value={portfolioId} onValueChange={setPortfolioId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="포트폴리오 선택" /></SelectTrigger>
            <SelectContent>
              {portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => portfolioId && post({ attachmentType: "portfolio", portfolioId })} disabled={!portfolioId}>
            연결
          </Button>
        </div>
      </div>
    </div>
  );
}
