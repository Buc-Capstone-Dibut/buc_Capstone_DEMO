import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { CAREER_DEMO_COMPANY, getCareerDemoJobPosting } from "./job-posting";
import { CAREER_DEMO_FULL_COVER_LETTER, CAREER_DEMO_PERSONA, identifyCareerDemoProjectText, type CareerDemoProjectKind } from "./persona";

const INTRO =
  "데이터의 근거를 끝까지 확인하는 신입 백엔드 개발자입니다. 행정 문서 약 1,200건을 정제해 근거 일치율을 87%까지 끌어올린 경험과 SQLD·정보처리산업기사로 다진 데이터 역량으로, 금액이 틀리지 않는 거래 인프라를 만들겠습니다.";

// Must stay ≤ 50 chars: longer self-introductions are copied into the cover-letter pool on save.
const SELF_INTRODUCTION = "숫자 하나도 틀리지 않는 거래 인프라를, 보이지 않게 지키겠습니다.";

// Experience lines render as bullets, so no bullet characters here.
const EXPERIENCE_COPY: Record<CareerDemoProjectKind, string> = {
  hello: [
    "외국인 행정·비자 플랫폼 Vizabridge의 RAG 기반 상담 어시스턴트 구축 (Python·LangChain·FastAPI·pgvector)",
    "스캔 PDF·표·다국어 행정 문서 약 1,200건을 정제·청킹하고, 시행일 메타데이터로 최신 문서를 우선 검색하도록 설계",
    "상담 로그 기반 평가셋 150문항으로 검증해 근거 일치율 약 87%(131/150), 평균 응답 3초 이내 달성",
  ].join("\n"),
  tiny: [
    "쇼핑몰 리뉴얼 팀의 문서·칸반·메시지 협업 워크스페이스 풀스택 개발 (React·Prisma·PostgreSQL·Socket.IO)",
    "카드 버전 값 기반 낙관적 업데이트로 동시 이동 시 화면마다 순서가 달라지던 정합성 문제 해결",
    "멤버 권한별 접근 범위와 서버 API–클라이언트 상태 연결을 정리해 회의 전 진행 확인 시간 단축",
  ].join("\n"),
  blavers: [
    "PM·디자이너·개발자 팀의 팀장으로 멘토링 학습관리 플랫폼 '몽구리' MVP 개발 (Next.js·Supabase)",
    "10일 일정에 맞춰 '계획 → 학습 → 피드백' 핵심 흐름을 우선 범위로 합의하고 역할별 화면·데이터 모델 구현",
    "Vercel 배포 후 본선(파이널데이) 진출",
  ].join("\n"),
};

const PROJECT_COPY: Record<CareerDemoProjectKind, { description: string; achievements: string[] }> = {
  hello: {
    description:
      "외국인 행정·비자 문의에 근거 문서와 함께 답하는 RAG 상담 어시스턴트입니다.\n문서 정제부터 검색 품질 평가까지 데이터 파이프라인 전 과정을 담당했습니다.",
    achievements: [
      "행정 문서 약 1,200건 정제·청킹·임베딩 및 pgvector 적재",
      "상담 로그 기반 평가셋 150문항 구축, 근거 일치율 약 87%(131/150) 달성",
      "시행일 메타데이터 필터와 유사도 임계값으로 오답 대신 담당자 연결, 평균 응답 3초 이내",
    ],
  },
  tiny: {
    description:
      "쇼핑몰 리뉴얼 팀이 문서·칸반·메시지를 한곳에서 관리하는 협업 워크스페이스입니다.\n정보 구조와 칸반, 멤버 권한, 최근 활동 기능을 풀스택으로 개발했습니다.",
    achievements: [
      "카드 버전 값 기반 낙관적 업데이트로 동시 편집 시 칸반 순서 정합성 확보",
      "서버가 확정한 순서만 Socket.IO로 브로드캐스트하고 충돌 요청은 최신 상태로 재동기화",
      "권한별 접근 범위 정리로 회의 전 진행 상황 확인 시간 단축",
    ],
  },
  blavers: {
    description:
      "멘토와 멘티의 학습 계획·피드백을 한곳에서 관리하는 멘토링 플랫폼 '몽구리'입니다.\n해커톤 팀장으로 범위와 우선순위를 조율하며 풀스택 개발을 맡았습니다.",
    achievements: [
      "10일 안에 '계획 → 학습 → 피드백' 핵심 흐름 완성 및 Vercel 배포",
      "멘티·멘토 route group 분리와 Supabase 스키마(알림·피드백·북마크) 설계",
      "제4회 블레이버스 MVP 개발 해커톤 본선(파이널데이) 진출",
    ],
  },
};

