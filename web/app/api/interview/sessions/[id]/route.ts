import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { coerceSessionAnalysisPayload } from "@/lib/interview/report/session-analysis-guard";
import { isValidSessionId } from "@/lib/interview/validation";

export const dynamic = "force-dynamic";

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
 * 면접 세션 상세(리포트) 조회.
 * 목록과 마찬가지로 Render FastAPI를 경유하지 않고 Supabase를 직접 조회한다.
 * 소유권(user_id) 체크로 IDOR 방지, 응답 모양은 기존 FastAPI(get_session_detail)와 동일.
 * (리포트 페이지가 쓰지 않는 debug_events/turns 조회는 생략 — 타임라인은 저장된 report에서 사용)
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }
    const { id } = params;
    if (!isValidSessionId(id)) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    const admin = createAdminSupabaseClient();

    const { data: session, error: sessionError } = await admin
      .from("interview_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    const [reportRes, jobRes] = await Promise.all([
      admin
        .from("interview_reports")
        .select("report_payload, comparison_payload, schema_version, updated_at")
        .eq("session_id", id)
        .maybeSingle(),
      admin
        .from("interview_report_jobs")
        .select("status, attempts, max_attempts, error, requested_at, started_at, completed_at, updated_at")
        .eq("session_id", id)
        .maybeSingle(),
    ]);

    const report = reportRes.data as Record<string, unknown> | null;
    const job = jobRes.data as Record<string, unknown> | null;

    const reportPayload = (report?.report_payload as unknown) ?? {};
    const reportDoc = coerceReportDoc(reportPayload);
    const analysis = coerceSessionAnalysisPayload((reportDoc.compatAnalysis as unknown) ?? reportPayload);
    const timeline = Array.isArray(reportDoc.timeline) ? reportDoc.timeline : [];

    const data = {
      client_uid: session.id,
      session_type: session.session_type ?? "live_interview",
      current_phase: session.current_phase ?? "introduction",
      tail_question_depth: session.tail_question_depth ?? 0,
      target_duration_sec: session.target_duration_sec ?? 420,
      closing_threshold_sec: session.closing_threshold_sec ?? 60,
      closing_announced: Boolean(session.closing_announced),
      runtime_status: session.runtime_status ?? session.status ?? "created",
      live_provider: session.live_provider ?? "gemini-live",
      live_model: session.live_model ?? "",
      paused_duration_sec: Number(session.paused_duration_sec ?? 0),
      report_requested_at: toUnixSeconds(session.report_requested_at),
      report_completed_at: toUnixSeconds(session.report_completed_at),
      job_payload: session.job_payload ?? {},
      resume_payload: session.resume_payload ?? {},
      debug_events: [],
      analysis,
      report_view: reportDoc.reportView ?? null,
      timeline,
      report_generation_meta: reportDoc.generationMeta ?? null,
      comparison_payload: report?.comparison_payload ?? {},
      schema_version: report?.schema_version ?? "",
      reportStatus: (job?.status as string) ?? "",
      reportAttempts: job?.attempts ?? 0,
      reportMaxAttempts: job?.max_attempts ?? 0,
      reportError: (job?.error as string) ?? "",
      reportRequestedAt: toUnixSeconds(job?.requested_at),
      reportStartedAt: toUnixSeconds(job?.started_at),
      reportCompletedAt: toUnixSeconds(job?.completed_at),
      reportUpdatedAt: toUnixSeconds(job?.updated_at),
      planned_questions: session.planned_questions ?? [],
      jd_text: session.jd_text ?? "",
      resume_text: session.resume_text ?? "",
      status: session.status ?? "created",
      mode: session.mode ?? "chat",
      created_at: toUnixSeconds(session.created_at),
    };

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    // DB 에러 원문(스키마/제약 등)을 노출하지 않고 일반화한 메시지만 반환.
    console.error("[interview/sessions GET] failed", error);
    return NextResponse.json({ success: false, error: "Failed to fetch session" }, { status: 500 });
  }
}

/**
 * 면접 세션 삭제.
 * 소유권(user_id) 일치 행만 삭제 → IDOR 방지. 리포트/잡/턴/평가신호/포트폴리오소스는
 * FK가 ON DELETE CASCADE라 세션 행 삭제만으로 함께 정리된다.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }
    const { id } = params;
    if (!isValidSessionId(id)) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    const admin = createAdminSupabaseClient();

    // 본인 소유 행만 지운다. 삭제된 행을 돌려받아 없으면 404(타인/없는 세션).
    const { data: deleted, error: deleteError } = await admin
      .from("interview_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (deleteError) throw deleteError;
    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id } }, { status: 200 });
  } catch (error: unknown) {
    console.error("[interview/sessions DELETE] failed", error);
    return NextResponse.json({ success: false, error: "Failed to delete session" }, { status: 500 });
  }
}
