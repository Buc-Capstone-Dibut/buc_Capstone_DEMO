import json
import re
import time

from firecrawl import FirecrawlApp
from loguru import logger

from src.common.config.settings import FIRECRAWL_API_KEY
from src.common.genai_client import get_genai_client


def get_firecrawl_client():
    if not FIRECRAWL_API_KEY:
        raise RuntimeError("FIRECRAWL_API_KEY is required for event details")
    return FirecrawlApp(api_key=FIRECRAWL_API_KEY)


def retryable(error):
    text = str(error).lower()
    return any(code in text for code in ("429", "500", "502", "503", "504", "timeout", "timed out", "resource_exhausted"))


def scrape_url_content(url: str, *, metadata: dict | None = None, force_render: bool = False):
    client = get_firecrawl_client()
    wait_for_content = force_render
    for attempt in range(3):
        try:
            options = {"formats": ["markdown"], "timeout": 45000, "only_main_content": not wait_for_content}
            if wait_for_content:
                options["wait_for"] = 5000
            result = client.scrape(url, **options)
            markdown = result.get("markdown") if isinstance(result, dict) else getattr(result, "markdown", None)
            page_metadata = result.get("metadata") if isinstance(result, dict) else getattr(result, "metadata", None)
            image = (page_metadata.get("ogImage") or page_metadata.get("og_image")) if isinstance(page_metadata, dict) else getattr(page_metadata, "og_image", None)
            if metadata is not None and isinstance(image, str) and image.startswith(("https://", "http://")):
                metadata["thumbnail"] = image
            if isinstance(markdown, str) and len(markdown.strip()) < 200 and not wait_for_content and attempt < 2:
                logger.info(f"본문이 짧아 동적 로딩 대기 후 다시 수집: {url}")
                wait_for_content = True
                continue
            return markdown.strip() if isinstance(markdown, str) else None
        except Exception as error:
            if attempt == 2 or not retryable(error):
                logger.warning(f"Firecrawl 수집 실패 {url}: {error}")
                return None
            time.sleep(10 * (attempt + 1))
    return None


def relevant_markdown(title: str, markdown: str, budget: int = 24000):
    if len(markdown) <= budget:
        return markdown
    position = markdown.casefold().find(title.casefold()) if len(title.strip()) >= 4 else -1
    if position > budget // 2:
        # 긴 공통 메뉴 뒤에 있는 실제 공고 제목과 본문을 보존한다.
        start = max(0, position - 2000)
        return markdown[start:start + budget]
    # 제목을 찾지 못해도 앞부분만 보내 본문 전체를 누락하지 않는다.
    return markdown[:budget // 2] + "\n\n" + markdown[-(budget // 2 - 2):]


def process_content_with_gemini(title: str, raw_markdown: str):
    client = get_genai_client()
    if client is None:
        raise RuntimeError("Gemini credentials are required for event summaries")
    prompt = f"""당신은 개발자 대외활동 큐레이터입니다. 아래 원문에서 확인한 사실만 한국어 JSON으로 정리하세요.
활동 제목: {title}
원문:
{relevant_markdown(title, raw_markdown)}

필드:
- title_ko: 활동 이름을 보존한 한국어 제목
- summary: 핵심 내용 2~3문장
- target_audience: 지원/참여 대상 문자열 배열
- fee: 참가 비용. 원문에 없으면 null
- schedule: 원문에서 확인되는 일정 문자열 배열
- benefits: 혜택 문자열 배열
- description: 소개, 참여 조건, 프로그램, 지원 방법, FAQ 등 실질적인 내용을 담은 Markdown
원문에 없는 대상/비용/일정/혜택은 추측하지 말고 null 또는 빈 배열로 두세요.
메뉴, 푸터, 플레이어, 관련 글, 바로가기 버튼 문구는 제외하세요.
summary와 description은 반드시 포함하되, 원문이 오류/차단/로그인 화면이거나 행사 정보를 확인할 수 없으면 둘 다 null로 반환하세요.
JSON 객체 하나만 반환하세요."""
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"response_mime_type": "application/json", "thinking_config": {"thinking_budget": 0}, "http_options": {"timeout": 60000}},
            )
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", (response.text or "").strip())
            try:
                result = json.loads(text)
            except json.JSONDecodeError:
                result = json.loads(re.sub(r'\\(?!["\\/bfnrtu])', r"\\\\", text))
            if isinstance(result, list) and result:
                result = result[0]
            if not isinstance(result, dict):
                raise ValueError("Expected an event JSON object")
            return result
        except Exception as error:
            # JSON 형식 오류와 일시적인 서버/할당량 오류만 제한적으로 재시도한다.
            if attempt == 2 or not (retryable(error) or isinstance(error, (ValueError, json.JSONDecodeError))):
                logger.warning(f"Gemini 요약 실패: {error}")
                return None
            time.sleep(5 * (attempt + 1))
    return None


def deep_crawl_event(event):
    logger.info(f"상세 수집: {event.title} ({event.link})")
    metadata = {}
    raw = scrape_url_content(event.link, metadata=metadata)
    if not raw:
        return None
    result = process_content_with_gemini(event.source_title or event.title, raw)
    if not result or not result.get("summary"):
        # 상세 모달이 main 밖에 있거나 늦게 로딩되는 페이지도 재확인한다.
        rendered = scrape_url_content(event.link, metadata=metadata, force_render=True)
        if rendered and rendered != raw:
            raw = rendered
            result = process_content_with_gemini(event.source_title or event.title, raw)
        if not result or not result.get("summary"):
            logger.warning(f"행사 정보를 확인할 수 없어 요약을 보류함: {event.link}")
    if result and isinstance(result.get("description"), str) and result["description"].strip():
        result["content"] = result["description"]
    # AI 실패 시에도 원문은 보존하며 summary는 비워 두어 다음 실행에서 다시 시도한다.
    details = result if result and result.get("content") else {"content": raw}
    if metadata.get("thumbnail") and not event.thumbnail:
        details["thumbnail"] = metadata["thumbnail"]
    return details
