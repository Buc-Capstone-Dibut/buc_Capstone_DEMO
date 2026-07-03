# 면접 3-플로우 테스트케이스 100건

작성: 2026-07-04 · 대상: 채용공고 기반 / 직무 기반 / 포트폴리오 디펜스
자동화 러너: FastAPI = `cd ai-interview && .venv/bin/python -m unittest discover -s tests -v` · web = `npm --prefix web run test:<도메인>` (node:test + tsx)
표기: [A]=자동화됨(파일 명시) · [L]=라이브 스모크(로컬 서버 대상 스크립트) · [M]=수동(실기기 필요)

## A. 공통 — 세션 수명주기·인증 (TC-001 ~ TC-022)

| TC | 시나리오 | 기대 결과 | 검증 |
|---|---|---|---|
| 001 | 무인증으로 `POST /v1/interview/session/start` (x-user-id 없음) | 401 | [A] tests/test_flow_contracts.py |
| 002 | 정상 인증 session/start (jobData 포함) | 200 + sessionId 반환, job_payload 저장 | [A] tests/test_flow_contracts.py |
| 003 | 빈 jobData(`{}`)로 session/start | 세션 생성은 허용(room 폴백 경로 보전), 프롬프트에 `{}` 미주입 | [A] tests/test_flow_contracts.py |
| 004 | targetDurationSec 극단값(0, 음수, 10만) | 서버 클램프로 유효 범위 보정 | [A] tests/test_flow_contracts.py |
| 005 | 비UUID 세션ID로 FastAPI get_session 계열 호출 | 500+DB에러 노출 금지 → 404 | [A] tests/test_exception_paths.py |
| 006 | 존재하지 않는 UUID 세션ID | 404 | [A] tests/test_flow_contracts.py |
| 007 | 타인 소유 세션 접근(require_owner) | 404/403 (소유권 필터) | [A] tests/test_flow_contracts.py |
| 008 | `POST complete` 정상 | completed 마킹 + 리포트 잡 enqueue | [A] tests/test_flow_contracts.py |
| 009 | `POST complete` 반복 호출(멱등) | 오류 없이 안정 응답 | [A] tests/test_flow_contracts.py |
| 010 | complete 중 enqueue_report_job 실패 | 500 금지 — 세션 completed 유지+관측 로그, retry-report로 복구 가능 | [A] tests/test_flow_contracts.py |
| 011 | report-status: 잡 없음 + 세션 completed | 무한 running 금지 — 종결 상태 반환 | [A] tests/test_flow_contracts.py |
| 012 | report-status: 잡 running/done/failed 각각 | 상태 문자열 정확 매핑 | [A] tests/test_flow_contracts.py |
| 013 | prepare-opening: Live 호출 예외 | 500 전파 금지 → prepared:false 우아 응답 | [A] tests/test_flow_contracts.py |
| 014 | prepare-opening 정상 | prepared:true + turnId | [L] 라이브 스모크 |
| 015 | WS init: DB에 없는 sessionId | 세션 미존재 오류 이벤트, 크래시 없음 | [A] 기존 tests(runtime) + [L] |
| 016 | WS init: sessionType 불일치(live 세션에 portfolio init) | 거부 | [A] 기존 session_engine 검증 |
| 017 | WS 클라이언트 jobData 변조 전송 | 서버 무시(DB job_payload가 진실 원천) | [A] tests/test_flow_contracts.py |
| 018 | WS 최초 연결 실패 후 자동 재연결 | init 전에도 백오프 재연결(전일 수정 회귀) | [L] 재연결 사이클 스모크 |
| 019 | Cookie 헤더 9~31KB로 WS 핸드셰이크 | 400 거부 없이 OPEN(파서 한도 32768) | [L] ws 쿠키 스모크 |
| 020 | BFF session/start 8s 초과 | AbortError → 사용자 안내 응답 | [A] 코드 경로/기존 |
| 021 | BFF 전 라우트: malformed JSON body | 500 금지 → 400 | [A] web lib 테스트+계약 |
| 022 | LiveKit token 무인증 요청 | 401 (기존: 완전 무인증이었음 — 수정 검증) | [A]/[L] BFF 응답 확인 |

