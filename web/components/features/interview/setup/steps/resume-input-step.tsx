"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import {
  ResumePreviewPanel,
  type ResumePayloadShape,
} from "./resume-preview-panel";

type SetupTrack = "posting" | "role";

interface ResumeInputStepProps {
  track?: SetupTrack;
}

interface ResumeListItem {
  id: string;
  title: string;
  is_active: boolean;
  updated_at: string;
  source_file_name?: string | null;
  resume_payload: ResumePayloadShape;
}

export function ResumeInputStep({ track = "posting" }: ResumeInputStepProps) {
  const {
    setResumeData,
    setResumePrefillSource,
    setStep,
    resumeData,
  } = useInterviewSetupStore();

  const [activeTab, setActiveTab] = useState<"my" | "file" | "text">("my");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // 내 이력서
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  // PDF
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Text
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResumesLoading(true);
      try {
        const res = await fetch("/api/my/resume", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && json?.success) {
          const items = (json.data?.items ?? []) as ResumeListItem[];
          setResumes(items);
          const active = items.find((r) => r.is_active) ?? items[0];
          setSelectedResumeId(active?.id ?? null);
        }
      } finally {
        if (!cancelled) setResumesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedResume = useMemo(
    () => resumes.find((r) => r.id === selectedResumeId) ?? null,
    [resumes, selectedResumeId],
  );

  const applySelectedResume = useCallback(() => {
    if (!selectedResume) return;
    setResumeData({
      fileName:
        selectedResume.source_file_name ||
        selectedResume.title ||
        "마이페이지 이력서",
      parsedContent: selectedResume.resume_payload as never,
    });
    setResumePrefillSource("user_resume");
    setStep("resume-check");
  }, [selectedResume, setResumeData, setResumePrefillSource, setStep]);

  const handleAnalyzeUpload = async () => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      if (activeTab === "file" && selectedFile) {
        formData.append("file", selectedFile);
      } else if (activeTab === "text" && manualText) {
        formData.append("text", manualText);
      }
      const response = await fetch("/api/interview/parse-resume", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "이력서 분석에 실패했습니다.");
      }
      const result = await response.json();
      if (!result.success)
        throw new Error(result.error || "분석 중 오류가 발생했습니다.");
      setResumeData({
        fileName:
          selectedFile?.name || (manualText ? "직접 입력" : "기존 이력서"),
        parsedContent: result.data,
      });
      setResumePrefillSource(null);
      setStep("resume-check");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "이력서 분석 중 오류가 발생했습니다. 다시 시도해주세요.";
      toast({
        title: "분석 실패",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const canSkip = track === "role";
  const hasExistingData = !!resumeData?.parsedContent;

  const handleSkip = () => {
    setResumePrefillSource(null);
    setStep("final-check");
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {track === "posting"
            ? "면접에 사용할 이력서를 선택하세요"
            : "직무 브리프에 내 경험을 연결할까요?"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {track === "posting"
            ? "마이페이지에서 작성한 이력서를 그대로 사용하거나, PDF·텍스트로 새로 추가할 수 있습니다."
            : "직무 기반 트랙에서는 이 단계가 선택 사항입니다. 경력을 연결하면 꼬리질문이 내 경험 중심으로 확장됩니다."}
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="h-10 w-full justify-start rounded-md border bg-background p-0">
          <TabsTrigger value="my" className="rounded-sm">
            내 이력서
            {resumes.length > 0 && (
              <span className="ml-1.5 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {resumes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="file" className="rounded-sm">
            PDF 업로드
          </TabsTrigger>
          <TabsTrigger value="text" className="rounded-sm">
            직접 입력
          </TabsTrigger>
        </TabsList>

        {/* 내 이력서 — 보기뷰 */}
        <TabsContent value="my" className="mt-4">
          <div className="rounded-md border bg-background">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
              <aside className="overflow-hidden border-b md:border-b-0 md:border-r">
                <div className="border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  이력서 목록
                </div>
                {resumesLoading ? (
                  <div className="p-4 text-xs text-muted-foreground">
                    불러오는 중…
                  </div>
                ) : resumes.length === 0 ? (
                  <div className="flex flex-col gap-3 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      등록된 이력서가 없습니다.
                    </p>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-sm"
                    >
                      <a href="/career/resumes" target="_blank" rel="noreferrer">
                        이력서 작성하러 가기
                        <ArrowUpRight className="ml-1 h-3 w-3" aria-hidden />
                      </a>
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {resumes.map((r) => {
                      const active = r.id === selectedResumeId;
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedResumeId(r.id)}
                            className={cn(
                              "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors",
                              active ? "bg-accent/60" : "hover:bg-muted/60",
                            )}
                            aria-current={active}
                          >
                            <div className="flex w-full items-center gap-1.5">
                              <FileText
                                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                aria-hidden
                              />
                              <span className="truncate font-medium text-foreground">
                                {r.title || "이력서"}
                              </span>
                              {r.is_active && (
                                <span className="ml-auto shrink-0 rounded-sm bg-emerald-50 px-1 py-0 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/60">
                                  활성
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {new Date(r.updated_at).toLocaleDateString("ko-KR")}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>

              <section className="min-w-0 p-4">
                {selectedResume ? (
                  <ResumePreviewPanel
                    payload={selectedResume.resume_payload}
                    title={selectedResume.title}
                    updatedAt={selectedResume.updated_at}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-md border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    좌측에서 이력서를 선택하세요.
                  </div>
                )}
              </section>
            </div>
            {selectedResume && (
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  선택한 이력서가 면접관 AI에 전달됩니다. 면접 진행 중 수정은 영향을 주지 않습니다.
                </p>
                <Button
                  size="sm"
                  className="rounded-sm"
                  onClick={applySelectedResume}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />이 이력서로 진행
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* PDF 업로드 */}
        <TabsContent value="file" className="mt-4">
          <div className="rounded-md border bg-background">
            <div className="border-b bg-muted/40 px-4 py-2.5">
              <h2 className="text-sm font-semibold">PDF 업로드</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                서드파티 양식의 이력서 파일을 올리면 AI가 자동으로 항목별로 분석합니다.
              </p>
            </div>
            <div
              className={cn(
                "relative flex h-60 cursor-pointer flex-col items-center justify-center gap-3 px-6 text-center transition-colors",
                selectedFile
                  ? "bg-primary/5"
                  : "bg-background hover:bg-muted/40",
              )}
              onClick={() => document.getElementById("resume-upload")?.click()}
            >
              <input
                id="resume-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <>
                  <FileText
                    className="h-8 w-8 text-primary"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-sm text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                    >
                      파일 변경
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-sm text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleAnalyzeUpload();
                      }}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
                          분석 중…
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
                          이 파일로 분석 시작
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Upload
                    className="h-8 w-8 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      PDF 파일을 클릭하여 업로드
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      한국어/영문 모두 지원. 텍스트 추출 후 항목 자동 분리.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 직접 입력 */}
        <TabsContent value="text" className="mt-4">
          <div className="rounded-md border bg-background">
            <div className="border-b bg-muted/40 px-4 py-2.5">
              <h2 className="text-sm font-semibold">텍스트로 빠른 입력</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                저장된 이력서 없이 핵심 경력만 빠르게 정리할 때 사용하세요.
              </p>
            </div>
            <div className="p-4">
              <Label className="text-xs">핵심 경력 · 프로젝트 · 기술</Label>
              <Textarea
                placeholder={
                  "예시)\n- 2023~2025 토스 · 백엔드 엔지니어 — 결제 시스템 운영 (Java, Kotlin)\n- 사이드: 학습 기록 SaaS (Next.js, Supabase) — 월 활성 800명"
                }
                className="mt-1.5 min-h-[240px] resize-none rounded-sm text-sm leading-relaxed"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 푸터: 이전 / 스킵 / 다음 */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-sm"
            onClick={() => setStep(track === "posting" ? "jd-check" : "target")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            이전 단계로
          </Button>
          {canSkip && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-sm text-muted-foreground"
              onClick={handleSkip}
            >
              공통 브리프로 진행
            </Button>
          )}
        </div>

        {activeTab !== "my" && (
          <Button
            size="sm"
            className="h-9 rounded-sm"
            onClick={handleAnalyzeUpload}
            disabled={
              isAnalyzing ||
              (activeTab === "file" && !selectedFile && !hasExistingData) ||
              (activeTab === "text" && !manualText.trim())
            }
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />분석 중…
              </>
            ) : (
              <>
                <Sparkles className="mr-1 h-4 w-4" aria-hidden />분석 및 확인
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
