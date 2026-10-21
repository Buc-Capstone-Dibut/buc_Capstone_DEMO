import { CAREER_DEMO_FULL_COVER_LETTER, identifyCareerDemoProjectText, type CareerDemoProjectKind } from "./persona";

// Deterministic cover-letter coach for the presentation persona (김정환 → ㈜아카넷 웹개발자 Java 신입).
// Every draft is assembled from tagged sentences so that edits ("숫자 강조", "첫 문장", "줄여줘") can
// insert, swap or drop whole sentences without leaving a dangling "그때마다" behind.

type ProjectKind = CareerDemoProjectKind;
type Stage = "direction" | "draft" | "refine" | "confirm";
type Category =
  | "introduction"
  | "motivation"
  | "company"
  | "goal"
  | "strength"
  | "growth"
  | "failure"
  | "conflict"
  | "challenge"
  | "collaboration"
  | "project"
  | "competency"
  | "general";
type Role = "thesis" | "story" | "hook" | "close";

// Drop priority used by fitCareerDemoAnswer: lower tiers go first, anchors (opening/closing) last.
const X = -1; // expansion material, only kept when the form leaves room
const O = 0; // optional detail
const S = 1; // supporting sentence
const C = 2; // core sentence (also every sentence the user wrote)
const A = 3; // opening thesis / closing line

/**
 * `dep`: only makes sense right after the previous sentence ("그때마다 …").
 * `needs`: only makes sense while these sentences are in the answer (a story step needs the
 * sentence that introduced the project).
 */
type Line = { text: string; tier: number; dep: boolean; role?: Role; needs?: string[] };
type Meta = { tier: number; dep: boolean; needs?: string[] };
type RegistryEntry = Meta & { roles: Set<Role> };

/** Every prepared sentence, so a draft read back from the chat history keeps its tiers. */
const REGISTRY = new Map<string, RegistryEntry>();

function line(text: string, tier: number, dep = false, role?: Role): Line {
  const known = REGISTRY.get(text);
  if (known) {
    known.tier = Math.max(known.tier, tier);
    known.dep = known.dep || dep;
    if (role) known.roles.add(role);
  } else {
    REGISTRY.set(text, { tier, dep, roles: new Set(role ? [role] : []) });
  }
  return { text, tier, dep, role };
}

/** Mark every line in `texts` as needing the `anchor` sentence (e.g. the project introduction). */
function bind(paragraphs: Line[][], anchor: string, texts: string[]): Line[][] {
  const wanted = new Set(texts.filter((text) => text !== anchor));
  for (const item of paragraphs.flat()) {
    if (!wanted.has(item.text)) continue;
    item.needs = Array.from(new Set([...(item.needs ?? []), anchor]));
    const known = REGISTRY.get(item.text);
    if (known) known.needs = Array.from(new Set([...(known.needs ?? []), anchor]));
  }
  return paragraphs;
}

type Evidence = {
  kind: ProjectKind;
  name: string;
  focus: string;
  /** Names that identify the project inside an answer. */
  nameMarker: RegExp;
  /** Any phrase that belongs to the project's story (used to place inserted sentences). */
  marker: RegExp;
  keyFact: string;
  context: string;
  problem: string;
  problemDep: boolean;
  steps: Array<[string, boolean]>;
  details: [string, string, string];
  result: string;
  lesson: string;
  certLine: string;
  fitLine: string;
  brief: string;
  teamwork: string;
  numbersLead: string;
  role: string;
  intro: string;
  /** One more 자기소개 sentence about the project, used on long forms. */
  introDetail: string;
  /** The whole action in one standalone sentence, for combined titles that answer two questions. */
  compact: string;
  motive: [string, string, string];
  growth: [string, string, string];
  collab: [string, string];
  collabDetail: string;
  conflict: [string, string, string, string, string, string];
  goalLink: string;
  strength: [string, string];
  skills: [string, string, string];
  /** Index of the skills sentence the result follows from. */
  fixSkill: number;
  projectHook: string;
  question: string;
};

// Prepared wording for the persona's three projects. Numbers must match persona.ts.
// Never ship private resume snapshots, attachments or account IDs here.
const EVIDENCE: Record<ProjectKind, Evidence> = {
  hello: {
    kind: "hello",
    name: "헬로프렌즈",
    focus: "데이터 정합성과 근거 검증",
    nameMarker: /헬로프렌즈|Vizabridge/,
    marker: /헬로프렌즈|Vizabridge|비자|1,200건|평가셋|시행일|pgvector|근거 일치율|임계값/,
    keyFact: "행정 문서 약 1,200건 정제 · 150문항 평가셋 · 근거 일치율 약 87%",
    context:
      "청년미래일경험으로 참여한 ㈜헬로프렌즈의 외국인 행정·비자 플랫폼 Vizabridge에서 RAG 기반 상담 어시스턴트를 만들었습니다.",
    problem: "비자 안내문·법령·FAQ가 스캔 PDF와 표, 여러 언어로 흩어져 있어 같은 문의가 반복되고 있었습니다.",
    problemDep: false,
    steps: [
      ["저는 문서 약 1,200건을 정제해 의미 단위로 나누고 pgvector에 적재했지만, 처음 측정한 근거 일치율은 기대에 못 미쳤습니다.", false],
      ["원인을 찾기 위해 상담 로그에서 자주 나온 질문 150개로 평가셋을 만들고, 오답 대부분이 개정 전 문서를 근거로 삼은 경우라는 것을 확인했습니다.", true],
      ["그래서 문서에 시행일 메타데이터를 넣어 최신 문서를 우선 검색하도록 바꿨습니다.", true],
    ],
    details: [
      "유사도가 임계값보다 낮으면 답을 지어내지 않고 담당자에게 연결하도록 설계했는데, 행정 안내에서는 틀린 답보다 모른다고 말하는 편이 더 안전하다고 판단했기 때문입니다.",
      "평가셋에는 상담 담당자와 함께 정답 근거 문서를 직접 표시해, 답변이 맞았는지를 감이 아니라 근거로 판정할 수 있게 했습니다.",
      "표가 많은 스캔 PDF는 표 단위로 따로 추출해, 수수료나 체류 기간처럼 숫자가 담긴 행이 서로 섞이지 않도록 했습니다.",
    ],
    result: "그 결과 근거 일치율을 약 87%(150문항 중 131문항)까지 끌어올리고, 평균 응답 시간도 3초 이내로 유지했습니다.",
    lesson: "이 경험으로 모델보다 데이터의 정합성과 검증 기준이 서비스 품질을 결정한다는 것을 배웠습니다.",
    certLine: "SQLD를 준비하며 익힌 정규화·트랜잭션 개념은 이 과정에서 실제 판단 기준이 되었습니다.",
    fitLine: "흩어진 행정 문서를 정확한 근거로 바꿔 본 경험은, 대학 행정 데이터를 다루는 아카넷의 업무와 그대로 맞닿아 있습니다.",
    brief: "헬로프렌즈 Vizabridge에서는 행정 문서 약 1,200건을 정제해 AI 상담의 근거 일치율을 약 87%까지 끌어올렸습니다.",
    teamwork: "헬로프렌즈 프로젝트에서도 상담 담당자와 함께 정답 근거를 표시하며 평가 기준부터 맞췄습니다.",
    numbersLead: "150문항 중 131문항, 근거 일치율 약 87%는 제가 행정 AI 상담 어시스턴트에서 직접 만들어 낸 숫자입니다.",
    role: "문서 정제부터 검색 구조와 평가셋 설계까지, 답변이 만들어지는 데이터 흐름 전체가 제 담당이었습니다.",
    introDetail: "근거가 약한 질문에는 답을 지어내지 않고 담당자에게 연결하도록 설계해, 틀린 답보다 정직한 답을 택했습니다.",
    compact: "상담 로그로 만든 150문항 평가셋으로 오답 원인을 추적해, 개정 전 문서가 근거로 쓰이던 문제를 시행일 기준 검색으로 바로잡았습니다.",
    intro: "헬로프렌즈 Vizabridge에서는 150문항 평가셋으로 오답 원인을 추적해 AI 상담의 근거 일치율을 약 87%까지 끌어올렸습니다.",
    motive: [
      "청년미래일경험으로 참여한 헬로프렌즈 Vizabridge에서 저는 스캔 PDF와 표로 흩어진 행정 문서 약 1,200건을 정제해 AI 상담의 근거로 연결했습니다.",
      "개정 전 문서가 답변 근거로 쓰이는 문제를 시행일 기준 검색으로 바로잡으며, 행정 데이터는 최신이고 정확해야 비로소 신뢰를 얻는다는 것을 배웠습니다.",
      "이 경험을 학적과 성적처럼 한 건의 오류도 허용되지 않는 학사 데이터에서 제대로 써 보고 싶어 아카넷에 지원하게 되었습니다.",
    ],
    growth: [
      "헬로프렌즈 Vizabridge의 AI 상담은 겉보기에는 문제없이 답을 내놓았지만, 평가셋으로 확인해 보니 상당수가 개정 전 문서를 근거로 삼고 있었습니다.",
      "사용자는 그 답이 틀렸다는 것을 알 수 없다는 사실이 가장 무겁게 다가왔습니다.",
      "그래서 시행일 메타데이터로 최신 문서를 우선 검색하고 근거가 약하면 답하지 않도록 바꿔, 근거 일치율을 약 87%까지 끌어올렸습니다.",
    ],
    collab: [
      "저는 상담 담당자와 함께 상담 로그에서 질문 150개를 골라 정답 근거 문서를 직접 표시하며, ‘좋은 답’의 기준부터 팀과 맞췄습니다.",
      "기준이 생기자 개발자와 담당자가 같은 표를 보며 오답 원인을 이야기할 수 있었고, 개정 전 문서가 근거로 쓰인다는 문제도 함께 찾아냈습니다.",
    ],
    collabDetail:
      "유사도가 임계값보다 낮으면 답을 지어내지 않고 담당자에게 연결하도록 설계했는데, 행정 안내에서는 틀린 답보다 모른다고 말하는 편이 더 안전하다고 판단했기 때문입니다.",
    conflict: [
      "청년미래일경험으로 참여한 헬로프렌즈 Vizabridge에서 RAG 상담 어시스턴트를 만들 때, 근거가 부족한 질문을 어떻게 처리할지를 두고 의견이 갈렸습니다.",
      "운영 측은 사용자가 답을 받지 못하면 불편해한다며 모든 질문에 답하기를 원했고, 저는 행정 안내에서 틀린 답은 답이 없는 것보다 위험하다고 생각했습니다.",
      "저는 상담 로그로 만든 150문항 평가셋에서 근거 없이 생성된 답변 사례를 함께 확인하자고 제안해, 감이 아닌 데이터로 이야기했습니다.",
      "대신 사용자가 막히지 않도록, 유사도가 임계값보다 낮으면 답을 지어내지 않고 담당자에게 바로 연결하는 절충안을 설계했습니다.",
      "그 결과 근거 일치율을 약 87%까지 끌어올리면서도, 사용자는 언제든 답을 받을 수 있게 되었습니다.",
      "이 경험으로 갈등은 어느 한쪽을 이기는 일이 아니라, 양쪽의 걱정을 모두 해결하는 설계를 찾는 일이라는 것을 배웠습니다.",
    ],
    goalLink:
      "헬로프렌즈 Vizabridge에서 150문항 평가셋으로 답변을 검증했던 것처럼, 제가 만든 기능도 무엇으로 맞았다고 판단할지부터 정하고 개발하겠습니다.",
    strength: [
      "헬로프렌즈 Vizabridge에서 처음 측정한 근거 일치율이 기대에 못 미쳤을 때, 저는 모델을 바꾸기 전에 상담 로그로 150문항 평가셋을 만들어 오답을 하나씩 추적했습니다.",
      "그 결과 개정 전 문서가 근거로 쓰이던 원인을 찾아 시행일 기준 검색으로 바로잡았고, 근거 일치율을 약 87%까지 끌어올렸습니다.",
    ],
    skills: [
      "문서 약 1,200건을 정제해 의미 단위로 나누고, 문서 종류·언어·시행일을 메타데이터로 설계해 pgvector에 적재했습니다.",
      "상담 로그에서 자주 나온 질문 150개로 평가셋을 만들어, 검색 결과가 정답 근거 문서를 찾아오는지 수치로 측정했습니다.",
      "오답 대부분이 개정 전 문서를 근거로 삼은 경우라는 것을 확인하고, 시행일 기준으로 최신 문서를 우선 검색하도록 검색 조건을 바꿨습니다.",
    ],
    fixSkill: 2,
    projectHook: "‘모르면 모른다고 답하는 AI’를 만드는 것이 제 대표 프로젝트의 목표였습니다.",
    question: "Vizabridge 평가셋 150문항을 만들 때 가장 판단하기 어려웠던 질문 유형은 무엇이었나요?",
  },
  tiny: {
    kind: "tiny",
    name: "티니타이거",
    focus: "실시간 데이터 정합성",
    nameMarker: /티니타이거/,
    marker: /티니타이거|에쉬|쇼핑몰|워크스페이스|칸반|버전 값|낙관적|브로드캐스트/,
    keyFact: "카드 버전 기반 낙관적 업데이트 · 서버 확정 순서만 브로드캐스트",
    context:
      "청년미래일경험으로 참여한 ㈜에쉬 티니타이거 쇼핑몰 리뉴얼 프로젝트에서, 팀이 문서·칸반·메시지를 한곳에서 관리하는 협업 워크스페이스를 개발했습니다.",
    problem: "그런데 두 사람이 같은 카드를 동시에 옮기면 소켓 이벤트가 도착하는 순서에 따라 화면마다 결과가 달라지는 문제가 생겼습니다.",
    problemDep: true,
    steps: [
      ["저는 클라이언트 상태를 맞추는 대신 서버에 기준을 두기로 하고, 카드에 버전 값을 둬 서버가 확정한 순서만 브로드캐스트하도록 구조를 바꿨습니다.", false],
      ["버전이 어긋난 요청은 거절하고, 최신 상태를 다시 받아 화면을 맞추게 했습니다.", true],
    ],
    details: [
      "카드 이동은 충돌이 드물고 짧게 자주 일어나는 작업이라, 매번 잠그는 비관적 락 대신 버전을 비교하는 낙관적 방식을 택했습니다.",
      "멤버 권한별로 볼 수 있는 문서와 보드의 범위를 서버에서 나누고, 권한이 바뀌면 열려 있는 화면에도 바로 반영되게 했습니다.",
      "재현이 어려운 동시성 문제였기 때문에 두 브라우저에서 같은 카드를 반복해 옮기는 시나리오를 만들어, 수정 후에도 모든 화면이 같은 순서로 맞춰지는지 확인했습니다.",
    ],
    result: "그 결과 모든 팀원이 같은 순간에 같은 보드를 보게 되었고, 회의 전에 진행 상황을 맞춰 보는 시간도 눈에 띄게 줄었습니다.",
    lesson: "이 경험으로 같은 데이터를 모두에게 같은 모습으로 보여 주려면, 화면보다 서버의 기준과 데이터 흐름을 먼저 설계해야 한다는 것을 배웠습니다.",
    certLine: "정보처리산업기사를 준비하며 공부한 트랜잭션과 동시성 제어 개념이, 버전 비교 방식을 고르는 근거가 되었습니다.",
    fitLine:
      "수천 명이 같은 순간에 접속하는 수강신청처럼, 동시 요청 속에서도 데이터를 하나로 지켜 본 경험은 아카넷의 학사시스템 개발로 그대로 이어질 수 있습니다.",
    brief:
      "티니타이거 협업 워크스페이스에서는 카드 버전 기반의 낙관적 업데이트로, 여러 사람이 동시에 칸반을 움직여도 모든 화면이 같은 결과를 보게 만들었습니다.",
    teamwork: "티니타이거 프로젝트에서도 권한별 접근 범위와 갱신 시점을 팀과 먼저 합의해 모두가 같은 화면을 보도록 만들었습니다.",
    numbersLead: "동시 편집 충돌 없이 모든 팀원이 하나의 보드를 보게 만든 것이, 티니타이거 프로젝트에서 제가 낸 가장 큰 성과입니다.",
    role: "이 프로젝트에서 제가 맡은 부분은 실시간 동기화 구조와 멤버 권한 설계였습니다.",
    introDetail: "매번 잠그는 대신 버전을 비교하는 방식을 택해, 여러 사람이 동시에 일해도 작업이 끊기지 않게 했습니다.",
    compact: "저는 카드에 버전 값을 두고 서버가 확정한 순서만 브로드캐스트하도록 구조를 바꿔, 충돌한 요청은 최신 상태로 다시 맞추게 했습니다.",
    intro: "티니타이거 쇼핑몰 리뉴얼의 협업 워크스페이스에서는 카드 버전 기반의 낙관적 업데이트로 동시 편집 충돌을 해결했습니다.",
    motive: [
      "청년미래일경험으로 참여한 티니타이거 쇼핑몰 리뉴얼 프로젝트에서 저는, 여러 사람이 같은 칸반 카드를 동시에 옮겨도 모든 화면이 같은 결과를 보도록 서버 기준의 동기화 구조를 만들었습니다.",
      "카드에 버전 값을 두고 서버가 확정한 순서만 내보내며, 요청이 한꺼번에 몰려도 데이터는 하나의 기준으로 지켜져야 한다는 것을 배웠습니다.",
      "동시 요청 속에서 데이터를 하나로 지켜 본 경험을, 수강신청처럼 수천 명이 한순간에 몰리는 아카넷의 학사시스템에서 제대로 써 보고 싶어 지원하게 되었습니다.",
    ],
    growth: [
      "티니타이거 협업 워크스페이스는 제 화면에서는 완벽하게 동작했지만, 두 사람이 같은 카드를 동시에 옮기자 화면마다 다른 결과가 나타났습니다.",
      "혼자 테스트할 때는 보이지 않던 문제가 사용자가 늘자 드러난다는 것을 그때 처음 알았습니다.",
      "그래서 카드에 버전 값을 두고 서버가 확정한 순서만 내보내도록 구조를 바꿔, 모든 팀원이 같은 보드를 보게 만들었습니다.",
    ],
    collab: [
      "저는 먼저 기획·디자인 담당자와 함께 누가 무엇을 언제 볼 수 있어야 하는지를 표로 정리해, 권한별 접근 범위와 화면 갱신 시점부터 합의했습니다.",
      "합의한 기준을 바탕으로 카드에 버전 값을 두고 서버가 확정한 순서만 브로드캐스트하도록 구조를 바꿔, 모두가 같은 보드를 보게 했습니다.",
    ],
    collabDetail:
      "카드 이동은 충돌이 드물고 짧게 자주 일어나는 작업이라, 매번 잠그는 비관적 락 대신 버전을 비교하는 낙관적 방식을 택했습니다.",
    conflict: [
      "청년미래일경험으로 참여한 티니타이거 쇼핑몰 리뉴얼 프로젝트에서, 칸반 카드 동시 이동 문제의 해결 방식을 두고 팀원과 의견이 갈렸습니다.",
      "팀원은 카드를 옮기는 동안 보드 전체를 잠그자고 했고, 저는 짧고 잦은 이동마다 잠그면 모두의 작업이 멈춘다고 생각했습니다.",
      "저는 실제 사용 흐름을 함께 따라가 보며 같은 카드에서 충돌이 나는 경우가 드물다는 점부터 확인하자고 제안했습니다.",
      "그리고 잠금 대신 카드에 버전 값을 두되, 충돌한 요청은 최신 상태를 다시 받아 화면을 맞추는 방식으로 팀원이 걱정한 데이터 꼬임도 함께 막았습니다.",
      "그 결과 모든 팀원이 같은 보드를 보면서도 작업이 끊기지 않는 구조를 완성했습니다.",
      "이 경험으로 좋은 결론은 한쪽의 고집이 아니라, 함께 확인한 근거에서 나온다는 것을 배웠습니다.",
    ],
    goalLink:
      "티니타이거에서 동시 편집 충돌을 서버 기준으로 풀었던 것처럼, 수강신청처럼 요청이 몰리는 기능에서도 데이터가 하나로 유지되는 구조를 먼저 설계하겠습니다.",
    strength: [
      "티니타이거 협업 워크스페이스에서 화면마다 칸반 결과가 달라지는 문제가 생겼을 때, 저는 화면을 고치기 전에 이벤트가 도착하는 순서부터 기록해 원인을 좁혔습니다.",
      "그 결과 카드에 버전 값을 두고 서버가 확정한 순서만 내보내는 구조로 바꿔, 모든 팀원이 같은 보드를 보게 만들었습니다.",
    ],
    skills: [
      "칸반 보드의 변경은 소켓으로 주고받되, 서버가 확정한 순서만 모든 클라이언트에 브로드캐스트하도록 설계했습니다.",
      "카드마다 버전 값을 두고, 버전이 어긋난 요청은 거절한 뒤 최신 상태를 다시 내려보내 화면을 맞추게 했습니다.",
      "연결이 끊겼다가 돌아온 사용자는 마지막으로 받은 버전 이후의 변경만 다시 받아, 화면을 빠르게 최신 상태로 맞추게 했습니다.",
    ],
    fixSkill: 1,
    projectHook: "모든 팀원이 같은 순간에 같은 화면을 보게 만드는 것, 제 대표 프로젝트가 풀어야 했던 문제입니다.",
    question: "칸반 동시 이동 문제는 팀원의 제보로 알게 되셨나요, 직접 재현하며 발견하셨나요?",
  },
  blavers: {
    kind: "blavers",
    name: "블레이버스",
    focus: "우선순위 합의와 팀 리딩",
    nameMarker: /블레이버스|몽구리/,
    marker: /블레이버스|몽구리|해커톤|MVP|팀장|손글씨|route group|본선/,
    keyFact: "10일 MVP · 핵심 흐름 우선 합의 · Vercel 배포 · 본선 진출",
    context: "제4회 블레이버스 MVP 개발 해커톤에서는 PM·디자이너·개발자로 구성된 팀의 팀장을 맡았습니다.",
    problem: "10일 안에 멘티와 멘토, 두 사용자군의 학습 관리 흐름을 모두 완성해야 했습니다.",
    problemDep: false,
    steps: [
      ["저는 데모 효과가 큰 손글씨 피드백 기능을 다음 단계로 미루고, '계획 → 학습 → 피드백' 핵심 흐름부터 완성하자고 팀과 범위를 합의했습니다.", false],
      ["그리고 Next.js와 Supabase로 역할별 화면과 데이터 모델을 직접 구현했습니다.", true],
    ],
    details: [
      "멘티·멘토 화면은 route group으로 나누고 알림·피드백·북마크 스키마를 먼저 확정해, 팀원들이 서로를 기다리지 않고 병렬로 작업할 수 있게 했습니다.",
      "매일 짧게 남은 범위를 함께 점검하며, 새로 떠오른 아이디어는 바로 구현하지 않고 다음 단계 목록에 쌓아 두었습니다.",
      "발표 직전까지 기능을 늘리기보다, 처음 쓰는 사용자도 막힘없이 끝까지 쓸 수 있는지를 시연 시나리오로 반복해 확인했습니다.",
    ],
    result: "그 결과 멘토링 플랫폼 '몽구리' MVP를 Vercel에 배포하고 본선에 진출했습니다.",
    lesson: "이 경험으로 일정이 촉박할수록 범위와 우선순위를 먼저 합의하는 것이 팀 전체의 속도를 높인다는 것을 배웠습니다.",
    certLine: "정보처리산업기사를 준비하며 익힌 요구사항 분석과 데이터 모델링 기초가, 짧은 일정 안에 스키마를 먼저 확정하는 데 도움이 되었습니다.",
    fitLine: "범위와 우선순위를 먼저 합의하는 습관은, 고객 요구가 자주 바뀌는 대학 SI 현장에서 큰 힘이 될 것이라 생각합니다.",
    brief: "블레이버스 해커톤에서는 팀장으로 핵심 흐름부터 범위를 합의해, 10일 만에 MVP를 배포하고 본선에 진출했습니다.",
    teamwork: "블레이버스 해커톤에서도 직군이 다른 팀원들과 구현 범위를 먼저 합의해 10일 안에 MVP를 완성했습니다.",
    numbersLead: "10일 만의 MVP 배포와 본선 진출은, 제가 팀장으로 범위를 먼저 합의해 만든 결과입니다.",
    role: "팀장으로서 범위와 일정을 조율하는 동시에, 역할별 화면과 데이터 모델 구현까지 직접 맡았습니다.",
    introDetail: "데모 효과가 큰 기능보다 핵심 흐름을 먼저 완성하자고 팀을 설득한 것이 결정적이었습니다.",
    compact: "저는 데모 효과가 큰 손글씨 피드백을 미루고 '계획 → 학습 → 피드백' 핵심 흐름부터 완성하자고 팀과 합의한 뒤, Next.js와 Supabase로 역할별 화면을 직접 구현했습니다.",
    intro: "블레이버스 MVP 개발 해커톤에서는 팀장을 맡아 10일 만에 MVP를 배포하고 본선에 진출했습니다.",
    motive: [
      "블레이버스 해커톤에서는 팀장으로서 멘토와 멘티, 두 사용자군이 각자 필요한 흐름을 끝까지 쓸 수 있도록 범위를 합의해 10일 만에 MVP를 배포했습니다.",
      "기능을 늘리기보다 사용자가 실제로 끝까지 쓰는 흐름을 먼저 완성해야 한다는 것을 그때 배웠습니다.",
      "학생과 교직원처럼 요구가 다른 사용자들의 업무를 하나의 시스템으로 잇는 아카넷에서, 핵심 흐름부터 합의하는 제 방식을 제대로 써 보고 싶어 지원하게 되었습니다.",
    ],
    growth: [
      "블레이버스 해커톤에서 팀장을 맡았을 때, 기능 목록은 길었지만 10일 안에 끝까지 동작하는 흐름은 하나도 없을 수 있다는 위기를 느꼈습니다.",
      "그래서 데모 효과가 큰 손글씨 피드백을 미루고 '계획 → 학습 → 피드백' 흐름부터 완성하자고 팀을 설득했습니다.",
      "그 결과 MVP를 Vercel에 배포하고 본선에 진출하며, 많이 만드는 것보다 끝까지 쓰이게 만드는 것이 중요하다는 것을 배웠습니다.",
    ],
    collab: [
      "저는 첫날 PM·디자이너와 함께 멘티와 멘토의 핵심 흐름을 한 장의 화면 흐름도로 그리고, 10일 안에 끝낼 범위와 다음 단계로 미룰 기능을 나눴습니다.",
      "매일 짧게 남은 범위를 함께 점검하며, 새로 떠오른 아이디어는 바로 구현하지 않고 다음 단계 목록에 쌓아 두었습니다.",
    ],
    collabDetail:
      "멘티·멘토 화면은 route group으로 나누고 알림·피드백·북마크 스키마를 먼저 확정해, 팀원들이 서로를 기다리지 않고 병렬로 작업할 수 있게 했습니다.",
    conflict: [
      "제4회 블레이버스 MVP 개발 해커톤에서 팀장을 맡았을 때, 10일이라는 짧은 일정 안에서 무엇을 먼저 만들지를 두고 의견이 갈렸습니다.",
      "PM과 디자이너는 시연에서 눈에 띄는 손글씨 피드백 기능을 먼저 만들자고 했고, 저는 '계획 → 학습 → 피드백' 핵심 흐름이 끝까지 동작하는 것이 먼저라고 생각했습니다.",
      "저는 제 의견을 고집하기보다 해커톤 심사 기준을 함께 다시 읽자고 제안했고, 심사가 기능의 화려함보다 핵심 사용 흐름의 완성도를 본다는 점을 근거로 설득했습니다.",
      "동시에 데모 임팩트를 걱정하는 팀원들의 우려도 타당했기 때문에, MVP에는 텍스트 피드백을 넣고 손글씨 피드백은 발표에서 다음 단계 로드맵으로 보여 주자는 절충안을 냈습니다.",
      "모두가 납득한 덕분에 남은 기간에는 역할을 나눠 병렬로 작업할 수 있었고, 멘토링 플랫폼 '몽구리' MVP를 Vercel에 배포해 본선에 진출했습니다.",
      "이 경험으로 갈등은 누가 옳은지를 가리는 일이 아니라, 모두가 동의할 수 있는 기준을 함께 찾는 일이라는 것을 배웠습니다.",
    ],
    goalLink:
      "블레이버스 해커톤에서 핵심 흐름부터 범위를 합의했던 것처럼, 대학 현업의 요구도 우선순위부터 정리해 일정 안에 끝까지 완성하겠습니다.",
    strength: [
      "블레이버스 해커톤에서 팀장을 맡았을 때, 저는 기능 목록을 늘리기 전에 사용자가 끝까지 쓰는 흐름이 동작하는지부터 확인하자고 팀을 설득했습니다.",
      "그 결과 10일 만에 MVP를 배포하고 본선에 진출했습니다.",
    ],
    skills: [
      "Next.js와 Supabase로 멘티·멘토 역할별 화면과 데이터 모델을 직접 구현했습니다.",
      "알림·피드백·북마크 스키마를 먼저 확정해, 화면 개발과 데이터 작업이 서로를 기다리지 않게 했습니다.",
      "역할에 따라 볼 수 있는 데이터가 달라지도록, 접근 규칙을 데이터 모델 단계에서 먼저 정했습니다.",
    ],
    fixSkill: 0,
    projectHook: "10일 안에 무엇을 만들고 무엇을 미룰지 정하는 것이, 팀장으로서 내린 가장 중요한 결정이었습니다.",
    question: "손글씨 피드백을 미루자고 했을 때 팀원들의 반응은 어땠고, 무엇이 설득의 결정적 계기였나요?",
  },
};

