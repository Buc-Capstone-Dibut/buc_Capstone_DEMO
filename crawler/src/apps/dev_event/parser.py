from datetime import date, datetime
import re
from typing import Optional

from src.apps.dev_event.models import DevEvent
from src.shared.database import normalize_url


DATE_TOKEN_REGEX = re.compile(r"(?:(?P<year>\d{4})\.\s*)?(?P<month>\d{1,2})\.\s*(?P<day>\d{1,2})")


def parse_date_range(date_text: str) -> tuple[date | None, date | None]:
    matches = list(DATE_TOKEN_REGEX.finditer(date_text))
    if not matches:
        return None, None

    parsed_dates: list[date] = []
    inferred_year = datetime.now().year
    previous_date: date | None = None

    for match in matches[:2]:
        year = int(match.group("year") or inferred_year)
        month = int(match.group("month"))
        day = int(match.group("day"))

        try:
            parsed = date(year, month, day)
        except ValueError:
            continue

        if previous_date and match.group("year") is None and parsed < previous_date:
            try:
                parsed = date(previous_date.year + 1, month, day)
            except ValueError:
                continue

        parsed_dates.append(parsed)
        inferred_year = parsed.year
        previous_date = parsed

    if not parsed_dates:
        return None, None
    if len(parsed_dates) == 1:
        return parsed_dates[0], parsed_dates[0]
    return parsed_dates[0], parsed_dates[1]


def parse_dev_events(markdown: str) -> list[DevEvent]:
    """Parse raw markdown content into DevEvent objects."""
    lines = markdown.split("\n")
    events: list[DevEvent] = []

    current_event: Optional[dict] = None

    event_regex = re.compile(r"^- __\[(.*?)\]\((.*?)\)__")
    meta_regex = re.compile(r"^  - (.*?): (.*)")
    header_regex = re.compile(r"^## (.*)")

    for line in lines:
        line = line.rstrip()

        header_match = header_regex.match(line)
        if header_match:
            continue

        event_match = event_regex.match(line)
        if event_match:
            if current_event and is_valid_event(current_event):
                events.append(DevEvent(**current_event))

            source_title = event_match.group(1).strip()
            current_event = {
                "title": source_title,
                "source_title": source_title,
                "link": normalize_url(event_match.group(2).strip()),
                "status": "recruiting",
                "tags": [],
                "source": "github",
            }
            continue

        meta_match = meta_regex.match(line)
        if meta_match and current_event:
            key = meta_match.group(1).strip()
            value = meta_match.group(2).strip()

            if key == "분류":
                dry_value = value.replace("`", "")
                tags = [t.strip() for t in dry_value.split(",") if t.strip()]
                current_event["tags"] = tags
                current_event["category"] = determine_category(tags)
            elif key == "주최":
                current_event["host"] = value
            elif key in {"접수", "일시"}:
                current_event["date"] = value
                start_date, end_date = parse_date_range(value)
                current_event["start_date"] = start_date
                current_event["end_date"] = end_date

    if current_event and is_valid_event(current_event):
        events.append(DevEvent(**current_event))

    return events


def is_valid_event(event: dict) -> bool:
    return bool(event.get("source_title") and event.get("link") and event.get("date"))


def determine_category(tags: list[str]) -> str:
    if any(t in tags for t in ["대회", "해커톤", "공모전"]):
        return "Competition"
    elif any(t in tags for t in ["교육", "부트캠프", "강의"]):
        return "Education"
    elif any(t in tags for t in ["컨퍼런스", "세미나"]):
        return "Conference"
    elif any(t in tags for t in ["모임", "커뮤니티"]):
        return "Community"
    return "Other"
