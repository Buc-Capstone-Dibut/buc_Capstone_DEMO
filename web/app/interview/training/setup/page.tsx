"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Github,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TechLogoChip } from "@/components/features/interview/tech-logo-chip";
import {
  getPortfolioTopicLabel,
  isPublicGithubRepoUrl,
  normalizeGithubRepoUrl,
  PORTFOLIO_DEFENSE_DURATION_MINUTES,
  PORTFOLIO_SETUP_STEPS,
  type PortfolioAnalysisResult,
  type PortfolioSetupStep,
} from "@/lib/interview/portfolio-defense";
import {
  buildInterviewTypePayload,
  resolveInterviewTypeVisual,
} from "@/lib/interview/interview-type-visuals";
import { cn } from "@/lib/utils";
import { usePortfolioDefenseSetupStore } from "@/store/portfolio-defense-setup-store";

const ANALYZE_STEPS = ["README 분석", "파일 구조 확인", "디펜스 토픽 감지"] as const;

const DEFENSE_RUBRIC = [
  { label: "설계 의도 설명", weight: 60, description: "구조 선택 이유와 버린 대안을 설명합니다." },
  { label: "코드 품질", weight: 10, description: "유지보수성, 테스트, 장애 대응 관점을 확인합니다." },
  { label: "AI 활용", weight: 30, description: "생성보다 검증·롤백 루프를 말할 수 있는지 봅니다." },
] as const;

function getStepIndex(step: PortfolioSetupStep) {
  return PORTFOLIO_SETUP_STEPS.findIndex((item) => item.id === step);
}

