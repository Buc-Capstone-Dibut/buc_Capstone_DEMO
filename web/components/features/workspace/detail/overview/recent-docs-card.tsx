"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type RecentDoc = {
  id: string;
  title: string;
  emoji?: string | null;
  updatedAt?: string | null;
};

interface RecentDocsCardProps {
  projectId: string;
  docs: RecentDoc[];
}

export function RecentDocsCard({ projectId, docs }: RecentDocsCardProps) {
  const router = useRouter();

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              최근 문서
            </CardTitle>
            <CardDescription>
              최근에 정리된 회의록과 작업 문서를 빠르게 확인합니다.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => router.push(`/workspace/${projectId}?tab=docs`)}
          >
            문서 열기
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {docs.length > 0 ? (
          <div className="space-y-3">
            {docs.slice(0, 4).map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => router.push(`/workspace/${projectId}?tab=docs`)}
                className="flex w-full items-start gap-3 rounded-2xl border bg-background p-4 text-left transition-colors hover:bg-muted/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-muted/20 text-lg">
                  {doc.emoji || "📄"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">
                    {doc.title || "제목 없음"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {doc.updatedAt
                      ? `${formatDistanceToNow(new Date(doc.updatedAt), {
                          addSuffix: true,
                          locale: ko,
                        })} 수정`
                      : "수정 시각 없음"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            아직 문서가 없습니다. 회의록이나 기획 문서를 만들면 여기에 표시됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
