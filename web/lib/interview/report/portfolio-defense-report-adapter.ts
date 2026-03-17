import { clampScore, getTypeLabels, getTypeName } from "@/lib/interview/report/dibeot-axis";
import { DibeotAxisScores, PortfolioDefenseReportModel } from "@/lib/interview/report/report-types";

type RubricKey = "design_intent" | "code_quality" | "ai_usage";

export interface PortfolioRubricSnapshot {
  designIntent: number;
  codeQuality: number;
  aiUsage: number;
  totalWeightedScore: number;
}

interface PortfolioRubricItem {
  raw?: number;
  weighted?: number;
}

interface PortfolioReportView {
  repoUrl?: string;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
  rubric?: Record<string, PortfolioRubricItem | number>;
  comparisonPayload?: {
    repoUrl?: string;
  };
}

interface PortfolioTimelineEntry {
  prompt?: string;
  answer?: string;
  phaseLabel?: string;
}

interface PortfolioAnalysis {
  rubricScores?: Record<string, PortfolioRubricItem>;
  totalWeightedScore?: number;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
}

const RUBRIC_META: Record<RubricKey, { label: string; weight: number }> = {
  design_intent: { label: "설계 의도 설명", weight: 60 },
  code_quality: { label: "코드 품질", weight: 10 },
  ai_usage: { label: "AI 활용", weight: 30 },
};

