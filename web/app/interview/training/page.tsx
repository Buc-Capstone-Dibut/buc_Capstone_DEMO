"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, Clock3, Github, Loader2, Sparkles, Video } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { PORTFOLIO_DEFENSE_DURATION_MINUTES, PORTFOLIO_SETUP_STEPS } from "@/lib/interview/portfolio-defense";

const RUBRIC_HELP = [
  {
    label: "설계 의도 설명",
    weight: 60,
    hint: "왜 이런 구조를 선택했는지, 대안과 트레이드오프를 설명하는 질문이 중심입니다.",
    sampleQuestion: "이 구조를 선택한 이유와 버린 대안 2개를 비교해서 설명해 주세요.",
  },
  {
    label: "코드 품질",
    weight: 10,
    hint: "유지보수성, 테스트, 장애 대응 가능성을 근거로 묻습니다.",
    sampleQuestion: "기술부채를 줄이기 위해 가장 먼저 손댈 지점은 어디인가요?",
  },
  {
    label: "AI 활용",
    weight: 30,
    hint: "AI를 어떻게 썼는지보다 검증/롤백 루프를 갖췄는지에 집중합니다.",
    sampleQuestion: "AI 결과를 운영에 반영하기 전에 어떤 검증 단계를 거치나요?",
  },
];

interface SessionSummary {
  id: string;
  sessionType: string;
  mode: string;
  status: string;
  repoUrl?: string;
  createdAt: number;
  analysis: {
    improvements?: string[];
    totalWeightedScore?: number;
  } | null;
}

function formatDate(ts: number): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export default function InterviewTrainingPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/interview/sessions?session_type=portfolio_defense&limit=4");
        const data = await res.json();
        if (data.success) {
          setSessions(data.data || []);
        }
      } catch {
        // Empty state is the intended fallback when the local AI backend is unavailable.
      } finally {
        setLoadingSessions(false);
      }
    };
    void fetchSessions();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f8fb]">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 md:py-10">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe1c1] bg-[#f3faef] px-3 py-1 text-xs font-bold text-[#5f8f36]">
              <Github className="h-3.5 w-3.5" />
              Portfolio Defense
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-[#172033] md:text-5xl">
              포트폴리오 디펜스 훈련 센터
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#5f6b7a]">
              공개 레포 기반 디펜스 훈련을 시작하고, 완료한 리포트와 반복 기록을 한 곳에서 확인합니다.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 rounded-xl bg-[#7cad46] px-7 font-bold hover:bg-[#6f9f3b]"
                onClick={() => router.push("/interview/training/setup")}
              >
                새 디펜스 셋업 시작
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-xl border-[#dfe7ef] bg-white px-7 font-bold text-[#4f5b6b]"
                onClick={() => router.push("/interview/analysis")}
              >
                내 면접 기록 보기
              </Button>
            </div>
          </div>

          <div className="relative hidden h-72 lg:block">
            <div className="absolute inset-x-10 bottom-6 h-16 rounded-full bg-[#172033]/[0.08] blur-2xl" />
            <Image
              src="/images/interview/setup/hero/portfolio-training-hero.png"
              alt="포트폴리오 디펜스 훈련"
              width={760}
              height={460}
              priority
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_26px_24px_rgba(23,32,51,0.14)]"
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
          <div className="overflow-hidden rounded-[30px] border border-[#dfe7ef] bg-white shadow-sm">
            <div className="border-b border-[#e6edf4] bg-[#fbfcfe] px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#172033]">셋업 플로우</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6d7888]">
                    레포 입력, 구조 분석, 브리프 확인을 단계별로 분리했습니다.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#edf6e6] px-3 py-1 text-xs font-black text-[#6f9f3b]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {PORTFOLIO_DEFENSE_DURATION_MINUTES}분 고정
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              {PORTFOLIO_SETUP_STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4 rounded-2xl border border-[#dfe7ef] bg-[#fbfcfe] px-4 py-4">
                  <Image src={step.icon} alt="" width={72} height={72} className="h-14 w-14 shrink-0 object-contain" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#7cad46]">0{index + 1}</p>
                    <p className="mt-1 font-black text-[#172033]">{step.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#6d7888]">{step.description}</p>
                  </div>
                </div>
              ))}

              <Button
                className="h-12 w-full rounded-xl bg-[#7cad46] text-base font-bold hover:bg-[#6f9f3b]"
                onClick={() => router.push("/interview/training/setup")}
              >
                셋업 화면으로 이동 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-[#dfe7ef] bg-white shadow-sm">
            <div className="border-b border-[#e6edf4] bg-[#fbfcfe] px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#172033]">최근 디펜스 허브</h2>
                  <p className="mt-1 text-sm text-[#6d7888]">완료한 디펜스 기록과 리포트를 바로 확인합니다.</p>
                </div>
                <Sparkles className="h-5 w-5 text-[#7cad46]" />
              </div>
            </div>
            <div className="px-6 py-6">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#8a96a6]" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#dfe7ef] bg-[#fbfcfe] py-10 text-center text-sm text-[#6d7888]">
                  아직 포트폴리오 디펜스 세션이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className="w-full rounded-2xl border border-[#dfe7ef] bg-[#fbfcfe] p-4 text-left transition-colors hover:bg-white"
                      onClick={() => router.push(`/interview/training/portfolio/report?id=${session.id}`)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate text-sm font-black text-[#172033]">
                          {session.repoUrl || "Repo 정보 없음"}
                        </div>
                        <div className="inline-flex shrink-0 items-center gap-1 text-xs text-[#8a96a6]">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(session.createdAt)}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-[#6d7888]">
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Video className="h-3.5 w-3.5" />
                          화상 디펜스
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 font-bold shadow-sm">{session.status}</span>
                      </div>
                      <p className="mt-3 line-clamp-1 text-sm text-[#6d7888]">
                        {session.analysis?.improvements?.[0] ?? "리포트를 열어 세부 분석을 확인하세요."}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-[#dfe7ef] bg-white shadow-sm">
          <div className="border-b border-[#e6edf4] bg-[#fbfcfe] px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[#172033]">질문 비중</h2>
                <p className="mt-1 text-sm text-[#6d7888]">설계 의도 중심으로 평가 기준을 고정합니다.</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#637083] shadow-sm">60 / 10 / 30</div>
            </div>
          </div>
          <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
            {RUBRIC_HELP.map((item) => (
              <div key={item.label} className="rounded-2xl border border-[#dfe7ef] bg-[#fbfcfe] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-black text-[#172033]">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#6d7888]">{item.hint}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#edf6e6] px-3 py-1 text-xs font-black text-[#6f9f3b]">
                    {item.weight}%
                  </span>
                </div>
                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-[#637083] shadow-sm">
                  {item.sampleQuestion}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