## B. 채용공고 기반 플로우 (TC-023 ~ TC-048)

| TC | 시나리오 | 기대 결과 | 검증 |
|---|---|---|---|
| 023 | 유효 채용공고 URL parse-job | success:true + role/company/requirements 추출 | [L] 라이브(LLM 필요) |
| 024 | 접속 불가 URL(존재하지 않는 도메인) | success:false + FETCH_FAILED류 코드(가짜 success 금지) | [A] tests/test_flow_contracts.py |
| 025 | http/https 아닌 스킴(javascript:, file:) | 안전 거부 | [A] tests/test_exception_paths.py |
| 026 | LLM 파싱 실패(JSON 불량) | success:false + PARSE_FAILED + 폴백 data 동봉 | [A] tests/test_exception_paths.py |
| 027 | LLM 쿼터 초과(429) | success:false + 쿼터 코드 | [A] tests/test_exception_paths.py |
| 028 | 프론트: parse 실패 응답 수신 | 조용한 진행 금지 — 에러 배너+직접 입력 유도 | [A] web 순수함수 + [M] |
| 029 | parse-job BFF 타임아웃(60s) | 504 + 한국어 안내 | [A] 코드 경로 |
| 030 | 내 채용공고 프리필(interview-prefill) | jobData 정확 매핑 | [A] 기존/route 검증 |
| 031 | 프리필: 존재하지 않는 postingId | 404, alert에 raw 에러 미노출 | [A]/[M] |
| 032 | jd-check: role·company 모두 빈 값 | 다음 진행 차단(가드) | [A] web + [M] |
| 033 | jd-check: 일부만 입력 | 진행 허용 | [M] |
| 034 | interviewTrack="posting" 세션 | 프롬프트에 공고 트랙 가이드 주입 | [A] 기존 live_client 테스트 |
| 035 | sourceUrl만 있고 company 일반명 | infer_interview_track → posting | [A] 기존 question_bank 테스트 |
| 036 | 공고 jobData가 Live 프롬프트에 요약 주입 | summarize_job_for_prompt 1500자 요약(원문 raw 덤프 금지) | [A] 기존 interview_memory |
| 037 | 이력서 첨부 후 final-check | resumeData 전송 | [M] |
| 038 | 이력서 없이 시작 | resumeData:{} 허용 | [A] tests/test_flow_contracts.py |
| 039 | 공고 세션 전체 플로우: start→WS→첫 질문 | 첫 질문 도달(회사·직무 반영) | [L] ws-flow 프로토콜 E2E |
| 040 | 공고 세션 complete→리포트 done | reportView 생성 | [L] 폴링 스모크 |
| 041 | 리포트에 회사/직무 표기 | job_payload 기반 표기 | [L]/[M] |
| 042 | 같은 URL 재파싱(캐시) | 재분석 생략 동작 인지(문서화) | [M] |
| 043 | localStorage stale jobData로 room 직진입 | 세션 생성은 되나 의도 문서화(알려진 한계) | [M] |
| 044 | 긴 requirements(수천자) | jd_text 12000자 스냅샷 절단, job_payload 원본 | [A] 기존 service 테스트 |
| 045 | 특수문자/이모지 포함 공고 | 저장·프롬프트 주입 안전 | [A] tests/test_flow_contracts.py |
| 046 | parse-job 무인증(비로그인) | BFF 통과 정책 유지 여부 문서화(비용 리스크 — 로드맵) | 문서화 |
| 047 | 공고 면접 중 답변→꼬리질문 | exchange 진행 | [M] 실면접 |
| 048 | 공고 면접 녹화·리포트 영상 재생 | 전일 파이프라인 회귀 무손상 | [L] 섹션 E 공유 |

## C. 직무 기반 플로우 (TC-049 ~ TC-062)

