const DENSE_HANGUL_MIN_LENGTH = 10;
const SPACE_DENSITY_THRESHOLD = 0.03;
const COMMON_REPLACEMENTS: Array<[RegExp, string]> = [
  [/AI면접관/gu, "AI 면접관"],
  [/세션별상태/gu, "세션별 상태"],
  [/상태를가볍게/gu, "상태를 가볍게"],
  [/가볍게유지하고/gu, "가볍게 유지하고"],
  [/이벤트처리/gu, "이벤트 처리"],
  [/처리비동기로/gu, "처리 비동기로"],
  [/비동기로분/gu, "비동기로 분"],
  [/분했으며서버/gu, "분했으며 서버"],
  [/서버인스턴/gu, "서버 인스턴"],
  [/인스턴나눠/gu, "인스턴 나눠"],
  [/나눠연결/gu, "나눠 연결"],
  [/시키는방식으로/gu, "시키는 방식으로"],
  [/방식으로병목/gu, "방식으로 병목"],
  [/병목줄여/gu, "병목 줄여"],
  [/줄여수십명접속/gu, "줄여 수십명 접속"],
  [/끊김없/gu, "끊김 없"],
  [/끊김 없안정적으로/gu, "끊김 없이 안정적으로"],
  [/안정적으로운영/gu, "안정적으로 운영"],
  [/저희회사/gu, "저희 회사"],
  [/저희팀/gu, "저희 팀"],
  [/회사서비스/gu, "회사 서비스"],
  [/서비스백엔드직무/gu, "서비스 백엔드 직무"],
  [/서비스백엔드/gu, "서비스 백엔드"],
  [/백엔드직무/gu, "백엔드 직무"],
  [/서비스백엔드개발/gu, "서비스 백엔드 개발"],
  [/지원해주셔서/gu, "지원해 주셔서"],
  [/주셔서감사합니다/gu, "주셔서 감사합니다"],
  [/지원자분께서/gu, "지원자분께서 "],
  [/지원자님께서/gu, "지원자님께서 "],
  [/지원하신/gu, "지원하신 "],
  [/지원서를바탕으로/gu, "지원서를 바탕으로"],
  [/직무에대한/gu, "직무에 대한"],
  [/경험과역량/gu, "경험과 역량"],
  [/확인하고자합니다/gu, "확인하고자 합니다"],
  [/만나뵙게되어/gu, "만나 뵙게 되어"],
  [/먼저간단히/gu, "먼저 간단히"],
  [/간단히자기소개/gu, "간단히 자기 소개"],
  [/자기소개부터부탁드립니다/gu, "자기소개부터 부탁드립니다"],
  [/소개부터부탁드립니다/gu, "소개부터 부탁드립니다"],
  [/자기소개/gu, "자기 소개"],
  [/지원동기/gu, "지원 동기"],
  [/코드리뷰/gu, "코드 리뷰"],
  [/지표기반의사결정/gu, "지표 기반 의사결정"],
  [/재처리전략/gu, "재처리 전략"],
  [/응답시간/gu, "응답 시간"],
  [/대용량트래픽/gu, "대용량 트래픽"],
  [/트래픽처리/gu, "트래픽 처리"],
  [/데이터정합성/gu, "데이터 정합성"],
  [/정합성관리/gu, "정합성 관리"],
  [/해당직무/gu, "해당 직무"],
  [/직무에지원/gu, "직무에 지원"],
  [/직무는/gu, "직무는 "],
  [/특히어떤/gu, "특히 어떤"],
  [/특히코드/gu, "특히 코드"],
  [/처리와/gu, "처리와 "],
  [/관리가/gu, "관리가 "],
  [/매우중요합니다/gu, "매우 중요합니다"],
  [/리뷰와/gu, "리뷰와 "],
  [/의사결정을/gu, "의사결정을 "],
  [/팀에맞는/gu, "팀에 맞는"],
  [/맞는경험을/gu, "맞는 경험을 "],
  [/경험을설명했습니다/gu, "경험을 설명했습니다"],
  [/전략을조정해/gu, "전략을 조정해"],
  [/로줄였습니다/gu, "로 줄였습니다"],
  [/설명해주실/gu, "설명해 주실"],
  [/주실수있을까요/gu, "주실 수 있을까요"],
  [/관련해/gu, "관련해 "],
  [/바탕으로/gu, "바탕으로 "],
  [/기반으로/gu, "기반으로 "],
];
const BOUNDARY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/(바탕으로|기반으로|통해|위해|대해|대한|관련해|조정해|활용해|구성해|진행해|검증해|분석해|설명해|정리해)(?=[가-힣A-Za-z0-9]{2,})/gu, "$1 "],
  [/(을|를|이|가|은|는|과|와|도|만|에|에서|로|으로)(?=(비교|선택|설명|진행|구현|분석|정리|설계|검증|개선|적용|도입|확인|사용|처리|구축|운영|말씀|공유|도출|판단|조정|관리|요청|응답|생성|전달|보고|측정|줄였|늘렸|해결|복구|정의|학습|배포|분리|결정|마무리|작성|수립|기록|모니터링))/gu, "$1 "],
  [/(합니다|했습니다|있습니다|있었고|중요합니다|필요합니다|가능합니다|어렵습니다|좋습니다|맞습니다|보입니다|보였습니다|느꼈습니다|줄였습니다|늘렸습니다)(?=[가-힣A-Za-z0-9]{2,})/gu, "$1 "],
  [/(하는|되는|했던|하면서|했고|하고|하며)(?=[가-힣A-Za-z0-9]{2,})/gu, "$1 "],
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function collapseFragmentedTranscriptTokens(text: string): string {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return "";

  const tokens = normalized.split(" ");
  if (tokens.length < 4) return normalized;

  const singleTokenCount = tokens.filter((token) => /^[0-9A-Za-z가-힣]$/u.test(token)).length;
  if (singleTokenCount < Math.max(4, Math.floor(tokens.length * 0.6))) return normalized;

  const collapsed: string[] = [];
  const fragmentBuffer: string[] = [];
  for (const token of tokens) {
    if (/^[0-9A-Za-z가-힣]$/u.test(token)) {
      fragmentBuffer.push(token);
      continue;
    }
    if (fragmentBuffer.length) {
      collapsed.push(fragmentBuffer.join(""));
      fragmentBuffer.length = 0;
    }
    collapsed.push(token);
  }
  if (fragmentBuffer.length) {
    collapsed.push(fragmentBuffer.join(""));
  }

  return collapsed.join(" ").trim();
}

