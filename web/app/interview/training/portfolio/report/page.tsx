"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Circle, Clock3, Loader2, RefreshCw, Target, Video } from "lucide-react";
import { GlobalHeader } from "@/components/layout/global-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RubricHelpGuide } from "@/components/features/interview/training/rubric-help-guide";

type RubricKey = "design_intent" | "code_quality" | "ai_usage";

interface RubricItem {
  raw: number;
  weight: number;
  weighted: number;
  evidence: string;
  confidence: number;
}

interface SessionDetail {
  analysis?: {
    rubricScores?: Record<string, Partial<RubricItem>>;
    totalWeightedScore?: number;
    strengths?: string[];
    improvements?: string[];
    nextActions?: string[];
  };
  debug_events?: Array<{
    summary?: string;
    payload?: {
      role?: string;
    };
  }>;
  target_duration_sec?: number;
  mode?: string;
  status?: string;
  current_phase?: string;
  created_at?: number;
  jd_text?: string;
  reportStatus?: string;
  reportAttempts?: number;
  reportMaxAttempts?: number;
  reportError?: string;
  reportUpdatedAt?: number;
}

const RUBRIC_META: Record<RubricKey, { label: string; weight: number; hint: string }> = {
  design_intent: {
    label: "설계 의도 설명",
    weight: 60,
    hint: "대안 비교와 트레이드오프 근거를 설명했는지",
  },
  code_quality: {
    label: "코드 품질",
    weight: 10,
    hint: "구조화, 테스트, 유지보수 전략을 제시했는지",
  },
  ai_usage: {
    label: "AI 활용",
    weight: 30,
    hint: "AI 사용 + 검증 + 롤백 루프를 설명했는지",
  },
};

const RUBRIC_QUESTION_SAMPLES: Record<RubricKey, string> = {
  design_intent: "이 구조를 선택한 이유와 대안 대비 장단점을 설명해 주세요.",
  code_quality: "코드 품질을 개선하기 위해 지금 가장 먼저 바꿀 부분은 어디인가요?",
  ai_usage: "AI 결과를 실제 반영하기 전에 어떤 검증 절차를 거치나요?",
};

