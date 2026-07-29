# Debut Spec 기반 개발 규칙

`specs/`는 아직 구현되지 않았거나 구현 중인 기능의 제품·UX·기술 계약을 관리한다.

- `specs/**`: 의도한 동작, 요구사항, 구현 계획, 작업, 검증
- `docs/PROJECT_REFERENCE.md`: 현재 병합돼 실제로 동작하는 제품·운영 기준
- 서비스별 `README.md`: 실행 방법, 환경변수, 런타임 경계
- 코드와 테스트: 실행 가능한 최종 계약

Spec을 서비스 디렉토리 하나에 넣지 않는다. 하나의 기능이 `web`, BFF, Prisma, `workspace-server`처럼 여러 영역을 가로지를 수 있기 때문이다.

## 디렉토리

```text
specs/
├── README.md
└── workspace/
    └── 001-feature-name/
        ├── spec.md
        ├── ux.md
        ├── plan.md
        ├── data-model.md
        ├── tasks.md
        ├── verification.md
        ├── contracts/
        │   ├── rest-api.md
        │   ├── socket-events.md
        │   └── yjs-rooms.md
        └── assets/
            └── wireframes/
```

폴더 번호는 도메인 안에서 증가시키고 이름은 브랜치 범위와 대응시킨다.

```text
specs/workspace/001-foundation
branch: feature/workspace-foundation
```

## 공통 메타데이터

각 `spec.md` 상단에 다음 메타데이터를 둔다.

```yaml
---
id: WS-001
title: Workspace Foundation
status: draft
owner: team
branch: feature/workspace-foundation
target: develop
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
---
```

상태:

```text
draft → approved → in_progress → verified → done
                                   └──────→ superseded
```

- `draft`: 논의 중이며 구현 시작 금지
- `approved`: 범위와 인수 조건 승인
- `in_progress`: 연결 브랜치에서 구현 중
- `verified`: 요구사항과 회귀 검증 완료
- `done`: 대상 브랜치에 병합되고 현재 문서 반영 완료
- `superseded`: 다른 Spec으로 대체

## 문서별 책임

### `spec.md`

- 문제와 배경
- 사용자·사용 상황
- 목표와 비목표
- 사용자 스토리
- 기능·권한 요구사항
- 인수 조건
- 범위 밖 항목

요구사항에는 추적 가능한 ID를 붙인다.

```text
REQ-001 워크스페이스 멤버만 채팅 채널을 조회할 수 있다.
REQ-002 완료된 워크스페이스에서는 메시지를 작성할 수 없다.
```

### `ux.md`

- 정보 구조와 사용자 흐름
- 화면·컴포넌트 책임
- desktop/tablet/mobile 반응형
- loading, empty, error, success, disabled 상태
- 키보드 탐색과 접근성
- 사용자 문구와 피드백
- 와이어프레임·참고 화면

정상 상태 하나만 정의하지 않는다. 권한 없음, 네트워크 실패, 데이터 없음, 긴 콘텐츠, 동시 편집 충돌도 포함한다.

### `plan.md`

- 변경할 모듈과 파일 경계
- 클라이언트/BFF/실시간 서버 책임
- 인증·인가 위치
- API·Socket.IO·Yjs 계약
- 데이터 모델과 마이그레이션
- 오류 처리와 호환성
- 테스트 전략
- 배포·롤백 고려사항

### `data-model.md`

- 추가·변경할 엔티티와 관계
- 인덱스·제약조건
- 기존 데이터 호환성
- migration 순서
- 롤백 또는 복구 전략

DB의 기준 스키마와 실제 migration 파일이 최종 계약이며, 문서만 수정하고 스키마를 누락하지 않는다.

### `contracts/`

REST, Socket.IO, Yjs room처럼 구현 사이에 공유되는 계약을 기록한다.

각 계약에는 다음을 포함한다.

- 요청·이벤트 이름과 방향
- 인증된 사용자 식별 방식
- request/payload schema
- success response 또는 broadcast
- error code와 재시도 정책
- 버전·하위 호환성

### `tasks.md`

작업을 의존성 순서로 나누고 요구사항과 검증을 연결한다.

```text
- [ ] TASK-001 Socket.IO 인증 미들웨어 추가
  - Requirements: REQ-001
  - Files: workspace-server/src/...
  - Verification: 비인증 연결 거부 테스트
  - Depends on: 없음
```

하나의 Task는 가능하면 독립적으로 구현·검토·검증할 수 있어야 한다.

### `verification.md`

- 요구사항별 테스트 결과
- lint/typecheck/test/build 명령과 결과
- 수동 브라우저 시나리오
- 접근성·반응형 점검
- 미해결 위험과 후속 작업
- 최종 인수 여부

단순히 “테스트 통과”라고 쓰지 않고 어떤 요구사항을 어떤 증거로 확인했는지 연결한다.

## AI 작업 규칙

1. AI는 현재 코드와 관련 문서를 먼저 읽는다.
2. `approved` 이전에는 구현하지 않는다.
3. `tasks.md`의 Task 하나씩 작업한다.
4. 요구사항에 없는 범위 확장은 먼저 Spec에 제안한다.
5. 구현과 테스트를 같은 Task에서 다룬다.
6. 실패를 숨기거나 검증하지 않은 항목을 완료 처리하지 않는다.
7. DB 초기화, 데이터 삭제, 권한 정책 완화는 명시적 승인 없이 수행하지 않는다.
8. 구현이 Spec과 달라졌다면 병합 전에 둘 중 하나를 바로잡는다.

## 완료 조건

Spec은 다음을 모두 만족할 때 `done`으로 변경한다.

- 모든 필수 요구사항이 구현됐다.
- `tasks.md` 필수 작업이 완료됐다.
- `verification.md`에 인수 근거가 있다.
- PR이 대상 브랜치에 병합됐다.
- 실제 동작 변경이 `docs/PROJECT_REFERENCE.md`와 관련 README에 반영됐다.
- 대체되거나 취소된 결정이 명확히 표시됐다.

Spec은 완료 후에도 삭제하지 않는다. 이후 동작이 바뀌면 새 Spec에서 대체 관계를 명시하고 기존 Spec은 `superseded`로 남긴다.
