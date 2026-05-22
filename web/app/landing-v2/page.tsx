import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { HeroV2 } from "@/components/features/landing-v2/hero";
import { BentoServices } from "@/components/features/landing-v2/bento-services";
import { StickyStory } from "@/components/features/landing-v2/sticky-story";
import { Personas } from "@/components/features/landing-v2/personas";
import { StatsBento } from "@/components/features/landing-v2/stats-bento";
import { Faq } from "@/components/features/landing-v2/faq";
import { FinalCta } from "@/components/features/landing-v2/final-cta";

export const metadata: Metadata = {
  title: "Dibut — 취준의 모든 과정, 하나의 플랫폼에서",
  description:
    "인사이트 학습, 동료 매칭, 워크스페이스 협업, AI 면접 — Dibut은 개발자의 성장을 한 자리에 모았습니다.",
};

export default function LandingV2Page() {
  return (
    <div className="overflow-hidden bg-white text-neutral-900">
      <HeroV2 />
      <BentoServices />
      <StickyStory />
      <Personas />
      <StatsBento />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
