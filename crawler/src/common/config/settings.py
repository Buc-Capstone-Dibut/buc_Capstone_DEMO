import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


def _safe_int(value: str | None, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _resolve_path(path_value: str | None, default_path: Path, base_dir: Path) -> Path:
    if not path_value:
        return default_path
    path = Path(path_value).expanduser()
    if not path.is_absolute():
        path = (base_dir / path).resolve()
    return path


def _load_dotenv_files(project_root: Path, crawler_root: Path) -> Path | None:
    dotenv_paths = [
        project_root / ".env",
        project_root / "web" / ".env.local",
        crawler_root / ".env",
    ]

    last_loaded: Path | None = None
    for dotenv_path in dotenv_paths:
        if dotenv_path.exists():
            load_dotenv(dotenv_path=dotenv_path, override=True)
            last_loaded = dotenv_path
    return last_loaded


@dataclass
class Settings:
    project_root: Path
    crawler_root: Path
    web_data_dir: Path
    dev_event_json_path: Path
    blogs_table: str
    supabase_url: str | None
    supabase_key: str | None
    gemini_api_key: str | None
    firecrawl_api_key: str | None
    tag_request_delay_ms: int
    tag_retry_base_ms: int
    rss_feeds: list[dict[str, Any]]
    loaded_env_file: Path | None


def _build_settings() -> Settings:
    crawler_root = Path(__file__).resolve().parents[3]
    project_root = crawler_root.parent
    loaded_env_file = _load_dotenv_files(project_root, crawler_root)

    web_data_dir = _resolve_path(
        os.getenv("WEB_DATA_DIR"),
        project_root / "web" / "public" / "data",
        crawler_root,
    )
    dev_event_json_path = _resolve_path(
        os.getenv("DEV_EVENT_JSON_PATH"),
        web_data_dir / "dev-events.json",
        crawler_root,
    )

    return Settings(
        project_root=project_root,
        crawler_root=crawler_root,
        web_data_dir=web_data_dir,
        dev_event_json_path=dev_event_json_path,
        blogs_table=os.getenv("SUPABASE_BLOGS_TABLE", "blogs"),
        supabase_url=os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
        supabase_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
        firecrawl_api_key=os.getenv("FIRECRAWL_API_KEY"),
        tag_request_delay_ms=_safe_int(os.getenv("TAG_REQUEST_DELAY_MS"), 1000),
        tag_retry_base_ms=_safe_int(os.getenv("TAG_RETRY_BASE_MS"), 5000),
        rss_feeds=[
            {"name": "토스", "url": "https://toss.tech/rss.xml", "type": "company"},
            {"name": "당근", "url": "https://medium.com/feed/daangn", "type": "company"},
            {"name": "카카오", "url": "https://tech.kakao.com/feed/", "type": "company"},
            {"name": "카카오페이", "url": "https://tech.kakaopay.com/rss", "type": "company"},
            {"name": "무신사", "url": "https://medium.com/feed/musinsa-tech", "type": "company"},
            {"name": "29CM", "url": "https://medium.com/feed/29cm", "type": "company"},
            {"name": "올리브영", "url": "https://oliveyoung.tech/rss.xml", "type": "company"},
            {"name": "우아한형제들", "url": "https://techblog.woowahan.com/feed/", "type": "company"},
            {"name": "네이버", "url": "https://d2.naver.com/d2.atom", "type": "company"},
            {"name": "라인", "url": "https://techblog.lycorp.co.jp/ko/feed/index.xml", "type": "company"},
            {"name": "마켓컬리", "url": "https://helloworld.kurly.com/feed.xml", "type": "company"},
            {"name": "에잇퍼센트", "url": "https://8percent.github.io/feed.xml", "type": "company"},
            {"name": "쏘카", "url": "https://tech.socarcorp.kr/feed", "type": "company"},
            {"name": "하이퍼커넥트", "url": "https://hyperconnect.github.io/feed.xml", "type": "company"},
            {"name": "데브시스터즈", "url": "https://tech.devsisters.com/rss.xml", "type": "company"},
            {"name": "뱅크샐러드", "url": "https://blog.banksalad.com/rss.xml", "type": "company"},
            {"name": "왓챠", "url": "https://medium.com/feed/watcha", "type": "company"},
            {"name": "다나와", "url": "https://danawalab.github.io/feed.xml", "type": "company"},
            {
                "name": "레브잇",
                "url": "https://medium.com/feed/%EB%A0%88%EB%B8%8C%EC%9E%87-%ED%85%8C%ED%81%AC%EB%B8%94%EB%A1%9C%EA%B7%B8",
                "type": "company",
            },
            {"name": "요기요", "url": "https://medium.com/feed/deliverytechkorea", "type": "company"},
            {"name": "쿠팡", "url": "https://medium.com/feed/coupang-tech", "type": "company"},
            {"name": "원티드", "url": "https://medium.com/feed/wantedjobs", "type": "company"},
            {"name": "데이블", "url": "https://teamdable.github.io/techblog/feed.xml", "type": "company"},
            {"name": "사람인", "url": "https://saramin.github.io/feed.xml", "type": "company"},
            {"name": "직방", "url": "https://medium.com/feed/zigbang", "type": "company"},
            {"name": "콴다", "url": "https://medium.com/feed/mathpresso/tagged/frontend", "type": "company"},
            {
                "name": "AB180",
                "url": "https://raw.githubusercontent.com/ab180/engineering-blog-rss-scheduler/main/rss.xml",
                "type": "company",
            },
        ],
        loaded_env_file=loaded_env_file,
    )


settings = _build_settings()

PROJECT_ROOT = settings.project_root
CRAWLER_ROOT = settings.crawler_root
WEB_DATA_DIR = settings.web_data_dir
DEV_EVENT_JSON_PATH = settings.dev_event_json_path

BLOGS_TABLE = settings.blogs_table
SUPABASE_URL = settings.supabase_url
SUPABASE_KEY = settings.supabase_key
GEMINI_API_KEY = settings.gemini_api_key
FIRECRAWL_API_KEY = settings.firecrawl_api_key
TAG_REQUEST_DELAY_MS = settings.tag_request_delay_ms
TAG_RETRY_BASE_MS = settings.tag_retry_base_ms
RSS_FEEDS = settings.rss_feeds
