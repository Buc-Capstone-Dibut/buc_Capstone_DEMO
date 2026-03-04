"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, Clock3, Loader2, Send } from "lucide-react";
import { GlobalHeader } from "@/components/layout/global-header";
import { RubricHelpGuide } from "@/components/features/interview/training/rubric-help-guide";
import { DibutAvatarPanel, type AvatarState } from "@/components/features/interview/avatar/dibut-avatar-panel";
import { LocalCameraPreview } from "@/components/features/interview/local-camera-preview";

const EVALUATION_AXES = [
  {
    label: "설계 의도 설명",
    weight: 60,
    hint: "대안 비교와 트레이드오프를 물어보는 질문 비중이 가장 큽니다.",
    sampleQuestion: "현재 아키텍처를 선택한 이유와 배제한 대안을 설명해 주세요.",
  },
  {
    label: "코드 품질",
    weight: 10,
    hint: "테스트, 유지보수성, 기술부채 관리 근거를 확인하는 질문입니다.",
    sampleQuestion: "리팩토링 우선순위를 한 가지 고른다면 어디를 손보겠습니까?",
  },
  {
    label: "AI 활용",
    weight: 30,
    hint: "AI 사용 결과를 실제로 어떻게 검증하고 통제하는지 확인합니다.",
    sampleQuestion: "AI로 생성한 코드가 안전하다는 것을 어떤 방식으로 검증했나요?",
  },
];

const TOPIC_CHECKLIST = [
  { key: "architecture", label: "아키텍처" },
  { key: "cicd", label: "CI/CD" },
  { key: "deployment", label: "배포 전략" },
  { key: "monitoring", label: "모니터링" },
  { key: "incident-response", label: "장애 대응" },
  { key: "ai-usage", label: "AI 활용 방식" },
];

type ChatMessage = {
  role: "interviewer" | "user";
  parts: string;
};

interface RuntimeMeta {
  targetDurationSec: number;
  closingThresholdSec: number;
  elapsedSec: number;
  remainingSec: number;
  timeProgressPercent: number;
  estimatedTotalQuestions: number;
  questionCount: number;
  isClosingPhase: boolean;
  interviewComplete: boolean;
  finishReason: string;
}

const DEFAULT_TARGET_DURATION_SEC = 7 * 60;

const clampDurationMinute = (raw: string | null): 5 | 7 | 10 => {
  const value = Number(raw);
  if (value === 5 || value === 7 || value === 10) return value;
  return 7;
};

const resolveInterviewMode = (): "video" => "video";