export default function PortfolioDefenseSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentStep, repoUrl, analysis, setStep, setRepoUrl, setAnalysis, setSessionId, reset } =
    usePortfolioDefenseSetupStore();
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);

  useEffect(() => {
    const initialRepoUrl = searchParams.get("repoUrl");
    if (initialRepoUrl) {
      setRepoUrl(initialRepoUrl);
      setStep("repo");
      setAnalysis(null);
    }
  }, [searchParams, setAnalysis, setRepoUrl, setStep]);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalyzeStep(0);
      return;
    }
    setAnalyzeStep(1);
    const t1 = window.setTimeout(() => setAnalyzeStep(2), 4000);
    const t2 = window.setTimeout(() => setAnalyzeStep(3), 9000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isAnalyzing]);

  const normalizedRepoUrl = normalizeGithubRepoUrl(repoUrl);
  const activeStepIndex = Math.max(0, getStepIndex(currentStep));

  const analyze = async () => {
    if (!isPublicGithubRepoUrl(normalizedRepoUrl)) {
      setError("공개 GitHub 레포 URL 형식만 지원합니다. 예: https://github.com/owner/repo");
      return;
    }

    setError(null);
    setAnalysis(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/interview/portfolio/analyze-public-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: normalizedRepoUrl }),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      if (!data.success) {
        const messageByCode: Record<string, string> = {
          PUBLIC_REPO_ONLY: "비공개 레포 또는 접근 불가한 레포입니다. 공개 레포 URL을 사용해주세요.",
          GITHUB_RATE_LIMIT: "GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
          GITHUB_AUTH_ERROR: "서버의 GitHub 토큰 인증에 실패했습니다. GITHUB_TOKEN 값을 확인해주세요.",
          GITHUB_FORBIDDEN: "GitHub API 접근이 거부되었습니다. 토큰 권한을 확인해주세요.",
          GITHUB_API_ERROR: "GitHub API 호출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        };
        setError(messageByCode[data.error] || data.error || "레포 분석에 실패했습니다.");
        return;
      }

      setRepoUrl(normalizedRepoUrl);
      setAnalysis(data.data as PortfolioAnalysisResult);
      setStep("analysis");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "네트워크 오류로 레포 분석에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startDefense = async () => {
    if (!analysis || isStarting) return;

    setError(null);
    setIsStarting(true);
    try {
      const interviewTypeVisual = resolveInterviewTypeVisual({
        sessionType: "portfolio_defense",
        repoUrl: normalizedRepoUrl,
        detectedTopics: analysis.detectedTopics,
        jobData: {
          repoUrl: normalizedRepoUrl,
          readmeSummary: analysis.readmeSummary,
          treeSummary: analysis.treeSummary,
          detectedTopics: analysis.detectedTopics,
        },
      });
      const interviewTypePayload = buildInterviewTypePayload(interviewTypeVisual);
      const focus = Array.from(new Set([
        "architecture",
        "infra",
        "ai-usage",
        ...interviewTypePayload.questionFocus,
      ])).slice(0, 8);
      const res = await fetch("/api/interview/portfolio/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: normalizedRepoUrl,
          mode: "video",
          targetDurationSec: PORTFOLIO_DEFENSE_DURATION_MINUTES * 60,
          closingThresholdSec: 60,
          focus,
          ...interviewTypePayload,
          readmeSummary: analysis.readmeSummary,
          treeSummary: analysis.treeSummary,
          infraHypotheses: analysis.infraHypotheses,
          detectedTopics: analysis.detectedTopics,
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (!data.success) {
        setError(data.error || "세션 시작에 실패했습니다.");
        return;
      }

      const sessionId = data.data.sessionId;
      setSessionId(sessionId);
      const params = new URLSearchParams({
        repoUrl: normalizedRepoUrl,
        sessionId,
        mode: "video",
        duration: String(PORTFOLIO_DEFENSE_DURATION_MINUTES),
        readmeSummary: analysis.readmeSummary,
        treeSummary: analysis.treeSummary,
        detectedTopics: analysis.detectedTopics.join(","),
        infraHypotheses: analysis.infraHypotheses.join(","),
      });

      router.push(`/interview/training/portfolio/room?${params.toString()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "세션 시작에 실패했습니다.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8fb] text-[#172033]">
      <main className="mx-auto w-full max-w-6xl px-6 py-8 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" className="h-11 rounded-xl border-[#dfe7ef] bg-white font-bold" onClick={() => router.push("/interview/training")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            훈련 센터
          </Button>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe1c1] bg-[#f3faef] px-3 py-1 text-xs font-black text-[#5f8f36]">
            <Clock3 className="h-3.5 w-3.5" />
            10분 화상 디펜스 고정
          </div>
        </div>

        <section className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe1c1] bg-[#f3faef] px-3 py-1 text-xs font-bold text-[#5f8f36]">
            <Github className="h-3.5 w-3.5" />
            Portfolio Defense Setup
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tight md:text-4xl">포트폴리오 디펜스 셋업</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[#5f6b7a]">
            레포 입력, 구조 분석, 디펜스 브리프 확인을 분리해 실제 면접 전 준비 흐름을 명확히 만듭니다.
          </p>
        </section>

        <section className="relative mt-10 overflow-hidden border-y border-[#dfe7ef] py-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,rgba(124,173,70,0.14),transparent_30%),radial-gradient(circle_at_18%_35%,rgba(86,154,183,0.10),transparent_32%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-[#8a96a6]">
                <span className="h-px flex-1 bg-[#dfe7ef]" />
                Setup Flow
                <span className="h-px flex-1 bg-[#dfe7ef]" />
              </div>
              <div className="grid gap-0 sm:grid-cols-3">
              {PORTFOLIO_SETUP_STEPS.map((step, index) => {
                const isCurrent = step.id === currentStep;
                const isDone = index < activeStepIndex || (step.id === "analysis" && Boolean(analysis));
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (step.id === "repo") setStep("repo");
                      if (step.id === "analysis" && analysis) setStep("analysis");
                      if (step.id === "brief" && analysis) setStep("brief");
                    }}
                    className={cn(
                      "group relative flex items-center gap-3 py-4 pr-5 text-left transition-all",
                      isCurrent
                        ? "text-[#172033]"
                        : "text-[#6d7888] hover:text-[#172033]",
                    )}
                  >
                    <span
                      className={cn(
                        "relative z-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] transition-all",
                        isCurrent
                          ? "bg-transparent"
                          : "bg-transparent opacity-75 group-hover:opacity-100",
                      )}
                    >
                      <Image src={step.icon} alt="" width={72} height={72} className="h-14 w-14 object-contain" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-black">
                        {isDone ? <CheckCircle2 className="h-4 w-4 text-[#7cad46]" /> : `${index + 1}`}
                        {step.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#6d7888]">{step.description}</span>
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
            <div className="relative hidden h-64 lg:block">
              <div className="absolute inset-x-4 bottom-6 h-16 rounded-full bg-[#172033]/[0.10] blur-3xl" />
              <Image
                src="/images/interview/setup/hero/portfolio-training-hero.png"
                alt="포트폴리오 디펜스 셋업"
                width={760}
                height={460}
                priority
                className="relative z-10 h-full w-full object-contain drop-shadow-[0_30px_28px_rgba(23,32,51,0.14)]"
              />
            </div>
          </div>

          {error ? (
            <div className="relative mt-6 flex items-start gap-2 border-l-4 border-red-300 bg-red-50/80 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}
        </section>

          {currentStep === "repo" ? (
            <section className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <div>
                  <p className="text-2xl font-black tracking-tight">공개 GitHub 레포 URL</p>
                  <p className="mt-2 text-sm text-[#6d7888]">분석 가능한 공개 레포만 지원합니다. Private repo는 제외합니다.</p>
                </div>
                <div className="flex flex-col gap-4 border-b border-[#dfe7ef] pb-7 sm:flex-row">
                  <Input
                    value={repoUrl}
                    onChange={(event) => {
                      setRepoUrl(event.target.value);
                      setAnalysis(null);
                      setError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !isAnalyzing) void analyze();
                    }}
                    placeholder="https://github.com/owner/repo"
                    className="h-16 flex-1 rounded-none border-0 border-b border-[#cfd9e4] bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"
                  />
                  <Button
                    className="h-14 rounded-full bg-[#7cad46] px-8 font-bold hover:bg-[#6f9f3b]"
                    disabled={isAnalyzing || !repoUrl.trim()}
                    onClick={() => void analyze()}
                  >
                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    {isAnalyzing ? "분석 중..." : "구조 분석"}
                  </Button>
                </div>
              </div>

              <aside className="border-l border-[#dfe7ef] pl-6">
                <p className="font-black">분석 중 확인하는 것</p>
                <div className="mt-5 space-y-5">
                  {ANALYZE_STEPS.map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-black", isAnalyzing && analyzeStep >= index + 1 ? "bg-[#7cad46] text-white" : "bg-[#edf2f7] text-[#6d7888]")}>
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-[#4f5b6b]">{step}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </section>
          ) : null}

          {currentStep === "analysis" && analysis ? (
            <section className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-2xl font-black tracking-tight">레포 구조 분석 결과</p>
                    <p className="mt-2 break-all text-sm text-[#6d7888]">{normalizedRepoUrl}</p>
                  </div>
                  <Button variant="ghost" className="rounded-full font-bold text-[#5f6b7a]" onClick={() => setStep("repo")}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    다시 입력
                  </Button>
                </div>

                <div className="grid gap-8 border-y border-[#dfe7ef] py-6 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-black">README 요약</p>
                    <p className="mt-3 text-sm leading-7 text-[#5f6b7a]">{analysis.readmeSummary}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black">구조 특징</p>
                    <p className="mt-3 text-sm leading-7 text-[#5f6b7a]">{analysis.treeSummary}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black">감지된 디펜스 토픽</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(analysis.detectedTopics.length > 0 ? analysis.detectedTopics : ["architecture", "ai-usage"]).map((topic) => (
                      <TechLogoChip key={topic} label={getPortfolioTopicLabel(topic)} className="border-[#cfe1c1] bg-[#f3faef] text-[#5f8f36]" />
                    ))}
                  </div>
                </div>
              </div>

              <aside className="border-l border-[#dfe7ef] pl-6">
                <ShieldCheck className="h-5 w-5 text-[#7cad46]" />
                <p className="mt-3 font-black">인프라/운영 가설</p>
                <div className="mt-4 space-y-4">
                  {(analysis.infraHypotheses.length > 0 ? analysis.infraHypotheses : ["배포, 모니터링, 장애 대응 질문을 중심으로 확인합니다."]).map((item, index) => (
                    <p key={`${item}-${index}`} className="border-b border-[#e6edf4] pb-4 text-sm leading-6 text-[#5f6b7a] last:border-0">
                      {item}
                    </p>
                  ))}
                </div>
                <Button className="mt-5 h-12 w-full rounded-full bg-[#7cad46] font-bold hover:bg-[#6f9f3b]" onClick={() => setStep("brief")}>
                  브리프 확인
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </aside>
            </section>
          ) : null}

          {currentStep === "brief" && analysis ? (
            <section className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-7">
                <div>
                  <p className="text-2xl font-black tracking-tight">디펜스 브리프 최종 확인</p>
                  <p className="mt-2 text-sm text-[#6d7888]">이 기준으로 10분 화상 디펜스를 시작합니다.</p>
                </div>
                <div className="grid gap-5 border-y border-[#dfe7ef] py-6 md:grid-cols-3">
                  {DEFENSE_RUBRIC.map((item) => (
                    <div key={item.label}>
                      <p className="text-sm font-black text-[#172033]">{item.label}</p>
                      <p className="mt-2 text-2xl font-black text-[#7cad46]">{item.weight}%</p>
                      <p className="mt-2 text-xs leading-5 text-[#6d7888]">{item.description}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-black">면접관이 먼저 물어볼 가능성이 높은 것</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {["왜 이 구조를 선택했나요?", "대안은 무엇이었나요?", "AI 결과를 어떻게 검증했나요?"].map((item) => (
                      <p key={item} className="border-l-2 border-[#b8dca1] pl-3 text-sm font-bold leading-6 text-[#4f5b6b]">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="border-l border-[#dfe7ef] pl-6">
                <div className="relative mx-auto h-36 w-36">
                  <div className="absolute inset-4 rounded-full bg-[#dceecf] blur-2xl" />
                  <Image
                    src="/images/interview/setup/flow-icons/portfolio-flow-video-defense.png"
                    alt=""
                    width={180}
                    height={180}
                    className="relative h-full w-full object-contain"
                  />
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="border-b border-[#e6edf4] pb-3">
                    <p className="font-black">대상 레포</p>
                    <p className="mt-1 break-all text-[#6d7888]">{normalizedRepoUrl}</p>
                  </div>
                  <div className="border-b border-[#e6edf4] pb-3">
                    <p className="font-black">진행 방식</p>
                    <p className="mt-1 text-[#6d7888]">화상 디펜스 · {PORTFOLIO_DEFENSE_DURATION_MINUTES}분</p>
                  </div>
                </div>
                <Button
                  className="mt-5 h-12 w-full rounded-full bg-[#7cad46] font-bold hover:bg-[#6f9f3b]"
                  disabled={isStarting}
                  onClick={() => void startDefense()}
                >
                  {isStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {isStarting ? "면접 준비 중..." : "10분 화상 디펜스 시작"}
                </Button>
              </aside>
            </section>
          ) : null}

        <div className="mt-5 flex justify-end">
          <Button
            variant="ghost"
            className="text-[#6d7888]"
            onClick={() => {
              reset();
              setError(null);
            }}
          >
            셋업 초기화
          </Button>
        </div>
      </main>
    </div>
  );
}
