import { AnalysisResult } from "@/store/interview-setup-store";
import { DIBEOT_AXES, getAxisLabel } from "@/lib/interview/report/dibeot-axis";
import { MockInterviewReportModel } from "@/lib/interview/report/report-types";

interface DetailQuestionFinding {
  question?: string;
  userAnswer?: string;
  strengths?: string[];
  improvements?: string[];
  refinedAnswer?: string;
  followUpQuestion?: string;
  evidence?: string[];
  confidence?: number;
}

interface SessionDetailReportView {
  questionFindings?: DetailQuestionFinding[];
}

export type SessionTimelineEntry = {
  id: string;
  timeLabel: string;
  phaseLabel: string;
  prompt: string;
  answer: string;
  hasExactTimestamp: boolean;
};

export type TimelineInsightEntry = SessionTimelineEntry & {
  recommendedAnswer: string;
  followUp: string;
  analysis: string;
  evidence: string[];
  confidence: number | null;
  analysisSource: "question_finding" | "best_practice" | "none";
  coachingSource: "question_finding" | "generated";
  linkedCoreResponseLabel?: string;
};

export type CoreResponseEntry = {
  label: string;
  timeLabel: string;
  question: string;
  answer: string;
  analysis: string;
  evidence: string[];
  confidence: number | null;
  analysisSource: "question_finding" | "best_practice";
  coachingSource: "question_finding" | "generated";
  matchedTimelineId?: string;
  improvedAnswer: string;
  followUp: string;
};

export interface SessionPositioningGuide {
  dominantAxes: Array<{
    key: string;
    label: string;
    dominant: string;
  }>;
  strongQuestionTypes: string[];
  guideSteps: string[];
  interviewerImpression: string;
}

export interface SessionInterviewDetailModel {
  coreResponses: CoreResponseEntry[];
  timelineInsights: TimelineInsightEntry[];
  positioningGuide: SessionPositioningGuide | null;
}

function formatTimelineTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remains = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remains).padStart(2, "0")}`;
}

function buildFollowUpQuestion(question: string, role: string) {
  if (question.includes("장점") || question.includes("강점")) {
    return `방금 말한 강점이 ${role} 역할에서 실제 성과로 이어진 사례를 하나만 더 설명해주실 수 있나요?`;
  }

  if (question.includes("프로젝트") || question.includes("경험")) {
    return "그 경험에서 본인이 직접 판단하고 실행한 장면을 기준으로, 결과가 어떻게 달라졌는지 구체적으로 설명해주실 수 있나요?";
  }

  if (question.includes("성능") || question.includes("최적화")) {
    return "그 판단을 하기 전후로 어떤 지표를 봤고, 왜 그 방법을 선택했는지까지 이어서 설명해주실 수 있나요?";
  }

  return "방금 답변에서 언급한 내용 중 실제로 본인이 직접 결정하거나 구현한 부분을 한 단계 더 구체적으로 설명해주실 수 있나요?";
}

function buildRecommendedAnswer(prompt: string, role: string): string {
  if (prompt.includes("프로젝트") || prompt.includes("최근에")) {
    return `프로젝트 설명은 문제 상황, 맡은 역할, 선택한 해결 방식, 결과 순서로 정리해보세요. ${role} 면접에서는 이 네 단계가 한 번에 들리는 답변이 가장 안정적으로 읽힙니다.`;
  }

  if (prompt.includes("성능") || prompt.includes("지표")) {
    return "성능 관련 답변은 병목을 어떻게 발견했는지, 어떤 지표를 봤는지, 개선 뒤 무엇이 달라졌는지를 한 묶음으로 말하면 설득력이 올라갑니다.";
  }

  if (prompt.includes("협업") || prompt.includes("조율")) {
    return "협업 질문에서는 팀 전체보다 내가 직접 조율한 판단과, 그 판단이 결과에 미친 영향을 먼저 말하는 편이 좋습니다.";
  }

  return `${role} 면접에서는 결론, 선택 이유, 실제 사례를 짧게 이어서 말하는 답변이 가장 안정적으로 들립니다.`;
}

function normalizeComparableText(value: string): string {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function findTimelineMatch(
  timeline: SessionTimelineEntry[],
  {
    question,
    answer,
  }: {
    question: string;
    answer: string;
  },
): SessionTimelineEntry | null {
  const normalizedQuestion = normalizeComparableText(question);
  const normalizedAnswer = normalizeComparableText(answer);

  return timeline.find((item) => {
    const prompt = normalizeComparableText(item.prompt);
    const response = normalizeComparableText(item.answer);

    const matchesQuestion = normalizedQuestion && (prompt.includes(normalizedQuestion) || normalizedQuestion.includes(prompt));
    const matchesAnswer = normalizedAnswer && (response.includes(normalizedAnswer) || normalizedAnswer.includes(response));
    return Boolean(matchesQuestion || matchesAnswer);
  }) || null;
}

function buildAggregatedFeedback(
  analysis: AnalysisResult | null,
  reportView: SessionDetailReportView | null | undefined,
  role: string,
  durationMinutes: 5 | 10 | 15,
  timeline: SessionTimelineEntry[],
): {
  coreResponses: CoreResponseEntry[];
} {
  const findingSource = (analysis?.questionFindings || reportView?.questionFindings || []).filter((item) => item.question || item.userAnswer);

  if (findingSource.length > 0) {
    return {
      coreResponses: findingSource.slice(0, 10).map((item, index) => {
        const timelineMatch = findTimelineMatch(timeline, {
          question: String(item.question || ""),
          answer: String(item.userAnswer || ""),
        });
        const ratio = (index + 1) / (findingSource.length + 1);
        const strengths = item.strengths?.filter(Boolean) || [];
        const improvements = item.improvements?.filter(Boolean) || [];
        const evidence = item.evidence?.filter(Boolean) || [];
        const analysisSummary = [
          strengths[0] ? `좋았던 점: ${strengths[0]}` : "",
          improvements[0] ? `보완할 점: ${improvements[0]}` : "",
          !strengths[0] && !improvements[0] && evidence[0] ? `근거: ${evidence[0]}` : "",
        ].filter(Boolean).join(" ");

        return {
          label: `핵심 질문 ${index + 1}`,
          timeLabel: timelineMatch?.timeLabel || formatTimelineTime(durationMinutes * 60 * ratio),
          question: String(item.question || "").trim() || timelineMatch?.prompt || `질문 ${index + 1}`,
          answer: String(item.userAnswer || "").trim() || timelineMatch?.answer || "답변 기록이 충분하지 않습니다.",
          analysis: analysisSummary || "질문별 분석 데이터가 연결됐지만 요약 문구는 아직 충분하지 않습니다.",
          evidence,
          confidence: typeof item.confidence === "number" && Number.isFinite(item.confidence) ? item.confidence : null,
          analysisSource: "question_finding",
          coachingSource: item.refinedAnswer || item.followUpQuestion ? "question_finding" : "generated",
          matchedTimelineId: timelineMatch?.id,
          improvedAnswer: String(item.refinedAnswer || "").trim() || buildRecommendedAnswer(String(item.question || timelineMatch?.prompt || ""), role),
          followUp: String(item.followUpQuestion || "").trim() || buildFollowUpQuestion(String(item.question || timelineMatch?.prompt || ""), role),
        };
      }),
    };
  }

  const source = (analysis?.bestPractices || []).slice(0, 10);
  return {
    coreResponses: source.map((item, index) => {
      const timelineMatch = findTimelineMatch(timeline, {
        question: item.question,
        answer: item.userAnswer,
      });
      const ratio = (index + 1) / (source.length + 1);
      return {
        label: `핵심 질문 ${index + 1}`,
        timeLabel: timelineMatch?.timeLabel || formatTimelineTime(durationMinutes * 60 * ratio),
        question: item.question,
        answer: item.userAnswer,
        analysis: item.reason,
        evidence: [],
        confidence: null,
        analysisSource: "best_practice",
        coachingSource: item.refinedAnswer ? "question_finding" : "generated",
        matchedTimelineId: timelineMatch?.id,
        improvedAnswer: item.refinedAnswer || buildRecommendedAnswer(item.question, role),
        followUp: buildFollowUpQuestion(item.question, role),
      };
    }),
  };
}

function findCoreResponseMatch(
  coreResponses: CoreResponseEntry[],
  timelineEntry: SessionTimelineEntry,
): CoreResponseEntry | null {
  const prompt = normalizeComparableText(timelineEntry.prompt);
  const answer = normalizeComparableText(timelineEntry.answer);

  return coreResponses.find((item) => {
    if (item.matchedTimelineId && item.matchedTimelineId === timelineEntry.id) {
      return true;
    }

    const question = normalizeComparableText(item.question);
    const response = normalizeComparableText(item.answer);

    const matchesQuestion = question && (prompt.includes(question) || question.includes(prompt));
    const matchesAnswer = response && (answer.includes(response) || response.includes(answer));
    return Boolean(matchesQuestion || matchesAnswer);
  }) || null;
}

function buildPositioningGuide(reportModel: MockInterviewReportModel): SessionPositioningGuide {
  const dominantAxes = DIBEOT_AXES.map((axis) => ({
    ...axis,
    dominant: getAxisLabel(axis.key, reportModel.axes[axis.key]),
  }));

  return {
    dominantAxes,
    strongQuestionTypes: [
      `${dominantAxes[0]?.dominant} 답변이 드러나는 문제 해결 질문`,
      `${dominantAxes[1]?.dominant} 시야가 필요한 시스템/구현 질문`,
      `${dominantAxes[3]?.dominant} 성향이 보이는 협업 또는 실행 질문`,
    ],
    guideSteps: [
      "답변 첫 문장에서 결론과 선택 이유를 먼저 말합니다.",
      "설계나 구현 중 본인이 직접 판단한 장면을 하나는 반드시 넣습니다.",
      "마지막 한 문장에서는 결과나 배운 점을 개발자 관점으로 연결합니다.",
    ],
    interviewerImpression: `${reportModel.typeName} 성향은 설계 논리와 실행 감각이 함께 보일 때 가장 설득력 있게 읽힙니다. 개발자 면접에서는 '왜 그렇게 판단했는지'와 '직접 무엇을 했는지'를 같이 보여주는 것이 중요합니다.`,
  };
}

export function buildSessionInterviewDetailModel({
  analysis,
  reportView,
  reportModel,
  roleLabel,
  durationMinutes,
  timeline,
}: {
  analysis: AnalysisResult | null;
  reportView?: SessionDetailReportView | null;
  reportModel: MockInterviewReportModel | null;
  roleLabel: string;
  durationMinutes: 5 | 10 | 15;
  timeline: SessionTimelineEntry[];
}): SessionInterviewDetailModel {
  const aggregatedFeedback = buildAggregatedFeedback(analysis, reportView, roleLabel, durationMinutes, timeline);

  return {
    coreResponses: aggregatedFeedback.coreResponses,
    timelineInsights: timeline.map((item) => {
      const matchedCoreResponse = findCoreResponseMatch(aggregatedFeedback.coreResponses, item);
      return {
        ...item,
        recommendedAnswer:
          matchedCoreResponse?.improvedAnswer || buildRecommendedAnswer(item.prompt, roleLabel),
        followUp:
          matchedCoreResponse?.followUp || buildFollowUpQuestion(item.prompt, roleLabel),
        analysis: matchedCoreResponse?.analysis || "",
        evidence: matchedCoreResponse?.evidence || [],
        confidence: matchedCoreResponse?.confidence ?? null,
        analysisSource: matchedCoreResponse?.analysisSource || "none",
        coachingSource: matchedCoreResponse?.coachingSource || "generated",
        linkedCoreResponseLabel: matchedCoreResponse?.label,
      };
    }),
    positioningGuide: reportModel ? buildPositioningGuide(reportModel) : null,
  };
}
