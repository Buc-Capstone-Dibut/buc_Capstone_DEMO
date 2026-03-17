from datetime import datetime, timezone
import time
import uuid
from typing import Any

from loguru import logger

from src.apps.dev_event.fetcher import fetch_dev_event_readme
from src.apps.dev_event.models import DevEvent
from src.apps.dev_event.parser import parse_dev_events
from src.apps.dev_event.processor import deep_crawl_event
from src.apps.dev_event.repository import DevEventRepository
from src.shared.database import fetch_thumbnail_from_web, normalize_title, normalize_url


DEV_EVENT_SOURCE = "github"
LIST_FIELDS = ("tags", "target_audience", "schedule", "benefits")
TEXT_FIELDS = ("thumbnail", "content", "summary", "description", "fee", "host", "category", "status")
EMPTY_TEXT_MARKERS = {"", "-", "없음", "정보 없음", "미정", "none", "null", "n/a", "na"}


def normalize_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in EMPTY_TEXT_MARKERS or text in EMPTY_TEXT_MARKERS:
        return None
    return text


def normalize_list_value(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        normalized = normalize_optional_text(value)
        return [normalized] if normalized else []

    normalized_items: list[str] = []
    if isinstance(value, (list, tuple, set)):
        for item in value:
            normalized = normalize_optional_text(item)
            if normalized and normalized not in normalized_items:
                normalized_items.append(normalized)
    return normalized_items


def build_source_key(source: str, link: str, source_title: str) -> str:
    normalized_link = normalize_url(link)
    normalized_source_title = normalize_title(source_title)
    return f"{source}::{normalized_link}::{normalized_source_title}"


def build_event_id(source_key: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, source_key))


def _existing_enrichment_score(existing: dict[str, Any]) -> int:
    return sum(
        1
        for field in ("thumbnail", "content", "summary", "description")
        if normalize_optional_text(existing.get(field))
    )


