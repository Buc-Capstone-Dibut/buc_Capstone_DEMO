import time
import uuid

from loguru import logger

from src.apps.dev_event.fetcher import fetch_dev_event_readme
from src.apps.dev_event.parser import parse_dev_events
from src.apps.dev_event.processor import deep_crawl_event
from src.apps.dev_event.repository import DevEventRepository
from src.shared.database import fetch_thumbnail_from_web


def load_existing_events(repository: DevEventRepository):
    return repository.load_existing_by_link()


def run_dev_event_crawler(limit: int = 0, repository: DevEventRepository | None = None):
    # limit <= 0 이면 무제한 — 상세가 없는 이벤트를 한 번에 모두 크롤한다.
    # (이미 채워진 이벤트는 needs_crawl=False 라 재실행 비용은 거의 0)
    unlimited = limit <= 0
    repository = repository or DevEventRepository()
    logger.info(
        f"🚀 Starting Dev-Event Crawler (Deep Crawl Limit: {'무제한' if unlimited else limit})..."
    )

    existing_map = load_existing_events(repository)
    logger.info(f"Loaded {len(existing_map)} existing events.")

    content = fetch_dev_event_readme()
    if not content:
        logger.error("Failed to fetch content. Aborting.")
        return

    events = parse_dev_events(content)
    logger.info(f"Parsed {len(events)} events from README.")

    processed_count = 0

    for event in events:
        existing = existing_map.get(event.link)

        if existing:
            if existing.get("thumbnail"):
                event.thumbnail = existing.get("thumbnail")
            if existing.get("content"):
                event.content = existing.get("content")
            if existing.get("description"):
                event.description = existing.get("description")

            if existing.get("summary"):
                event.summary = existing.get("summary")
                event.target_audience = existing.get("target_audience", [])
                event.fee = existing.get("fee")
                event.schedule = existing.get("schedule", [])
                event.benefits = existing.get("benefits", [])

        if not event.thumbnail:
            try:
                time.sleep(0.5)
                thumb = fetch_thumbnail_from_web(event.link, "DevEvent")
                if thumb:
                    event.thumbnail = thumb
            except Exception as e:
                logger.warning(f"Failed to fetch thumbnail for {event.title}: {e}")

        needs_crawl = not event.content or not event.summary
        if needs_crawl and (unlimited or processed_count < limit):
            # limit 은 "시도 횟수" 기준 — deep_crawl 1회 = Firecrawl 1크레딧 + 대기.
            # 성공(if result)에서만 세면 실패(404/스크랩 실패)가 limit 을 안 깎아
            # 모든 이벤트를 다 처리해 버리는 버그가 있었다.
            processed_count += 1
            try:
                logger.info(f"🧠 Generating content for: {event.title}")
                result = deep_crawl_event(event)
                if result:
                    if result.get("title_ko"):
                        event.title = result.get("title_ko")

                    def ensure_list(val):
                        if isinstance(val, list):
                            return val
                        if isinstance(val, str) and val:
                            return [val]
                        return []

                    event.content = result.get("content")
                    event.description = result.get("description")
                    event.summary = result.get("summary")
                    event.target_audience = ensure_list(result.get("target_audience"))
                    event.fee = result.get("fee")
                    event.schedule = ensure_list(result.get("schedule"))
                    event.benefits = ensure_list(result.get("benefits"))
            except Exception as e:
                logger.error(f"Deep crawl failed for {event.title}: {e}")

    save_events_to_json(events, repository)


def save_events_to_json(events, repository: DevEventRepository):
    try:
        data = [event.model_dump(mode="json") for event in events]

        seen_ids = set()
        for item in data:
            base_str = f"{item['link']}-{item['title']}"
            item_id = str(uuid.uuid5(uuid.NAMESPACE_URL, base_str))

            counter = 0
            while item_id in seen_ids:
                counter += 1
                item_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{base_str}-{counter}"))

            item["id"] = item_id
            seen_ids.add(item_id)

        repository.save_all(data)
        logger.info(f"✅ Saved {len(events)} events to {repository.file_path}")
    except Exception as e:
        logger.error(f"Failed to save JSON: {e}")

