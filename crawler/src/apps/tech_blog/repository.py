from typing import Any

from src.common.config.settings import BLOGS_TABLE
from src.common.storage.supabase_repo import SupabaseTableRepository


class TechBlogRepository:
    def __init__(self, table_name: str = BLOGS_TABLE):
        self._repo = SupabaseTableRepository(table_name=table_name)

    def fetch_existing_articles(self) -> list[dict[str, Any]]:
        return self._repo.fetch_all_paged("external_url, title, author, published_at")

    def upsert_articles(self, rows: list[dict[str, Any]]) -> int:
        return self._repo.upsert_many(rows, on_conflict="external_url")
