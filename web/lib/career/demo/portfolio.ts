import { identifyCareerDemoProjectText, type CareerDemoProjectKind } from "./persona";

type DemoBlock = { id: string; type: string; items?: string[] };
type DemoPage = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  narrative?: string;
  emphasis?: string[];
  blocks: DemoBlock[];
};
type DemoPatch = Record<string, unknown> & { op: string };

const PROJECT_PAGE_TYPES = new Set(["case-study", "project-detail", "experience"]);
const METRIC_PAGE_TYPES = new Set(["cover", "profile", "case-study", "project-detail", "experience"]);

const PROJECT_SUBTITLES: Record<CareerDemoProjectKind, string> = {
  hello: "행정 문서 약 1,200건을 근거 일치율 87%의 답변으로 연결",
  tiny: "버전 기반 낙관적 업데이트로 지켜 낸 동시 요청 정합성",
  blavers: "팀장으로 범위를 합의해 10일 만에 MVP 배포 · 본선 진출",
};

const PAGE_SUBTITLES: Record<string, string> = {
  cover: "데이터의 근거를 끝까지 확인하는 백엔드 개발자",
  profile: "SQLD·정보처리산업기사 · 금액과 거래 데이터의 정합성을 먼저 확인하는 신입 개발자",
  skills: "Java·Spring·SQL 기반 백엔드 개발과 데이터 모델링 역량",
  "project-index": "데이터 정합성으로 이어지는 대표 프로젝트",
  retrospective: "다음 목표: 금액이 틀리지 않는 거래 인프라를 만드는 백엔드 개발자",
  contact: "숫자 하나도 틀리지 않는 거래 인프라를, 보이지 않게",
};

const PROJECT_METRICS: Record<CareerDemoProjectKind | "default", { label: string; value: string; caption: string }> = {
  hello: { label: "근거 일치율", value: "87%", caption: "평가셋 150문항 중 131문항 일치" },
  tiny: { label: "통합한 협업 기능", value: "3종", caption: "문서·칸반·메시지를 한 워크스페이스로" },
  blavers: { label: "MVP 개발 기간", value: "10일", caption: "해커톤 본선(파이널데이) 진출" },
  default: { label: "정제한 행정 문서", value: "약 1,200건", caption: "Vizabridge RAG 프로젝트" },
};

const PROJECT_FLOWS: Record<CareerDemoProjectKind | "default", string[]> = {
  hello: ["문서 수집·정제", "청킹·임베딩", "평가셋 검증", "시행일 필터 적용"],
  tiny: ["동시 이동 문제 발견", "카드 버전 도입", "서버 확정 순서 전파", "충돌 시 재동기화"],
  blavers: ["범위 합의", "핵심 흐름 설계", "역할별 화면 구현", "배포·본선 진출"],
  default: ["요구사항 분석", "화면·DB 설계", "구현", "검증·개선"],
};

function projectKindOf(page: DemoPage): CareerDemoProjectKind | null {
  return identifyCareerDemoProjectText([page.title, page.subtitle, page.narrative].filter(Boolean).join(" "));
}

function resolveTargetPage(pages: DemoPage[], activePageId: string | undefined, message: string): DemoPage {
  const byType = (type: string) => pages.find((page) => page.type === type);
  if (/표지|커버|cover/i.test(message)) return byType("cover") ?? pages[0];
  if (/마지막|last/i.test(message)) return pages[pages.length - 1];
  if (/프로필|profile/i.test(message)) return byType("profile") ?? pages[0];
  return pages.find((page) => page.id === activePageId) ?? pages[0];
}

function firstSentences(text: string, count: number): string {
  const sentences = text.trim().split(/(?<=[.!?。])\s+/u).filter(Boolean);
  return sentences.slice(0, count).join(" ");
}

/**
 * Deterministic stand-in for the portfolio AI editor. Returns the same `{ reply, patches }`
 * shape the model would, built only from the page's real ids; the route still sanitises it.
 */
