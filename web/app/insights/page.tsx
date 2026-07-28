"use client";

import { SectionLandingPage, LandingItem } from "@/components/layout/section-landing-page";
import { BookOpen, Calendar } from "lucide-react";

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
  ];

  return (
    <SectionLandingPage
      title="인사이트"
      description="개발자의 성장을 위한 지식과 정보를 탐험하세요."
      items={items}
    />
  );
}
