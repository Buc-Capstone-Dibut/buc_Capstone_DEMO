# Interview Spec Kit (Replay Simulation + Portfolio Defense)

기준일: 2026-02-25

## 1) 목적
- `모의면접 -> 리포트` 이후 학습이 끊기는 구조를, **리포트 순간 재체험형 훈련 센터**로 재설계한다.
- 훈련센터는 과제 부여형이 아니라, 실제 면접 흐름을 다시 살아보는 시뮬레이션 공간으로 정의한다.
- 추가로, **공개 Git 레포 기반 아키텍처 디펜스 면접**을 핵심 트랙으로 포함한다.

## 2) 문서 인덱스
- [Product Scope](./foundation/PRODUCT_SCOPE.md)
- [Evaluation Rubric](./foundation/EVALUATION_RUBRIC.md)
- [Target Architecture](./architecture/TARGET_ARCHITECTURE.md)
- [Data Model and Events](./architecture/DATA_MODEL_AND_EVENTS.md)
- [REST/WS Contracts](./api/CONTRACTS.md)
- [Phase Plan](./phases/PHASE_PLAN.md)
- [Execution Backlog](./tasks/EXECUTION_BACKLOG.md)
- [Pages and UX Spec](./ui/PAGES_AND_UX_SPEC.md)
- [Quality, Eval, Governance](./ops/QUALITY_EVAL_AND_GOVERNANCE.md)
- [Wingterview Gap Analysis](./references/WINGTERVIEW_GAP_ANALYSIS.md)
- [Industry Signals 2026](./references/INDUSTRY_SIGNALS_2026.md)

## 3) 핵심 방향
- 훈련센터의 본질: `리포트에서 특정 순간 선택 -> 동일 맥락 재면접 -> 답변 개선 체감`
- 트랙 2개:
  - `Replay Simulation Track`: 기존 세션 순간 재체험
  - `Portfolio Defense Track`: 공개 Git 레포 기반 설계/인프라 토론
- 평가 가중치 고정:
  - 설계 의도 설명 능력 60%
  - 코드 품질 10%
  - AI 활용 능력 30%

## 4) 구현 원칙
- BFF 원칙 유지: 브라우저 -> `web/api/*` -> `ai-interview/*`
- 공개 레포만 허용: private repo/token 입력은 MVP에서 지원하지 않음
- 리포트 근거 재현성 확보: 질문/답변/오디오/비디오/evidence를 함께 저장
- UI 톤 유지: 기존 `web/app/interview` 컴포넌트 체계 준수

## 5) 최신 반영 사항 (2026-02-25)
- 훈련센터 video 모드에 LiveKit 연결 UI를 선반영했다.
- 아직 디벗 면접관 아바타 연출은 구현되지 않았다.
- 본 스펙킷에 아바타 연출 스펙을 추가했다.
- 아바타 포맷은 `SVG`로 확정했다.
- 상태셋은 `idle|thinking|listening|speaking` 4개로 확정했다.
- MVP 립싱크는 viseme 없이 state 기반 애니메이션으로 확정했다.
- 레이아웃은 좌측 아바타 고정 기본 + 최소화 토글 허용으로 확정했다.
- SVG 에셋 경로는 `web/public/interview/avatar`로 확정했다.
- UI 스펙: `ui/PAGES_AND_UX_SPEC.md` 6장
- 아키텍처/이벤트: `architecture/TARGET_ARCHITECTURE.md`, `architecture/DATA_MODEL_AND_EVENTS.md`
- API 계약: `api/CONTRACTS.md`
- 실행 백로그/단계: `tasks/EXECUTION_BACKLOG.md`, `phases/PHASE_PLAN.md`