export function buildCareerDemoPortfolioEdit(input: {
  pages: DemoPage[];
  activePageId?: string;
  message: string;
}): { reply: string; patches: DemoPatch[] } {
  const { pages, message } = input;
  if (!pages.length) {
    return { reply: "편집할 웹 슬라이드 페이지가 아직 없어요. 포트폴리오를 먼저 생성해 주세요.", patches: [] };
  }
  const page = resolveTargetPage(pages, input.activePageId, message);
  const kind = projectKindOf(page);

  if (/숨겨|숨김|숨기|안\s*보이게|가려/.test(message)) {
    return {
      reply: `‘${page.title}’ 페이지를 숨겼어요. 발표에서는 건너뛰고, 필요하면 언제든 다시 표시할 수 있어요.`,
      patches: [{ op: "toggle_visibility", pageId: page.id, visible: false }],
    };
  }

  if (/빼|삭제|지워|없애/.test(message)) {
    const lower = message.toLowerCase();
    const emphasisHit = (page.emphasis ?? [])
      .filter((item) => item && lower.includes(item.toLowerCase()))
      .sort((a, b) => b.length - a.length)[0];
    if (emphasisHit) {
      return {
        reply: `강조 키워드에서 ‘${emphasisHit}’를 뺐어요. 나머지 키워드가 더 또렷하게 보일 거예요.`,
        patches: [{ op: "patch_page", pageId: page.id, fields: { emphasis: (page.emphasis ?? []).filter((item) => item !== emphasisHit) } }],
      };
    }
    for (const block of page.blocks) {
      const hit = (block.items ?? []).find((item) => item && lower.includes(item.toLowerCase()));
      if (hit) {
        return {
          reply: `‘${hit}’ 항목을 뺐어요. 남은 항목만으로 흐름이 이어지도록 정리했습니다.`,
          patches: [{ op: "update_block_items", pageId: page.id, blockId: block.id, items: (block.items ?? []).filter((item) => item !== hit) }],
        };
      }
    }
    const callout = /callout|콜아웃|강조\s*박스/i.test(message) ? page.blocks.find((block) => block.type === "callout") : undefined;
    if (callout) {
      return {
        reply: "강조 박스를 뺐어요. 슬라이드가 한결 가벼워졌어요.",
        patches: [{ op: "delete_block", pageId: page.id, blockId: callout.id }],
      };
    }
    return { reply: "현재 페이지에서 말씀하신 항목을 찾지 못했어요. 지우고 싶은 문구를 그대로 적어 주시면 바로 정리할게요.", patches: [] };
  }

  if (/지표|metric|숫자|카드/i.test(message) && /추가|넣어|만들어/.test(message) && METRIC_PAGE_TYPES.has(page.type)) {
    const metric = PROJECT_METRICS[kind ?? "default"];
    return {
      reply: `‘${page.title}’ 페이지에 ‘${metric.label} ${metric.value}’ 지표 카드를 추가했어요. 숫자가 먼저 눈에 들어오도록 배치했습니다.`,
      patches: [{ op: "add_block", pageId: page.id, block: { type: "metric", ...metric } }],
    };
  }

  const flow = /단계|flow/i.test(message) ? page.blocks.find((block) => block.type === "flow") : undefined;
  if (flow) {
    const items = (flow.items?.length ?? 0) >= 4 ? flow.items!.slice(0, 4) : PROJECT_FLOWS[kind ?? "default"];
    return {
      reply: "흐름을 핵심 4단계로 정리했어요. 문제에서 결과까지 한눈에 이어집니다.",
      patches: [{ op: "update_block_items", pageId: page.id, blockId: flow.id, items }],
    };
  }

  const isProjectPage = PROJECT_PAGE_TYPES.has(page.type);
  const tone: Tone = /부드럽|친근|따뜻|편안/.test(message) ? "soft" : /자신감|강하게|임팩트|힘\s*있|단호/.test(message) ? "bold" : "fit";
  const subtitle =
    (isProjectPage && kind ? PROJECT_SUBTITLES[kind] : PAGE_SUBTITLES[page.type]) ??
    "요구사항 분석부터 검증까지, 근거로 설명하는 프로젝트";
  const base = page.narrative?.trim() ?? "";
  // 화면에 보이는 설명 문단이 반드시 바뀌어야 시연에서 "AI가 고쳤다"가 보인다.
  let narrative: string;
  if (page.type === "cover" || page.type === "profile") {
    narrative = COVER_NARRATIVES[tone];
  } else {
    const tightened = firstSentences(base, 2) || base;
    const metric = PROJECT_METRICS[kind ?? "default"];
    narrative =
      tone === "soft"
        ? `${tightened} 함께 일하는 사람이 믿고 쓸 수 있는 결과를 만드는 데 가장 마음을 썼습니다.`
        : tone === "bold"
          ? `${metric.label} ${metric.value}. ${tightened}`
          : `${tightened} 이 경험은 금액과 거래 데이터를 정확하게 다뤄야 하는 더즌의 펌뱅킹·가상계좌 개발과 맞닿아 있습니다.`;
  }
  const fields: Record<string, unknown> = { subtitle, narrative };
  return {
    reply: TONE_REPLIES[tone](page.title),
    patches: [{ op: "patch_page", pageId: page.id, fields }],
  };
}

type Tone = "soft" | "bold" | "fit";

const COVER_NARRATIVES: Record<Tone, string> = {
  fit: "데이터의 근거를 끝까지 확인하는 백엔드 개발자입니다. 행정 문서 약 1,200건을 정제해 근거 일치율 87%를 만든 경험으로, 금액이 틀리지 않는 거래 인프라를 만들겠습니다.",
  soft: "사용자가 겪는 작은 불편을 데이터로 확인하고, 함께 일하는 사람이 믿고 쓸 수 있는 서비스를 만드는 개발자입니다. 기획부터 검증까지 차근차근 근거를 쌓아 가며 일합니다.",
  bold: "행정 문서 1,200건을 근거 일치율 87%의 답변으로 바꾼 개발자입니다. 10일 만에 MVP를 배포한 실행력으로, 기획부터 검증까지 숫자로 증명합니다.",
};