function shouldRecompactFragmentedTokens(text: string): boolean {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return false;

  const tokens = normalized.split(" ");
  if (tokens.length < 5) return false;

  const compactLengths = tokens.map((token) => token.replace(/[^0-9A-Za-z가-힣]/gu, "").length);
  const shortTokenCount = compactLengths.filter((length) => length > 0 && length <= 2).length;
  const singleTokenCount = compactLengths.filter((length) => length === 1).length;
  return shortTokenCount >= Math.max(4, Math.floor(tokens.length * 0.45)) || singleTokenCount >= 3;
}

function applyCommonReplacements(text: string): string {
  let formatted = collapseFragmentedTranscriptTokens(text);
  if (shouldRecompactFragmentedTokens(formatted) && /[가-힣]/u.test(formatted)) {
    formatted = formatted.replace(/\s+/gu, "");
  }
  formatted = formatted.replace(/([,.:!?])(?=\S)/gu, "$1 ");
  formatted = formatted.replace(/([A-Za-z0-9]+)([가-힣])/gu, "$1 $2");
  formatted = formatted.replace(/([가-힣])([A-Za-z0-9]+)/gu, "$1 $2");
  formatted = formatted.replace(
    /([A-Za-z0-9]+)\s+(과|와|을|를|은|는|이|가|도|만|에|의|로|에서|으로)(?=[가-힣A-Za-z0-9])/gu,
    "$1$2",
  );
  formatted = formatted.replace(
    /([A-Za-z0-9]+)\s+(과|와|을|를|은|는|이|가|도|만|에|의|로|에서|으로)\s+([A-Za-z0-9가-힣])/gu,
    "$1$2 $3",
  );
  formatted = formatted.replace(
    /([A-Za-z0-9]+)(응답|캐시|트래픽|서비스|백엔드|전략|시간|지표|성능)/gu,
    "$1 $2",
  );
  for (const [pattern, replacement] of COMMON_REPLACEMENTS) {
    formatted = formatted.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of BOUNDARY_REPLACEMENTS) {
    formatted = formatted.replace(pattern, replacement);
    formatted = formatted.replace(pattern, replacement);
  }
  return normalizeWhitespace(formatted);
}

