import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { generateGeminiText } from "@/lib/ai/gemini-text";
import { isValidSessionId } from "@/lib/interview/validation";
import { buildInterviewAnswerPrompt, getSupportingPortfolioIds, normalizeInterviewAnswer } from "@/lib/interview/model-answer";

export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getInterviewRouteUserId();
    if (!userId) return unauthorizedInterviewResponse();
    if (!isValidSessionId(params.id)) return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    const body = await req.json().catch(() => null);
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question || question.length > 2000) {
      return NextResponse.json({ success: false, error: "현재 면접 질문을 확인해 주세요." }, { status: 400 });
    }
    const admin = createAdminSupabaseClient();
    const { data: session, error } = await admin.from("interview_sessions")
      .select("session_type, job_payload, resume_payload").eq("id", params.id).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!session) return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });

    const portfolioIds = getSupportingPortfolioIds(session.job_payload);
    const [sourceResult, portfoliosResult] = await Promise.all([
      session.session_type === "portfolio_defense"
        ? admin.from("portfolio_sources").select("repo_url, readme_snapshot, tree_snapshot, infra_files_snapshot").eq("session_id", params.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      portfolioIds.length
        ? admin.from("user_portfolios").select("title, document_payload, source_snapshot, public_summary").eq("user_id", userId).in("id", portfolioIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (sourceResult.error) throw sourceResult.error;
    if (portfoliosResult.error) throw portfoliosResult.error;
    const answer = normalizeInterviewAnswer(await generateGeminiText({
      model: "gemini-2.5-flash",
      prompt: buildInterviewAnswerPrompt({ question, session, portfolioSource: sourceResult.data, portfolios: portfoliosResult.data ?? [] }),
      disableThinking: true,
      maxOutputTokens: 768,
      maxRetries: 0,
      abortSignal: AbortSignal.any([req.signal, AbortSignal.timeout(20_000)]),
    }));
    return NextResponse.json({ success: true, data: { answer } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    console.error("[interview/model-answer] generation failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ success: false, error: timedOut ? "모범답변 생성 시간이 초과되었습니다." : "모범답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: timedOut ? 504 : 500 });
  }
}
