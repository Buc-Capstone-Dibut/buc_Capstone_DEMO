"use client";

import { useRouter } from "next/navigation";
import { GlobalHeader } from "@/components/layout/global-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ExternalLink, FileSearch, Sparkles } from "lucide-react";

export default function InterviewPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8">
        <div className="space-y-3">
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
            INTERVIEW HUB
          </Badge>
          <h1 className="text-4xl font-black tracking-tight">모의면접 훈련 허브</h1>
          <p className="text-muted-foreground text-lg">
            지원 상황에 맞춰 공고 기반 또는 직무 기반 면접 트랙을 선택하세요.
          </p>
        </div>

        <section className="grid md:grid-cols-2 gap-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <ExternalLink className="w-3.5 h-3.5" />
                공고 기반 모의면접
              </div>
              <CardTitle className="text-2xl">실제 채용공고 맞춤 훈련</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                지원하려는 채용공고 URL을 넣고, JD 요구사항 기준으로 실제 면접처럼 훈련합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                공고 분석 → 이력서 매칭 → 맞춤 질문 생성
              </div>
              <div className="flex gap-2">
                <Button className="rounded-xl" onClick={() => router.push("/interview/posting/setup")}>
                  <FileSearch className="w-4 h-4 mr-2" />
                  공고 기반 시작
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => router.push("/interview/posting/setup?import=active_resume")}
                >
                  이력서 불러오기
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Briefcase className="w-3.5 h-3.5" />
                직무 기반 모의면접
              </div>
              <CardTitle className="text-2xl">목표 직무 중심 훈련</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                특정 공고 없이 직무 범주와 세부 역할을 선택해 핵심 역량을 집중적으로 훈련합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                범주 선택 → 직무 선택 → 역량 중심 질문
              </div>
              <Button className="rounded-xl" onClick={() => router.push("/interview/role/setup")}>
                <Sparkles className="w-4 h-4 mr-2" />
                직무 기반 시작
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="pt-2">
          <Button variant="outline" className="rounded-xl" onClick={() => router.push("/interview/training")}>
            포트폴리오 디펜스 훈련 센터 열기
          </Button>
        </section>
      </main>
    </div>
  );
}
