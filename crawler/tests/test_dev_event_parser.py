import unittest
from datetime import date

from src.apps.dev_event.parser import parse_date_range, parse_dev_events


class DevEventParserTest(unittest.TestCase):
    def test_parse_date_range_with_explicit_years(self) -> None:
        start_date, end_date = parse_date_range("2026. 03. 10 ~ 2026. 03. 31")

        self.assertEqual(start_date, date(2026, 3, 10))
        self.assertEqual(end_date, date(2026, 3, 31))

    def test_parse_date_range_handles_year_rollover(self) -> None:
        start_date, end_date = parse_date_range("12. 30(월) ~ 01. 02(목)")

        self.assertIsNotNone(start_date)
        self.assertIsNotNone(end_date)
        self.assertEqual((start_date.month, start_date.day), (12, 30))
        self.assertEqual((end_date.month, end_date.day), (1, 2))
        self.assertGreater(end_date, start_date)

    def test_parse_dev_events_populates_source_title_and_dates(self) -> None:
        markdown = """
## 모집/행사
- __[테스트 행사](https://example.com/event?utm_source=rss)__
  - 분류: `대회`, `AI`
  - 주최: 테스트 기관
  - 접수: 2026. 03. 10 ~ 2026. 03. 31
""".strip()

        events = parse_dev_events(markdown)

        self.assertEqual(len(events), 1)
        event = events[0]
        self.assertEqual(event.title, "테스트 행사")
        self.assertEqual(event.source_title, "테스트 행사")
        self.assertEqual(event.link, "https://example.com/event")
        self.assertEqual(event.category, "Competition")
        self.assertEqual(event.start_date, date(2026, 3, 10))
        self.assertEqual(event.end_date, date(2026, 3, 31))


if __name__ == "__main__":
    unittest.main()
