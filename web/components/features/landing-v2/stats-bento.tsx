"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingUp, Activity, Users2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

function NumberCounter({
  to,
  duration = 1.6,
  suffix = "",
}: {
  to: number;
  duration?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

function StatTile({
  label,
  value,
  suffix,
  icon,
  caption,
  variant = "light",
  className,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  caption: string;
  variant?: "light" | "dark" | "primary";
  className?: string;
}) {
  const variantClass = {
    light: "bg-white border-neutral-200 text-neutral-900",
    dark: "bg-neutral-900 border-neutral-800 text-white",
    primary:
      "bg-gradient-to-br from-primary to-fuchsia-500 border-primary/40 text-white",
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "relative overflow-hidden rounded-3xl border p-7",
        variantClass,
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg",
          variant === "light"
            ? "bg-primary/10 text-primary"
            : "bg-white/15 text-white",
        )}
      >
        {icon}
      </div>
      <div
        className={cn(
          "text-[11px] font-bold uppercase tracking-widest",
          variant === "light" ? "text-neutral-400" : "text-white/60",
        )}
      >
        {label}
      </div>
      <div className="mt-2 text-[clamp(2rem,4vw,3rem)] font-black leading-none tracking-tight">
        <NumberCounter to={value} suffix={suffix} />
      </div>
      <div
        className={cn(
          "mt-3 text-[12px] font-medium leading-relaxed",
          variant === "light" ? "text-neutral-500" : "text-white/60",
        )}
      >
        {caption}
      </div>
    </motion.div>
  );
}

function LogoMarquee() {
  const logos = [
    "Frontend",
    "Backend",
    "DevOps",
    "Data Engineer",
    "Mobile",
    "AI/ML",
    "Game",
    "Embedded",
    "Security",
  ];
  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white py-6">
      <div className="mb-3 px-7 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
        지원 직군
      </div>
      <div className="flex gap-3 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="flex shrink-0 gap-3 px-3"
        >
          {[...logos, ...logos].map((l, i) => (
            <span
              key={i}
              className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-5 py-2 text-[13px] font-bold text-neutral-700"
            >
              {l}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function LiveActivityTile() {
  const events = [
    { user: "지원자 A", action: "AI 면접 응시", time: "방금 전" },
    { user: "팀 캡스톤", action: "워크스페이스 생성", time: "2분 전" },
    { user: "지원자 B", action: "기술 블로그 정독", time: "5분 전" },
    { user: "팀 핵톤", action: "팀원 모집 완료", time: "7분 전" },
  ];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 p-7">
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          Live · 지금 이 시각
        </span>
      </div>
      <div className="space-y-2.5">
        {events.map((e, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-[12px] shadow-sm"
          >
            <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-primary/30 to-fuchsia-400/30" />
            <div className="flex-1">
              <span className="font-bold text-neutral-900">{e.user}</span>{" "}
              <span className="text-neutral-500">{e.action}</span>
            </div>
            <span className="text-[10px] text-neutral-400">{e.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function StatsBento() {
  return (
    <section className="relative bg-neutral-50 px-5 py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="mb-14 max-w-3xl"
        >
          <span className="text-[12px] font-bold uppercase tracking-widest text-primary">
            Trust & Numbers
          </span>
          <h2 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.05] tracking-tight">
            많은 개발자들이
            <br />
            이미 디벗과 함께 성장 중.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="누적 사용자"
            value={12400}
            suffix="+"
            icon={<Users2 className="h-4 w-4" />}
            caption="가입한 개발자 / 학습자"
            variant="light"
          />
          <StatTile
            label="AI 면접 응시"
            value={38200}
            suffix="회"
            icon={<TrendingUp className="h-4 w-4" />}
            caption="누적 모의 면접 진행 횟수"
            variant="primary"
          />
          <StatTile
            label="결성된 팀"
            value={1850}
            suffix="개"
            icon={<Trophy className="h-4 w-4" />}
            caption="커뮤니티에서 만들어진 팀"
            variant="light"
          />
          <StatTile
            label="공유된 인사이트"
            value={9300}
            suffix="개"
            icon={<Activity className="h-4 w-4" />}
            caption="블로그·CTP 콘텐츠"
            variant="dark"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LogoMarquee />
          <LiveActivityTile />
        </div>
      </div>
    </section>
  );
}
