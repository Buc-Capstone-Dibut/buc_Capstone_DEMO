# Pages and UX Spec

## 1) IA
- `/interview` : 대시보드
- `/interview/setup` : 설정
- `/interview/room` : 일반 모의면접
- `/interview/result` : 리포트
- `/interview/training` : 훈련센터 홈 (재체험 중심)
- `/interview/training/replay/[sessionId]` : 리포트 순간 재체험
- `/interview/training/portfolio` : 공개 레포 입력/분석
- `/interview/training/portfolio/room` : 레포 디펜스 면접

## 2) 훈련센터 홈 구성

### A. Replay Entry (핵심)
- 최근 리포트의 질문 타임라인 표시
- 각 질문 카드에 `이 순간 다시 체험하기` 버튼 제공
- 클릭 시 replay session 생성 후 즉시 면접 진입

### B. Portfolio Defense Entry
- 공개 GitHub URL 입력 폼
- `공개 레포만 지원` 문구 고정 표기
- 분석 성공 시 디펜스 세션 시작

### C. Quick Insights
- 60/10/30 축별 현재 점수
- 원본 답변 대비 최근 replay 개선률

## 3) Replay 화면 UX
- 상단: “원본 질문/원본 답변 요약” 고정 패널
- 본문: 실시간 면접 채팅/음성 영역
- 우측: 현재 평가축(설계/코드/AI)과 근거 신호
- 종료 후: 원본 대비 개선 비교 카드

## 4) Portfolio Defense 화면 UX
- 좌측: README 요약 + 폴더/파일 구조 인덱스
- 중앙: 면접 대화
- 우측: 토픽 체크리스트
  - 아키텍처
  - CI/CD
  - 배포 전략
  - 모니터링
  - 장애 대응
  - AI 활용 방식

## 5) 디자인 가드레일
- 기존 인터뷰 페이지 카드/배지/버튼 스타일 유지
- 신규 색체계 도입 금지, primary 톤 확장만 허용
- 실시간 면접 몰입감을 해치지 않는 정보 밀도 유지

## 6) 화상 디벗 면접관 아바타 스펙 (추가)

확정 결정:
- 아바타 렌더 포맷은 `SVG`를 사용한다.
- 상태셋은 `idle|thinking|listening|speaking` 4개로 고정한다.
- 립싱크는 MVP에서 `state 기반 단순 애니메이션`으로 처리한다. (`viseme` 미적용)
- 레이아웃은 `좌측 아바타 고정`이 기본이며, 사용자 `최소화 토글`을 허용한다.
- SVG 에셋 기본 경로는 `web/public/interview/avatar`로 고정한다.

### A. 현재 상태 (2026-02-25)
- 훈련센터 video 모드는 LiveKit 연결 버튼/참가자 카메라 렌더까지만 반영됨
- `디벗 면접관 고정 아바타` 연출은 미반영
- 립싱크/표정/발화 상태(듣는 중, 말하는 중) 시각화도 미반영

### B. 목표 UX
- 화상 면접 화면에 `디벗 면접관 슬롯`을 고정 배치한다.
- 사용자는 본인 카메라 + 디벗 면접관 아바타를 동시에 본다.
- 면접관 발화 중에는 아바타 상태가 `speaking`으로 전환되고, 종료 시 `idle`로 복귀한다.
- 사용자 발화 중에는 아바타 상태가 `listening`으로 전환된다.

### C. 화면 구성 규칙
- 기본 레이아웃: 2열
- 좌측 고정: Dibut Interviewer Avatar Panel
- 우측: 사용자/참가자 카메라 그리드
- 모바일: 아바타 패널 상단 고정 + 카메라 그리드 하단 스크롤
- 우측 상단에 아바타 패널 최소화/복원 토글 버튼 제공
- 아바타 패널에는 최소 정보 노출
- 이름: `Dibut Interviewer`
- 상태 배지: `Listening | Speaking | Thinking`
- 모드 배지: `LiveKit Beta`

### D. 상태 전이
- `thinking`: LLM 응답 생성 대기
- `speaking`: TTS 오디오 출력 중
- `listening`: 사용자 음성 입력 수신 중(VAD active)
- `idle`: 대기

### E. 비목표 (이번 단계 제외)
- 초고해상도 3D 아바타 렌더
- 감정 인식 기반 실시간 표정 자동 변경
- 개인화 커스텀 아바타 생성
- viseme/phoneme 기반 정교 립싱크

### F. 에셋 규칙
- `web/public/interview/avatar/dibut-idle.svg`
- `web/public/interview/avatar/dibut-thinking.svg`
- `web/public/interview/avatar/dibut-listening.svg`
- `web/public/interview/avatar/dibut-speaking.svg`
