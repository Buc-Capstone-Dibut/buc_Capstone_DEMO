export type InterviewTypeKey =
  | "backend-system"
  | "frontend-ui"
  | "mobile-app"
  | "devops-sre"
  | "data-engineering"
  | "ai-ml"
  | "security"
  | "qa-automation"
  | "algorithm"
  | "behavioral"
  | "portfolio-defense"
  | "posting-fit"
  | "database-design"
  | "cloud-infra"
  | "product-thinking"
  | "leadership";

export interface InterviewTypeVisual {
  key: InterviewTypeKey;
  label: string;
  shortLabel: string;
  imagePath: string;
  description: string;
  questionFocus: string[];
  reportLens: string;
  blogTags: string[];
  keywords: string[];
}

const IMAGE_BASE = "/images/interview/types";

export const INTERVIEW_TYPE_VISUALS: readonly InterviewTypeVisual[] = [
  {
    key: "backend-system",
    label: "백엔드 시스템 면접",
    shortLabel: "Backend",
    imagePath: `${IMAGE_BASE}/backend-system.png`,
    description: "API, 도메인 모델, 트랜잭션, 장애 대응까지 서버 설계 역량을 검증합니다.",
    questionFocus: ["API 설계", "도메인 모델링", "트랜잭션 처리", "운영 장애 대응"],
    reportLens: "서버 구조, 데이터 흐름, 운영 안정성의 근거가 답변에 얼마나 선명했는지 봅니다.",
    blogTags: ["backend", "api", "architecture", "java", "spring", "node"],
    keywords: ["backend", "back-end", "server", "api", "spring", "node", "nest", "java", "서버", "백엔드"],
  },
  {
    key: "frontend-ui",
    label: "프론트엔드 UI 면접",
    shortLabel: "Frontend",
    imagePath: `${IMAGE_BASE}/frontend-ui.png`,
    description: "사용자 경험, 상태 관리, 렌더링 성능, 접근성까지 화면 구현 역량을 확인합니다.",
    questionFocus: ["상태 관리", "렌더링 성능", "접근성", "디자인 시스템"],
    reportLens: "UI 판단 근거와 사용자 흐름을 기술 구현으로 연결했는지 봅니다.",
    blogTags: ["frontend", "react", "nextjs", "typescript", "ui/ux"],
    keywords: ["frontend", "front-end", "react", "next", "ui", "ux", "css", "프론트", "프론트엔드"],
  },
  {
    key: "mobile-app",
    label: "모바일 앱 면접",
    shortLabel: "Mobile",
    imagePath: `${IMAGE_BASE}/mobile-app.png`,
    description: "앱 구조, 네이티브 기능, 오프라인/푸시, 배포 경험을 중심으로 검증합니다.",
    questionFocus: ["앱 아키텍처", "네이티브 연동", "오프라인 처리", "스토어 배포"],
    reportLens: "모바일 제약을 고려한 구조 선택과 사용자 환경 대응력을 봅니다.",
    blogTags: ["mobile", "ios", "android", "flutter", "react-native", "kotlin", "swift"],
    keywords: ["mobile", "ios", "android", "flutter", "react native", "react-native", "kotlin", "swift", "앱", "모바일"],
  },
  {
    key: "devops-sre",
    label: "DevOps/SRE 면접",
    shortLabel: "DevOps",
    imagePath: `${IMAGE_BASE}/devops-sre.png`,
    description: "배포 자동화, 관측성, 장애 대응, 운영 자동화를 실제 경험 기준으로 확인합니다.",
    questionFocus: ["CI/CD", "모니터링", "장애 대응", "운영 자동화"],
    reportLens: "운영 리스크를 어떻게 감지하고 줄였는지, 복구 흐름을 얼마나 구체적으로 말했는지 봅니다.",
    blogTags: ["devops", "sre", "monitoring", "cicd", "observability"],
    keywords: ["devops", "sre", "ci/cd", "cicd", "monitoring", "observability", "grafana", "prometheus", "장애", "운영"],
  },
  {
    key: "data-engineering",
    label: "데이터 엔지니어링 면접",
    shortLabel: "Data",
    imagePath: `${IMAGE_BASE}/data-engineering.png`,
    description: "파이프라인, 정합성, 배치/스트리밍, 데이터 품질 관리 경험을 검증합니다.",
    questionFocus: ["데이터 파이프라인", "정합성", "배치/스트리밍", "데이터 품질"],
    reportLens: "데이터 흐름과 품질 리스크를 구조적으로 설명했는지 봅니다.",
    blogTags: ["data", "pipeline", "etl", "sql", "spark"],
    keywords: ["data engineer", "data engineering", "etl", "pipeline", "spark", "airflow", "데이터 엔지니어"],
  },
  {
    key: "ai-ml",
    label: "AI/ML 면접",
    shortLabel: "AI/ML",
    imagePath: `${IMAGE_BASE}/ai-ml.png`,
    description: "모델링, 평가 지표, LLM 활용, 실험 설계와 검증 루프를 확인합니다.",
    questionFocus: ["모델 평가", "실험 설계", "LLM 활용", "검증 루프"],
    reportLens: "AI 결과를 맹신하지 않고 지표와 검증 절차로 설명했는지 봅니다.",
    blogTags: ["ai", "ml", "llm", "python", "model-evaluation"],
    keywords: ["ai", "ml", "machine learning", "llm", "gpt", "python", "모델", "머신러닝", "인공지능"],
  },
  {
    key: "security",
    label: "보안 면접",
    shortLabel: "Security",
    imagePath: `${IMAGE_BASE}/security.png`,
    description: "위협 모델링, 인증/인가, 취약점 대응, 보안 운영 감각을 검증합니다.",
    questionFocus: ["위협 모델링", "인증/인가", "취약점 대응", "보안 운영"],
    reportLens: "보안 리스크를 기능 요구와 운영 맥락 안에서 설명했는지 봅니다.",
    blogTags: ["security", "auth", "privacy", "incident-response"],
    keywords: ["security", "auth", "oauth", "jwt", "vulnerability", "privacy", "보안", "인증", "인가"],
  },
  {
    key: "qa-automation",
    label: "QA/자동화 면접",
    shortLabel: "QA",
    imagePath: `${IMAGE_BASE}/qa-automation.png`,
    description: "테스트 전략, 자동화, 품질 게이트, 회귀 방지 경험을 확인합니다.",
    questionFocus: ["테스트 전략", "자동화", "품질 게이트", "회귀 방지"],
    reportLens: "품질 기준을 사전에 정의하고 자동화로 지켰는지 봅니다.",
    blogTags: ["testing", "qa", "automation", "playwright", "cypress"],
    keywords: ["qa", "test", "testing", "automation", "playwright", "cypress", "테스트", "품질"],
  },
  {
    key: "algorithm",
    label: "알고리즘/문제해결 면접",
    shortLabel: "Algorithm",
    imagePath: `${IMAGE_BASE}/algorithm.png`,
    description: "문제 정의, 자료구조 선택, 시간복잡도, 풀이 검증을 중심으로 봅니다.",
    questionFocus: ["문제 분해", "자료구조 선택", "시간복잡도", "엣지 케이스"],
    reportLens: "정답보다 접근 과정, 복잡도 판단, 검증 습관이 답변에 드러났는지 봅니다.",
    blogTags: ["algorithm", "data-structure", "problem-solving"],
    keywords: ["algorithm", "coding test", "data structure", "leetcode", "알고리즘", "코딩테스트", "자료구조"],
  },
  {
    key: "behavioral",
    label: "인성/컬처핏 면접",
    shortLabel: "Behavior",
    imagePath: `${IMAGE_BASE}/behavioral.png`,
    description: "협업 방식, 갈등 조율, 책임감, 성장 태도를 상황형 질문으로 확인합니다.",
    questionFocus: ["협업 방식", "갈등 조율", "책임감", "성장 태도"],
    reportLens: "행동 사례가 구체적이고 재현 가능한 판단 기준으로 설명됐는지 봅니다.",
    blogTags: ["culture", "collaboration", "communication", "career"],
    keywords: ["behavior", "culture", "collaboration", "communication", "인성", "컬처", "협업", "갈등"],
  },
  {
    key: "portfolio-defense",
    label: "포트폴리오 디펜스",
    shortLabel: "Defense",
    imagePath: `${IMAGE_BASE}/portfolio-defense.png`,
    description: "레포 구조, 설계 의도, 개인 기여도, AI 활용 검증을 방어형으로 훈련합니다.",
    questionFocus: ["설계 의도", "개인 기여도", "코드 품질", "AI 활용 검증"],
    reportLens: "프로젝트 선택 이유와 본인 의사결정의 근거가 얼마나 방어 가능한지 봅니다.",
    blogTags: ["case-study", "architecture", "github", "ai"],
    keywords: ["portfolio", "defense", "github", "repo", "repository", "포트폴리오", "디펜스", "레포"],
  },
  {
    key: "posting-fit",
    label: "공고 적합도 면접",
    shortLabel: "Posting Fit",
    imagePath: `${IMAGE_BASE}/posting-fit.png`,
    description: "채용공고 요구사항과 이력서 경험의 연결성을 실제 지원 상황처럼 검증합니다.",
    questionFocus: ["JD 요구사항", "이력서 매칭", "지원 동기", "합류 후 기여"],
    reportLens: "공고의 요구와 지원자 경험이 답변 안에서 직접 연결됐는지 봅니다.",
    blogTags: ["career", "case-study", "job-fit", "interview"],
    keywords: ["posting", "jd", "job description", "채용공고", "공고", "지원", "합류"],
  },
  {
    key: "database-design",
    label: "DB/데이터 모델링 면접",
    shortLabel: "Database",
    imagePath: `${IMAGE_BASE}/database-design.png`,
    description: "스키마, 인덱스, 트랜잭션, 쿼리 성능과 정합성 판단을 검증합니다.",
    questionFocus: ["스키마 설계", "인덱스", "트랜잭션", "쿼리 성능"],
    reportLens: "데이터 모델 선택과 성능/정합성 트레이드오프를 설명했는지 봅니다.",
    blogTags: ["database", "sql", "postgresql", "mysql", "performance"],
    keywords: ["database", "sql", "postgres", "postgresql", "mysql", "mongodb", "index", "transaction", "db", "데이터베이스"],
  },
  {
    key: "cloud-infra",
    label: "클라우드/인프라 면접",
    shortLabel: "Cloud",
    imagePath: `${IMAGE_BASE}/cloud-infra.png`,
    description: "클라우드 아키텍처, 네트워크, 비용, 확장성과 배포 구조를 확인합니다.",
    questionFocus: ["클라우드 아키텍처", "네트워크", "확장성", "비용 최적화"],
    reportLens: "인프라 선택이 비용, 안정성, 확장성 요구를 어떻게 만족했는지 봅니다.",
    blogTags: ["cloud", "aws", "kubernetes", "docker", "infra"],
    keywords: ["cloud", "aws", "gcp", "azure", "kubernetes", "k8s", "docker", "infra", "인프라", "클라우드"],
  },
  {
    key: "product-thinking",
    label: "프로덕트 사고 면접",
    shortLabel: "Product",
    imagePath: `${IMAGE_BASE}/product-thinking.png`,
    description: "문제 정의, 사용자 가치, 지표, 우선순위 판단을 개발 경험과 연결합니다.",
    questionFocus: ["문제 정의", "사용자 가치", "제품 지표", "우선순위"],
    reportLens: "구현을 넘어 사용자 문제와 제품 성과로 답변을 연결했는지 봅니다.",
    blogTags: ["product", "metric", "case-study", "ui/ux"],
    keywords: ["product", "pm", "metric", "growth", "user", "프로덕트", "제품", "지표", "사용자"],
  },
  {
    key: "leadership",
    label: "리더십/시니어 면접",
    shortLabel: "Leadership",
    imagePath: `${IMAGE_BASE}/leadership.png`,
    description: "기술 리딩, 의사결정, 멘토링, 팀 생산성 개선 경험을 확인합니다.",
    questionFocus: ["기술 리딩", "의사결정", "멘토링", "팀 생산성"],
    reportLens: "개인 구현을 넘어 팀 의사결정과 영향력을 어떻게 만들었는지 봅니다.",
    blogTags: ["leadership", "architecture", "mentoring", "team"],
    keywords: ["lead", "leader", "senior", "staff", "principal", "mentoring", "리드", "리더", "시니어", "멘토링"],
  },
];

