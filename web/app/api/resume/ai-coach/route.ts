import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { action, payload, message, backgroundContext } = body;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        if (action === "stadri-structure") {
            const { s, t, a, d, r, i } = payload;

            const prompt = `당신은 최고 수준의 IT 전문 이력서/자기소개서 컨설턴트입니다. 
사용자가 제공한 STADRI(상황, 목표, 행동, 어려움, 결과, 인사이트) 기반의 짧은 메모들을 바탕으로, 채용 담당자를 사로잡을 수 있는 매끄럽고 완성도 높은 하나의 유기적인 스토리텔링 중심의 자기소개서를 새롭게 창작해주세요. 
제시된 키워드를 단순 나열하거나 기계적으로 이어 붙이는 것이 절대 아닙니다!! 
반드시 전문가의 시각에서 문맥을 이해하여, 자연스러운 흐름과 흡입력 있는 문체로 내용을 기승전결이 있는 완전한 글로 '재작성(Rewrite)'해야 합니다.

${backgroundContext ? `[참고용 배경 지식 (사용자가 선택한 경험 상세)]\n${backgroundContext}\n\n*위 배경 지식을 참고하되, 아래의 [사용자 입력 메모]를 중심으로 작성하세요.*` : ""}

[사용자 입력 메모]
- Situation (상황/배경): ${s}
- Task (목표/과제): ${t}
- Action (핵심 행동/해결책): ${a}
- Difficulty (극복 과정): ${d}
- Result (성과): ${r}
- Insight (배운 점): ${i}

[작성 가이드라인 - 엄격히 준수하세요]
1. 출력 제한 (가장 중요!): "물론입니다.", "작성해 드리겠습니다.", "### 완성된 자기소개서 내용" 등과 같은 인사말, 헤더, 부연 설명은 절대 포함하지 마세요. 반드시 바로 자기소개서 본문의 첫 문장으로 시작하고 끝나야 합니다.
2. 분량 및 깊이: 내용을 부풀리거나 지어내지 않되, 입력된 키워드 간의 인과관계를 설명하며 살을 붙여서 구체적으로 작성하세요. 최소 2개의 문단으로 나누어, 총 400~500자 이상의 충분한 깊이가 있는 서술이 되어야 합니다.
3. 어조: 자신감 있고 전문적인 어조 ('~습니다', '~했습니다' 체 사용).
4. 절대 금지: '상황은 ~입니다', '목표는 ~이었습니다' 처럼 STADRI의 각 항목 이름이나 질문 형태를 그대로 노출하여 반복하는 것.
5. 스토리텔링: 어떤 배경과 목표에서 출발했고, 어떤 구체적이고 전문적인 행동으로 난관을 극복했는지, 그리고 그 결과가 비즈니스나 프로젝트의 완성도에 어떻게 기여했는지를 전문가의 뉘앙스로 설득력 있게 풀어내세요.
`;

            const result = await model.generateContentStream(prompt);

            const stream = new ReadableStream({
                async start(controller) {
                    const encoder = new TextEncoder();
                    try {
                        for await (const chunk of result.stream) {
                            const chunkText = chunk.text();
                            controller.enqueue(encoder.encode(chunkText));
                        }
                    } catch (err) {
                        console.error("Streaming error:", err);
                        controller.enqueue(encoder.encode("\n[AI 모델 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.]"));
                    } finally {
                        controller.close();
                    }
                }
            });

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Transfer-Encoding": "chunked",
                },
            });
        }

        if (action === "chat-refine") {
            const { previousContent } = body;
            const refinePrompt = `당신은 최고 수준의 IT 전문 이력서/자기소개서 컨설턴트입니다. 
사용자의 추가 피드백을 바탕으로, 이전에 작성된 자기소개서를 더욱 정교하게 다듬어주세요.

[이전 답변 내용]
${previousContent || "내용 없음"}

[사용자 피드백]
${message}

결과물 가이드라인:
1. **분량 유지**: 이전에 작성된 내용의 깊이와 분량(최소 2문단, 약 500자)을 최대한 유지하거나 더 보강하세요. 피드백을 반영한다고 해서 내용을 대폭 생략하지 마세요.
2. **출력 제한**: 인사말, 헤더("### 수정본" 등), 부연 설명은 절대 포함하지 마세요. 바로 수정된 자기소개서 본문의 첫 문장으로 시작하고 끝나야 합니다.
3. **핵심**: 이전 답변의 훌륭한 문장 구조와 전문성을 보존하면서, 사용자의 피드백 포인트만 자연스럽게 녹여내세요.`;

            const refineResult = await model.generateContentStream(refinePrompt);

            const refineStream = new ReadableStream({
                async start(controller) {
                    const encoder = new TextEncoder();
                    try {
                        for await (const chunk of refineResult.stream) {
                            controller.enqueue(encoder.encode(chunk.text()));
                        }
                    } catch (err) {
                        console.error("Refine streaming error:", err);
                        controller.enqueue(encoder.encode("\n[수정 중 에러가 발생했습니다.]"));
                    } finally {
                        controller.close();
                    }
                }
            });

            return new Response(refineStream, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Transfer-Encoding": "chunked",
                },
            });
        }

        // Standard JSON response for other actions
        return NextResponse.json({
            success: true,
            data: { message: "Action not supported via stream in this route." }
        });

    } catch (error: any) {
        console.error("AI HTTP Endpoint error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to call AI server" },
            { status: 500 }
        );
    }
}
