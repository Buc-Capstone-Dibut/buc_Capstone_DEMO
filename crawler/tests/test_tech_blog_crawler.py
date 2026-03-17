import unittest
from unittest.mock import patch

from src.apps.tech_blog.crawler import is_duplicate, save_articles


class FakeTechBlogRepository:
    def __init__(self) -> None:
        self.upserted_articles = []

    def upsert_articles(self, articles):
        self.upserted_articles = list(articles)
        return len(articles)


class TechBlogCrawlerTest(unittest.TestCase):
    def test_is_duplicate_detects_url_match(self) -> None:
        article = {
            "title": "Fresh Article",
            "author": "Dibut",
            "external_url": "https://example.com/post",
        }

        is_dup, reason = is_duplicate(article, {"https://example.com/post"}, {})

        self.assertTrue(is_dup)
        self.assertEqual(reason, "URL duplicate")

    @patch("src.apps.tech_blog.crawler.time.sleep")
    @patch("src.apps.tech_blog.crawler.generate_tags_for_article", return_value=["python", "ai"])
    def test_save_articles_tags_new_rows_and_skips_duplicates(self, tag_mock, sleep_mock) -> None:
        repository = FakeTechBlogRepository()
        url_set = {"https://example.com/already"}
        author_title_map = {}
        articles = [
            {
                "title": "Existing",
                "summary": "Already stored",
                "author": "Dibut",
                "external_url": "https://example.com/already",
                "tags": [],
            },
            {
                "title": "New",
                "summary": "Fresh content",
                "author": "Dibut",
                "external_url": "https://example.com/new",
                "tags": [],
            },
        ]

        inserted, duplicates = save_articles(
            articles,
            url_set,
            author_title_map,
            "Dibut",
            repository,
        )

        self.assertEqual(inserted, 1)
        self.assertEqual(duplicates, 1)
        self.assertEqual(len(repository.upserted_articles), 1)
        self.assertCountEqual(repository.upserted_articles[0]["tags"], ["python", "ai"])
        tag_mock.assert_called_once()
        sleep_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
