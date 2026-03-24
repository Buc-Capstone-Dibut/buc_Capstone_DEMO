import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "티어시스템 안내",
  description:
    "Dibut 티어시스템의 단계, 점수 기준, 현재 반영 중인 활동 규칙을 확인하세요.",
};

const tierProfiles = [
  {
    name: "씨앗",
    range: "0 ~ 29점",
    accentClass: "text-zinc-600",
    slotClass:
      "border-zinc-200 bg-zinc-50/80 text-zinc-500",
    description:
      "디벗 활동을 막 시작한 사용자를 위한 출발 구간입니다. 첫 질문, 첫 협업, 첫 완료 기록이 이 단계에서 쌓이기 시작합니다.",
    highlights: [
      { label: "대표 구간", value: "0 ~ 29점" },
      { label: "주요 흐름", value: "첫 질문과 첫 참여 기록" },
      { label: "노출 위치", value: "프로필 기본 티어 배지" },
    ],
  },
  {
    name: "새싹",
    range: "30 ~ 149점",
    accentClass: "text-lime-700",
    slotClass:
      "border-lime-200 bg-lime-50/80 text-lime-700",
    description:
      "반복적인 참여가 보이기 시작하는 단계입니다. 단발성 활동보다 꾸준한 질문과 작은 협업 완료가 누적되면서 진입합니다.",
    highlights: [
      { label: "대표 구간", value: "30 ~ 149점" },
      { label: "주요 흐름", value: "질문 작성과 태스크 완료 누적" },
      { label: "노출 위치", value: "프로필, 커뮤니티 작성자 배지" },
    ],
  },
  {
    name: "묘목",
    range: "150 ~ 399점",
    accentClass: "text-emerald-700",
    slotClass:
      "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    description:
      "커뮤니티 기여와 협업 흔적이 어느 정도 쌓인 상태입니다. 답변 채택과 프로젝트 참여 경험이 티어 상승에 체감되기 시작합니다.",
    highlights: [
      { label: "대표 구간", value: "150 ~ 399점" },
      { label: "주요 흐름", value: "답변 채택과 협업 기록 축적" },
      { label: "노출 위치", value: "프로필, 게시글, 댓글 영역" },
    ],
  },
  {
    name: "나무",
    range: "400 ~ 899점",
    accentClass: "text-green-700",
    slotClass:
      "border-green-200 bg-green-50/80 text-green-700",
    description:
      "꾸준한 활동이 확실하게 보이는 안정권 티어입니다. 질문과 답변, 협업 완료 기록이 모두 고르게 누적된 사용자층을 상정합니다.",
    highlights: [
      { label: "대표 구간", value: "400 ~ 899점" },
      { label: "주요 흐름", value: "지속적 커뮤니티 + 워크스페이스 기여" },
      { label: "노출 위치", value: "프로필 대표 티어로 강조" },
    ],
  },
  {
    name: "숲",
    range: "900 ~ 1799점",
    accentClass: "text-teal-700",
    slotClass:
      "border-teal-200 bg-teal-50/80 text-teal-700",
    description:
      "높은 신뢰도와 긴 활동 이력이 함께 보이는 상위 티어입니다. 여러 구간의 기여가 장기간 누적된 사용자에게 어울리는 단계입니다.",
    highlights: [
      { label: "대표 구간", value: "900 ~ 1799점" },
      { label: "주요 흐름", value: "장기간 누적된 커뮤니티/협업 기여" },
      { label: "노출 위치", value: "프로필과 커뮤니티 전반" },
    ],
  },
  {
    name: "거목",
    range: "1800점 이상",
    accentClass: "text-cyan-700",
    slotClass:
      "border-cyan-200 bg-cyan-50/80 text-cyan-700",
    description:
      "디벗 안에서 매우 오랜 기간 꾸준히 흔적을 남긴 사용자를 위한 최상위 티어입니다. 장기 기여자라는 인상을 강하게 전달하는 구간입니다.",
    highlights: [
      { label: "대표 구간", value: "1800점 이상" },
      { label: "주요 흐름", value: "지속성과 누적 기여의 상위 단계" },
      { label: "노출 위치", value: "프로필 대표 상위 티어" },
    ],
  },
] as const;

const scoringColumns = [
  {
    title: "질문 / 답변",
    items: [
      "Q&A 질문 작성: +3점",
      "Q&A 답변 채택: +25점",
      "질문 작성자만 답변 채택 가능",
      "자기 채택은 허용되지만 점수는 미지급",
    ],
  },
  {
    title: "워크스페이스",
    items: [
      "태스크 완료: +1점",
      "워크스페이스 종료 참여: +20점",
      "완료 컬럼 이동 시 적립",
      "종료 시 멤버 기준으로 반영",
    ],
  },
  {
    title: "반영 원칙",
    items: [
      "점수는 누적형으로 관리",
      "기준 점수 도달 시 즉시 티어 변경",
      "중복 지급 방지를 위한 이벤트 키 사용",
      "점수는 0점 아래로 내려가지 않음",
    ],
  },
  {
    title: "추후 확장",
    items: [
      "답변 좋아요 보상",
      "문서 주요 수정 보상",
      "프로필 완성도 보상",
      "운영 정책 기반 차감/회수 규칙",
    ],
  },
] as const;

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
      {children}
    </p>
  );
}

