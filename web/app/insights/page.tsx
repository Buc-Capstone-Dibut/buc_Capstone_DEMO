"use client";

import { SectionLandingPage, LandingItem } from "@/components/layout/section-landing-page";
import { BookOpen, Map, Calendar } from "lucide-react";

export default function InsightsPage() {
  const items: LandingItem[] = [
    {
      title: "기술 블로그",
      description: "국내외 주요 기술 기업들의 엔지니어링 블로그를 한곳에서 확인하세요. 최신 트렌드를 놓치지 마세요.",
      href: "/insights/tech-blog",
      icon: <BookOpen className="w-6 h-6" />,
    },
    {
      title: "대외활동",
      description: "해커톤, 컨퍼런스, 다양한 개발자 행사를 통해 커리어를 성장시키세요.",
      href: "/insights/activities",
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      title: "CTP (Coding Test Prep)",
      description: "자료구조, 알고리즘 등 코딩 테스트 준비를 위한 학습 로드맵과 자료를 제공합니다.",
      href: "/insights/ctp",
      icon: <Map className="w-6 h-6" />,
      isComingSoon: true,
    },
  ];

  return (
    <SectionLandingPage
      title="인사이트"
      description="개발자의 성장을 위한 지식과 정보를 탐험하세요."
      items={items}
    />
  );
}