const SKILLS: ResumePayload["skills"] = [
  { name: "Java", level: "Intermediate", category: "language" },
  { name: "SQL", level: "Advanced", category: "language" },
  { name: "Python", level: "Advanced", category: "language" },
  { name: "TypeScript", level: "Intermediate", category: "language" },
  { name: "Spring MVC", level: "Beginner", category: "backend" },
  { name: "Spring Boot", level: "Beginner", category: "backend" },
  { name: "JPA", level: "Beginner", category: "backend" },
  { name: "JSP", level: "Intermediate", category: "backend" },
  { name: "FastAPI", level: "Intermediate", category: "backend" },
  { name: "PostgreSQL", level: "Advanced", category: "database" },
  { name: "MySQL", level: "Intermediate", category: "database" },
  { name: "pgvector", level: "Intermediate", category: "database" },
  { name: "React", level: "Intermediate", category: "frontend" },
  { name: "Next.js", level: "Intermediate", category: "frontend" },
  { name: "LangChain", level: "Intermediate", category: "data" },
  { name: "Git", level: "Intermediate", category: "devops" },
];

const FIT_SUMMARY = [
  "SQLD·정보처리산업기사 보유 — 공고 우대사항(SQLD 등 데이터베이스 자격증)과 직접 일치",
  "Vizabridge RAG: 행정 문서 약 1,200건 정제, 근거 일치율 약 87% — 금액·거래 데이터를 근거로 검증하는 습관",
  "티니타이거 워크스페이스: 버전 기반 낙관적 업데이트로 동시 요청 정합성 확보 — 가상계좌 입금·펌뱅킹 이체의 중복 처리 방지로 연결",
  "블레이버스 해커톤 팀장: 10일 만에 MVP 배포·본선 진출 — 범위·우선순위를 합의하고 끝까지 완성한 팀 프로젝트 경험",
];

/**
 * Polish text fields only (intro, experience and project copy matched by name keywords).
 * Spreads every record so extra fields (timeline, attachments, ids) survive untouched.
 */
export function polishCareerDemoResumeText(current: ResumePayload): ResumePayload {
  return {
    ...current,
    personalInfo: { ...current.personalInfo, intro: INTRO },
    experience: (current.experience ?? []).map((item) => {
      const kind = identifyCareerDemoProjectText(`${item.company} ${item.position}`);
      return kind ? { ...item, description: EXPERIENCE_COPY[kind] } : item;
    }),
    projects: (current.projects ?? []).map((item) => {
      const kind = identifyCareerDemoProjectText(item.name);
      return kind ? { ...item, ...PROJECT_COPY[kind], achievements: [...PROJECT_COPY[kind].achievements] } : item;
    }),
  };
}

function withPersonaEducation(education: ResumePayload["education"]): ResumePayload["education"] {
  const persona = {
    school: CAREER_DEMO_PERSONA.school,
    major: CAREER_DEMO_PERSONA.major,
    startDate: CAREER_DEMO_PERSONA.educationStart,
    endDate: CAREER_DEMO_PERSONA.educationEnd,
    status: "expected" as const,
  };
  const index = education.findIndex((item) => /부천/.test(item.school));
  if (index >= 0) {
    // 업로드 시절의 "~ 현재" 같은 기간 표기가 새 기간보다 먼저 보이지 않도록 지운다.
    return education.map((item, i) => (i === index ? { ...item, ...persona, period: undefined } : item));
  }
  return [...education, { id: "education-bucheon-univ", ...persona, included: true }];
}