const TOPIC_META: Record<string, { label: string; keywords: string[] }> = {
  architecture: {
    label: "아키텍처",
    keywords: ["아키텍처", "설계", "구조", "레이어", "도메인", "msa", "모노리스"],
  },
  cicd: {
    label: "CI/CD",
    keywords: ["ci", "cd", "pipeline", "깃허브 액션", "github actions", "jenkins", "배포 자동화"],
  },
  deployment: {
    label: "배포 전략",
    keywords: ["배포", "롤백", "카나리", "블루그린", "k8s", "쿠버네티스", "docker", "도커"],
  },
  monitoring: {
    label: "모니터링",
    keywords: ["모니터링", "로그", "알림", "grafana", "prometheus", "apm", "observability"],
  },
  "incident-response": {
    label: "장애 대응",
    keywords: ["장애", "인시던트", "incident", "복구", "포스트모텀", "재발 방지"],
  },
  "ai-usage": {
    label: "AI 활용 방식",
    keywords: ["ai", "llm", "gpt", "claude", "copilot", "프롬프트", "검증", "hallucination"],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatDate(value?: number): string {
  if (!value) return "-";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sanitizeTextList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeMode(mode?: string): "voice" | "video" {
  return mode === "video" ? "video" : "voice";
}

function normalizeExpectedTopics(topics?: string[]): string[] {
  const source = Array.isArray(topics) ? topics.filter((topic): topic is string => typeof topic === "string") : [];
  const normalized = source.filter((topic) => topic in TOPIC_META);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : Object.keys(TOPIC_META);
}

function buildCoverage(timeline: PortfolioTimelineEntry[], expectedTopics: string[]) {
  const sourceText = timeline
    .flatMap((item) => [item.prompt || "", item.answer || ""])
    .join(" ")
    .toLowerCase();

  const items = expectedTopics.map((topicKey) => ({
    label: TOPIC_META[topicKey]?.label || topicKey,
    covered: TOPIC_META[topicKey]?.keywords.some((keyword) => sourceText.includes(keyword.toLowerCase())) || false,
  }));

  return {
    covered: items.filter((item) => item.covered).length,
    total: items.length,
    items,
  };
}

function buildTranscriptHighlights(timeline: PortfolioTimelineEntry[]) {
  return timeline
    .slice(-3)
    .flatMap((entry) => {
      const turns: Array<{ role: "user" | "model"; text: string }> = [];
      const prompt = String(entry.prompt || "").trim();
      const answer = String(entry.answer || "").trim();
      if (prompt) {
        turns.push({ role: "model", text: prompt });
      }
      if (answer) {
        turns.push({ role: "user", text: answer });
      }
      return turns;
    })
    .slice(-6);
}

function coerceRubricItem(source: PortfolioRubricItem | number | undefined, weight: number) {
  if (typeof source === "number") {
    const raw = clamp(source, 0, 100);
    return { raw, weighted: clamp((raw / 100) * weight, 0, weight) };
  }

  const raw = clamp(Number(source?.raw ?? 0), 0, 100);
  const weightedSource = Number(source?.weighted ?? NaN);
  const weighted = Number.isFinite(weightedSource)
    ? clamp(weightedSource, 0, weight)
    : clamp((raw / 100) * weight, 0, weight);
  return { raw, weighted };
}

function resolveRubric({
  analysis,
  reportView,
}: {
  analysis?: PortfolioAnalysis | null;
  reportView?: PortfolioReportView | null;
}) {
  const rubricSource = reportView?.rubric || analysis?.rubricScores || {};
  const designIntent = coerceRubricItem(rubricSource.design_intent, RUBRIC_META.design_intent.weight);
  const codeQuality = coerceRubricItem(rubricSource.code_quality, RUBRIC_META.code_quality.weight);
  const aiUsage = coerceRubricItem(rubricSource.ai_usage, RUBRIC_META.ai_usage.weight);
  const totalWeightedScoreSource = Number(analysis?.totalWeightedScore ?? NaN);
  const totalWeightedScore = Number.isFinite(totalWeightedScoreSource)
    ? clamp(totalWeightedScoreSource, 0, 100)
    : clamp(designIntent.weighted + codeQuality.weighted + aiUsage.weighted, 0, 100);

  return {
    rubric: {
      designIntent: designIntent.raw,
      codeQuality: codeQuality.raw,
      aiUsage: aiUsage.raw,
      totalWeightedScore,
    } satisfies PortfolioRubricSnapshot,
    weighted: {
      designIntent: designIntent.weighted,
      codeQuality: codeQuality.weighted,
      aiUsage: aiUsage.weighted,
      totalWeightedScore,
    },
  };
}

export function buildPortfolioDefenseReportModel({
  analysis,
  reportView,
  timeline,
  session,
}: {
  analysis?: PortfolioAnalysis | null;
  reportView?: PortfolioReportView | null;
  timeline: PortfolioTimelineEntry[];
  session: {
    repoUrl?: string;
    detectedTopics?: string[];
    mode?: string;
    createdAt?: number;
    durationMinute?: 5 | 10 | 15;
  };
}): PortfolioDefenseReportModel {
  const { rubric, weighted } = resolveRubric({ analysis, reportView });
  const expectedTopics = normalizeExpectedTopics(session.detectedTopics);
  const coverage = buildCoverage(timeline, expectedTopics);
  const transcriptHighlights = buildTranscriptHighlights(timeline);
  const strengths = sanitizeTextList(reportView?.strengths).length > 0
    ? sanitizeTextList(reportView?.strengths)
    : sanitizeTextList(analysis?.strengths);
  const improvements = sanitizeTextList(reportView?.improvements).length > 0
    ? sanitizeTextList(reportView?.improvements)
    : sanitizeTextList(analysis?.improvements);
  const nextActions = sanitizeTextList(reportView?.nextActions).length > 0
    ? sanitizeTextList(reportView?.nextActions)
    : sanitizeTextList(analysis?.nextActions);
  const repoUrl =
    reportView?.repoUrl ||
    reportView?.comparisonPayload?.repoUrl ||
    session.repoUrl ||
    "레포 정보 없음";
  const mode = normalizeMode(session.mode);

  const coverageRatio = coverage.total > 0 ? coverage.covered / coverage.total : 0;
  const axes: DibeotAxisScores = {
    approach: clampScore(rubric.designIntent * 0.72 + 10),
    scope: clampScore(rubric.designIntent * 0.45 + coverageRatio * 35 + 20),
    decision: clampScore(
      rubric.designIntent * 0.32 + rubric.codeQuality * 0.22 + (100 - rubric.aiUsage) * 0.16 + 18,
    ),
    execution: clampScore(
      rubric.codeQuality * 0.42 + rubric.aiUsage * 0.18 + Math.min(12, transcriptHighlights.length),
    ),
  };

  const typeName = getTypeName(axes);
  const typeLabels = getTypeLabels(axes);
  const primaryImprovement = improvements[0] || "개인 기여와 설계 근거를 더 또렷하게 말해보세요.";
  const summary = String(
    reportView?.summary ||
      `설계 의도와 구조 설명은 안정적이었습니다. 다만 ${primaryImprovement}`,
  ).trim();

  return {
    badgeLabel: "이번 디펜스의 디벗 유형",
    typeName,
    typeLabels,
    summary,
    heroMetrics: [
      { label: "디펜스 점수", value: `${Math.round(weighted.totalWeightedScore)}점` },
      { label: "설명 완성도", value: `${rubric.designIntent}점` },
      { label: "설계 방어력", value: `${Math.round((rubric.designIntent + rubric.codeQuality) / 2)}점` },
    ],
    metaItems: [
      { label: "대상 레포", value: repoUrl },
      { label: "진행 방식", value: mode === "video" ? "화상 디펜스" : "음성 디펜스" },
      { label: "일시", value: formatDate(session.createdAt) },
      { label: "토픽 커버리지", value: `${coverage.covered} / ${coverage.total}` },
    ],
    axes,
    axisEvidence: [
      {
        axisKey: "approach",
        title: "문제 접근 방식",
        description: `설계 의도 설명 ${rubric.designIntent}점으로, 프로젝트를 바로 구현 이야기보다 구조와 선택 배경부터 설명하는 흐름이 두드러졌습니다.`,
      },
      {
        axisKey: "scope",
        title: "사고 범위",
        description: `토픽 커버리지가 ${coverage.covered}/${coverage.total}였기 때문에, 세부 코드보다 시스템 맥락을 먼저 짚는 흐름이 보였습니다.`,
      },
      {
        axisKey: "decision",
        title: "의사결정 전략",
        description: `AI 활용 ${rubric.aiUsage}점과 코드 품질 ${rubric.codeQuality}점을 함께 보면, 선택 근거 설명의 안정성이 결과를 좌우했습니다.`,
      },
      {
        axisKey: "execution",
        title: "실행 방식",
        description: `최근 대화 하이라이트 ${transcriptHighlights.length}개 기준으로, 구현 디테일보다 구조와 판단 맥락을 설명하는 장면이 더 강하게 드러났습니다.`,
      },
    ],
    strengths: (strengths.length > 0 ? strengths : ["강점 데이터가 아직 없습니다."]).slice(0, 3),
    weaknesses: (improvements.length > 0 ? improvements : ["개선 포인트 데이터가 아직 없습니다."]).slice(0, 3),
    focusPoint: primaryImprovement,
    nextActions: (nextActions.length > 0
      ? nextActions
      : [
          "프로젝트 소개 초반에 내 역할을 먼저 말하기",
          "기술 선택 이유를 대안 비교로 설명하기",
          "결과를 수치나 운영 지표로 연결하기",
        ]).slice(0, 3),
    defenseSummary: `${summary} 이제는 왜 이 선택을 했고, 내가 직접 무엇을 바꿨는지를 더 선명하게 보여줘야 합니다.`,
    narrativeHighlights: [
      {
        label: "프로젝트 설명",
        title: "문제 정의와 구조 설명",
        summary: strengths[0] || "프로젝트의 큰 흐름과 설계 방향을 먼저 설명한 점은 강점입니다.",
        tone: "positive",
      },
      {
        label: "디펜스 방어",
        title: "개인 기여도와 대안 비교",
        summary: primaryImprovement,
        tone: "caution",
      },
    ],
    topicCoverage: coverage,
    contributionInsights: [
      improvements[0] || "팀 전체 설명보다 내가 직접 설계·구현한 장면을 먼저 드러내는 것이 좋습니다.",
      improvements[1] || "기술 선택 이유는 버린 대안과 함께 말해야 설득력이 생깁니다.",
      nextActions[0] || "구조 설명 뒤에 실제 운영 경험이나 장애 대응 경험을 붙이면 방어력이 올라갑니다.",
    ].slice(0, 3),
    transcriptHighlights,
    footerActions: [
      { label: "훈련 센터로", href: "/interview/training", variant: "outline" },
      {
        label: "같은 레포로 다시 디펜스",
        href: `/interview/training/portfolio?repoUrl=${encodeURIComponent(repoUrl)}&mode=${mode}&duration=${session.durationMinute || 10}`,
      },
    ],
  };
}
