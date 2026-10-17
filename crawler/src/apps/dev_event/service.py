from datetime import date, datetime
from zoneinfo import ZoneInfo

from loguru import logger

from src.apps.dev_event.fetcher import fetch_dev_event_readme
from src.apps.dev_event.identity import DETAIL_FIELDS
from src.apps.dev_event.parser import parse_dev_events
from src.apps.dev_event.processor import deep_crawl_event
from src.apps.dev_event.repository import DevEventRepository


def apply_details(event, details):
    """부분 실패/빈 배열은 이미 저장된 상세 정보를 지우지 않는다."""
    for field in DETAIL_FIELDS:
        value = details.get(field)
        if not value or not isinstance(value, (str, list)):
            continue
        if field in ("target_audience", "schedule", "benefits"):
            value = [str(item).strip() for item in (value if isinstance(value, list) else [value]) if str(item).strip()]
        elif not isinstance(value, str):
            continue
        setattr(event, field, value)
    if details.get("title_ko") and isinstance(details["title_ko"], str):
        event.title = details["title_ko"]


def run_dev_event_crawler(limit: int = 0, repository: DevEventRepository | None = None):
    if limit < 0:
        raise ValueError("limit must be zero (unlimited) or positive")
    repository = repository or DevEventRepository()
    existing_map = repository.load_existing_by_link()
    content = fetch_dev_event_readme()
    if not content:
        raise RuntimeError("Failed to fetch the event source; no data was changed")

    # 원문 여러 섹션에 같은 링크가 있어도 한 번만 처리한다.
    events = list({event.link: event for event in parse_dev_events(content)}.values())
    if not events:
        raise RuntimeError("Parsed no events; refusing to modify the Supabase snapshot")
    previous_active = sum(row.get("status") != "closed" for row in existing_map.values())
    if len(events) < previous_active / 2:
        raise RuntimeError("Source unexpectedly shrank by over half; inspect the parser before saving")

    for event in events:
        existing = existing_map.get(event.link, {})
        apply_details(event, existing)
        if existing.get("summary") and existing.get("title"):
            event.title = existing["title"]

    # 제한과 무관하게 목록/날짜는 먼저 저장한다. 상세는 성공할 때마다 체크포인트한다.
    repository.upsert_all([event.model_dump(mode="json") for event in events])
    closed_count = repository.close_missing({event.link for event in events})
    today = datetime.now(ZoneInfo("Asia/Seoul")).date()
    pending = sorted(
        (event for event in events if not event.summary or not event.content),
        key=lambda event: (event.end_date is not None and event.end_date < today, -(event.start_date or date.min).toordinal(), event.link),
    )
    selected = pending[:limit] if limit else pending
    logger.info(f"목록 {len(events)}건 저장, 원문에서 제외된 {closed_count}건 마감. 상세 누락 {len(pending)}건 중 {len(selected)}건 수집")
    completed = 0
    for index, event in enumerate(selected, 1):
        try:
            result = deep_crawl_event(event)
        except Exception as error:
            logger.error(f"상세 수집 실패 ({index}/{len(selected)}) {event.link}: {error}")
            continue
        if result:
            apply_details(event, result)
            # 저장 실패는 즉시 중단한다. 결과를 잃은 채 계속 API 비용을 쓰지 않는다.
            repository.upsert_all([event.model_dump(mode="json")])
            if event.summary and event.content:
                completed += 1
        logger.info(f"상세 진행 {index}/{len(selected)}, 요약 완료 {completed}건: {event.link}")
    remaining = len(pending) - completed
    logger.info(f"완료: 상세 {completed}건 추가, 요약 누락 {remaining}건 (다시 실행하면 누락분 재시도)")
    return {"events": len(events), "attempted": len(selected), "completed": completed, "remaining": remaining}
