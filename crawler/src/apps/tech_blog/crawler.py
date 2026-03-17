import time
from datetime import datetime

import feedparser
import requests

from src.apps.tech_blog.repository import TechBlogRepository
from src.common.config.settings import RSS_FEEDS, TAG_REQUEST_DELAY_MS
from src.shared.database import create_summary, extract_thumbnail, normalize_url
from src.shared.tagger import base_tags_from_feed_category, generate_tags_for_article


def get_existing_data(repository: TechBlogRepository):
    print("📋 Checking existing data...")
    url_set = set()
    author_title_map = {}

    try:
        all_data = repository.fetch_existing_articles()
        print(f"✅ Loaded total {len(all_data)} articles")

        for item in all_data:
            if item.get("external_url"):
                url_set.add(normalize_url(item["external_url"]))

            if item.get("title") and item.get("author"):
                key = f"{item['author']}:{item['title']}"
                author_title_map[key] = item

        return url_set, author_title_map
    except Exception as e:
        print(f"❌ Error fetching existing data: {e}")
        return set(), {}


def is_duplicate(article, url_set, author_title_map):
    if article["external_url"] in url_set:
        return True, "URL duplicate"

    key = f"{article['author']}:{article['title']}"
    if key in author_title_map:
        return True, "Author+Title duplicate"

    return False, None


def parse_feed(feed_config):
    print(f"📡 Parsing feed: {feed_config['name']}...")
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        }
        resp = requests.get(feed_config["url"], headers=headers, timeout=20)
        resp.raise_for_status()

        feed = feedparser.parse(resp.content)
        articles = []

        for entry in feed.entries:
            if not getattr(entry, "link", None):
                continue

            normalized_url = normalize_url(entry.link)

            pub_date = datetime.now()
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                pub_date = datetime(*entry.published_parsed[:6])
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                pub_date = datetime(*entry.updated_parsed[:6])

            summary = create_summary(
                entry.get("content", [{"value": ""}])[0]["value"]
                if "content" in entry
                else entry.get("summary", ""),
                feed_config,
                entry,
            )

            thumbnail_url = extract_thumbnail(entry, feed_config)

            article = {
                "title": (entry.get("title") or "No Title").strip(),
                "summary": summary,
                "author": feed_config["name"],
                "external_url": normalized_url,
                "published_at": pub_date.isoformat(),
                "thumbnail_url": thumbnail_url,
                "blog_type": feed_config["type"],
                "category": feed_config.get("category"),
                "tags": base_tags_from_feed_category(feed_config.get("category")),
            }
            articles.append(article)

        print(f"✅ {feed_config['name']}: Parsed {len(articles)} articles")
        return articles
    except Exception as e:
        print(f"❌ Failed to parse {feed_config['name']}: {e}")
        return []


def save_articles(
    articles,
    url_set,
    author_title_map,
    feed_name,
    repository: TechBlogRepository,
):
    if not articles:
        return 0, 0

    new_articles = []
    duplicate_count = 0

    for article in articles:
        is_dup, reason = is_duplicate(article, url_set, author_title_map)
        if is_dup:
            duplicate_count += 1
        else:
            if not article["tags"]:
                ai_tags = generate_tags_for_article(article)
                if ai_tags:
                    article["tags"] = list(set(article["tags"] + ai_tags))[:8]

                if TAG_REQUEST_DELAY_MS > 0:
                    time.sleep(TAG_REQUEST_DELAY_MS / 1000.0)

            new_articles.append(article)

            url_set.add(article["external_url"])
            key = f"{article['author']}:{article['title']}"
            author_title_map[key] = article

            print(f"   👉 [{len(new_articles)}] Tagged & Ready: {article['title'][:40]}...")

    if not new_articles:
        print(f"📝 [{feed_name}] All {duplicate_count} articles are duplicates.")
        return 0, duplicate_count

    try:
        upserted_count = repository.upsert_articles(new_articles)
        print(f"✅ [{feed_name}] Upserted {upserted_count} articles ({duplicate_count} duplicates skipped)")
        return upserted_count, duplicate_count
    except Exception as e:
        print(f"❌ [{feed_name}] DB Upsert failed: {e}")
        return 0, duplicate_count


def run_tech_blog_crawler(repository: TechBlogRepository | None = None):
    repository = repository or TechBlogRepository()
    print(f"📊 Starting crawl for {len(RSS_FEEDS)} feeds...")

    url_set, author_title_map = get_existing_data(repository)
    print(f"📊 Existing articles: {len(url_set)}")

    total_new = 0
    total_dup = 0
    total_processed = 0

    for feed in RSS_FEEDS:
        articles = parse_feed(feed)
        inserted, duplicates = save_articles(
            articles,
            url_set,
            author_title_map,
            feed["name"],
            repository,
        )

        total_new += inserted
        total_dup += duplicates
        total_processed += len(articles)

        time.sleep(1)

    print("\n🎉 RSS Crawling Completed!")
    print(f"📊 Total processed: {total_processed}")
    print(f"✨ Newly saved: {total_new}")
    print(f"🔄 Duplicates found: {total_dup}")
    if total_processed > 0:
        print(f"📈 Deduplication rate: {(total_dup / total_processed * 100):.1f}%")
