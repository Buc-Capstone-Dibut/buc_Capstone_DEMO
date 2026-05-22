"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  badge: string;
  title: string;
  desc: string;
  visual: React.ReactNode;
}

const InsightStepVisual = () => (
  <div className="relative h-full w-full overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl">
    <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
      <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
      <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
      <span className="ml-3 font-mono text-[11px] text-white/40">
        CTP · binary-search.ts
      </span>
    </div>
    <div className="grid grid-cols-2 gap-0">
      <div className="space-y-1.5 border-r border-white/5 p-6 font-mono text-[12px] text-white/60">
        {[
          { line: "function search(arr, target) {", highlight: false },
          { line: "  let l = 0, r = arr.length - 1;", highlight: false },
          { line: "  while (l <= r) {", highlight: true },
          { line: "    const m = (l + r) >> 1;", highlight: true },
          { line: "    if (arr[m] === target) return m;", highlight: false },
          { line: "    if (arr[m] < target) l = m + 1;", highlight: false },
          { line: "    else r = m - 1;", highlight: false },
          { line: "  }", highlight: false },
        ].map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3 rounded px-1 transition-colors",
              row.highlight && "bg-primary/10",
            )}
          >
            <span className="text-white/20">{String(i + 1).padStart(2, "0")}</span>
            <span>{row.line}</span>
          </div>
        ))}
      </div>
      <div className="space-y-3 p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Trace · Step 3 / 7
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[1, 3, 5, 7, 9, 11, 13].map((n, i) => (
            <motion.div
              key={n}
              animate={{
                scale: i === 3 ? [1, 1.15, 1] : 1,
                backgroundColor:
                  i === 3
                    ? ["#404040", "rgb(168, 85, 247)", "#404040"]
                    : i === 1 || i === 5
                      ? "#525252"
                      : "#262626",
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex aspect-square items-center justify-center rounded text-[10px] font-mono text-white"
            >
              {n}
            </motion.div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 text-[11px] text-white/50">
          <div>l = 2, r = 6</div>
          <div>mid = 4 → arr[4] = 9</div>
          <div className="text-primary/90">target &lt; 9 ⇒ r = 3</div>
        </div>
      </div>
    </div>
  </div>
);

const CommunityStepVisual = () => (
  <div className="relative h-full w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
    <div className="border-b border-neutral-100 px-6 py-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
        해커톤 팀 빌딩
      </div>
      <div className="mt-1 text-[16px] font-bold">디벗 캡스톤 챌린지 · D-7</div>
    </div>
    <div className="grid grid-cols-2 gap-4 p-6">
      {[
        { role: "Frontend", name: "지원자 A", skills: ["React", "TS"], matched: true },
        { role: "Backend", name: "지원자 B", skills: ["Node", "PG"], matched: true },
        { role: "Design", name: "지원자 C", skills: ["Figma"], matched: false },
        { role: "PM", name: "지원자 D", skills: ["Jira"], matched: true },
      ].map((m, i) => (
        <motion.div
          key={i}
          animate={{
            borderColor: m.matched
              ? ["rgb(229, 229, 229)", "hsl(var(--primary))", "rgb(229, 229, 229)"]
              : "rgb(229, 229, 229)",
          }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
          className="rounded-xl border-2 p-3"
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-8 w-8 rounded-full",
                m.matched
                  ? "bg-gradient-to-br from-primary to-fuchsia-500"
                  : "bg-neutral-200",
              )}
            />
            <div className="flex-1">
              <div className="text-[11px] font-bold text-neutral-400">
                {m.role}
              </div>
              <div className="text-[13px] font-bold text-neutral-900">
                {m.name}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {m.skills.map((s) => (
              <span
                key={s}
                className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600"
              >
                {s}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
    <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-3 text-[12px] font-bold text-neutral-700">
      → 워크스페이스 자동 생성
    </div>
  </div>
);

const WorkspaceStepVisual = () => (
  <div className="relative h-full w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
    <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10" />
        <span className="text-[13px] font-bold">디벗 캡스톤</span>
      </div>
      <div className="flex -space-x-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-primary/40 to-fuchsia-400/40"
          />
        ))}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3 p-5">
      {[
        { title: "To Do", color: "bg-neutral-100", items: ["기획안", "ERD", "와이어"] },
        {
          title: "In Progress",
          color: "bg-amber-50",
          items: ["API 설계", "Auth 흐름"],
        },
        { title: "Done", color: "bg-emerald-50", items: ["회의록"] },
      ].map((col, ci) => (
        <div key={ci} className={cn("rounded-xl p-3", col.color)}>
          <div className="mb-2 text-[10px] font-bold uppercase text-neutral-500">
            {col.title}
          </div>
          <div className="space-y-1.5">
            {col.items.map((item, i) => (
              <motion.div
                key={item}
                animate={
                  ci === 1 && i === 0
                    ? { y: [0, -3, 0] }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-md bg-white p-2 text-[11px] font-medium shadow-sm"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const InterviewStepVisual = () => (
  <div className="relative h-full w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
    <div className="grid h-full grid-cols-5 gap-0">
      <div className="col-span-2 flex flex-col items-center justify-center gap-3 border-r border-neutral-100 bg-neutral-50 p-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative h-24 w-24 rounded-full border-4 border-primary/20"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
          />
          <div className="absolute inset-0 flex items-center justify-center text-[28px] font-black text-primary">
            A
          </div>
        </motion.div>
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Overall
          </div>
          <div className="text-[34px] font-black leading-none text-neutral-900">
            88<span className="text-[16px] text-neutral-400">/100</span>
          </div>
        </div>
      </div>
      <div className="col-span-3 space-y-4 p-6">
        {[
          { label: "논리적 답변", score: 92, color: "bg-primary" },
          { label: "직무 이해도", score: 78, color: "bg-blue-500" },
          { label: "의사소통", score: 85, color: "bg-purple-500" },
        ].map((skill, i) => (
          <div key={i}>
            <div className="mb-1.5 flex justify-between text-[11px] font-bold">
              <span className="text-neutral-600">{skill.label}</span>
              <span className="text-neutral-900">{skill.score}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${skill.score}%` }}
                viewport={{ once: false }}
                transition={{ duration: 1.5, delay: i * 0.15 }}
                className={cn("h-full rounded-full", skill.color)}
              />
            </div>
          </div>
        ))}
        <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
            AI 피드백
          </div>
          <p className="mt-1 text-[12px] italic text-neutral-600">
            "답변의 구조는 체계적. 비유를 더 활용하면 깊이가 살아납니다."
          </p>
        </div>
      </div>
    </div>
  </div>
);

const steps: Step[] = [
  {
    id: "insight",
    badge: "01 · INSIGHT",
    title: "코드를 눈으로 보고 인사이트를 얻으세요",
    desc: "텍스트만 읽는 것을 넘어, CTP(Code Trace Player)로 알고리즘의 흐름을 시각적으로 따라갑니다. 복잡한 로직이 한눈에 들어오는 경험.",
    visual: <InsightStepVisual />,
  },
  {
    id: "community",
    badge: "02 · COMMUNITY",
    title: "동료를 찾고 팀을 결성하세요",
    desc: "역할별 매칭, 스킬 기반 추천. 해커톤·공모전부터 사이드 프로젝트까지 — 같은 목표를 가진 사람을 빠르게 모읍니다.",
    visual: <CommunityStepVisual />,
  },
  {
    id: "workspace",
    badge: "03 · WORKSPACE",
    title: "팀이 결성되면 즉시 협업하세요",
    desc: "커뮤니티에서 모인 팀은 자동으로 워크스페이스가 열립니다. 칸반, 문서, 화이트보드 — 협업에 필요한 모든 것이 한자리에.",
    visual: <WorkspaceStepVisual />,
  },
  {
    id: "interview",
    badge: "04 · AI INTERVIEW",
    title: "AI 면접관이 당신의 실력을 분석합니다",
    desc: "실전 같은 모의 면접 후 점수·강점·약점이 데이터로 나옵니다. 질문 의도부터 답변 논리까지 세밀하게 피드백.",
    visual: <InterviewStepVisual />,
  },
];

function StepRow({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.4, 1, 1, 0.4]);
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <div ref={ref} className="grid grid-cols-1 gap-12 py-24 lg:grid-cols-12 lg:gap-16">
      <motion.div
        style={{ opacity }}
        className="flex flex-col justify-center lg:col-span-5"
      >
        <span className="mb-4 text-[11px] font-bold uppercase tracking-widest text-primary">
          {step.badge}
        </span>
        <h3 className="mb-5 text-[clamp(1.75rem,3.5vw,2.5rem)] font-black leading-[1.15] tracking-tight">
          {step.title}
        </h3>
        <p className="text-[16px] leading-relaxed text-neutral-600">
          {step.desc}
        </p>
        <div className="mt-8 inline-flex w-fit items-center gap-2 text-[12px] font-bold text-neutral-400">
          STEP {String(index + 1).padStart(2, "0")} / {steps.length.toString().padStart(2, "0")}
        </div>
      </motion.div>
      <motion.div
        style={{ y }}
        className="lg:col-span-7"
      >
        <div className="aspect-[4/3] lg:aspect-[16/11]">
          {step.visual}
        </div>
      </motion.div>
    </div>
  );
}

export function StickyStory() {
  return (
    <section id="story" className="relative bg-white px-5 py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="mb-12 max-w-3xl"
        >
          <span className="text-[12px] font-bold uppercase tracking-widest text-primary">
            How it works
          </span>
          <h2 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.05] tracking-tight">
            학습 → 팀 빌딩 → 협업 → 면접까지
            <br />
            <span className="text-neutral-400">
              하나의 흐름으로 이어집니다.
            </span>
          </h2>
        </motion.div>

        <div className="divide-y divide-neutral-100">
          {steps.map((step, i) => (
            <StepRow key={step.id} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
