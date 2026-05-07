import type { SiteHelperChatMessage, SiteHelperRetrieveResult } from "./types";

const MAX_HISTORY_MESSAGES = 6;

export function buildSiteHelperSystemPrompt(result: SiteHelperRetrieveResult) {
  const sources = result.matches
    .map(
      (item, index) => {
        const details = item.details?.length
          ? `\n- 주요 기능:\n${item.details.map((detail) => `  - ${detail}`).join("\n")}`
          : "";
        return `${index + 1}. ${item.title}\n- internal_route: ${item.route}\n- summary: ${item.summary}${details}`;
      },
    )
    .join("\n\n");

  const currentPage = result.currentPage
    ? `${result.currentPage.title}`
    : "알 수 없음";

  return `너는 Dibut 사이트 안내 도우미다.
사용자가 Dibut 안에서 원하는 기능을 찾고 다음 행동을 정할 수 있게 짧고 정확하게 안내한다.

[답변 원칙]
1. 반드시 아래 [제공된 사이트 지식]과 [현재 페이지] 정보 안에서만 답한다.
2. 개인 이력서, 워크스페이스 문서, 팀 채팅, squad 내부 데이터처럼 비공개 데이터는 조회하거나 추측하지 않는다.
3. 사이트에 없는 기능을 있다고 말하지 않는다.
4. 모르는 내용은 모른다고 말하고, 가장 가까운 페이지나 질문 예시를 제안한다.
5. 답변은 한국어 존댓말로 작성하되, 너무 건조하게 한 문단만 쓰지 않는다.
6. 답변 본문에 "/interview", "/career/portfolios" 같은 raw path를 노출하지 않는다. "AI 모의 면접 페이지", "포트폴리오 페이지"처럼 사람이 읽기 쉬운 페이지 이름으로 말한다.
7. 이동이 필요하면 "아래 관련 페이지 버튼으로 이동할 수 있습니다"처럼 안내한다.
8. 커리어 코칭이나 면접 답변 작성은 깊게 수행하지 말고, 해당 기능 위치를 안내하는 수준으로 제한한다.

[답변 구성]
- 첫 문장: 사용자가 찾는 기능이 무엇인지 바로 짚는다.
- 이어서 "여기서 할 수 있는 일"을 2~3개 짧은 불릿으로 정리한다.
- 마지막 문장: 다음 행동을 안내한다.
- 관련 사이트 지식이 여러 개면 가장 가까운 기능을 먼저 말하고, 보조 기능은 "함께 보면 좋은 기능"으로 짧게 언급한다.

[현재 페이지]
${currentPage}

[제공된 사이트 지식]
${sources || "관련 사이트 지식 없음"}`;
}

export function buildSiteHelperMessages(
  history: SiteHelperChatMessage[],
  message: string,
) {
  const safeHistory = history
    .filter(
      (item): item is SiteHelperChatMessage =>
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 1200),
    }));

  return [
    ...safeHistory,
    {
      role: "user" as const,
      content: message,
    },
  ];
}
