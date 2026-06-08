import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { coerceSessionAnalysisPayload } from "@/lib/interview/report/session-analysis-guard";

export const dynamic = "force-dynamic";

// report_payload(저장된 리포트 JSON)에서 신스키마 문서만 통과. (FastAPI coerce_report_document와 동일)
function coerceReportDoc(payload: unknown): Record<string, unknown> {
  if (
    payload &&
    typeof payload === "object" &&
    "schemaVersion" in (payload as Record<string, unknown>) &&
    "compatAnalysis" in (payload as Record<string, unknown>)
  ) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function toUnixSeconds(value: unknown): number {
  if (!value) return 0;
  const time = new Date(value as string).getTime();
  return Number.isFinite(time) ? Math.floor(time / 1000) : 0;
}

/**
 * 면접 세션 목록 조회.
 * 예전엔 Render의 FastAPI(/v1/interview/sessions)를 경유했지만 — 데이터는 같은
 * Supabase Postgres에 이미 저장돼 있어 불필요한 우회였고 콜드스타트를 유발했다.
 * 이제 BFF가 service-role로 직접 조회한다(서버측 user_id 필터로 본인 데이터만).
 * 응답 모양은 기존 FastAPI 응답과 동일하게 유지(프론트 무변경).
 */
export async function GET(req: Request) {
  try {
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }

    const { searchParams } = new URL(req.url);
    const sessionType = searchParams.get("session_type") ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? "20") || 20, 50);

    const admin = createAdminSupabaseClient();

    let query = admin
      .from("interview_sessions")
      .select(
        "id, session_type, mode, status, personality, current_phase, target_duration_sec, closing_threshold_sec, closing_announced, runtime_status, live_provider, live_model, question_count, job_payload, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sessionType === "live_interview" || sessionType === "portfolio_defense") {
      query = query.eq("session_type", sessionType);
    }

    const { data: sessions, error: sessionsError } = await query;
    if (sessionsError) throw sessionsError;

    const rows = sessions ?? [];
    const ids = rows.map((row) => row.id as string);

    // 리포트 + 리포트잡 상태를 묶어 가져와 메모리 조인(임베드 FK 의존 없음)
    const reportMap = new Map<string, unknown>();
    const statusMap = new Map<string, string>();
    if (ids.length > 0) {
      const [reportsRes, jobsRes] = await Promise.all([
        admin.from("interview_reports").select("session_id, report_payload").in("session_id", ids),
        admin.from("interview_report_jobs").select("session_id, status").in("session_id", ids),
      ]);
      (reportsRes.data ?? []).forEach((r) => reportMap.set(r.session_id as string, r.report_payload));
      (jobsRes.data ?? []).forEach((j) => statusMap.set(j.session_id as string, (j.status as string) ?? ""));
    }

    const data = rows.map((row) => {
      const job = (row.job_payload as Record<string, unknown>) || {};
      const rawReport = reportMap.get(row.id as string) ?? null;
      const reportDoc = coerceReportDoc(rawReport);
      const compatAnalysis = coerceSessionAnalysisPayload(
        (reportDoc.compatAnalysis as unknown) ?? rawReport,
      );

      return {
        id: row.id,
        sessionType: row.session_type ?? "live_interview",
        mode: row.mode ?? "chat",
        status: row.status ?? "created",
        runtimeStatus: row.runtime_status ?? row.status ?? "created",
        personality: row.personality ?? "professional",
        currentPhase: row.current_phase ?? "introduction",
        targetDurationSec: row.target_duration_sec ?? 420,
        closingThresholdSec: row.closing_threshold_sec ?? 60,
        closingAnnounced: Boolean(row.closing_announced),
        liveProvider: row.live_provider ?? "gemini-live",
        liveModel: row.live_model ?? "",
        questionCount: row.question_count ?? 0,
        jobPayload: job,
        company: (job.company as string) ?? "",
        role: (job.role as string) ?? "",
        repoUrl: (job.repoUrl as string) ?? "",
        detectedTopics: job.detectedTopics ?? [],
        interviewType: (job.interviewType as string) ?? "",
        questionFocus: job.questionFocus ?? [],
        reportLens: (job.reportLens as string) ?? "",
        createdAt: toUnixSeconds(row.created_at),
        analysis: compatAnalysis,
        reportView: reportDoc.reportView ?? null,
        timeline: reportDoc.timeline ?? [],
        reportGenerationMeta: reportDoc.generationMeta ?? null,
        schemaVersion: reportDoc.schemaVersion ?? "",
        reportStatus: statusMap.get(row.id as string) ?? "",
      };
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch sessions";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
