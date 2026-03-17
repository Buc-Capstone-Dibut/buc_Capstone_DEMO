import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from loguru import logger

from src.apps.dev_event.models import DevEvent
from src.apps.dev_event.repository import DevEventRepository
from src.apps.dev_event.service import (
    DEV_EVENT_SOURCE,
    build_event_row,
    normalize_list_value,
    normalize_optional_text,
)

def load_legacy_events(file_path: Path) -> list[DevEvent]:
    with file_path.open("r", encoding="utf-8") as file:
        raw_data = json.load(file)

    if not isinstance(raw_data, list):
        raise ValueError(f"Legacy dev-event seed must be a list: {file_path}")

    events: list[DevEvent] = []
    for index, item in enumerate(raw_data):
        if not isinstance(item, dict):
            continue

        source_title = normalize_optional_text(item.get("source_title") or item.get("title"))
        title = normalize_optional_text(item.get("title")) or source_title
        link = normalize_optional_text(item.get("link"))
        date_text = normalize_optional_text(item.get("date"))

        if not source_title or not title or not link or not date_text:
            logger.warning(f"Skipping legacy row #{index + 1}: required fields missing.")
            continue

        events.append(
            DevEvent(
                source=item.get("source") or DEV_EVENT_SOURCE,
                source_title=source_title,
                title=title,
                link=link,
                host=normalize_optional_text(item.get("host")),
                date=date_text,
                start_date=item.get("start_date"),
                end_date=item.get("end_date"),
                tags=normalize_list_value(item.get("tags")),
                category=normalize_optional_text(item.get("category")),
                status=normalize_optional_text(item.get("status")) or "recruiting",
                description=normalize_optional_text(item.get("description")),
                thumbnail=normalize_optional_text(item.get("thumbnail")),
                content=normalize_optional_text(item.get("content")),
                summary=normalize_optional_text(item.get("summary")),
                target_audience=normalize_list_value(item.get("target_audience")),
                fee=normalize_optional_text(item.get("fee")),
                schedule=normalize_list_value(item.get("schedule")),
                benefits=normalize_list_value(item.get("benefits")),
            )
        )

    return events
def seed_dev_events_from_json(
    file_path: Path,
    repository: DevEventRepository | None = None,
) -> int:
    repository = repository or DevEventRepository()
    events = load_legacy_events(file_path)
    seen_at = datetime.now(timezone.utc)
    rows = [build_event_row(event, seen_at=seen_at) for event in events]
    upserted = repository.upsert_events(rows)
    logger.info(f"Seeded {upserted} legacy dev events from {file_path}")
    return upserted


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed dev_events table from a legacy JSON snapshot")
    parser.add_argument(
        "--file",
        type=Path,
        required=True,
        help="Path to the legacy dev-events JSON file",
    )
    args = parser.parse_args()

    seed_dev_events_from_json(file_path=args.file.resolve())


if __name__ == "__main__":
    main()
