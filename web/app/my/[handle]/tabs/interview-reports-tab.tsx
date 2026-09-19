"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Loader2, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InterviewSessionItem {
  id: string;
  sessionType?: "live_interview" | "portfolio_defense";
  company?: string;
  role?: string;
  repoUrl?: string;
  questionCount?: number;
  targetDurationSec?: number;
  createdAt?: number;
  reportStatus?: string;
}

const reportHref = (session: InterviewSessionItem) => {
  if (session.sessionType === "portfolio_defense") {
    return `/interview/training/portfolio/report?id=${encodeURIComponent(session.id)}`;
  }
  const duration = [5, 10, 15].reduce((closest, value) =>
    Math.abs(value - Math.round((session.targetDurationSec || 600) / 60))
      < Math.abs(closest - Math.round((session.targetDurationSec || 600) / 60))
      ? value
      : closest,
  10);
  return `/interview/result?id=${encodeURIComponent(session.id)}&duration=${duration}`;
};

const statusLabel = (status?: string) => {
  if (status === "pending" || status === "running") return "분석 중";
  if (status === "failed") return "분석 실패";
  return "리포트 보기";
};

export function InterviewReportsTab() {
  const [sessions, setSessions] = useState<InterviewSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/interview/sessions?limit=12", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success || !Array.isArray(json.data)) {
          throw new Error(json?.error || "면접 리포트를 불러오지 못했습니다.");
        }
        if (!cancelled) setSessions(json.data);
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "면접 리포트를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        면접 리포트를 불러오는 중입니다.
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed text-center">
        <Video className="h-7 w-7 text-muted-foreground" />
        <p className="mt-3 font-bold">아직 완료한 면접이 없습니다.</p>
        <p className="mt-1 text-sm text-muted-foreground">첫 모의면접을 완료하면 이곳에서 리포트를 확인할 수 있습니다.</p>
        <Button asChild className="mt-5 rounded-full">
          <Link href="/interview">면접 시작하기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/interview/analysis">
            <BarChart3 className="h-4 w-4" />
            전체 면접 분석
          </Link>
        </Button>
      </div>
      <div className="divide-y rounded-2xl border bg-card">
        {sessions.map((session) => {
          const title = session.sessionType === "portfolio_defense"
            ? session.repoUrl?.split("/").filter(Boolean).pop() || "포트폴리오 디펜스"
            : [session.company, session.role].filter(Boolean).join(" · ") || "모의면접";
          const date = session.createdAt
            ? new Date(session.createdAt * 1000).toLocaleDateString("ko-KR")
            : "";
          return (
            <Link
              key={session.id}
              href={reportHref(session)}
              className="group flex items-center gap-4 px-5 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {date}{date && " · "}질문 {session.questionCount || 0}개
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">{statusLabel(session.reportStatus)}</Badge>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