/** The "AI로 다듬기" result: the incoming payload with the persona's tailored copy merged in. */
export function buildCareerDemoResumeResult(current: ResumePayload, jobDescription = "") {
  const polished = polishCareerDemoResumeText(current);
  const posting = getCareerDemoJobPosting();
  return {
    title: `${CAREER_DEMO_PERSONA.name} - ${CAREER_DEMO_COMPANY} 백엔드 개발자(신입) 맞춤 이력서`,
    resumePayload: {
      ...polished,
      personalInfo: { ...polished.personalInfo, name: CAREER_DEMO_PERSONA.name },
      selfIntroduction: SELF_INTRODUCTION,
      skills: SKILLS.map((skill) => ({ ...skill })),
      education: withPersonaEducation(current.education),
    } satisfies ResumePayload,
    applicationTarget: {
      company: CAREER_DEMO_COMPANY,
      role: "백엔드 개발자(개발본부) 신입",
      jobDescription: jobDescription.trim() || posting.responsibilities.join("\n"),
    },
    fitSummary: [...FIT_SUMMARY],
  };
}

/** "내 고유 강점 분석" suggestions. */
export function getCareerDemoStrengthSuggestions(): string[] {
  return [
    "근거로 증명하는 데이터 역량 — 행정 문서 약 1,200건을 정제하고 평가셋 150문항으로 검증해 근거 일치율 약 87%를 달성했습니다.",
    "동시 요청 정합성 설계 — 칸반 카드에 버전 값을 둬 서버가 확정한 순서만 반영하는 낙관적 업데이트를 구현했습니다.",
    "범위를 합의하는 리더십 — 해커톤 팀장으로 핵심 흐름을 먼저 완성해 10일 만에 MVP를 배포하고 본선에 진출했습니다.",
    "검증된 DB 기본기 — SQLD·정보처리산업기사로 다진 정규화·트랜잭션 개념을 실제 설계 판단에 적용합니다.",
  ];
}

const CONCISE_COVER_LETTER = `결제와 정산은 숫자 하나가 틀리는 순간 신뢰가 무너지는 영역입니다. 고객이 거래 인프라를 의식하지 않고 본업에 집중할 수 있도록, 보이지 않는 곳에서 한 번도 틀리지 않는 시스템을 만들고 싶어 더즌에 지원했습니다.

㈜헬로프렌즈 Vizabridge에서 행정 문서 약 1,200건을 정제해 RAG 상담 어시스턴트를 만들었습니다. 상담 로그로 만든 평가셋 150문항에서 오답 원인이 개정 전 문서라는 것을 찾아내 시행일 기준 검색으로 바꿨고, 근거 일치율 약 87%와 평균 응답 3초 이내를 달성했습니다.

티니타이거 협업 워크스페이스에서는 카드 버전 값으로 동시 요청 정합성 문제를 해결했고, 블레이버스 해커톤에서는 팀장으로 범위를 합의해 10일 만에 MVP를 끝까지 완성하고 본선에 진출했습니다.

입사 후에는 수습 기간 동안 펌뱅킹·가상계좌 구조와 금융기관 연동 방식을 빠르게 익히고, 1년 안에 신규 기관 연동이나 배치 하나를 개발부터 운영까지 책임지는 개발자가 되겠습니다.`;

/** Full letter refined toward the posting: stronger opening and the Java·Spring learning plan. */
function focusedCoverLetter() {
  return CAREER_DEMO_FULL_COVER_LETTER
    .replace(
      "결제와 정산은 숫자 하나가 틀리는 순간 신뢰가 무너지는 영역입니다.",
      "결제와 정산은 숫자 하나가 틀리는 순간 고객의 신뢰가 한 번에 무너지는 영역입니다.",
    )
    .replace(
      "더즌에서도 금액과 거래 데이터의 정합성을 먼저 확인하는 개발자가 되겠습니다.",
      "지금은 Spring Boot와 JPA로 송금 API를 직접 구현하며, 서비스 계층 트랜잭션과 롤백 테스트를 익히고 있습니다. 더즌에서도 금액과 거래 데이터의 정합성을 먼저 확인하는 개발자가 되겠습니다.",
    );
}

/** Body for the resume coach's chat-refine stream: the revised letter, no headers or meta text. */
export function buildCareerDemoCoachRefinement(message: unknown): string {
  const text = typeof message === "string" ? message : "";
  return /짧|줄여|줄이|간결|요약|분량/.test(text) ? CONCISE_COVER_LETTER : focusedCoverLetter();
}
