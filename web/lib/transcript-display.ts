const DENSE_HANGUL_MIN_LENGTH = 10;
const SPACE_DENSITY_THRESHOLD = 0.06;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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
  let formatted = normalizeWhitespace(text);
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
    .replace(/답변잘/g, "답변 잘");

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
  const normalized = normalizeWhitespace(text);
  if (!normalized) return normalized;
  if (role !== "user") return normalized;
  if (!shouldApplyKoreanSpacingHeuristic(normalized)) return normalized;
  return formatDenseKoreanTranscript(normalized);
}