export default function TierSystemPage() {
  return (
    <>
      <main className="min-h-screen bg-white text-slate-950">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
        <section className="grid gap-14 border-b border-slate-200 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <SectionEyebrow>DIBUT TIER AND SCORES</SectionEyebrow>
            <div className="space-y-5">
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                디벗 유저 티어 및 점수 시스템
              </h1>
              <div className="max-w-2xl space-y-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
                <p>
                  디벗의 티어 시스템은 커뮤니티와 워크스페이스에서 남긴 실제 활동을
                  점수로 기록하고, 그 누적값에 맞춰 프로필 티어를 자동으로 갱신합니다.
                </p>
                <p>
                  현재 페이지는 지금 서비스에 연결된 실제 규칙 기준으로 정리한
                  안내 페이지입니다. 추후 배지 이미지나 SVG가 들어가면 같은 구조 안에
                  그대로 교체해서 사용할 수 있게 레이아웃을 먼저 잡아두었습니다.
                </p>
                <p>아래에서 티어 단계와 점수 시스템을 각각 확인할 수 있습니다.</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm font-medium">
              <Link
                href="#tier-system"
                className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
              >
                디벗 유저 티어 시스템 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#score-system"
                className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
              >
                디벗 유저 점수 시스템 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:ml-auto lg:w-full lg:max-w-md">
            {tierProfiles
              .slice()
              .reverse()
              .map((tier) => (
                <div key={tier.name} className="space-y-2">
                  <div
                    className={cn(
                      "flex aspect-[1/1] items-center justify-center rounded-[28px] border border-dashed text-center",
                      tier.slotClass,
                    )}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold tracking-[0.18em]">
                        {tier.name}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">
                        SVG SLOT
                      </p>
                    </div>
                  </div>
                  <p className={cn("text-center text-xs font-medium", tier.accentClass)}>
                    {tier.range}
                  </p>
                </div>
              ))}
          </div>
        </section>

        <section id="tier-system" className="scroll-mt-24 pt-20">
          <SectionEyebrow>DIBUT TIER AND SCORES</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            유저 티어 및 점수 시스템
          </h2>

          <div className="mt-14">
            {tierProfiles.map((tier, index) => (
              <div
                key={tier.name}
                className={cn(
                  "grid gap-8 py-10 md:grid-cols-[120px_minmax(0,1fr)] md:gap-10",
                  index > 0 && "border-t border-slate-200",
                )}
              >
                <div className="flex items-start md:justify-center">
                  <div
                    className={cn(
                      "flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] border border-dashed text-center",
                      tier.slotClass,
                    )}
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em]">
                        Slot
                      </p>
                      <p className="text-[10px] opacity-70">IMG / SVG</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-end gap-3">
                      <h3
                        className={cn(
                          "text-2xl font-semibold tracking-tight",
                          tier.accentClass,
                        )}
                      >
                        {tier.name}
                      </h3>
                      <span className="text-sm text-slate-500">{tier.range}</span>
                    </div>
                    <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                      {tier.description}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {tier.highlights.map((highlight) => (
                      <div key={highlight.label} className="space-y-1">
                        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                          {highlight.label}
                        </p>
                        <p className="text-sm leading-6 text-slate-700">
                          {highlight.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="score-system"
          className="scroll-mt-24 border-t border-slate-200 pt-20"
        >
          <SectionEyebrow>DIBUT SCORING SYSTEM</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            유저 점수 시스템
          </h2>

          <div className="mt-12 overflow-hidden border border-slate-200">
            <div className="grid border-b border-slate-200 bg-slate-50 md:grid-cols-4">
              {scoringColumns.map((column, index) => (
                <div
                  key={column.title}
                  className={cn(
                    "px-5 py-4 text-sm font-semibold text-slate-900",
                    index > 0 && "md:border-l md:border-slate-200",
                  )}
                >
                  {column.title}
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-4">
              {scoringColumns.map((column, index) => (
                <div
                  key={column.title}
                  className={cn(
                    "space-y-3 px-5 py-5",
                    index > 0 && "border-t border-slate-200 md:border-l md:border-t-0",
                  )}
                >
                  {column.items.map((item) => (
                    <p key={item} className="text-sm leading-6 text-slate-600">
                      {item}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 text-sm leading-7 text-slate-500">
            <p>
              현재 페이지는 서비스에 실제로 연결된 점수 규칙을 우선 기준으로
              설명합니다.
            </p>
            <p>
              추후 이미지나 SVG, 상세 정책표, 적립 예시 시나리오는 같은 섹션
              구조에 맞춰 확장할 수 있습니다.
            </p>
            <Link
              href="/my/me"
              className="inline-flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80"
            >
              내 프로필에서 현재 티어 확인하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
