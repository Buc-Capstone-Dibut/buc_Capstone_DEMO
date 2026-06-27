from typing import Any

from supabase import Client, create_client

from src.common.config.settings import SUPABASE_KEY, SUPABASE_URL


class SupabaseTableRepository:
    def __init__(self, table_name: str, client: Client | None = None):
        if client is not None:
            self.client = client
        else:
            if not SUPABASE_URL or not SUPABASE_KEY:
                raise ValueError("Supabase configuration is missing.")
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)

        self.table_name = table_name

    def fetch_all_paged(self, columns: str, page_size: int = 1000) -> list[dict[str, Any]]:
        all_rows: list[dict[str, Any]] = []
        offset = 0

        while True:
            response = (
                self.client.table(self.table_name)
                .select(columns)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            rows = response.data or []

            if not rows:
                break

            all_rows.extend(rows)
            if len(rows) < page_size:
                break

            offset += page_size

        return all_rows

    def insert_many(self, rows: list[dict[str, Any]]) -> int:
        if not rows:
            return 0

        response = self.client.table(self.table_name).insert(rows).execute()
        return len(response.data) if response.data else len(rows)

    def upsert_many(self, rows: list[dict[str, Any]], on_conflict: str) -> int:
        """on_conflict 컬럼(예: 'link') 기준 upsert — 있으면 갱신, 없으면 삽입."""
        if not rows:
            return 0

        response = (
            self.client.table(self.table_name)
            .upsert(rows, on_conflict=on_conflict)
            .execute()
        )
        return len(response.data) if response.data else len(rows)

