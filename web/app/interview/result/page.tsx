"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, FileText, Lightbulb, Loader2, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalHeader } from "@/components/layout/global-header";
import { AxisEvidencePanel } from "@/components/features/interview/report/axis-evidence-panel";
import { AxisProfileBoard } from "@/components/features/interview/report/axis-profile-board";
import { ReportFooterActions } from "@/components/features/interview/report/report-footer-actions";
import { SessionReportHero } from "@/components/features/interview/report/session-report-hero";
import { buildMockInterviewReportModel } from "@/lib/interview/report/mock-interview-report-adapter";
import { DIBEOT_AXES, getAxisLabel } from "@/lib/interview/report/dibeot-axis";
import { MOCK_CHAT_MESSAGES, MOCK_INTERVIEW_LIST } from "@/mocks/interview-data";
import { AnalysisResult, JobData, useInterviewSetupStore } from "@/store/interview-setup-store";

interface SessionDetail {
  analysis?: AnalysisResult & { rubricScores?: Record<string, unknown> };
  created_at?: string | number;
  mode?: string;
  status?: string;
  target_duration_sec?: number;
  job_payload?: {
    role?: string;
    company?: string;
    url?: string;
    source_url?: string;
    original_url?: string;
  };
}

function normalizeAnalysisResult(source: AnalysisResult | (typeof MOCK_INTERVIEW_LIST)[number]["analysis"] | null): AnalysisResult | null {
  if (!source) return null;

  return {
    ...source,
    habits: (source.habits || []).map((habit) => ({
      ...habit,
      severity:
        habit.severity === "high" || habit.severity === "medium" || habit.severity === "low"
          ? habit.severity
          : "low",
    })),
  };
}

function InsightListCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <Card className="rounded-[28px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3 text-sm leading-6 text-foreground">
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
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

function clampSessionDurationMinute(raw: string | null): 5 | 10 | 15 {
  const value = Number(raw);
  if (value === 5 || value === 10 || value === 15) return value;
  return 10;
}

function formatTimelineTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remains = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remains).padStart(2, "0")}`;
}

type TimelineEntry = {
  id: string;
  timeLabel: string;
  phaseLabel: string;
  prompt: string;
  answer: string;
  hasExactTimestamp: boolean;
};

type TimelineInsightEntry = TimelineEntry & {
  recommendedAnswer: string;
  followUp: string;
};

type CoreResponseEntry = {
  label: string;
  timeLabel: string;
  question: string;
  answer: string;
  analysis: string;
  improvedAnswer: string;
  followUp: string;
};

type TimelineMessage = {
  id: string;
  role: "user" | "model";
  text: string;
  timestampMs?: number | null;
};

function resolveDurationMinutes(raw: string | null, targetDurationSec?: number): 5 | 10 | 15 {
  const queryDuration = clampSessionDurationMinute(raw);
  if (raw) return queryDuration;

  const derivedMinute = Math.round((targetDurationSec || 0) / 60);
  if (derivedMinute === 5 || derivedMinute === 10 || derivedMinute === 15) return derivedMinute;

  return queryDuration;
}

function toTimelineMessagesFromHistory(messages: { role: "user" | "model"; parts: string }[]): TimelineMessage[] {
  return messages.map((item, index) => ({
    id: `history-${index}`,
    role: item.role,
    text: item.parts,
  }));
}

function toTimelineMessagesFromMock(): TimelineMessage[] {
  return MOCK_CHAT_MESSAGES.map((item) => ({
    id: item.id,
    role: item.role === "ai" ? "model" : "user",
    text: item.content,
    timestampMs: Date.parse(item.timestamp),
  }));
}

function buildSpeechTimeline(messages: TimelineMessage[], durationMinutes: 5 | 10 | 15): TimelineEntry[] {
  const totalSec = durationMinutes * 60;
  const sanitizedMessages = messages.filter((item) => item.text.trim().length > 0);
  const userMessages = sanitizedMessages.filter((item) => item.role === "user");

  if (userMessages.length === 0) return [];

  const exactTimestamps = sanitizedMessages
    .map((item) => item.timestampMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const hasExactTimestamp = exactTimestamps.length >= 2;
  const firstTimestamp = hasExactTimestamp ? Math.min(...exactTimestamps) : null;
  const lastTimestamp = hasExactTimestamp ? Math.max(...exactTimestamps) : null;
  const recordedSpanSec =
    hasExactTimestamp && firstTimestamp !== null && lastTimestamp !== null
      ? Math.max(1, Math.round((lastTimestamp - firstTimestamp) / 1000))
      : null;
  const scaleRatio =
    recordedSpanSec && recordedSpanSec > totalSec
      ? totalSec / recordedSpanSec
      : 1;

  return userMessages.map((item, index) => {
    const prompt = [...sanitizedMessages]
      .slice(0, sanitizedMessages.findIndex((candidate) => candidate.id === item.id))
      .reverse()
      .find((candidate) => candidate.role === "model")?.text;

    const timeSec =
      hasExactTimestamp && item.timestampMs !== undefined && item.timestampMs !== null && firstTimestamp !== null
        ? Math.min(totalSec, Math.max(0, Math.round(((item.timestampMs - firstTimestamp) / 1000) * scaleRatio)))
        : Math.round(((index + 1) / (userMessages.length + 1)) * totalSec);

    const progress = totalSec > 0 ? timeSec / totalSec : 0;
    const phaseLabel = progress < 0.33 ? "도입" : progress < 0.72 ? "전개" : "마무리";

    return {
      id: item.id,
      timeLabel: formatTimelineTime(timeSec),
      phaseLabel,
      prompt: prompt || "이전 질문 맥락이 없는 응답입니다.",
      answer: item.text,
      hasExactTimestamp,
    };
  });
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

  const coreResponses = merged.map((item, index) => {
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
  });
  return {
    coreResponses,
  };
}

export default function InterviewResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("id");
  const { chatHistory, jobData, resumeData, interviewSessionId, analysisResult, setAnalysisResult, targetUrl } =
    useInterviewSetupStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [selectedCoreResponseIndex, setSelectedCoreResponseIndex] = useState(0);
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState(0);
  const previewSession = !analysisResult && !querySessionId ? MOCK_INTERVIEW_LIST[0] : null;
  const effectiveAnalysis = normalizeAnalysisResult(analysisResult ?? previewSession?.analysis ?? null);
  const sessionDurationMinutes = useMemo(
    () => resolveDurationMinutes(searchParams.get("duration"), sessionDetail?.target_duration_sec),
    [searchParams, sessionDetail?.target_duration_sec],
  );

  useEffect(() => {
    if (querySessionId) {
      const fetchSession = async () => {
        setIsAnalyzing(true);
        try {
          const res = await fetch(`/api/interview/sessions/${querySessionId}`);
          const json = await res.json();
          if (json.success && json.data?.analysis?.rubricScores) {
            router.replace(`/interview/training/portfolio/report?id=${querySessionId}`);
            return;
          }
          if (json.success && json.data) {
            setSessionDetail(json.data as SessionDetail);
            if (json.data.analysis) {
              setAnalysisResult(json.data.analysis as AnalysisResult);
            }
          }
        } catch {
          // ignore and fall back to persisted store data
        } finally {
          setIsAnalyzing(false);
        }
      };

      fetchSession();
      return;
    }

    const fetchAnalysis = async () => {
      if (!chatHistory.length || (analysisResult && !querySessionId)) return;

      setIsAnalyzing(true);
      try {
        const response = await fetch("/api/interview/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatHistory,
            jobData,
            resumeData,
            sessionId: interviewSessionId,
          }),
        });
        const result = await response.json();
        if (result.success) {
          setAnalysisResult(result.data);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Analysis Error:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    fetchAnalysis();
  }, [analysisResult, chatHistory, interviewSessionId, jobData, querySessionId, resumeData, router, setAnalysisResult]);

  const reportModel = useMemo(() => {
    if (!effectiveAnalysis) return null;

    const sessionJob = sessionDetail?.job_payload || {};
    const originalPostingUrl =
      sessionJob.source_url ||
      sessionJob.original_url ||
      sessionJob.url ||
      targetUrl ||
      "";
    const resolvedJobData: JobData | null =
      jobData ||
      (previewSession
        ? ({
            role: previewSession.role,
            company: previewSession.company,
            companyDescription: "",
            teamCulture: [],
            techStack: [],
            responsibilities: [],
            requirements: [],
            preferred: [],
          } as JobData)
        : null) ||
      (sessionJob.role || sessionJob.company
        ? ({
            role: sessionJob.role || "직무 정보 없음",
            company: sessionJob.company || "모의면접",
            companyDescription: "",
            teamCulture: [],
            techStack: [],
            responsibilities: [],
            requirements: [],
            preferred: [],
          } as JobData)
        : null);

    return buildMockInterviewReportModel({
      analysis: effectiveAnalysis,
      jobData: resolvedJobData,
      session: {
        company: sessionJob.company || previewSession?.company,
        role: sessionJob.role || previewSession?.role,
        mode: sessionDetail?.mode || "video",
        createdAt: sessionDetail?.created_at || previewSession?.date,
        status: sessionDetail?.status || "preview",
        originalUrl: originalPostingUrl,
      },
    });
  }, [effectiveAnalysis, jobData, previewSession, sessionDetail, targetUrl]);

  const roleLabel =
    reportModel?.metaItems.find((item) => item.label === "직무")?.value ||
    jobData?.role ||
    previewSession?.role ||
    "개발자";

  const timelineMessages = useMemo(() => {
    if (previewSession) return toTimelineMessagesFromMock();
    if (chatHistory.length > 0) return toTimelineMessagesFromHistory(chatHistory);
    return [];
  }, [chatHistory, previewSession]);

  const sessionTimeline = useMemo(
    () => buildSpeechTimeline(timelineMessages, sessionDurationMinutes),
    [sessionDurationMinutes, timelineMessages],
  );

  const aggregatedFeedback = useMemo(() => {
    if (!effectiveAnalysis) {
      return {
        coreResponses: [],
      };
    }

    return buildAggregatedFeedback(effectiveAnalysis, roleLabel, sessionDurationMinutes);
  }, [effectiveAnalysis, roleLabel, sessionDurationMinutes]);

  const timelineInsights = useMemo<TimelineInsightEntry[]>(() => {
    return sessionTimeline.map((item, index) => ({
      ...item,
      recommendedAnswer:
        aggregatedFeedback.coreResponses[index]?.improvedAnswer || buildRecommendedAnswer(item.prompt, roleLabel),
      followUp:
        aggregatedFeedback.coreResponses[index]?.followUp || buildFollowUpQuestion(item.prompt, roleLabel),
    }));
  }, [aggregatedFeedback.coreResponses, roleLabel, sessionTimeline]);

  const activeCoreResponse =
    aggregatedFeedback.coreResponses[selectedCoreResponseIndex] || aggregatedFeedback.coreResponses[0] || null;
  const activeTimelineInsight =
    timelineInsights[selectedTimelineIndex] || timelineInsights[0] || null;

  const positioningGuide = useMemo(() => {
    if (!reportModel) return null;

    const dominantAxes = DIBEOT_AXES.map((axis) => ({
      ...axis,
      dominant: getAxisLabel(axis.key, reportModel.axes[axis.key]),
    }));

    const strongQuestionTypes = [
      `${dominantAxes[0]?.dominant} 답변이 드러나는 문제 해결 질문`,
      `${dominantAxes[1]?.dominant} 시야가 필요한 시스템/구현 질문`,
      `${dominantAxes[3]?.dominant} 성향이 보이는 협업 또는 실행 질문`,
    ];

    const guideSteps = [
      "답변 첫 문장에서 결론과 선택 이유를 먼저 말합니다.",
      "설계나 구현 중 본인이 직접 판단한 장면을 하나는 반드시 넣습니다.",
      "마지막 한 문장에서는 결과나 배운 점을 개발자 관점으로 연결합니다.",
    ];

    const interviewerImpression = `${reportModel.typeName} 성향은 설계 논리와 실행 감각이 함께 보일 때 가장 설득력 있게 읽힙니다. 개발자 면접에서는 '왜 그렇게 판단했는지'와 '직접 무엇을 했는지'를 같이 보여주는 것이 중요합니다.`;

    return {
      dominantAxes,
      strongQuestionTypes,
      guideSteps,
      interviewerImpression,
    };
  }, [reportModel]);

  useEffect(() => {
    if (selectedCoreResponseIndex >= aggregatedFeedback.coreResponses.length) {
      setSelectedCoreResponseIndex(0);
    }
  }, [aggregatedFeedback.coreResponses.length, selectedCoreResponseIndex]);

  useEffect(() => {
    if (selectedTimelineIndex >= timelineInsights.length) {
      setSelectedTimelineIndex(0);
    }
  }, [selectedTimelineIndex, timelineInsights.length]);

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] text-foreground">
        <GlobalHeader />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center px-6 py-8">
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-bold">면접 결과를 디벗 리포트로 정리하고 있습니다</h2>
            <p className="text-muted-foreground">답변 흐름과 직무 연결성을 다시 읽어 상세 리포트를 생성하는 중입니다.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!reportModel) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] text-foreground">
        <GlobalHeader />
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl items-center justify-center px-6 py-8">
          <Card className="w-full rounded-[30px] border border-[#e7ebf1] bg-white text-center shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <CardContent className="space-y-4 p-8">
              <AlertTriangle className="mx-auto h-10 w-10 text-orange-500" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">분석 데이터가 없습니다.</h2>
                <p className="text-muted-foreground">면접을 마친 뒤 상세 리포트를 확인할 수 있습니다.</p>
              </div>
              <Button className="rounded-full px-6" onClick={() => router.push("/interview")}>
                면접 메인으로 이동
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-foreground">
      <GlobalHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6 md:px-10">
        <Tabs defaultValue="summary" className="space-y-5">
          <TabsList className="h-auto rounded-full bg-transparent p-0 text-foreground">
            <TabsTrigger
              value="summary"
              className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-lg font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              종합 리포트
            </TabsTrigger>
            <TabsTrigger
              value="detail"
              className="ml-8 rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-lg font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              상세 피드백
            </TabsTrigger>
            <TabsTrigger
              value="guide"
              className="ml-8 rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-lg font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              합격 가이드
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6 p-5 md:p-6">
            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.045)] md:p-6">
              <SessionReportHero
                badgeLabel={reportModel.badgeLabel}
                typeName={reportModel.typeName}
                typeLabels={reportModel.typeLabels}
                summary={reportModel.summary}
                fitSummary={reportModel.fitSummary}
                metrics={reportModel.heroMetrics}
                metaItems={reportModel.metaItems}
                embedded
              />
            </section>

            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="mb-5 flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-semibold">면접 타임라인</p>
                  <p className="text-sm text-muted-foreground">
                    {sessionDurationMinutes}분 세션 안에서 내가 어떤 답변을 언제 했는지 시간순으로 정리했습니다.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-4">
                  {timelineInsights.length > 0 ? (
                    <div className="max-h-[560px] overflow-y-auto pr-1">
                      {timelineInsights.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-[44px_10px_minmax(0,1fr)] gap-1.5">
                          <div className="pt-1 text-[11px] font-semibold text-muted-foreground">
                            {item.timeLabel}
                          </div>
                          <div className="flex flex-col items-center">
                            <div className={`mt-1 h-2.5 w-2.5 rounded-full ${selectedTimelineIndex === index ? "bg-primary" : "bg-[#cfd8e3]"}`} />
                            {index !== timelineInsights.length - 1 ? <div className="mt-1 h-full w-px bg-[#dfe6ee]" /> : null}
                          </div>
                          <div className="pb-4">
                            <button
                              type="button"
                              onClick={() => setSelectedTimelineIndex(index)}
                              className={`mt-0.5 w-full border-l-2 pl-3 text-left transition-colors ${
                                selectedTimelineIndex === index
                                  ? "border-primary"
                                  : "border-transparent hover:border-primary/30"
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex justify-start">
                                  <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.04)] ring-1 ring-[#e7ebf1]">
                                    <p className="text-[10px] font-medium text-muted-foreground">질문</p>
                                    <p className="mt-1 truncate text-sm text-foreground">{item.prompt}</p>
                                  </div>
                                </div>

                                <div className="flex justify-end">
                                  <div className="max-w-[92%] rounded-2xl rounded-br-md bg-primary/8 px-3 py-2 ring-1 ring-primary/10">
                                    <p className="text-[10px] font-medium text-muted-foreground">내 답변</p>
                                    <p className="mt-1 truncate text-sm text-foreground">{item.answer}</p>
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[#d8dee8] bg-white px-4 py-6 text-sm leading-6 text-muted-foreground">
                      아직 시간순 발화 로그가 없어 타임라인을 구성하지 못했습니다. 현재는 mock 데이터로만 시각화가 가능합니다.
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-4">
                  {activeTimelineInsight ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-semibold">선택한 응답 가이드</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          왼쪽 타임라인에서 질문 응답을 선택하면, 여기에서 AI 추천 답변과 예상 꼬리 질문을 바로 확인할 수 있습니다.
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-primary/15 bg-white px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">AI 추천 답변</p>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-foreground">{activeTimelineInsight.recommendedAnswer}</p>
                      </div>

                      <div className="rounded-[18px] border border-[#cfe0ff] bg-white px-4 py-4">
                        <div className="flex items-center gap-2">
                          <MessageSquareQuote className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">예상 꼬리 질문</p>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-foreground">{activeTimelineInsight.followUp}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[#d8dee8] bg-white px-4 py-6 text-sm leading-6 text-muted-foreground">
                      타임라인에서 질문 응답을 선택하면, 여기에서 추천 답변과 예상 꼬리 질문을 확인할 수 있습니다.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <AxisProfileBoard axes={reportModel.axes} embedded />
                <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-4">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    <p className="text-lg font-semibold">디벗 유형은 이렇게 읽습니다</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    디벗 성향은 MBTI처럼 네 개의 축을 조합해서 읽습니다. 좋은 유형과 나쁜 유형을 나누는 게 아니라, 이번 면접에서 어떤 개발자처럼 보였는지 해석하는 방식입니다.
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <div className="rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">문제 접근 방식</p>
                      <p className="mt-1 text-muted-foreground">구조형 ↔ 탐색형</p>
                    </div>
                    <div className="rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">사고 범위</p>
                      <p className="mt-1 text-muted-foreground">시스템형 ↔ 구현형</p>
                    </div>
                    <div className="rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">의사결정 전략</p>
                      <p className="mt-1 text-muted-foreground">안정형 ↔ 실험형</p>
                    </div>
                    <div className="rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">실행 방식</p>
                      <p className="mt-1 text-muted-foreground">구축형 ↔ 조정형</p>
                    </div>
                    <div className="rounded-[18px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-foreground">
                      이번 리포트는 이 네 축 조합으로 <span className="font-semibold">{reportModel.typeName}</span> 유형을 읽고 있습니다.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <AxisEvidencePanel items={reportModel.axisEvidence} embedded />
                <InsightListCard
                  title="전달력 / 직무 연결"
                  description="답변 흐름과 개발자 면접 맥락 연결에서 바로 읽히는 포인트입니다."
                  items={reportModel.deliveryInsights}
                />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="detail" className="space-y-6">
            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-semibold">상세 피드백</p>
                  <p className="mt-1 text-sm text-muted-foreground">핵심 질문 응답 5~10개를 골라 질문별로 다시 읽고, 탭마다 하나의 핵심 피드백만 선명하게 제공합니다.</p>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {aggregatedFeedback.coreResponses.map((item, index) => (
                    <button
                      key={`${item.label}-${item.timeLabel}`}
                      type="button"
                      onClick={() => setSelectedCoreResponseIndex(index)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        selectedCoreResponseIndex === index
                          ? "bg-foreground text-background"
                          : "bg-[#fbfcfe] text-muted-foreground ring-1 ring-[#e7ebf1]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {activeCoreResponse ? (
                  <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                          {activeCoreResponse.label}
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground">{activeCoreResponse.timeLabel}</span>
                      </div>
                      <p className="mt-4 text-lg font-semibold text-foreground">{activeCoreResponse.question}</p>

                      <div className="mt-5 rounded-[18px] border border-[#e7ebf1] bg-white px-4 py-4">
                        <p className="text-xs font-medium text-muted-foreground">내 답변</p>
                        <p className="mt-2 text-sm leading-7 text-foreground">{activeCoreResponse.answer}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-[#e7ebf1] bg-[#fbfcfe] p-5">
                        <div className="flex items-center gap-2">
                          <MessageSquareQuote className="h-5 w-5 text-primary" />
                          <p className="text-lg font-semibold">핵심 피드백</p>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-foreground">{activeCoreResponse.analysis}</p>
                      </div>

                      <div className="rounded-[24px] border border-primary/15 bg-primary/5 p-5">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-primary" />
                          <p className="text-lg font-semibold">보완 답변</p>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-foreground">{activeCoreResponse.improvedAnswer}</p>
                      </div>

                      <div className="rounded-[24px] border border-[#cfe0ff] bg-[#f8fbff] p-5">
                        <p className="text-sm font-semibold text-foreground">예상 꼬리 질문</p>
                        <p className="mt-3 text-sm leading-7 text-foreground">{activeCoreResponse.followUp}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="guide" className="space-y-6">
            <section className="rounded-[32px] border border-primary/15 bg-primary/5 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-3">
                  <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/10">
                    개발자 면접 포지셔닝
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">{reportModel.typeName}</h3>
                  <p className="text-sm leading-7 text-foreground">{positioningGuide?.interviewerImpression}</p>
                </div>
                <div className="grid gap-2">
                  {positioningGuide?.dominantAxes.map((axis) => (
                    <div key={axis.key} className="flex items-center justify-between rounded-[16px] bg-white px-4 py-3 ring-1 ring-primary/10">
                      <span className="text-sm text-muted-foreground">{axis.label}</span>
                      <span className="text-sm font-semibold text-foreground">{axis.dominant}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#e7ebf1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <InsightListCard
                  title="이 유형이 잘 보이는 질문"
                  description="동일 직무 비교가 아니라, 현재 성향이 특히 잘 드러나는 질문 장면입니다."
                  items={positioningGuide?.strongQuestionTypes || []}
                />
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                      <p className="text-lg font-semibold">합격 가이드</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">우리 서비스의 4축 결과를 기준으로 다음 면접에서 더 잘 보이는 방법만 정리합니다.</p>
                  </div>
                  <div className="space-y-3">
                    {(positioningGuide?.guideSteps || []).map((step, index) => (
                      <div key={step} className="flex items-start gap-3 rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-6 text-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[20px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        면접관에게 이렇게 보입니다
                      </div>
                      <div className="mt-2 space-y-2 text-sm leading-7 text-muted-foreground">
                        <p>설계와 구현 중 어디에 더 강점이 있는지 일관되게 드러나고 있습니다.</p>
                        <p>개발자 면접에서는 이 성향을 숨기기보다, 실제 사례와 연결해 더 선명하게 보여주는 편이 좋습니다.</p>
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-4">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <FileText className="h-4 w-4 text-primary" />
                        개발자 모의면접 기준 메모
                      </div>
                      <div className="mt-2 space-y-2 text-sm leading-7 text-muted-foreground">
                        <p>우리는 동일 직무 지원자와의 상대 비교나 합격 퍼센타일을 제공하지 않습니다.</p>
                        <p>대신 4축과 디벗 유형을 기준으로, 어떤 개발자처럼 보였는지와 다음 면접에서 더 잘 드러내는 방법에 집중합니다.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <ReportFooterActions
          title="같은 톤으로 다시 연습해볼까요?"
          description="같은 직무로 다시 연습하거나, 전체 인터뷰 분석으로 돌아가 흐름을 확인할 수 있습니다."
          actions={reportModel.footerActions}
        />
      </main>
    </div>
  );
}
