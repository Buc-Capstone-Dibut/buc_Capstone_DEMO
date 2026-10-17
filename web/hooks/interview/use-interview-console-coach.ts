"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { createInterviewConsoleCoach, type InterviewConsoleCoach } from "@/lib/interview/console-coaching";

declare global {
  interface Window {
    interviewCoach?: InterviewConsoleCoach;
  }
}

export function useInterviewConsoleCoach(sessionIdRef: RefObject<string>) {
  const coachRef = useRef<ReturnType<typeof createInterviewConsoleCoach> | null>(null);

  useEffect(() => {
    const coach = createInterviewConsoleCoach({
      getSessionId: () => sessionIdRef.current || "",
      async requestAnswer(sessionId, question, signal) {
        const response = await fetch(`/api/interview/sessions/${encodeURIComponent(sessionId)}/model-answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
          signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
        });
        const result = await response.json();
        if (!response.ok || !result.success || typeof result.data?.answer !== "string") {
          throw new Error("모범답변 생성 실패");
        }
        return result.data.answer;
      },
      printAnswer(question, answer) {
        console.group("%c[Debut 면접 코치]", "color: #7c3aed; font-weight: 700;");
        console.info("질문:", question);
        console.info("모범답변:", answer);
        console.groupEnd();
      },
      notify: (message) => console.info(`[Debut 면접 코치] ${message}`),
    });
    coachRef.current = coach;
    window.interviewCoach = coach.commands;
    console.info("[Debut 면접 코치] 자동 모범답변: interviewCoach.start() / 현재 질문: interviewCoach.answer() / 중지: interviewCoach.stop()");
    return () => {
      coach.dispose();
      if (window.interviewCoach === coach.commands) delete window.interviewCoach;
      coachRef.current = null;
    };
  }, [sessionIdRef]);

  const observeQuestion = useCallback((question: string, turnId = "") => coachRef.current?.observeQuestion(question, turnId), []);
  const reset = useCallback(() => coachRef.current?.reset(), []);
  return { observeQuestion, reset };
}
