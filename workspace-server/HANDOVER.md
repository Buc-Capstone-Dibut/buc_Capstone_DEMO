# Workspace Server 코드 인수인계

> 코드 점검 기준: `feature/workspace` (2026-07-30)
>
> 이 문서는 현재 구현을 설명한다. 제품·운영의 상위 기준은 [`docs/PROJECT_REFERENCE.md`](../docs/PROJECT_REFERENCE.md)다.

## 1. 한 줄 요약

`workspace-server`는 포트 4000에서 Socket.IO와 raw WebSocket을 동시에 제공하는 단일 Node.js 프로세스다. 채팅은 Prisma로 DB에 직접 저장하고, 화이트보드 Yjs 상태는 Next.js BFF 내부 API를 통해 저장한다.

이 서버는 다음을 소유하지 않는다.

- 워크스페이스 CRUD·멤버 초대·칸반·일정·문서 메타데이터 API
- Supabase 로그인 세션
- LiveKit 음성 미디어
- Prisma 마이그레이션의 기준 스키마

## 2. 프로세스 시작과 라우팅

진입점은 `src/index.ts`다.

1. `config/env.ts`가 환경변수를 읽는다.
2. Node HTTP server를 만든다.
3. 같은 HTTP server에 Socket.IO를 연결한다.
4. `upgrade` 이벤트에서 `/socket.io`는 Socket.IO에 남기고 나머지는 Yjs WebSocketServer가 처리한다.
5. HTTP server가 `PORT`에서 listen한다.

HTTP 요청은 `/healthz`와 루트 상태를 처리한다. 알 수 없는 경로는 404다. `/healthz`는 프로세스 liveness이며 DB·BFF readiness를 보장하지 않는다.

Socket.IO와 raw Yjs WebSocket은 `ALLOWED_ORIGINS` allowlist를 적용한다.

## 3. 환경변수 로딩

`src/config/env.ts`는 이미 주입된 `process.env`를 우선하고 다음 파일을 순서대로 읽는다.

1. `workspace-server/.env`
2. `workspace-server/.env.local`
3. `web/.env.local`
4. `web/.env`

파일 파서는 단순 `KEY=VALUE` 형식만 지원한다. 컨테이너·배포 환경에서는 플랫폼이 주입한 환경변수가 우선한다.

| 키 | 사용처 | 누락 시 현재 동작 |
| --- | --- | --- |
| `DATABASE_URL` | ChatService Prisma | 시작 경고 후 실제 쿼리에서 실패 가능 |
| `BFF_URL` | Yjs 상태 API | `http://localhost:3000` 사용 |
| `INTERNAL_API_SECRET` | BFF 내부 상태 API | Yjs 상태 로드·저장 실패 |
| `WHITEBOARD_TOKEN_SECRET` | 화이트보드 HMAC token | 기존 `COLLAB_TOKEN_SECRET`, 내부 secret 순으로 호환 |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Socket.IO 사용자 검증 | 신규 Socket.IO 연결 거부 |
| `ALLOWED_ORIGINS` | 웹 Origin allowlist | localhost와 BFF Origin만 허용 |
| `PORT` | HTTP/WS listen | 4000 |

## 4. Socket.IO 실행 경로

### 연결과 워크스페이스 방

`src/modules/socket/socket.gateway.ts`의 middleware는 handshake의 Supabase access token을 Auth `/user` API로 검증하고, DB의 `workspace_members`와 lifecycle을 확인한다.

- 검증한 `userId`, `workspaceId`, `role`을 `socket.data.identity`에 저장
- 완료된 워크스페이스·비회원·유효하지 않은 token은 연결 전 거부
- 연결 정보는 `Map<socketId, ConnectedUser>`에 저장
- 마지막 탭이 퇴장할 때 `presence:update` offline 방송
- `voice:update` room은 인증된 workspace에서만 결정

클라이언트는 Socket.IO auth callback에서 재연결마다 현재 Supabase session token을 전달한다. 연결 Map은 여전히 단일 프로세스 로컬이다.

### 채팅

`src/modules/chat/chat.gateway.ts`가 이벤트를 받고 `ChatService`를 호출한다.

| 이벤트 | 서비스 동작 |
| --- | --- |
| `chat:get_channels` | 워크스페이스 채널 조회. 채널이 없고 쓰기 가능하면 `general` 생성 |
| `chat:create_channel` | 중복 이름 확인 후 PUBLIC 채널 생성 |
| `chat:delete_channel` | `general` 차단, owner/admin 역할 확인 후 삭제 |
| `chat:get_messages` | 채널 전체 메시지를 시간순 조회 |
| `chat:message` | 메시지 저장 후 room 방송, 멘션 알림 비동기 생성 |
| `chat:update_message` | 작성자 ID 일치와 TEXT 타입 확인 후 수정 |
| `chat:delete_message` | 작성자 ID 일치와 SYSTEM 타입 여부 확인 후 삭제 |
| `chat:typing` | DB 저장 없이 room 릴레이 |

