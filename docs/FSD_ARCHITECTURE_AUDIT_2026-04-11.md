# FSD 아키텍처 준수 점검 보고서

- 점검일: 2026-04-11
- 점검 대상: `web`(주요), `workspace-server`(실시간 보안 연계 영역)
- 점검 방식: 정적 구조/코드 분석(폴더 구조, import 의존성, API 인증/검증 패턴, 안전성 패턴)

## 1) 한줄 결론
현재 코드는 **FSD를 부분적으로 적용한 상태**이며, 레이어 경계 강제 장치가 없어 시간이 지날수록 구조가 쉽게 무너질 수 있는 상태입니다. 보안 측면에서는 일부 API/소켓 경로에 **즉시 조치가 필요한 고위험 이슈**가 확인됩니다.

## 2) 종합 판정

| 항목 | 판정 | 근거 요약 |
|---|---|---|
| FSD 구조 채택 여부 | 부분 적용 | `components/features` 등 도메인 분할은 존재하나 `entities/widgets/shared` 정석 분리는 불완전 |
| 레이어 경계 준수 | 미흡 | `lib -> components`, `data -> components`, `features -> app` 역참조 확인 |
| 경계 강제 장치(룰/린트) | 없음 | `.eslintrc.json`이 Next 기본 확장만 사용 |
| 소스코드 안전성 | 취약 구간 존재 | 인증 없는 변경 API, 소켓 인증 미구현, HTML 렌더링 위험 지점 존재 |
| 유지보수/확장성 | 경고 | 초대형 파일 다수, 테스트 커버리지 낮음, 경계 혼합으로 변경 파급도 큼 |

### FSD 준수도(실무 관점) 점수
- **45 / 100 (부분 준수)**

## 3) 정량 지표

- TS/TSX 파일 수(주요 소스): **589개**
- 디렉터리 분포:
- `app`: 168
- `components`: 331
- `hooks`: 10
- `lib`: 71
- `store`: 1
- `types`: 2
- `data`: 6
- API Route(`app/api/**/route.ts`): **85개**
- 변경 메서드(POST/PUT/PATCH/DELETE) 포함 Route: **63개**
- 변경 Route 중 zod 기반 본문 검증 존재: **1개**
- 프로젝트 테스트 파일(소스 기준): **8개**
- 총 코드 라인(위 소스 경로 합): **107,905줄**

## 4) FSD 관점 구조 진단

### 4-1. 장점(적용된 부분)
- 도메인 feature 축이 존재함: `components/features/{career,community,ctp,interview,workspace,...}`
- 엔트리 포인트(`app`)와 UI 묶음(`components`)이 분리되어 있음
- `lib/server`, `lib/supabase` 등 인프라성 모듈이 분리돼 있어 리팩터링 기반은 있음

### 4-2. FSD 위반/약화 패턴(근거)

1. **하위 레이어가 상위(UI) 레이어를 참조**
- `lib/ctp-content-registry.tsx:7`
- `lib/ctp-content-registry.tsx:12`
- `lib/ctp-content-registry.tsx:17`
- `lib/ctp-content-registry.tsx:23`
- 해석: `lib`가 `components/features/*`를 직접 참조해 의존성 방향이 역전됨

2. **`data` 레이어가 UI feature 타입에 결합**
- `data/ctp/problems/index.ts:1`
- `data/ctp/problems/problem-factory.ts:7`
- 해석: 데이터 계층이 feature UI 타입에 묶여 재사용성과 독립성이 낮아짐

3. **feature가 app 레이어를 직접 참조**
- `components/features/resume/WorkExperienceImportModal.tsx:8`
- `components/features/resume/WorkExperienceImportModal.tsx:9`
- `components/features/career/cover-letter-wizard-overlay.tsx:25`
- `components/features/career/cover-letter-wizard-overlay.tsx:26`
- `components/features/career/cover-letter-wizard-overlay.tsx:27`
- 해석: FSD에서 보통 상위(`app`)가 하위를 조합해야 하는데, 역방향 참조 발생

4. **feature 간 교차 의존 존재(슬라이스 독립성 약화)**
- `components/features/career/activity-detail-content.tsx:17` (`career -> community`)
- `components/features/career/activity-filter.tsx:4` (`career -> tech-blog`)
- `components/features/interview/interview-dashboard.tsx:8` (`interview -> community`)
- `components/features/workspace/detail/workspace-settings-view.tsx:40` (`workspace -> resume`)

5. **경계 강제 룰 부재**
- `.eslintrc.json`은 `next/core-web-vitals`, `next/typescript`만 사용
- 레이어 import 제한(예: boundaries/no-restricted-imports)이 없음

## 5) 소스코드 안전성 진단(중요)

## [Critical] 인증 없는 권한 변경 API
- 파일: `web/app/api/squads/manage/route.ts`
- 근거:
- `request.json()`으로 받은 `user_id`를 신뢰 (`:10`)
- 수락/거절/멤버 추가 등 권한성 변경 수행 (`:32`~`:100`)
- 인증/권한 검증 코드 부재
- 영향: 임의 사용자/스크립트가 팀 수락/거절, 멤버 추가 가능

