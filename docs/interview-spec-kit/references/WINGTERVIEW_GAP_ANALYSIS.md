# Wingterview Reference Gap Analysis

레퍼런스: [100-hours-a-week/10-wingterview-ai](https://github.com/100-hours-a-week/10-wingterview-ai)

## 1) 참고 가치가 높은 지점
- 질문 생성/퀴즈/STT를 모듈로 분리한 서비스 경계
- retriever 계층 분리로 RAG 교체 용이
- STT 파이프라인의 단계 분리
- 관측성(Langfuse/Langsmith) 포인트 설계

## 2) 우리 재설계에서 채택할 요소
- replay/portfolio도 단계형 파이프라인으로 분리
- 원본 근거 저장 중심 데이터모델
- 에러 시 fallback 경로 명확화

## 3) 우리 재설계에서 비채택 요소
- 과제/퀴즈 중심 UX
- 모델 서빙 형태(vLLM 중심) 고정
- 다중 main 앱 분리 실행 패턴

## 4) 재설계 관점의 결론
- Wingterview는 “기능 분해 방식”은 유효
- 우리 훈련센터는 “과제 생성”보다 “리포트 순간 재체험”이 핵심이므로 UX/데이터축을 다르게 가져가야 함
