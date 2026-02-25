# Crawler Refactoring Plan (Completed)

## 1. 목표
- 통합 진입점 중심 구조를 제거하고, 크롤러별 독립 실행 구조로 전환한다.
- 중복 계층(`core`, `domains`, `infra`)을 제거하고 단일 정본 구조로 단순화한다.
- 환경 변수 로딩/출력 경로/저장소 접근을 표준화한다.

## 2. 최종 구조
```text
src
├── common
│   ├── config
│   │   └── settings.py
│   └── storage
│       ├── json_repo.py
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

## 4. 수행 결과
### Phase 1. 엔트리포인트 분리
- [x] 앱별 CLI 도입 완료
- [x] README 실행 가이드 갱신 완료
- [x] 통합/레거시 실행 스크립트 제거 완료

### Phase 2. 공통 계층 통합
- [x] `settings.py` 단일 설정 정본 도입 완료
- [x] `JsonFileRepository`, `SupabaseTableRepository` 도입 완료
- [x] 앱 코드에서 직접 환경 로딩/직접 DB 초기화 코드 제거 완료

### Phase 3. 도메인/중복 코드 정리
- [x] `src/core/` 제거 완료
- [x] `src/domains/` 제거 완료
- [x] `src/infra/tagger.py` 제거 완료

### Phase 4. 데이터 경로/저장소 표준화
- [x] JSON 출력 경로 하드코딩 제거 완료
- [x] Supabase/JSON 저장을 앱별 repository 레이어로 분리 완료

## 5. 완료 판단
- 독립 CLI 2종 실행 가능
- 레거시 중복 소스 제거
- 설정/저장소 표준화 적용
