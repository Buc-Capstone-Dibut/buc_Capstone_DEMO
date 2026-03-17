# Product Behavior

## 1. 진입 플로우
### live_interview
1. 사용자는 로그인 상태에서 면접 setup을 완료한다.
2. 사용자는 5/10/15분 중 하나를 선택하고 영상 면접 room으로 진입한다.
3. room 진입 시 BFF가 세션 생성 API를 호출하고 `sessionId`를 발급받는다.
4. 프론트는 WS에 연결한 뒤 `init-interview-session`을 보내 세션을 시작한다.
5. 서버는 opening question을 Live 세션으로 생성하고 음성과 partial caption을 내보낸다.

### portfolio_defense
1. 사용자는 로그인 상태에서 repo 기반 setup을 완료한다.
2. 사용자는 5/10/15분 중 하나를 선택하고 포트폴리오 디펜스 room으로 진입한다.
3. room 진입 시 BFF가 포트폴리오 세션 생성 API를 호출한다.
4. 이후 진행은 `live_interview`와 같은 Live runtime을 사용하되 질문 정책과 리포트 구조만 다르게 적용한다.

### chat mode
- `/interview/room/chat`은 안내용 stub만 유지한다.
- 네트워크 호출, 세션 생성, transcript 처리, 결과 생성 로직은 포함하지 않는다.
- 사용자는 영상 면접으로 유도된다.

## 2. 면접 진행 규칙
- 세션은 `Gemini Live` 단일 엔진만 사용한다.
- 사용자 발화 1개당 서버는 외부 AI에 1회만 요청한다.
- AI 발화는 항상 음성 + partial 자막으로 나가야 한다.
- 사용자 발화는 partial 자막을 노출하지 않는다.
- AI speaking 동안 mic는 닫혀 있고 사용자의 오디오는 무시한다.
- turn이 완료되면 DB에는 finalized user/ai text만 기록한다.

## 3. 네트워크 끊김/복구
- 끊김 즉시 프론트는 전체 room을 잠그고 “재연결 시도중...” 오버레이를 띄운다.
- 서버는 런타임을 최대 60초 유지한다.
- 대기 중 타이머는 멈춘다.
- 60초 내 reconnect 성공 시 같은 세션으로 복구한다.
- reconnect 시 AI가 이미 말하고 있던 턴은 처음부터 다시 재생한다.
- reconnect 시 사용자가 말하던 중이었다면 해당 답변은 폐기하고, 사용자는 다시 처음부터 답한다.
- 60초가 지나면 세션은 expired 처리하고 사용자는 setup으로 되돌아간다.

## 4. 새로고침
- 새로고침은 reconnect가 아니다.
- active session store, partial caption, transcript cache, analysis cache를 초기화한다.
- 사용자는 이전 sessionId로 복귀하지 않고 setup entry로 돌아간다.

## 5. 종료와 리포트
- closing threshold는 모든 세션 타입에서 60초다.
- 마지막 질문이 끝나고 사용자의 마지막 응답이 처리되면 세션 status를 `completed`로 바꾼다.
- 즉시 report job을 enqueue한다.
- 결과 페이지는 `reportStatus in {pending, running}` 동안 polling과 loading animation을 보여준다.
- report 생성 완료 후 현재 mock 리포트 화면 구성에 맞는 데이터를 렌더링한다.