## [Critical] 인증 없는 생성 API(사용자 식별자 신뢰)
- 파일: `web/app/api/squads/route.ts`
- 근거:
- 본문 `user_id`를 리더로 사용 (`:24`, `:48`)
- 인증/세션 검증 없음
- 영향: 임의 계정 가장(squad/workspace 생성) 가능

## [High] 인증 없는 지원 데이터 조회/상태 조회
- 파일: `web/app/api/squads/applications/route.ts` (`:8`~`:44`)
- 파일: `web/app/api/squads/application/check/route.ts` (`:5`~`:23`)
- 영향: 지원자 목록/상태 조회가 외부 노출될 가능성

## [High] 실시간 서버 인증 미구현 + 전역 오픈 CORS
- 파일: `workspace-server/src/index.ts:16` (CORS `origin: "*"`)
- 파일: `workspace-server/src/modules/auth/auth.middleware.ts:4` (`validateToken`이 항상 `true`)
- 파일: `workspace-server/src/modules/socket/socket.gateway.ts:22`~`:55` (`join` payload `userId` 신뢰)
- 영향: 소켓 사용자 가장, Presence/채팅/보드 이벤트 오용 가능

## [Medium] LiveKit 토큰 발급 API 인증 없음
- 파일: `web/app/api/interview/livekit/token/route.ts`
- 근거: `identity`를 요청 본문 그대로 사용 (`:7`, `:31`), 사용자 인증 부재
- 영향: 임의 identity로 토큰 발급 시도 가능

## [Medium] HTML 직접 렌더링 지점
- 파일: `web/components/features/workspace/detail/chat/team-chat.tsx:613`
- 파일: `web/components/features/ctp/contents/shared/ctp-implementation.tsx:23`
- 영향: 콘텐츠 출처 통제가 깨질 경우 XSS 위험 확대

## 6) 유지보수/확장성 진단

1. **대형 파일 집중**
- `components/features/workspace/detail/docs-view.tsx` (2038 lines)
- `components/features/career/cover-letter-wizard-overlay.tsx` (2027 lines)
- `app/interview/room/video/page.tsx` (1343 lines)
- `components/features/workspace/detail/kanban-board.tsx` (1316 lines)
- 영향: 변경 충돌, 회귀 위험, 코드리뷰 비용 증가

2. **테스트 범위 협소**
- 테스트 파일 8개로, 대규모 API/실시간/워크스페이스 영역 대비 부족
- 회귀 검출력 낮음

3. **경계 혼합으로 리팩터링 비용 상승**
- app/lib/data/features 간 역참조로 이동·분리 시 연쇄 수정 범위가 큼

## 7) 우선순위 개선 권고안

### P0 (즉시, 1~3일)
1. `app/api/squads/manage/route.ts` 인증/인가 적용
2. `app/api/squads/route.ts`에서 `user_id` 신뢰 제거, 세션 사용자 강제
3. `app/api/squads/applications/route.ts`, `app/api/squads/application/check/route.ts` 접근 제어 추가
4. `workspace-server` 소켓 인증 강제(JWT 검증, 룸 권한 검증), CORS 제한
5. `app/api/interview/livekit/token/route.ts` 인증 필수화

### P1 (단기, 1~2주)
1. API 입력 검증 공통화(zod 스키마 + `safeParse` 표준)
2. HTML 렌더링 지점에 sanitizer 정책 적용(허용 태그 화이트리스트)
3. `features -> app`, `lib/data -> components` 역참조 제거
4. `components/features/*` 교차 의존을 `entities`/`shared`로 이동

### P2 (중기, 2~4주)
1. FSD 목표 구조 재정의 및 단계적 이동
2. ESLint 경계 규칙 도입
3. 대형 파일 분해(컴포넌트/훅/서비스 분리)
4. API/실시간/권한 플로우 통합 테스트 보강

## 8) 권장 목표 구조(Next.js App Router + FSD 절충)

```text
web/
  app/                  # 라우팅/엔트리만
  widgets/              # 페이지 조합 단위
  features/             # 사용자 시나리오 단위
  entities/             # 도메인 엔티티 단위
  shared/
    ui/
    lib/
    api/
    config/
```

## 9) 경계 규칙(예시)

- `app` -> `widgets|features|entities|shared` 허용
- `widgets` -> `features|entities|shared` 허용
- `features` -> `entities|shared`만 허용
- `entities` -> `shared`만 허용
- `shared` -> 상위 레이어 참조 금지
- `lib/data`가 `components/features` 참조 금지

## 10) 최종 결론

현재 상태는 “FSD 용어/폴더는 일부 적용되었지만, 실질적인 경계 통제는 미적용”입니다. 아키텍처 품질 저하의 핵심 원인은 **경계 역참조 + 규칙 부재**이며, 보안 측면은 **일부 API/소켓 경로가 즉시 보완이 필요한 수준**입니다. 우선 P0 보안 조치 후, P1에서 경계 정리와 검증 표준화를 병행하는 접근이 가장 안전합니다.
