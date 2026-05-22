"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase, Users, Code2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Persona {
  id: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  desc: string;
  cta: { text: string; href: string };
  accent: string;
}

const personas: Persona[] = [
  {
    id: "freshman",
    icon: <GraduationCap className="h-5 w-5" />,
    label: "신입생 / 입문자",
    title: "처음부터 차근차근",
    desc: "기초 알고리즘부터 시각화 학습. CTP로 흐름을 직관적으로 익혀요.",
    cta: { text: "인사이트로 시작", href: "/insights/tech-blog" },
    accent: "from-blue-500 to-cyan-400",
  },
  {
    id: "jobseeker",
    icon: <Briefcase className="h-5 w-5" />,
    label: "취준생",
    title: "면접까지 완벽하게",
    desc: "AI 모의 면접 + 데이터 기반 피드백으로 약점을 보완하세요.",
    cta: { text: "AI 면접 시작", href: "/interview" },
    accent: "from-primary to-fuchsia-500",
  },
  {
    id: "team",
    icon: <Users className="h-5 w-5" />,
    label: "팀 빌딩 중",
    title: "동료를 찾고 있다면",
    desc: "해커톤·공모전·사이드 프로젝트 팀원을 빠르게 매칭합니다.",
    cta: { text: "커뮤니티 둘러보기", href: "/community" },
    accent: "from-emerald-500 to-teal-400",
  },
  {
    id: "developer",
    icon: <Code2 className="h-5 w-5" />,
    label: "현직 개발자",
    title: "성장 기록을 관리",
    desc: "포트폴리오, 기술 블로그, 협업 워크스페이스를 한 곳에서.",
    cta: { text: "워크스페이스 보기", href: "/workspace" },
    accent: "from-violet-500 to-purple-400",
  },
];

export function Personas() {
  return (
    <section className="relative overflow-hidden bg-neutral-900 px-5 py-32 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.3), transparent 50%), radial-gradient(circle at 80% 70%, rgb(59 130 246 / 0.2), transparent 50%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-3xl"
        >
          <span className="text-[12px] font-bold uppercase tracking-widest text-primary">
            For everyone, your way
          </span>
          <h2 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.05] tracking-tight">
            어떤 단계에 있든,
            <br />
            <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
              당신만의 출발점
            </span>
            이 있습니다.
          </h2>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/60">
            획일적인 시작이 아닌, 지금 당신의 위치에서 가장 필요한 도구부터.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {personas.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur transition-all hover:border-white/20 hover:bg-white/10"
            >
              <div className="relative z-10">
                <div
                  className={cn(
                    "mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                    p.accent,
                  )}
                >
                  {p.icon}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                  {p.label}
                </div>
                <h3 className="mt-1 text-[20px] font-black leading-tight tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-3 min-h-[60px] text-[13px] leading-relaxed text-white/60">
                  {p.desc}
                </p>
                <Link
                  href={p.cta.href}
                  className="mt-6 inline-flex items-center gap-1 text-[12px] font-bold text-white transition-all group-hover:gap-2"
                >
                  {p.cta.text}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* gradient accent line */}
              <div
                className={cn(
                  "absolute bottom-0 left-0 h-[3px] w-0 bg-gradient-to-r transition-all duration-700 group-hover:w-full",
                  p.accent,
                )}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