const formatTime = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remains = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remains).padStart(2, "0")}`;
};

function repoMeta(url: string) {
  const normalized = url.replace(/\/+$/, "");
  const parts = normalized.split("/");
  return {
    owner: parts[parts.length - 2] || "owner",
    repo: parts[parts.length - 1] || "repo",
  };
}

export default function PortfolioDefenseRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const repoUrl = searchParams.get("repoUrl") || "https://github.com/owner/repo";
  const sessionId = searchParams.get("sessionId") || "";
  const readmeSummary = searchParams.get("readmeSummary") || "";
  const treeSummary = searchParams.get("treeSummary") || "";
  const detectedTopics = (searchParams.get("detectedTopics") || "").split(",").filter(Boolean);
  const mode = resolveInterviewMode();
  const durationMinutes = clampDurationMinute(searchParams.get("duration"));
  const requestedTargetDurationSec = durationMinutes * 60;
  const isVideo = true;
  const avatarWsUrl = process.env.NEXT_PUBLIC_AI_WS_URL;

  const { owner, repo } = repoMeta(repoUrl);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coveredTopics, setCoveredTopics] = useState<Set<string>>(new Set());
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [runtimeMeta, setRuntimeMeta] = useState<RuntimeMeta>({
    targetDurationSec: requestedTargetDurationSec || DEFAULT_TARGET_DURATION_SEC,
    closingThresholdSec: 60,
    elapsedSec: 0,
    remainingSec: requestedTargetDurationSec || DEFAULT_TARGET_DURATION_SEC,
    timeProgressPercent: 0,
    estimatedTotalQuestions: 6,
    questionCount: 0,
    isClosingPhase: false,
    interviewComplete: false,
    finishReason: "",
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [isLoading, messages.length]);

  useEffect(() => {
    setRuntimeMeta((prev) => ({
      ...prev,
      targetDurationSec: requestedTargetDurationSec || prev.targetDurationSec,
      remainingSec: prev.elapsedSec > 0 ? prev.remainingSec : requestedTargetDurationSec,
    }));
  }, [requestedTargetDurationSec]);

  useEffect(() => {
    if (!sessionId || isComplete) return;
    const timer = setInterval(() => {
      setRuntimeMeta((prev) => {
        if (prev.interviewComplete || prev.remainingSec <= 0) {
          return prev;
        }
        const elapsedSec = Math.min(prev.targetDurationSec, prev.elapsedSec + 1);
        const remainingSec = Math.max(0, prev.remainingSec - 1);
        const timeProgressPercent = Math.max(
          0,
          Math.min(100, Math.round((elapsedSec / Math.max(1, prev.targetDurationSec)) * 100)),
        );
        return {
          ...prev,
          elapsedSec,
          remainingSec,
          timeProgressPercent,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionId, isComplete]);

  // Avatar state transitions
  useEffect(() => {
    if (isLoading) setAvatarState("thinking");
  }, [isLoading]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "interviewer" && !isLoading) {
      setAvatarState("speaking");
      const t = setTimeout(() => setAvatarState("idle"), 2500);
      return () => clearTimeout(t);
    }
  }, [messages, isLoading]);

  // 첫 질문 자동 로드
  useEffect(() => {
    if (hasStarted.current || !sessionId) return;
    hasStarted.current = true;

    const fetchFirstQuestion = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/interview/portfolio/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            messages: [],
            personality: "professional",
            targetDurationSec: requestedTargetDurationSec,
            closingThresholdSec: 60,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "첫 질문 로드 실패");
        setMessages([{ role: "interviewer", parts: data.data.parts }]);
        if (data.meta) {
          setRuntimeMeta((prev) => ({
            ...prev,
            ...data.meta,
            targetDurationSec: Number(data.meta.targetDurationSec ?? prev.targetDurationSec),
            closingThresholdSec: Number(data.meta.closingThresholdSec ?? prev.closingThresholdSec),
            elapsedSec: Number(data.meta.elapsedSec ?? prev.elapsedSec),
            remainingSec: Number(data.meta.remainingSec ?? prev.remainingSec),
            timeProgressPercent: Number(data.meta.timeProgressPercent ?? prev.timeProgressPercent),
            estimatedTotalQuestions: Number(data.meta.estimatedTotalQuestions ?? prev.estimatedTotalQuestions),
            questionCount: Number(data.meta.questionCount ?? prev.questionCount),
            isClosingPhase: Boolean(data.meta.isClosingPhase),
            interviewComplete: Boolean(data.meta.interviewComplete),
            finishReason: String(data.meta.finishReason || ""),
          }));
        }
        if (data.isComplete || data.meta?.interviewComplete) {
          setIsComplete(true);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "면접 시작 오류";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFirstQuestion();
  }, [requestedTargetDurationSec, sessionId]);

  const handleSend = async () => {
    const value = input.trim();
    if (!value || isLoading || isComplete || !sessionId) return;

    const userMsg: ChatMessage = { role: "user", parts: value };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    // 토픽 커버 여부 감지 (단순 키워드 기반)
    const topicKeywords: Record<string, string[]> = {
      architecture: ["아키텍처", "설계", "구조", "레이어", "모노리스", "마이크로서비스"],
      cicd: ["CI", "CD", "파이프라인", "GitHub Actions", "Jenkins", "배포 자동화"],
      deployment: ["배포", "롤백", "블루그린", "카나리", "쿠버네티스", "도커"],
      monitoring: ["모니터링", "알림", "로그", "Grafana", "Prometheus", "APM"],
      "incident-response": ["장애", "인시던트", "대응", "포스트모텀", "복구"],
      "ai-usage": ["AI", "LLM", "GPT", "Claude", "Copilot", "자동화", "프롬프트"],
    };

    setCoveredTopics((prev) => {
      const next = new Set(prev);
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some((kw) => value.includes(kw))) {
          next.add(topic);
        }
      }
      return next;
    });

    try {
      const apiMessages = nextMessages.map((m) => ({
        role: m.role === "interviewer" ? "model" : "user",
        parts: m.parts,
      }));

      const res = await fetch("/api/interview/portfolio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: apiMessages,
          personality: "professional",
          targetDurationSec: runtimeMeta.targetDurationSec || requestedTargetDurationSec,
          closingThresholdSec: runtimeMeta.closingThresholdSec || 60,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "응답 오류");

      setMessages((prev) => [...prev, { role: "interviewer", parts: data.data.parts }]);
      if (data.meta) {
        setRuntimeMeta((prev) => ({
          ...prev,
          ...data.meta,
          targetDurationSec: Number(data.meta.targetDurationSec ?? prev.targetDurationSec),
          closingThresholdSec: Number(data.meta.closingThresholdSec ?? prev.closingThresholdSec),
          elapsedSec: Number(data.meta.elapsedSec ?? prev.elapsedSec),
          remainingSec: Number(data.meta.remainingSec ?? prev.remainingSec),
          timeProgressPercent: Number(data.meta.timeProgressPercent ?? prev.timeProgressPercent),
          estimatedTotalQuestions: Number(data.meta.estimatedTotalQuestions ?? prev.estimatedTotalQuestions),
          questionCount: Number(data.meta.questionCount ?? prev.questionCount),
          isClosingPhase: Boolean(data.meta.isClosingPhase),
          interviewComplete: Boolean(data.meta.interviewComplete),
          finishReason: String(data.meta.finishReason || ""),
        }));
      }
      if (data.isComplete || data.meta?.interviewComplete) setIsComplete(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI 응답 오류";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/interview/training/portfolio?repoUrl=${encodeURIComponent(repoUrl)}&mode=${mode}&duration=${durationMinutes}`,
              )
            }
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> 레포 입력으로
          </Button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge className="bg-primary/15 text-primary border border-primary/25 font-semibold text-xs">
              포트폴리오 디펜스
            </Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/25">
              설계 60pt · 코드 10pt · AI 30pt
            </Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/20">
              {owner}/{repo}
            </Badge>
          </div>
        </div>

        {/* 로컬 카메라 프리뷰 (video 모드일 때만) */}
        {isVideo && (
          <LocalCameraPreview enabled={isVideo} maxHeight={220} />
        )}

        <Card className="border-dashed">
          <CardContent className="pt-5 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Clock3 className="w-4 h-4" />
              <span
                className={
                  runtimeMeta.remainingSec <= 30
                    ? "text-red-500"
                    : runtimeMeta.remainingSec <= 60
                    ? "text-orange-500"
                    : "text-primary"
                }
              >
                {formatTime(runtimeMeta.remainingSec)} / {formatTime(runtimeMeta.targetDurationSec)}
              </span>
            </div>
            <div className="w-full md:max-w-sm space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Time Progress</span>
                <span>{runtimeMeta.timeProgressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${runtimeMeta.timeProgressPercent}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              질문 {runtimeMeta.questionCount}/{runtimeMeta.estimatedTotalQuestions}
            </span>
            {runtimeMeta.isClosingPhase && (
              <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50">
                마무리 단계 진행 중
              </Badge>
            )}
          </CardContent>
        </Card>

        <section className="grid xl:grid-cols-12 gap-6">
          {/* 좌측: 레포 스냅샷 */}
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">레포 분석 스냅샷</CardTitle>
              <CardDescription className="break-all text-xs">{repoUrl}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {readmeSummary && (
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">README 요약</p>
                  <p className="text-muted-foreground leading-relaxed">{readmeSummary}</p>
                </div>
              )}

              {treeSummary && (
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">구조 특징</p>
                  <p className="text-muted-foreground leading-relaxed">{treeSummary}</p>
                </div>
              )}

              {detectedTopics.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">감지된 토픽</p>
                  <div className="flex flex-wrap gap-1">
                    {detectedTopics.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 중앙: 면접 대화 */}
          <Card className="xl:col-span-6 flex flex-col">
            <CardHeader>
              <CardTitle>포트폴리오 디펜스 면접</CardTitle>
              <CardDescription>
                설계 의도 60 / 코드 품질 10 / AI 활용 30 가중치로 진행됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <div
                ref={scrollRef}
                className="flex-1 min-h-[360px] max-h-[480px] overflow-y-auto rounded-xl border p-4 space-y-3"
              >
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 text-foreground"
                      }`}
                    >
                      {message.parts}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/20 px-4 py-3 rounded-2xl border border-dashed border-muted-foreground/20 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      면접관이 질문을 준비하고 있습니다...
                    </div>
                  </div>
                )}

                {isComplete && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm text-center space-y-2">
                    <p className="font-semibold text-primary">포트폴리오 디펜스 면접이 완료되었습니다.</p>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => router.push(`/interview/training/portfolio/report?id=${sessionId}`)}
                      >
                        리포트 보기
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/20 text-primary"
                        onClick={() => router.push("/interview/training")}
                      >
                        훈련 센터로 이동
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              {!isComplete && (
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="설계 의도와 운영 근거를 중심으로 답변해보세요..."
                    disabled={isLoading || isComplete}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend();
                    }}
                  />
                  <Button onClick={handleSend} disabled={isLoading || !input.trim() || isComplete}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 우측: 아바타 + 평가 + 토픽 체크리스트 */}
          <div className="xl:col-span-3 space-y-4">
            <DibutAvatarPanel
              state={avatarState}
              wsUrl={isVideo ? avatarWsUrl : undefined}
              sessionId={sessionId || undefined}
              className="w-full"
            />

            <Card>
            <CardHeader>
              <CardTitle className="text-base">60/10/30 질문 가이드</CardTitle>
              <CardDescription>점수 차트 대신, 현재 면접 질문 출제 방향을 안내합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <RubricHelpGuide items={EVALUATION_AXES} compact />

              <div className="pt-2 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">토픽 체크리스트</p>
                {TOPIC_CHECKLIST.map((t) => (
                  <div
                    key={t.key}
                    className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-colors ${
                      coveredTopics.has(t.key)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${coveredTopics.has(t.key) ? "text-primary" : "text-muted-foreground/30"}`}
                    />
                    {t.label}
                  </div>
                ))}
              </div>

            </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">💡 답변 팁</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• 구체적인 수치/기한을 포함하세요</li>
                  <li>• 배제한 대안 기술과 이유를 설명하세요</li>
                  <li>• AI 결과를 어떻게 검증했는지 언급하세요</li>
                  <li>• 트레이드오프와 선택 근거를 명확히 하세요</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