const TOPIC_META: Record<string, { label: string; keywords: string[] }> = {
  architecture: {
    label: "아키텍처",
    keywords: ["아키텍처", "설계", "구조", "레이어", "도메인", "msa", "모노리스"],
  },
  cicd: {
    label: "CI/CD",
    keywords: ["ci", "cd", "pipeline", "깃허브 액션", "github actions", "jenkins", "배포 자동화"],
  },
  deployment: {
    label: "배포 전략",
    keywords: ["배포", "롤백", "카나리", "블루그린", "k8s", "쿠버네티스", "docker", "도커"],
  },
  monitoring: {
    label: "모니터링",
    keywords: ["모니터링", "로그", "알림", "grafana", "prometheus", "apm", "observability"],
  },
  "incident-response": {
    label: "장애 대응",
    keywords: ["장애", "인시던트", "incident", "복구", "포스트모텀", "재발 방지"],
  },
  "ai-usage": {
    label: "AI 활용 방식",
    keywords: ["ai", "llm", "gpt", "claude", "copilot", "프롬프트", "검증", "hallucination"],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function formatDate(ts?: number): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseJdPayload(jdText?: string): Record<string, any> {
  if (!jdText) return {};
  try {
    const parsed = JSON.parse(jdText);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeMode(mode?: string): "voice" | "video" {
  return mode === "video" ? "video" : "voice";
}

function resolveDurationMinute(targetDurationSec?: number): 5 | 7 | 10 {
  if (!targetDurationSec) return 7;
  const minute = Math.round(targetDurationSec / 60);
  if (minute <= 5) return 5;
  if (minute >= 10) return 10;
  return 7;
}

function detectCoveredTopics(events: SessionDetail["debug_events"]): Set<string> {
  const covered = new Set<string>();
  for (const event of events ?? []) {
    if (event.payload?.role !== "user") continue;
    const text = (event.summary || "").toLowerCase();
    if (!text) continue;
    for (const [key, topic] of Object.entries(TOPIC_META)) {
      if (topic.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
        covered.add(key);
      }
    }
  }
  return covered;
}

function extractTurns(events: SessionDetail["debug_events"]) {
  const turns: Array<{ role: "user" | "model"; text: string }> = [];
  for (const event of events ?? []) {
    const role = event.payload?.role;
    if (role !== "user" && role !== "model") continue;
    const text = (event.summary || "").trim();
    if (!text) continue;
    turns.push({ role, text });
  }
  return turns;
}

export default function PortfolioDefenseReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id") ?? "";

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!sessionId) {
        setError("세션 ID가 없습니다.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/interview/sessions/${sessionId}`);
        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error || "세션 정보를 불러오지 못했습니다.");
        }
        setDetail(json.data as SessionDetail);
      } catch (err: any) {
        setError(err.message || "리포트를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !detail) return;
    if (!detail.reportStatus || !["pending", "running"].includes(detail.reportStatus)) return;

    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/interview/sessions/${sessionId}`, { cache: "no-store" });
        const json = await res.json();
        if (json.success && json.data) {
          setDetail(json.data as SessionDetail);
        }
      } catch {
        // polling 실패는 다음 주기에서 재시도
      }
    }, 5000);

    return () => window.clearInterval(id);
  }, [sessionId, detail]);

  const jdPayload = useMemo(() => parseJdPayload(detail?.jd_text), [detail?.jd_text]);
  const repoUrl = typeof jdPayload.repoUrl === "string" ? jdPayload.repoUrl : "";
  const mode = normalizeMode(detail?.mode);
  const durationMinute = resolveDurationMinute(detail?.target_duration_sec);

  const rubric = useMemo(() => {
    const source = detail?.analysis?.rubricScores || {};
    const keys: RubricKey[] = ["design_intent", "code_quality", "ai_usage"];
    return keys.map((key) => {
      const fallbackWeight = RUBRIC_META[key].weight;
      const raw = clamp(Number(source[key]?.raw ?? 0), 0, 100);
      const weight = clamp(Number(source[key]?.weight ?? fallbackWeight), 0, 100);
      const weighted = clamp(
        Number(source[key]?.weighted ?? (raw * weight) / 100),
        0,
        fallbackWeight,
      );
      return {
        key,
        label: RUBRIC_META[key].label,
        hint: RUBRIC_META[key].hint,
        raw,
        weight,
        weighted,
        evidence: String(source[key]?.evidence ?? ""),
        confidence: clamp(Number(source[key]?.confidence ?? 0), 0, 1),
      };
    });
  }, [detail?.analysis?.rubricScores]);

  const totalWeightedScore = useMemo(() => {
    const fromPayload = Number(detail?.analysis?.totalWeightedScore ?? NaN);
    if (Number.isFinite(fromPayload)) return clamp(fromPayload, 0, 100);
    return rubric.reduce((sum, item) => sum + item.weighted, 0);
  }, [detail?.analysis?.totalWeightedScore, rubric]);

  const strengths = detail?.analysis?.strengths ?? [];
  const improvements = detail?.analysis?.improvements ?? [];
  const nextActions = detail?.analysis?.nextActions ?? [];

  const coveredTopics = useMemo(() => detectCoveredTopics(detail?.debug_events), [detail?.debug_events]);
  const expectedTopics = useMemo(() => {
    const fromPayload = Array.isArray(jdPayload.detectedTopics)
      ? jdPayload.detectedTopics.filter((key: unknown): key is string => typeof key === "string")
      : [];
    const normalized = fromPayload.filter((key) => key in TOPIC_META);
    if (normalized.length > 0) return Array.from(new Set(normalized));
    return Object.keys(TOPIC_META);
  }, [jdPayload.detectedTopics]);

  const coveredCount = expectedTopics.filter((key) => coveredTopics.has(key)).length;
  const coverageRatio = expectedTopics.length > 0 ? coveredCount / expectedTopics.length : 0;
  const turns = useMemo(() => extractTurns(detail?.debug_events), [detail?.debug_events]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            포트폴리오 디펜스 리포트를 불러오는 중입니다...
          </div>
        </main>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        <main className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-8 space-y-6">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>리포트를 불러올 수 없습니다.</CardTitle>
              <CardDescription>{error || "세션 상세 정보를 찾을 수 없습니다."}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/interview/training")}>
                훈련 센터로 이동
              </Button>
              <Button onClick={() => window.location.reload()}>
                다시 시도
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const hasRubricReport = rubric.some((item) => item.weighted > 0 || item.raw > 0 || item.evidence);
  const reportStatus = detail.reportStatus || "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.push("/interview/training")}>
            <ArrowLeft className="mr-2 w-4 h-4" /> 훈련 센터
          </Button>
          <Badge variant="outline" className="border-primary/20 text-primary">
            PORTFOLIO DEFENSE REPORT
          </Badge>
        </div>

        {["pending", "running"].includes(reportStatus) && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary">AI 리포트 생성 중...</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                평가 분석이 진행 중입니다. 페이지는 자동으로 갱신됩니다.
                {detail.reportAttempts != null && detail.reportMaxAttempts != null && (
                  <span className="ml-1">({detail.reportAttempts}/{detail.reportMaxAttempts}회 확인)</span>
                )}
              </p>
            </div>
          </div>
        )}

        <Card className="border-2">
          <CardContent className="pt-6 pb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="w-4 h-4" />
                {formatDate(detail.created_at)}
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                포트폴리오 디펜스 점수{" "}
                <span className="text-primary">{Math.round(totalWeightedScore)} / 100</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                설계 의도 60 / 코드 품질 10 / AI 활용 30 가중치로 계산됩니다.
              </p>
              {repoUrl && (
                <p className="text-sm text-muted-foreground break-all">
                  대상 레포: {repoUrl}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {mode === "video" ? <Video className="mr-1.5 w-3.5 h-3.5" /> : <Circle className="mr-1.5 w-3.5 h-3.5" />}
                {mode === "video" ? "화상" : "음성"}
              </Badge>
              <Badge variant="outline">{detail.status || "completed"}</Badge>
              <Badge variant="outline">{detail.current_phase || "closing"}</Badge>
            </div>
          </CardContent>
        </Card>

        {!hasRubricReport && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>아직 디펜스 분석이 완료되지 않았습니다.</CardTitle>
              <CardDescription>
                {reportStatus === "failed"
                  ? `리포트 생성이 실패했습니다. ${detail.reportError || ""}`
                  : "세션 종료 직후 분석이 지연될 수 있습니다. 잠시 후 다시 확인해주세요."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 w-4 h-4" />
                새로고침
              </Button>
              <Button
                onClick={() =>
                  router.push(
                    `/interview/training/portfolio/room?sessionId=${encodeURIComponent(sessionId)}&mode=${mode}&duration=${durationMinute}${repoUrl ? `&repoUrl=${encodeURIComponent(repoUrl)}` : ""}`,
                  )
                }
              >
                세션으로 복귀
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="grid xl:grid-cols-12 gap-6">
          <Card className="xl:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">60/10/30 질문 가이드</CardTitle>
              <CardDescription>
                점수 그래프 대신, 실제 면접에서 어떤 질문이 나오는지 요약해 보여줍니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <RubricHelpGuide
                items={rubric.map((item) => ({
                  label: item.label,
                  weight: RUBRIC_META[item.key].weight,
                  hint: item.hint,
                  sampleQuestion: RUBRIC_QUESTION_SAMPLES[item.key],
                }))}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">토픽 커버리지</CardTitle>
              <CardDescription>
                디펜스 답변에서 다룬 핵심 주제의 비율입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Coverage</span>
                  <span>{Math.round(coverageRatio * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.round(coverageRatio * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {coveredCount} / {expectedTopics.length} topics
                </p>
              </div>

              <div className="space-y-2">
                {expectedTopics.map((key) => {
                  const label = TOPIC_META[key]?.label || key;
                  const hit = coveredTopics.has(key);
                  return (
                    <div
                      key={key}
                      className={`rounded-lg border px-3 py-2 text-sm flex items-center justify-between ${
                        hit ? "border-primary/30 bg-primary/5" : "border-muted"
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`text-xs font-semibold ${hit ? "text-primary" : "text-muted-foreground"}`}>
                        {hit ? "Covered" : "Missed"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">다음 액션</CardTitle>
              <CardDescription>
                다음 디펜스 면접에서 바로 적용할 실천 항목입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">강점</p>
                {(strengths.length > 0 ? strengths : ["강점 분석 데이터가 없습니다."]).map((item, idx) => (
                  <div key={`${item}-${idx}`} className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 text-sm">
                    {item}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">개선 포인트</p>
                {(improvements.length > 0 ? improvements : ["개선 포인트 데이터가 없습니다."]).map((item, idx) => (
                  <div key={`${item}-${idx}`} className="rounded-lg bg-muted/30 border px-3 py-2 text-sm">
                    {item}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">실행 액션</p>
                {(nextActions.length > 0 ? nextActions : ["다음 면접 전 체크리스트를 직접 작성해보세요."]).map((item, idx) => (
                  <div key={`${item}-${idx}`} className="rounded-lg border-dashed border px-3 py-2 text-sm">
                    {idx + 1}. {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">근거 스냅샷</CardTitle>
            <CardDescription>각 평가 축의 근거 문장과 신뢰도를 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            {rubric.map((item) => (
              <div key={item.key} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{item.label}</p>
                  <Badge variant="outline">{toPercent(item.confidence)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.evidence || "근거 데이터 없음"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">면접 대화 요약</CardTitle>
            <CardDescription>질문/답변 흐름의 주요 장면입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {turns.length === 0 ? (
              <p className="text-sm text-muted-foreground">대화 로그가 아직 없습니다.</p>
            ) : (
              turns.slice(-8).map((turn, idx) => (
                <div key={`${turn.role}-${idx}`} className="rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold">{turn.role === "model" ? "면접관" : "지원자"}</span>
                    <span className="text-muted-foreground">#{Math.max(1, turns.length - 7 + idx)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{turn.text}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> 다음 훈련으로 이어가기
            </CardTitle>
            <CardDescription>
              같은 레포로 즉시 재도전하거나 다른 레포로 새 디펜스를 시작할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                router.push(
                  `/interview/training/portfolio?mode=${mode}&duration=${durationMinute}${repoUrl ? `&repoUrl=${encodeURIComponent(repoUrl)}` : ""}`,
                )
              }
            >
              같은 레포로 다시 디펜스 <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => router.push("/interview/training")}>
              다른 레포로 시작
            </Button>
            <Button variant="ghost" onClick={() => router.push("/interview/setup")}>
              일반 모의면접으로 이동
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
