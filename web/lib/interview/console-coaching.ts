export interface InterviewConsoleCoach {
  start(): Promise<string | null>;
  answer(): Promise<string | null>;
  stop(): void;
}

const CLOSING_PATTERNS = ["면접을 마치", "면접은 여기까지", "수고하셨", "고생하셨", "좋은 결과", "참여해 주셔서 감사"];
const QUESTION_PATTERNS = ["?", "？", "말씀해", "설명해", "소개해", "알려주", "들려주", "어떻게", "어떤", "무엇", "왜 ", "경험", "이유", "생각", "수 있나요", "수 있을까요", "인가요", "했나요", "부탁드"];

export function isLikelyInterviewQuestion(question: string): boolean {
  const text = question.replace(/\s+/g, " ").trim();
  return Boolean(text)
    && !CLOSING_PATTERNS.some((pattern) => text.includes(pattern))
    && QUESTION_PATTERNS.some((pattern) => text.includes(pattern));
}

export function createInterviewConsoleCoach({
  getSessionId, requestAnswer, printAnswer, notify,
}: {
  getSessionId: () => string;
  requestAnswer: (sessionId: string, question: string, signal: AbortSignal) => Promise<string>;
  printAnswer: (question: string, answer: string) => void;
  notify: (message: string) => void;
}) {
  let enabled = false;
  let disposed = false;
  let revision = 0;
  let current: { question: string; turnId: string; sessionId: string } | null = null;
  let cached: string | null = null;
  let pending: Promise<string | null> | null = null;
  let controller: AbortController | null = null;

  const cancel = () => {
    revision += 1;
    controller?.abort();
    controller = null;
    pending = null;
  };
  const reset = () => {
    cancel();
    current = null;
    cached = null;
  };
  const answer = (): Promise<string | null> => {
    if (disposed) return Promise.resolve(null);
    const sessionId = getSessionId();
    if (!current || !sessionId || current.sessionId !== sessionId) {
      notify("면접이 시작되고 질문이 나오면 모범답변을 확인할 수 있습니다.");
      return Promise.resolve(null);
    }
    if (pending) return pending;
    const { question } = current;
    if (cached) {
      printAnswer(question, cached);
      return Promise.resolve(cached);
    }
    const requestRevision = revision;
    const abort = new AbortController();
    controller = abort;
    pending = Promise.resolve()
      .then(() => requestAnswer(sessionId, question, abort.signal))
      .then((text) => {
        if (disposed || abort.signal.aborted || revision !== requestRevision || getSessionId() !== sessionId) return null;
        cached = text;
        printAnswer(question, text);
        return text;
      })
      .catch(() => {
        if (!disposed && !abort.signal.aborted && revision === requestRevision) {
          notify("모범답변을 가져오지 못했습니다. interviewCoach.answer()로 다시 시도해 주세요.");
        }
        return null;
      })
      .finally(() => {
        if (revision === requestRevision) {
          pending = null;
          controller = null;
        }
      });
    return pending;
  };
  const commands: InterviewConsoleCoach = {
    start() {
      if (enabled) return pending ?? Promise.resolve(cached);
      enabled = true;
      return answer();
    },
    answer,
    stop() {
      enabled = false;
      cancel();
    },
  };
  return {
    commands,
    observeQuestion(question: string, turnId = "") {
      if (disposed) return;
      const text = question.replace(/\s+/g, " ").trim();
      if (!isLikelyInterviewQuestion(text)) {
        if (CLOSING_PATTERNS.some((pattern) => text.includes(pattern))) reset();
        return;
      }
      const sessionId = getSessionId();
      if (current?.question === text && current.turnId === turnId && current.sessionId === sessionId) return;
      reset();
      current = { question: text, turnId, sessionId };
      if (enabled) void answer();
    },
    reset,
    dispose() {
      commands.stop();
      reset();
      disposed = true;
    },
  };
}
