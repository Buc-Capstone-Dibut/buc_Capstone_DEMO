import { AnalysisResult } from "@/store/interview-setup-store";
import { clampScore, getTypeLabels, getTypeName } from "@/lib/interview/report/dibeot-axis";
import { DibeotAxisScores, MockInterviewReportModel } from "@/lib/interview/report/report-types";

interface SessionReportView {
  company?: string;
  role?: string;
  repoUrl?: string;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
}

interface SessionReportMeta {
  company?: string;
  role?: string;
  mode?: string;
  createdAt?: string | number;
  originalUrl?: string;
}

type SessionAnalysis = AnalysisResult & {
  summary?: string;
  fitSummary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
};

function formatDate(value?: string | number): string {
  if (!value) return "-";
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
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

function resolveRoleBias(role?: string): number {
  const source = (role || "").toLowerCase();
  if (/(backend|platform|infra|data|security|devops)/.test(source)) return 68;
  if (/(frontend|product|mobile|ui)/.test(source)) return 44;
  return 55;
}

function buildAxes(
  analysis: AnalysisResult,
  role?: string,
): DibeotAxisScores {
  const highSeverityHabitCount = analysis.habits.filter((item) => item.severity === "high").length;
  const roleBias = resolveRoleBias(role);

  return {
    approach: clampScore(analysis.evaluation.logic * 0.62 + analysis.evaluation.jobFit * 0.2 + analysis.bestPractices.length * 4 - highSeverityHabitCount * 4),
    scope: clampScore(roleBias + analysis.evaluation.logic * 0.12 + analysis.evaluation.jobFit * 0.08),
    decision: clampScore(analysis.evaluation.attitude * 0.5 + analysis.evaluation.logic * 0.2 + analysis.evaluation.communication * 0.12),
    execution: clampScore(
      (100 - roleBias) * 0.6 +
      analysis.evaluation.communication * 0.18 +
      analysis.evaluation.jobFit * 0.16,
    ),
  };
}

export function buildSessionInterviewReportModel({
  analysis,
  reportView,
  session,
}: {
  analysis: SessionAnalysis;
  reportView?: SessionReportView | null;
  session?: SessionReportMeta;
}): MockInterviewReportModel {
  const company = reportView?.company || session?.company || "모의면접";
  const role = reportView?.role || session?.role || "직무 정보 없음";
  const originalUrl = session?.originalUrl || "";
  const strengths = sanitizeTextList(reportView?.strengths).length > 0
    ? sanitizeTextList(reportView?.strengths)
    : sanitizeTextList(analysis.strengths).length > 0
      ? sanitizeTextList(analysis.strengths)
      : sanitizeTextList(analysis.feedback?.strengths);
  const improvements = sanitizeTextList(reportView?.improvements).length > 0
    ? sanitizeTextList(reportView?.improvements)
    : sanitizeTextList(analysis.improvements).length > 0
      ? sanitizeTextList(analysis.improvements)
      : sanitizeTextList(analysis.feedback?.improvements);
  const nextActions = sanitizeTextList(reportView?.nextActions).length > 0
    ? sanitizeTextList(reportView?.nextActions)
    : sanitizeTextList(analysis.nextActions);

  const axes = buildAxes(analysis, role);
  const typeName = getTypeName(axes);
  const typeLabels = getTypeLabels(axes);
  const primaryImprovement = improvements[0] || "답변 첫 문장의 밀도를 높여보세요.";
  const primaryStrength = strengths[0] || "직무 이해도와 답변 구조가 안정적입니다.";
  const summary = String(reportView?.summary || analysis.summary || `${primaryStrength} 다만 ${primaryImprovement} 흐름을 보완하면 전체 인상이 더 강해집니다.`).trim();
  const fitSummary = String(
    analysis.fitSummary ||
      `${company}의 ${role} 면접 기준으로 보면, 답변의 구조와 직무 연결성은 좋았고 전달 밀도를 조금만 끌어올리면 더 강한 인상을 줄 수 있습니다.`,
  ).trim();

  return {
    badgeLabel: "이번 면접의 디벗 유형",
    typeName,
    typeLabels,
    summary,
    heroMetrics: [],
    metaItems: [
      { label: "직무", value: role },
      originalUrl
        ? { label: "채용공고", value: company, href: originalUrl, hrefLabel: "원본 URL" }
        : { label: "회사", value: company },
      { label: "일시", value: formatDate(session?.createdAt) },
    ],
    axes,
    axisEvidence: [
      {
        axisKey: "approach",
        title: "문제 접근 방식",
        description: `논리력 ${analysis.evaluation.logic}점을 바탕으로, 답변을 바로 풀기보다 구조를 먼저 세우는 흐름이 강하게 보였습니다.`,
      },
      {
        axisKey: "scope",
        title: "사고 범위",
        description: `${role} 맥락과 답변의 전개 방식을 함께 보면, 이번 세션은 ${typeLabels[1]} 쪽으로 더 읽혔습니다.`,
      },
      {
        axisKey: "decision",
        title: "의사결정 전략",
        description: `태도 ${analysis.evaluation.attitude}점과 개선 포인트를 함께 보면, 빠른 시도보다 안정적으로 설명하는 쪽이 더 강했습니다.`,
      },
      {
        axisKey: "execution",
        title: "실행 방식",
        description: `전달력 ${analysis.evaluation.communication}점과 역할 성격을 종합하면, 실제 구현 장면을 드러내는 답변 비중이 높았습니다.`,
      },
    ],
    strengths: (strengths.length > 0 ? strengths : ["강점 데이터가 아직 없습니다."]).slice(0, 3),
    weaknesses: (improvements.length > 0 ? improvements : ["개선 포인트 데이터가 아직 없습니다."]).slice(0, 3),
    focusPoint: primaryImprovement,
    nextActions: (nextActions.length > 0
      ? nextActions
      : [
          "답변 첫 문장에서 결론을 먼저 제시하기",
          "구현 설명 뒤에 실제 성과 수치를 붙이기",
          "질문이 길어질수록 핵심 키워드를 먼저 요약하기",
        ]).slice(0, 3),
    fitSummary,
    questionHighlights: analysis.bestPractices.slice(0, 2).map((item, index) => ({
      label: `질문 하이라이트 ${index + 1}`,
      title: item.question,
      summary: item.reason,
      detail: `내 답변: "${item.userAnswer}"\n개선 답변: "${item.refinedAnswer}"`,
      tone: index === 0 ? "positive" : "caution",
    })),
    deliveryInsights: [
      analysis.habits.length > 0
        ? `습관어는 총 ${analysis.habits.reduce((sum, item) => sum + item.count, 0)}회 감지됐습니다.`
        : "습관어는 거의 감지되지 않아 화법 자체는 깔끔한 편이었습니다.",
      "답변 초반에 핵심을 먼저 말하면 전달력이 더 선명해집니다.",
      "상위 구조 설명을 한 줄 먼저 제시하면 전체 답변의 설득력이 더 올라갑니다.",
    ],
    habits: analysis.habits,
    footerActions: [
      { label: "나의 인터뷰 분석으로", href: "/interview/analysis", variant: "outline" },
      { label: "같은 직무로 다시 연습", href: "/interview/posting/setup" },
    ],
  };
}
