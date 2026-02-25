# Report Page Plan (No Replay)

기준 시점: 2026-02-25

## 1) 목표

- `면접 재체험(replay)` 없이도 리포트 해석 -> 다음 훈련 실행까지 한 흐름으로 연결
- 메인 모의면접 리포트와 포트폴리오 디펜스 리포트의 정보 구조를 분리
- 훈련센터는 `포트폴리오 디펜스(음성/화상)`만 연결

## 2) 페이지 구조

### A. 메인 면접 리포트

- 경로: `/interview/result?id={sessionId}`
- 대상: `session_type=live_interview`
- 핵심 블록:
  - 종합 점수/합격 확률
  - 역량 방사형 지표
  - 타임라인
  - 강점/개선점/Best Practice
- CTA:
  - `훈련 센터로 이동` (포트폴리오 디펜스 시작점)

### B. 포트폴리오 디펜스 리포트 (신규)

- 경로(제안): `/interview/training/portfolio/report?id={sessionId}`
- 대상: `session_type=portfolio_defense`
- 핵심 블록:
  - 60/10/30 가중 총점
  - 축별 근거(evidence) + confidence
  - 토픽 커버리지(architecture/cicd/deployment/...)
  - 다음 면접 액션 3개
- CTA:
  - `같은 레포로 다시 디펜스`
  - `다른 레포로 새 디펜스`

## 3) 데이터 매핑

- 공통 데이터: `interview_reports.report_payload`
- 디펜스 확장 데이터:
  - `interview_reports.comparison_payload`
  - `portfolio_sources.*`
- 세션 식별:
  - `interview_sessions.session_type`
  - `interview_sessions.mode` (`voice|video`)

## 4) 구현 Phase

### Phase 1 (빠른 정리)

- 기존 `/interview/result`에서 replay 관련 UI 완전 제거
- 결과 화면 CTA를 `훈련센터(포트폴리오 디펜스)` 중심으로 단일화

### Phase 2 (리포트 분리)

- `/interview/training/portfolio/report` 신규 생성
- `session_type`에 따라 리포트 레이아웃 분기
- 디펜스용 축/근거/액션 UI 적용

### Phase 3 (운영 고도화)

- 리포트 PDF 내보내기 템플릿 분리 (live vs portfolio)
- 세션 비교(최근 3회) 미니 트렌드 추가
- 리포트 -> 바로 재면접 버튼의 컨텍스트 자동 주입(repoUrl/mode/duration)

## 5) 수용 기준

- replay 관련 경로/버튼/카피가 사용자 화면에서 0개
- 훈련센터 진입 후 선택지는 `포트폴리오 디펜스(음성/화상)`만 노출
- 리포트에서 다음 행동 CTA가 훈련센터로만 연결
