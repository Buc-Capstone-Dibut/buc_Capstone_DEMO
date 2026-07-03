# Dibut 코드베이스 지식그래프 분석 보고서

> **날짜**: 2026-07-03
> **도구**: [Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) (tree-sitter 정적분석 + LLM 멀티에이전트 파이프라인)
> **분석 기준 커밋**: `bcd3c78` (`feat/ctp-viz-simulator-upgrade`)
> **산출물**: [`.understand-anything/knowledge-graph.json`](../../.understand-anything/knowledge-graph.json) — **저장소에 커밋되어 있어 팀원은 분석을 다시 돌릴 필요 없이 대시보드만 열면 됩니다** (§6 참고)

---

## 1. 무엇을 했나

코드베이스 전체(4개 서비스)를 지식그래프로 변환했습니다. 모든 파일·함수·클래스가 노드가 되고, import/호출/설정/마이그레이션 관계가 엣지가 됩니다. 요약은 전부 한국어로 생성됐습니다.

| 항목 | 값 |
|---|---:|
| 분석 파일 | 896개 (184,679라인) |
| 노드 | 2,501개 (file 834 · function 1,526 · class 70 · table 41 · config 18 · document 10 · schema 2) |
| 엣지 | 4,888개 (contains 1,661 · imports 1,570 · exports 1,105 · calls 392 · migrates 32 등) |
| 레이어 | 10개 (자동 식별, §3) |
| 가이드 투어 | 14단계 (대시보드 "Start Tour") |

**분석 제외**(`.understand-anything/.understandignore`): 빌드 산출물(.vercel/.next), shadcn UI 프리미티브 51개, `web/public`·`web/data` 정적 자산, `docs/` 스펙 문서 뭉치, 테스트 파일. 아키텍처 신호가 없는 노이즈만 제외했습니다.

## 2. 파이프라인 (재현 방법)

1. **SCAN** — `git ls-files` 기반 파일 열거 + tree-sitter로 import 1,570개 결정적 해석
2. **BATCH** — import 그래프 Louvain 클러스터링으로 41개 시맨틱 배치 생성
3. **ANALYZE** — 배치별 LLM 에이전트가 구조추출 결과를 바탕으로 요약·태그·시맨틱 엣지 생성
4. **REVIEW** — 병합·정규화 후 검토 에이전트가 무결성 검증(누락 함수노드 27개 복구 포함)
5. **ARCHITECTURE / TOUR** — 레이어 10개 식별, 학습 순서 투어 14단계 생성
6. **SAVE** — 최종 그래프 + 파일 지문(fingerprints) 저장 → **이후 재실행은 변경 파일만 증분 분석**

## 3. 레이어 지도

| 레이어 | 파일 수 | 내용 |
|---|---:|---|
| UI 피처 컴포넌트 | 403 | `web/components/**`, hooks, store — 전체의 45% |
| 웹 도메인/서비스 라이브러리 | 116 | `web/lib/**` 비즈니스 로직 |
| 웹 프론트엔드 페이지 | 115 | `web/app/**` 라우트 (api 제외) |
| BFF API 라우트 | 101 | `web/app/api/**` + middleware |
| AI 면접 백엔드 (FastAPI) | 63 | `ai-interview/app/**` |
| DB 스키마/마이그레이션 | 44 | Prisma 스키마 2개 + SQL 마이그레이션 |
| 크롤러 | 23 | `crawler/**` (dev_event · tech_blog) |
| 설정/인프라 | 22 | env·배포 설정 (render.yaml, vercel.json) |
| 실시간 협업 서버 | 11 | `workspace-server/**` |
| 문서 | 7 | README·인수인계 문서 |

## 4. 그래프가 실증한 아키텍처 사실 (문제 포함)

아래 수치는 전부 `knowledge-graph.json`에서 스크립트로 집계한 값입니다.

### 4-1. "BFF"는 사실상 두 번째 백엔드다 — 그리고 두 세계가 섞여 있다
`web/app/api` route.ts **100개** 중:
- **84개 = 직접 구현** (Prisma/Supabase/Gemini를 라우트에서 직접 호출)
- **14개 = FastAPI 프록시** (`AI_INTERVIEW_BASE_URL`로 전달 — 전부 면접 도메인)
- **2개 = 410 폐기 스텁** (`interview/chat`, `interview/portfolio/chat`)

"프록시 계층"이라는 이름과 달리 웹이 최대 백엔드입니다. 문제는 비율이 아니라 **혼재**입니다: 같은 폴더 안에서 인증·에러 처리·타임아웃 규칙이 직접구현/프록시 두 갈래로 나뉘어 있습니다. 정리 방향은 "84개를 FastAPI로 옮기기"가 아니라 **웹=제품 백엔드, FastAPI=AI 전문 엔진이라는 실제 경계를 문서·규칙으로 공식화**하는 것입니다.

### 4-2. 인프라 노드 0개
그래프 전체에서 **pipeline(CI/CD)·service(Dockerfile)·resource(IaC) 노드가 하나도 없습니다.** 배포는 `render.yaml`+`vercel.json`(플랫폼 Git Hook 자동배포) 두 장이 전부입니다. 테스트 게이트 없이 push=deploy이므로, 최소 GitHub Actions 한 장(lint+build)이라도 push와 배포 사이에 넣는 것이 1순위 권고입니다.

