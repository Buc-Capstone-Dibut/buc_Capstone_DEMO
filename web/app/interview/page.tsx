"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  Mic2,
  Sparkles,
  Video,
} from "lucide-react";

import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const INTERVIEW_MODES = [
  {
    title: "공고 기반 모의면접",
    description: "채용공고와 이력서를 함께 분석해 JD 요구사항 중심의 면접 흐름을 만듭니다.",
    image: "/images/interview/generated/mode-posting-beaver.png",
    href: "/interview/posting/setup",
    actionLabel: "공고로 시작",
    border: "hover:border-[#9ac56a]",
  },
  {
    title: "직무 기반 모의면접",
    description: "공고 없이도 백엔드, 프론트엔드, AI/데이터 등 직무별 핵심 질문을 연습합니다.",
    image: "/images/interview/generated/mode-role-beaver.png",
    href: "/interview/role/setup",
    actionLabel: "직무 선택",
    border: "hover:border-[#7fc9c1]",
  },
  {
    title: "포트폴리오 디펜스",
    description: "GitHub 레포를 분석해 설계 의도, 기술 선택, 개선 방향을 설명하는 면접을 진행합니다.",
    image: "/images/interview/generated/mode-portfolio-beaver.png",
    href: "/interview/training/setup",
    actionLabel: "디펜스 셋업",
    border: "hover:border-[#83b7d8]",
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
  return (
    <div className="min-h-screen bg-[#f3f6fa] text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 md:px-8 lg:px-10">
        <section className="grid gap-6">
          <div className="space-y-5">
            <Badge variant="outline" className="border-[#cfe1c1] bg-[#f3faef] px-3 py-1 text-[#5f8f36]">
              INTERVIEW TRAINING
            </Badge>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-4xl font-black tracking-tighter text-[#172033]">
                모의면접 훈련 허브
              </h1>
              <p className="text-base leading-7 text-[#5f6b7a] md:text-lg">
                지금 준비 상황에 맞는 훈련 모드를 선택하세요. 공고, 직무, 포트폴리오 중 하나를 고르면 바로 면접 설정으로 이어집니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {INTERVIEW_MODES.map((mode, index) => (
            <motion.div
              key={mode.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className={cn(
                "group relative min-h-[520px] overflow-hidden rounded-[2rem] border border-[#dfe7ef] bg-white transition-colors duration-300",
                mode.border
              )}
            >
              <Link href={mode.href} className="flex h-full min-h-[520px] flex-col p-7">
                <div className="relative mb-8 flex h-60 items-end justify-center overflow-visible rounded-[1.5rem] bg-transparent">
                  <div className="absolute bottom-2 left-1/2 h-12 w-[58%] -translate-x-1/2 rounded-full bg-[#172033]/[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-80" />
                  <Image
                    src={mode.image}
                    alt={mode.title}
                    width={420}
                    height={420}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    priority
                    className="relative z-10 h-[118%] w-[118%] max-w-none object-contain object-bottom p-3 drop-shadow-[0_24px_20px_rgba(23,32,51,0.12)] transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-1 flex-col">
                  <span className="mb-4 block font-mono text-[13px] font-bold text-[#9fca7c] transition-colors duration-300 group-hover:text-[#75a843]">
                    0{index + 1}
                  </span>
                  <h2 className="mb-4 text-[26px] font-black leading-tight tracking-tight text-[#172033]">
                    {mode.title}
                  </h2>
                  <p className="text-[15px] font-medium leading-7 text-[#6d7888]">
                    {mode.description}
                  </p>

                  <span className="mt-auto inline-flex items-center pt-8 text-[13px] font-black text-[#8b96a5] transition-colors duration-300 group-hover:text-[#172033]">
                    {mode.actionLabel}
                    <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#7cad46] transition-all duration-500 group-hover:w-full" />
              </Link>
            </motion.div>
          ))}
        </section>

        <section className="border-t border-[#dfe7ef] pt-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#dfe7ef]" />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#8b96a5]">Interview Guide</span>
            <span className="h-px flex-1 bg-[#dfe7ef]" />
          </div>

          <div className="space-y-12">
            <div className="grid items-center gap-6 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1fr)]">
              <div className="relative flex justify-center lg:justify-start">
                <div className="absolute bottom-6 left-1/2 h-14 w-56 -translate-x-1/2 rounded-full bg-[#172033]/[0.08] blur-3xl lg:left-[45%]" />
                <Image
                  src="/images/interview/generated/support-readiness-beaver.png"
                  alt="면접 전 오디오와 카메라를 점검하는 디벗 비버"
                  width={560}
                  height={373}
                  className="relative z-10 h-72 w-auto max-w-full object-contain drop-shadow-[0_26px_24px_rgba(23,32,51,0.12)]"
                />
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 text-[12px] font-black text-[#6f9f3b]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  입장 전 점검
                </div>
                <h2 className="mt-3 text-2xl font-black leading-tight text-[#172033] md:text-3xl">
                  면접 전 확인
                </h2>
                <p className="mt-3 max-w-2xl text-[15px] font-medium leading-7 text-[#6d7888]">
                  시작 직전에 음성, 시간, 마이크, 카메라 상태를 확인해 면접 흐름이 끊기지 않도록 준비합니다.
                </p>

                <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {READINESS_ITEMS.map((item) => {
                    const ItemIcon = item.icon;

                    return (
                      <div key={item.label} className="flex min-w-0 items-center gap-2.5">
                        <ItemIcon className="h-4 w-4 shrink-0 text-[#75a843]" />
                        <dt className="text-sm font-black text-[#172033]">{item.label}</dt>
                        <dd className="truncate text-sm font-medium text-[#8b96a5]">{item.value}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </div>

            <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
              <div className="order-2 min-w-0 lg:order-1">
                <div className="flex items-center gap-2 text-[#75a843]">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs font-black uppercase tracking-[0.16em]">DIBEOT REPORT</p>
                </div>
                <h2
                  className="mt-3 text-[26px] font-black leading-tight text-[#172033] md:text-3xl"
                  aria-label="면접 후 답변 성향을 4축으로 정리합니다"
                >
                  <span aria-hidden="true" className="block">
                    면접 후 답변 성향을
                  </span>
                  <span aria-hidden="true" className="block">
                    4축으로 정리합니다
                  </span>
                </h2>
                <p className="mt-3 max-w-2xl text-[15px] font-medium leading-7 text-[#6d7888]">
                  답변의 정답 여부보다 문제를 바라보는 방식, 생각의 폭, 결정 근거, 설명 흐름을 요약해 다음 연습 방향을 잡습니다.
                </p>

                <ol className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {DIBEOT_AXES.map((axis, index) => (
                    <li key={axis} className="flex items-center gap-2 text-sm font-bold text-[#4f5b6b]">
                      <span className="font-mono text-[13px] font-black text-[#75a843]">0{index + 1}</span>
                      {axis}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="relative order-1 flex justify-center lg:order-2 lg:justify-end">
                <div className="absolute bottom-7 left-1/2 h-16 w-60 -translate-x-1/2 rounded-full bg-[#172033]/[0.11] blur-3xl lg:left-[55%]" />
                <Image
                  src="/images/interview/generated/support-report-beaver.png"
                  alt="면접 답변 성향 리포트를 분석하는 디벗 비버"
                  width={600}
                  height={400}
                  className="relative z-10 h-72 w-auto max-w-full object-contain drop-shadow-[0_28px_28px_rgba(23,32,51,0.18)]"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