const ALL_KINDS: ProjectKind[] = ["hello", "tiny", "blavers"];

/** All three prepared evidence entries, used when the selection cannot be matched. */
export function getAllCareerDemoEvidence(): Evidence[] {
  return ALL_KINDS.map((kind) => EVIDENCE[kind]);
}

export function identifyCareerDemoProject(value: unknown): ProjectKind | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return (
    identifyCareerDemoProjectText(record.company) ??
    identifyCareerDemoProjectText(record.title) ??
    identifyCareerDemoProjectText(record.name)
  );
}

export function selectCareerDemoProjects(timeline: unknown, ids: unknown): Evidence[] {
  if (!Array.isArray(timeline) || !Array.isArray(ids)) return [];
  const selectedIds = new Set(ids.filter((id): id is string => typeof id === "string"));
  const seen = new Set<ProjectKind>();
  return timeline.flatMap((record) => {
    if (!record || typeof record !== "object" || !selectedIds.has(record.id)) return [];
    const kind = identifyCareerDemoProject(record);
    if (!kind || seen.has(kind)) return [];
    seen.add(kind);
    return [EVIDENCE[kind]];
  });
}

type DemoRequest = {
  messages?: unknown;
  selectedQuestion?: { id?: unknown; title?: unknown; maxChars?: unknown };
  currentAnswer?: unknown;
  operation?: unknown;
  workflowStage?: unknown;
  backgroundContext?: unknown;
};

/**
 * The resume AI assistant posts without a question, operation or workflow stage and renders the
 * raw stream, so it gets the plain full letter instead of the wizard protocol.
 */
export function isCareerDemoPlainCoverLetterRequest(body: DemoRequest): boolean {
  return body.operation === undefined && body.workflowStage === undefined && !body.selectedQuestion;
}

export function buildCareerDemoFullCoverLetter() {
  return { content: CAREER_DEMO_FULL_COVER_LETTER, protocol: "" };
}

/** A two-paragraph project story (STADRI builder) for whichever project the memo mentions. */
export function buildCareerDemoProjectStory(text: unknown): string {
  const evidence = EVIDENCE[identifyCareerDemoProjectText(text) ?? "hello"];
  const steps = evidence.steps.map(([sentence]) => sentence).join(" ");
  return `${evidence.context} ${evidence.problem} ${steps}\n\n${evidence.result} ${evidence.lesson} ${evidence.fitLine}`;
}

// ---------------------------------------------------------------------------------------------
// Question classification
// ---------------------------------------------------------------------------------------------

const CATEGORY_RULES: Array<[Category, RegExp]> = [
  ["company", /아카넷에\s*대해|회사.{0,6}(아는|이해|소개)|기업.{0,6}(아는|이해|분석)/],
  ["introduction", /자기\s*소개|self[\s-]*intro|about\s*yourself/i],
  ["motivation", /지원.{0,4}(동기|이유)|왜.*(지원|아카넷)|\bwhy\b|\bjoin\b|motivation/i],
  ["goal", /포부|입사\s*후|비전|계획|\d+\s*년\s*(후|뒤)|하고\s*싶은|커리어|career-goal/i],
  ["failure", /실패|좌절|실수|아쉬/],
  ["conflict", /갈등|conflict|의견\s*(차이|충돌|대립)/i],
  ["challenge", /도전|달성|성취|어려[움웠운]|문제.{0,3}해결|극복|열정|challenge/i],
  ["strength", /장점|단점|강점|약점|장단점|strength|weakness/i],
  ["growth", /성장|가치관|가치|growth/i],
  ["collaboration", /협업|팀|협력|리더|소통|커뮤니케이션|teamwork|collaboration/i],
  ["project", /대표|프로젝트|project/i],
  ["competency", /직무|역량|기술|전문성|competency|skill/i],
];

/** Generic categories that step aside when the title also asks something more specific. */
const ABSORBED_BY: Partial<Record<Category, Category[] | "any">> = {
  project: "any",
  competency: "any",
  collaboration: ["conflict"],
  challenge: ["failure"],
  growth: ["goal"],
};

const CATEGORY_LABEL: Record<Category, string> = {
  introduction: "자기소개",
  motivation: "지원동기",
  company: "기업 이해",
  goal: "입사 후 포부",
  strength: "장단점",
  growth: "성장 과정",
  failure: "실패 경험",
  conflict: "갈등 해결",
  challenge: "도전 경험",
  collaboration: "협업 경험",
  project: "대표 프로젝트",
  competency: "직무 역량",
  general: "자유 문항",
};

