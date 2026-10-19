// Public job snapshot for the agreed career demo. No account-specific data belongs here.
export const CAREER_DEMO_JOB_URL = "https://www.wanted.co.kr/wd/387806";

export function isCareerDemoEnabled(mode = process.env.CAREER_AI_MODE): boolean {
  return mode?.trim().toLowerCase() !== "live";
}

export function isCareerDemoJobUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value.trim());
    return (
      ["https:", "http:"].includes(url.protocol) &&
      ["www.wanted.co.kr", "wanted.co.kr"].includes(url.hostname) &&
      url.pathname.replace(/\/+$/, "") === "/wd/387806"
    );
  } catch {
    return false;
  }
}

export function getCareerDemoJobPosting() {
  return {
    company: "클래스101(Class101)",
    title: "백엔드 엔지니어 (Backend Engineer)",
    description:
      "클래스101은 크리에이터와 수강생을 연결하는 배움 플랫폼입니다. Payments & Payouts 팀은 결제·주문부터 크리에이터 정산·출금까지의 흐름을 개발하고 운영합니다. 상시채용 포지션입니다.",
    techStack: [
      "Java", "Kotlin", "Node.js", "Spring Boot", "AWS", "Kubernetes",
      "Docker", "MongoDB", "MySQL", "React", "TypeScript", "Next.js", "GraphQL",
    ],
    responsibilities: [
      "클래스101의 결제·주문·정산·출금 시스템을 설계하고 개발합니다.",
      "정기결제, 프로모션·쿠폰, 캐시 등 다양한 결제 정책을 안정적으로 구현합니다.",
      "상품·배송 정보와 결제·주문 데이터가 일관되게 연결되도록 시스템을 개선합니다.",
      "세금·공제, 환율·다중화폐 등 다양한 조건을 반영한 정산 시스템을 개발하고 운영합니다.",
      "확장 가능한 데이터 모델과 API를 설계하고 운영 이슈의 원인을 분석합니다.",
    ],
    requirements: [
      "백엔드 개발 경력 3년 이상 또는 그에 준하는 역량을 갖추신 분",
      "비즈니스 요구사항을 이해하고 데이터 모델과 API를 설계할 수 있는 분",
      "정확성과 일관성이 중요한 시스템을 안정적으로 개발·운영할 수 있는 분",
      "문제의 특성에 맞는 기술을 선택하고 동료들과 설계·코드를 논의할 수 있는 분",
      "담당 영역의 문제를 주도적으로 발견하고 끝까지 해결할 수 있는 분",
    ],
    preferred: [
      "결제·주문·정산·출금 시스템 또는 커머스 서비스 개발·운영 경험",
      "PG·VAN 연동, 정기결제·환불 등 다양한 결제 흐름을 다룬 경험",
      "금액·세금·공제 등 높은 데이터 정확성이 요구되는 도메인 경험",
      "글로벌 서비스의 환율·다중화폐 처리 경험",
      "대용량 데이터·트래픽 처리 및 마이크로서비스 아키텍처 경험",
      "AWS·GCP 인프라 운영 또는 Redis를 활용한 서버 설계 경험",
    ],
    culture: [
      "스스로 사랑하는 일을 하며 높은 생산성과 효율성을 추구합니다.",
      "DRI를 가진 사람이 주도적으로 결정하고 실행합니다.",
      "모든 정보를 투명하게 공유하고 타운홀 미팅으로 주요 현안을 나눕니다.",
      "근무 장소와 시간을 자율적으로 선택합니다.",
    ],
    // The source says rolling recruitment. Do not reuse the stale deadline in saved copies.
    schedules: [],
  };
}
