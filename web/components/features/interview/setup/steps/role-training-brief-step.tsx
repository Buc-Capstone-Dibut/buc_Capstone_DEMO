"use client";

import { ArrowLeft, ArrowRight, Briefcase, Layers3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getRoleTrackFocusAreas,
  getRoleTrackKeywords,
} from "@/lib/interview/role-track";
import { getRoleCategoryById, ROLE_TRACK_CATEGORIES } from "@/lib/interview/role-taxonomy";
import { useInterviewSetupStore } from "@/store/interview-setup-store";

export function RoleTrainingBriefStep() {
  const router = useRouter();
  const { jobData, rolePrepData, setStep } = useInterviewSetupStore();

  if (!jobData || !rolePrepData) {
    return (
      <div className="p-8 text-center">
        <p>직무 설계 정보가 없습니다. 처음 단계부터 다시 진행해주세요.</p>
        <Button onClick={() => setStep("target")} className="mt-4">
          직무 설계로 이동
        </Button>
      </div>
    );
  }

  const category =
    getRoleCategoryById(rolePrepData.categoryId) ??
    ROLE_TRACK_CATEGORIES.find((item) => item.roles.some((role) => role.id === rolePrepData.roleId)) ??
    ROLE_TRACK_CATEGORIES[0];
  const selectedRole = category.roles.find((role) => role.id === rolePrepData.roleId);
  const isCommonTrack = !selectedRole;
  const focusAreas = getRoleTrackFocusAreas(category, selectedRole, rolePrepData.focusAreas);
  const roleKeywords = getRoleTrackKeywords(category, selectedRole).slice(0, isCommonTrack ? 6 : 5);
  const roleTitle = selectedRole?.label ?? `${category.label} 공통 기준`;
  const roleDescription = selectedRole?.description ?? category.description;
  const questionFlowLabel = selectedRole ? "선택한 세부 직무 기준" : `${category.label} 범주의 공통 기준`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 pb-20">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">직무 설정 최종 확인</h1>
        <p className="text-muted-foreground">이 기준으로 바로 화상면접이 시작됩니다.</p>
      </div>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/15">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {category.label}
            </span>
            <CardTitle className="text-xl">{roleTitle}</CardTitle>
          </div>
          <CardDescription className="pt-1">{roleDescription}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 px-6 py-6">
          {isCommonTrack ? (
            <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              세부 직무를 고르지 않아 <span className="font-medium text-foreground">{category.label}</span> 범주의 공통 기준으로 진행됩니다.
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Briefcase className="h-4 w-4 text-primary" />
                직무 설정
              </div>
              <div className="space-y-4 rounded-2xl border border-border/70 bg-background px-4 py-4 text-sm">
                <div>
                  <p className="text-muted-foreground">직무 범주</p>
                  <p className="mt-1 font-medium">{category.label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">세부 직무</p>
                  <p className="mt-1 font-medium">{selectedRole?.label ?? "선택 안 함"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">질문 방식</p>
                  <p className="mt-1 font-medium">{questionFlowLabel}</p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Layers3 className="h-4 w-4 text-primary" />
                면접 기준
              </div>
              <div className="space-y-4 rounded-2xl border border-border/70 bg-background px-4 py-4 text-sm">
                <div>
                  <p className="text-muted-foreground">질문 안내</p>
                  <p className="mt-1 font-medium">{jobData.companyDescription}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">질문 구성</p>
                  <p className="mt-1 font-medium">
                    {selectedRole
                      ? "선택한 역할의 판단 기준과 접근 방식을 중심으로 구성됩니다."
                      : "범주 공통 역량과 기본 판단 기준을 중심으로 구성됩니다."}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="space-y-5 rounded-2xl border border-border/70 bg-background px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers3 className="h-4 w-4 text-primary" />
              생성된 면접 기준
            </div>

            <div>
              <p className="text-sm text-muted-foreground">중점 확인</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {focusAreas.map((item) => (
                  <span key={item} className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">참고 직무 키워드</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roleKeywords.map((item) => (
                  <span key={item} className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-4">
        <Button variant="outline" onClick={() => setStep("target")} className="h-11 rounded-full px-5">
          <ArrowLeft className="mr-2 h-4 w-4" />
          직무 설계로
        </Button>
        <Button onClick={() => router.push("/interview/room/video?duration=7&track=role")} className="h-11 rounded-full px-6">
          화상면접 시작
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