주의할 점:

- gateway는 payload의 `senderId`/`requesterId`를 사용하지 않고 인증된 socket 사용자로 덮어쓴다.
- 채널 조회·입장·메시지 조회는 인증된 워크스페이스와 채널 소속을 확인한다.
- `isWorkspaceReadOnly()`의 raw SQL 실패는 쓰기를 차단한다.
- 메시지 조회는 pagination이 없고 전체 기록을 반환한다.
- 멘션 알림은 대기열 없이 fire-and-forget Promise로 생성한다.
- 입력 schema, 최대 길이, 업로드 크기, 이벤트 rate limit가 없다.

### 레거시 Socket.IO 보드

`src/modules/board/board.gateway.ts`의 `board:join`, `board:update`는 요소 배열을 room에 릴레이할 뿐 저장하지 않는다. 현재 웹의 아이디어 보드는 이 이벤트가 아니라 Yjs `whiteboard:<workspaceId>` 방을 사용한다.

`src/modules/auth/auth.service.ts`는 Supabase 사용자와 DB 멤버십을 검증한다. `src/modules/chat/chat.types.ts`는 현재 gateway에서 사용하지 않는다.

## 5. Yjs 실행 경로

### WebSocket upgrade

`src/modules/board/yjs.gateway.ts`가 `/socket.io` 외 WebSocket upgrade를 받는다.

- `whiteboard:*`: `token` query parameter 필수
- 토큰 서명: `WHITEBOARD_TOKEN_SECRET` 기반 HMAC SHA-256
- 토큰 payload: `whiteboardId`, `workspaceId`, `userId`, `exp`
- 서버 검증: 서명·만료·방 target 일치
- WebSocket Origin allowlist, 8MB payload 상한, 30초 heartbeat 적용

BFF 토큰 발급 API가 로그인, 멤버십과 워크스페이스 쓰기 가능 상태를 확인한다. 토큰 유효기간은 5분이지만 연결 후 권한 변경이나 멤버 탈퇴를 다시 확인하지 않는다.

### 메모리 문서

`src/modules/board/yjs-utils.ts`의 전역 Map이 방별 `WSSharedDoc`을 보관한다.

```text
docs: Map<roomName, WSSharedDoc>
docLoadPromises: Map<roomName, Promise<WSSharedDoc>>
WSSharedDoc
├── Y.Doc
├── awareness
├── conns: Map<WebSocket, Set<clientId>>
├── 3초 debounce save timer
└── 30초 periodic save timer
```

같은 프로세스에서 최초 로드가 중복되지 않도록 `docLoadPromises`를 사용한다. 프로세스 사이에는 문서·방 상태를 공유하지 않는다.

### 상태 저장

| 대상 | GET/PUT BFF 경로 | DB 모델 |
| --- | --- | --- |
| `whiteboard:<uuid>` | `/api/workspaces/:id/whiteboard` | `workspace_whiteboards` |

모든 호출은 `x-internal-secret`을 사용한다. 저장 시 `Y.encodeStateAsUpdate(doc)` 전체 결과를 `application/octet-stream` 원시 바이트로 전송하고, DB의 `bytea` 컬럼에 저장한다. Vercel Function의 4.5MB payload 제한을 고려해 BFF 저장 안전 한도는 4MiB다.

저장 시점:

- 마지막 변경 후 3초
- 연결자가 있는 동안 30초마다
- 마지막 WebSocket 연결 종료

## 6. 웹 클라이언트 연결

| 파일 | 역할 |
| --- | --- |
| `web/app/workspace/[id]/page.tsx` | 로그인 사용자와 활성 워크스페이스를 Socket.IO store에 연결 |
| `web/components/features/workspace/store/socket-store.ts` | Socket.IO 연결·채널·메시지 Zustand 상태 |
| `web/components/features/workspace/detail/chat/team-chat.tsx` | 채팅 UI와 멘션/태스크/문서 토큰 직렬화 |
| `web/components/features/workspace/docs/normal-editor.tsx` | BlockNote 일반 문서 편집기 |
| `web/components/features/workspace/detail/docs-view.tsx` | 문서 탐색·편집·저장 |
| `web/components/features/workspace/detail/idea-board/idea-board-sdk.tsx` | Excalidraw + Yjs 화이트보드 |
| `web/components/features/workspace/voice/voice-manager.tsx` | LiveKit 연결 및 `voice:update` 발생 |

