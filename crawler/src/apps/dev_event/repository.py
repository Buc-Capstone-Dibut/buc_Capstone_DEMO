from typing import Any

from src.common.config.settings import DEV_EVENTS_TABLE
from src.common.storage.supabase_repo import SupabaseTableRepository


class DevEventRepository:
    def __init__(self, table_name: str = DEV_EVENTS_TABLE):
        self._repo = SupabaseTableRepository(table_name=table_name)

    def fetch_existing_events(self, source: str) -> list[dict[str, Any]]:
        return self._repo.fetch_all_paged(
            columns=(
                "id, source_key, source_title, source, title, link, host, date, start_date, "
                "end_date, tags, category, status, description, thumbnail, content, summary, "
                "target_audience, fee, schedule, benefits, last_seen_at"
            ),
            filters={"source": source},
        )

    def upsert_events(self, rows: list[dict[str, Any]]) -> int:
        return self._repo.upsert_many(rows, on_conflict="source_key")

    def delete_events_by_source_keys(self, source: str, source_keys: list[str]) -> int:
        return self._repo.delete_many_by_values(
            "source_key",
            source_keys,
            filters={"source": source},
        )
