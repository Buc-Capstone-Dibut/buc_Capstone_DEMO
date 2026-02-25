"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { MOCK_INTERVIEW_LIST } from "@/mocks/interview-data";
import { GlobalHeader } from "@/components/layout/global-header";
import { EvaluationRings } from "@/components/features/interview/training/evaluation-rings";
import { InterviewModeSwitch, type InterviewMode } from "@/components/features/interview/training/interview-mode-switch";
import { LiveKitConnectPanel } from "@/components/features/interview/training/livekit-connect-panel";

const EVALUATION_WEIGHTS = [
  { label: "설계 의도 설명", score: 60 },
  { label: "코드 품질", score: 10 },
  { label: "AI 활용", score: 30 },
];

type ReplayMessage = {
  role: "interviewer" | "user";
  text: string;
};

function aiFollowup(answer: string): string {
  if (answer.length < 40) {
    return "좋습니다. 이번에는 당시의 의사결정 기준을 수치나 근거와 함께 더 구체적으로 설명해 주세요.";
  }
  if (!/\d|%|ms|배|건|명/.test(answer)) {
    return "좋습니다. 성과를 보여주는 지표(예: latency, 비용, 장애 건수)를 포함해서 다시 설명해볼까요?";
  }
  return "좋습니다. 그 선택의 대안은 무엇이었고, 왜 최종안이 더 적합했는지 마지막으로 정리해 주세요.";
}

export default function ReplaySessionPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const initialMode = searchParams.get("mode");
  const [mode, setMode] = useState<InterviewMode>(
    initialMode === "video" ? initialMode : "chat",
  );

  const session = useMemo(
    () => MOCK_INTERVIEW_LIST.find((item) => item.id === params.sessionId),
    [params.sessionId],
  );

  const baseQuestion = session?.analysis.bestPractices[0]?.question || "당시 가장 어려웠던 기술 의사결정 상황을 설명해 주세요.";
  const baseAnswer = session?.analysis.bestPractices[0]?.userAnswer || "(기존 답변 데이터 없음)";

  const [messages, setMessages] = useState<ReplayMessage[]>([
    {
      role: "interviewer",
      text: `리포트 재체험을 시작합니다. 원본 질문입니다: ${baseQuestion}`,
    },
  ]);

  const submit = () => {
    const value = input.trim();
    if (!value) return;

    const next: ReplayMessage[] = [
      ...messages,
      { role: "user", text: value },
      { role: "interviewer", text: aiFollowup(value) },
    ];

    setMessages(next);
    setInput("");
  };

  const handleModeChange = (nextMode: InterviewMode) => {
    setMode(nextMode);
    router.replace(`/interview/training/replay/${params.sessionId}?mode=${nextMode}`);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <GlobalHeader />
        <div className="max-w-3xl mx-auto p-8">
          <Card>
            <CardHeader>
              <CardTitle>세션을 찾을 수 없습니다</CardTitle>
              <CardDescription>목록에서 다시 선택해 주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/interview/training")}>훈련 센터로 이동</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => router.push("/interview/training")}>
            <ArrowLeft className="mr-2 w-4 h-4" /> 훈련 센터
          </Button>
          <Badge variant="outline" className="border-primary/20 text-primary capitalize">
            REPLAY SIMULATION
          </Badge>
        </div>

        <section className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{session.company} · {session.role}</CardTitle>
              <CardDescription>
                원본 질문을 기준으로 같은 맥락에서 다시 면접을 진행합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4 text-sm space-y-2">
                <p className="font-semibold">원본 질문</p>
                <p>{baseQuestion}</p>
                <p className="font-semibold pt-2">원본 답변</p>
                <p className="text-muted-foreground">{baseAnswer}</p>
              </div>

              <div className="rounded-xl border p-4">
                <InterviewModeSwitch mode={mode} onModeChange={handleModeChange} />
              </div>

              <div className="rounded-xl border p-4 h-[320px] overflow-y-auto space-y-3">
                {messages.map((message, idx) => (
                  <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/30"}`}>
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              {mode === "chat" ? (
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="같은 질문에 더 설득력 있게 다시 답해보세요..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
                    }}
                  />
                  <Button onClick={submit}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <LiveKitConnectPanel roomBase={`training-replay-${params.sessionId}`} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> 평가 축
              </CardTitle>
              <CardDescription>이번 재체험은 아래 가중치로 평가됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <EvaluationRings items={EVALUATION_WEIGHTS} />

              <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-muted-foreground">
                종료 시 원본 답변 대비 개선 비교 리포트가 생성됩니다.
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