환경변수 사용이 나뉘어 있다.

- Socket.IO와 문서: `NEXT_PUBLIC_WS_URL`
- 화이트보드: `NEXT_PUBLIC_SOCKET_URL`

두 값은 현재 같은 workspace-server 주소를 가리켜야 한다.

## 7. DB 스키마

`web/prisma/schema.prisma` 상단이 워크스페이스 기준 스키마임을 명시한다. `workspace-server/prisma/schema.prisma`는 follower다.

workspace-server의 follower에는 채팅에 필요한 모델은 있지만 다음 최신 모델·필드가 포함되지 않았다.

- `workspaces.lifecycle_status`, `space_status`, 결과 필드
- `workspace_whiteboards`
- 문서 자산·댓글·템플릿·태스크 링크

이 때문에 채팅 수명주기 확인은 raw SQL을 사용하고 Yjs 저장은 BFF에 위임한다. DB 변경 순서는 다음과 같다.

1. `web/prisma/schema.prisma` 수정
2. `web/prisma/migrations/**` 마이그레이션 작성·검증
3. workspace-server가 직접 사용하는 모델·필드를 follower에 반영
4. 양쪽 Prisma Client 생성·타입 검사
5. BFF와 workspace-server 통합 검증

## 8. 장애와 종료 동작

SIGTERM/SIGINT에서 신규 Yjs 변경을 차단하고 활성 room을 flush한 뒤 Socket.IO와 WebSocket을 닫는다. Render의 30초 종료 유예 안에서 완료하도록 내부 강제 종료는 25초다.

Socket.IO 클라이언트는 WebSocket transport로 최대 10회 재연결하고, 재연결마다 Supabase token을 새로 가져온다. 연결 중에는 웹 기능을 차단하지 않고 작은 cold-start 상태를 표시한다.

Yjs awareness의 연결별 controlled client ID Set을 채우는 코드가 없어 WebSocket close 시 awareness 상태가 즉시 제거되지 않을 수 있다.

## 9. 변경 체크리스트

### 인증·권한 변경

- Socket.IO handshake에서 사용자 신원을 확정했는가
- payload 사용자 ID 대신 인증된 socket 사용자 ID를 사용하는가
- 워크스페이스·채널·문서 멤버십을 서버에서 검사하는가
- 문서와 화이트보드가 동일한 권한 정책을 사용하는가
- 완료된 워크스페이스의 연결과 저장을 모두 차단하는가

### Yjs 변경

- 최초 상태 로드 실패 시 빈 상태로 덮어쓰지 않는가
- 저장 실패를 호출자와 관측 계층에 전달하는가
- 마지막 연결 종료와 프로세스 종료에서 저장 완료를 기다리는가
- 큰 문서에서 전체 스냅샷 크기와 저장 빈도를 확인했는가
- awareness 퇴장 상태가 즉시 제거되는가

### 채팅 변경

- 채널 접근과 메시지 작성자를 인증된 사용자에 묶었는가
- 메시지 pagination과 정렬 cursor가 있는가
- 메시지·이미지 payload 제한이 있는가
- 멘션 대상이 실제 워크스페이스 멤버인지 확인하는가
- 채널 삭제·메시지 수정/삭제 권한 테스트가 있는가

### 스키마 변경

- `web/prisma/schema.prisma`를 먼저 수정했는가
- follower 스키마가 필요한 범위에서 동기화됐는가
- `workspace-server`에서 별도 마이그레이션을 만들지 않았는가
- BFF 내부 API 요청·응답 계약을 함께 갱신했는가

## 10. 최소 수동 회귀

현재 workspace-server에는 `typecheck`, `build`, dependency audit가 있다. WebSocket 통합 테스트는 아직 없으므로 변경 후 최소한 다음을 두 브라우저 세션으로 확인한다.

1. 워크스페이스 입장과 완료 상태 연결 차단
2. 채널 자동 생성, 채널 생성·삭제
3. 메시지 작성·수정·삭제와 멘션 알림
4. 문서 일반 편집 저장과 새로고침 복원
5. 문서 공동편집 동시 입력과 참가자 표시
6. 공동편집 마지막 퇴장 후 다시 입장했을 때 상태 복원
7. 화이트보드 동시 편집과 재접속 복원
8. 음성방 입장·퇴장 후 참가자 목록 갱신

새 기능을 추가할 때는 가능하면 해당 경로의 인증·서비스 단위 테스트와 WebSocket 통합 테스트를 함께 추가한다.
