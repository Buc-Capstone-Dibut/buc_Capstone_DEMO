"use client";

import { useRouter } from "next/navigation";
import { GlobalHeader } from "@/components/layout/global-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ExternalLink, FileSearch, Sparkles } from "lucide-react";

const DIBEOT_AXES = [
  {
    index: "01",
    title: "문제 접근 방식",
    left: "구조형",
    right: "탐색형",
    description: "설계와 분석부터 정리하는지, 실험과 구현으로 먼저 접근하는지를 봅니다.",
  },
  {
    index: "02",
    title: "사고 범위",
    left: "시스템형",
    right: "구현형",
    description: "전체 구조와 시스템 맥락을 보는지, 코드와 기능 구현에 집중하는지를 봅니다.",
  },
  {
    index: "03",
    title: "의사결정 전략",
    left: "안정형",
    right: "실험형",
    description: "리스크를 낮추는 선택을 우선하는지, 빠르게 시도하고 학습하는지를 봅니다.",
  },
  {
    index: "04",
    title: "실행 방식",
    left: "구축형",
    right: "조정형",
    description: "직접 구현으로 밀고 가는지, 구조와 협업을 조율하는지를 봅니다.",
  },
] as const;

const DIBEOT_TYPES = [
  { name: "아키텍트형", combo: "구조형 · 시스템형 · 안정형 · 조정형", summary: "구조 설계와 시스템 안정성을 중시" },
  { name: "시스템 엔지니어형", combo: "구조형 · 시스템형 · 안정형 · 구축형", summary: "설계와 구현을 모두 책임" },
  { name: "전략가형", combo: "구조형 · 시스템형 · 실험형 · 조정형", summary: "시스템 설계와 실험 기반 개선" },
  { name: "혁신 엔지니어형", combo: "구조형 · 시스템형 · 실험형 · 구축형", summary: "설계 기반으로 빠른 구현" },
  { name: "코드 아키텍트형", combo: "구조형 · 구현형 · 안정형 · 조정형", summary: "코드 품질과 구조를 안정 관리" },
  { name: "장인형 개발자", combo: "구조형 · 구현형 · 안정형 · 구축형", summary: "코드 품질과 안정성을 중시" },
  { name: "기술 전략가형", combo: "구조형 · 구현형 · 실험형 · 조정형", summary: "코드 기반 혁신 설계" },
  { name: "실험적 빌더형", combo: "구조형 · 구현형 · 실험형 · 구축형", summary: "코드 중심 실험과 빠른 구현" },
  { name: "운영 설계형", combo: "탐색형 · 시스템형 · 안정형 · 조정형", summary: "운영 경험 기반 시스템 안정화" },
  { name: "인프라 엔지니어형", combo: "탐색형 · 시스템형 · 안정형 · 구축형", summary: "시스템 문제를 직접 해결" },
  { name: "플랫폼 전략형", combo: "탐색형 · 시스템형 · 실험형 · 조정형", summary: "시스템 실험과 플랫폼 설계" },
  { name: "플랫폼 빌더형", combo: "탐색형 · 시스템형 · 실험형 · 구축형", summary: "시스템 실험과 구현을 동시 수행" },
  { name: "운영 개발자형", combo: "탐색형 · 구현형 · 안정형 · 조정형", summary: "실무 문제 해결 중심" },
  { name: "디버깅 전문가형", combo: "탐색형 · 구현형 · 안정형 · 구축형", summary: "문제 해결과 코드 안정화 강점" },
  { name: "스타트업 엔지니어형", combo: "탐색형 · 구현형 · 실험형 · 조정형", summary: "빠른 실험과 협업 중심" },
  { name: "빌더형", combo: "탐색형 · 구현형 · 실험형 · 구축형", summary: "빠르게 만들고 실험하는 유형" },
] as const;

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

        <section className="space-y-6 border-t border-[#eef2f6] pt-10">
          <div className="space-y-3">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              DIBEOT REPORT GUIDE
            </Badge>
            <h2 className="text-3xl font-black tracking-tight">디벗은 면접을 이렇게 읽습니다</h2>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              디벗 리포트는 정답 여부보다 개발자가 어떤 식으로 문제를 접근하고, 어떤 기준으로 판단하고, 어떻게 설명하는지를 4축으로 해석합니다.
              면접이 끝나면 이 조합을 바탕으로 내 개발자 성향과 답변 흐름을 한눈에 볼 수 있게 정리해줍니다.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-[28px] border border-[#e7ebf1] bg-white">
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">리포트에서 중점적으로 보는 것</CardTitle>
                <CardDescription>디벗은 개발자 모의면접답게 답변의 논리와 문제 해결 방식을 중심으로 읽습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <div className="rounded-2xl border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3">
                  <p className="font-semibold text-foreground">1. 문제를 어떻게 접근했는가</p>
                  <p className="mt-1">설계부터 정리했는지, 구현과 실험으로 풀었는지를 봅니다.</p>
                </div>
                <div className="rounded-2xl border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3">
                  <p className="font-semibold text-foreground">2. 어디까지 보며 설명하는가</p>
                  <p className="mt-1">시스템 구조를 보았는지, 구현과 코드 디테일까지 들어갔는지를 봅니다.</p>
                </div>
                <div className="rounded-2xl border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3">
                  <p className="font-semibold text-foreground">3. 어떤 기준으로 결정하는가</p>
                  <p className="mt-1">안정성, 실험성, 협업, 실행 방식 중 무엇을 우선하는지 읽어냅니다.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border border-[#e7ebf1] bg-[#fbfcfe]">
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">4축 구조</CardTitle>
                <CardDescription>각 축은 양 끝의 성향 중 어느 쪽이 더 강하게 드러나는지로 읽습니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {DIBEOT_AXES.map((axis) => (
                  <div key={axis.index} className="rounded-2xl border border-[#e7ebf1] bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold tracking-[0.12em] text-primary">{axis.index}</span>
                      <span className="text-xs text-muted-foreground">
                        {axis.left} ↔ {axis.right}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{axis.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{axis.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl">4축 조합으로 나오는 16가지 개발자 유형</CardTitle>
              <CardDescription>
                면접이 끝나면 4축의 조합을 바탕으로 지금의 답변 성향이 어떤 개발자 유형에 가까운지 리포트에서 안내합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 overflow-hidden rounded-[22px] border border-[#eef2f6]">
              <div className="hidden grid-cols-[88px_190px_minmax(0,1fr)_220px] border-b border-[#eef2f6] bg-[#fbfcfe] px-5 py-3 text-xs font-semibold text-muted-foreground md:grid">
                <span>번호</span>
                <span>유형명</span>
                <span>4축 조합</span>
                <span>설명</span>
              </div>

              <div className="divide-y divide-[#eef2f6]">
                {DIBEOT_TYPES.map((type, index) => (
                  <div key={type.name} className="grid gap-2 px-5 py-4 md:grid-cols-[88px_190px_minmax(0,1fr)_220px] md:items-center">
                    <span className="text-xs font-semibold text-primary">#{index + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{type.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{type.combo}</p>
                    <p className="text-sm text-muted-foreground">{type.summary}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
