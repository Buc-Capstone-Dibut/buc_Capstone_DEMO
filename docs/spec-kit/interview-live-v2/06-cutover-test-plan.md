# Cutover and Test Plan

## 구현 순서
1. spec kit 문서 확정
2. Supabase migration 적용
3. backend domain/runtime/transcript/reporting 계층 추가
4. 기존 WS route를 thin adapter로 전환
5. frontend room/result를 새 계약으로 전환
6. chat mode 로직 제거 및 UI stub화
7. portfolio room을 Live 기반으로 전환
8. legacy fallback 코드 제거

## 백엔드 테스트
- owner 없는 session start 거부
- owner 아닌 session detail 조회 거부
- opening turn에서 외부 호출 1회만 발생
- user turn에서 extra STT/TTS/legacy 호출이 발생하지 않음
- AI partial caption만 전송됨
- reconnect 중 timer pause 메타가 반영됨
- reconnect 성공 시 speaking turn replay
- reconnect timeout 시 expired 처리
- 종료 후 report job enqueue
- report payload가 `schemaVersion=v2` hybrid 구조를 만족

## 프런트 테스트
- room 진입 시 session start -> WS init 순서 보장
- chat page는 네트워크 호출 없이 안내만 렌더
- AI partial caption 표시, user partial caption 미표시
- AI speaking 중 mic 재오픈 금지
- reconnect overlay 표시 및 타이머 정지
- refresh 시 store reset 후 setup redirect
- 결과 페이지가 `/api/interview/analyze` 없이 session detail polling으로만 동작
- live_interview/portfolio report 화면이 기존 mock 컴포넌트 구조로 렌더

## QA 시나리오
- 5/10/15분 코스별 마지막 질문 시작 시점 확인
- 네트워크를 30초 끊었다가 복구
- 네트워크를 61초 끊어 세션 만료
- 포트폴리오 디펜스 시작, 종료, report polling
- 미로그인 사용자의 면접 진입 차단

## 완료 기준
- 제품 경로에서 fallback/legacy/extra STT/TTS가 더 이상 호출되지 않는다.
- 결과 페이지는 DB report만으로 렌더된다.
- chat mode는 비활성화되어도 UI entry는 유지된다.
- Supabase schema와 backend write path가 일치한다.
