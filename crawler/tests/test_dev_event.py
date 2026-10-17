import unittest
from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock, patch

from src.apps.dev_event.identity import reconciliation_plan
from src.apps.dev_event.models import DevEvent
from src.apps.dev_event.parser import parse_dev_events, parse_event_dates
from src.apps.dev_event.reconcile import connection_url
from src.apps.dev_event import service, processor

README = """## `26년 10월`
- __[새 활동](https://example.com/new)__
  - 분류: `대회`
  - 일시: 11.10(화)
  - 접수: 10.01(목) ~ 10.31(토)
- __[지난 활동](https://example.com/old)__
  - 일시: 10.01(목)
"""


class EventDatesTest(unittest.TestCase):
    def test_header_year_and_registration_take_priority(self):
        events = parse_dev_events(README, today=date(2030, 10, 18))
        self.assertEqual((events[0].start_date, events[0].end_date), (date(2026, 10, 1), date(2026, 10, 31)))
        self.assertEqual(events[0].status, "closed")
        self.assertEqual(events[0].source_title, "새 활동")
        self.assertEqual(events[0].category, "Competition")

    def test_status_uses_korean_today(self):
        events = parse_dev_events(README, today=date(2026, 10, 18))
        self.assertEqual([event.status for event in events], ["recruiting", "closed"])
        self.assertEqual(parse_dev_events(README, today=date(2026, 9, 1))[0].status, "upcoming")

    def test_explicit_year_cross_year_and_invalid_dates(self):
        self.assertEqual(parse_event_dates("2025-12-20 ~ 2026-01-10", 2030), (date(2025, 12, 20), date(2026, 1, 10)))
        self.assertEqual(parse_event_dates("12.20 ~ 01.10", 2026, 1), (date(2025, 12, 20), date(2026, 1, 10)))
        self.assertEqual(parse_event_dates("12.20 ~ 01.10", 2026, 12), (date(2026, 12, 20), date(2027, 1, 10)))
        self.assertEqual(parse_event_dates("2.30", 2026), (None, None))
        self.assertEqual(parse_event_dates("상시 모집", 2026), (None, None))


class IdentityTest(unittest.TestCase):
    def test_shared_prisma_url_retains_postgres_options_without_prisma_options(self):
        self.assertEqual(connection_url("postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1&sslmode=require"), "postgresql://user:pass@host/db?sslmode=require")

    def test_merge_retains_oldest_id_dates_and_rich_content(self):
        old = {"id": "old", "link": "https://example.com", "source": "github", "created_at": "2026-01-01", "source_key": "legacy::title", "start_date": "2026-10-01", "summary": "기존 요약", "benefits": ["수료증"]}
        new = {**old, "id": "new", "created_at": "2026-10-18", "source_key": "github::https://example.com", "start_date": None, "summary": "새 요약", "content": "상세", "benefits": []}
        merged, aliases = reconciliation_plan([new, old])
        self.assertEqual(aliases, {"new": "old"})
        self.assertEqual(merged[0]["id"], "old")
        self.assertEqual(merged[0]["created_at"], "2026-01-01")
        self.assertEqual(merged[0]["summary"], "새 요약")
        self.assertEqual(merged[0]["benefits"], ["수료증"])
        self.assertEqual(merged[0]["start_date"], "2026-10-01")
        self.assertEqual(reconciliation_plan(merged), (merged, {}))

    def test_same_link_different_source_is_not_merged(self):
        rows = [{"id": str(i), "source": source, "link": "https://example.com"} for i, source in enumerate(["github", "other"])]
        self.assertEqual(len(reconciliation_plan(rows)[0]), 2)


