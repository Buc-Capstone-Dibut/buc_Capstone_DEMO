# Target Architecture

## 1) 시스템 경계
- Client/UI: `web` (Next.js)
- BFF/API Gateway: `web/app/api/interview/*`
- AI Runtime: `ai-interview` (FastAPI)
- Realtime Runtime: `LiveKit Cloud + ai-interview/ws`
- Data: Supabase Postgres + Object Storage

## 2) 훈련센터 런타임 트랙

### Track A. Replay Simulation
1. 사용자가 리포트에서 “다시 체험할 순간” 선택
2. FastAPI가 원 세션 컨텍스트(질문흐름/답변/evidence) 로드
3. 동일 맥락으로 면접관 재입장(phase + persona 복원)
4. 사용자 새 답변을 받아 후속 질문을 동적으로 생성
5. 기존 답변 대비 개선 포인트를 즉시 비교

### Track B. Portfolio Defense (Public Repo)
1. 사용자가 공개 GitHub URL 입력
2. FastAPI가 README + 트리 + 핵심 파일 메타를 수집
3. 레포 구조 기반 인터뷰 시나리오 생성
4. 아키텍처/인프라/AI 활용 중심 디펜스 면접 진행
5. 60/10/30 루브릭으로 리포트 생성

## 3) 주요 컴포넌트
- `Replay Orchestrator`: 원 세션 복원 + 재체험 진행
- `Portfolio Analyzer`: 공개 레포 파싱/요약/질문 seed 생성
- `Defense Interviewer`: 설계/인프라 질의응답 엔진
- `Weighted Evaluator`: 60/10/30 가중치 채점
- `Report Comparator`: 원본 답변 vs 재답변 개선 비교
- `Interviewer Avatar Presenter`: 디벗 면접관 상태/발화 연출

## 4) 공개 레포 제약
- 허용: 공개 GitHub 저장소 URL
- 비허용: private repo, access token, 사내 비공개 코드
- 문서/UI/API에 동일하게 명시

## 5) 장애 격리
- 레포 분석 실패 시, 일반 SJT 면접으로 fallback
- 음성 파이프라인 장애 시 텍스트 모드 전환
- 리포트 생성 실패 시 raw turn/evidence는 보존

## 6) 아바타 연출 계층 (추가)
- UI는 `avatar_state` 이벤트만 신뢰하여 디벗 아바타 상태를 그린다.
- 음성 파이프라인 실패 시 `avatar_state`는 `idle`로 강등한다.
- 아바타 렌더 실패 시에도 면접 본문(채팅/음성)은 중단하지 않는다.
- v1에서는 "렌더 레이어"를 분리한다.
- 면접 엔진(질문 생성)과 아바타 연출 로직을 분리하여 장애 전파를 차단한다.
- 아바타 에셋 포맷은 `SVG`를 기본으로 사용한다.
- 아바타 상태값은 `idle|thinking|listening|speaking` 4개로 고정한다.
- MVP 립싱크는 viseme가 아닌 `state 기반 애니메이션`으로 구현한다.
- 기본 레이아웃은 좌측 아바타 고정, 사용자 최소화 토글을 허용한다.
- SVG 에셋 루트는 `web/public/interview/avatar`를 표준 경로로 사용한다.
