
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface InterviewContext {
    jobData: {
        role: string;
        company: string;
        companyDescription: string;
        responsibilities: string[];
        requirements: string[];
        techStack: string[];
    };
    resumeData: any;
    personality: string; // 'professional' | 'friendly' | 'cold'
}

export class InterviewLogic {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-pro as we found gemini-1.5-flash wasn't working in current SDK config
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    private constructSystemPrompt(context: InterviewContext): string {
        const { jobData, resumeData, personality } = context;

        let toneDescription = "";
        switch (personality) {
            case 'friendly':
                toneDescription = "부드럽고 따뜻한 말투로 지원자의 긴장을 풀어주며, 격려하는 분위기를 조성하세요. 존댓말을 사용하세요.";
                break;
            case 'cold':
                toneDescription = "냉철하고 날카로운 말투로 질문하세요. 답변의 허점을 찌르는 꼬리 질문을 적극적으로 던지며, 실무에서의 압박 면접 분위기를 조성하세요.";
                break;
            default: // professional
                toneDescription = "전문적이고 구조화된 면접관의 자세를 유지하세요. 명확하고 군더더기 없는 표현으로 역량을 검증하세요.";
        }

        return `
    당신은 숙련된 기술 면접관입니다. 지원자와의 1:1 채팅 면접을 진행하고 있습니다.
    
    [기업 정보]
    회사명: ${jobData.company}
    직무: ${jobData.role}
    회사 소개: ${jobData.companyDescription}
    주요 업무: ${jobData.responsibilities.join(", ")}
    기술 스택: ${jobData.techStack.join(", ")}

    [지원자 이력서 요약]
    ${JSON.stringify(resumeData)}

    [면접관 성격 및 톤]
    ${toneDescription}

    [면접 규칙]
    1. 이력서와 공고 내용을 바탕으로 실무 역량을 검증할 수 있는 질문을 한 번에 하나씩만 던지세요.
    2. 지원자의 답변이 오면, 그 답변을 바탕으로 추가적인 꼬리 질문을 던지거나 다음 주제로 넘어가세요.
    3. 답변에 대해 간단한 피드백이나 리액션을 짧게 해주는 것은 좋으나, 분석 결과는 면접이 끝난 뒤에 제공하므로 지금은 질문에 집중하세요.
    4. 한국어로 응답하세요.
    5. 면접을 시작할 때는 지원자에게 반갑게 인사하고 첫 질문(예: 자기소개)을 던지세요.
    `;
    }

    async generateNextQuestion(context: InterviewContext, chatHistory: { role: 'user' | 'model', parts: string }[]) {
        const systemPrompt = this.constructSystemPrompt(context);

        // Start chat
        const chat = this.model.startChat({
            history: [
                { role: "user", parts: systemPrompt },
                { role: "model", parts: "알겠습니다. 기술 면접관으로서 설정을 확인했습니다. 지원자가 접속하면 면접을 시작하시겠습니까?" },
                ...chatHistory.map(h => ({ role: h.role, parts: h.parts }))
            ],
        });

        const result = await chat.sendMessage(chatHistory.length === 0 ? "지원자가 입장했습니다. 면접을 시작해주세요." : chatHistory[chatHistory.length - 1].parts);
        const response = await result.response;
        return response.text();
    }
}
