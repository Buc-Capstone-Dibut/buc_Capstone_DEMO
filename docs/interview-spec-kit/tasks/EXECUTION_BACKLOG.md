# Execution Backlog

기준일: 2026-02-25

현황 스냅샷:
- 훈련센터 `chat|video` 토글 UI 반영됨
- video 모드 LiveKit 연결 버튼/기본 카메라 렌더 반영됨
- 디벗 면접관 아바타 연출은 미반영

## 1) Backend (FastAPI)
- [ ] `session_type` 기반 오케스트레이션 분기(`live|replay|portfolio`)
- [ ] replay start/chat API 구현
- [ ] portfolio public repo analyzer 구현
- [ ] `portfolio_sources` 저장 로직 구현
- [ ] `interview_eval_signals` 60/10/30 가중치 계산 로직 구현
- [ ] replay comparison report 생성 로직 구현

DoD:
- replay/portfolio 각각 독립 통합테스트 통과
- private repo 요청 시 `PUBLIC_REPO_ONLY` 표준 에러 반환

## 2) Frontend (Next.js)
- [ ] `/interview/training` 홈을 replay 중심 IA로 개편
- [ ] `/interview/training/replay/[sessionId]` 페이지 구현
- [ ] `/interview/training/portfolio` 페이지 구현 (공개 레포 입력)
- [ ] `/interview/training/portfolio/room` 디펜스 면접 화면 구현
- [ ] result 페이지에 “이 순간 다시 체험하기” deep link 추가
- [ ] 화상 화면에 `Dibut Interviewer` 고정 아바타 슬롯 구현
- [ ] SVG 아바타 에셋(`idle|thinking|listening|speaking`) 제작 및 로딩 구현
- [ ] 아바타 상태 배지 UI 구현(`idle|thinking|listening|speaking`)
- [ ] `avatar.state` WS 이벤트 기반 상태 동기화
- [ ] 아바타 패널 최소화/복원 토글 UI 구현
- [ ] 아바타 렌더 실패 fallback(`idle` + 본문 지속) UI 처리
- [ ] 에셋 경로 표준화(`web/public/interview/avatar`)

DoD:
- 기존 인터뷰 UI 톤 유지
- 모바일/데스크탑 반응형
- loading/error/empty 상태 완비
- video 모드에서 아바타 상태 전이 시각 확인 가능
- MVP에서는 viseme 없이 state 기반 애니메이션만 사용

## 3) AI/Interview Logic
- [ ] replay context prompt 템플릿 작성
- [ ] portfolio defense 질문 템플릿(아키텍처/인프라/AI 활용) 작성
- [ ] CI/CD/배포/모니터링/장애대응 심층 질문 체인 구성
- [ ] 답변 비교/개선 판단 로직 작성

DoD:
- 질문 반복률/무의미 질문률 기준 충족
- 근거 문장 포함 리포트 생성률 기준 충족

## 4) Ops/Observability
- [ ] replay/portfolio 세션 트레이싱 키 통합
- [ ] 분석 실패 원인 분류 대시보드 구축
- [ ] 레포 분석 latency, 성공률, 차단률 모니터링

## 5) 구현 순서 (권장)
1. 데이터모델 확장
2. replay API/엔진
3. portfolio analyzer/API
4. 루브릭 평가 엔진
5. training UI 개편
