# Crawler Migration Map (Final)

## 목적
리팩토링 과정에서 바뀐 경로와 최종 정본 위치를 기록합니다.

## 주요 이관 내역

| 이전 위치 | 최종 위치 | 상태 |
| --- | --- | --- |
| `src/shared/config.py` | `src/common/config/settings.py` | 완료 |
| Tech blog의 Supabase 직접 접근 | `src/apps/tech_blog/repository.py` | 완료 |
| Dev Event JSON 파일 직접 저장 | `src/apps/dev_event/repository.py` | 완료 |
| 개별 파일의 JSON 경로 하드코딩 | `settings.py` 경로 설정 | 완료 |
| 공통 파일 저장 로직 | `src/common/storage/json_repo.py` | 완료 |
| 공통 Supabase 접근 로직 | `src/common/storage/supabase_repo.py` | 완료 |

## 제거 완료 항목
- `src/core/`
- `src/domains/`
- `src/infra/tagger.py`
- `src/main.py`
- `src/cli_jd.py`
- `run_dev_event_test.py`
- `src/shared/config.py`

## 현재 단일 실행 경로
- `python -m src.apps.tech_blog.cli`
- `python -m src.apps.dev_event.cli`
