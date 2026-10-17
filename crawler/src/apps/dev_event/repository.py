from datetime import datetime, timezone
from typing import Any

from loguru import logger

from src.common.config.settings import SUPABASE_KEY, SUPABASE_URL
from src.common.storage.supabase_repo import SupabaseTableRepository
from src.apps.dev_event.identity import reconciliation_plan, source_key

DEV_EVENTS_TABLE = "dev_events"

# Supabase dev_events 테이블 컬럼(= DevEvent 모델 필드). id/created_at 은 DB 가 소유.
_DB_COLUMNS = (
    "title",
    "link",
    "host",
    "date",
    "start_date",
    "end_date",
    "tags",
    "category",
    "status",
    "source",
    "description",
    "thumbnail",
    "content",
    "summary",
    "target_audience",
    "fee",
    "schedule",
    "benefits",
)


class DevEventRepository:
    """대외활동 Supabase 저장소.

    - 저장: Supabase dev_events 에 upsert(source_key 기준) — 라이브 사이트가 읽는 원본.
    - 기존 로드: DB에서 이미 생성된 콘텐츠를 조회해 재크롤링을 방지한다.
    """

    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                "Supabase configuration is required for the dev event crawler."
            )
        self._db = SupabaseTableRepository(table_name=DEV_EVENTS_TABLE)

    def load_existing_by_link(self) -> dict[str, dict[str, Any]]:
        rows = self._db.fetch_all_paged("*")
        merged, _ = reconciliation_plan(rows)
        return {item["link"]: item for item in merged if item["source"] == "github"}

    def upsert_all(self, rows: list[dict[str, Any]]) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        db_rows = []
        for row in rows:
            if not (isinstance(row, dict) and row.get("link")):
                continue
            db_row = {col: row.get(col) for col in _DB_COLUMNS}
            db_row["source_key"] = source_key(row.get("source") or "github", row["link"])
            db_row["source_title"] = row.get("source_title") or row.get("title")
            db_row["last_seen_at"] = now_iso
            db_row["updated_at"] = now_iso
            db_rows.append(db_row)

        saved_count = self._db.upsert_many(db_rows, on_conflict="source_key")
        logger.info(f"🗄️  Supabase dev_events upsert: {saved_count}건")
        return saved_count

    def close_missing(self, active_links: set[str], source: str = "github") -> int:
        if not active_links:
            raise ValueError("Refusing to close events without active source links")
        response = (self._db.client.table(DEV_EVENTS_TABLE).update({"status": "closed"})
                    .eq("source", source).neq("status", "closed").not_.in_("link", sorted(active_links)).execute())
        return len(response.data or [])