| TC | 시나리오 | 기대 결과 | 검증 |
|---|---|---|---|
| 049 | 직무 선택→합성 JD 생성(buildRoleTrainingJobData) | company="직무 기반 모의면접"+track:"role" | [A] web 기존/신규 |
| 050 | role 트랙 session/start | 같은 엔드포인트, interviewTrack으로 구분 | [A] tests/test_flow_contracts.py |
| 051 | role 트랙 프롬프트 | role 트랙 가이드 주입(posting 가이드 아님) | [A] 기존 live_client |
| 052 | 직무 플로우 첫 질문 도달 | WS E2E 통과 | [L] ws-flow (기본 실행 트랙) |
| 053 | 직무 면접 10분 타이머 | targetDurationSec=420~600 반영 | [A] 클램프 + [M] |
| 054 | 마이크 거부 상태로 시작 시도 | 시작 게이트 차단+안내 | [M] |
| 055 | 카메라 없이(끄고) 시작 | 음성 전용 면접 정상 진행 | [M]/[L] |
| 056 | 캘리브레이션 건너뛰기 | 면접 정상, 시선 시그널 없음 허용 | [L] R4 E2E에서 검증됨 |
| 057 | 캘리브레이션 완료 후 시작 | face 시그널 수집→리포트 오버레이 | [M] 실카메라 |
| 058 | 면접 중 새로고침(이어하기) | in_progress 재접속 — 기기점검 스킵 | [M] |
| 059 | 자연 완료(AI 종료 선언) | completeSession 경유 — 녹화·시그널 유실 금지(전일 수정) | [A] 배선 확인+[M] |
| 060 | 수동 종료 버튼 | 녹화 업로드→리포트 enqueue→결과 이동 | [L] R1/R4 E2E |
| 061 | 종료 시 업로드 30s 하드 타임아웃 | 면접 종료 블로킹 금지 | [A] 코드 경로 |
| 062 | 직무 면접 리포트: 질문 타임라인+스크립트 | 세그먼트 생성·클릭 seek | [L] 시드 리포트 검증 |

## D. 포트폴리오 디펜스 플로우 (TC-063 ~ TC-088)

| TC | 시나리오 | 기대 결과 | 검증 |
|---|---|---|---|
| 063 | 유효 공개 레포 URL analyze | readmeSummary/treeSummary/infraHypotheses/detectedTopics | [L] 라이브(GitHub+LLM) |
| 064 | 비공개 레포 | PUBLIC_REPO_ONLY 에러 코드 | [A] tests/test_flow_contracts.py |
| 065 | 존재하지 않는 레포(404) | 매핑된 에러 코드 | [A] tests/test_flow_contracts.py |
| 066 | GitHub rate limit(403) | 매핑된 에러 코드 | [A] tests/test_flow_contracts.py |
| 067 | github.com 아닌 URL | 형식 거부 | [A] tests/test_exception_paths.py |
| 068 | README 없는 레포 | 빈 README 허용, 추정 요약 | [A] 프롬프트 폴백 |
| 069 | analyze 무인증(FastAPI 직접) | 401 (수정 검증 — 기존 무인증) | [A] tests/test_flow_contracts.py |
| 070 | BFF analyze가 x-user-id 전달 | 헤더 부착 확인 | [A] web 계약 |
| 071 | portfolio session/start | 세션 생성+job_payload 저장 | [A] tests/test_flow_contracts.py |
| 072 | **RAG 쓰기**: start 시 portfolio_sources INSERT | repo_url/스냅샷 3종 저장(캡 20000/10000/10000) | [A] tests/test_portfolio_rag.py |
| 073 | 스냅샷 저장 실패 | 면접 진행 유지+경고 로그(무음 금지) | [A] tests/test_portfolio_rag.py |
| 074 | **RAG 읽기**: WS hydrate 시 portfolio_defense면 DB 조회 | state.job_data에 portfolioSource 병합 | [A] tests/test_portfolio_rag.py |
| 075 | RAG 읽기: live_interview 세션은 미조회 | 불필요 쿼리 없음 | [A] tests/test_portfolio_rag.py |
| 076 | RAG 읽기 실패(DB 예외) | 면접 진행 차단 금지 — job_payload 폴백 | [A] tests/test_portfolio_rag.py |
| 077 | **프롬프트 주입**: portfolio 전용 포맷터 | 구조화 텍스트(레포/README/아키텍처/가설/토픽) — raw JSON 덤프 금지 | [A] tests/test_portfolio_rag.py |
| 078 | 포맷터 절단: 항목별 limit | JSON 중간 절단 금지 | [A] tests/test_portfolio_rag.py |
| 079 | 루브릭 지침 주입(60/10/30) | 시스템 프롬프트에 설계의도 검증 지침 포함 | [A] tests/test_portfolio_rag.py |
| 080 | DB 소스 우선, job_payload 폴백 | portfolioSource 있으면 우선 | [A] tests/test_portfolio_rag.py |
| 081 | 포트폴리오 첫 질문이 레포 맥락 반영 | 레포명/기술 언급 | [L]/[M] 실면접 |
| 082 | URL 쿼리에서 분석 전문 제거 | sessionId+표시용 최소 필드만(README 전문 URL 금지) | [A] web + [M] |
| 083 | sessionId 유실 시 room 재생성 폴백 | 동작 유지(알려진 한계 문서화) | [M] |
| 084 | 포트폴리오 세션 complete→리포트 | 60/10/30 가중 분석 생성 | [L] 폴링 |
| 085 | 리포트 comparison_payload에 repoUrl | 기록됨 | [A] 기존 reporting |
| 086 | 포트폴리오 리포트 페이지 리다이렉트 | portfolio report 경로로 replace | [M] |
| 087 | detectedTopics 기반 면접 유형 시각화 | 시작 화면 유형 표기 | [M] |
| 088 | analyze→start 사이 변조(다른 요약 전송) | 알려진 한계 — 서버 재검증 로드맵 문서화 | 문서화 |

