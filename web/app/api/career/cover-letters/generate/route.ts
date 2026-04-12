import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const DEFAULT_GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL_ID = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const DEFAULT_API_KEY =
  process.env.GEMINI_PRIMARY_API_KEY?.trim() ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  "";
const SERVER_KEY_CHAIN = (process.env.GEMINI_SERVER_KEYS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const SERVER_BASE_URL_CHAIN = (process.env.GEMINI_SERVER_CHAIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const PRIMARY_SERVER_BASE_URL =
  process.env.GEMINI_BASE_URL?.trim() || DEFAULT_GOOGLE_BASE_URL;

const MODEL_RETRY_COUNT = 2;
const BASE_BACKOFF_MS = 500;

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientModelError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
    message?: string;
  };
  const status =
    candidate.status ?? candidate.statusCode ?? candidate.response?.status;
  if (status === 429 || status === 503) return true;
  const message = candidate.message?.toLowerCase() || "";
  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("503") ||
    message.includes("high demand") ||
    message.includes("unavailable")
  );
}

type UpstreamServer = {
  id: string;
  baseURL: string;
  apiKey: string;
};

function buildServerChain(): UpstreamServer[] {
  const baseURLCandidates =
    SERVER_BASE_URL_CHAIN.length > 0
      ? SERVER_BASE_URL_CHAIN
      : [PRIMARY_SERVER_BASE_URL];

  const chain = baseURLCandidates
    .map((baseURL, index) => {
      const apiKey = SERVER_KEY_CHAIN[index] || DEFAULT_API_KEY;
      return {
        id: `server-${index + 1}`,
        baseURL: baseURL || DEFAULT_GOOGLE_BASE_URL,
        apiKey,
      };
    })
    .filter((server) => Boolean(server.apiKey));

  const hasPrimary = chain.some(
    (server) => server.baseURL === PRIMARY_SERVER_BASE_URL,
  );
  if (!hasPrimary && DEFAULT_API_KEY) {
    chain.unshift({
      id: "server-primary",
      baseURL: PRIMARY_SERVER_BASE_URL,
      apiKey: DEFAULT_API_KEY,
    });
  }
  return chain;
}

async function streamWith429Backoff({
  server,
  modelId,
  system,
  messages,
}: {
  server: UpstreamServer;
  modelId: string;
  system: string;
  messages: unknown[];
}) {
  const provider = createGoogleGenerativeAI({
    apiKey: server.apiKey,
    baseURL: server.baseURL,
  });

  let attempt = 0;
  while (true) {
    try {
      return await streamText({
        model: provider(modelId),
        system,
        messages,
        temperature: 0.45,
        maxRetries: 0,
      });
    } catch (error) {
      if (!isTransientModelError(error) || attempt >= MODEL_RETRY_COUNT) {
        throw error;
      }
      const backoff =
        BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 160);
      console.warn(
        `[cover-letter-generate] ${modelId} transient error, retrying in ${backoff}ms (attempt ${attempt + 1}/${MODEL_RETRY_COUNT})`,
      );
      await sleep(backoff);
      attempt += 1;
    }
  }
}