class ServiceTest(unittest.TestCase):
    def repository(self, existing=None):
        repo = Mock()
        repo.load_existing_by_link.return_value = existing or {}
        repo.close_missing.return_value = 0
        return repo

    @patch.object(service, "fetch_dev_event_readme", return_value=README)
    @patch.object(service, "deep_crawl_event", return_value={"summary": "요약", "content": "상세"})
    def test_limit_caps_attempts_but_metadata_is_saved_for_every_event(self, crawl, fetch):
        repo = self.repository()
        result = service.run_dev_event_crawler(limit=1, repository=repo)
        self.assertEqual(crawl.call_count, 1)
        self.assertEqual(len(repo.upsert_all.call_args_list[0].args[0]), 2)
        self.assertEqual(len(repo.upsert_all.call_args_list[1].args[0]), 1)
        self.assertEqual(result["remaining"], 1)

    @patch.object(service, "fetch_dev_event_readme", return_value=README)
    @patch.object(service, "deep_crawl_event", side_effect=[None, {"summary": "요약", "content": "상세"}])
    def test_failure_counts_toward_limit_and_unlimited_reaches_rest(self, crawl, fetch):
        repo = self.repository()
        result = service.run_dev_event_crawler(repository=repo)
        self.assertEqual(result["attempted"], 2)
        self.assertEqual(result["completed"], 1)
        self.assertEqual(repo.upsert_all.call_count, 2)

    @patch.object(service, "fetch_dev_event_readme", return_value=README)
    @patch.object(service, "deep_crawl_event", return_value=None)
    def test_resume_skips_existing_summary_and_preserves_details(self, crawl, fetch):
        repo = self.repository({"https://example.com/new": {"summary": "저장 요약", "content": "상세", "benefits": ["인증서"], "title": "번역한 제목"}})
        service.run_dev_event_crawler(repository=repo)
        self.assertEqual(crawl.call_count, 1)
        saved = repo.upsert_all.call_args_list[0].args[0][0]
        self.assertEqual((saved["summary"], saved["title"], saved["benefits"]), ("저장 요약", "번역한 제목", ["인증서"]))

    @patch.object(service, "fetch_dev_event_readme", return_value="broken source")
    def test_empty_source_cannot_modify_database(self, fetch):
        repo = self.repository()
        with self.assertRaises(RuntimeError):
            service.run_dev_event_crawler(repository=repo)
        repo.upsert_all.assert_not_called()
        repo.close_missing.assert_not_called()

    @patch.object(service, "fetch_dev_event_readme", return_value=README)
    @patch.object(service, "deep_crawl_event", return_value=None)
    def test_failed_attempt_also_consumes_limit(self, crawl, fetch):
        result = service.run_dev_event_crawler(limit=1, repository=self.repository())
        self.assertEqual((crawl.call_count, result["remaining"]), (1, 2))

    def test_empty_detail_values_do_not_erase_existing(self):
        event = DevEvent(title="활동", link="https://example.com", date="", summary="기존", benefits=["혜택"])
        service.apply_details(event, {"summary": None, "benefits": [], "content": "새 상세"})
        self.assertEqual((event.summary, event.benefits, event.content), ("기존", ["혜택"], "새 상세"))

    @patch.object(service, "fetch_dev_event_readme", return_value=README)
    @patch.object(service, "deep_crawl_event", return_value={"summary": "요약", "content": "상세"})
    def test_checkpoint_failure_stops_before_spending_on_next_event(self, crawl, fetch):
        repo = self.repository()
        repo.upsert_all.side_effect = [2, RuntimeError("database unavailable")]
        with self.assertRaises(RuntimeError):
            service.run_dev_event_crawler(repository=repo)
        self.assertEqual(crawl.call_count, 1)


class ProcessorTest(unittest.TestCase):
    @patch.object(processor.time, "sleep")
    @patch.object(processor, "get_genai_client")
    def test_transient_error_retries_without_disabling_later_events(self, get_client, sleep):
        generate = get_client.return_value.models.generate_content
        generate.side_effect = [RuntimeError("429 RESOURCE_EXHAUSTED"), SimpleNamespace(text='{"summary":"요약","description":"상세"}')]
        self.assertEqual(processor.process_content_with_gemini("제목", "원문")["summary"], "요약")
        self.assertEqual(generate.call_count, 2)
        sleep.assert_called_once_with(5)

    @patch.object(processor.time, "sleep")
    @patch.object(processor, "get_firecrawl_client")
    def test_permanent_scrape_failure_does_not_repeat(self, get_client, sleep):
        get_client.return_value.scrape.side_effect = RuntimeError("404 not found")
        self.assertIsNone(processor.scrape_url_content("https://example.com"))
        self.assertEqual(get_client.return_value.scrape.call_count, 1)
        sleep.assert_not_called()

    @patch.object(processor, "process_content_with_gemini", return_value=None)
    @patch.object(processor, "scrape_url_content", return_value="실제 원문")
    def test_ai_failure_preserves_raw_content_and_remains_retryable(self, scrape, process):
        event = DevEvent(title="활동", link="https://example.com", date="")
        self.assertEqual(processor.deep_crawl_event(event), {"content": "실제 원문"})


if __name__ == "__main__":
    unittest.main()
