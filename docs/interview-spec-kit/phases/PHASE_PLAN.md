# Phase Plan

## Phase 0. FastAPI Split Stabilization
목표: 기존 분리 아키텍처 안정화
- interview REST + session 저장 안정화
- admin 조회/장애 처리 표준화

## Phase 1. Replay Simulation Core
목표: 리포트 순간 재체험 엔진 구축
- origin session/turn 복원
- 동일 맥락 재질문 + 비교 리포트 생성
- 리포트 -> replay 진입 UX 확정

종료조건:
- 리포트에서 replay 시작 성공률
- replay 세션 완료율

## Phase 2. Portfolio Defense Core (Public Repo)
목표: 공개 레포 기반 디펜스 면접 구축
- README/트리/핵심 인프라 파일 분석
- 아키텍처/인프라/AI 활용 질문 생성
- 공개 레포만 허용 정책 적용

종료조건:
- private repo 차단 정확성
- 디펜스 리포트 생성 성공률

## Phase 3. Voice/Video Replay Beta
목표: 리플레이 경험을 음성/영상으로 확장
- LiveKit 기반 replay context 로드
- 음성 리플레이 + 재답변 캡처
- voice fallback 정책 반영
- 디벗 면접관 아바타 패널/상태 연출 반영 (`idle|thinking|listening|speaking`)
- 아바타 상태 이벤트(`avatar.state`)와 UI 동기화
- 아바타 렌더 실패 시 인터뷰 본문은 계속 진행하는 graceful degradation 검증
- 아바타 패널 최소화/복원 토글 반영
- 립싱크는 viseme 없이 state 애니메이션으로 운영

종료조건:
- 화상 모드에서 아바타 상태 전이 정확도(세션 샘플 기준)
- 아바타 렌더 실패 시 세션 중단률 0에 수렴

## Phase 4. Governance and Hiring-grade Eval
목표: 운영 가능한 평가 신뢰도 확보
- 60/10/30 루브릭 일관성 검증
- 편향/금지질문 필터 검증
- trace 기반 품질 게이트 도입
