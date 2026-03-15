import { AnalysisResult } from "@/store/interview-setup-store";

export type SessionAnalysisPayload = AnalysisResult & {
  rubricScores?: Record<string, unknown>;
  summary?: string;
  fitSummary?: string;
  strengths?: string[];
  improvements?: string[];
  nextActions?: string[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeTextList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item || "").trim()).filter(Boolean);
}

export function coerceSessionAnalysisPayload(source: unknown): SessionAnalysisPayload | null {
  if (!source || typeof source !== "object") return null;

  const candidate = source as Partial<SessionAnalysisPayload>;
  const evaluation = candidate.evaluation;
  const feedback = candidate.feedback;
  if (!evaluation || typeof evaluation !== "object" || !feedback || typeof feedback !== "object") {
    return null;
  }

  if (
    !isFiniteNumber(evaluation.jobFit) ||
    !isFiniteNumber(evaluation.logic) ||
    !isFiniteNumber(evaluation.communication) ||
    !isFiniteNumber(evaluation.attitude)
  ) {
    return null;
  }

  return {
    overallScore: isFiniteNumber(candidate.overallScore) ? candidate.overallScore : 0,
    passProbability: isFiniteNumber(candidate.passProbability) ? candidate.passProbability : 0,
    evaluation: {
      jobFit: evaluation.jobFit,
      logic: evaluation.logic,
      communication: evaluation.communication,
      attitude: evaluation.attitude,
    },
    sentimentTimeline: Array.isArray(candidate.sentimentTimeline)
      ? candidate.sentimentTimeline.filter((item): item is number => isFiniteNumber(item))
      : [],
    habits: Array.isArray(candidate.habits)
      ? candidate.habits.map((habit) => ({
          habit: String(habit?.habit || "").trim(),
          count: isFiniteNumber(habit?.count) ? habit.count : 0,
          severity:
            habit?.severity === "high" || habit?.severity === "medium" || habit?.severity === "low"
              ? habit.severity
              : "low",
        }))
      : [],
    feedback: {
      strengths: sanitizeTextList(feedback.strengths),
      improvements: sanitizeTextList(feedback.improvements),
    },
    bestPractices: Array.isArray(candidate.bestPractices)
      ? candidate.bestPractices.map((item) => ({
          question: String(item?.question || "").trim(),
          userAnswer: String(item?.userAnswer || "").trim(),
          refinedAnswer: String(item?.refinedAnswer || "").trim(),
          reason: String(item?.reason || "").trim(),
        }))
      : [],
    rubricScores: candidate.rubricScores,
    summary: typeof candidate.summary === "string" ? candidate.summary : undefined,
    fitSummary: typeof candidate.fitSummary === "string" ? candidate.fitSummary : undefined,
    strengths: sanitizeTextList(candidate.strengths),
    improvements: sanitizeTextList(candidate.improvements),
    nextActions: sanitizeTextList(candidate.nextActions),
  };
}
