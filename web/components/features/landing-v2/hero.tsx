"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuroraBackground, CursorSpotlight, GridPattern } from "./spotlight-bg";

// Spline scene URL — set NEXT_PUBLIC_SPLINE_HERO_URL in .env to embed a Spline scene.
// Use a public scene URL from community.spline.design (e.g. https://my.spline.design/xxx/).
const SPLINE_SCENE_URL = process.env.NEXT_PUBLIC_SPLINE_HERO_URL ?? "";

function SplineFallback() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="h-72 w-72 rounded-[40%] bg-gradient-to-br from-primary/40 via-fuchsia-400/30 to-blue-400/30 blur-2xl"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 m-auto h-48 w-48 rounded-[35%] bg-gradient-to-tr from-primary/50 to-transparent blur-xl"
          />
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 m-auto h-32 w-32 rounded-full bg-primary/60 mix-blend-overlay blur-sm"
          />
        </div>
      </div>
    </div>
  );
}

const FloatingChip = ({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{
      opacity: 1,
      y: [0, -12, 0],
    }}
    transition={{
      opacity: { duration: 0.8, delay },
      y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export function HeroV2() {
  const { isAuthenticated } = useAuth({ loadProfile: false });

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-white">
      <AuroraBackground />
      <GridPattern />
      <CursorSpotlight />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-20 pt-24 lg:grid-cols-12 lg:gap-8 lg:pt-32">
        {/* Left: Copy */}
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[12px] font-bold uppercase tracking-widest text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            취준 OS for Developers
          </motion.div>

          <h1 className="text-[clamp(2.75rem,7vw,5.5rem)] font-black leading-[1.02] tracking-tight text-neutral-900">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="block"
            >
              취준의 모든 과정,
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 }}
              className="block bg-gradient-to-r from-primary via-fuchsia-500 to-blue-500 bg-clip-text text-transparent"
            >
              하나의 플랫폼에서.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-7 max-w-xl text-[17px] leading-relaxed text-neutral-600"
          >
            인사이트 학습부터 동료 매칭, 워크스페이스 협업, 그리고 AI 면접 대비까지.
            Dibut은 개발자의 성장 곡선을 한 자리에 모아 만든 통합 OS입니다.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link
              href={isAuthenticated ? "/interview" : "/auth/signup"}
              className="group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-7 py-3.5 text-[14px] font-bold text-white transition-all hover:bg-neutral-800 hover:shadow-2xl hover:shadow-primary/20"
            >
              지금 무료로 시작하기
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#story"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-7 py-3.5 text-[14px] font-semibold text-neutral-700 backdrop-blur transition-all hover:bg-white"
            >
              제품 둘러보기
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-12 flex items-center gap-6 text-[12px] font-medium text-neutral-500"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-primary/40 to-fuchsia-400/40"
                  />
                ))}
              </div>
              <span>지금 N명의 개발자가 함께 성장 중</span>
            </div>
          </motion.div>
        </div>

        {/* Right: Spline / Fallback Visual */}
        <div className="relative lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative mx-auto aspect-square max-w-[560px]"
          >
            {SPLINE_SCENE_URL ? (
              <iframe
                src={SPLINE_SCENE_URL}
                title="Dibut hero scene"
                className="h-full w-full rounded-3xl"
                loading="lazy"
              />
            ) : (
              <SplineFallback />
            )}

            {/* Floating product chips */}
            <FloatingChip
              delay={0.6}
              className="absolute -left-2 top-12 z-20 rounded-2xl border border-neutral-200/80 bg-white/90 px-4 py-3 shadow-xl shadow-primary/10 backdrop-blur"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                AI Interview
              </div>
              <div className="mt-1 text-[14px] font-bold text-neutral-900">
                Overall 88 / 100
              </div>
            </FloatingChip>

            <FloatingChip
              delay={1.0}
              className="absolute -right-2 top-1/3 z-20 rounded-2xl border border-neutral-200/80 bg-white/90 px-4 py-3 shadow-xl shadow-primary/10 backdrop-blur"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Community
              </div>
              <div className="mt-1 text-[14px] font-bold text-neutral-900">
                팀원 4명 매칭됨
              </div>
            </FloatingChip>

            <FloatingChip
              delay={1.4}
              className="absolute bottom-8 left-8 z-20 rounded-2xl border border-neutral-200/80 bg-neutral-900/95 px-4 py-3 text-white shadow-xl"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Insights · CTP
              </div>
              <div className="mt-1 font-mono text-[12px]">
                <span className="text-primary/70">trace</span>
                <span className="text-neutral-300">.step(2)</span>
              </div>
            </FloatingChip>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-10 w-px bg-gradient-to-b from-primary to-transparent"
        />
      </motion.div>
    </section>
  );
}
