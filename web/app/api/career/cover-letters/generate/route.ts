import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { messages, backgroundContext, targetRole, strengths, personalInfo } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ success: false, error: "Invalid messages array" }, { status: 400 });
        }

        const systemPrompt = `당신은 최고 수준의 기업 IT/서비스 직무 자기소개서 전문 컨설턴트입니다. 
당신의 목표는 사용자가 제공한 '완전히 정제되지 않은 날것의 과거 경험들'과 '개인 정보'를 분석하여, 사용자가 지원하고자 하는 직무에 맞게 압도적이고 매력적인 자기소개서를 작성하는 것입니다.

[사용자 기본 정보]
${personalInfo ? JSON.stringify(personalInfo, null, 2) : "정보 없음"}

[지원 직무]
${targetRole || "자유 양식 (특정 직무 없음)"}

[사용자가 강조하고 싶은 점 (강점)]
${strengths || "특별히 강조할 점 없음"}

[과거 경험 상세 내용 (Context)]
${backgroundContext || "경험 데이터 없음"}

[작성 가이드라인]
1. 위 경험 데이터에는 사용자가 과거에 겪은 '상황, 역할, 행동, 어려움, 결과, 배운점(STADRI)' 등이 포함되어 있습니다. 이를 기계적으로 나열하지 말고, '지원 직무(${targetRole || ""})'의 역량과 완벽히 맞아떨어지도록 유기적으로 엮어서 기승전결이 있는 흡입력 있는 스토리텔링으로 작성하세요.
2. 강점(${strengths || ""})이 주어졌다면, 글 전체의 핵심 테마로 삼아 부각시키세요.
3. 자신감 있고 당당하며 전문적인 어투('~습니다', '~했습니다')를 사용하세요. 
4. 사용자의 경험이 돋보일 수 있도록, 성과나 극복 과정에서의 주도성을 강조하세요.
5. "물론입니다.", "작성해 드리겠습니다." 같은 인사말이나 불필요한 서문, 맺음말 없이 첫 문장부터 본론으로 훅(Hook)을 넣으며 시작하세요. (즉, 바로 자기소개서 본문을 출력하세요)`;

        const result = await streamText({
            model: google("gemini-2.5-pro"),
            system: systemPrompt,
            messages,
            temperature: 0.7,
        });

        return result.toTextStreamResponse();

    } catch (error) {
        console.error("Cover Letter Generation Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate cover letter" },
            { status: 500 }
        );
    }
}
