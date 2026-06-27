from datetime import datetime, timezone
from typing import Any

from loguru import logger

from src.common.config.settings import DEV_EVENT_JSON_PATH, SUPABASE_KEY, SUPABASE_URL
from src.common.storage.json_repo import JsonFileRepository
from src.common.storage.supabase_repo import SupabaseTableRepository

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
    """대외활동 저장소.

    - 저장: Supabase dev_events 에 upsert(source_key 기준) — 라이브 사이트가 읽는 원본.
            JSON 파일에도 스냅샷을 남겨 오프라인/폴백용으로 유지한다.
    - 기존 로드(dedup): DB 우선(이미 생성된 콘텐츠 보존) → 실패 시 JSON.
    """

    def __init__(self, file_path=DEV_EVENT_JSON_PATH):
        self._json = JsonFileRepository(file_path)
        self._db: SupabaseTableRepository | None = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                self._db = SupabaseTableRepository(table_name=DEV_EVENTS_TABLE)
            except Exception:
                logger.exception("Supabase dev_events 저장소 초기화 실패 — JSON 만 사용")
                self._db = None
        else:
            logger.warning("Supabase 설정 없음 — dev_events 는 JSON 파일만 사용")

    @property
    def file_path(self):
        return self._json.file_path

    def load_existing_by_link(self) -> dict[str, dict[str, Any]]:
        if self._db is not None:
            try:
                rows = self._db.fetch_all_paged("*")
                return {
                    item["link"]: item
                    for item in rows
                    if isinstance(item, dict) and isinstance(item.get("link"), str)
                }
            except Exception:
                logger.exception("DB 기존 데이터 로드 실패 — JSON 으로 폴백")

        data = self._json.load_list()
        return {
            item["link"]: item
            for item in data
            if isinstance(item, dict) and isinstance(item.get("link"), str)
        }

    def save_all(self, rows: list[dict[str, Any]]) -> None:
        # 1) DB upsert (source_key 충돌 시 갱신). id/created_at 은 DB 가 소유한다.
        #    live 테이블은 source_key(유니크)·source_title 이 NOT NULL 이라 link/title 로 채운다.
        if self._db is not None:
            now_iso = datetime.now(timezone.utc).isoformat()
            db_rows = []
            for row in rows:
                if not (isinstance(row, dict) and row.get("link")):
                    continue
                db_row = {col: row.get(col) for col in _DB_COLUMNS}
                db_row["source_key"] = f"{row.get('source') or 'github'}::{row.get('link')}"
                db_row["source_title"] = row.get("title")
                db_row["last_seen_at"] = now_iso
                db_row["updated_at"] = now_iso
                db_rows.append(db_row)
            try:
                self._db.upsert_many(db_rows, on_conflict="source_key")
                logger.info(f"🗄️  Supabase dev_events upsert: {len(db_rows)}건")
            except Exception:
                logger.exception("Supabase dev_events upsert 실패 — JSON 스냅샷은 계속 저장")

        # 2) JSON 스냅샷 (오프라인/폴백용)
        self._json.save_list(rows)
