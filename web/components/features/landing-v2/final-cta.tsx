"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function FinalCta() {
  const { isAuthenticated } = useAuth({ loadProfile: false });

  return (
    <section className="relative isolate overflow-hidden bg-neutral-900 px-5 py-32 text-white">
      {/* gradient orbs */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2 }}
        className="absolute -top-32 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/30 blur-[140px]"
      />
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-fuchsia-500/20 blur-[120px]"
      />

      {/* grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mx-auto max-w-4xl text-center"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[12px] font-bold uppercase tracking-widest text-white/80 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Free to start
        </div>

        <h2 className="text-[clamp(2.5rem,7vw,5rem)] font-black leading-[1.05] tracking-tight">
          <span className="block">성장의 모든 과정,</span>
          <span className="block bg-gradient-to-r from-primary via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
            지금 디벗에서 시작하세요.
          </span>
        </h2>

        <p className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-white/60">
          학습부터 면접 대비까지, 한 번의 회원가입으로 모두 무료로.
          더 이상 흩어진 도구들을 옮겨다니지 않아도 됩니다.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={isAuthenticated ? "/interview" : "/auth/signup"}
            className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[15px] font-black text-neutral-900 transition-all hover:bg-neutral-100 hover:shadow-2xl hover:shadow-white/10"
          >
            지금 무료로 가입
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/insights/tech-blog"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-[15px] font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
          >
            먼저 둘러보기
          </Link>
        </div>

        <div className="mt-10 text-[12px] text-white/40">
          신용카드 등록 없음 · 30초 가입
        </div>
      </motion.div>
    </section>
  );
}
