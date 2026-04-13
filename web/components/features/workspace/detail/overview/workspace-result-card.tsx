"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  CheckCircle2,
  FileOutput,
  Lock,
  Quote,
} from "lucide-react";
import { format } from "date-fns";

interface WorkspaceResultCardProps {
  lifecycleStatus?: "IN_PROGRESS" | "COMPLETED";
  completedAt?: string | null;
  resultType?: string | null;
  resultLink?: string | null;
  resultNote?: string | null;
}

export function WorkspaceResultCard({
  lifecycleStatus,
  completedAt,
  resultType,
  resultLink,
  resultNote,
}: WorkspaceResultCardProps) {
  const isCompleted = lifecycleStatus === "COMPLETED";

  return (
    <Card className="flex h-full min-h-[280px] max-h-[420px] flex-col border-none bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Lock className="h-5 w-5 text-primary" />
          )}
          {isCompleted ? "프로젝트 결과" : "완료 후 남길 정보"}
        </CardTitle>
        <CardDescription>
          종료 시점의 결과물과 메모가 이 카드에서 바로 보이게 됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border bg-muted/20 p-4">
          <div>
            <div className="text-sm font-medium text-foreground">
              현재 상태
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {isCompleted
                ? completedAt
                  ? `${format(new Date(completedAt), "yyyy.MM.dd")}에 종료됨`
                  : "종료된 프로젝트입니다."
                : "아직 진행 중입니다."}
            </div>
          </div>
          <Badge
            variant="secondary"
            className={
              isCompleted
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }
          >
            {isCompleted ? "완료" : "진행 중"}
          </Badge>
        </div>

        <div className="rounded-2xl border bg-background p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <FileOutput className="h-4 w-4 text-primary" />
            결과 유형
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {resultType ||
              (isCompleted
                ? "결과 유형이 아직 입력되지 않았습니다."
                : "프로젝트를 종료하면 결과 유형이 여기에 기록됩니다.")}
          </p>
        </div>

        <div className="rounded-2xl border bg-background p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Quote className="h-4 w-4 text-primary" />
            회고 메모
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {resultNote ||
              "성과, 회고, 제출 결과를 남겨 두면 종료 후에도 Overview에서 바로 읽을 수 있습니다."}
          </p>
        </div>

        {resultLink && (
          <Button asChild variant="outline" className="w-full justify-between">
            <Link href={resultLink} target="_blank" rel="noreferrer">
              결과물 열기
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
