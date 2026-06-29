export interface RawTurn {
  id: string;
  role: string;
  content: string;
  exchangeIndex: number;
  turnIndex: number;
  createdAt: string; // ISO
}

export interface AnswerSegment {
  id: string;
  exchangeIndex: number;
  question: string;
  answer: string;
  startMs: number;
  endMs: number;
}

const MODEL_ROLES = new Set(["model", "ai", "assistant", "interviewer"]);

export function isModelRole(role: string): boolean {
  return MODEL_ROLES.has(String(role || "").trim().toLowerCase());
}

export function buildAnswerSegments(
  turns: RawTurn[],
  anchorIso: string,
  durationMs: number,
): AnswerSegment[] {
  const anchor = Date.parse(anchorIso);
  if (Number.isNaN(anchor)) return [];

  const sorted = [...turns].sort((a, b) => a.turnIndex - b.turnIndex);

  const findQuestion = (answer: RawTurn): string => {
    const byExchange = sorted.find(
      (t) => isModelRole(t.role) && t.exchangeIndex === answer.exchangeIndex,
    );
    if (byExchange) return byExchange.content;
    let prompt = "";
    for (let i = sorted.indexOf(answer) - 1; i >= 0; i--) {
      if (isModelRole(sorted[i].role)) {
        prompt = sorted[i].content;
        break;
      }
    }
    return prompt;
  };

  const segs: AnswerSegment[] = sorted
    .filter((t) => !isModelRole(t.role))
    .map((ans) => {
      const created = Date.parse(ans.createdAt);
      const startMs = Number.isNaN(created) ? 0 : Math.max(0, created - anchor);
      return {
        id: ans.id,
        exchangeIndex: ans.exchangeIndex,
        question: findQuestion(ans),
        answer: ans.content,
        startMs,
        endMs: 0,
      };
    })
    .sort((a, b) => a.startMs - b.startMs);

  for (let i = 0; i < segs.length; i++) {
    segs[i].endMs = i + 1 < segs.length ? segs[i + 1].startMs : Math.max(durationMs, segs[i].startMs);
  }
  return segs;
}

export interface AnswerFinding {
  strengths?: string[];
  improvements?: string[];
  refinedAnswer?: string | null;
  followUpQuestion?: string | null;
}

export interface AnswerDetail {
  segment: AnswerSegment;
  finding?: AnswerFinding;
}

// 답변 구간(시간순)과 1-base findings 맵을 인덱스로 결합.
export function buildAnswerDetails(
  segments: AnswerSegment[],
  findingsByOrder?: Record<number, AnswerFinding>,
): AnswerDetail[] {
  return segments.map((segment, i) => ({ segment, finding: findingsByOrder?.[i + 1] }));
}