/** One category, or two (in title order) for combined titles such as "지원동기 및 입사 후 포부". */
export function classifyCareerDemoQuestion(title: string): Category[] {
  const matches = CATEGORY_RULES.flatMap(([category, pattern]) => {
    const found = pattern.exec(title);
    return found ? [{ category, index: found.index }] : [];
  });
  const kept = matches.filter(({ category }) => {
    const rule = ABSORBED_BY[category];
    if (!rule) return true;
    const others = matches.filter((match) => match.category !== category);
    return rule === "any" ? others.length === 0 : !others.some((match) => rule.includes(match.category));
  });
  const ordered = kept.sort((a, b) => a.index - b.index).map(({ category }) => category);
  return ordered.length ? ordered.slice(0, 2) : ["general"];
}

/** Story categories each tell one project in depth; siblings in the same letter should not repeat it. */
const STORY_CATEGORIES = new Set<Category>([
  "strength",
  "growth",
  "failure",
  "conflict",
  "challenge",
  "collaboration",
  "project",
  "competency",
  "general",
]);

const PREFERENCE: Record<Category, ProjectKind[]> = {
  introduction: ["hello", "tiny", "blavers"],
  motivation: ["hello", "tiny", "blavers"],
  company: ["hello", "tiny", "blavers"],
  goal: ["hello", "tiny", "blavers"],
  strength: ["hello", "blavers", "tiny"],
  growth: ["tiny", "hello", "blavers"],
  failure: ["hello", "tiny", "blavers"],
  conflict: ["blavers", "hello", "tiny"],
  challenge: ["hello", "blavers", "tiny"],
  collaboration: ["tiny", "blavers", "hello"],
  project: ["tiny", "hello", "blavers"],
  competency: ["hello", "tiny", "blavers"],
  general: ["hello", "tiny", "blavers"],
};

function pickFor(category: Category, projects: Evidence[], used: Set<ProjectKind>): Evidence {
  const ranked = PREFERENCE[category]
    .map((kind) => projects.find((project) => project.kind === kind))
    .filter((project): project is Evidence => Boolean(project));
  const fresh = ranked.find((project) => !used.has(project.kind)) ?? ranked[0] ?? projects[0];
  if (STORY_CATEGORIES.has(category)) used.add(fresh.kind);
  return fresh;
}

function pickPair(categories: Category[], projects: Evidence[], used: Set<ProjectKind>): Evidence[] {
  const first = pickFor(categories[0], projects, used);
  if (categories.length < 2) return [first];
  const local = new Set(used);
  local.add(first.kind);
  const second = pickFor(categories[1], projects, local);
  if (STORY_CATEGORIES.has(categories[1])) used.add(second.kind);
  return [first, second];
}

/** Sibling titles listed by the wizard under "[문항 정보]" in the background context. */
function siblingTitles(backgroundContext: unknown): string[] {
  if (typeof backgroundContext !== "string") return [];
  const start = backgroundContext.indexOf("[문항 정보]");
  if (start < 0) return [];
  const titles: string[] = [];
  for (const raw of backgroundContext.slice(start + "[문항 정보]".length).split("\n")) {
    const text = raw.trim();
    if (!text) {
      if (titles.length) break;
      continue;
    }
    if (text.startsWith("[")) break;
    const match = text.match(/^\d+\.\s*(.+?)(?:\s*\(\d+자\))?$/);
    if (match) titles.push(match[1].trim());
  }
  return titles;
}

/** The evidence per category for this question, steering clear of projects its siblings use. */
function assignEvidence(title: string, categories: Category[], projects: Evidence[], backgroundContext: unknown): Evidence[] {
  const used = new Set<ProjectKind>();
  for (const sibling of siblingTitles(backgroundContext)) {
    const picked = pickPair(classifyCareerDemoQuestion(sibling), projects, used);
    if (sibling === title) return picked;
  }
  return pickPair(categories, projects, new Set());
}

// ---------------------------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------------------------

type Template = Line[][];

const KEYWORD_LINES = [
  "SQLD로 다진 SQL 역량과 Java·전자정부 표준프레임워크로 수강신청 예제를 구현하며 익힌 계층 구조는, 아카넷의 대학 통합정보시스템 개발에 바로 쓸 수 있는 기본기입니다.",
  "Java·Spring과 전자정부 표준프레임워크로 화면과 서버를 만들고, SQLD로 다진 SQL 역량으로 대학 통합정보시스템의 학사 데이터를 정확하게 다루는 것이 제가 아카넷에서 해내고 싶은 일입니다.",
  "대학 통합정보시스템의 학사 데이터는 한 번의 오류가 수천 명에게 번지는 만큼, Java와 전자정부 표준프레임워크로 기능을 만들 때도 SQLD를 준비하며 익힌 정규화·트랜잭션 원칙부터 지키겠습니다.",
];

/** Closing lines and the alternative a "자연스럽게 다듬어줘" request swaps in. */
const CLOSES: Record<Category, [string, string]> = {
  introduction: [
    "데이터의 정합성이 곧 서비스의 신뢰가 되는 대학 통합정보시스템에서, 아카넷의 학사 데이터를 정확하게 다루는 개발자로 성장하겠습니다.",
    "근거를 확인하는 습관만큼은 누구보다 단단한 신입으로, 아카넷의 대학 통합정보시스템을 더 믿을 수 있게 만드는 데 기여하겠습니다.",
  ],
  motivation: [
    "사용자로 느꼈던 불편을 개발자로 직접 고치는 첫 회사가 아카넷이기를 바랍니다.",
    "학생으로 느꼈던 불편을 개발자로 직접 고치는 일, 그 첫걸음을 아카넷에서 내딛고 싶습니다.",
  ],
  company: [
    "대학 구성원 모두가 매일 쓰는 시스템을 만든다는 책임감을 이해하고, 그 일에 함께하고 싶습니다.",
    "아카넷이 대학과 함께 쌓아 온 신뢰를, 정확한 데이터를 다루는 개발자로서 이어 가고 싶습니다.",
  ],
  goal: [
    "아카넷의 대학 통합정보시스템을 믿고 쓰는 학생과 교직원이 늘어나는 데, 제가 맡은 모듈이 보탬이 되도록 꾸준히 성장하겠습니다.",
    "학생과 교직원이 믿고 쓰는 시스템 뒤에서 묵묵히 데이터를 지키는 개발자로, 아카넷과 함께 성장하겠습니다.",
  ],
  strength: [
    "아카넷에서도 근거를 확인하는 꼼꼼함과 일정을 지키는 균형을 함께 갖춘 개발자가 되겠습니다.",
    "근거를 확인하는 꼼꼼함에 일정 감각을 더해, 아카넷에서 믿고 맡길 수 있는 개발자가 되겠습니다.",
  ],
  growth: [
    "아카넷에서도 구현의 이유를 설명할 수 있는 개발자로, 동료의 피드백을 반영하며 계속 성장하겠습니다.",
    "‘왜 이 결과가 맞는가’를 묻는 습관을 잃지 않고, 아카넷에서 동료와 함께 배우며 성장하겠습니다.",
  ],
  failure: [
    "아카넷에서도 운영 이슈를 마주하면 감이 아니라 재현과 근거로 원인을 찾고, 그 과정을 기록으로 남기겠습니다.",
    "실패에서 배운 검증 습관으로, 아카넷의 운영 이슈도 재현과 근거로 끝까지 해결하겠습니다.",
  ],
  conflict: [
    "아카넷에서도 대학 현업과 의견이 다를 때, 요구의 이유를 먼저 묻고 근거와 절충안으로 합의를 이끌겠습니다.",
    "아카넷에서도 의견이 갈릴 때 상대의 걱정을 먼저 듣고, 모두가 납득할 수 있는 기준으로 합의를 만들겠습니다.",
  ],
  challenge: [
    "아카넷에서도 운영 이슈가 생기면 원인을 재현하고 근거를 남기며 끝까지 해결하겠습니다.",
    "어떤 문제든 원인을 재현하고 근거를 남기는 방식으로, 아카넷의 운영 이슈를 끝까지 책임지겠습니다.",
  ],
  collaboration: [
    "요구가 자주 바뀌는 대학 SI 현장에서도 합의한 기준을 문서로 남기고, 그 기준으로 팀과 소통하는 개발자가 되겠습니다.",
    "아카넷에서도 대학 현업과 개발팀이 같은 기준을 보도록, 합의한 내용을 문서로 남기며 소통하겠습니다.",
  ],
  project: [
    "이 프로젝트에서 세운 판단 기준을, 아카넷의 대학 통합정보시스템 개발에서도 그대로 지키겠습니다.",
    "이 프로젝트에서 얻은 설계 감각을 살려, 아카넷의 학사 데이터를 정확하게 다루는 기능을 만들겠습니다.",
  ],
  competency: [
    "아카넷에서도 학사 데이터의 정합성을 먼저 확인하는 개발자가 되겠습니다.",
    "공고가 요구하는 데이터 정합성과 SQL 역량을 실무로 증명해 본 신입으로서, 아카넷의 학사 데이터를 책임지겠습니다.",
  ],
  general: [
    "이 습관으로 아카넷의 대학 통합정보시스템에서도 믿을 수 있는 기능을 만들겠습니다.",
    "근거를 끝까지 확인하는 이 태도로, 아카넷의 학사 데이터를 정확하게 다루는 개발자가 되겠습니다.",
  ],
};

/** Replacement openings. Story openings get the hook in front; thesis openings are swapped out. */
function hooksFor(category: Category, evidence: Evidence): string[] {
  switch (category) {
    case "introduction":
      return [
        "‘모른다’고 답할 줄 아는 AI를 만들어 본 개발자, 김정환입니다.",
        "숫자보다 그 숫자의 근거를 먼저 묻는 신입 개발자, 김정환입니다.",
        "틀린 답보다 근거 있는 답을 고집해 온 개발자, 김정환입니다.",
      ];
    case "motivation":
      return [
        "매일 쓰던 학사시스템을, 이제는 만드는 쪽에서 더 낫게 만들고 싶습니다.",
        "수천 명이 같은 순간에 누르는 ‘신청’ 버튼 뒤의 데이터를 책임지는 개발자가 되고 싶습니다.",
        "학생으로 겪은 학사시스템의 불편이, 제가 개발자로 풀고 싶은 첫 번째 문제입니다.",
      ];
    case "company":
      return [
        "아카넷은 대학 구성원 모두가 매일 쓰는 시스템을 만드는 회사라는 점에서, 제가 가장 일하고 싶은 곳입니다.",
        "제가 이해한 아카넷은 ‘대학의 데이터를 하나로 잇는 회사’입니다.",
      ];
    case "goal":
      return [
        "3개월, 1년, 3년, 단계마다 아카넷에서 해낼 일을 구체적으로 정해 두었습니다.",
        "아카넷에서 제 첫 목표는 ‘믿고 맡길 수 있는 학사 모듈 담당자’가 되는 것입니다.",
      ];
    case "strength":
      return [
        "틀린 답을 내놓느니 근거를 한 번 더 확인하는 집요함, 그것이 제 가장 큰 강점입니다.",
        "제 강점은 결과가 맞는지 스스로 증명할 방법부터 찾는다는 것입니다.",
      ];
    case "growth":
      return [
        "저를 성장시킨 것은 잘 돌아가는 코드가 아니라, 틀린 데이터를 마주한 순간들이었습니다.",
        "제 성장 과정은 ‘왜 이 결과가 맞는가’를 묻는 습관이 자라 온 과정이었습니다.",
      ];
    case "failure":
      return [
        "실패는 제가 무엇을 검증하지 않았는지 알려 준 가장 정확한 피드백이었습니다.",
        "제 개발 방식을 바꾼 것은 성공보다 한 번의 아쉬운 결과였습니다.",
      ];
    case "conflict":
      return [
        "갈등이 생기면 저는 ‘누가 옳은가’보다 ‘무엇을 기준으로 정할까’를 먼저 묻습니다.",
        "좋은 합의는 서로의 걱정을 모두 테이블 위에 올려놓는 데서 시작된다고 믿습니다.",
      ];
    case "challenge":
      return [
        "어려운 문제일수록 저는 감보다 재현 가능한 근거를 먼저 찾습니다.",
        "포기하지 않는 끈기보다 중요한 것은, 원인을 끝까지 좁혀 가는 방법이라고 생각합니다.",
      ];
    case "collaboration":
      return [
        "좋은 협업은 모두가 같은 기준을 보는 데서 시작된다고 믿습니다.",
        "팀이 같은 화면을 보게 만드는 것, 그것이 제가 협업에서 맡아 온 역할입니다.",
      ];
    case "project":
      return [evidence.projectHook, "제 대표 프로젝트는 기능보다 데이터의 기준을 먼저 세워 문제를 푼 경험입니다."];
    default:
      return [
        "아카넷 웹개발자에게 가장 필요한 역량은 학사 데이터를 정확하게 다루는 힘이고, 저는 그 힘을 실무 프로젝트에서 길러 왔습니다.",
        "제 역량을 한 문장으로 말하면, 데이터가 맞는지 끝까지 확인하고 그 근거를 설명할 수 있다는 것입니다.",
      ];
  }
}

function stepLines(evidence: Evidence, tier = C): Line[] {
  return evidence.steps.map(([text, dep]) => line(text, tier, dep));
}

function closeLine(category: Category): Line {
  return line(CLOSES[category][0], A, false, "close");
}

/** The 도전 경험 opening matches how each project's problem was actually solved. */
const CHALLENGE_THESIS: Record<ProjectKind, string> = {
  hello: "어려운 문제를 만나면 저는 결과를 고치기 전에, 결과에 영향을 주는 데이터와 처리 흐름부터 확인합니다.",
  tiny: "어려운 문제를 만나면 저는 눈에 보이는 증상을 고치기 전에, 문제가 생기는 흐름부터 재현합니다.",
  blavers: "어려운 문제일수록 저는 모든 것을 해내려 하기보다, 무엇을 먼저 해야 하는지부터 정합니다.",
};

const FAILURE_LINES = {
  thesis: "제가 가장 크게 좌절했던 순간은, 공들여 만든 AI 상담 어시스턴트의 첫 성적표를 받았을 때였습니다.",
  context:
    "청년미래일경험으로 참여한 헬로프렌즈 Vizabridge에서 행정 문서 약 1,200건을 정제해 적재했지만, 처음 측정한 근거 일치율은 기대에 못 미쳤습니다.",
  mistake: "돌아보면 문서를 많이 넣으면 답도 좋아질 것이라고 막연히 믿고, 답변을 무엇으로 검증할지 정하지 않은 채 개발한 것이 실수였습니다.",
  analysis: "그래서 상담 로그에서 자주 나온 질문 150개로 평가셋을 만들고, 담당자와 함께 정답 근거를 표시해 오답을 하나씩 분석했습니다.",
  result:
    "원인 분석 결과 오답 대부분은 개정 전 문서를 근거로 삼은 경우였고, 시행일 메타데이터로 최신 문서를 우선 검색하게 바꾸자 근거 일치율이 약 87%(150문항 중 131문항)까지 올라갔습니다.",
  habit: "이후로는 기능을 만들기 전에 무엇으로 맞았다고 판단할지부터 정합니다.",
};

function storyTexts(evidence: Evidence): string[] {
  return [
    evidence.problem,
    ...evidence.steps.map(([text]) => text),
    ...evidence.details,
    evidence.result,
    evidence.lesson,
    evidence.certLine,
    evidence.role,
    ...evidence.skills,
    ...evidence.collab,
    evidence.collabDetail,
  ];
}

/** A category template with every story sentence tied to the sentence that introduces it. */
function template(category: Category, evidence: Evidence, projects: Evidence[]): Template {
  const paragraphs = rawTemplate(category, evidence, projects);
  switch (category) {
    case "introduction":
    case "goal":
    case "company":
      return paragraphs;
    case "motivation":
      return bind(paragraphs, evidence.motive[0], evidence.motive.slice(1));
    case "growth":
      return bind(paragraphs, evidence.growth[0], evidence.growth.slice(1));
    case "conflict":
      return bind(paragraphs, evidence.conflict[0], evidence.conflict.slice(1, 5));
    case "strength":
      return bind(paragraphs, evidence.strength[0], [evidence.strength[1], evidence.details[0]]);
    case "failure":
      return evidence.kind === "hello"
        ? bind(paragraphs, FAILURE_LINES.context, [FAILURE_LINES.mistake, FAILURE_LINES.analysis, FAILURE_LINES.result, evidence.details[0]])
        : bindResult(bind(paragraphs, evidence.context, storyTexts(evidence)), evidence);
    default:
      return bindResult(bind(paragraphs, evidence.context, storyTexts(evidence)), evidence);
  }
}

/** "그 결과 …" only reads right while the action that produced it is still in the answer. */
function bindResult(paragraphs: Template, evidence: Evidence): Template {
  const lastStep = evidence.steps[evidence.steps.length - 1][0];
  return bind(bind(paragraphs, lastStep, [evidence.result]), evidence.skills[evidence.fixSkill], [evidence.result]);
}

