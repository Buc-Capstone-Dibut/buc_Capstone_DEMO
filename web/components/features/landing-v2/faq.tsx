"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const items = [
  {
    q: "Dibut은 무료인가요?",
    a: "핵심 기능은 모두 무료로 시작할 수 있습니다. 인사이트 학습, 커뮤니티 활동, 워크스페이스, AI 면접 기본 기능까지 — 비용 없이 충분히 사용 가능합니다. 일부 프리미엄 기능은 추후 별도로 안내됩니다.",
  },
  {
    q: "CTP(Code Trace Player)는 어떤 기능인가요?",
    a: "코드의 실행 흐름을 단계별로 시각화해 보여주는 학습 도구입니다. 알고리즘이 메모리에서 어떻게 동작하는지, 변수 값이 어떻게 변하는지를 한 줄씩 따라가며 직관적으로 이해할 수 있습니다.",
  },
  {
    q: "팀 빌딩은 어떻게 작동하나요?",
    a: "커뮤니티에서 해커톤·공모전·사이드 프로젝트의 팀원을 모집할 수 있습니다. 역할(프론트/백/디자인 등)과 스킬 기반으로 매칭이 진행되며, 팀이 결성되면 자동으로 워크스페이스가 열립니다.",
  },
  {
    q: "AI 면접은 실제 면접관과 얼마나 비슷한가요?",
    a: "직무·기업 유형별로 큐레이션된 질문 풀과 실시간 응답 분석, 그리고 답변의 논리·전문성·태도를 별도로 평가하는 다축 평가 모델을 사용합니다. 영상·음성 데이터를 함께 분석해 단순 텍스트 기반 도구보다 훨씬 풍부한 피드백을 제공합니다.",
  },
  {
    q: "기업/팀 단위로 워크스페이스를 사용할 수 있나요?",
    a: "네. 커뮤니티 매칭 외에도 기존 팀이 자유롭게 워크스페이스를 만들고 칸반·문서·화이트보드·음성 협업까지 한 자리에서 진행할 수 있습니다.",
  },
  {
    q: "데이터는 안전하게 관리되나요?",
    a: "Supabase 기반 인프라에서 인증·권한 관리를 수행하며, 개인 학습 기록과 면접 데이터는 본인만 접근 가능하도록 설계되어 있습니다. 자세한 내용은 개인정보처리방침 페이지를 참고해 주세요.",
  },
];

export function Faq() {
  return (
    <section className="relative bg-white px-5 py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5"
        >
          <span className="text-[12px] font-bold uppercase tracking-widest text-primary">
            FAQ
          </span>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-black leading-[1.1] tracking-tight">
            자주 묻는
            <br />
            질문들
          </h2>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-neutral-500">
            궁금한 점이 있다면 여기서 먼저 확인해 보세요. 더 자세한 문의는 사이트
            우측 하단 도움말 챗으로.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-7"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {items.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 transition-colors data-[state=open]:border-primary/30 data-[state=open]:bg-white"
              >
                <AccordionTrigger className="py-5 text-left text-[16px] font-bold tracking-tight hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[14px] leading-relaxed text-neutral-600">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
