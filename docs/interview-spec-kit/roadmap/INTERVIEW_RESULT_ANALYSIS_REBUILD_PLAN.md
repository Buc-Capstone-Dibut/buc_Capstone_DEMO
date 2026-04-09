# Interview Result Analysis Rebuild Plan

기준 시점: 2026-04-09

## 목적

- 현재 `보기 좋은 결과 페이지`를 `근거가 선명한 면접 분석 리포트`로 단계적으로 개선
- 한 번에 갈아엎지 않고, 회귀를 줄이면서 `데이터 계약 -> 분석 정밀도 -> UI 정리` 순서로 진행
- 각 단계별 완료 여부를 체크리스트로 관리

## 현재 판단

- 현재 결과 페이지는 정상 동작함
- 현재 결과 페이지는 `실제 분석 + 프론트 후처리 + 일반 코칭 문구`가 섞여 있음
- 질문별 정밀 분석, 근거 추적, 신뢰도 표시는 아직 부족함
- 전체 개편은 가능하지만, 백엔드/프론트/리포트 스키마를 함께 손대야 하므로 반드시 단계적으로 진행해야 함

## 운영 원칙

- 각 단계는 독립적으로 배포 가능해야 함
- 각 단계는 기존 사용자 플로우를 깨지 않아야 함
- `fallback 리포트`와 `정식 분석 리포트`는 혼동되지 않게 유지해야 함
- 프론트 heuristic은 줄이고, 백엔드가 확정값을 내려주는 구조로 이동해야 함
- 실제 분석 근거와 AI 코칭 문구는 최종적으로 분리해야 함

## 진행 현황

### Phase 0. 기반 정리

- [x] 메인 면접 결과 페이지와 포트폴리오 디펜스 결과 페이지의 공통 리포트 프레임 통합
- [x] 공통 `ReportScreen` 성격의 화면 구조 도입
- [x] 공통 insight list card 추출
- [x] 결과/디펜스 페이지 lint 및 인터뷰 리포트 관련 테스트 통과

완료 기준:

- 메인 결과 페이지와 디펜스 결과 페이지가 같은 외곽 정보 구조를 사용
- 이후 분석 개편 시 공통 프레임에서 단계별 변경이 가능

---

### Phase 1. 리포트 계약 보강

목표:

- 기존 UI를 최대한 유지한 채, 결과 페이지가 의존하는 데이터 계약을 더 견고하게 만듦

체크리스트:

- [x] `result` 페이지가 `analysis`가 약해도 `report_view`와 `timeline`만으로 최소 렌더 가능하도록 수정
- [x] `session_type` 기준으로 결과 페이지 분기하도록 정리
- [x] 결과 페이지 타입에 `report_generation_meta`, `schema_version`, `session_type`을 명시적으로 포함
- [x] fallback 리포트 여부를 프론트에서 식별할 수 있는 필드 추가
- [ ] `report_view`를 지금보다 더 완전한 1급 표시 모델로 확장할지 여부 결정

주요 대상 파일:

- `ai-interview/app/interview/reporting/document.py`
- `ai-interview/app/services/interview_service.py`
- `web/app/interview/result/page.tsx`
- `web/lib/interview/report/session-analysis-guard.ts`
- `web/lib/interview/interview-session-flow.ts`

완료 기준:

- `compatAnalysis` shape가 일부 비어 있어도 결과 페이지가 완전히 무너지지 않음
- 프론트가 canonical report metadata를 받아서 상태를 구분할 수 있음

진행 메모 (2026-04-09):

- `result` 페이지가 `summary-only report`를 렌더할 수 있도록 수정
- `report_generation_meta.analysisMode`와 `fallbackReason` 계약 추가
- `session_type` 또는 `report_view.sessionType` 기준으로 포트폴리오 결과 페이지 분기 가능하도록 수정
- targeted lint / frontend interview tests / backend report document tests 통과

---

### Phase 2. 질문별 분석 데이터 도입

목표:

- 현재의 요약형 분석을 넘어서, 질문/답변 단위로 근거가 있는 분석 데이터를 생성

체크리스트:

- [ ] `AnalysisReport` 스키마 확장 초안 정의
- [ ] `questionFindings` 구조 추가
- [ ] 각 질문별 `question`, `answer`, `strengths`, `weaknesses`, `improvedAnswer`, `followUp`, `evidence` 필드 정의
- [ ] `JD/직무 요구사항 커버리지` 구조 추가
- [ ] `confidence` 또는 `analysisQuality` 같은 신뢰도 필드 추가
- [ ] Gemini 분석 프롬프트를 질문별 분석 중심으로 재설계
- [ ] report document에 확장 분석 결과를 저장
- [ ] 테스트 fixture와 validator 갱신

주요 대상 파일:

- `ai-interview/app/schemas/interview.py`
- `ai-interview/app/services/llm_gemini.py`
- `ai-interview/app/interview/reporting/document.py`
- `ai-interview/app/services/interview_service.py`
- `ai-interview/tests/test_report_agent.py`

완료 기준:

