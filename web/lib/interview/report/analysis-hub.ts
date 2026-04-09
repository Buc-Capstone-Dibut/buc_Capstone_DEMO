import { buildInterviewResultPath } from "@/lib/interview/interview-session-flow";
import { buildPortfolioDefenseReportModel } from "@/lib/interview/report/portfolio-defense-report-adapter";
import { buildSessionInterviewReportModel } from "@/lib/interview/report/session-interview-report-adapter";
import { DibeotAxisKey, DibeotAxisScores } from "@/lib/interview/report/report-types";
import { AnalysisResult } from "@/store/interview-setup-store";

export type AnalysisHubSessionKind = "mock" | "defense";
export type AnalysisHubTabKind = "all" | AnalysisHubSessionKind;
export type AnalysisHubQuadrantKey = "tl" | "tr" | "bl" | "br";

export interface AnalysisHubAxisDefinition {
  key: DibeotAxisKey;
  label: string;
  left: string;
  right: string;
  description: string;
}

export const ANALYSIS_HUB_AXES: AnalysisHubAxisDefinition[] = [
  {
    key: "approach",
    label: "문제 접근 방식",
    left: "구조형",
    right: "탐색형",
    description: "설계·분석부터 시작하는지, 실험·구현부터 시작하는지",
  },
  {
    key: "scope",
    label: "사고 범위",
    left: "시스템형",
    right: "구현형",
    description: "시스템 구조 중심인지, 코드 구현 중심인지",
  },
  {
    key: "decision",
    label: "의사결정 전략",
    left: "안정형",
    right: "실험형",
    description: "리스크 최소화 우선인지, 빠른 실험·학습 우선인지",
  },
  {
    key: "execution",
    label: "실행 방식",
    left: "구축형",
    right: "조정형",
    description: "직접 구현 중심인지, 구조·협업 조정 중심인지",
  },
];

type SessionTimelineEntry = {
  prompt?: string;
  answer?: string;
  phaseLabel?: string;
};

type SessionReportGenerationMeta = {
  generatedAt?: number;
  sessionType?: string;
  turnCount?: number;
  questionCount?: number;
  timelineCount?: number;
  source?: string;
  analysisMode?: string;
  fallbackReason?: string;
  analysisQuality?: {
    score?: number;
    level?: string;
    label?: string;
    completenessScore?: number;
    questionFindingCount?: number;
    groundedQuestionCount?: number;
    competencyCount?: number;
    jdRequirementCount?: number;
    matchedRequirementCount?: number;
    directEvidenceCount?: number;
    warnings?: string[];
  };
} | null;

type SessionAnalysisPayload = AnalysisResult & {
  rubricScores?: Record<string, unknown>;
  totalWeightedScore?: number;
  summary?: string;
  fitSummary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
};

type SessionReportView = {
  sessionType?: string;
  analysisMode?: string;
  company?: string;
  role?: string;
  repoUrl?: string;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
  deliveryInsights?: string[];
  profile?: {
    axes?: Partial<DibeotAxisScores>;
    typeName?: string;
    typeLabels?: string[];
  } | null;
  rubric?: Record<string, unknown>;
  comparisonPayload?: {
    repoUrl?: string;
  };
  analysisQuality?: {
    score?: number;
    level?: string;
    label?: string;
    completenessScore?: number;
    questionFindingCount?: number;
    groundedQuestionCount?: number;
    competencyCount?: number;
    jdRequirementCount?: number;
    matchedRequirementCount?: number;
    directEvidenceCount?: number;
    warnings?: string[];
  };
} | null;

export interface AnalysisHubSourceSession {
  id: string;
  sessionType?: "live_interview" | "portfolio_defense";
  mode?: string;
  targetDurationSec?: number;
  company?: string;
  role?: string;
  repoUrl?: string;
  detectedTopics?: string[];
  createdAt?: number;
  analysis?: SessionAnalysisPayload | null;
  reportView?: SessionReportView | null;
  timeline?: SessionTimelineEntry[];
  reportGenerationMeta?: SessionReportGenerationMeta;
  schemaVersion?: string;
  reportStatus?: string;
}

export interface AnalysisHubSession {
  id: string;
  kind: AnalysisHubSessionKind;
  date: string;
  createdAt: number;
  title: string;
  subtitle: string;
  typeName: string;
  summary: string;
  strongestAxis: string;
  weakestAxis: string;
  axes: DibeotAxisScores;
  href: string;
  strengths: string[];
  weaknesses: string[];
  nextActions: string[];
  reportStatus: string;
  analysisQualityLabel: string;
  analysisQualityScore: number;
}

