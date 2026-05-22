"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Code2,
  Users,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  id: string;
  title: string;
  desc: string;
  link: string;
  icon: React.ReactNode;
  className?: string;
  variant?: "light" | "dark" | "primary";
  visual?: React.ReactNode;
}

const cards: BentoCardProps[] = [
  {
    id: "insight",
    title: "인사이트",
    desc: "기술 블로그·CTP 시각화로 코드를 깊이 있게 학습하세요.",
    link: "/insights/tech-blog",
    icon: <Code2 className="h-5 w-5" />,
    variant: "dark",
    className: "lg:col-span-2 lg:row-span-2",
    visual: <InsightVisual />,
  },
  {
    id: "community",
    title: "커뮤니티",
    desc: "동료를 찾고 함께 갈 팀을 만드세요.",
    link: "/community",
    icon: <Users className="h-5 w-5" />,
    variant: "light",
    className: "lg:col-span-2",
    visual: <CommunityVisual />,
  },
  {
    id: "workspace",
    title: "워크스페이스",
    desc: "결성된 팀이 즉시 협업할 수 있는 전용 공간.",
    link: "/workspace",
    icon: <LayoutGrid className="h-5 w-5" />,
    variant: "primary",
    className: "lg:col-span-1",
    visual: <WorkspaceVisual />,
  },
  {
    id: "interview",
    title: "AI 면접",
    desc: "실전 같은 모의 면접 + 데이터 기반 피드백.",
    link: "/interview",
    icon: <Sparkles className="h-5 w-5" />,
    variant: "light",
    className: "lg:col-span-1",
    visual: <InterviewVisual />,
  },
];

function InsightVisual() {
  return (
    <div className="absolute inset-x-6 bottom-0 top-32 overflow-hidden rounded-t-2xl border border-white/10 bg-neutral-900/70 backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-red-500/50" />
        <div className="h-2 w-2 rounded-full bg-yellow-500/50" />
        <div className="h-2 w-2 rounded-full bg-green-500/50" />
        <span className="ml-2 text-[10px] font-mono text-white/40">trace.ts</span>
      </div>
      <div className="space-y-1 p-4 font-mono text-[11px] text-white/60">
        <div className="flex gap-3">
          <span className="text-white/20">01</span>
          <span>
            <span className="text-primary/80">function</span>{" "}
            <span className="text-yellow-300">visualize</span>(steps) {"{"}
          </span>
        </div>
        <motion.div
          animate={{ backgroundColor: ["rgba(245, 158, 11, 0)", "rgba(245, 158, 11, 0.18)", "rgba(245, 158, 11, 0)"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex gap-3 rounded px-1"
        >
          <span className="text-white/20">02</span>
          <span>
            {"  "}
            <span className="text-primary/80">const</span> trace ={" "}
            <span className="text-green-300">'step-2'</span>;
          </span>
        </motion.div>
        <div className="flex gap-3">
          <span className="text-white/20">03</span>
          <span>
            {"  "}
            <span className="text-primary/80">return</span> render(trace);
          </span>
        </div>
        <div className="flex gap-3">
          <span className="text-white/20">04</span>
          <span>{"}"}</span>
        </div>
      </div>
    </div>
  );
}

function CommunityVisual() {
  return (
    <div className="absolute bottom-6 right-6 flex -space-x-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, type: "spring" }}
          className={cn(
            "h-12 w-12 rounded-full border-[3px] border-white shadow-lg",
            i === 0 && "bg-gradient-to-br from-primary to-fuchsia-500",
            i === 1 && "bg-gradient-to-br from-blue-500 to-cyan-400",
            i === 2 && "bg-gradient-to-br from-emerald-500 to-teal-400",
            i === 3 && "bg-gradient-to-br from-violet-500 to-purple-400",
            i === 4 &&
              "flex items-center justify-center bg-neutral-900 text-[11px] font-bold text-white",
          )}
        >
          {i === 4 && "+24"}
        </motion.div>
      ))}
    </div>
  );
}

function WorkspaceVisual() {
  return (
    <div className="absolute bottom-6 right-6 left-6 space-y-2">
      {["기획안 작성", "API 설계", "UI 와이어"].map((label, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 backdrop-blur"
        >
          <div className="h-3 w-3 rounded-full border-2 border-white/40" />
          <span className="text-[12px] font-medium text-white/90">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function InterviewVisual() {
  return (
    <div className="absolute bottom-6 right-6 left-6">
      <div className="flex items-end gap-1.5">
        {[60, 72, 50, 88, 78, 92].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 4 }}
            whileInView={{ height: h }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, type: "spring", damping: 12 }}
            className={cn(
              "w-full rounded-t",
              i === 3 ? "bg-primary" : "bg-neutral-300",
            )}
          />
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Overall
        </span>
        <span className="text-[24px] font-black text-neutral-900">
          88<span className="text-[12px] text-neutral-400">/100</span>
        </span>
      </div>
    </div>
  );
}

function BentoCard({
  card,
  index,
}: {
  card: BentoCardProps;
  index: number;
}) {
  const variantStyles = {
    light: "bg-white border-neutral-200/80 text-neutral-900",
    dark: "bg-neutral-900 border-neutral-800 text-white",
    primary:
      "bg-gradient-to-br from-primary to-primary/80 border-primary/40 text-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border p-8 transition-all duration-500 hover:shadow-2xl",
        variantStyles[card.variant ?? "light"],
        card.className,
      )}
    >
      <Link href={card.link} className="relative z-10 flex h-full flex-col">
        <div
          className={cn(
            "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl",
            card.variant === "light"
              ? "bg-primary/10 text-primary"
              : "bg-white/15 text-white",
          )}
        >
          {card.icon}
        </div>
        <h3 className="mb-2 text-[22px] font-black tracking-tight">
          {card.title}
        </h3>
        <p
          className={cn(
            "max-w-[28ch] text-[14px] leading-relaxed",
            card.variant === "light" ? "text-neutral-500" : "text-white/70",
          )}
        >
          {card.desc}
        </p>

        <div className="mt-auto pt-6">
          <div
            className={cn(
              "inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-widest opacity-60 transition-all group-hover:gap-2 group-hover:opacity-100",
              card.variant === "light" ? "text-neutral-900" : "text-white",
            )}
          >
            자세히 보기
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </Link>

      {card.visual && card.visual}

      {/* Hover glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--primary) / 0.15), transparent 60%)",
        }}
      />
    </motion.div>
  );
}

export function BentoServices() {
  return (
    <section className="relative bg-neutral-50 px-5 py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            <span className="text-[12px] font-bold uppercase tracking-widest text-primary">
              Our Core Values
            </span>
            <h2 className="mt-3 max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.05] tracking-tight">
              개발자의 성장이 일어나는
              <br />
              <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                네 가지 기록
              </span>
              의 조각들
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-neutral-500">
            장식을 걷어내고 본질에만 집중한 기능들. 각각의 영역이 다음 단계로
            자연스럽게 연결됩니다.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 lg:auto-rows-[200px] lg:grid-cols-4">
          {cards.map((card, i) => (
            <BentoCard key={card.id} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
