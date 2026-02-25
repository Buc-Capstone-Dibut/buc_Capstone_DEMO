# Quality, Eval, and Governance

## 1) 품질 지표
- Replay Quality
  - replay 시작률
  - replay 완료율
  - 원본 대비 답변 개선률
- Portfolio Defense Quality
  - 공개 레포 분석 성공률
  - 디펜스 세션 완료율
  - 인프라 토픽 커버리지(CI/CD, 배포, 모니터링, 장애대응)
- Runtime Quality
  - LLM latency p95
  - schema parse 실패율
  - STT 누락률

## 2) 평가 엔진 원칙
- 고정 가중치 60/10/30 적용
- 점수보다 근거 문장(evidence)을 우선 저장
- 축별 confidence를 함께 저장

## 3) 공개 레포 정책
- private/권한필요 레포는 즉시 차단
- 사용자에게 `공개 레포만 지원` 에러를 명확히 반환
- 수집 범위는 문서/구조/메타데이터 위주로 제한

## 4) 공정성/안전
- 금지 질문 필터(차별 요소)
- 평가 근거 설명 가능성 보장
- 데이터 삭제/보관 정책 명시

## 5) 운영 규칙
- parse 실패율 임계치 초과 시 fallback 질문 템플릿 강제
- 레포 분석 실패 시 일반 SJT 면접 전환 옵션 제공
- 품질 임계치 미달 프롬프트는 롤백
