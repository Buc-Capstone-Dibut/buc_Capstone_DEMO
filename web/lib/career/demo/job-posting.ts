// Public job snapshot for the presentation demo. No account-specific data belongs here.
export const CAREER_DEMO_JOB_URL = "https://www.wanted.co.kr/wd/392217";

/** Demo is the default; `CAREER_AI_MODE=live` restores the real AI paths. */
export function isCareerDemoEnabled(mode = process.env.CAREER_AI_MODE): boolean {
  return mode?.trim().toLowerCase() !== "live";
}

export const CAREER_DEMO_COMPANY = "더즌(dozn)";
export const CAREER_DEMO_ROLE = "백엔드 개발자 (개발본부) - 신입";

export function getCareerDemoJobPosting() {
  return {
    company: CAREER_DEMO_COMPANY,
    // Both consumers map `title` to the role field, so it carries the role, not the ad headline.
    title: CAREER_DEMO_ROLE,
    description:
      "기업의 거래·정산·연결·확장을 설계하는 디지털 거래 인프라 기업입니다. 결제·인증·메시징과 생활밀착 플랫폼 기능을 하나로 연결해 고객이 본업에 집중할 수 있도록 돕고, 무인 환전·해외 비즈니스·스테이블코인 등 차세대 결제·정산 영역으로 사업을 넓히고 있습니다. 「개발본부 백엔드 개발자 (신입)」 공고로, 서울 서초구 강남대로 465 강남교보타워 22층에서 정규직으로 근무하며 수습 기간 3개월 동안에도 급여는 100% 지급됩니다. 지원 서류에는 더즌에 지원한 사유를 반드시 포함해 주세요.",
    techStack: ["Java", "Spring Framework", "Spring Boot", "JPA", "MySQL", "REST API", "Batch(스케줄러)", "Git"],
    responsibilities: [
      "펌뱅킹·가상계좌 서비스를 개발하고 유지보수합니다.",
      "금융기관·제휴기관 연동을 개발하고, 신규 기관과 서비스를 등록합니다.",
      "관리자 페이지(admin)를 개발하고 유지보수합니다.",
      "배치 스케줄러를 개발하고 운영합니다.",
      "기존 시스템을 개선하고 반복 업무를 자동화합니다.",
    ],
    requirements: [
      "컴퓨터공학 또는 관련 학과를 전공하신 분(졸업 예정자 포함)",
      "Java 기본 지식과 Spring Framework 사용 경험이 있으신 분",
      "객체지향 프로그래밍(OOP)을 이해하고 계신 분",
      "Git 등 버전 관리 도구를 사용해 보신 분",
      "SQL 등 데이터베이스 기본 지식을 갖추신 분",
    ],
    preferred: [
      "결제·정산·금융 도메인에 관심이 있으신 분",
      "SQLD 등 데이터베이스 관련 자격증을 보유하신 분",
      "트랜잭션·동시성 처리에 대한 이해가 있으신 분",
      "배치·스케줄러를 개발하거나 운영해 보신 분",
      "팀 프로젝트로 서비스를 끝까지 완성해 보신 분",
    ],
    culture: [
      "고객을 위해, 서로를 배려하며, 끝까지 해내는 사람들과 함께합니다.",
      "일할 때는 깊이 몰입하고, 쉴 때는 충분히 쉬는 리듬을 중요하게 여깁니다.",
      "고객이 본업에 집중할 수 있도록 거래 인프라를 보이지 않게, 안정적으로 운영합니다.",
    ],
    schedules: [{ kind: "deadline", title: "서류 접수 마감", startAt: "2026-11-30" }],
    url: CAREER_DEMO_JOB_URL,
  };
}
