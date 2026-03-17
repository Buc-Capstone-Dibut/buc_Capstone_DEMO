from typing import Any

from supabase import Client, create_client

from src.common.config.settings import SUPABASE_KEY, SUPABASE_URL


def _chunked(values: list[Any], chunk_size: int) -> list[list[Any]]:
    return [values[index : index + chunk_size] for index in range(0, len(values), chunk_size)]


class SupabaseTableRepository:
    def __init__(self, table_name: str, client: Client | None = None):
        if client is not None:
            self.client = client
        else:
            if not SUPABASE_URL or not SUPABASE_KEY:
                raise ValueError("Supabase configuration is missing.")
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)

        self.table_name = table_name

    def fetch_all_paged(
        self,
        columns: str = "*",
        page_size: int = 1000,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        all_rows: list[dict[str, Any]] = []
        offset = 0

        while True:
            query = self.client.table(self.table_name).select(columns)
            if filters:
                for column, value in filters.items():
                    query = query.eq(column, value)
            response = query.range(offset, offset + page_size - 1).execute()
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

    def upsert_many(
        self,
        rows: list[dict[str, Any]],
        *,
        on_conflict: str,
        chunk_size: int = 500,
    ) -> int:
        if not rows:
            return 0

        affected_count = 0
        for chunk in _chunked(rows, chunk_size):
            response = (
                self.client.table(self.table_name)
                .upsert(chunk, on_conflict=on_conflict, default_to_null=False)
                .execute()
            )
            affected_count += len(response.data) if response.data else len(chunk)
        return affected_count

    def delete_many_by_values(
        self,
        column: str,
        values: list[Any],
        *,
        chunk_size: int = 500,
        filters: dict[str, Any] | None = None,
    ) -> int:
        if not values:
            return 0

        deleted_count = 0
        for chunk in _chunked(values, chunk_size):
            query = self.client.table(self.table_name).delete()
            if filters:
                for filter_column, filter_value in filters.items():
                    query = query.eq(filter_column, filter_value)
            response = query.in_(column, chunk).execute()
            deleted_count += len(response.data) if response.data else len(chunk)
        return deleted_count
