"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Share2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  RadialBarChart,
  RadialBar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { useInterviewSetupStore } from "@/store/interview-setup-store";

export default function InterviewResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("id");
  const {
    chatHistory,
    jobData,
    resumeData,
    interviewSessionId,
    analysisResult,
    setAnalysisResult,
  } = useInterviewSetupStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // If sessionId is provided via query, fetch from the API
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
          if (json.success && json.data?.analysis) {
            setAnalysisResult(json.data.analysis as any);
          }
        } catch {
          // ignore — fallback to existing store value
        } finally {
          setIsAnalyzing(false);
        }
      };
      fetchSession();
      return;
    }

    const fetchAnalysis = async () => {
      // If no history or already analyzed, skip
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
  }, [chatHistory, analysisResult, jobData, resumeData, interviewSessionId, setAnalysisResult, querySessionId]);

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <h2 className="text-2xl font-bold">면접 내용을 분석 중입니다...</h2>
        <p className="text-muted-foreground">
          AI가 면접 답변을 검토하여 상세 리포트를 생성하고 있습니다. 잠시만 기다려 주세요.
        </p>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-orange-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">분석 데이터가 없습니다.</h1>
        <p className="text-muted-foreground mb-6">
          면접을 마친 후에 분석 결과를 확인할 수 있습니다.
        </p>
        <Button onClick={() => router.push("/interview")}>메인으로 돌아가기</Button>
      </div>
    );
  }

  const radialData = [
    { name: "직무적합도", score: analysisResult.evaluation.jobFit, fill: "hsl(var(--primary))" },
    { name: "논리력", score: analysisResult.evaluation.logic, fill: "hsl(var(--primary) / 0.8)" },
    { name: "전달력", score: analysisResult.evaluation.communication, fill: "hsl(var(--primary) / 0.6)" },
    { name: "태도", score: analysisResult.evaluation.attitude, fill: "hsl(var(--primary) / 0.4)" },
  ];

  const timelineData = analysisResult.sentimentTimeline.map((score, i) => ({
    index: i + 1,
    sentiment: score,
  }));

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="h-16 border-b flex items-center px-6 justify-between bg-card sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/interview")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">면접 결과 리포트</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" /> 공유
          </Button>
          <Button variant="default" size="sm">
            <Download className="w-4 h-4 mr-2" /> PDF 저장
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-10">
        {/* Overall Score */}
        <div className="text-center py-10 space-y-4 bg-muted/20 rounded-3xl border border-dashed">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
          >
            <Badge className="mb-4 text-base px-5 py-2 bg-primary/10 text-primary border-primary/20">
              <Sparkles className="w-4 h-4 mr-2" /> 예상 합격 확률{" "}
              {analysisResult.passProbability}%
            </Badge>
            <h2 className="text-5xl font-black tracking-tighter">
              종합 점수{" "}
              <span className="text-primary">{analysisResult.overallScore}점</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg leading-relaxed px-4">
              {analysisResult.feedback.strengths[0]} 장점이 돋보이는 면접이었습니다. 다만{" "}
              {analysisResult.feedback.improvements[0]} 부분을 보완하면 훨씬 완벽한 지원자가 될 것입니다.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 italic font-serif">
                <TrendingUp className="w-5 h-5 text-primary" /> 역량별 상세 지표
              </CardTitle>
              <CardDescription>
                지원자의 핵심 역량을 4가지 차원에서 분석했습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="25%"
                  outerRadius="95%"
                  barSize={25}
                  data={radialData}
                >
                  <RadialBar
                    background
                    dataKey="score"
                    cornerRadius={15}
                    label={{ position: "insideStart", fill: "#fff" }}
                  />
                  <Legend
                    iconSize={12}
                    layout="vertical"
                    verticalAlign="middle"
                    wrapperStyle={{ right: 0 }}
                  />
                  <Tooltip contentStyle={{ borderRadius: "12px" }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 italic font-serif">
                <TrendingUp className="w-5 h-5 text-primary" /> 감정/태도 변화 (Timeline)
              </CardTitle>
              <CardDescription>
                면접 시간 흐름에 따른 자신감 및 긍정 수치 변화입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="index" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="sentiment"
                    stroke="hsl(var(--primary))"
                    strokeWidth={4}
                    dot={{ r: 6, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 8, stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-4 px-4 font-bold uppercase tracking-widest">
                <span>초반 (긴장)</span>
                <span>중반 (안정)</span>
                <span>후반 (마무리)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Habits + 총평 */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-2 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">무의식적 언어 습관</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysisResult.habits.length > 0 ? (
                analysisResult.habits.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          h.severity === "high"
                            ? "destructive"
                            : h.severity === "medium"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {h.severity.toUpperCase()}
                      </Badge>
                      <span className="font-semibold">"{h.habit}" 사용</span>
                    </div>
                    <span className="text-sm font-medium">{h.count}회 감지됨</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm italic py-4">
                  감지된 불필요한 언어 습관이 없습니다. 아주 깔끔한 화법을 유지하셨습니다!
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-md bg-primary/5 border-primary/10">
            <CardContent className="py-6 px-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" /> 면접관의 총평
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">강점</p>
                  {(analysisResult.feedback.strengths.length > 0
                    ? analysisResult.feedback.strengths
                    : ["강점 데이터 없음"]
                  ).slice(0, 3).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                      <span className="leading-relaxed text-foreground">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">개선 포인트</p>
                  {(analysisResult.feedback.improvements.length > 0
                    ? analysisResult.feedback.improvements
                    : ["개선 포인트 데이터 없음"]
                  ).slice(0, 3).map((imp, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-orange-400 shrink-0" />
                      <span className="leading-relaxed text-foreground">{imp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Best Practice Section */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black italic border-b-4 border-primary inline-block pb-1">
            AI 답변 정밀 처방전
          </h3>

          <div className="space-y-8">
            {analysisResult.bestPractices.map((bp, i) => (
              <div
                key={i}
                className="grid md:grid-cols-2 gap-0 bg-card border rounded-3xl overflow-hidden shadow-sm"
              >
                {/* 왼쪽: 질문 + 지원자 답변 */}
                <div className="p-6 md:p-8 space-y-4 flex flex-col border-r bg-muted/5 font-sans">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">
                      핵심 질문
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/20">
                      Q.{i + 1}
                    </Badge>
                  </div>
                  <h4 className="text-base font-bold leading-snug">{bp.question}</h4>
                  <div className="mt-auto space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                      지원자의 답변
                    </span>
                    <p className="text-sm text-muted-foreground bg-background p-4 rounded-xl border border-dashed italic leading-relaxed">
                      "{bp.userAnswer}"
                    </p>
                  </div>
                </div>

                {/* 오른쪽: AI 개선 답변 + 핵심 개선 포인트 */}
                <div className="p-6 md:p-8 space-y-4 bg-primary/5 font-sans flex flex-col">
                  <Badge className="w-fit bg-green-100 text-green-700 hover:bg-green-100 border-none flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI 추천 우수 답변
                  </Badge>
                  <div className="p-5 bg-background border-2 border-primary/20 border-l-4 border-l-primary/60 rounded-2xl text-sm leading-relaxed text-foreground shadow-sm relative flex-1">
                    <div className="absolute top-3 right-3 text-primary/15">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    {bp.refinedAnswer}
                  </div>
                  <div className="border-l-4 border-amber-400/70 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-r-xl text-xs space-y-1">
                    <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1.5 uppercase tracking-widest text-[10px]">
                      핵심 개선 포인트
                    </span>
                    <p className="text-amber-800 dark:text-amber-300 leading-relaxed font-medium">{bp.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-10" />

        <div className="flex justify-end gap-3 px-4">
          <Button
            variant="outline"
            className="px-8 h-12"
            onClick={() => router.push("/interview/training")}
          >
            훈련 센터로 이동
          </Button>
          {!querySessionId && (
            <Button
              variant="outline"
              className="px-8 h-12"
              onClick={() => {
                setAnalysisResult(null as any);
                window.location.reload();
              }}
            >
              다시 분석하기
            </Button>
          )}
          <Button
            size="lg"
            className="px-10 h-12 text-base font-bold shadow-xl shadow-primary/20 transition-transform active:scale-95"
            onClick={() => router.push(querySessionId ? "/interview/analysis" : "/interview")}
          >
            {querySessionId ? "목록으로 돌아가기" : "메인 화면으로"}
          </Button>
        </div>
      </main>
    </div>
  );
}