function shouldApplyKoreanSpacingHeuristic(text: string): boolean {
  const normalized = normalizeWhitespace(text);
  if (normalized.length < DENSE_HANGUL_MIN_LENGTH) return false;

  const hangulCount = (normalized.match(/[가-힣]/g) || []).length;
  if (hangulCount < Math.floor(normalized.length * 0.6)) return false;

  const spaceCount = (normalized.match(/\s/g) || []).length;
  return spaceCount === 0 || spaceCount / Math.max(1, normalized.length) < SPACE_DENSITY_THRESHOLD;
}

function formatDenseKoreanTranscript(text: string): string {
  let formatted = applyCommonReplacements(text);
  if (!formatted) return formatted;

  formatted = formatted
    .replace(/다음질문/g, "다음 질문")
    .replace(/지원동기/g, "지원 동기")
    .replace(/자기소개/g, "자기 소개")
    .replace(/프로젝트경험/g, "프로젝트 경험")
    .replace(/문제해결/g, "문제 해결")
    .replace(/기술스택/g, "기술 스택")
    .replace(/잘들었습니다/g, "잘 들었습니다")
    .replace(/에대한/g, "에 대한")
    .replace(/에대해/g, "에 대해")
    .replace(/라고생각/g, "라고 생각")
    .replace(/답변잘/g, "답변 잘")
    .replace(/중시하는저희 팀/g, "중시하는 저희 팀");

  formatted = formatted.replace(
    /^(음|어|아|네|예|근데|근데요|그리고|그래서|그러면|일단|사실)(?=[가-힣])/,
    "$1 ",
  );
  formatted = formatted.replace(
    /(습니다|입니다|해요|했어요|했습니다|예요|이에요|네요|거든요|아요|어요|죠)(그리고|그래서|근데|그런데|그러면|다음|혹시|제가|저는|저희는|음|어|아|네|예)/g,
    "$1 $2",
  );
  formatted = formatted.replace(
    /(질문)(부탁드립니다|부탁드리겠습니다|주세요|해 주세요)/g,
    "$1 $2",
  );
  formatted = formatted.replace(
    /(잘 들었습니다|어렵습니다|좋습니다|괜찮습니다|감사합니다|부탁드립니다|생각합니다|같습니다)(그리고|그래서|근데|다음|제가|저는|혹시)/g,
    "$1 $2",
  );
  formatted = formatted.replace(
    /(저는|제가|저희는|저희가)(이|그|저)(?=[가-힣])/g,
    "$1 $2",
  );
  formatted = formatted.replace(
    /(이|그|저)(프로젝트|질문|답변|문장|부분|경험|상황|내용|기술|직무|회사)(?=[가-힣]?)/g,
    "$1 $2",
  );
  formatted = formatted.replace(
    /(지원 동기|자기 소개|프로젝트 경험|문제 해결|기술 스택)(에|의|가|이|를|을|와|과|는|은)/g,
    "$1 $2",
  );

  return normalizeWhitespace(formatted);
}

export function formatTranscriptForDisplay(text: string, role: "user" | "ai"): string {
  const normalized = applyCommonReplacements(text);
  if (!normalized) return normalized;
  if (role !== "user" && role !== "ai") return normalized;
  if (!shouldApplyKoreanSpacingHeuristic(normalized)) return normalized;
  return formatDenseKoreanTranscript(normalized);
}
