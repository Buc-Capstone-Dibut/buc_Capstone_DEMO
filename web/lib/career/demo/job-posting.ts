// Public job snapshot for the presentation demo. No account-specific data belongs here.
export const CAREER_DEMO_JOB_URL = "https://m.jobkorea.co.kr/info/app_down.asp?Gno=50016735";

/** Demo is the default; `CAREER_AI_MODE=live` restores the real AI paths. */
export function isCareerDemoEnabled(mode = process.env.CAREER_AI_MODE): boolean {
  return mode?.trim().toLowerCase() !== "live";
}

export const CAREER_DEMO_COMPANY = "㈜아카넷";
export const CAREER_DEMO_ROLE = "웹개발자 (Java 웹프로그래머) - 신입";

export function getCareerDemoJobPosting() {
  return {
    company: CAREER_DEMO_COMPANY,
    // Both consumers map `title` to the role field, so it carries the role, not the ad headline.
    title: CAREER_DEMO_ROLE,
    description:
      "2009년 설립된 대전 본사(서울·부산 지사)의 소프트웨어 기업입니다. 대학 통합정보시스템(URP/CRP) 구축을 주력으로 자체 개발 프레임워크 aXis Platform, NCS 교육과정 운영 시스템, 학생 이력·역량 관리 시스템, 취업통계·분석 서비스를 개발·공급하며 대학·공공·교육 분야 SI와 ISP/BPR·EA·BI 컨설팅을 수행합니다. 「2026년 하반기 Acanet 웹개발자 채용 [서울] - 신입」 공고로, 서울 금천구 가산디지털2로 143 가산어반워크II 902호에서 주 5일(09:00~18:00) 근무하며 급여는 회사 내규에 따라 면접 후 결정합니다.",
    techStack: [
      "Java",
      "Spring Framework",
      "전자정부 표준프레임워크(eGovFrame)",
      "JSP",
      "Oracle",
      "MyBatis",
      "JavaScript",
      "데이터 모델링",
      "분석·설계",
    ],
    responsibilities: [
      "대학 통합정보시스템(학사·학생·교무 행정)의 웹 화면과 서버 기능을 개발합니다.",
      "자체 프레임워크 aXis Platform 기반 업무 모듈을 개발하고 유지보수합니다.",
      "요구사항을 분석하고 화면·DB 설계 산출물 작성과 단위 테스트를 수행합니다.",
      "고객사(대학) 현업의 요구에 대응하고 운영 중 발생하는 이슈를 개선합니다.",
    ],
    requirements: [
      "초대졸 이상의 학력을 갖추신 분",
      "신입 또는 웹 개발 경력 1년 이상이신 분",
      "Java 기반 웹 애플리케이션의 구조를 이해하고 계신 분",
      "관계형 데이터베이스와 SQL을 활용할 수 있는 분",
      "정규직(수습 3개월) 근무가 가능하신 분",
    ],
    preferred: [
      "SQLD 자격증을 보유하신 분",
      "정보처리 계열 등 관련 자격증을 보유하신 분",
      "유관 업무 경력 또는 웹 서비스 프로젝트 경험이 있으신 분",
      "전자정부 표준프레임워크 기반 개발 경험이 있으신 분",
      "대학 학사·행정 업무에 대한 이해가 있으신 분",
    ],
    culture: [
      "고객(대학) 현업의 언어로 문제를 정의하는 사람과 함께 일합니다.",
      "산출물과 작업 기록을 꼼꼼히 남기는 문화를 지향합니다.",
      "장기근속 포상 등 오래 함께 성장하는 문화를 갖추고 있습니다.",
    ],
    schedules: [{ kind: "deadline", title: "서류 접수 마감", startAt: "2026-11-06" }],
    url: CAREER_DEMO_JOB_URL,
  };
}