const TONE_REPLIES: Record<Tone, (title: string) => string> = {
  fit: (title) => `‘${title}’ 페이지의 부제와 설명을 더즌(dozn) 백엔드 개발자 공고에 맞춰 다듬었어요. 데이터 정합성과 근거 검증 경험이 먼저 보이도록 정리했습니다.`,
  soft: (title) => `‘${title}’ 페이지 문장을 더 부드럽고 편안한 톤으로 바꿨어요. 딱딱한 표현은 줄이고, 함께 일하는 사람을 생각하는 태도가 드러나게 했습니다.`,
  bold: (title) => `‘${title}’ 페이지를 더 자신감 있는 톤으로 바꿨어요. 성과 숫자가 문장 맨 앞에 오도록 정리했습니다.`,
};

/** Canned copy for the "Neon Editorial" showcase, in the shape `mergeIntoContent` expects. */
export function getCareerDemoShowcaseFill() {
  return {
    bio: "데이터의 근거를 끝까지 확인하는 신입 백엔드 개발자, 김디벗입니다.",
    aboutQuote: "틀린 답을 내놓기보다, 모른다고 말하는 시스템이 더 안전하다.",
    aboutParagraphs: [
      "부천대학교 컴퓨터소프트웨어과 졸업을 앞둔 신입 백엔드 개발자입니다. SQLD와 정보처리산업기사로 다진 정규화·트랜잭션 개념을 설계 판단에 적용하며, 데이터가 정확한지와 그 근거를 설명할 수 있는지를 가장 먼저 확인합니다.",
      "청년미래일경험으로 헬로프렌즈 Vizabridge의 RAG 상담 어시스턴트를 만들며 행정 문서 약 1,200건을 정제해 근거 일치율을 87%까지 끌어올렸습니다. 티니타이거 워크스페이스에서는 동시 요청 정합성을, 블레이버스 해커톤에서는 팀장으로 10일 MVP를 끝까지 완성했습니다.",
    ],
    strengths: [
      { num: "01", title: "EVIDENCE FIRST", body: "평가셋 150문항을 직접 만들어 검증하고, 근거 없는 답은 내보내지 않도록 설계합니다." },
      { num: "02", title: "DATA INTEGRITY", body: "버전 기반 낙관적 업데이트로 동시 요청 속에서도 데이터가 어긋나지 않게 만듭니다." },
      { num: "03", title: "SCOPE & PRIORITY", body: "팀장으로 핵심 흐름부터 합의해 10일 만에 MVP를 배포하고 본선에 진출했습니다." },
      { num: "04", title: "SQL FOUNDATION", body: "SQLD·정보처리산업기사로 다진 모델링·트랜잭션 기본기를 API와 DB 설계에 녹입니다." },
    ],
    // The template lays KPIs out in three columns (and the merge keeps three).
    kpis: [
      { num: 1200, suffix: "건", label: "행정 문서 정제·인덱싱" },
      { num: 87, suffix: "%", label: "근거 일치율 (131/150)" },
      { num: 10, suffix: "일", label: "해커톤 MVP 배포" },
    ],
    marqueeKeywords: ["JAVA", "SPRING BOOT", "JPA", "SQL", "MYSQL", "TRANSACTION", "RAG", "DATA INTEGRITY"],
    experience: [
      {
        date: "2026.04 — 2026.06",
        title: "AI 엔지니어 (RAG·데이터 전처리)",
        org: "㈜헬로프렌즈 · 청년미래일경험",
        bullets: [
          "외국인 행정·비자 플랫폼 Vizabridge의 RAG 상담 어시스턴트 구축",
          "행정 문서 약 1,200건 정제, 근거 일치율 약 87%·평균 응답 3초 이내 달성",
        ],
      },
      {
        date: "2026.02",
        title: "팀장 · 풀스택 개발",
        org: "제4회 블레이버스 MVP 개발 해커톤",
        bullets: ["멘토링 플랫폼 '몽구리' MVP를 10일 만에 Vercel에 배포", "본선(파이널데이) 진출"],
      },
      {
        date: "2024.09 — 2024.12",
        title: "풀스택 개발",
        org: "㈜에쉬 티니타이거 · 청년미래일경험",
        bullets: [
          "쇼핑몰 리뉴얼 팀의 문서·칸반·메시지 협업 워크스페이스 개발",
          "버전 기반 낙관적 업데이트로 동시 요청 정합성 확보",
        ],
      },
    ],
    education: [
      { date: "2024.03 — 2027.02", title: "컴퓨터소프트웨어과 (졸업예정)", org: "부천대학교", bullets: [] },
      { date: "2026.09", title: "정보처리산업기사", org: "한국산업인력공단", bullets: [] },
      { date: "2026.06", title: "SQLD (SQL 개발자)", org: "한국데이터산업진흥원", bullets: [] },
    ],
  };
}