def _index_existing_events(
    rows: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    by_source_key: dict[str, dict[str, Any]] = {}
    by_link: dict[str, list[dict[str, Any]]] = {}

    for row in rows:
        source_key = normalize_optional_text(row.get("source_key"))
        if source_key:
            by_source_key[source_key] = row

        link = normalize_optional_text(row.get("link"))
        if not link:
            continue
        normalized_link = normalize_url(link)
        by_link.setdefault(normalized_link, []).append(row)

    return by_source_key, by_link


def load_existing_events(
    repository: DevEventRepository,
) -> tuple[dict[str, dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    rows = repository.fetch_existing_events(source=DEV_EVENT_SOURCE)
    return _index_existing_events(rows)


def pick_existing_event(
    event: DevEvent,
    by_source_key: dict[str, dict[str, Any]],
    by_link: dict[str, list[dict[str, Any]]],
) -> dict[str, Any] | None:
    source_key = build_source_key(
        source=event.source,
        link=event.link,
        source_title=event.source_title or event.title,
    )

    exact_match = by_source_key.get(source_key)
    if exact_match:
        return exact_match

    link_matches = by_link.get(normalize_url(event.link), [])
    if not link_matches:
        return None

    normalized_source_title = normalize_title(event.source_title or event.title)
    for match in link_matches:
        candidate_title = normalize_title(match.get("source_title") or match.get("title") or "")
        if candidate_title == normalized_source_title:
            return match

    return max(link_matches, key=_existing_enrichment_score, default=None)


def apply_existing_enrichment(event: DevEvent, existing: dict[str, Any] | None) -> None:
    if not existing:
        return

    for field in TEXT_FIELDS:
        current_value = normalize_optional_text(getattr(event, field, None))
        if current_value:
            continue
        existing_value = normalize_optional_text(existing.get(field))
        if existing_value:
            setattr(event, field, existing_value)

    for field in LIST_FIELDS:
        current_value = normalize_list_value(getattr(event, field, []))
        if current_value:
            setattr(event, field, current_value)
            continue

        existing_value = normalize_list_value(existing.get(field, []))
        if existing_value:
            setattr(event, field, existing_value)


def enrich_event(event: DevEvent, processed_count: int, limit: int) -> bool:
    if not event.thumbnail:
        try:
            time.sleep(0.5)
            thumb = fetch_thumbnail_from_web(event.link, "DevEvent")
            if thumb:
                event.thumbnail = thumb
        except Exception as exc:
            logger.warning(f"Failed to fetch thumbnail for {event.title}: {exc}")

    needs_crawl = not normalize_optional_text(event.content) or not normalize_optional_text(event.summary)
    if not needs_crawl or processed_count >= limit:
        return False

    try:
        logger.info(f"🧠 Generating content for: {event.title}")
        result = deep_crawl_event(event)
        if not result:
            return False

        translated_title = normalize_optional_text(result.get("title_ko"))
        if translated_title:
            event.title = translated_title

        event.content = normalize_optional_text(result.get("content"))
        event.description = normalize_optional_text(result.get("description"))
        event.summary = normalize_optional_text(result.get("summary"))
        event.target_audience = normalize_list_value(result.get("target_audience"))
        event.fee = normalize_optional_text(result.get("fee"))
        event.schedule = normalize_list_value(result.get("schedule"))
        event.benefits = normalize_list_value(result.get("benefits"))
        return True
    except Exception as exc:
        logger.error(f"Deep crawl failed for {event.title}: {exc}")
        return False


def build_event_row(event: DevEvent, seen_at: datetime) -> dict[str, Any]:
    source_title = normalize_optional_text(event.source_title) or event.title
    source_key = build_source_key(
        source=event.source,
        link=event.link,
        source_title=source_title,
    )

    event.id = build_event_id(source_key)
    event.source_key = source_key
    event.source_title = source_title
    event.link = normalize_url(event.link)
    event.title = normalize_optional_text(event.title) or source_title
    event.host = normalize_optional_text(event.host)
    event.date = normalize_optional_text(event.date) or ""
    event.tags = normalize_list_value(event.tags)
    event.category = normalize_optional_text(event.category)
    event.status = normalize_optional_text(event.status) or "recruiting"
    event.description = normalize_optional_text(event.description)
    event.thumbnail = normalize_optional_text(event.thumbnail)
    event.content = normalize_optional_text(event.content)
    event.summary = normalize_optional_text(event.summary)
    event.target_audience = normalize_list_value(event.target_audience)
    event.fee = normalize_optional_text(event.fee)
    event.schedule = normalize_list_value(event.schedule)
    event.benefits = normalize_list_value(event.benefits)
    event.last_seen_at = seen_at
    return event.model_dump(mode="json")


def sync_events(repository: DevEventRepository, events: list[DevEvent]) -> dict[str, int]:
    seen_at = datetime.now(timezone.utc)
    rows = [build_event_row(event, seen_at=seen_at) for event in events]
    current_source_keys = [row["source_key"] for row in rows if row.get("source_key")]

    existing_rows = repository.fetch_existing_events(source=DEV_EVENT_SOURCE)
    existing_source_keys = {
        row["source_key"]
        for row in existing_rows
        if isinstance(row, dict) and isinstance(row.get("source_key"), str)
    }
    stale_source_keys = sorted(existing_source_keys - set(current_source_keys))

    upserted = repository.upsert_events(rows)
    deleted = repository.delete_events_by_source_keys(DEV_EVENT_SOURCE, stale_source_keys)

    logger.info(
        "✅ Synced Dev Events to Supabase "
        f"(upserted={upserted}, deleted={deleted}, total_current={len(rows)})"
    )
    return {"upserted": upserted, "deleted": deleted, "current": len(rows)}


def run_dev_event_crawler(limit: int = 5, repository: DevEventRepository | None = None) -> dict[str, int] | None:
    repository = repository or DevEventRepository()
    logger.info(f"🚀 Starting Dev-Event Crawler (Deep Crawl Limit: {limit})...")

    existing_by_source_key, existing_by_link = load_existing_events(repository)
    logger.info(
        "Loaded existing events from Supabase "
        f"(source_keys={len(existing_by_source_key)}, links={len(existing_by_link)})."
    )

    content = fetch_dev_event_readme()
    if not content:
        logger.error("Failed to fetch content. Aborting.")
        return None

    events = parse_dev_events(content)
    logger.info(f"Parsed {len(events)} events from README.")

    if not events:
        logger.error("Parsed 0 events from README. Skipping sync to avoid deleting every row.")
        return None

    processed_count = 0

    for event in events:
        existing = pick_existing_event(event, existing_by_source_key, existing_by_link)
        apply_existing_enrichment(event, existing)
        if enrich_event(event, processed_count=processed_count, limit=limit):
            processed_count += 1

    return sync_events(repository, events)
