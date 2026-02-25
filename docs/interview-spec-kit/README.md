# Interview Spec Kit (Reset)

이 문서는 2026-02-25 기준 실제 코드 상태를 기준으로 재작성한 스펙 킷입니다.
기존 문서는 모두 제거하고, 현재 구현 상태/아키텍처/남은 작업만 남겼습니다.

## 문서 구조

- `status/IMPLEMENTATION_STATUS.md`
  - 어디까지 구현되었는지, 무엇이 동작하는지, 현재 확인된 한계
- `architecture/SYSTEM_ARCHITECTURE.md`
  - 현재 런타임 아키텍처(Next BFF + FastAPI), 데이터 흐름, 음성 경로
- `roadmap/REMAINING_WORK.md`
  - 앞으로 남은 작업 백로그(P0/P1/P2), 완료 기준, 권장 순서
- `roadmap/REPORT_PAGE_PLAN.md`
  - replay 제거 이후 리포트 페이지 구조와 단계별 구현 계획
- `ops/DEPLOYMENT_RUNBOOK.md`
  - Vercel(web), Render(ai/workspace), Supabase 기준의 배포/운영 런북

## 현재 한 줄 요약

- 채팅 면접/포트폴리오 디펜스는 FastAPI 분리와 Next 프록시 연동이 완료됨
- STT/TTS 실파이프라인(WS 기반)은 동작하며 시간 기반 동적 마무리 규칙이 적용됨
- LiveKit 서버 트랙을 FastAPI가 직접 subscribe 하는 브리지는 아직 미구현