function rawTemplate(category: Category, evidence: Evidence, projects: Evidence[]): Template {
  const others = projects.filter((project) => project.kind !== evidence.kind);
  const contextLines = [line(evidence.context, C), line(evidence.problem, C, evidence.problemDep)];
  switch (category) {
    case "introduction":
      return [
        [
          line("데이터의 근거를 끝까지 확인하는 개발자, 김정환입니다.", A, false, "thesis"),
          line("부천대학교 컴퓨터소프트웨어과를 2027년 2월 졸업할 예정이며, SQLD와 정보처리산업기사를 취득했습니다.", C),
          line("‘일단 동작하는 코드’보다 ‘왜 이 결과가 맞는지 설명할 수 있는 코드’를 목표로 개발해 왔습니다.", O),
        ],
        [
          line(evidence.intro, C),
          ...others.map((project) => line(project.intro, S)),
          ...(others.length ? [line("어떤 프로젝트에서든 화면보다 데이터의 기준을 먼저 세웠을 때 문제가 풀렸습니다.", O)] : []),
        ],
        [
          line("지금은 Java·Spring과 전자정부 표준프레임워크를 익히며, 아카넷 공고가 요구하는 웹 개발 기본기를 채우고 있습니다.", S),
          closeLine(category),
        ],
      ];
    case "motivation":
      return [
        [
          line("수강신청 날마다 장바구니에 담아 둔 과목이 시간표에서 겹친다는 사실을 신청 직전에야 알게 되곤 했습니다.", A, false, "story"),
          line("그때마다 이 검사를 장바구니 단계에서 미리 해 줄 수는 없을까 생각했습니다.", S, true),
          line(
            "학생 수천 명이 같은 순간에 같은 화면을 쓰는 학사시스템은, 작은 불편 하나도 수천 번 반복된다는 점에서 개발자가 만들 수 있는 가장 영향력 큰 서비스라고 생각합니다.",
            C,
          ),
          // "Why Acanet" is the point of the answer, so it is dropped only as a last resort.
          line(
            "아카넷은 대학 통합정보시스템(URP/CRP)과 자체 프레임워크 aXis Platform으로 학사·학생·취업 데이터를 하나의 흐름으로 연결하는 회사입니다.",
            A,
          ),
          line(
            "학생 이력·역량 관리와 취업통계 서비스까지 직접 만든다는 점에서, 학생의 입학부터 졸업 이후까지를 데이터로 잇는 일을 가장 가까이에서 배울 수 있다고 보았습니다.",
            O,
            true,
          ),
        ],
        [
          line(evidence.motive[0], C),
          line(evidence.motive[1], S, true),
          line(evidence.motive[2], C),
          line("특히 SQLD와 정보처리산업기사를 준비하며 익힌 정규화·트랜잭션 개념을, 학사 데이터를 직접 다루는 현장에서 제대로 써 보고 싶습니다.", O),
        ],
        [closeLine(category)],
      ];
    case "company":
      return [
        [
          line("아카넷은 2009년 설립된 대전 본사의 소프트웨어 기업으로, 대학 통합정보시스템(URP/CRP) 구축을 주력으로 하고 있습니다.", A, false, "story"),
          line(
            "자체 개발 프레임워크 aXis Platform을 바탕으로 학사·학생·교무 행정은 물론 NCS 교육과정 운영, 학생 이력·역량 관리, 취업통계·분석 서비스까지 대학의 데이터를 하나의 흐름으로 연결합니다.",
            C,
          ),
          line("대학·공공·교육 분야 SI와 ISP/BPR·EA·BI 컨설팅까지 수행해, 시스템을 만드는 일과 업무를 설계하는 일을 함께 한다는 점이 인상 깊었습니다.", O),
        ],
        [
          line(
            "제가 이해한 아카넷 웹개발자의 일은 Java·Spring과 전자정부 표준프레임워크로 학사 업무 화면과 서버 기능을 만들고, 요구사항 분석부터 화면·DB 설계, 단위 테스트까지 책임지는 것입니다.",
            C,
          ),
          line("공고가 SQLD 보유자를 우대하는 것도, 학사 데이터의 정합성이 곧 서비스의 신뢰이기 때문이라고 생각합니다.", S),
          line("고객(대학) 현업의 언어로 문제를 정의하고 산출물과 작업 기록을 꼼꼼히 남기는 문화 역시, 제가 일해 온 방식과 닮아 있습니다.", O),
        ],
        [line(evidence.fitLine, C), closeLine(category)],
      ];
    case "goal":
      return [
        [
          line(
            "입사 전부터 전자정부 표준프레임워크로 수강신청 예제를 직접 구현하며, 서비스 계층의 트랜잭션 처리와 MyBatis 매퍼 구조를 익히고 있습니다.",
            A,
            false,
            "story",
          ),
          line(
            "수습 3개월 동안에는 aXis Platform의 구조와 대학 학사 업무의 흐름을 빠르게 익히고, 기존 대학 사이트 유지보수에서 장애 원인과 해결 과정을 문서로 남기는 습관부터 들이겠습니다.",
            C,
          ),
        ],
        [
          line("1년 안에는 학사 업무 한 모듈을 요구사항 분석부터 화면·DB 설계, 단위 테스트까지 책임지는 개발자가 되겠습니다.", C),
          line(evidence.goalLink, S),
          line("SQLD로 다진 SQL 역량을 살려, 화면 기능뿐 아니라 쿼리 성능과 데이터 정합성까지 함께 책임지겠습니다.", O),
        ],
        [
          line(
            "3년 뒤에는 수강신청 장바구니 단계의 시간표 충돌·선수과목 사전 검사처럼, 학생으로서 겪었던 불편을 데이터로 증명하고 고치는 개선안을 먼저 제안하는 개발자가 되겠습니다.",
            C,
          ),
          line("그 개선이 학생 수천 명의 시간을 아끼는 일이라는 것을 누구보다 잘 알기 때문입니다.", O, true),
          closeLine(category),
        ],
      ];
    case "strength": {
      const blavers = others.find((project) => project.kind === "blavers");
      return [
        [
          line("저의 강점은 데이터의 근거를 끝까지 확인하는 집요함입니다.", A, false, "thesis"),
          line(evidence.strength[0], C),
          line(evidence.strength[1], S, true),
          line(evidence.details[0], O),
        ],
        [
          line("반면 처음부터 완벽한 구조를 만들려다 일정이 빠듯해진 적이 있습니다.", C),
          line("그래서 지금은 핵심 요구사항과 검증 기준을 먼저 정리하고, 진행 상황을 팀과 짧은 주기로 공유하며 개발합니다.", C, true),
          ...(blavers
            ? [line("블레이버스 해커톤에서 데모 효과가 큰 기능을 미루고 핵심 흐름부터 완성한 것도, 이 단점을 보완하려는 연습이었습니다.", O, true)]
            : []),
        ],
        [closeLine(category)],
      ];
    }
    case "growth":
      return [
        [
          line("학과 수업에서 JSP·Servlet으로 첫 게시판을 만들 때만 해도, 제게 좋은 개발의 기준은 ‘일단 동작하는 기능’이었습니다.", A, false, "story"),
          line("그때는 화면에 결과가 나오기만 하면 할 일을 다 했다고 생각했습니다.", O, true),
          line("그 기준이 바뀐 것은 실무 프로젝트에서 ‘돌아가기는 하지만 믿을 수 없는 결과’를 처음 마주했을 때였습니다.", C),
        ],
        [line(evidence.growth[0], C), line(evidence.growth[1], S, true), line(evidence.growth[2], C)],
        [
          line("이후 저는 기술을 고르기 전에 해결할 문제와 데이터의 흐름부터 확인하는 개발자가 되었습니다.", C),
          line("SQLD와 정보처리산업기사를 준비하며 정규화와 트랜잭션을 공부한 것도, 이 기준을 이론으로 단단히 하기 위해서였습니다.", O, true),
          line("지금도 기능을 만들기 전에는 ‘이 결과가 맞다는 것을 무엇으로 확인할까’를 먼저 적어 두고 시작합니다.", O),
          closeLine(category),
        ],
      ];
    case "failure":
      if (evidence.kind === "hello") {
        return [
          [line(FAILURE_LINES.thesis, A, false, "thesis"), line(FAILURE_LINES.context, C), line(FAILURE_LINES.mistake, C)],
          [line(FAILURE_LINES.analysis, C), line(FAILURE_LINES.result, C), line(evidence.details[0], O)],
          [line(FAILURE_LINES.habit, S), closeLine(category)],
        ];
      }
      return [
        [line("처음 고른 방법이 틀렸다는 것을 인정하는 데서부터 문제를 다시 풀었던 경험이 있습니다.", A, false, "thesis"), ...contextLines],
        [...stepLines(evidence), line(evidence.details[0], O), line(evidence.result, C)],
        [line(evidence.lesson, S), closeLine(category)],
      ];
    case "conflict":
      return [
        [
          line("의견이 부딪힐 때 저는 누가 옳은지보다, 모두가 동의할 수 있는 기준을 먼저 찾으려고 합니다.", A, false, "thesis"),
          line(evidence.conflict[0], C),
          line(evidence.conflict[1], C, true),
        ],
        [line(evidence.conflict[2], C), line(evidence.conflict[3], C), line(evidence.conflict[4], S)],
        [line(evidence.conflict[5], S), closeLine(category)],
      ];
    case "collaboration":
      return [
        [
          line("협업에서 제가 가장 중요하게 여기는 것은 모든 팀원이 같은 기준과 같은 화면을 보게 만드는 일입니다.", A, false, "thesis"),
          ...contextLines,
        ],
        [line(evidence.collab[0], C), line(evidence.collab[1], C), line(evidence.collabDetail, O), line(evidence.result, S)],
        [...(others[0] ? [line(others[0].teamwork, O)] : []), closeLine(category)],
      ];
    case "challenge":
      return [
        [
          line(CHALLENGE_THESIS[evidence.kind], A, false, "thesis"),
          ...contextLines,
        ],
        [...stepLines(evidence), line(evidence.details[0], O), line(evidence.result, C)],
        [line(evidence.lesson, S), closeLine(category)],
      ];
    case "project":
      return [
        [line(evidence.context, A, false, "story"), line(evidence.problem, C, evidence.problemDep), line(evidence.role, S)],
        [...stepLines(evidence), line(evidence.details[0], C), line(evidence.details[1], O), line(evidence.result, C)],
        [line(evidence.lesson, S), line(evidence.fitLine, S), closeLine(category)],
      ];
    default: {
      const thesis =
        category === "competency"
          ? "제가 가진 가장 큰 직무 역량은 데이터의 근거를 끝까지 확인하는 습관입니다."
          : "제가 아카넷에 가장 자신 있게 보여 드릴 수 있는 것은, 데이터의 근거를 끝까지 확인하는 습관입니다.";
      return [
        [line(thesis, A, false, "thesis"), line(evidence.context, C), line(evidence.problem, S, evidence.problemDep)],
        [
          line(evidence.skills[0], C),
          line(evidence.skills[1], C),
          line(evidence.skills[2], S),
          line(evidence.details[0], O),
          line(evidence.result, C),
        ],
        [line(evidence.certLine, S), closeLine(category)],
      ];
    }
  }
}

function textsOf(paragraphs: Template): Set<string> {
  return new Set(paragraphs.flat().map((item) => item.text));
}

const INTRO_TEAM_LINE =
  "팀 프로젝트에서는 합의한 기준과 진행 상황을 문서로 남기는 역할을 자주 맡았는데, 산출물과 작업 기록을 꼼꼼히 남기는 아카넷의 문화와도 잘 맞는다고 생각합니다.";
const KEYWORD_CATEGORIES = new Set<Category>(["motivation", "competency", "general", "project", "challenge", "failure"]);
/** Answers where one more project, introduced with "이 밖에도", reads as extra evidence rather than a detour. */
const BRIEF_CATEGORIES = new Set<Category>(["competency", "general", "project", "challenge", "failure", "motivation"]);

/** Where more technical detail about the same project strengthens the answer (not 갈등/성장 stories). */
const DETAIL_CATEGORIES = new Set<Category>(["competency", "general", "project", "challenge", "failure", "collaboration", "strength"]);
const CERT_CATEGORIES = new Set<Category>(["project", "challenge", "failure"]);

const GOAL_EXTRA = [
  "사내 코드 리뷰와 산출물 작성 기준도 빠르게 익혀, 제 작업 기록이 다음 담당자에게도 도움이 되게 하겠습니다.",
  "2년 차에는 운영 중 반복되는 문의와 장애를 데이터로 분류해, 같은 문제가 다시 생기지 않도록 개선 과제로 정리하겠습니다.",
  "업무 외 시간에는 Spring과 Oracle 쿼리 튜닝을 꾸준히 공부해, 수강신청처럼 요청이 몰리는 시기에도 안정적인 기능을 만들겠습니다.",
];
const COMPANY_EXTRA = [
  "대전 본사와 서울·부산 지사를 두고 대학·공공·교육 분야 고객을 직접 지원하는 구조라는 점에서, 고객 가까이에서 배우며 성장할 수 있는 회사라고 생각했습니다.",
  "장기근속 포상처럼 오래 함께 성장하는 문화를 갖추고 있다는 점도, 한 분야를 깊이 파고들고 싶은 제게 큰 의미로 다가왔습니다.",
];

function bindLine(item: Line, anchor: string): Line {
  return bind([[item]], anchor, [item.text])[0][0];
}

/** A second project told from the same angle, for long forms (introduced so it never reads as a detour). */
function secondStory(category: Category, others: Evidence[]): Line[] | null {
  if (!others.length) return null;
  const story = (lead: string, texts: (other: Evidence) => Array<[string, boolean]>) => {
    const segments = others.slice(0, 2).map((other) => {
      const told = texts(other).map(([text, dep]) => bindLine(line(text, X, dep), lead));
      // A project's story is kept whole or not at all: each sentence needs the others.
      const all = told.map((item) => item.text);
      told.forEach((item) => (item.needs = Array.from(new Set([...(item.needs ?? []), ...all.filter((text) => text !== item.text)]))));
      return told;
    });
    const leadLine = line(lead, X);
    leadLine.needs = [segments[0][0].text];
    return [leadLine, ...segments.flat()];
  };
  switch (category) {
    case "strength":
      return story("이 강점은 다른 프로젝트에서도 같은 방식으로 드러났습니다.", (other) => [
        [other.strength[0], false],
        [other.strength[1], true],
      ]);
    case "growth":
      return story("이 기준은 이후 다른 프로젝트에서도 제 판단의 출발점이 되었습니다.", (other) => [
        [other.growth[0], false],
        [other.growth[1], true],
        [other.growth[2], false],
      ]);
    case "collaboration":
      return story("다른 프로젝트에서도 같은 방식으로 팀의 기준을 먼저 맞췄습니다.", (other) => [
        [other.collab[0], false],
        [other.collab[1], false],
      ]);
    case "conflict":
      return story("비슷한 갈등은 다른 프로젝트에서도 있었습니다.", (other) => [
        [other.conflict[0], false],
        [other.conflict[1], true],
        [other.conflict[3], false],
      ]);
    default:
      return null;
  }
}

/** Extra material (tier X) so long forms can be filled to ~80-90%; trimmed first on short forms. */
function withExpansion(paragraphs: Template, category: Category, evidence: Evidence, projects: Evidence[]): Template {
  const body = paragraphs.map((paragraph) => [...paragraph]);
  const last = body[body.length - 1];
  const beforeCloseIndex = () => Math.max(0, last.length - 1);
  const used = textsOf(paragraphs);
  const others = projects.filter((project) => project.kind !== evidence.kind);
  if (category === "introduction") {
    for (const paragraph of body) {
      for (let index = paragraph.length - 1; index >= 0; index -= 1) {
        const owner = projects.find((project) => project.intro === paragraph[index].text);
        if (owner) paragraph.splice(index + 1, 0, bindLine(line(owner.introDetail, X), owner.intro));
      }
    }
    last.splice(beforeCloseIndex(), 0, line(INTRO_TEAM_LINE, X));
    return body;
  }
  if (category === "goal") {
    body[0].push(line(GOAL_EXTRA[0], X));
    body[Math.min(1, body.length - 1)].push(line(GOAL_EXTRA[1], X), line(GOAL_EXTRA[2], X));
    last.splice(beforeCloseIndex(), 0, ...others.map((project) => line(project.goalLink, X)));
    return body;
  }
  if (category === "company") {
    body[0].push(line(COMPANY_EXTRA[0], X));
    body[Math.min(1, body.length - 1)].push(line(COMPANY_EXTRA[1], X));
    last.splice(beforeCloseIndex(), 0, ...others.map((project) => line(project.fitLine, X)));
    return body;
  }
  if (DETAIL_CATEGORIES.has(category)) {
    const extra = evidence.details.filter((detail) => !used.has(detail)).slice(0, 2);
    // Append to the last paragraph that tells this project's story (not the weakness or closing part).
    const storyIndexes = body
      .slice(0, -1)
      .map((paragraph, index) => (paragraph.some((item) => evidence.marker.test(item.text)) ? index : -1))
      .filter((index) => index >= 0);
    const target = body[storyIndexes.length ? storyIndexes[storyIndexes.length - 1] : Math.max(0, body.length - 2)];
    target.push(...extra.map((detail) => line(detail, X)));
    if (!used.has(evidence.certLine) && CERT_CATEGORIES.has(category)) {
      last.splice(beforeCloseIndex(), 0, line(evidence.certLine, X));
    }
  }
  const second = secondStory(category, others.filter((project) => !used.has(project.teamwork)));
  if (second) body.splice(body.length - 1, 0, second);
  const briefOthers = others.filter((project) => !used.has(project.brief) && !used.has(project.teamwork));
  if (briefOthers.length && BRIEF_CATEGORIES.has(category)) {
    const briefs = briefOthers.map((project, index) => line(index === 0 ? `이 밖에도 ${project.brief}` : project.brief, X));
    last.splice(beforeCloseIndex(), 0, ...briefs);
  }
  if (KEYWORD_CATEGORIES.has(category) && ![...used].some((text) => /전자정부/.test(text))) {
    last.splice(beforeCloseIndex(), 0, line(KEYWORD_LINES[0], X));
  }
  return rebindStory(body, category, evidence);
}