### 4-3. workspace-server는 그래프상 완전한 섬 + DB 소유권 분산
- web → workspace-server 정적 엣지 **0개** (연결은 런타임 WSS뿐)
- 자체 `workspace-server/prisma/schema.prisma`에 **37개 모델** 별도 보유 (web 스키마는 61개 모델)

같은 Postgres를 두 개의 Prisma 스키마가 나눠 정의하고 있어 마이그레이션 충돌 위험이 있습니다. 스키마 소유권을 한쪽으로 통합(또는 최소한 테이블 소유 경계 문서화)이 필요합니다.

### 4-4. 서비스 간 타입 계약 부재
4개 서비스 사이 imports 엣지 **0개** — 모든 통신이 URL 문자열(REST/WSS)로만 연결됩니다. FastAPI 응답 스키마가 바뀌면 web은 런타임에야 깨집니다. FastAPI의 OpenAPI 스키마(`/docs`)에서 TS 타입을 생성해 web이 소비하는 것만으로도 이 간극이 메워집니다.

### 4-5. 거대 파일 편중
file 노드 834개 중 **309개(37%)가 complex** 등급. 대표 갓파일:
- `web/components/features/resume/hooks/use-cover-letter-wizard.ts` — 1,563줄
- `web/components/features/resume/resume-editor.tsx` — 1,252줄
- `web/lib/career-portfolios.ts` — 함수 104개
- `ai-interview/app/api/interview.py` — 엔드포인트 16개 + `ws_runtime.py` 함수 58개

### 4-6. Gemini 의존 표면적 = 50개 노드
대시보드에서 "gemini" 검색 시 50개 노드가 잡힙니다(웹 텍스트 생성 + FastAPI LLM/음성 + 크롤러 태깅). 모델 세대 교체 작업 시 이 검색 결과가 곧 체크리스트입니다.

### 4-7. 죽은 코드 흔적
410 폐기 스텁 2개, 고아 노드 29개(빈 `__init__.py`, `runtime.txt` 등 — 소소함).

## 5. 권고 우선순위

1. **CI 최소 게이트** (§4-2) — push=deploy 사이에 lint+build 검증
2. **BFF 경계 공식화** (§4-1) — 폐기 스텁 2개 삭제, 프록시 14개 목록 고정 문서화
3. **DB 스키마 소유권 정리** (§4-3)
4. **FastAPI→TS 타입 생성** (§4-4)
5. **갓파일 분해는 급하지 않음** (§4-5) — 기능 개발과 충돌하지 않는 선에서 점진적으로

기존 상세 조사와 함께 보세요: [CTP 시각화 전수조사](../audit/2026-06-15-ctp-visualization-audit.md) · [성능/캐싱 전수조사](../audit/2026-06-02-performance-forwarding-audit.md)

## 6. 팀원용: 대시보드 여는 법

그래프 JSON은 이미 커밋되어 있으므로 **분석 재실행 없이 뷰어만 설치**하면 됩니다.

### A. Claude Code 사용자 (권장)
```
/plugin marketplace add Egonex-AI/Understand-Anything
/plugin install understand-anything
```
이후 프로젝트 루트에서 `/understand-dashboard` 실행 → 출력된 토큰 URL 접속.
코드가 바뀐 뒤에는 `/understand` 로 증분 갱신(변경 파일만 재분석).

### B. Claude Code 없이 (뷰어만)
```bash
git clone https://github.com/Egonex-AI/Understand-Anything ~/.understand-anything/repo
ln -sfn ~/.understand-anything/repo/understand-anything-plugin ~/.understand-anything-plugin
cd ~/.understand-anything-plugin && pnpm install && pnpm --filter @understand-anything/core build
cd packages/dashboard && GRAPH_DIR=<프로젝트루트> UNDERSTAND_ACCESS_TOKEN=dibut-graph npx vite --host 127.0.0.1 --port 5175
# → http://127.0.0.1:5175/?token=dibut-graph
```
요구사항: Node 20+, pnpm 10+.

### 대시보드 사용 팁
- 첫 화면(Overview)에서 우측 **Start Tour** → 14단계 아키텍처 투어가 최고의 온보딩입니다.
- 상단 검색(퍼지/시맨틱) → 결과 클릭 → 우측 패널에서 한국어 요약·연결관계·코드 확인, **FOCUS**로 이웃 그래프만 보기.
- ⚠️ BFF(101개)·UI컴포넌트(403개)처럼 평평한 레이어에 진입하면 노드가 가로로 넓게 깔려 **첫 화면이 빈 것처럼 보입니다**(줌 ~2%). 버그가 아니니 검색→FOCUS로 탐색하세요.

### 커밋 정책
- 커밋 대상: `knowledge-graph.json`, `fingerprints.json`, `meta.json`, `.understandignore`
- 커밋 금지(로컬 스크래치, .gitignore 처리됨): `intermediate/`, `tmp/`, `.trash-*/`, `diff-overlay.json`

### 트러블슈팅
- `merge-batch-graphs.py`가 `TypeError: unsupported operand ... |` 로 죽으면 → Python 3.10+ 필요. macOS 시스템 python3(3.9) 대신 `/opt/homebrew/bin/python3.13` 사용.
- 그래프를 새로 만들 일이 있으면 토큰 소모가 큽니다(이번 전체 분석: 에이전트 21개). 특별한 이유가 없으면 `/understand` 증분 모드를 쓰세요.
