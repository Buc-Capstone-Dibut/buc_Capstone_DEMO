"""레거시 중복 복구. 기본은 읽기 전용 계획, --check는 전체 SQL 실행 후 롤백."""
import argparse
import json
import os
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from src.apps.dev_event.identity import reconciliation_plan
from src.common.config.settings import PROJECT_ROOT  # 환경변수 로드

ALIAS_SCHEMA = """
CREATE TABLE IF NOT EXISTS public.dev_event_aliases (
    alias_id uuid PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.dev_events(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (alias_id <> event_id)
);
ALTER TABLE public.dev_event_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dev_event_aliases_public_read ON public.dev_event_aliases;
CREATE POLICY dev_event_aliases_public_read ON public.dev_event_aliases
    FOR SELECT TO public USING (true);
GRANT SELECT ON public.dev_event_aliases TO anon, authenticated;
GRANT ALL ON public.dev_event_aliases TO service_role;
"""


def connection_url(url):
    """공유 .env의 Prisma 전용 파라미터는 libpq에 전달하지 않는다."""
    parsed = urlsplit(url)
    prisma_options = {"pgbouncer", "connection_limit", "pool_timeout", "schema", "socket_timeout"}
    query = urlencode([(key, value) for key, value in parse_qsl(parsed.query) if key not in prisma_options])
    return urlunsplit(parsed._replace(query=query))


def run(*, apply=False, check=False):
    import psycopg
    from psycopg import sql
    from psycopg.rows import dict_row

    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required; use uv run --group maintenance")
    with psycopg.connect(connection_url(url), row_factory=dict_row, connect_timeout=15, prepare_threshold=None) as conn:
        conn.read_only = not (apply or check)
        if apply or check:
            conn.execute("SET LOCAL lock_timeout = '10s'")
            conn.execute("LOCK public.dev_events, public.squads IN SHARE ROW EXCLUSIVE MODE")
        rows = conn.execute("SELECT * FROM public.dev_events").fetchall()
        squads = conn.execute("SELECT id, activity_id FROM public.squads WHERE activity_id IS NOT NULL").fetchall()
        has_aliases = conn.execute("SELECT to_regclass('public.dev_event_aliases') AS name").fetchone()["name"] is not None
        aliases_before = conn.execute("SELECT * FROM public.dev_event_aliases").fetchall() if has_aliases else []
        merged, aliases = reconciliation_plan(rows)
        report = {"before": len(rows), "after": len(merged), "duplicate_ids": len(aliases), "summaries": sum(bool(row.get("summary")) for row in merged), "squad_references_to_remap": sum(row["activity_id"] in aliases for row in squads)}
        print(json.dumps(report, ensure_ascii=False))
        if not (apply or check):
            return report
        foreign_keys = conn.execute("""SELECT conname, conrelid::regclass::text AS table_name
            FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public.dev_events'::regclass
            AND conrelid <> coalesce(to_regclass('public.dev_event_aliases'), 0)""").fetchall()
        if foreign_keys:
            raise RuntimeError(f"Inspect additional foreign keys before merging: {foreign_keys}")

        backup_dir = PROJECT_ROOT / ".runlogs" / "dev-event-backups"
        backup_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        backup_path = backup_dir / f"{datetime.now(timezone.utc):%Y%m%dT%H%M%S%fZ}.json"
        with os.fdopen(os.open(backup_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w") as backup:
            json.dump({"dev_events": rows, "squad_references": squads, "aliases": aliases_before}, backup, ensure_ascii=False, default=str)
        print(f"Backup: {backup_path}")

        conn.execute(ALIAS_SCHEMA)
        for discarded, canonical in aliases.items():
            conn.execute("UPDATE public.squads SET activity_id = %s WHERE activity_id = %s", (canonical, discarded))
            conn.execute("UPDATE public.dev_event_aliases SET event_id = %s WHERE event_id = %s", (canonical, discarded))
            conn.execute("INSERT INTO public.dev_event_aliases(alias_id, event_id) VALUES (%s, %s) ON CONFLICT(alias_id) DO UPDATE SET event_id = excluded.event_id", (discarded, canonical))
        if aliases:
            conn.execute("DELETE FROM public.dev_events WHERE id = ANY(%s::uuid[])", (list(aliases),))
        for row in merged:
            columns = [column for column in row if column not in ("id", "created_at")]
            query = sql.SQL("UPDATE public.dev_events SET {} WHERE id = %s").format(sql.SQL(", ").join(sql.SQL("{} = %s").format(sql.Identifier(column)) for column in columns))
            conn.execute(query, [row[column] for column in columns] + [row["id"]])
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS dev_events_source_link_unique ON public.dev_events(source, link)")
        count = conn.execute("SELECT count(*) AS count FROM public.dev_events").fetchone()["count"]
        if count != len(merged):
            raise RuntimeError("Unexpected row count after reconciliation")
        if check:
            conn.rollback()
            print("Check passed; all database changes rolled back")
        else:
            print("Reconciliation complete; committing transaction")
        return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="백업 후 트랜잭션으로 중복 병합")
    mode.add_argument("--check", action="store_true", help="백업/SQL/제약조건을 검증하고 전체 롤백")
    args = parser.parse_args()
    run(apply=args.apply, check=args.check)


if __name__ == "__main__":
    main()
