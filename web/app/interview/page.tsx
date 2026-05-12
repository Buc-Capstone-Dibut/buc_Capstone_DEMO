"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Clock3,
  FileSearch,
  Github,
  Mic2,
  Sparkles,
  Video,
} from "lucide-react";

import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INTERVIEW_MODES = [
  {
    title: "공고 기반 모의면접",
    subtitle: "실제 지원 공고에 맞춘 질문",
    description: "채용공고와 이력서를 함께 분석해 JD 요구사항 중심의 면접 흐름을 만듭니다.",
    image: "/images/interview/mode-posting.png",
    href: "/interview/posting/setup",
    actionLabel: "공고로 시작",
    icon: FileSearch,
    stage: "bg-[#dceecf]",
    accent: "from-white to-[#f6fbf2]",
    border: "hover:border-[#9ac56a]",
    badges: ["JD 분석", "이력서 매칭", "맞춤 질문"],
  },
  {
    title: "직무 기반 모의면접",
    subtitle: "목표 직무 역량 훈련",
    description: "공고 없이도 백엔드, 프론트엔드, AI/데이터 등 직무별 핵심 질문을 연습합니다.",
    image: "/images/interview/mode-role.png",
    href: "/interview/role/setup",
    actionLabel: "직무 선택",
    icon: BriefcaseBusiness,
    stage: "bg-[#d5efeb]",
    accent: "from-white to-[#f2faf8]",
    border: "hover:border-[#7fc9c1]",
    badges: ["직무 선택", "역량 질문", "기초-심화"],
  },
  {
    title: "포트폴리오 디펜스",
    subtitle: "프로젝트 설명력 강화",
    description: "GitHub 레포를 분석해 설계 의도, 기술 선택, 개선 방향을 설명하는 면접을 진행합니다.",
    image: "/images/interview/mode-portfolio.png",
    href: "/interview/training/setup",
    actionLabel: "디펜스 셋업",
    icon: Github,
    stage: "bg-[#d8e9f5]",
    accent: "from-white to-[#f3f8fc]",
    border: "hover:border-[#83b7d8]",
    badges: ["GitHub 분석", "설계 의도", "기술 설명"],
  },
] as const;

const DIBEOT_AXES = ["문제 접근", "사고 범위", "의사결정", "실행 방식"] as const;

const READINESS_ITEMS = [
  { label: "화상 면접", value: "실시간 음성 기반", icon: Video },
  { label: "권장 시간", value: "10분", icon: Clock3 },
  { label: "마이크", value: "시작 전 확인", icon: Mic2 },
  { label: "카메라", value: "선택 사용", icon: Camera },
] as const;

export default function InterviewPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 md:px-8 lg:px-10">
        <section className="grid gap-6">
          <div className="space-y-5">
            <Badge variant="outline" className="border-[#cfe1c1] bg-[#f3faef] px-3 py-1 text-[#5f8f36]">
              INTERVIEW TRAINING
            </Badge>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-[#172033] md:text-5xl">
                모의면접 훈련 허브
              </h1>
              <p className="text-base leading-7 text-[#5f6b7a] md:text-lg">
                지금 준비 상황에 맞는 훈련 모드를 선택하세요. 공고, 직무, 포트폴리오 중 하나를 고르면 바로 면접 설정으로 이어집니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {INTERVIEW_MODES.map((mode, index) => {
            const ModeIcon = mode.icon;

            return (
              <motion.article
                key={mode.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className={cn(
                  "group relative flex min-h-[500px] flex-col overflow-hidden rounded-xl border border-[#dfe7ef] bg-white shadow-sm transition-colors duration-200",
                  mode.border
                )}
              >
                <div className="relative h-60 overflow-hidden bg-transparent">
                  <div className={cn("absolute left-1/2 top-5 h-40 w-[82%] -translate-x-1/2 rounded-[36px] opacity-55 blur-3xl", mode.stage)} />
                  <div className="absolute left-1/2 bottom-5 h-12 w-[58%] -translate-x-1/2 rounded-full bg-[#172033]/[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-80" />
                  <div className="absolute left-1/2 top-12 h-20 w-[72%] -translate-x-1/2 rounded-[999px] bg-white/55 blur-xl" />
                  <div className="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-lg border border-[#dfe7ef]/70 bg-white/75 px-3 py-1.5 text-xs font-bold text-[#4f5b6b] shadow-sm backdrop-blur">
                    <ModeIcon className="h-3.5 w-3.5 text-[#75a843]" />
                    {mode.subtitle}
                  </div>
                  <Image
                    src={mode.image}
                    alt={mode.title}
                    width={340}
                    height={340}
                    priority
                    className="absolute left-1/2 top-1 z-10 h-64 w-64 -translate-x-1/2 object-contain drop-shadow-[0_24px_22px_rgba(23,32,51,0.15)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.04]"
                  />
                </div>

                <div className="relative z-0 flex flex-1 flex-col p-5 pt-4">
                  <div className="space-y-3">
                    <h2 className="text-2xl font-black tracking-tight text-[#172033]">{mode.title}</h2>
                    <p className="min-h-[72px] text-sm leading-6 text-[#5f6b7a]">{mode.description}</p>

                    <div className="flex flex-wrap gap-2">
                      {mode.badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-lg border border-[#dfe7ef] bg-[#f8fafc] px-2.5 py-1 text-xs font-bold text-[#5f6b7a]"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-2 pt-5">
                    <Button
                      className="h-11 rounded-lg bg-[#7cad46] text-sm font-bold text-white hover:bg-[#6f9f3b]"
                      onClick={() => router.push(mode.href)}
                    >
                      {mode.actionLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-xl border border-[#dfe7ef] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-black text-[#172033]">면접 전 확인</p>
                <p className="mt-1 text-sm text-[#6d7888]">실제 방 입장 전에 오디오와 세션을 준비합니다.</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-[#7cad46]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {READINESS_ITEMS.map((item) => {
                const ItemIcon = item.icon;

                return (
                  <div key={item.label} className="rounded-lg border border-[#e3eaf1] bg-[#fbfcfe] p-3">
                    <div className="flex items-center gap-2">
                      <ItemIcon className="h-4 w-4 text-[#75a843]" />
                      <p className="text-sm font-bold text-[#172033]">{item.label}</p>
                    </div>
                    <p className="mt-1 text-xs font-medium text-[#6d7888]">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[#dfe7ef] bg-[#172033] p-5 text-white shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#b9dca0]">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs font-black uppercase tracking-[0.16em]">DIBEOT REPORT</p>
                </div>
                <h2 className="mt-2 text-xl font-black">면접 후 답변 성향을 4축으로 정리합니다</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c6ced8]">
                  정답 여부만 보지 않고, 문제 접근 방식과 설명 흐름이 어떤 개발자 인상으로 남는지 요약합니다.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-10 shrink-0 rounded-lg border-white/20 bg-white/10 text-sm font-bold text-white hover:bg-white/15"
                onClick={() => router.push("/interview/analysis")}
              >
                분석 예시 보기
              </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {DIBEOT_AXES.map((axis, index) => (
                <div key={axis} className="rounded-lg border border-white/10 bg-white/[0.08] p-3">
                  <p className="text-xs font-black text-[#b9dca0]">0{index + 1}</p>
                  <p className="mt-2 text-sm font-bold">{axis}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
