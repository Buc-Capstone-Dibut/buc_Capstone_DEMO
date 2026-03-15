import { AnalysisResult } from "@/store/interview-setup-store";
import { DIBEOT_AXES, getAxisLabel } from "@/lib/interview/report/dibeot-axis";
import { MockInterviewReportModel } from "@/lib/interview/report/report-types";

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
};

export type CoreResponseEntry = {
  label: string;
  timeLabel: string;
  question: string;
  answer: string;
  analysis: string;
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

function buildAggregatedFeedback(
  analysis: AnalysisResult,
  role: string,
  durationMinutes: 5 | 10 | 15,
): {
  coreResponses: CoreResponseEntry[];
} {
  const source = analysis.bestPractices.slice(0, 10);
  const supplemental = [
    {
      question: `${role} 역할에서 가장 강하게 드러난 경험은 무엇인가요?`,
      userAnswer: analysis.feedback.strengths[0] || `${role} 직무와 연결되는 강점이 비교적 안정적으로 드러났습니다.`,
      refinedAnswer: "가장 먼저 맡았던 역할과 문제 상황을 말하고, 내가 직접 판단한 장면과 결과를 붙여 설명해보세요.",
      reason: "강점은 보였지만, 실제로 어떤 역할과 결과였는지까지 이어지면 더 설득력이 올라갑니다.",
    },
    {
      question: "가장 어려웠던 문제를 어떻게 해결했나요?",
      userAnswer: analysis.feedback.improvements[0] || "문제 해결의 핵심 장면을 더 구조적으로 설명할 필요가 있습니다.",
      refinedAnswer: "문제 상황, 원인 파악, 선택한 해결책, 결과 순서로 짧게 정리하면 답변의 밀도가 훨씬 좋아집니다.",
      reason: "핵심 문제 해결 장면은 좋지만, 원인과 선택 근거를 더 명확히 풀어내는 편이 좋습니다.",
    },
    {
      question: "협업 과정에서 본인이 직접 조율하거나 결정한 부분은 무엇이었나요?",
      userAnswer: analysis.feedback.strengths[0] || "협업 맥락은 보였지만 본인 기여 범위를 더 선명하게 말할 필요가 있습니다.",
      refinedAnswer: "팀이 아니라 '내가 맡은 판단'을 먼저 말하고, 그 판단이 결과에 어떤 영향을 줬는지 연결해보세요.",
      reason: "협업 설명은 있었지만, 본인의 기여 지점이 더 선명하게 드러나면 면접관이 이해하기 쉽습니다.",
    },
    {
      question: `${role} 면접에서 자주 나오는 꼬리 질문에 어떻게 대비할 수 있나요?`,
      userAnswer:
        analysis.habits.length > 0
          ? `현재는 "${analysis.habits[0]?.habit}" 같은 습관 표현이 조금 섞여 있습니다.`
          : "전달 자체는 비교적 안정적이고, 답변 구조를 더 정리하면 좋습니다.",
      refinedAnswer: "결론, 선택 이유, 실제 사례를 짧게 반복하는 구조를 잡아두면 꼬리 질문이 들어와도 흔들림이 줄어듭니다.",
      reason: "말하기 습관보다 답변 틀을 먼저 고정하면, 후속 질문에서도 전체 흐름이 덜 흔들립니다.",
    },
    {
      question: "마지막 한 문장으로 본인의 강점을 어떻게 정리하시겠어요?",
      userAnswer: analysis.feedback.strengths[0] || "직무 강점을 더 짧고 선명하게 정리할 필요가 있습니다.",
      refinedAnswer: `'저는 ${role} 역할에서 구조를 빠르게 이해하고, 직접 구현까지 연결하는 개발자입니다.'처럼 한 문장으로 닫아보세요.`,
      reason: "면접 말미에는 긴 설명보다, 본인을 한 문장으로 정리하는 힘이 인상에 더 크게 남습니다.",
    },
  ];

  const merged = [...source, ...supplemental].slice(0, Math.min(10, Math.max(5, source.length + supplemental.length)));

  return {
    coreResponses: merged.map((item, index) => {
      const ratio = (index + 1) / (merged.length + 1);
      return {
        label: `핵심 질문 ${index + 1}`,
        timeLabel: formatTimelineTime(durationMinutes * 60 * ratio),
        question: item.question,
        answer: item.userAnswer,
        analysis: item.reason,
        improvedAnswer: item.refinedAnswer,
        followUp: buildFollowUpQuestion(item.question, role),
      };
    }),
  };
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
  reportModel,
  roleLabel,
  durationMinutes,
  timeline,
}: {
  analysis: AnalysisResult | null;
  reportModel: MockInterviewReportModel | null;
  roleLabel: string;
  durationMinutes: 5 | 10 | 15;
  timeline: SessionTimelineEntry[];
}): SessionInterviewDetailModel {
  const aggregatedFeedback = analysis
    ? buildAggregatedFeedback(analysis, roleLabel, durationMinutes)
    : { coreResponses: [] };

  return {
    coreResponses: aggregatedFeedback.coreResponses,
    timelineInsights: timeline.map((item, index) => ({
      ...item,
      recommendedAnswer:
        aggregatedFeedback.coreResponses[index]?.improvedAnswer || buildRecommendedAnswer(item.prompt, roleLabel),
      followUp:
        aggregatedFeedback.coreResponses[index]?.followUp || buildFollowUpQuestion(item.prompt, roleLabel),
    })),
    positioningGuide: reportModel ? buildPositioningGuide(reportModel) : null,
  };
}
