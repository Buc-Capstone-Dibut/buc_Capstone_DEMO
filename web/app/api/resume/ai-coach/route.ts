import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

// Helper to simulate streaming for the demo
function createSimulatedStream(text: string) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        async start(controller) {
            const chunks = text.split(" ");
            for (const chunk of chunks) {
                // Add a small delay to simulate generation
                await new Promise((resolve) => setTimeout(resolve, 50));
                controller.enqueue(encoder.encode(chunk + " "));
            }
            controller.close();
        },
    });
}

export async function POST(req: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { action, payload, message, chatHistory } = body;

        // In a real implementation, we would call the AI server with streaming enabled.
        // For the demo, we'll implement streaming and JSON fallbacks.

        if (action === "stadri-structure" || action === "chat-refine") {
            let fullText = "";

            if (action === "stadri-structure") {
                const { s, t, a, d, r, i } = payload;

                // 전문적인 이력서 문구 재구성 로직
                const intro = s ? `${s} 과정에서 ` : "";
                const objective = t ? `${t}이라는 목표를 달성하기 위해 ` : "주도적으로 프로젝트를 이끌며 ";
                const actionStep = a ? `핵심적으로 ${a} 전략을 수립하고 실행하였습니다. ` : "최적의 해결책을 모색하였습니다. ";
                const hurdle = d ? `특히 ${d}와 같은 기술적 난관이 있었으나, 포기하지 않고 분석하여 원인을 규명했습니다. ` : "";
                const achievement = r ? `그 결과, ${r}라는 유의미한 성과를 거둘 수 있었으며 이는 프로젝트의 완성도를 크게 높였습니다. ` : "프로젝트를 안정적으로 완수하는 성과를 냈습니다. ";
                const insight = i ? `이 경험을 통해 ${i}의 중요성을 깊이 체감하였으며, 앞으로도 성과 중심의 개발자로 성장하고자 합니다.` : "";

                const professionalSummary = `[AI 요약: 전문적인 성과 중심 문구로 재작성되었습니다]\n\n${intro}${objective}${actionStep}${hurdle}${achievement}${insight}`;

                fullText = professionalSummary;
            } else if (action === "chat-refine") {
                fullText = `사용자의 피드백("${message}")을 바탕으로 문구를 더욱 정교하게 다듬었습니다.\n\n요청하신 내용을 반영하여 기술적인 구체성과 비즈니스 가치를 동시에 강조하도록 보완했습니다. 현재 문구가 마음에 드시는지 확인 부탁드리며, 추가적인 수정 사항이 있다면 언제든 말씀해주세요.`;
            }

            // Return a streaming response
            return new Response(createSimulatedStream(fullText), {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Transfer-Encoding": "chunked",
                },
            });
        }

        // Standard JSON response for older actions
        let aiResponseData = {};
        switch (action) {
            case "highlight":
                aiResponseData = {
                    suggestions: [
                        "STADRI 구조를 활용하여 경험을 정리하면 더욱 설득력 있는 이력서가 됩니다.",
                        "다양한 팀 협업 경험을 바탕으로 한 커뮤니케이션 능력이 뛰어납니다.",
                        "기술적 도전 과제를 해결하는 과정에서 논리적 사고가 돋보입니다.",
                        "리액트 기반의 프론트엔드 최적화 경험이 다른 후보자 대비 매우 강력합니다."
                    ]
                };
                break;
            case "refine":
                const currentIntro = payload.personalInfo?.intro || "";
                const refinedPayload = JSON.parse(JSON.stringify(payload));
                if (currentIntro) {
                    refinedPayload.personalInfo.intro = currentIntro + " (AI 보정: 전문적인 역량 중심의 소개로 강화됨)";
                }
                aiResponseData = { updatedPayload: refinedPayload };
                break;
            default:
                break;
        }

        return NextResponse.json({
            success: true,
            data: aiResponseData
        });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "AI Coach failed" },
            { status: 500 }
        );
    }
}
