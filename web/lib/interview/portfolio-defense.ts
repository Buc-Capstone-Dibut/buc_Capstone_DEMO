export type PortfolioSetupStep = "repo" | "analysis" | "brief";

export type PortfolioAnalysisResult = {
  visibility: string;
  readmeSummary: string;
  treeSummary: string;
  infraHypotheses: string[];
  detectedTopics: string[];
};

export const PORTFOLIO_DEFENSE_DURATION_MINUTES = 10;

export const PORTFOLIO_TOPIC_LABEL: Record<string, string> = {
  architecture: "아키텍처",
  cicd: "CI/CD",
  deployment: "배포 전략",
  monitoring: "모니터링",
  "incident-response": "장애 대응",
  "ai-usage": "AI 활용",
  testing: "테스트",
  containerization: "컨테이너",
  serverless: "서버리스",
  database: "데이터베이스",
  caching: "캐싱",
};

export const PORTFOLIO_SETUP_STEPS: Array<{
  id: PortfolioSetupStep;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "repo",
    label: "레포 입력",
    description: "공개 GitHub 레포 확인",
    icon: "/images/interview/setup/flow-icons/portfolio-flow-repo-input.png",
  },
  {
    id: "analysis",
    label: "구조 분석",
    description: "README·폴더·토픽 확인",
    icon: "/images/interview/setup/flow-icons/portfolio-flow-architecture-analysis.png",
  },
  {
    id: "brief",
    label: "디펜스 브리프",
    description: "10분 화상 디펜스 확정",
    icon: "/images/interview/setup/flow-icons/portfolio-flow-video-defense.png",
  },
];

export function isPublicGithubRepoUrl(value: string): boolean {
  return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(value);
}

export function normalizeGithubRepoUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getPortfolioTopicLabel(topic: string): string {
  return PORTFOLIO_TOPIC_LABEL[topic] || topic;
}
