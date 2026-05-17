import { NeonEditorialTemplate } from "@/components/features/career/portfolio-showcase/templates/neon-editorial";
import {
  createDefaultNeonEditorialContent,
  createDefaultNeonEditorialTokens,
} from "@/components/features/career/portfolio-showcase/templates/neon-editorial/types";

export const dynamic = "force-dynamic";

export default function NeonEditorialTestPage() {
  const content = createDefaultNeonEditorialContent({ name: "DOYOON KIM" });
  content.hero.bio = "복잡한 시스템을 단순한 인터페이스로 옮기는 프로덕트 엔지니어.";
  content.about.paragraphs = ["테스트 페이지입니다.", "Task 19에서 삭제됩니다."];
  content.about.strengths = [
    { num: "01", title: "PRODUCT-FIRST", body: "Code is the means." },
    { num: "02", title: "PERFORMANCE", body: "<100ms." },
    { num: "03", title: "DESIGN-ENG GLUE", body: "Tokens + internals." },
    { num: "04", title: "LONG-TERM", body: "I stay until metrics move." },
  ];
  content.kpis = [
    { num: 40, suffix: "K+", label: "Monthly Active Users" },
    { num: 62, suffix: "%", label: "LCP Reduced" },
    { num: 800, suffix: "ms", label: "p95 Voice Latency" },
  ];
  return <NeonEditorialTemplate content={content} tokens={createDefaultNeonEditorialTokens()} />;
}