const VISUAL_BY_KEY = new Map<InterviewTypeKey, InterviewTypeVisual>(
  INTERVIEW_TYPE_VISUALS.map((visual) => [visual.key, visual]),
);

const DEFAULT_VISUAL = VISUAL_BY_KEY.get("posting-fit")!;

function normalizeKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function normalizeText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((item) => normalizeText(item))
      .join(" ");
  }

  return String(value || "").toLowerCase();
}

function pickExplicitVisual(value: unknown): InterviewTypeVisual | null {
  const normalized = normalizeKey(value);
  if (!normalized) return null;
  return VISUAL_BY_KEY.get(normalized as InterviewTypeKey) || null;
}

function keywordScore(visual: InterviewTypeVisual, source: string): number {
  return visual.keywords.reduce((score, keyword) => (
    source.includes(keyword.toLowerCase()) ? score + Math.max(1, keyword.length / 5) : score
  ), 0);
}

export function getInterviewTypeVisual(key?: string | null): InterviewTypeVisual {
  return pickExplicitVisual(key) || DEFAULT_VISUAL;
}

export function resolveInterviewTypeVisual(input: {
  sessionType?: string | null;
  kind?: string | null;
  role?: string | null;
  company?: string | null;
  title?: string | null;
  subtitle?: string | null;
  repoUrl?: string | null;
  detectedTopics?: string[] | null;
  interviewType?: string | null;
  jobData?: Record<string, unknown> | null;
  sourceText?: string | null;
}): InterviewTypeVisual {
  const explicit =
    pickExplicitVisual(input.interviewType)
    || pickExplicitVisual(input.jobData?.interviewType)
    || pickExplicitVisual(input.jobData?.interviewTypeKey);
  if (explicit) return explicit;

  if (
    input.sessionType === "portfolio_defense"
    || input.kind === "defense"
    || input.repoUrl
    || Array.isArray(input.detectedTopics) && input.detectedTopics.length > 0
  ) {
    return getInterviewTypeVisual("portfolio-defense");
  }

  const source = normalizeText([
    input.role,
    input.company,
    input.title,
    input.subtitle,
    input.sourceText,
    input.detectedTopics,
    input.jobData,
  ]);

  const ranked = INTERVIEW_TYPE_VISUALS
    .filter((visual) => visual.key !== "portfolio-defense" && visual.key !== "posting-fit")
    .map((visual) => ({ visual, score: keywordScore(visual, source) }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0] && ranked[0].score > 0) {
    return ranked[0].visual;
  }

  const track = normalizeKey(input.jobData?.interviewTrack);
  if (track === "role") {
    return getInterviewTypeVisual("behavioral");
  }

  return DEFAULT_VISUAL;
}

export function buildInterviewTypePayload(visual: InterviewTypeVisual) {
  return {
    interviewType: visual.key,
    interviewTypeLabel: visual.label,
    questionFocus: visual.questionFocus,
    reportLens: visual.reportLens,
    interviewTypeBlogTags: visual.blogTags,
  };
}