/** Extra story sentences still need the sentence that introduced the project. */
function rebindStory(paragraphs: Template, category: Category, evidence: Evidence): Template {
  if (category === "failure" && evidence.kind === "hello") return bind(paragraphs, FAILURE_LINES.context, evidence.details);
  if (category === "strength") return bind(paragraphs, evidence.strength[0], evidence.details);
  if (category === "growth") return bind(paragraphs, evidence.growth[0], evidence.details);
  if (category === "conflict") return bind(paragraphs, evidence.conflict[0], evidence.details);
  if (category === "motivation" || category === "goal" || category === "company") return paragraphs;
  return bind(paragraphs, evidence.context, storyTexts(evidence));
}

const COMPACT_CATEGORIES = new Set<Category>(["challenge", "competency", "general", "project", "failure"]);

/** Half of a combined answer: a story category is told in one compact arc (context → action → result). */
function partTemplate(category: Category, evidence: Evidence, projects: Evidence[]): Template {
  const full = template(category, evidence, projects);
  if (!COMPACT_CATEGORIES.has(category)) return full;
  const thesis = full[0][0];
  const close = full[full.length - 1].filter((item) => item.role === "close");
  if (category === "failure" && evidence.kind === "hello") {
    return [[thesis, line(FAILURE_LINES.context, C), line(FAILURE_LINES.analysis, C), line(FAILURE_LINES.result, C)], close];
  }
  const context = line(evidence.context, C);
  const problem = bindLine(line(evidence.problem, S, evidence.problemDep), evidence.context);
  const action = bindLine(line(evidence.compact, C), evidence.context);
  const result = bindLine(line(evidence.result, C), evidence.compact);
  const opening = thesis.text === evidence.context ? [] : [thesis];
  return [[...opening, context, problem, action, result], close];
}

/** Render a draft. Combined titles answer each part in about half of the budget. */
function renderDraft(categories: Category[], evidences: Evidence[], projects: Evidence[], limit: number): string {
  if (categories.length === 1) {
    return renderTemplate(withExpansion(template(categories[0], evidences[0], projects), categories[0], evidences[0], projects), limit);
  }
  const first = partTemplate(categories[0], evidences[0], projects).map((paragraph) => paragraph.filter((item) => item.role !== "close"));
  // The first part now ends on its last core sentence, not on an optional aside.
  for (let index = first.length - 1; index >= 0; index -= 1) {
    const paragraph = first[index];
    while (paragraph.length && paragraph[paragraph.length - 1].tier < C) paragraph.pop();
    if (paragraph.length) break;
  }
  const second = partTemplate(categories[1], evidences[1] ?? evidences[0], projects);
  // Each half is short, so it reads best as one paragraph.
  const asParagraph = (text: string) => (text.length < 450 ? text.replace(/\n\n/g, " ") : text);
  const head = asParagraph(renderTemplate(first.filter((paragraph) => paragraph.length), Math.floor((limit - 2) / 2)));
  return `${head}\n\n${asParagraph(renderTemplate(second, Math.max(40, limit - head.length - 2)))}`;
}

let registryReady = false;
/** Register every prepared sentence once so drafts read back from the chat keep their tiers. */
function ensureRegistry() {
  if (registryReady) return;
  registryReady = true;
  const all = getAllCareerDemoEvidence();
  const categories = Object.keys(CATEGORY_LABEL) as Category[];
  for (const category of categories) {
    for (const evidence of all) {
      withExpansion(template(category, evidence, all), category, evidence, all);
      for (const hook of hooksFor(category, evidence)) line(hook, A, false, "hook");
    }
    line(CLOSES[category][1], A, false, "close");
  }
  for (const evidence of all) {
    for (const category of COMPACT_CATEGORIES) partTemplate(category, evidence, all);
    line(evidence.numbersLead, A);
    evidence.details.forEach((detail) => line(detail, O));
    line(evidence.lesson, S);
    line(evidence.certLine, S);
    line(evidence.fitLine, S);
    line(evidence.brief, X);
  }
  KEYWORD_LINES.forEach((text) => line(text, X));
  line(HELLO_SUPPORT_LINE, S);
  line(ACANET_TIE_LINE, S);
}

const HELLO_SUPPORT_LINE =
  "헬로프렌즈 Vizabridge에서는 평가셋 150문항 중 131문항의 근거를 맞혀, 근거 일치율 약 87%라는 수치로 결과를 증명하기도 했습니다.";
const ACANET_TIE_LINE = "아카넷에서도 데이터의 정합성을 먼저 확인하며 신뢰할 수 있는 기능을 만들겠습니다.";

// ---------------------------------------------------------------------------------------------
// Sentence-level fitting
// ---------------------------------------------------------------------------------------------

type Doc = string[][];

function normalizeText(text: string): string {
  return text.trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
}

function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?。])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function toDoc(text: string): Doc {
  return normalizeText(text)
    .split(/\n\s*\n/)
    .map(splitSentences)
    .filter((paragraph) => paragraph.length);
}

function renderDoc(doc: Doc): string {
  return doc
    .filter((paragraph) => paragraph.length)
    .map((paragraph) => paragraph.join(" "))
    .join("\n\n");
}

/** Sentences that only make sense right after the one before them. */
const DEPENDENT_START =
  /^(그때|그래서|그런데|그러나|그리고|그 결과|그 기준|그 과정|그 경험|그 덕분|그 개선|그렇게|이후|이를|이처럼|이렇게|이때|이 경험|이 과정|반면|또한|특히|하지만|덕분에|따라서|결국|동시에|대신)/;

function metaOf(text: string, local?: Map<string, Meta>): Meta & { exact: boolean } {
  const exact = local?.get(text);
  if (exact) return { ...exact, exact: true };
  const known = REGISTRY.get(text);
  if (known) return { tier: known.tier, dep: known.dep, needs: known.needs, exact: false };
  return { tier: C, dep: DEPENDENT_START.test(text), exact: false };
}

type FitOptions = { local?: Map<string, Meta>; protect?: Set<string> };

function fitText(text: string, limit: number, options: FitOptions = {}): string {
  const normalized = normalizeText(text);
  if (normalized.length <= limit) return normalized;
  const items = toDoc(normalized).flatMap((sentences, para) =>
    sentences.map((sentence) => ({ text: sentence, para, ...metaOf(sentence, options.local), locked: options.protect?.has(sentence) ?? false })),
  );
  if (items.length) items[0].dep = false;
  // Which sentences each sentence leans on: the one before it (dep) and any anchor it needs.
  // Registry anchors merge several templates, so they only count when they come earlier.
  const supports = items.map((item, index) => {
    const out: number[] = [];
    if (item.dep && index > 0) out.push(index - 1);
    for (const anchor of item.needs ?? []) {
      const found = items.findIndex((candidate) => candidate.text === anchor);
      if (found >= 0 && found !== index && (item.exact || found < index)) out.push(found);
    }
    return out;
  });
  const oversize = items.map((item) => item.text.length > limit);

  const lengthOf = (state: boolean[]) => {
    let length = 0;
    let previous = -1;
    state.forEach((on, index) => {
      if (!on) return;
      if (previous >= 0) length += items[index].para === items[previous].para ? 1 : 2;
      length += items[index].text.length;
      previous = index;
    });
    return length;
  };
  // Removing a sentence also removes every sentence that leans on it, transitively.
  const closure = (state: boolean[], start: number) => {
    const removed = new Set([start]);
    let grew = true;
    while (grew) {
      grew = false;
      items.forEach((_, index) => {
        if (!state[index] || removed.has(index)) return;
        if (supports[index].some((support) => removed.has(support))) {
          removed.add(index);
          grew = true;
        }
      });
    }
    return Array.from(removed);
  };
  const without = (state: boolean[], closures: number[][]) => {
    const next = [...state];
    closures.forEach((group) => group.forEach((removed) => (next[removed] = false)));
    return next;
  };

  let state = items.map(() => true);
  oversize.forEach((tooLong, index) => {
    if (tooLong && state[index]) state = without(state, [closure(state, index)]);
  });

  const tiers = Array.from(new Set(items.map((item) => item.tier))).sort((a, b) => a - b);
  for (const tier of tiers) {
    if (lengthOf(state) <= limit) break;
    const first = state.indexOf(true);
    const last = state.lastIndexOf(true);
    const groups = items
      .map((_, index) => index)
      .filter((index) => state[index] && items[index].tier === tier && !items[index].locked && index !== first && index !== last)
      .map((index) => closure(state, index))
      .filter((group) => !group.includes(last) && !group.includes(first) && !group.some((index) => items[index].locked));
    if (!groups.length) continue;
    let best: boolean[] | null = null;
    let bestLength = -1;
    if (groups.length <= 12) {
      for (let mask = 1; mask < 1 << groups.length; mask += 1) {
        const next = without(
          state,
          groups.filter((_, bit) => mask & (1 << bit)),
        );
        const length = lengthOf(next);
        if (length <= limit && length > bestLength) {
          best = next;
          bestLength = length;
        }
      }
    } else {
      let next = state;
      for (const group of [...groups].sort((a, b) => b.length - a.length)) {
        next = without(next, [group]);
        if (lengthOf(next) <= limit) {
          best = next;
          break;
        }
      }
    }
    state = best ?? without(state, groups);
    if (best) break;
  }

  if (lengthOf(state) > limit) {
    // Last resort: keep the conclusion (with whatever it leans on) and fill from the start.
    const last = state.lastIndexOf(true);
    const keep = items.map(() => false);
    if (last >= 0) {
      const chain = new Set([last]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const member of Array.from(chain)) {
          for (const support of supports[member]) {
            if (!chain.has(support)) {
              chain.add(support);
              grew = true;
            }
          }
        }
      }
      if (lengthOf(items.map((_, index) => chain.has(index))) <= limit) chain.forEach((member) => (keep[member] = true));
    }
    items.forEach((_, index) => {
      if (!state[index] || keep[index]) return;
      if (supports[index].some((support) => !keep[support])) return;
      keep[index] = true;
      if (lengthOf(keep) > limit) keep[index] = false;
    });
    state = keep;
  }

  // Put back whatever still fits (higher tiers first) so long forms stay well filled.
  const dropped = items
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => !state[index] && !oversize[index])
    .sort((a, b) => b.item.tier - a.item.tier || a.index - b.index);
  for (const { index } of dropped) {
    if (supports[index].some((support) => !state[support])) continue;
    if (index + 1 < items.length && items[index + 1].dep && state[index + 1]) continue;
    state[index] = true;
    if (lengthOf(state) > limit) state[index] = false;
  }

  const kept = items.filter((_, index) => state[index]);
  if (!kept.length) {
    const short = "데이터의 근거를 끝까지 확인하는 개발자입니다.";
    return short.length <= limit ? short : "근거를 확인하는 개발자입니다.";
  }
  const doc: Doc = [];
  let currentPara = -1;
  for (const item of kept) {
    if (item.para !== currentPara) {
      doc.push([]);
      currentPara = item.para;
    }
    doc[doc.length - 1].push(item.text);
  }
  return renderDoc(doc);
}

/**
 * Keep complete sentences, paragraph breaks and the form's character ceiling. Optional middle
 * sentences go first; a sentence that leans on a dropped one goes with it; the conclusion stays.
 */
export function fitCareerDemoAnswer(text: string, maxChars: number): string {
  ensureRegistry();
  return fitText(text, maxChars);
}

/** Generated drafts aim for ~80-90% of the form so they read as complete, not padded. */
function softLimit(maxChars: number): number {
  return maxChars >= 400 ? Math.floor(maxChars * 0.9) : maxChars;
}

function renderTemplate(paragraphs: Template, limit: number): string {
  const local = new Map<string, Meta>();
  paragraphs.flat().forEach((item) => local.set(item.text, { tier: item.tier, dep: item.dep, needs: item.needs }));
  const text = paragraphs.map((paragraph) => paragraph.map((item) => item.text).join(" ")).join("\n\n");
  return fitText(text, limit, { local });
}

// ---------------------------------------------------------------------------------------------
// Conversation context
// ---------------------------------------------------------------------------------------------

type Turn = { role: "user" | "assistant"; content: string };

function readTurns(messages: unknown): Turn[] {
  if (!Array.isArray(messages)) return [];
  return messages.flatMap((message) => {
    if (!message || typeof message !== "object") return [];
    const { role, content } = message as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return [];
    return [{ role, content: content.slice(0, 10000) }];
  });
}

const DRAFT_PATTERN = /^[^\n]+\n\n([\s\S]+?)\n\n현재 [\d,]+자[^\n]*$/;

/** The answer block of one of our draft replies: between the description line and the "현재 N자" footer. */
function extractDraft(content: string): string | null {
  const match = content.trim().match(DRAFT_PATTERN);
  return match ? match[1].trim() : null;
}

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

type Base = { text: string; index: number; applied: boolean };

/** What an edit request refers to: the newest draft on screen or the applied answer, whichever is newer. */
function resolveBase(turns: Turn[], currentAnswer: string): Base | null {
  const drafts = turns.flatMap((turn, index) => {
    if (turn.role !== "assistant") return [];
    const draft = extractDraft(turn.content);
    return draft ? [{ text: draft, index }] : [];
  });
  const latest = drafts[drafts.length - 1];
  if (!currentAnswer) return latest ? { ...latest, applied: false } : null;
  const appliedAt = drafts.filter((draft) => squash(draft.text) === squash(currentAnswer)).pop();
  if (appliedAt && latest && latest.index > appliedAt.index) return { ...latest, applied: false };
  return { text: currentAnswer, index: appliedAt ? appliedAt.index : Number.POSITIVE_INFINITY, applied: true };
}

const PROMPT_PROJECTS: Array<[ProjectKind, RegExp]> = [
  ["hello", /헬로\s*프렌즈|vizabridge|비자\s*플랫폼|비자/gi],
  ["tiny", /티니\s*타이거|tiny\s*tiger|쇼핑몰/gi],
  ["blavers", /블레이버스|해커톤|몽구리|monguri/gi],
];

/** A project the user clearly named (not one they excluded with 말고/대신/빼고). */
function namedProject(text: string, projects: Evidence[]): Evidence | undefined {
  const hits: Array<{ kind: ProjectKind; index: number }> = [];
  for (const [kind, pattern] of PROMPT_PROJECTS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const after = text.slice(match.index + match[0].length, match.index + match[0].length + 8);
      if (!/^\s*(?:은|는|이랑|랑)?\s*(말고|대신|빼고|말구|아니라|제외)/.test(after)) hits.push({ kind, index: match.index });
    }
  }
  const kinds = Array.from(new Set(hits.sort((a, b) => a.index - b.index).map((hit) => hit.kind)));
  return kinds.map((kind) => projects.find((project) => project.kind === kind)).find(Boolean);
}

/** The project an answer is mainly about: the earliest one it names. */
function mainProjectOf(text: string, projects: Evidence[]): Evidence | undefined {
  let best: { project: Evidence; index: number } | undefined;
  for (const project of projects) {
    const found = project.nameMarker.exec(text);
    if (found && (!best || found.index < best.index)) best = { project, index: found.index };
  }
  return best?.project;
}

const PROPOSAL = /(헬로프렌즈|티니타이거|블레이버스)[^.\n]{0,30}?경험을 중심으로/;

