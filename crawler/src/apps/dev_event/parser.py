import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

from src.apps.dev_event.models import DevEvent


def parse_event_dates(value: str, year: int, section_month: int = 0) -> tuple[date | None, date | None]:
    text = re.sub(r"\([^)]*\)", "", value)
    matches = list(re.finditer(r"(?:(\d{4})[./-]\s*)?(\d{1,2})[./-]\s*(\d{1,2})(?!\d)", text))
    if not matches:
        return None, None
    first, last = matches[0], matches[-1]
    start_year = int(first[1]) if first[1] else year
    end_year = int(last[1]) if last[1] else start_year
    if len(matches) > 1 and not last[1] and int(first[2]) > int(last[2]):
        if not first[1] and section_month == int(last[2]):
            start_year -= 1
        else:
            end_year += 1
    try:
        return date(start_year, int(first[2]), int(first[3])), date(end_year, int(last[2]), int(last[3]))
    except ValueError:
        return None, None


def parse_dev_events(markdown: str, *, today: date | None = None) -> list[DevEvent]:
    today = today or datetime.now(ZoneInfo("Asia/Seoul")).date()
    year, month = today.year, 0
    current: dict | None = None
    events: list[DevEvent] = []

    def finish() -> None:
        if not current:
            return
        start, end = parse_event_dates(current.get("date", ""), current["year"], current["month"])
        status = "closed" if end and end < today else "upcoming" if start and start > today else "recruiting"
        events.append(DevEvent(**{key: value for key, value in current.items() if key not in ("year", "month", "has_registration")}, start_date=start, end_date=end, status=status))

    for line in markdown.splitlines():
        header = re.match(r"^##\s+.*?(\d{2,4})년\s*(\d{1,2})월", line)
        if header:
            finish()
            current = None
            year = int(header[1])
            if year < 100:
                year += 2000
            month = int(header[2])
            continue
        event = re.match(r"^- __\[(.*?)\]\((.*?)\)__", line.rstrip())
        if event:
            finish()
            current = {"title": event[1].strip(), "source_title": event[1].strip(), "link": event[2].strip(), "date": "일정 미정", "tags": [], "source": "github", "year": year, "month": month}
            continue
        meta = re.match(r"^  - (.*?): (.*)", line.rstrip())
        if not meta or current is None:
            continue
        key, value = meta[1].strip(), meta[2].strip()
        if key == "분류":
            tags = [tag.strip() for tag in value.replace("`", "").split(",") if tag.strip()]
            current.update(tags=tags, category=determine_category(tags))
        elif key == "주최":
            current["host"] = value
        elif key == "접수":
            current.update(date=value, has_registration=True)
        elif key == "일시" and not current.get("has_registration"):
            current["date"] = value
    finish()
    return events


def determine_category(tags: list[str]) -> str:
    for category, terms in (("Competition", ("대회", "해커톤", "공모전")), ("Education", ("교육", "부트캠프", "강의")), ("Conference", ("컨퍼런스", "세미나")), ("Community", ("모임", "커뮤니티"))):
        if any(term in tags for term in terms):
            return category
    return "Other"