export function resolveDurationMinute(targetDurationSec?: number): 5 | 10 | 15 {
  const minute = Math.round((targetDurationSec || 0) / 60);
  if (minute <= 5) return 5;
  if (minute >= 15) return 15;
  return 10;
}

function formatSessionDate(createdAt?: number): string {
  if (!createdAt) return "-";
  const date = new Date(createdAt * 1000);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getAxisLabel(axis: AnalysisHubAxisDefinition, value: number): string {
  return value >= 50 ? axis.left : axis.right;
}

export function getDominantAxesText(axes: DibeotAxisScores): string {
  return ANALYSIS_HUB_AXES
    .map((axis) => ({
      label: getAxisLabel(axis, axes[axis.key]),
      score: Math.abs(axes[axis.key] - 50),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.label)
    .join(" · ");
}

function getWeakAxisDefinition(axes: DibeotAxisScores): AnalysisHubAxisDefinition | null {
  return ANALYSIS_HUB_AXES
    .map((axis) => ({ axis, distance: Math.abs(axes[axis.key] - 50) }))
    .sort((a, b) => a.distance - b.distance)[0]?.axis || null;
}

function getWeakAxisText(axes: DibeotAxisScores): string {
  const weakAxis = getWeakAxisDefinition(axes);
  if (!weakAxis) return "균형형";
  return getAxisLabel(weakAxis, axes[weakAxis.key]);
}

function hasSessionReportData(session: AnalysisHubSourceSession): boolean {
  return Boolean(session.reportView || session.analysis);
}

function buildMockHubSession(session: AnalysisHubSourceSession): AnalysisHubSession | null {
  if (!hasSessionReportData(session)) return null;

  const durationMinute = resolveDurationMinute(session.targetDurationSec);
  const reportModel = buildSessionInterviewReportModel({
    analysis: session.analysis || null,
    reportView: session.reportView || null,
    session: {
      company: session.company,
      role: session.role,
      mode: session.mode,
      sessionType: session.sessionType,
      createdAt: session.createdAt,
      schemaVersion: session.schemaVersion,
      reportGenerationMeta: session.reportGenerationMeta || undefined,
      originalUrl: "",
    },
  });

  return {
    id: session.id,
    kind: "mock",
    date: formatSessionDate(session.createdAt),
    createdAt: session.createdAt || 0,
    title: `${session.company || "모의면접"} 모의면접`,
    subtitle: session.role || "직무 정보 없음",
    typeName: reportModel.typeName,
    summary: reportModel.summary,
    strongestAxis: getDominantAxesText(reportModel.axes),
    weakestAxis: getWeakAxisText(reportModel.axes),
    axes: reportModel.axes,
    href: buildInterviewResultPath("live_interview", durationMinute, session.id),
    strengths: reportModel.strengths,
    weaknesses: reportModel.weaknesses,
    nextActions: reportModel.nextActions,
    reportStatus: session.reportStatus || "",
    analysisQualityLabel:
      session.reportGenerationMeta?.analysisQuality?.label ||
      session.reportView?.analysisQuality?.label ||
      (reportModel.analysisMode === "summary" ? "요약 리포트" : "정식 분석"),
    analysisQualityScore:
      session.reportGenerationMeta?.analysisQuality?.score ||
      session.reportView?.analysisQuality?.score ||
      0,
  };
}

function buildDefenseHubSession(session: AnalysisHubSourceSession): AnalysisHubSession | null {
  if (!hasSessionReportData(session)) return null;

  const durationMinute = resolveDurationMinute(session.targetDurationSec);
  const reportModel = buildPortfolioDefenseReportModel({
    analysis: session.analysis || null,
    reportView: session.reportView || null,
    timeline: Array.isArray(session.timeline) ? session.timeline : [],
    session: {
      repoUrl: session.repoUrl,
      detectedTopics: Array.isArray(session.detectedTopics) ? session.detectedTopics : [],
      mode: session.mode,
      createdAt: session.createdAt,
      durationMinute,
    },
  });

  return {
    id: session.id,
    kind: "defense",
    date: formatSessionDate(session.createdAt),
    createdAt: session.createdAt || 0,
    title: "포트폴리오 디펜스",
    subtitle: session.repoUrl || "레포 정보 없음",
    typeName: reportModel.typeName,
    summary: reportModel.summary,
    strongestAxis: getDominantAxesText(reportModel.axes),
    weakestAxis: getWeakAxisText(reportModel.axes),
    axes: reportModel.axes,
    href: buildInterviewResultPath("portfolio_defense", durationMinute, session.id),
    strengths: reportModel.strengths,
    weaknesses: reportModel.weaknesses,
    nextActions: reportModel.nextActions,
    reportStatus: session.reportStatus || "",
    analysisQualityLabel:
      session.reportGenerationMeta?.analysisQuality?.label ||
      session.reportView?.analysisQuality?.label ||
      "정식 분석",
    analysisQualityScore:
      session.reportGenerationMeta?.analysisQuality?.score ||
      session.reportView?.analysisQuality?.score ||
      0,
  };
}

export function buildAnalysisHubSessions(sessions: AnalysisHubSourceSession[]): AnalysisHubSession[] {
  return sessions
    .map((session) =>
      session.sessionType === "portfolio_defense"
        ? buildDefenseHubSession(session)
        : buildMockHubSession(session),
    )
    .filter((session): session is AnalysisHubSession => Boolean(session))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function computeRepresentativeAxes(sessions: AnalysisHubSession[]): DibeotAxisScores {
  if (sessions.length === 0) {
    return {
      approach: 50,
      scope: 50,
      decision: 50,
      execution: 50,
    };
  }

  return ANALYSIS_HUB_AXES.reduce((acc, axis) => {
    const total = sessions.reduce((sum, session) => sum + session.axes[axis.key], 0);
    acc[axis.key] = Math.round(total / sessions.length);
    return acc;
  }, {} as DibeotAxisScores);
}

export function computeAxisTrends(sessions: AnalysisHubSession[]): Record<DibeotAxisKey, number> {
  return ANALYSIS_HUB_AXES.reduce((acc, axis) => {
    const recent = sessions.slice(0, 3);
    const previous = sessions.slice(3, 6);
    const recentAvg = recent.length > 0
      ? recent.reduce((sum, session) => sum + session.axes[axis.key], 0) / recent.length
      : 50;
    const previousAvg = previous.length > 0
      ? previous.reduce((sum, session) => sum + session.axes[axis.key], 0) / previous.length
      : recentAvg;
    acc[axis.key] = Math.round(recentAvg - previousAvg);
    return acc;
  }, {} as Record<DibeotAxisKey, number>);
}

export function getQuadrantPoint(axes: DibeotAxisScores) {
  return {
    x: Math.round(((100 - axes.approach) + (100 - axes.scope)) / 2),
    y: Math.round((axes.decision + (100 - axes.execution)) / 2),
  };
}

export function getQuadrantKey(point: { x: number; y: number }): AnalysisHubQuadrantKey {
  if (point.y >= 50 && point.x < 50) return "tl";
  if (point.y >= 50 && point.x >= 50) return "tr";
  if (point.y < 50 && point.x < 50) return "bl";
  return "br";
}

function normalizePhraseKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function collectTopPhrases(items: string[], limit = 3): string[] {
  const counts = new Map<string, { label: string; count: number; order: number }>();
  items.forEach((item, index) => {
    const label = item.trim();
    if (!label) return;
    const key = normalizePhraseKey(label);
    const current = counts.get(key);
    if (current) {
      current.count += 1;
      return;
    }
    counts.set(key, { label, count: 1, order: index });
  });

  return Array.from(counts.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.order - b.order;
    })
    .slice(0, limit)
    .map((item) => item.label);
}

export function collectRecurringWeaknesses(sessions: AnalysisHubSession[], limit = 3): string[] {
  return collectTopPhrases(sessions.flatMap((session) => session.weaknesses), limit);
}

export function collectRecommendedActions(sessions: AnalysisHubSession[], limit = 3): string[] {
  return collectTopPhrases(sessions.flatMap((session) => session.nextActions), limit);
}

export function deriveSessionTags(sessions: AnalysisHubSession[]) {
  const tags: string[] = [];

  sessions.forEach((session) => {
    const source = `${session.title} ${session.subtitle} ${session.summary}`.toLowerCase();

    if (source.includes("frontend")) tags.push("frontend", "react", "typescript", "nextjs");
    if (source.includes("product")) tags.push("product", "ui/ux", "frontend");
    if (source.includes("service") || source.includes("backend")) tags.push("backend", "java", "spring", "node");
    if (source.includes("platform")) tags.push("architecture", "scalability", "backend");
    if (source.includes("design")) tags.push("ui/ux", "css", "frontend");
    if (source.includes("saas")) tags.push("product", "case-study", "architecture");
    if (source.includes("포트폴리오") || source.includes("디펜스")) tags.push("case-study", "architecture");
  });

  return Array.from(new Set(tags.filter(Boolean)));
}
