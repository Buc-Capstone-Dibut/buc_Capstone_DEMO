import unittest
from datetime import datetime, timezone

from src.apps.dev_event.models import DevEvent
from src.apps.dev_event.service import (
    DEV_EVENT_SOURCE,
    build_event_row,
    normalize_list_value,
    normalize_optional_text,
    sync_events,
)


class FakeDevEventRepository:
    def __init__(self, existing_rows):
        self._existing_rows = existing_rows
        self.upserted_rows = []
        self.deleted_source_keys = []

    def fetch_existing_events(self, source: str):
        if source != DEV_EVENT_SOURCE:
            return []
        return list(self._existing_rows)

    def upsert_events(self, rows):
        self.upserted_rows = list(rows)
        return len(rows)

    def delete_events_by_source_keys(self, source: str, source_keys):
        if source == DEV_EVENT_SOURCE:
            self.deleted_source_keys = list(source_keys)
        return len(source_keys)


class DevEventServiceTest(unittest.TestCase):
    def test_normalization_helpers(self) -> None:
        self.assertIsNone(normalize_optional_text("정보 없음"))
        self.assertEqual(normalize_list_value("혜택 제공"), ["혜택 제공"])
        self.assertEqual(normalize_list_value(["혜택 제공", "혜택 제공", "-", None]), ["혜택 제공"])

    def test_build_event_row_normalizes_payload(self) -> None:
        event = DevEvent(
            title="번역된 행사명",
            source_title="원본 행사명",
            link="https://example.com/event?utm_source=rss",
            host="주최 기관",
            date="2026. 03. 10 ~ 2026. 03. 31",
            summary="요약",
            target_audience=["학생", "학생", ""],
        )
        event.benefits = "정보 없음"

        row = build_event_row(event, seen_at=datetime(2026, 3, 17, tzinfo=timezone.utc))

        self.assertEqual(row["link"], "https://example.com/event")
        self.assertEqual(row["source"], "github")
        self.assertEqual(row["source_title"], "원본 행사명")
        self.assertEqual(row["target_audience"], ["학생"])
        self.assertEqual(row["benefits"], [])
        self.assertIsNotNone(row["source_key"])
        self.assertIsNotNone(row["id"])

    def test_sync_events_deletes_stale_source_keys(self) -> None:
        repository = FakeDevEventRepository(
            existing_rows=[
                {"source_key": "github::https://example.com/old::old", "source": "github"},
                {"source_key": "github::https://example.com/new::new", "source": "github"},
            ]
        )
        events = [
            DevEvent(
                title="새 행사",
                source_title="새 행사",
                link="https://example.com/new",
                date="2026. 03. 10 ~ 2026. 03. 31",
            )
        ]

        result = sync_events(repository, events)

        self.assertEqual(result["upserted"], 1)
        self.assertEqual(result["deleted"], 2)
        self.assertEqual(len(repository.upserted_rows), 1)
        self.assertIn("github::https://example.com/old::old", repository.deleted_source_keys)
        self.assertIn("github::https://example.com/new::new", repository.deleted_source_keys)


if __name__ == "__main__":
    unittest.main()
