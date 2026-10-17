"""행사 식별자와 레거시 중복 데이터 병합. DB I/O 없이 정리 계획을 만든다."""
from collections import defaultdict
from typing import Any

DETAIL_FIELDS = ("summary", "description", "content", "thumbnail", "target_audience", "fee", "schedule", "benefits")


def source_key(source: str, link: str) -> str:
    return f"{source or 'github'}::{link.strip()}"


def reconciliation_plan(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, str]]:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        if not row.get("link"):
            raise ValueError("Cannot reconcile an event without a link")
        groups[(row.get("source") or "github", row["link"])].append(row)
    merged, aliases = [], {}
    for (source, link), group in groups.items():
        canonical = min(group, key=lambda row: (str(row.get("created_at") or ""), str(row["id"])))
        result = dict(canonical)
        newest = sorted(group, key=lambda row: str(row.get("updated_at") or row.get("created_at") or ""), reverse=True)
        for key in (*DETAIL_FIELDS, "start_date", "end_date", "source_title"):
            result[key] = next((row[key] for row in newest if row.get(key)), result.get(key))
        rich = next((row for row in newest if row.get("summary") and row.get("content")), newest[0])
        for key in ("title", "host", "date", "tags", "category", "status", "last_seen_at", "updated_at"):
            if rich.get(key):
                result[key] = rich[key]
        result["source_key"] = source_key(source, link)
        result["source"] = source
        merged.append(result)
        aliases.update({str(row["id"]): str(canonical["id"]) for row in group if row["id"] != canonical["id"]})
    return merged, aliases
