"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { GlobalHeader } from "@/components/layout/global-header";
import { EvaluationRings } from "@/components/features/interview/training/evaluation-rings";
import { InterviewModeSwitch, type InterviewMode } from "@/components/features/interview/training/interview-mode-switch";
import { LiveKitConnectPanel } from "@/components/features/interview/training/livekit-connect-panel";

const EVALUATION_AXES = [
  { label: "설계 의도 설명", score: 60, hint: "대안 비교와 트레이드오프를 설명하는가" },
  { label: "코드 품질", score: 10, hint: "구조와 유지보수성 근거가 있는가" },
  { label: "AI 활용", score: 30, hint: "도구 사용 + 검증 루프를 설명하는가" },
];

type ChatMessage = {
  role: "interviewer" | "user";
  text: string;
};

function repoMeta(url: string) {
  const normalized = url.replace(/\/+$/, "");
  const parts = normalized.split("/");
  const owner = parts[parts.length - 2] || "owner";
  const repo = parts[parts.length - 1] || "repo";
  return { owner, repo };
}

function defenseFollowup(answer: string): string {
  if (answer.length < 50) {
    return "좋습니다. 이번에는 선택 근거를 비용, 운영 난이도, 장애 복구 관점으로 더 구체화해 주세요.";
  }
  if (!/CI|CD|배포|롤백|모니터링|알림|장애|incident/i.test(answer)) {
    return "좋습니다. CI/CD, 배포 전략, 모니터링, 장애 대응 중 실제로 운영한 항목을 하나 골라 상세히 설명해 주세요.";
  }
  if (!/AI|Copilot|GPT|Claude|Gemini|자동화|프롬프트/i.test(answer)) {
    return "좋습니다. 개발 과정에서 AI를 어떻게 사용했고, 출력 결과를 어떤 방식으로 검증했는지 설명해 주세요.";
  }
  return "좋습니다. 마지막으로 이 설계를 다시 한다면 무엇을 바꾸고 왜 바꿀지 이야기해 주세요.";
}

export default function PortfolioDefenseRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get("repoUrl") || "https://github.com/owner/repo";
  const initialMode = searchParams.get("mode");

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<InterviewMode>(
    initialMode === "video" ? initialMode : "chat",
  );
  const { owner, repo } = useMemo(() => repoMeta(repoUrl), [repoUrl]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "interviewer",
      text: `안녕하세요. ${owner}/${repo} 레포를 바탕으로 디펜스 면접을 시작하겠습니다. 우선 이 아키텍처를 선택한 핵심 이유를 설명해 주세요.`,
    },
  ]);

  const submit = () => {
    const value = input.trim();
    if (!value) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: value },
      { role: "interviewer", text: defenseFollowup(value) },
    ]);
    setInput("");
  };

  const handleModeChange = (nextMode: InterviewMode) => {
    setMode(nextMode);
    router.replace(
      `/interview/training/portfolio/room?repoUrl=${encodeURIComponent(repoUrl)}&mode=${nextMode}`,
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => router.push(`/interview/training/portfolio?repoUrl=${encodeURIComponent(repoUrl)}`)}>
            <ArrowLeft className="mr-2 w-4 h-4" /> 레포 입력으로
          </Button>
          <Badge variant="outline" className="border-primary/20 text-primary capitalize">
            PUBLIC REPO DEFENSE · {mode}
          </Badge>
        </div>

        <section className="grid xl:grid-cols-12 gap-6">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">레포 분석 스냅샷</CardTitle>
              <CardDescription>{repoUrl}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <p className="font-semibold">README 요약</p>
                <p className="text-muted-foreground">
                  프로젝트 목적, 핵심 기능, 실행 방법, 운영 방식이 정리되어 있다고 가정하고 디펜스 질문을 생성합니다.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">폴더 구조 포인트</p>
                <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                  <li>도메인 경계 분리 여부</li>
                  <li>서비스 계층/인프라 계층 분리</li>
                  <li>운영 설정 파일 위치</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">인프라 토픽</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "CI/CD",
                    "배포",
                    "모니터링",
                    "장애대응",
                  ].map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-[10px]">{topic}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-6">
            <CardHeader>
              <CardTitle>포트폴리오 디펜스 면접</CardTitle>
              <CardDescription>
                설계 의도 60 / 코드 품질 10 / AI 활용 30 가중치로 진행됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border p-4">
                <InterviewModeSwitch mode={mode} onModeChange={handleModeChange} />
              </div>

              <div className="h-[420px] overflow-y-auto rounded-xl border p-4 space-y-3">
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
                    placeholder="설계 의도와 운영 근거를 중심으로 답변해보세요..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
                    }}
                  />
                  <Button onClick={submit}><Send className="w-4 h-4" /></Button>
                </div>
              ) : (
                <LiveKitConnectPanel roomBase={`training-defense-${owner}-${repo}`} />
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">실시간 평가 축</CardTitle>
              <CardDescription>근거 기반 답변 여부를 점검합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <EvaluationRings items={EVALUATION_AXES} showHint />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