## E. 녹화·리포트 회귀 (전일 파이프라인, TC-089 ~ TC-100)

| TC | 시나리오 | 기대 결과 | 검증 |
|---|---|---|---|
| 089 | 카메라 ON 면접 녹화 산출물 | vp9 영상+opus (오디오 전용 금지) | [L] 합성장치 E2E+ffprobe |
| 090 | 녹화에 면접관(AI) 음성 포함 | 하이패스 필터 후 음성 에너지 잔존 | [L] ffmpeg 스펙트럼 |
| 091 | 스트림 8s 대기+실패 즉시 폴백 | 카메라 실패 시 오디오 전용 즉시 시작 | [A] onStream(null) 경로 |
| 092 | WS 블립 중 시작 | startedRef 복구 — 녹화 영구 스킵 금지 | [A] 코드 경로(리뷰 확정 수정) |
| 093 | 로컬 저장 모드 | public/local-recordings 파일+GET 정적 URL 200 | [L] 저장 스모크 |
| 094 | supabase 저장 모드 | 서명 업로드→메타→signed URL 200+Range 206 | [L] 모드 전환 스모크 |
| 095 | 업로드 20s 초과(배포) | 메타 POST 독립 타임아웃 — orphan 방지 | [A] timedFetch 분리 |
| 096 | 질문별 하이라이트 아코디언 | Q칩→구간 seek→끝 자동정지(경계 1회) | [L] 이벤트 주입 검증 |
| 097 | 구간 관찰 칩 | 이탈%·미소%(표본<3 숨김, 무점수 문구) | [L] 시드 리포트 |
| 098 | 시선 오버레이 점 표기 | 시선점+우상단 상태점(시간동기) | [L] 픽셀 검증 |
| 099 | face tMs 리베이스 | 녹화 시작 기준 시간축 정렬(오프셋 보정) | [A] 배선+[M] 실카메라 |
| 100 | 비언어 패널(응시/미소/움직임) | 리포트 생성 후 칩 표기 | [L] 시드 검증 |

## 실행 요약 위치
- FastAPI 자동화: `ai-interview/tests/test_flow_contracts.py`, `test_portfolio_rag.py`, `test_exception_paths.py` + 기존 11파일
- web 자동화: `web/lib/interview/**/**.test.ts` (node:test), `npm run test:*`
- 라이브 스모크: 스크래치 `e2e/ws-flow.py`(프로토콜), 저장 스모크, 합성장치 브라우저 E2E
- [M] 항목: 실카메라·실면접 필요 — 시연 리허설 체크리스트로 사용