/** Newest project agreed in the conversation after `since` (a user naming one, or our proposal/draft). */
function agreedProject(turns: Turn[], since: number, projects: Evidence[]): Evidence | undefined {
  for (let index = turns.length - 2; index > since && index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn.role === "user") {
      const named = namedProject(turn.content, projects);
      if (named) return named;
      continue;
    }
    const draft = extractDraft(turn.content);
    const proposal = draft ? undefined : turn.content.match(PROPOSAL)?.[1];
    const project = draft ? mainProjectOf(draft, projects) : projects.find((item) => item.name === proposal);
    if (project) return project;
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Request intents
// ---------------------------------------------------------------------------------------------

type AdviceKind = "interviewer" | "outline" | "questions" | "competencies" | "projects" | "evidence" | "direction";
type ToneKind = "confident" | "humble" | "natural" | "toggle";

type Intents = {
  completion: boolean;
  draft: boolean;
  affirm: boolean;
  confirm: boolean;
  advice: AdviceKind | null;
  editVerb: boolean;
  detail: boolean;
  numbers: boolean;
  keywords: boolean;
  rotate: boolean;
  expand: boolean;
  shorten: boolean;
  shortenOnly: boolean;
  summary: boolean;
  chars: number | null;
  tone: ToneKind | null;
  opening: boolean;
};

function parseIntents(prompt: string): Intents {
  const text = prompt.trim();
  const opening = /첫\s*문장|도입부|도입\s*(문장|부분)|첫\s*줄|첫\s*마디|시작\s*(문장|부분)|훅|hook|첫인상/i.test(text);
  const charMatch = text.match(/(\d{1,2},\d{3}|\d{2,4})\s*자/);
  const advice: AdviceKind | null = /면접관|평가자|인사\s*담당|평가\s*(포인트|기준)|(포인트|의도)(가|는)?\s*(뭐|무엇)|무엇을\s*(보|평가)|뭘\s*(보|평가)|어떤\s*점을\s*(보|평가)|출제\s*의도/.test(text)
    ? "interviewer"
    : /핵심\s*메시지|개요|목차|뼈대|아웃라인|outline|구조(를|만|부터)?\s*(잡|짜|정리|보여)|흐름(만|을)?\s*(정리|잡)/i.test(text)
      ? "outline"
      : /질문(해|을\s*해|\s*줘|\s*해\s*줘|\s*부탁|\s*보내)|물어\s*(봐|줘)|부족한\s*(정보|부분|내용)|확인할\s*(질문|것|내용)|다음에\s*답할/.test(text)
        ? "questions"
        : /(역량|강점|키워드)[^.?!\n]{0,8}(추천|골라|뽑아|뭐|무엇|알려)/.test(text)
          ? "competencies"
          : /(프로젝트|경험|사례|소재)[^.?!\n]{0,12}(추천|골라|고르|뭐가\s*좋|어떤\s*게|어느\s*게|어떨까|어울릴까|연결하면)/.test(text)
            ? "projects"
            : /근거[^.?!\n]{0,8}(제안|추천|뭐|무엇|있을까|알려)/.test(text)
              ? "evidence"
              : /작성\s*방향|방향(을|부터|성)?\s*(잡|정|제안|알려|추천)|어떻게\s*(쓰|써|구성|풀)/.test(text)
                ? "direction"
                : null;
  const tone: ToneKind | null = /자신감|자신\s*있게|당당|확신|힘\s*있게|임팩트|강렬/.test(text) && !opening
    ? "confident"
    : /겸손|부드럽게|차분|담백|순하게|부담스럽지|덜\s*단정/.test(text)
      ? "humble"
      : /톤|어조|말투/.test(text)
        ? "toggle"
        : /자연스럽|매끄럽|다듬|윤문|읽기\s*좋|어색/.test(text)
          ? "natural"
          : null;
  return {
    completion: /완성본|최종본|완성된|완성\s*(해|시켜)|전체\s*답변|끝까지\s*(써|작성)|풀\s*버전|보내\s*(줘|주세요|줄래|줘요|봐)/.test(text),
    draft: /초안|작성해|써\s*(줘|주세요|줄래|봐|볼래)|써줘|만들어|바로\s*작성|이어서\s*써|다시\s*(써|작성)/.test(text),
    affirm:
      /^(네|넵|넹|예|응|ㅇㅇ|ㅇㅋ|오케이|okay|ok|좋아요|좋아|좋습니다|좋네요|좋은데요|좋은데|그래요|그래|맞아요|맞아|진행해\s*주세요|진행해줘|진행해|진행하자|진행|그렇게\s*해\s*주세요|그렇게\s*해줘|그렇게\s*해|그\s*방향으로|그\s*방향)(?![가-힣a-z])/i.test(text) ||
      /(좋아요|좋습니다|진행해\s*(줘|주세요)|그렇게\s*해\s*(줘|주세요)|그\s*방향으로)/.test(text),
    confirm: /최종\s*(점검|확인|검토)|확정|제출|검토/.test(text) && !/완성본|최종본|완성\s*(해|시켜)/.test(text),
    advice,
    editVerb: /바꿔|바꾸|넣어|추가|줄여|줄이|늘려|강조해|고쳐|수정|다듬|써\s*줘|써줘|써\s*주|작성해|압축|요약해|빼\s*줘|빼줘|완성/.test(text),
    detail: /구체적|구체화|근거|자세히|디테일|보강|설득력|실감/.test(text),
    // "성과" only as its own word: "정확성과" must not read as a request for numbers.
    numbers: /숫자|수치|정량|지표|(^|[^가-힣])성과/.test(text),
    keywords:
      /공고|키워드|JD|우대\s*(사항|조건)|자격증|전자정부|자바|java|sql|(아카넷|직무|회사)(에|과|와|랑|이랑)?\s*(더\s*)?(맞|연결|어울|적합|관련)/i.test(text),
    rotate: /다른\s*(프로젝트|경험|사례|소재|이야기)|(프로젝트|경험|사례|소재)\s*(를|을)?\s*(바꿔|변경|교체)/.test(text),
    expand: /늘려|늘리|길게|분량\s*(을|를)?\s*(채워|늘려|맞춰)|더\s*풍부|보충|채워\s*(줘|주세요)/.test(text),
    shorten: /줄여|줄이|짧게|압축|요약|간결|덜어|핵심만/.test(text),
    shortenOnly: /자\s*(이내|안으로|안쪽|이하|내로|미만|안에|까지\s*줄)/.test(text),
    summary: /요약|핵심만/.test(text),
    chars: charMatch ? Number(charMatch[1].replace(",", "")) : null,
    tone,
    opening,
  };
}

function hasEdit(intents: Intents): boolean {
  return (
    intents.detail ||
    intents.numbers ||
    intents.keywords ||
    intents.rotate ||
    intents.expand ||
    intents.shorten ||
    intents.chars !== null ||
    intents.tone !== null ||
    intents.opening
  );
}

// ---------------------------------------------------------------------------------------------
// Edits on a draft
// ---------------------------------------------------------------------------------------------

function docHas(doc: Doc, sentence: string): boolean {
  return doc.some((paragraph) => paragraph.includes(sentence));
}

function isDependent(sentence: string): boolean {
  return metaOf(sentence).dep;
}

/** Rotate through variants by turn so repeated requests do not return identical text. */
function pickVariant<T>(options: T[], variant: number, usable: (option: T) => boolean): T | undefined {
  for (let offset = 0; offset < options.length; offset += 1) {
    const option = options[(variant + offset) % options.length];
    if (usable(option)) return option;
  }
  return undefined;
}

/** Position right after the last sentence about the project (and anything leaning on it). */
function afterProject(doc: Doc, evidence: Evidence): { p: number; s: number } {
  const lastP = doc.length - 1;
  let p = -1;
  let s = -1;
  for (let pi = 0; pi < doc.length; pi += 1) {
    for (let si = 0; si < doc[pi].length; si += 1) {
      const isFinal = pi === lastP && si === doc[pi].length - 1;
      if (!isFinal && evidence.marker.test(doc[pi][si])) {
        p = pi;
        s = si;
      }
    }
  }
  if (p < 0) return beforeClose(doc);
  while (s + 1 < doc[p].length && isDependent(doc[p][s + 1]) && !(p === lastP && s + 1 === doc[p].length - 1)) s += 1;
  return { p, s: s + 1 };
}

function beforeClose(doc: Doc): { p: number; s: number } {
  const p = doc.length - 1;
  return { p, s: Math.max(0, doc[p].length - 1) };
}

function insertAt(doc: Doc, position: { p: number; s: number }, sentence: string) {
  doc[position.p].splice(position.s, 0, sentence);
}

/** Head of the chain the first sentence about the project belongs to. */
function firstMention(doc: Doc, evidence: Evidence): { p: number; s: number } | null {
  for (let p = 0; p < doc.length; p += 1) {
    for (let s = 0; s < doc[p].length; s += 1) {
      if (evidence.marker.test(doc[p][s])) {
        let head = s;
        while (head > 0 && isDependent(doc[p][head])) head -= 1;
        return { p, s: head };
      }
    }
  }
  return null;
}

const STORY_OPENINGS = new Set<Category>(["motivation", "growth", "goal", "introduction", "company"]);

/** A short quote of a changed sentence, shown in parentheses so no particle has to follow it. */
function quoteStart(sentence: string): string {
  const clipped = sentence.length > 26 ? `${sentence.slice(0, 25).trimEnd()}…` : sentence;
  return `(“${clipped}”)`;
}

type EditContext = {
  category: Category;
  evidence: Evidence;
  projects: Evidence[];
  variant: number;
  protect: Set<string>;
  notes: string[];
};

function applyOpening(doc: Doc, ctx: EditContext) {
  if (!doc.length) return;
  const hooks = hooksFor(ctx.category, ctx.evidence);
  const hook = pickVariant(hooks, ctx.variant, (option) => !docHas(doc, option)) ?? hooks[0];
  const first = doc[0][0];
  const roles = REGISTRY.get(first)?.roles;
  if (roles?.has("hook")) {
    doc[0][0] = hook;
    ctx.notes.push(`첫 문장을 다른 각도의 문장으로 다시 세웠습니다${quoteStart(hook)}.`);
  } else if (roles?.has("story")) {
    doc[0].unshift(hook);
    ctx.notes.push(`이야기가 시작되기 전에 핵심을 먼저 던지는 첫 문장을 세웠습니다${quoteStart(hook)}. 뒤의 이야기는 그대로 이어집니다.`);
  } else {
    doc[0].shift();
    while (doc[0].length && isDependent(doc[0][0])) doc[0].shift();
    doc[0].unshift(hook);
    ctx.notes.push(`첫 문장을 더 강하게 바꾸고${quoteStart(hook)}, 뒤 문장과 자연스럽게 이어지도록 정리했습니다.`);
  }
  ctx.protect.add(hook);
}

function swapClose(doc: Doc, category: Category): boolean {
  const last = doc[doc.length - 1];
  const index = last.length - 1;
  for (const [current, alternative] of Object.values(CLOSES)) {
    if (last[index] === current) {
      last[index] = alternative;
      return true;
    }
    if (last[index] === alternative) {
      last[index] = current;
      return true;
    }
  }
  if (!REGISTRY.get(last[index])?.roles.has("close")) return false;
  last[index] = CLOSES[category][0];
  return true;
}

function mapSentences(doc: Doc, transform: (sentence: string) => string): number {
  let changed = 0;
  doc.forEach((paragraph, p) =>
    paragraph.forEach((sentence, s) => {
      const next = transform(sentence);
      if (next !== sentence) {
        doc[p][s] = next;
        changed += 1;
      }
    }),
  );
  return changed;
}

function politeForm(sentence: string): string {
  return sentence
    .replace(/(?:정말|매우|굉장히|너무)\s+/g, "")
    .replace(/했어요\./g, "했습니다.")
    .replace(/배웠어요\./g, "배웠습니다.")
    .replace(/봤어요\./g, "봤습니다.")
    .replace(/있어요\./g, "있습니다.")
    .replace(/없어요\./g, "없습니다.")
    .replace(/싶어요\./g, "싶습니다.")
    .replace(/같아요\./g, "같습니다.")
    .replace(/거예요\./g, "것입니다.")
    .replace(/(?:이에요|예요)\./g, "입니다.")
    .replace(/돼요\./g, "됩니다.")
    .replace(/해요\./g, "합니다.");
}

function applyTone(doc: Doc, ctx: EditContext, tone: ToneKind) {
  const kind = tone === "toggle" ? (ctx.variant % 2 === 0 ? "confident" : "humble") : tone;
  if (kind === "confident") {
    const changed = mapSentences(doc, (sentence) =>
      sentence
        .replace(/라고 생각합니다\./g, "라고 확신합니다.")
        .replace(/(될|있을) 것이라 생각합니다\./g, "$1 것입니다.")
        .replace(/고 싶습니다\./g, "겠습니다.")
        .replace(/노력하겠습니다/g, "해내겠습니다"),
    );
    if (!changed) swapClose(doc, ctx.category);
    ctx.notes.push("‘~하고 싶습니다’, ‘~라고 생각합니다’ 같은 표현을 ‘~하겠습니다’, ‘~라고 확신합니다’로 바꿔 자신감 있는 어조로 다듬었습니다.");
    return;
  }
  if (kind === "humble") {
    const changed = mapSentences(doc, (sentence) =>
      sentence
        .replace(/라고 확신합니다\./g, "라고 생각합니다.")
        .replace(/확신해 /g, "믿고 ")
        .replace(/되겠습니다\./g, "되고 싶습니다.")
        .replace(/하겠습니다\./g, "하고자 합니다.")
        .replace(/가장 영향력 큰/g, "무엇보다 영향력이 큰")
        .replace(/끌어올렸습니다\./g, "끌어올릴 수 있었습니다.")
        .replace(/진출했습니다\./g, "진출할 수 있었습니다."),
    );
    if (!changed) swapClose(doc, ctx.category);
    ctx.notes.push("단정적인 표현을 덜어 내고 ‘~할 수 있었습니다’, ‘~하고자 합니다’처럼 차분하고 겸손한 어조로 바꿨습니다.");
    return;
  }
  applyNatural(doc, ctx);
}

function applyNatural(doc: Doc, ctx: EditContext) {
  const before = renderDoc(doc);
  mapSentences(doc, politeForm);
  let connective = false;
  mapSentences(doc, (sentence) => {
    if (connective || !sentence.startsWith("그 결과 ")) return sentence;
    connective = true;
    return sentence.replace(/^그 결과 /, "덕분에 ");
  });
  const swapped = swapClose(doc, ctx.category);
  if (!/아카넷/.test(renderDoc(doc))) {
    doc[doc.length - 1].push(ACANET_TIE_LINE);
    ctx.protect.add(ACANET_TIE_LINE);
    ctx.notes.push("직접 수행한 작업과 판단이 드러나도록 문장을 다듬고, 아카넷 공고와 이어지는 마무리 문장을 더했습니다.");
    return;
  }
  if (renderDoc(doc) === before) {
    const last = doc[doc.length - 1];
    last[last.length - 1] = CLOSES[ctx.category][1];
  }
  ctx.notes.push(
    swapped
      ? "문장 사이 연결을 매끄럽게 하고, 마지막 다짐을 더 자연스러운 표현으로 바꿨습니다."
      : "어색한 연결과 구어체 표현을 정리해 문장이 자연스럽게 이어지도록 다듬었습니다.",
  );
}

function applyDetail(doc: Doc, ctx: EditContext) {
  const pool = [...ctx.evidence.details, ...ctx.evidence.skills, ctx.evidence.certLine];
  const detail = pickVariant(pool, 0, (option) => !docHas(doc, option));
  if (detail) {
    insertAt(doc, afterProject(doc, ctx.evidence), detail);
    ctx.protect.add(detail);
    ctx.notes.push(`${ctx.evidence.name}에서 실제로 내린 판단이 보이도록 구체적인 문장을 더했습니다${quoteStart(detail)}.`);
    return;
  }
  const other = ctx.projects.find((project) => project.kind !== ctx.evidence.kind && !docHas(doc, project.brief));
  if (other) {
    insertAt(doc, beforeClose(doc), other.brief);
    ctx.protect.add(other.brief);
    ctx.notes.push(`${ctx.evidence.name}의 세부 근거는 이미 모두 담겨 있어, ${other.name} 경험을 한 문장 더해 근거를 넓혔습니다.`);
  }
}

function applyNumbers(doc: Doc, ctx: EditContext) {
  const { evidence } = ctx;
  if (docHas(doc, evidence.numbersLead)) {
    const support = ctx.projects.find((project) => project.kind !== evidence.kind && !docHas(doc, project.numbersLead));
    if (support) {
      insertAt(doc, beforeClose(doc), support.numbersLead);
      ctx.protect.add(support.numbersLead);
      ctx.notes.push(`${support.name}의 결과 수치도 한 문장으로 더해, 숫자로 증명한 경험이 두 가지가 되도록 했습니다.`);
    }
    return;
  }
  const mention = STORY_OPENINGS.has(ctx.category) ? firstMention(doc, evidence) : null;
  insertAt(doc, mention ?? { p: 0, s: 0 }, evidence.numbersLead);
  ctx.protect.add(evidence.numbersLead);
  if (evidence.kind === "hello") {
    mapSentences(doc, (sentence) =>
      sentence === evidence.numbersLead ? sentence : sentence.replace(/약 87%(?:\(150문항 중 131문항\))?까지/g, "목표했던 수준까지"),
    );
    ctx.notes.push(
      mention
        ? "‘150문항 중 131문항, 근거 일치율 약 87%’를 헬로프렌즈 이야기의 첫 문장으로 당겨, 결과 수치가 먼저 보이도록 했습니다."
        : "‘150문항 중 131문항, 근거 일치율 약 87%’를 답안의 첫 문장으로 세워, 결과 수치가 가장 먼저 보이도록 했습니다.",
    );
    return;
  }
  if (evidence.kind === "tiny") {
    const hello = ctx.projects.find((project) => project.kind === "hello");
    if (hello && !/87%/.test(renderDoc(doc))) {
      insertAt(doc, beforeClose(doc), HELLO_SUPPORT_LINE);
      ctx.protect.add(HELLO_SUPPORT_LINE);
      ctx.notes.push(
        "티니타이거 경험은 따로 측정한 정량 지표가 없어 결과 문장을 맨 앞에 세우고, 헬로프렌즈의 근거 일치율 약 87%를 수치 근거로 덧붙였습니다.",
      );
    } else {
      ctx.notes.push("티니타이거 경험은 따로 측정한 정량 지표가 없어, 지어낸 숫자 대신 결과 문장을 맨 앞에 세웠습니다.");
    }
    return;
  }
  ctx.notes.push("‘10일 만의 MVP 배포와 본선 진출’이라는 결과를 답안의 첫 문장으로 세워, 성과가 가장 먼저 보이도록 했습니다.");
}

const POSTING_KEYWORDS: Array<[string, RegExp]> = [
  ["Java", /java|자바/i],
  ["전자정부 표준프레임워크", /전자정부/],
  ["SQL·SQLD", /SQL/],
  ["대학 통합정보시스템", /통합정보시스템/],
];

function applyKeywords(doc: Doc, ctx: EditContext) {
  const text = renderDoc(doc);
  const missing = POSTING_KEYWORDS.filter(([, pattern]) => !pattern.test(text)).map(([label]) => label);
  const keywordLine = pickVariant(KEYWORD_LINES, ctx.variant, (option) => !docHas(doc, option));
  if (!keywordLine) return;
  insertAt(doc, beforeClose(doc), keywordLine);
  ctx.protect.add(keywordLine);
  ctx.notes.push(
    missing.length
      ? `공고 핵심 키워드 중 빠져 있던 ${missing.map((label) => `‘${label}’`).join("·")}${withObject(missing[missing.length - 1]).slice(-1)} 경험과 연결해 마무리 앞에 넣었습니다.`
      : "공고 핵심 키워드(Java·전자정부 표준프레임워크·SQL·대학 통합정보시스템)를 한 문장으로 묶어 아카넷 업무와 더 직접 연결했습니다.",
  );
}

/** Supplementary sentences used to lengthen an answer, in the order they read best. */
function expansionPool(doc: Doc, ctx: EditContext): Array<{ text: string; where: "project" | "close" | "para" }> {
  const { evidence } = ctx;
  const items: Array<{ text: string; where: "project" | "close" | "para" }> = [
    ...evidence.details.map((text) => ({ text, where: "project" as const })),
    { text: evidence.lesson, where: "close" },
    { text: evidence.certLine, where: "close" },
    ...KEYWORD_LINES.slice(0, 1).map((text) => ({ text, where: "close" as const })),
    ...ctx.projects
      .filter((project) => project.kind !== evidence.kind)
      .map((project, index) => ({ text: index === 0 ? `이 밖에도 ${project.brief}` : project.brief, where: "para" as const })),
    ...evidence.skills.map((text) => ({ text, where: "project" as const })),
  ];
  const seen = renderDoc(doc);
  return items.filter((item) => !docHas(doc, item.text) && !seen.includes(item.text.replace(/^이 밖에도 /, "").slice(0, 20)));
}

function applyExpand(doc: Doc, ctx: EditContext, target: number) {
  let addedParagraph: string[] | null = null;
  for (const item of expansionPool(doc, ctx)) {
    if (renderDoc(doc).length >= target * 0.96) break;
    if (item.where === "project") insertAt(doc, afterProject(doc, ctx.evidence), item.text);
    else if (item.where === "close") insertAt(doc, beforeClose(doc), item.text);
    else {
      if (!addedParagraph) {
        addedParagraph = [];
        doc.splice(Math.max(0, doc.length - 1), 0, addedParagraph);
      }
      addedParagraph.push(item.text);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------------------------

function protocol(stage: Stage, answer = "", ready = false, flags = true): string {
  const quality = answer ? "ok" : "need";
  const lines = [`stage=${stage}`];
  if (flags) lines.push(`competency=${quality}`, `tone=${quality}`, `impact=${quality}`);
  lines.push(`ready=${ready ? "yes" : "no"}`);
  return `<dibut_state>\n${lines.join("\n")}\n</dibut_state>\n<dibut_answer>${answer}</dibut_answer>`;
}

function shortTitle(title: string): string {
  return title.length > 30 ? `${title.slice(0, 29).trimEnd()}…` : title;
}

function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function withObject(word: string): string {
  return `${word}${hasBatchim(word) ? "을" : "를"}`;
}

function draftReply(description: string, answer: string, maxChars: number, stage: Stage, ready: boolean) {
  return {
    content: `${description}\n\n${answer}\n\n현재 ${answer.length}자 / ${maxChars}자입니다. ‘적용하기’를 누르면 이 문항의 답안으로 반영됩니다.`,
    protocol: protocol(stage, answer, ready),
  };
}

type ReplyContext = {
  title: string;
  shown: string;
  categories: Category[];
  evidence: Evidence;
  evidences: Evidence[];
  projects: Evidence[];
  maxChars: number;
  variant: number;
};

function planSentence(ctx: ReplyContext): string {
  const [category] = ctx.categories;
  const { evidence, projects } = ctx;
  if (ctx.categories.length > 1) {
    const [firstLabel, secondLabel] = ctx.categories.map((item) => CATEGORY_LABEL[item]);
    const names = Array.from(new Set(ctx.evidences.map((item) => item.name))).join("·");
    return `이 문항은 ‘${firstLabel}’${hasBatchim(firstLabel) ? "과" : "와"} ‘${secondLabel}’${hasBatchim(secondLabel) ? "을" : "를"} 함께 묻고 있어, ${names} 경험으로 두 질문에 차례로 답하면 공고와 가장 잘 맞습니다.`;
  }
  if (category === "introduction") {
    const names = projects.map((project) => project.name).join("·");
    return `자기소개는 ‘데이터의 근거를 끝까지 확인하는 개발자’라는 한 문장을 축으로, ${names} 경험을 짧은 증거로 엮으면 공고와 가장 잘 맞습니다.`;
  }
  if (category === "motivation") {
    return `지원동기는 학사시스템을 쓰던 학생으로서 느낀 불편에서 출발해, ${evidence.name}의 ${evidence.focus} 경험을 중심으로 아카넷의 대학 통합정보시스템과 연결하면 가장 설득력 있습니다.`;
  }
  if (category === "company") {
    return `아카넷의 사업 구조와 공고의 요구 역량을 정리한 뒤, ${evidence.name} 경험을 중심으로 제가 그 일에 맞는 이유를 덧붙이면 좋습니다.`;
  }
  return `이번 문항은 ${evidence.name}의 ${evidence.focus} 경험을 중심으로 풀어내면 공고와 가장 잘 맞습니다.`;
}

function introReply(ctx: ReplyContext) {
  const projectNames = ctx.projects.map((project) => project.name).join("·");
  return {
    content: `안녕하세요, 디벗 AI 자소서 컨설팅입니다. ㈜아카넷 웹개발자(Java) 신입 공고와 ${projectNames} 프로젝트를 바탕으로 ‘${ctx.shown}’ 문항을 함께 작성하겠습니다.\n\n이 공고는 대학 통합정보시스템(URP/CRP)을 Java·전자정부 표준프레임워크로 개발하는 포지션으로, 데이터 정합성과 SQL 활용 능력, 요구사항 분석이 핵심이고 SQLD 보유자를 우대합니다. ${planSentence(ctx)}\n\n이 방향으로 작성할까요? 더 강조하고 싶은 프로젝트나 역량이 있으면 말씀해 주세요. 바로 완성본을 요청하셔도 됩니다.`,
    protocol: protocol("direction"),
  };
}

const EMPHASIS: Array<[RegExp, string]> = [
  [/정확|정합|데이터/, "데이터 정합성"],
  [/협업|팀워크|소통/, "협업"],
  [/리더|주도|팀장/, "리더십"],
  [/문제\s*해결|해결/, "문제 해결"],
  [/성장|배움|학습/, "성장"],
  [/java|자바|스프링|spring|전자정부/i, "Java·전자정부 표준프레임워크"],
];

function directionReply(ctx: ReplyContext, prompt: string, requested: boolean) {
  const { evidence, categories, projects } = ctx;
  const [category] = categories;
  const emphasis = EMPHASIS.filter(([pattern]) => pattern.test(prompt)).map(([, label]) => label);
  const echo = emphasis.length
    ? `말씀하신 ${emphasis.map((label) => `‘${label}’`).join("·")}${hasBatchim(emphasis[emphasis.length - 1]) ? "을" : "를"} 중심축으로 삼겠습니다. `
    : "";
  const introduction = category === "introduction";
  const summary = introduction
    ? `${evidence.intro} ${projects.filter((project) => project.kind !== evidence.kind).map((project) => project.intro).join(" ")}`.trim()
    : category === "motivation"
      ? `학사시스템을 쓰며 겪은 불편으로 문을 열고, 그 불편을 직접 고치고 싶은 이유를 ${evidence.name} 경험으로 증명하겠습니다. ${evidence.motive[0]}`
      : `${evidence.context} ${evidence.problem}`;
  const alternatives = projects.filter((project) => project.kind !== evidence.kind);
  const switchHint =
    alternatives.length && !introduction ? ` 다른 소재를 원하시면 ‘${alternatives[0].name}로 바꿔줘’처럼 말씀해 주세요.` : "";
  const headline = introduction
    ? `‘${ctx.shown}’ 문항은 ${projects.map((project) => project.name).join("·")} 경험을 짧은 증거로 엮어 구성하겠습니다.`
    : `‘${ctx.shown}’ 문항은 ${evidence.name} 경험을 중심으로 구성하겠습니다.${requested ? " 요청하신 대로 소재를 맞췄습니다." : ""}`;
  return {
    content: `${headline}\n\n${summary}\n\n${echo}여기서 ${evidence.focus} 역량을 강조하고, 결과와 배운 점을 아카넷 공고의 핵심인 학사 데이터 처리·요구사항 분석 역량과 연결하겠습니다. 수치는 측정 방법까지 설명할 수 있는 것만 담고, 직접 맡은 작업과 판단이 드러나는 담백한 문체로 쓰겠습니다.\n\n이 방향으로 ${ctx.maxChars}자 이내의 초안을 작성해 드릴까요? 바로 완성본을 원하시면 ‘완성본 보내줘’라고 말씀해 주세요.${switchHint}`,
    protocol: protocol("draft"),
  };
}

const INTERVIEWER_FOCUS: Record<Category, string> = {
  introduction: "자기소개에서 면접관은 지원자가 어떤 사람인지 한 문장으로 기억에 남는지, 그리고 그 주장을 뒷받침하는 경험이 있는지를 봅니다.",
  motivation: "지원동기에서 면접관은 ‘왜 하필 아카넷인가’와 ‘이 사람이 우리 업무를 정확히 이해하고 있는가’를 봅니다.",
  company: "기업 이해 문항은 사업과 직무를 정확히 알고, 그 안에서 본인이 할 일을 그릴 수 있는지를 봅니다.",
  goal: "입사 후 포부에서는 회사의 업무를 구체적으로 이해하고, 현실적인 단계로 성장 계획을 세웠는지를 봅니다.",
  strength: "장단점 문항은 강점의 근거가 구체적인지, 그리고 단점을 인식하고 실제로 보완하고 있는지를 봅니다.",
  growth: "성장 과정 문항은 지금의 가치관이 어떤 경험에서 만들어졌고, 그것이 일하는 방식으로 이어지는지를 봅니다.",
  failure: "실패 경험에서는 실패 자체보다, 원인을 스스로 분석하고 다음 행동을 바꿨는지를 봅니다.",
  conflict: "갈등 해결 문항은 갈등의 원인을 상대 탓으로 돌리지 않고, 근거와 절충으로 합의를 이끌었는지를 봅니다.",
  challenge: "도전 경험에서는 문제를 어떻게 정의했고, 막혔을 때 어떤 근거로 방향을 바꿨는지를 봅니다.",
  collaboration: "협업 문항은 팀 안에서 본인이 맡은 역할과, 팀이 같은 방향을 보게 만든 구체적인 행동을 봅니다.",
  project: "대표 프로젝트에서는 본인이 직접 맡은 범위와 기술적 판단의 이유, 그리고 결과를 증명할 근거를 봅니다.",
  competency: "직무 역량 문항은 공고가 요구하는 역량을 실제 경험으로 증명할 수 있는지를 봅니다.",
  general: "자유 문항에서는 지원자가 스스로 가장 자신 있는 이야기를 골라, 직무와 연결해 낼 수 있는지를 봅니다.",
};

const CORE_MESSAGE: Record<Category, string> = {
  introduction: "데이터의 근거를 끝까지 확인하는 개발자",
  motivation: "학사시스템을 쓰던 사람에서, 만드는 사람으로",
  company: "대학의 데이터를 하나로 잇는 회사, 그 정확성을 지키는 개발자",
  goal: "3개월·1년·3년 단계로 학사 모듈을 책임지는 개발자",
  strength: "근거를 끝까지 확인하는 집요함, 그리고 일정과의 균형",
  growth: "‘동작하는 기능’에서 ‘믿을 수 있는 데이터’로",
  failure: "검증 기준 없이 만든 실수를 평가셋으로 바로잡은 경험",
  conflict: "누가 옳은지보다 모두가 동의할 기준을 찾는다",
  challenge: "결과를 고치기 전에 데이터와 흐름부터 확인한다",
  collaboration: "모두가 같은 기준과 같은 화면을 보게 만든다",
  project: "직접 맡은 범위와 기술적 판단의 이유",
  competency: "학사 데이터를 정확하게 다루는 힘",
  general: "데이터의 근거를 끝까지 확인하는 습관",
};

function adviceReply(kind: AdviceKind, ctx: ReplyContext, stage: Stage, prompt: string) {
  const { evidence, projects, shown } = ctx;
  const [category] = ctx.categories;
  const keep = (content: string) => ({ content, protocol: protocol(stage, "", false, false) });
  switch (kind) {
    case "interviewer":
      return keep(
        `${INTERVIEWER_FOCUS[category]}\n\n아카넷 공고 기준으로는 Java 웹 구조에 대한 이해, SQL 활용과 데이터 정합성, 요구사항 분석이 핵심이고 SQLD 보유자를 우대합니다. 그래서 ‘${shown}’ 문항에서는 ${evidence.name} 경험의 ${withObject(evidence.focus)} 앞세우고, ‘${evidence.keyFact}’처럼 측정하거나 확인할 수 있는 근거로 뒷받침하는 것이 좋습니다.\n\n반대로 ‘열심히 했다’, ‘많이 배웠다’ 같은 표현만 있고 본인이 내린 판단이 보이지 않으면 감점 요인이 됩니다. 답안에 바로 반영하시려면 ‘완성본 보내줘’ 또는 ‘숫자 강조해줘’라고 말씀해 주세요.`,
      );
    case "outline":
      return keep(
        `‘${shown}’ 문항의 핵심 메시지는 “${CORE_MESSAGE[category]}”입니다.\n\n1) 도입 — “${CORE_MESSAGE[category]}”라는 한 문장으로 시작\n2) 근거 — ${evidence.name}: ${evidence.keyFact}\n3) 연결 — 아카넷 공고의 학사 데이터·SQL·요구사항 분석 역량과 연결\n4) 마무리 — 아카넷에서 이 습관으로 해낼 일을 한 문장으로 약속\n\n이 흐름 그대로 ${ctx.maxChars}자 안의 완성본을 써 드릴까요?`,
      );
    case "questions": {
      const categoryQuestion =
        category === "motivation"
          ? "아카넷의 사업 중 학사·학생 이력 관리·취업통계 가운데 가장 관심 있는 분야는 어디인가요?"
          : category === "goal"
            ? "입사 후 가장 먼저 맡아 보고 싶은 업무 모듈이 있나요?"
            : "이 문항에서 꼭 들어가야 하는 본인만의 표현이나 키워드가 있나요?";
      return keep(
        `더 설득력 있는 답안을 위해 몇 가지만 여쭤볼게요.\n\n1) ${evidence.question}\n2) ${categoryQuestion}\n3) 글의 톤은 담백한 쪽과 자신감 있는 쪽 중 어느 쪽이 좋으신가요?\n\n답하기 어려우시면 지금 정보만으로 ‘완성본 보내줘’라고 하셔도 됩니다.`,
      );
    }
    case "competencies": {
      const ranked =
        category === "collaboration" || category === "conflict"
          ? ["협업과 합의 — 직군이 다른 팀원과 범위·기준을 먼저 맞추는 능력", "데이터 정합성 — 같은 데이터를 모두가 같게 보게 만드는 설계", "요구사항 분석 — 대학 현업의 요구를 우선순위로 정리하는 힘"]
          : ["데이터 정합성 — 학사 데이터는 오류 하나가 수천 명에게 번지기 때문에 공고의 핵심입니다", "SQL 활용 능력 — SQLD 우대 조건과 바로 연결됩니다", "요구사항 분석 — 고객(대학) 현업의 언어로 문제를 정의하는 문화와 맞닿아 있습니다"];
      return keep(
        `‘${shown}’ 문항에서 강조하면 좋은 역량은 세 가지입니다.\n\n1) ${ranked[0]}\n2) ${ranked[1]}\n3) ${ranked[2]}\n\n이 중 첫 번째를 중심으로 ${evidence.name} 경험(${evidence.keyFact})을 엮겠습니다. 바로 완성본을 원하시면 말씀해 주세요.`,
      );
    }
    case "projects": {
      const rest = projects.filter((project) => project.kind !== evidence.kind);
      const restLines = rest.map((project) => `· ${project.name} — ${project.focus}을 보여 줄 때 좋습니다 (${project.keyFact})`).join("\n");
      return {
        content: `‘${shown}’ 문항에는 ${evidence.name} 경험을 중심으로 쓰는 것을 추천합니다. ${evidence.keyFact}처럼 확인 가능한 근거가 있고, ${evidence.focus}은 아카넷 공고의 핵심 역량과 바로 연결됩니다.${restLines ? `\n\n${restLines}` : ""}\n\n이 경험으로 진행할까요? 다른 프로젝트를 원하시면 이름만 말씀해 주세요.`,
        protocol: protocol(stage === "direction" ? "draft" : stage, "", false, false),
      };
    }
    case "evidence":
      return keep(
        `‘${shown}’ 문항을 뒷받침할 근거로는 다음이 가장 설득력 있습니다.\n\n1) 수치 근거 — ${evidence.keyFact}\n2) 판단 근거 — ${evidence.details[0]}\n3) 공고 연결 — ${evidence.fitLine}\n\n이 근거들을 넣어 바로 완성본을 써 드릴까요?`,
      );
    default:
      return directionReply(ctx, prompt, false);
  }
}

function confirmReply(ctx: ReplyContext, base: Base, currentAnswer: string) {
  const answer = fitText(toDoc(base.text).map((paragraph) => paragraph.map(politeForm)).map((p) => p.join(" ")).join("\n\n"), ctx.maxChars);
  const ready = Boolean(currentAnswer) && base.applied;
  const keywords = POSTING_KEYWORDS.filter(([, pattern]) => pattern.test(answer)).map(([label]) => label);
  const ratio = Math.round((answer.length / ctx.maxChars) * 100);
  const checks = [
    /아카넷/.test(answer) ? "아카넷과의 연결" : "",
    /\d/.test(answer) ? "확인 가능한 수치 근거" : "",
    keywords.length ? `공고 키워드 ${keywords.length}개(${keywords.join("·")})` : "",
  ].filter(Boolean);
  const lastCheck = checks[checks.length - 1] ?? "";
  const checkText = checks.length
    ? `${checks.join(", ")}${lastCheck.endsWith(")") ? "를" : hasBatchim(lastCheck) ? "을" : "를"} 갖췄고, `
    : "";
  const missing = !keywords.length ? " 공고 키워드를 더 넣고 싶다면 ‘공고 키워드 넣어줘’라고 말씀해 주세요." : "";
  const verdict = ready ? "이대로 확정해도 좋습니다." : "‘적용하기’를 누르면 이 답안으로 확정됩니다.";
  const description = `최종 점검을 마쳤습니다. ${checkText}분량은 ${ctx.maxChars}자 중 ${answer.length}자(${ratio}%)입니다. ${verdict}${missing}`;
  return draftReply(description, answer, ctx.maxChars, ready ? "confirm" : "refine", ready);
}

function freshDescription(ctx: ReplyContext, completion: boolean, answer: string, hadDraft: boolean): string {
  const [category] = ctx.categories;
  const kind = completion ? "완성본" : "초안";
  const present = ctx.projects.filter((project) => project.nameMarker.test(answer)).map((project) => project.name);
  const subject =
    category === "introduction" || ctx.categories.length > 1
      ? `${(present.length ? present : [ctx.evidence.name]).join("·")} 경험을 엮어`
      : `${ctx.evidence.name} 경험을 중심으로`;
  if (!completion) {
    return hadDraft ? `${subject} ‘${ctx.shown}’ ${kind}을 새로 구성했습니다.` : `${subject} ‘${ctx.shown}’ ${kind}을 작성했습니다.`;
  }
  return hadDraft
    ? `${subject} ‘${ctx.shown}’ ${kind}을 다시 정리했습니다. 문장 흐름과 분량을 제출 기준에 맞췄습니다.`
    : `${subject} ‘${ctx.shown}’ ${kind}을 작성했습니다. 공고 키워드와 확인 가능한 근거를 담아, 바로 제출할 수 있는 분량으로 맞췄습니다.`;
}

export function buildCareerDemoReply(body: DemoRequest, projects: Evidence[]) {
  ensureRegistry();
  if (!projects.length) projects = getAllCareerDemoEvidence();
  const title =
    typeof body.selectedQuestion?.title === "string" && body.selectedQuestion.title.trim()
      ? body.selectedQuestion.title.trim().slice(0, 200)
      : "직무 역량";
  const categories = classifyCareerDemoQuestion(title);
  const turns = readTurns(body.messages);
  const lastTurn = turns[turns.length - 1];
  const prompt = lastTurn?.role === "user" ? lastTurn.content.slice(0, 5000) : "";
  const stage: Stage =
    body.workflowStage === "draft" || body.workflowStage === "refine" || body.workflowStage === "confirm" ? body.workflowStage : "direction";
  const rawLimit = body.selectedQuestion?.maxChars;
  const maxChars =
    typeof rawLimit === "number" && Number.isFinite(rawLimit) ? Math.max(40, Math.min(3000, Math.floor(rawLimit))) : 700;
  const assigned = assignEvidence(title, categories, projects, body.backgroundContext);
  const variant = turns.filter((turn) => turn.role === "assistant").length;
  const baseCtx: ReplyContext = {
    title,
    shown: shortTitle(title),
    categories,
    evidence: assigned[0],
    evidences: assigned,
    projects,
    maxChars,
    variant,
  };

  // The intro prompt lists every selected project, so it must not pick the evidence.
  if (body.operation === "intro") return introReply(baseCtx);

  const intents = parseIntents(prompt);
  const currentAnswer = typeof body.currentAnswer === "string" ? body.currentAnswer.trim().slice(0, 10000) : "";
  const base = resolveBase(turns, currentAnswer);
  const baseMain = base ? mainProjectOf(base.text, projects) : undefined;

  // Which project the answer should be about, and whether that means rewriting the base.
  const named = namedProject(prompt, projects);
  let evidence = baseCtx.evidence;
  let switched = false;
  let rotatedFrom: Evidence | undefined;
  if (named) {
    evidence = named;
    switched = Boolean(base) && baseMain?.kind !== named.kind;
  } else if (intents.rotate && projects.length > 1) {
    const current = baseMain ?? agreedProject(turns, -1, projects) ?? baseCtx.evidence;
    const order = projects.map((project) => project.kind);
    const start = order.indexOf(current.kind);
    const text = base?.text ?? "";
    const rotated = order
      .map((_, offset) => projects[(start + 1 + offset) % projects.length])
      .find((project) => project.kind !== current.kind && !project.nameMarker.test(text));
    evidence = rotated ?? projects[(start + 1) % projects.length];
    rotatedFrom = current;
    switched = Boolean(base);
  } else {
    const agreed = agreedProject(turns, base ? (Number.isFinite(base.index) ? base.index : turns.length) : -1, projects);
    if (agreed && (!base || (baseMain && agreed.kind !== baseMain.kind))) {
      evidence = agreed;
      switched = Boolean(base);
    } else if (baseMain) {
      evidence = baseMain;
    }
  }
  const evidences = [evidence, ...assigned.slice(1).map((item) => (item.kind === evidence.kind ? (projects.find((p) => p.kind !== evidence.kind) ?? item) : item))];
  const ctx: ReplyContext = { ...baseCtx, evidence, evidences };

  const lastAssistant = [...turns].reverse().find((turn) => turn.role === "assistant");
  const lastAssistantHasDraft = Boolean(lastAssistant && extractDraft(lastAssistant.content));
  const edit = hasEdit(intents);

  // Advice and outline requests answer in prose and never offer an answer to apply.
  if (intents.advice && !intents.editVerb && !(intents.advice === "evidence" && base)) {
    if (intents.advice === "direction" && !base) return directionReply(ctx, prompt, Boolean(named));
    return adviceReply(intents.advice, ctx, stage, prompt);
  }

  const goAhead = intents.completion || intents.draft || intents.affirm || intents.confirm || edit || body.operation === "fit-length";
  if (!base && stage === "direction" && !goAhead) return directionReply(ctx, prompt, Boolean(named || intents.rotate));

  // An explicit final check (or the confirm stage without new instructions) verifies the answer.
  const confirmRequest = intents.confirm || (stage === "confirm" && !prompt.trim() && !edit);
  if (base && confirmRequest && !edit && !intents.completion) return confirmReply(ctx, base, currentAnswer);

  // A plain "좋아요" right after a draft is approval, not a new request.
  if (base && intents.affirm && lastAssistantHasDraft && !edit && !intents.completion && !intents.draft && !switched) {
    const answer = fitText(base.text, maxChars);
    const kept = base.applied && Boolean(currentAnswer);
    return draftReply(
      kept
        ? "좋습니다. 적용하신 답안을 그대로 확정해 두겠습니다. 더 다듬고 싶다면 ‘숫자 강조해줘’·‘첫 문장 바꿔줘’처럼 말씀해 주세요."
        : "좋습니다. 지금 답안으로 충분히 설득력이 있습니다. ‘적용하기’로 반영하시거나, ‘숫자 강조해줘’·‘첫 문장 바꿔줘’처럼 더 다듬을 부분을 말씀해 주세요.",
      answer,
      maxChars,
      kept ? "confirm" : "refine",
      kept,
    );
  }

  const soft = softLimit(maxChars);
  // "다시 써줘" on an existing draft: rebuild it, and open differently if it would come out the same.
  const rewrite = Boolean(base) && intents.draft && !edit && !intents.completion && !switched;
  const fresh = !base || switched || rewrite || (intents.affirm && !lastAssistantHasDraft && !edit);
  const requested = intents.chars ? Math.max(40, Math.min(maxChars, intents.chars)) : null;
  const freshTarget = intents.expand
    ? (requested ?? maxChars)
    : requested !== null && !intents.shortenOnly && !intents.shorten && requested > soft
      ? requested
      : soft;
  const notes: string[] = [];
  const editCtx: EditContext = { category: categories[0], evidence, projects, variant, protect: new Set(), notes };
  const working = fresh || !base ? renderDraft(categories, evidences, projects, freshTarget) : base.text;
  const preserved = new Set(fresh ? [] : toDoc(working).flat());
  const startText = normalizeText(working);
  const doc = toDoc(working);

  if (switched && base) {
    notes.push(
      rotatedFrom || baseMain
        ? `소재를 ${(rotatedFrom ?? baseMain)!.name}에서 ${evidence.name} 경험으로 바꿔 다시 썼습니다. ${withObject(evidence.focus)} 중심으로 구성했습니다.`
        : `${evidence.name} 경험을 중심으로 다시 썼습니다.`,
    );
  } else if (intents.rotate && projects.length < 2) {
    notes.push("선택된 프로젝트가 하나뿐이라 소재는 그대로 두었습니다. 기반 프로젝트를 더 선택하시면 다른 경험으로 바꿔 드릴게요.");
  }
  // A rebuild that comes out identical to what is on screen ("다시 써줘", "네" after advice, or a
  // switch the form is too short to show) opens differently so the request visibly lands.
  if (fresh && base && squash(startText) === squash(base.text)) {
    applyOpening(doc, editCtx);
    notes.splice(
      0,
      notes.length,
      switched
        ? `현재 분량(${maxChars}자)에서는 ${evidence.name} 경험을 소개할 자리가 부족해, 도입을 바꿔 다시 썼습니다. 분량을 늘리면 ${evidence.name} 경험을 넣어 드릴게요.`
        : "같은 경험을 다른 도입으로 다시 썼습니다.",
    );
  }
  if (intents.opening) applyOpening(doc, editCtx);
  if (intents.tone && !(intents.tone === "natural" && (intents.detail || intents.numbers || intents.keywords || intents.opening))) {
    applyTone(doc, editCtx, intents.tone);
  }
  if (intents.detail) applyDetail(doc, editCtx);
  if (intents.numbers) applyNumbers(doc, editCtx);
  if (intents.keywords) applyKeywords(doc, editCtx);

  // Length: an explicit number decides the direction; otherwise the verbs do.
  const currentLength = renderDoc(doc).length;
  const wantsExpand =
    intents.expand ||
    (requested !== null && !intents.shortenOnly && !intents.shorten && requested > currentLength * 1.08) ||
    (fresh && freshTarget > soft);
  const wantsShorten =
    !wantsExpand && (intents.shorten || (requested !== null && (requested < currentLength || intents.shortenOnly)));
  const limit = fresh ? freshTarget : Math.min(maxChars, Math.max(soft, startText.length));
  const capped = intents.chars !== null && intents.chars > maxChars ? ` 문항 제한이 ${maxChars}자라 그 안에서 최대한 채웠습니다.` : "";
  // Whatever was asked, an existing answer must come back visibly different.
  const ensureChanged = (text: string, polishLimit: number) => {
    if (fresh || squash(text) !== squash(startText)) return text;
    const polishDoc = toDoc(text);
    applyNatural(polishDoc, editCtx);
    return fitText(renderDoc(polishDoc), polishLimit, { protect: editCtx.protect });
  };
  if (wantsExpand) {
    const target = requested ?? maxChars;
    const alreadyThere = !fresh && currentLength >= target * 0.96;
    if (alreadyThere) {
      applyDetail(doc, editCtx);
      notes.pop();
    } else {
      applyExpand(doc, editCtx, target);
    }
    const text = ensureChanged(fitText(renderDoc(doc), target, { protect: new Set([...editCtx.protect, ...preserved]) }), target);
    notes.push(
      fresh
        ? `요청하신 분량에 맞춰 ${evidence.name}의 세부 판단과 배운 점까지 담아 ${text.length}자로 썼습니다.${capped}`
        : alreadyThere
          ? `이미 ${target}자에 가까운 분량(${currentLength}자)이라, 같은 분량 안에서 덜 중요한 문장을 ${evidence.name}의 더 구체적인 근거로 바꿨습니다.${capped}`
          : `${currentLength}자였던 답안에 ${evidence.name}의 세부 판단과 배운 점을 더해 ${text.length}자로 늘렸습니다.${capped}`,
    );
    return finish(text);
  }
  if (wantsShorten) {
    const alreadyWithin = requested !== null && currentLength <= requested;
    const target = alreadyWithin
      ? Math.max(120, Math.round(currentLength * 0.86))
      : (requested ?? Math.max(150, Math.round(currentLength * (intents.summary ? 0.6 : 0.72))));
    const text = ensureChanged(fitText(renderDoc(doc), target, { protect: editCtx.protect }), target);
    notes.push(
      fresh
        ? `요청하신 대로 핵심만 남겨 ${text.length}자로 간결하게 썼습니다.`
        : alreadyWithin
          ? `이미 ${requested}자 안이지만, 겹치는 설명을 덜어 ${currentLength}자에서 ${text.length}자로 더 단단하게 압축했습니다. 핵심 수치와 마지막 다짐은 그대로 두었습니다.`
          : `${currentLength}자에서 ${text.length}자로 줄였습니다. 핵심 경험과 수치, 마지막 다짐은 남기고 덜 중요한 설명 문장을 덜어 냈습니다.`,
    );
    return finish(text);
  }

  let text = fitText(renderDoc(doc), limit, { protect: editCtx.protect });
  if (!fresh && squash(text) === squash(startText) && intents.completion) {
    // "완성본 보내줘" on an existing draft: fill it out and polish it into the final version.
    const polishDoc = toDoc(text);
    if (text.length < maxChars * 0.8) applyExpand(polishDoc, editCtx, soft);
    applyNatural(polishDoc, editCtx);
    text = fitText(renderDoc(polishDoc), Math.max(limit, soft), { protect: editCtx.protect });
    notes.unshift("지금까지 반영한 내용을 유지한 채 제출용 완성본으로 정리했습니다.");
  }
  return finish(ensureChanged(text, limit));

  function finish(answer: string) {
    const hadDraft = turns.some((turn) => turn.role === "assistant" && Boolean(extractDraft(turn.content)));
    const lead = fresh && !(switched && base) ? freshDescription(ctx, intents.completion || intents.confirm, answer, hadDraft) : "";
    const description = [lead, ...notes].filter(Boolean).join(" ") || "요청하신 방향으로 문장을 다듬었습니다.";
    return draftReply(description, answer, maxChars, "refine", false);
  }
}