export async function POST(req: Request) {
  try {
    const serverChain = buildServerChain();
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (serverChain.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI 서버 키가 설정되지 않았습니다. GEMINI_API_KEY 또는 GEMINI_SERVER_KEYS를 확인해주세요.",
        },
        { status: 500 },
      );
    }

    const body = await req.json();
    const {
      messages,
      backgroundContext,
      targetRole,
      strengths,
      personalInfo,
      selectedQuestion,
      currentAnswer,
      operation,
      workflowStage,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: "Invalid messages array" },
        { status: 400 },
      );
    }

    const questionTitle = selectedQuestion?.title?.trim?.() || "";
    const questionMaxChars =
      typeof selectedQuestion?.maxChars === "number" ? selectedQuestion.maxChars : 0;
    const normalizedOperation =
      operation === "fit-length" ||
      operation === "tone" ||
      operation === "draft" ||
      operation === "intro"
        ? operation
        : "draft";
    const normalizedWorkflowStage =
      workflowStage === "direction" ||
      workflowStage === "draft" ||
      workflowStage === "refine" ||
      workflowStage === "confirm"
        ? workflowStage
        : "draft";

    const isIntroOperation = normalizedOperation === "intro";

    const operationInstruction =
      normalizedOperation === "fit-length"
        ? "현재 문항 답안을 요구 글자수에 적절히 맞추며, 핵심 성과·기술 근거는 유지하세요."
        : normalizedOperation === "tone"
          ? "현재 문항 답안을 더 전문적이고 신뢰감 있는 개발자 톤으로 개선하세요. 사실관계는 절대 바꾸지 마세요."
          : normalizedOperation === "intro"
            ? "작성 전에 사용자를 맞이하는 첫 안내 메시지를 작성하세요."
            : "선택된 문항의 첫 초안을 작성하세요.";

    const workflowInstruction =
      normalizedWorkflowStage === "direction"
        ? "현재는 '작성 방향 합의' 단계다. 초안 본문을 바로 쓰지 말고, 사용자 입력에서 강조 역량/톤/핵심 성과를 정리해 합의안을 제시하라."
        : normalizedWorkflowStage === "draft"
          ? "현재는 '초안 생성' 단계다. 문항 요구에 맞는 완성도 높은 초안을 제시하라."
          : normalizedWorkflowStage === "refine"
            ? "현재는 '근거/톤 개선' 단계다. 기존 답안에서 근거 밀도와 설득력 있는 톤을 강화하라."
            : "현재는 '문항 확정' 단계다. 최종 점검 관점으로 최소 수정안을 제시하라.";

    const questionInstruction = questionTitle
      ? `
[현재 작업 문항]
- 문항: ${questionTitle}
- 요구 글자수: ${questionMaxChars > 0 ? `${questionMaxChars}자` : "미지정"}
- 현재 사용자가 작성한 답안:
${(currentAnswer || "없음").toString()}
`
      : "";

    const lengthRule =
      questionMaxChars > 0
        ? normalizedOperation === "fit-length"
          ? `출력 분량은 반드시 ${questionMaxChars}자 이내로 맞추세요.`
          : `가능하면 ${questionMaxChars}자 내외(±10%)로 맞추세요.`
        : "";

    const defaultSystemPrompt = `너는 개발자 채용 자기소개서 전문 코치다.
목표는 사용자의 실제 경험 데이터를 활용해 "회사 문제를 해결할 수 있는 후보"라는 신뢰를 만드는 문항 답안을 작성하는 것이다.

[핵심 작성 원칙]
1. 문항/회사 맞춤: 일반론 금지. 회사/직무/문항 의도와 직접 연결.
2. 증거 기반: 행동(Action) + 기술 선택 이유(Why) + 결과(Result)를 포함.
3. 개발자 관점: 성능, 안정성, 품질, 협업, 트러블슈팅, 배포/운영 관점 중 해당 근거를 우선 반영.
4. 과장·환각 금지: 제공되지 않은 사실/수치/기술은 만들지 않는다.
5. 문장 품질: 군더더기/인사말/메타설명 제거. 바로 본문부터 시작.

[문항 전개 프레임]
- Situation/Task: 문제 맥락 1~2문장
- Action: 내가 한 기술적/협업적 행동 2~4문장
- Result/Learning: 결과·임팩트·배운점 1~2문장
- 가능하면 수치/지표(속도, 오류율, 비용, 사용자 반응 등) 포함

[사용자 기본 정보]
${personalInfo ? JSON.stringify(personalInfo, null, 2) : "정보 없음"}

[지원 직무]
${targetRole || "자유 양식 (특정 직무 없음)"}

[사용자가 강조하고 싶은 점 (강점)]
${strengths || "특별히 강조할 점 없음"}

[과거 경험 상세 내용 (Context)]
${backgroundContext || "경험 데이터 없음"}

${questionInstruction}

[현재 편집 모드]
${operationInstruction}

[현재 워크플로우 단계]
${workflowInstruction}

[작성 가이드라인]
1. 강점(${strengths || "없음"})이 있다면 문항 핵심 문장에 녹여라.
2. 개발자가 읽어도 납득되는 기술적 구체성을 유지하라.
3. 사용자에게 보여줄 본문은 자연스러운 코칭 대화문으로 작성하라.
4. ${lengthRule || "문항 분량 제한이 없으면 과도하게 길지 않게 작성하세요."}
5. 한국어 존댓말(~습니다)로 통일하라.

[단계 정책]
- direction 단계: 초안을 바로 확정하지 말고, 강조 역량/톤/핵심 성과를 채우기 위한 핵심 질문을 우선한다.
- draft 단계: 현재까지 합의된 요소를 반영한 1차 초안을 제시한다.
- refine 단계: 사용자 피드백을 반영해 근거 밀도와 톤을 개선한다.
- confirm 단계: 제출 가능한 최종 답안으로 정리한다.
- stage=confirm 과 ready=yes 는 아래 조건을 모두 만족할 때만 허용한다:
  1) competency=ok
  2) tone=ok
  3) impact=ok
  4) dibut_answer가 비어있지 않음
- 위 조건 중 하나라도 미충족이면 ready=no 로 유지하고 stage는 direction/draft/refine 중 실제 상태로 반환한다.

[응답 프로토콜 - 반드시 포함]
응답 본문 뒤에 반드시 아래 2개 블록을 붙여라. 파싱 가능한 형태로 key=value 한 줄씩만 작성하고, 추가 문구를 넣지 마라.
<dibut_state>
stage=direction|draft|refine|confirm
competency=ok|need
tone=ok|need
impact=ok|need
ready=yes|no
</dibut_state>
<dibut_answer>
문항에 반영 가능한 답안 텍스트. direction 단계에서 아직 불충분하면 비워도 됨.
</dibut_answer>`;

    const introSystemPrompt = `너는 "디벗 AI 자소서 컨설팅" 온보딩 코치다.
목표는 사용자가 바로 문항 작성을 시작할 수 있도록, 맞춤 인사 + 진행 안내 + 간단 질문을 제시하는 것이다.

[사용자 기본 정보]
${personalInfo ? JSON.stringify(personalInfo, null, 2) : "정보 없음"}

[지원 직무]
${targetRole || "자유 양식 (특정 직무 없음)"}

[강조 포인트]
${strengths || "특별히 강조할 점 없음"}

[과거 경험 상세 내용 (Context)]
${backgroundContext || "경험 데이터 없음"}

${questionInstruction}

[출력 형식]
1. 첫 문장은 반드시 "안녕하세요, 디벗 AI 자소서 컨설팅입니다."로 시작.
2. 사용자가 입력한 기업/직무/문항을 자연스럽게 언급.
3. 기반 경험 키워드 2~4개를 짧게 묶어 언급.
4. 마지막에는 사용자가 바로 답할 수 있는 간단 질문 2~3개 제시.
5. 불릿/번호 목록 없이 자연스러운 대화형 문장으로 작성.
6. 과장/환각 금지, 한국어 존댓말(~습니다) 유지.
7. 응답 본문 뒤에 반드시 아래 프로토콜을 포함:
<dibut_state>
stage=direction
competency=need
tone=need
impact=need
ready=no
</dibut_state>
<dibut_answer></dibut_answer>`;

    const systemPrompt = isIntroOperation ? introSystemPrompt : defaultSystemPrompt;

    let lastError: unknown = null;
    for (const server of serverChain) {
      try {
        const result = await streamWith429Backoff({
          server,
          modelId: DEFAULT_MODEL_ID,
          system: systemPrompt,
          messages,
        });
        return result.toTextStreamResponse();
      } catch (error) {
        lastError = error;
        console.warn(
          `[cover-letter-generate] ${server.id}(${server.baseURL}) failed`,
          error,
        );
        if (!isTransientModelError(error)) {
          break;
        }
      }
    }

    if (isTransientModelError(lastError)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI 모델 혼잡으로 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
        },
        {
          status: 503,
          headers: {
            "Retry-After": "3",
            "Cache-Control": "no-store",
          },
        },
      );
    }
    throw lastError;
  } catch (error) {
    console.error("Cover Letter Generation Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate cover letter" },
      { status: 500 },
    );
  }
}
