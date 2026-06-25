import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="Dev Event crawler CLI")
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max events to deep-crawl. 0 = 무제한(상세 없는 이벤트 모두 크롤, 기본값)",
    )
    args = parser.parse_args()

    from src.apps.dev_event.service import run_dev_event_crawler

    run_dev_event_crawler(limit=args.limit)


if __name__ == "__main__":
    main()

