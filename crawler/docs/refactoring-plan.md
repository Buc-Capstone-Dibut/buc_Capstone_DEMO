# Crawler Refactoring Plan

## 1. 목표
- 통합 진입점 중심 구조를 제거하고, 크롤러별 독립 실행 구조로 전환한다.
- 중복 계층(`core`, `domains`, `infra`)을 제거하고 단일 정본 구조로 단순화한다.
- 환경 변수 로딩/저장소 접근을 크롤러 standalone 기준으로 표준화한다.
- `dev_event`, `tech_blog` 모두 Supabase를 정본으로 사용한다.

## 2. 최종 구조
```text
src
├── common
│   ├── config
│   │   └── settings.py
│   └── storage
│       └── supabase_repo.py
├── apps
│   ├── tech_blog
│   │   ├── cli.py
│   │   ├── crawler.py
│   │   └── repository.py
│   ├── dev_event
│   │   ├── cli.py
│   │   ├── service.py
│   │   └── repository.py
└── shared
    ├── database.py
    └── tagger.py
```

## 3. 실행 규칙
- `uv run python -m src.apps.tech_blog.cli`
- `uv run python -m src.apps.dev_event.cli --limit 10`
- `uv run python -m src.apps.dev_event.seed --file /absolute/path/to/dev-events.json`

## 4. 수행 결과
### Phase 1. 엔트리포인트 분리
- [x] 앱별 CLI 도입 완료
- [x] README 실행 가이드 갱신 완료
- [x] 통합/레거시 실행 스크립트 제거 완료

### Phase 2. 공통 계층 통합
- [x] `settings.py` 단일 설정 정본 도입 완료
- [x] crawler 전용 env 로딩으로 전환 완료
- [x] `SupabaseTableRepository`에 upsert/delete sync 기능 추가 완료
- [x] 앱 코드에서 직접 환경 로딩/직접 DB 초기화 코드 제거 완료

### Phase 3. 도메인/중복 코드 정리
- [x] `src/core/` 제거 완료
- [x] `src/domains/` 제거 완료
- [x] `src/infra/tagger.py` 제거 완료
- [x] JSON 런타임 전용 코드 제거 완료

### Phase 4. 데이터 경로/저장소 표준화
- [x] `dev_event` Supabase sync + stale delete 적용 완료
- [x] `tech_blog` Supabase upsert 적용 완료
- [x] JSON 출력 경로 의존 제거 완료

## 5. 완료 판단
- 독립 CLI 2종 실행 가능
- Supabase 정본 동작만 남김
- 레거시 중복 소스 제거
- 설정/저장소 표준화 적용
- 수동 seed는 외부 경로를 명시적으로 받아 standalone 레포에서도 동작