- 결과 페이지가 질문별 분석 데이터를 실제 면접 기록 기준으로 받을 수 있음
- `핵심 질문` 섹션이 더 이상 프론트 합성 데이터에 의존하지 않아도 됨

---

### Phase 3. 프론트 heuristic 제거

목표:

- 결과 해석의 중심을 프론트 계산이 아니라 백엔드 확정값으로 옮김

체크리스트:

- [ ] 디벗 4축 점수 계산을 백엔드 report document로 이동
- [ ] 디벗 유형(typeName/typeLabels) 계산을 백엔드에서 확정
- [ ] axis evidence도 백엔드가 내려주도록 정리
- [ ] `session-interview-report-adapter`의 heuristic 축 계산 제거
- [ ] `session-interview-detail-adapter`의 supplemental 질문/답변 합성 로직 축소 또는 제거
- [ ] 프론트 adapter는 표시 전용 매핑 레이어로 축소

주요 대상 파일:

- `ai-interview/app/interview/reporting/document.py`
- `web/lib/interview/report/session-interview-report-adapter.ts`
- `web/lib/interview/report/session-interview-detail-adapter.ts`
- `web/lib/interview/report/dibeot-axis.ts`

완료 기준:

- 결과 페이지의 핵심 해석이 프론트 추론이 아니라 저장된 report document 기준으로 이루어짐
- 직무명 regex 같은 임시 규칙 의존도가 크게 줄어듦

---

### Phase 4. 실제 분석과 AI 코칭 분리

목표:

- 사용자가 `실제 면접 기반 분석`과 `AI가 보강한 훈련 가이드`를 구분해서 읽을 수 있게 함

체크리스트:

- [ ] 결과 페이지 섹션을 `실제 분석`과 `성장 가이드`로 명시적으로 분리
- [ ] 질문별 카드에 `근거 기반 분석` 표시 추가
- [ ] AI가 생성한 보완 답변/예상 꼬리 질문에는 코칭 배지 또는 구분 라벨 추가
- [ ] timeline insight와 question finding의 연결 방식을 실제 question id 기반으로 정리
- [ ] fallback 리포트에는 별도 상태 배지 추가

주요 대상 파일:

- `web/app/interview/result/page.tsx`
- `web/components/features/interview/report/*`
- `web/lib/interview/report/session-interview-detail-adapter.ts`

완료 기준:

- 사용자가 “이건 실제 분석”, “이건 AI 코칭”을 혼동하지 않음
- 타임라인과 질문별 피드백의 연결이 index 기반 임시 매칭에서 벗어남

---

### Phase 5. 신뢰도/품질 표시 강화

목표:

- 결과를 보여주는 것에서 끝나지 않고, 분석의 신뢰성과 생성 상태까지 설명

체크리스트:

- [ ] `report_generation_meta` 일부를 결과 페이지에서 노출
- [ ] 분석 생성 시각, 사용된 턴 수, 질문 수 표시 여부 결정
- [ ] `confidence` 또는 `분석 신뢰도` UI 추가
- [ ] `fallback/basic report` 상태를 사용자에게 명확히 표시
- [ ] 실패/부분 실패/재생성 상태 문구 정리

주요 대상 파일:

- `ai-interview/app/interview/reporting/document.py`
- `ai-interview/app/services/interview_service.py`
- `web/app/interview/result/page.tsx`

완료 기준:

- 사용자가 결과를 볼 때 “이 분석이 어떤 상태에서 생성된 것인지” 이해할 수 있음
- 기본 리포트와 정식 리포트를 구분할 수 있음

---

### Phase 6. 히스토리/트렌드 확장

목표:

- 단일 세션 결과를 넘어, 누적 훈련 관점으로 확장

체크리스트:

- [ ] 세션 간 성장 추세 정의
- [ ] 최근 n회 기준 축 변화/질문 대응력 변화 설계
- [ ] `/interview/analysis`를 목데이터 기반 페이지에서 실세션 기반 허브로 전환할지 결정
- [ ] 추천 훈련 액션을 최근 약점과 연동하는 구조 설계

주요 대상 파일:

- `web/app/interview/analysis/page.tsx`
- `web/app/api/interview/sessions/route.ts`
- `ai-interview/app/services/interview_service.py`

완료 기준:

- 분석 허브가 실제 세션 데이터를 기준으로 동작
- 단발성 결과가 아니라 성장 흐름을 보여줄 수 있음

## 권장 실행 순서

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

## 지금 당장 시작할 단계

- 권장 시작점: `Phase 1. 리포트 계약 보강`

이유:

- 지금 가장 적은 리스크로 결과 페이지 안정성을 올릴 수 있음
- 이후 질문별 분석 확장 시 프론트가 덜 깨짐
- canonical report document를 더 제대로 활용하는 방향이라 다음 단계와도 잘 연결됨

## 메모

- 이 문서는 진행하면서 체크박스를 갱신한다
- 각 Phase 완료 시 테스트/검증 결과를 같은 문서에 짧게 추가한다
- 대규모 구조 변경 전에는 해당 Phase만 따로 브랜치/커밋 단위로 끊는 것이 좋다
