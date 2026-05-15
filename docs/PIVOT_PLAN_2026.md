# Dibut v2 피봇 기획서

> **AI 면접 + 전문가 마켓플레이스로의 전면 전환**
>
> | 항목 | 내용 |
> |---|---|
> | 문서 버전 | v1.0 |
> | 작성일 | 2026-05-15 |
> | 단계 | 기획 잠금 (Pre-development) |
> | 대상 | 졸업작품 심사 / 사업 검토 / 개발팀 온보딩 |

---

## 목차

0. Executive Summary
1. 배경 및 문제 정의
2. 제품 비전
3. 타겟 시장 및 사용자
4. 경쟁 분석 및 포지셔닝
5. 비즈니스 모델
6. 핵심 기능
7. 사용자 플로우
8. 마켓플레이스 메커니즘
9. 시스템 아키텍처
10. 기술 스택
11. 데이터 모델
12. 보안 · 개인정보 · 규제
13. 개발 로드맵
14. KPI 및 성공 지표
15. 리스크 및 대응
16. 마이그레이션 전략
17. 결정 잠금 사항 / 미결 사항
18. 부록

---

## 0. Executive Summary

### 한 줄 정의

> **"AI가 모의면접·이력서·자소서를 분석하고, 전문가가 첨삭·코칭하는 양면 커리어 마켓플레이스"**

### 핵심 변화

| | Before (Dibut v1) | After (Dibut v2) |
|---|---|---|
| 정체성 | 개발자 올인원 협업 플랫폼 | 전 직군 AI 면접 + 전문가 마켓 |
| 타겟 | 개발자 | 구직자 + 전문가(현직자·HR·코치) |
| 핵심 가치 | 협업 워크스페이스 | AI 데이터 × 휴먼 코칭의 결합 |
| 수익 | 없음 | B2C 크레딧 + 마켓 수수료 (양매출) |
| 기술 스택 | Next.js + FastAPI + Workspace 협업 | **Kotlin Spring + Next.js Monorepo + FastAPI(AI 사이드카)** |

### 기대 효과

- **시장 확장**: 개발자(연 5만) → 전 직군 구직자(연 50만 이상)
- **수익 다변화**: B2C 결제 + B2B 마켓 수수료 + 차후 기업 API
- **차별화**: 코멘토(휴먼만) ↔ ChatGPT(AI만) 사이의 빈 공간
- **포트폴리오 가치**: 한국 채용시장 표준 스택 (Spring + Kotlin + AWS Seoul) 풀세트 경험

---

## 1. 배경 및 문제 정의

### 1.1 현재 상태

기존 Dibut v1은 약 108K LOC 규모의 "개발자 올인원 협업 플랫폼"으로, AI 면접 엔진, 실시간 협업 워크스페이스, 채용공고/이벤트 크롤러 등을 포함하고 있다.

문제점:
- 워크스페이스(전체 코드의 약 23%)는 결제 동기·면접 시너지 모두 약함
- 개발자 한정 = 잠재 시장의 약 10%만 커버
- 수익화 구조 부재
- 단일 사이드(구직자) 가치 제안만 존재 → 락인 약함

### 1.2 시장 관찰

| 사용자 페인 | 현재 대안 | 한계 |
|---|---|---|
| 모의면접 연습 부족 | 잡다, ChatGPT | 회사 맥락 X, 휴먼 피드백 X |
| 이력서·자소서 첨삭 필요 | 코멘토, 잡코리아 첨삭 | 비쌈, AI 데이터 미연동 |
| 면접 후 "무엇을 고쳐야 할지" 모름 | 자기 분석에 의존 | 객관성 부족 |
| 전문가는 클라이언트 확보 어려움 | 소셜·블로그 영업 | 시간 낭비, 검증된 풀 X |

### 1.3 우리의 기회

- **AI 데이터를 기반으로 한 휴먼 코칭**은 시장에 존재하지 않음
- 기존 코멘토는 휴먼 첨삭만, ChatGPT는 AI 응답만 — 그 사이에 빈 공간
- 양면 마켓이라 한쪽 모이면 다른 쪽 자동 유입 (Network Effect)
- AI 면접 엔진(이미 보유) + 전문가 풀(신규 확보) 결합 = **방어 가능한 해자**

---

## 2. 제품 비전

### 2.1 한 줄 정의

**"AI 면접·이력서·자소서를 전문가가 첨삭해주는 커리어 마켓플레이스"**

### 2.2 핵심 가치 제안

**구직자에게**
- AI 모의면접으로 부담 없이 연습
- 회사·직무 맞춤형 시뮬레이션 (JD 파싱 기반)
- 객관적 리포트 + 전문가의 인간적 피드백
- 가격 부담 ↓ (필요한 첨삭만 단건 구매)

**전문가에게**
- AI가 사전 정리한 데이터 + 리포트로 효율적 첨삭
- 클라이언트 확보 + 결제 + 정산을 플랫폼이 처리
- 시간 단위가 아닌 **단건 단위 가격 자율 설정**
- 평점 누적 = 개인 브랜드 자산

### 2.3 슬로건 후보

- "AI가 듣고, 사람이 답합니다"
- "면접의 모든 단계, 한 곳에서"
- "당신의 답변, 전문가의 시선으로"

---

## 3. 타겟 시장 및 사용자

### 3.1 한국 시장 잠재력 (TAM)

| 직군 | 연 신규 취준생 | 추정 TAM |
|---|---|---|
| 개발자/IT | 50K | 500억 |
| PM·기획·디자인·데이터 | 30K | 300억 |
| 마케팅·영업·HR | 100K | 1,000억 |
| **공공/공기업 (NCS)** | **200K** | **2,000억** |
| 금융·대기업 | 50K | 500억 |
| 의료·간호·서비스 | 100K | 1,000억 |
| **합계** | **약 530K/년** | **약 5,300억** |

**공급 측(전문가)**: 현직자·HR·전문 코치 추정 약 50,000명 풀.

### 3.2 페르소나

**구직자 페르소나 — 김지원 (25, 취준 8개월차)**
- 비IT 직군 (마케팅) 취준
- 자소서 5개 회사 동시 진행 중
- ChatGPT로 첨삭 시도했으나 "뭔가 평이함"
- 코멘토 가입했으나 ₩50,000+ 가격이 부담
- 면접 한 번이라도 안전하게 시뮬레이션하고 싶음
- **WTP**: 면접 시뮬 ₩5,000~10,000, 전문가 피드백 ₩30,000 이하

**전문가 페르소나 — 박현직 (32, 마케팅 7년차)**
- 현직 마케터, 부업으로 코칭에 관심
- 본인 SNS·블로그로 영업 시도했으나 마케팅 부담
- 후배·지인 자소서 무료로 봐주는 일 많음
- 시간 단위(예: ₩50,000/시간)보다 단건 단위 결제 선호
- **WTP**: 수수료 15~20%까지는 수용

### 3.3 1차 진입 직군

- Phase 1 (3개월): **개발자** (기존 자산 활용)
- Phase 2 (6개월): **PM/기획·디자이너·데이터** (인접 IT)
- Phase 3 (12개월): **마케팅·영업** + **공공/공기업 NCS**

---

## 4. 경쟁 분석 및 포지셔닝

### 4.1 경쟁 매트릭스

| 서비스 | AI 면접 | 휴먼 첨삭 | 양면 마켓 | 가격대 | 약점 |
|---|---|---|---|---|---|
| **잡다** | ◎ | ✗ | ✗ | 무료 | AI만, 휴먼 X, 기업 결제 모델 |
| **코멘토** | ✗ | ◎ | △ | ₩30K~₩100K | AI X, 단가 ↑ |
| **링글** | ✗ | ◎ (영어만) | ◎ | $30~$70/세션 | 직무 X, 한국어 X |
| **ChatGPT** | △ | ✗ | ✗ | $20/월 | 맥락 X, 휴먼 X |
| **숨고/크몽** | ✗ | △ | ◎ | ₩30K~ | 커리어 비전문 |
| **뤼튼** | △ | ✗ | ✗ | 부분유료 | 면접 시뮬 약함 |
| **Dibut v2** | ◎ | ◎ | ◎ | ₩30K (수수료 20%) | **빈 공간** |

### 4.2 포지셔닝

```
     휴먼 코칭 ↑
        │
   코멘토│           ★ Dibut v2
   링글  │       (AI + 휴먼)
        │
        │
────────┼──────────────────► 직무·맥락 맞춤도
        │
        │   ChatGPT
        │
   잡다 │
        │
     휴먼 코칭 ↓
```

### 4.3 진입 장벽 (해자)

1. **양면 네트워크 효과** — 한쪽이 모이면 다른 쪽 자동 유입
2. **AI 면접 엔진 IP** — 25K LOC 프롬프트·VAD·세션 복구 노하우
3. **금지 질문 정규식 필터** — 차별금지법 대응 (공공기관 진입 시 핵심)
4. **데이터 축적** — 사용자별 면접 히스토리 + 전문가별 피드백 패턴

---

## 5. 비즈니스 모델

### 5.1 수익 구조 (이중 매출)

```
[1] B2C 크레딧 (직접 매출)
   - AI 면접, 이력서 작성, 자소서 작성 → 크레딧 차감
   - 구독(Starter ₩9,900 / Pro ₩24,900) + 토프업

[2] 마켓플레이스 수수료 (간접 매출)
   - 사용자 → 전문가 결제액의 20% 차감
   - 전문가 정산 80%
```

### 5.2 크레딧 단가표 (B2C)

| 기능 | 원가 | 차감 | 마진 |
|---|---|---|---|
| 채용공고 조회 | 0원 | 무료 | (마케팅 깔때기) |
| 이력서 AI 첨삭 | 30원 | 2C (200원) | 7배 |
| 텍스트 모의면접 | 50원 | 3C (300원) | 6배 |
| 음성 모의면접 | 110원 | 8C (800원) | 7배 |
| 비교 분석 | 80원 | 5C (500원) | 6배 |

### 5.3 마켓 가격 가이드 (사용자 결제액)

| 상품 | 가격 범위 | 플랫폼 수수료 | 전문가 정산 |
|---|---|---|---|
| 이력서 첨삭 | ₩15,000~30,000 | ₩3,000~6,000 | ₩12,000~24,000 |
| 자소서 첨삭 | ₩20,000~50,000 | ₩4,000~10,000 | ₩16,000~40,000 |
| 면접 리포트 피드백 | ₩30,000~80,000 | ₩6,000~16,000 | ₩24,000~64,000 |

> 가격은 전문가 자율 설정. 플랫폼은 가이드 레인지만 제시.
> 수수료율 20%는 시작값. 숨고(10~25%) · 코멘토(30%) · 크몽(20%) 벤치마크.

### 5.4 무료 정책 (전환 깔때기)

- 가입 보너스: 30C (1회성, 약 1~2회 면접 가능)
- 매월 무료: 10C (영구)
- 영구 무료: 채용공고 조회, 기본 이력서 작성

### 5.5 수익 시뮬레이션 (Phase 2 6개월차 가정)

가정:
- DAU 500명 / MAU 5,000명
- 유료 전환율 5% (= 250명 유료)
- ARPU (Free→Paid): ₩15,000/월
- 마켓 의뢰: 월 200건 × 평균 ₩40,000

```
B2C 매출:        250 × 15,000 =  ₩3,750,000/월
마켓 수수료:     200 × 8,000  =  ₩1,600,000/월
─────────────────────────────────────────
월 매출 합계:                    ₩5,350,000
연 매출(추정):                   ₩64,200,000
```

→ Phase 3 (12~18개월) 사용자 10배 시 연 매출 5~6억 가능.

---

## 6. 핵심 기능

### 6.1 구직자 측 (user-web)

| 기능 | 설명 | 결제 |
|---|---|---|
| 회원가입 / 소셜 로그인 | Supabase Auth → Spring Security JWT 마이그레이션 | 무료 |
| 이력서 작성 / 관리 | AI 어시스트 + 한국식 A4 템플릿 + PDF 출력 | 무료 |
| 자소서 작성 / 관리 | 문항-답변 구조, AI 어시스트 | 일부 유료 |
| 채용공고 조회 | 직군별 큐레이션 | 무료 |
| AI 모의면접 (텍스트) | 5문항 구조, 회사 맞춤 | 3C |
| AI 모의면접 (음성) | VAD + STT + TTS, 7분 | 8C |
| 포트폴리오 방어 면접 | (장기 검토, Phase 3) | 15C |
| 면접 리포트 | 강점/개선/다음 액션 + 가중 점수 | 자동 포함 |
| 면접 비교 분석 | 이전 회차와 diff | 5C |
| 전문가 첨삭 의뢰 | 마켓 진입 + 데이터 공유 + 결제 | ₩15~80K |
| 의뢰 진행 추적 | 상태 알림 + 피드백 수령 | 무료 |
| 평점 · 후기 작성 | 의뢰 완료 후 | 무료 |

### 6.2 전문가 측 (expert-web)

| 기능 | 설명 |
|---|---|
| 전문가 입점 신청 | 자격 증빙 업로드, 본인 인증 |
| 심사 진행 추적 | 운영팀 검토 상태 |
| 프로필 / 상품 등록 | 제공 서비스, 가격, 처리시간(SLA) |
| 의뢰함 (대시보드) | 신규/진행/완료 |
| 사용자 데이터 조회 | 마스킹된 뷰어로만 (다운로드 X, TTL 30일) |
| 피드백 작성 도구 | 인라인 코멘트 + 종합평 |
| 정산 내역 | 월별 매출/수수료/입금 |
| 평점 / 후기 관리 | 본인 평점 추이 |
| 승급 트랙 | Verified → Pro → Expert |

### 6.3 관리자 측 (admin-web)

| 기능 | 설명 |
|---|---|
| 전문가 심사 콘솔 | 신청 검토 + 승인/거절 |
| 분쟁 중재 | 의뢰 disputed 처리 |
| 통계 대시보드 | DAU/MAU/MRR/의뢰 처리율 |
| 정산 관리 | 월별 일괄 송금 검토 |
| 사용자 관리 | 신고 처리, 정지 |
| 콘텐츠 큐레이션 | 채용공고, 메인 노출 전문가 |

---

## 7. 사용자 플로우

### 7.1 구직자 여정 (End-to-End)

```
[가입]
   │  소셜로그인 (Kakao 우선)
   ▼
[온보딩]
   │  관심 직군 + 목표 회사
   ▼
[이력서·자소서 작성]
   │  AI 어시스트로 초안
   ▼
[채용공고 선택 or 자기 이력서 기반]
   │
   ▼
[AI 모의면접 진행]
   │  음성/텍스트 선택, 7분
   ▼
[리포트 자동 생성]
   │  강점·개선·다음 액션
   ▼ ─────── 분기 ────────┐
   │                       │
[자기 학습]              [전문가 피드백 받기]
   │                       │
   │                       ▼
   │                  [마켓플레이스]
   │                       │  카테고리·평점·가격 필터
   │                       ▼
   │                  [전문가 선택]
   │                       │
   │                       ▼
   │                  [결제 + 데이터 공유 동의]
   │                       │
   │                       ▼
   │                  [전문가 피드백 작성 대기]
   │                       │  24~72h
   │                       ▼
   │                  [피드백 수령 + 확인]
   │                       │
   │                       ▼
   │                  [평점 · 후기]
   │                       │
   └───────────────────────┘
              ▼
        [재면접 / 다음 회사]
```

### 7.2 전문가 여정

```
[입점 신청]
   │  이력·자격 증빙 업로드
   ▼
[운영팀 심사]
   │  1~3일
   ▼
[승인 → 프로필 설정]
   │  서비스 상품 등록 (이력서/자소서/면접)
   ▼
[디렉토리 노출]
   │  검색·필터·평점 기반 정렬
   ▼
[의뢰 수신 알림]
   │  이메일 + 인앱
   ▼
[24h 내 수락]
   │  미수락 시 자동 환불
   ▼
[사용자 데이터 조회]
   │  마스킹 뷰어, 다운로드 X
   ▼
[피드백 작성]
   │  72h 내 제출
   ▼
[사용자 확인 + 평점]
   │
   ▼
[월 단위 정산]
   │  플랫폼 수수료 20% 차감 후 입금
```

### 7.3 의뢰 라이프사이클 (상태 머신)

```
CREATED ──────► ASSIGNED ──────► IN_PROGRESS ──────► SUBMITTED
   │              │                  │                    │
   │              │                  │                    ▼
   │              │                  │              COMPLETED ──► SETTLED
   │              │                  │                    
   │              │                  ▼                    
   │              │             REFUNDED              DISPUTED
   │              ▼                                       │
   │         REFUNDED (24h 미수락)                       ▼
   ▼                                                 운영팀 중재
REFUNDED (결제 실패)
```

**SLA & 자동 처리**:
- 전문가 미수락 24h → 자동 환불
- 피드백 미제출 72h → 자동 환불 + 전문가 페널티
- 사용자 미확인 7일 → 자동 완료 처리
- 분쟁 시 → 운영팀 중재 (최대 5영업일)

---

## 8. 마켓플레이스 메커니즘

### 8.1 전문가 검증 — 하이브리드

**Gate (기본 심사)** — 운영팀 1~3일 처리
- 최소 요건: 경력 3년 이상 OR 자격증 OR 추천인 1명
- 필수 제출: 이력서, 본인 인증, 분야 증빙
- 거절 시 사유 통보 + 6개월 후 재신청 가능

**Ongoing (평점 시스템)**
- 사용자가 5점 척도 + 텍스트 후기
- 평점 4.0 미만 누적 시 운영팀 검토
- 평점 3.0 미만 또는 신고 3건 시 정지

**승급 트랙**
| 등급 | 조건 | 혜택 |
|---|---|---|
| Verified | 기본 심사 통과 | 디렉토리 노출 |
| Pro | 평점 4.5+ & 누적 50건+ | 검색 상단, 수수료 1%p ↓ |
| Expert | 평점 4.8+ & 누적 200건+ | 메인 노출, 수수료 2%p ↓ |

### 8.2 피드백 형태 — 텍스트 (데이터별 구조화)

| 상품 | 피드백 구조 |
|---|---|
| 이력서 첨삭 | 섹션별(경력/학력/스킬) 인라인 코멘트 + 종합평 |
| 자소서 첨삭 | 문항별 인라인 코멘트 + 리라이트 제안 |
| 면접 리포트 피드백 | 질문별 인라인 코멘트 + 다음 액션 추천 |

> 화상/음성 피드백은 Phase 3 이후 검토.

### 8.3 데이터 공유 권한

- 의뢰 생성 시 사용자가 명시적 동의 ("이 전문가에게 [데이터] 공유")
- TTL: 의뢰 완료 + 30일 후 자동 회수
- 마스킹된 뷰어로만 열람 (다운로드 · 스크린샷 방지)
- 사용자가 언제든 즉시 회수 가능
- 전문가 측 PII는 추가 마스킹 (전화·주소·주민번호 자동 가림)

### 8.4 정산

- **주기**: 월 1회 (매월 1일 전월 정산 송금)
- **유보**: 의뢰 완료 후 7일간 보류 (분쟁 대비)
- **세금**: 사업소득 3.3% 원천징수 (전문가 사업자 등록 시 세금계산서 발행)
- **최소 정산금**: ₩50,000 (이하는 이월)

---

## 9. 시스템 아키텍처

### 9.1 전체 구조도

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Monorepo - Turborepo + pnpm)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  user-web    │  │  expert-web  │  │  admin-web   │      │
│  │ dibut.com    │  │ expert.dibut │  │ admin.dibut  │      │
│  │ Next.js 14   │  │ Next.js 14   │  │ Next.js 14   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                 │
│  packages/                 │                                 │
│   - ui  - types - auth     │                                 │
│   - api-client - config    │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │ REST + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Spring Boot 3 (Kotlin) — 메인 백엔드                        │
│  api.dibut.com                                               │
│  ──────────────────────────────────────                     │
│  Modular Monolith (9 modules)                               │
│    auth · user · resume · coverletter · interview           │
│    expert · order · feedback · payment · notification       │
│  ──────────────────────────────────────                     │
│  Spring Security + JWT + Redis 세션                         │
│  JPA + Querydsl                                              │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──► MySQL 8 (RDS Multi-AZ, ap-northeast-2)
             ├──► Redis (ElastiCache, 캐시·세션·분산락)
             ├──► S3 (이력서 PDF, 첨부파일)
             │
             └──► FastAPI AI Interview Service (사이드카)
                  - WebSocket 음성 처리는 사용자 직접 연결
                  - 텍스트 API는 Spring이 프록시
                  - Gemini + OpenAI STT/TTS 연동

[Infra - AWS Seoul ap-northeast-2]
  Route53 + ACM + CloudFront + ALB
  ECS Fargate (Spring × 2 + FastAPI × 1)
  RDS MySQL Multi-AZ
  ElastiCache Redis
  S3 + CloudWatch + Secrets Manager
  GitHub Actions → ECR → ECS rolling deploy

[External]
  Toss Payments (결제 + 정산)
  Gemini API (LLM)
  OpenAI (STT/TTS)
  Kakao OAuth (소셜로그인)
  AWS SES (이메일)
  Sentry (에러 추적)
```

### 9.2 멀티앱 분리 전략

| 앱 | 도메인 | 역할 | 접근 제한 |
|---|---|---|---|
| user-web | dibut.com | 구직자 메인 | 누구나 |
| expert-web | expert.dibut.com | 전문가 전용 | 승인된 전문가만 |
| admin-web | admin.dibut.com | 운영팀 | IP 화이트리스트 + 2FA |
| api (backend) | api.dibut.com | Spring API | JWT 인증 |

**왜 서브도메인 분리?**
- 쿠키/세션 격리 → 보안 ↑
- 마케팅 페이지 분리
- 차후 모바일 앱 추가 시 OAuth 도메인 명확
- 빌드 독립 → 작업 충돌 ↓

### 9.3 AI 사이드카 패턴

Spring은 메인 백엔드, FastAPI는 AI 전용 사이드카.

**이유**:
- Python = AI 라이브러리 압도적 (Gemini SDK, OpenAI, transformers)
- Kotlin/Spring = AI 모델 호출은 가능하나 생태계 빈약
- 이미 작동하는 25K LOC FastAPI 코드 재활용
- "MSA 사이드카 패턴 적용 경험"이 포트폴리오 어필 포인트

**통신 방식**:
- 텍스트 API: Spring WebClient로 FastAPI 호출 (동기/비동기)
- 음성 WS: 사용자 ↔ FastAPI 직접 (latency 최소화), Spring은 세션 메타만 관리
- 이벤트: 면접 종료 시 FastAPI → Spring 콜백 (리포트 저장)

---

## 10. 기술 스택

### 10.1 백엔드 (메인)

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| 언어 | **Kotlin** | 모던 한국 기업(토스/당근/카뱅) 표준 |
| 프레임워크 | **Spring Boot 3** | 한국 채용시장 절대 표준 |
| ORM | **Spring Data JPA + Querydsl** | 한국 특화, 동적 쿼리 |
| 보안 | **Spring Security + JWT** | 표준 |
| 빌드 | Gradle (Kotlin DSL) | 표준 |
| 테스트 | JUnit5 + Mockito + **Testcontainers** | 통합테스트 표준 |
| API 문서 | SpringDoc OpenAPI 3 | Swagger UI 자동 |
| 검증 | Bean Validation + Custom Annotation | 표준 |
| 직렬화 | Jackson + Kotlin module | 표준 |

### 10.2 백엔드 (AI 사이드카, 유지)

| 영역 | 기술 |
|---|---|
| 언어 | Python 3.12 |
| 프레임워크 | FastAPI 0.116 + Uvicorn |
| LLM | Google Gemini 2.5 Flash |
| 음성 | Gemini Live STT/TTS + OpenAI TTS |
| DB 접근 | psycopg (메타만 Spring과 공유) |

### 10.3 프론트엔드

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| 프레임워크 | **Next.js 14** (App Router) | 한국 표준, SEO·SSR |
| 언어 | TypeScript 5 (strict) | 표준 |
| 모노레포 | **Turborepo + pnpm** | 빌드 캐시 10배 |
| UI | shadcn/ui + Tailwind CSS | 디자인 시스템 표준 |
| 상태 | Zustand + TanStack Query | 표준 |
| 폼 | React Hook Form + Zod | 표준 |
| 에디터 | TipTap (이력서/자소서) | 가볍고 확장 가능 |

### 10.4 데이터 / 인프라

| 영역 | 기술 |
|---|---|
| RDB | **MySQL 8.0** (한국 표준) |
| 캐시·세션·락 | **Redis 7** (ElastiCache) |
| 객체 스토리지 | **AWS S3** (이력서·첨부) |
| 메시징 (Phase 1) | Spring Application Events |
| 메시징 (Phase 2) | **Kafka** (Amazon MSK) |
| 검색 (Phase 2) | OpenSearch (전문가 검색) |
| 컨테이너 | Docker |
| 오케스트레이션 (Phase 1) | **ECS Fargate** |
| 오케스트레이션 (Phase 3) | EKS |

### 10.5 클라우드 — AWS Seoul (ap-northeast-2)

| 서비스 | 용도 |
|---|---|
| ECS Fargate | Spring + FastAPI 컨테이너 |
| RDS MySQL | DB Multi-AZ |
| ElastiCache Redis | 캐시·세션 |
| S3 | 객체 스토리지 |
| CloudFront | CDN |
| Route53 | DNS |
| ACM | SSL 인증서 |
| ALB | 로드 밸런서 |
| Secrets Manager | 비밀 관리 |
| CloudWatch | 로그·메트릭 |
| SES | 이메일 발송 |
| ECR | 도커 이미지 레지스트리 |

### 10.6 외부 서비스

| 서비스 | 용도 |
|---|---|
| **Toss Payments** | 결제 + 정기결제 + 정산 |
| **Kakao OAuth** | 소셜로그인 (1차) |
| Google OAuth | 소셜로그인 (2차) |
| **Sentry** | 에러 트래킹 |
| Better Stack | Uptime + 로그 |
| **Cloudflare** | DNS + WAF + DDoS (앞단 프록시) |

### 10.7 개발 도구 / CI·CD

| 영역 | 도구 |
|---|---|
| 소스 관리 | GitHub |
| CI/CD | GitHub Actions |
| 정적 분석 | ktlint + detekt (백엔드), ESLint + Prettier (프론트) |
| 의존성 검사 | Dependabot + OWASP Dependency Check |
| 비밀 누출 | gitleaks (pre-commit) |
| API 명세 | OpenAPI 3.0 + Stoplight |
| 디자인 | Figma |

---

## 11. 데이터 모델

### 11.1 ERD 개요

```
              ┌─────────┐
              │ profiles│ (Supabase Auth 연동)
              │ user_type│
              └────┬────┘
                   │
       ┌───────────┼───────────┬──────────────┐
       │           │           │              │
       ▼           ▼           ▼              ▼
   ┌─────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐
   │ resumes │ │cover_letters│ │ experts │ │ orders   │
   └─────────┘ └────────────┘ └────┬────┘ │ (buyer/  │
                                   │      │  expert) │
                                   ▼      └────┬─────┘
                              ┌──────────┐     │
                              │ services │     │
                              └──────────┘     ▼
                                         ┌──────────┐
                                         │ feedback │
                                         └──────────┘
                                              │
                                              ▼
                                         ┌──────────┐
                                         │ reviews  │
                                         └──────────┘

   ┌──────────────────┐    ┌──────────────────┐
   │ interview_sessions│   │ credit_wallets   │
   │ interview_turns   │   │ credit_ledger    │
   │ interview_reports │   │ billing_orders   │
   └──────────────────┘    └──────────────────┘
```

### 11.2 주요 엔티티 (JPA · Kotlin 개념도)

```kotlin
// 사용자 도메인
profiles { id, user_type('seeker'|'expert'|'admin'), nickname, ... }

// 콘텐츠
user_resumes { id, user_id, title, payload(JSON), is_active }
user_cover_letters { id, user_id, title, items(JSON: [{question, answer}]) }

// 면접 (Spring과 FastAPI 공유)
interview_sessions { id, user_id, mode, status, target_duration, planned_questions, ... }
interview_turns { id, session_id, turn_index, role, content, ... }
interview_reports { session_id, report_payload(JSON) }

// 전문가 도메인
experts { user_id, status, tier, categories[], bio, avg_rating, total_orders }
expert_services { id, expert_id, service_type, title, price_krw, delivery_hours, active }

// 의뢰
orders {
  id, buyer_id, expert_id, service_id, status,
  amount_krw, fee_krw, payout_krw,
  shared_resource_type, shared_resource_id, share_expires_at,
  created_at, completed_at, settled_at
}
order_feedback { order_id, structured_payload(JSON), overall_comment }
reviews { order_id UNIQUE, rating(1-5), comment }

// 결제
billing_orders { id, user_id, type, amount_krw, status, pg, pg_payment_key, idempotency_key }
billing_subscriptions { user_id UNIQUE, plan_id, status, billing_key, period_start/end }
credit_wallets { user_id, balance, reserved, version }
credit_ledger { id, user_id, delta, balance_after, reason, ref_type, ref_id, expires_at }
```

### 11.3 핵심 비즈니스 룰

- **credit_ledger는 불변 append-only** — 잔액은 ledger 합산으로 항상 검증 가능
- **wallet 잔액 변경은 항상 SERIALIZABLE 트랜잭션 또는 SELECT FOR UPDATE**
- **모든 결제·차감은 idempotency_key UNIQUE 제약**으로 중복 방지
- **orders.status는 상태 머신 강제** — 직접 UPDATE 금지, 도메인 메서드만 사용

---

## 12. 보안 · 개인정보 · 규제

### 12.1 인증·인가

- Spring Security + JWT (Access 15분 + Refresh 14일, Rotation)
- Refresh Token = Redis 저장 (탈취 감지 시 즉시 무효화)
- 소셜 로그인: OAuth 2.0 (Kakao 우선, Google 차후)
- RBAC: `seeker | expert | admin` + `@RequireRole` 어노테이션
- admin-web: Cloudflare Access (IP + SSO) 추가 보호

### 12.2 개인정보 보호

| 데이터 | 처리 |
|---|---|
| 이메일·전화 | DB 저장 시 암호화 (Application-level AES) |
| 주민번호 | **수집 안 함** |
| 이력서 PDF | S3 SSE-KMS 암호화 + 사용자 삭제 시 즉시 폐기 |
| 면접 녹음 | S3 30일 lifecycle 자동 삭제 |
| 결제 카드 | **저장 안 함** (Toss billingKey만) |
| 로그 | PII 마스킹 (Sentry beforeSend) |

### 12.3 데이터 공유 권한

- 전문가에게 공유 시 명시적 동의 + 마스킹 뷰어
- 다운로드 / 스크린샷 / 인쇄 방지 (워터마크 + 화면녹화 감지)
- TTL: 의뢰 완료 + 30일 자동 회수
- 사용자 언제든 즉시 회수 가능
- 회수 후 전문가 측 캐시도 무효화

### 12.4 결제 규제

- 전자상거래법 준수: 이용약관 + 환불정책 명시
- 부가세 10% 포함 표시 (B2C)
- 전자금융감독규정: 결제 데이터는 한국 리전(AWS Seoul) 처리
- PCI-DSS: 카드 데이터 자체 저장 X, Toss 토큰화 사용
- 전문가 정산: 사업소득 3.3% 원천징수 + 연말 지급명세서

### 12.5 차별금지·공정채용

- 면접 질문 정규식 필터 (기존 코드 자산)
  - 결혼·임신·종교·나이·출신·외모·병역·가족 차단
- 공공기관 진입 시 NCS 블라인드 채용법 추가 가이드 적용
- 신고 시스템: 사용자가 부적절 피드백 신고 가능

---

## 13. 개발 로드맵

### Phase 0: 검증 (현재 ~ 1개월)

> "코드 진입 전 시장 검증"

- [x] BM/검증/피드백 형태 의사결정 잠금
- [ ] 사용자 인터뷰 5명 (구직자) — 지불 의향 확인
- [ ] 전문가 인터뷰 5명 — 입점 의향 확인
- [ ] 경쟁 매트릭스 1장 (코멘토·잡다·숨고·크몽·뤼튼)
- [ ] 랜딩페이지 + 이메일 수집 (Notion·Carrd·Framer)
- [ ] 유닛 이코노믹스 시트 (원가/마진/LTV/CAC)
- [ ] 베타 전문가 5~10명 사전 영입

**Phase 1 진입 OK 신호**: 사용자 5명 중 3명 + 전문가 5명 중 3명 "의향 O".

### Phase 1: 학습 + 기반 (1 ~ 4개월)

**1~2개월: Spring/Kotlin 학습**
- Kotlin 기초 → Spring Boot → JPA → Querydsl
- Security · 트랜잭션 · 테스트 · AWS 배포

**3~4개월: 기반 구축**
- 새 Monorepo (Turborepo + Next.js × 3 + Spring)
- 인증 (Spring Security + JWT + Kakao OAuth)
- 이력서 + 자소서 도메인 (AI 어시스트 포함)
- AI 면접 FastAPI 연동 (사이드카)
- 기본 인프라 (AWS Seoul, RDS, ECS, S3)

**산출물**: 구직자가 이력서 쓰고 AI 면접 보는 흐름 동작.

### Phase 2: 마켓플레이스 MVP (4 ~ 7개월)

- 전문가 도메인 (입점 → 심사 → 프로필 → 상품)
- 의뢰 라이프사이클 (생성 → 매칭 → 피드백 → 완료)
- 권한 기반 데이터 공유 (TTL · 마스킹 뷰어)
- 결제 (Toss 단건 + 멱등성 + 분산락)
- 평점 · 후기 · 자동 정산
- 운영 콘솔 (admin-web)
- 알림 (이메일 · 인앱)

**산출물**: 양면 마켓 거래 가능, 베타 오픈.

### Phase 3: 성장 (7 ~ 12개월)

- 직군 확장: PM/디자이너/데이터/마케팅
- 전문가 승급 트랙 (Pro/Expert)
- B2C 구독 (Starter/Pro) + 크레딧 이월
- 검색 강화 (OpenSearch)
- 분쟁 자동화
- 광고 마케팅 (퍼포먼스)

### Phase 4: 스케일 (12개월 +)

- 공공/공기업 NCS 트랙 진입
- B2B 학교/부트캠프 패키지
- 음성/화상 피드백 옵션
- Kafka 이벤트 버스 도입
- 다국어 (영어 → 글로벌)

---

## 14. KPI 및 성공 지표

### 14.1 North Star Metric

> **월간 의뢰 완료 건수** (Completed Orders / Month)

→ 사용자 활성도 + 전문가 가동률 + 매출을 한 번에 반영.

### 14.2 Phase별 목표

| 지표 | Phase 1 종료 | Phase 2 종료 | Phase 3 종료 |
|---|---|---|---|
| 가입 사용자 | 500 | 5,000 | 30,000 |
| MAU | 100 | 1,000 | 8,000 |
| 유료 전환율 | - | 3% | 5% |
| 활성 전문가 | - | 30 | 200 |
| 월 의뢰 완료 | - | 100 | 800 |
| MRR (B2C) | 0 | ₩500K | ₩5M |
| 마켓 수수료/월 | 0 | ₩800K | ₩6.4M |
| **월 매출 합계** | 0 | **₩1.3M** | **₩11.4M** |

### 14.3 운영 KPI

| 지표 | 목표 |
|---|---|
| 의뢰 수락률 | > 80% |
| 평균 응답 시간 | < 24h |
| 평점 평균 | > 4.3 |
| 분쟁 비율 | < 3% |
| 환불률 | < 5% |
| Sentry 에러율 | < 0.1% |
| API p95 latency | < 500ms |
| AI 면접 latency (음성) | < 1s |

---

## 15. 리스크 및 대응

### 15.1 사업 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| 콜드 스타트 (양쪽 다 부족) | High | Phase 0에 전문가 5~10명 수기 영입 |
| 전문가 이탈 (수수료 불만) | High | 시작 15% → 누적 후 20% 조정, 승급 시 수수료 ↓ |
| 사용자 지불 거부 | High | 무료 체험 충분히 제공 (가입 보너스 30C) |
| 큰 경쟁자 진입 (코멘토 AI 추가) | Medium | 데이터·UX 우위 + 직군 확장 속도 |
| 법적 분쟁 (피드백 품질) | Medium | 이용약관 + 환불 정책 + 운영팀 중재 SLA |

### 15.2 기술 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| Spring/AWS 학습 부족 | High | Phase 1 학습 기간 확보 + 인프런 강의 + 멘토 |
| AI 면접 안정성 | Medium | 세션 복구 로직 강화 + Sentry 모니터링 |
| 결제 장애 (Toss) | High | PortOne 백업 + Webhook DLQ + 멱등성 키 |
| DB 동시성 (정산) | Medium | Redis 분산락 + Serializable 트랜잭션 |
| AWS 비용 폭증 | Medium | 매주 비용 모니터링 + 예산 알림 + NAT 인스턴스 |

### 15.3 운영 리스크

| 리스크 | 대응 |
|---|---|
| 전문가 부적절 행동 (개인정보 유출) | 마스킹 뷰어 + 다운로드 차단 + 적발 시 즉시 정지 + 법적 조치 |
| 사용자 어뷰징 (가짜 평점) | 의뢰 완료 후만 평점 가능 + 패턴 탐지 |
| 분쟁 폭증 | 운영팀 5영업일 중재 SLA + 자동 환불 기준 명확화 |

---

## 16. 마이그레이션 전략

### 16.1 기존 코드 처리

**제거 (Archive 브랜치 보존)**
- `workspace-server/` 전체
- `web/app/workspace/*`, `web/app/api/workspace/*`
- `web/app/career/portfolios/*`, 관련 API 라우트
- `web/app/community/*` (스쿼드/게시판/티어)
- `crawler/` 전체
- 관련 Prisma 모델 · Supabase 테이블

**보존 (참고용으로만)**
- `web/app/resume/*` — Next.js 새 monorepo로 UI 이식
- `web/app/interview/*` — UI 컴포넌트 참고
- `web/components/features/resume/ResumeAiAssistant.tsx` — 로직 참고

**그대로 활용**
- `ai-interview/` 전체 — 새 repo에 복사 후 사용

### 16.2 빅뱅 vs 점진 — 빅뱅 선택

근거:
- 기술 스택 자체가 변경 (Next.js BFF → Spring)
- DB 마이그레이션 필요 (Supabase → AWS RDS MySQL)
- 도메인 자체가 변경 (협업 → 마켓플레이스)
- 점진은 일관성 ↓ 시간 ↑

진행:
- 새 repo `dibut-v2` 생성 (Monorepo + Spring)
- 기존 repo는 졸업작품 시연용으로 동결
- 데이터 마이그레이션 X (Phase 0 ~ 1은 사용자 0명 가정)

### 16.3 Phase 0 동시 진행

코드 학습/구축과 병행:
- 사용자/전문가 인터뷰 (마케팅·CS 인력이 진행)
- 베타 전문가 수기 영입 (5~10명)
- 랜딩페이지 (이메일 수집)
- 경쟁 분석 문서

---

## 17. 결정 잠금 사항 / 미결 사항

### 17.1 잠금 (확정)

| 항목 | 결정 |
|---|---|
| 제품 방향 | AI 면접 + 전문가 마켓플레이스 |
| BM | B2C 크레딧 + 마켓 수수료 병행 |
| 전문가 검증 | 하이브리드 (기본심사 + 평점) |
| 피드백 형태 | 텍스트만, 데이터별 구조화 |
| 수수료율 시작값 | 20% |
| 응답 SLA | 24h 수락 / 72h 제출 |
| 데이터 공유 TTL | 의뢰 완료 + 30일 |
| 백엔드 | Kotlin + Spring Boot 3 + JPA + Querydsl |
| 프론트엔드 | Next.js 14 Monorepo (3 apps) |
| DB | MySQL 8 + Redis |
| 클라우드 | AWS Seoul (ap-northeast-2) |
| AI 처리 | FastAPI 사이드카 유지 |
| 결제 | Toss Payments |
| 진행 방식 | 빅뱅 재작성, 새 repo |
| 워크스페이스 | 제거 |
| 포트폴리오 도메인 | 제거 |

### 17.2 미결 (다음 라운드 결정)

- [ ] **브랜드** — Dibut 유지 vs 리네이밍 (Phase 1 시작 전 결정)
- [ ] **1차 진입 직군** — 개발자 우선 vs 동시 오픈 N개
- [ ] **수수료율 조정** — 20% 고수 vs 초기 15% 인센티브
- [ ] **환불 정책 디테일** — 부분환불 조건
- [ ] **정산 주기** — 월 1회 vs 격주
- [ ] **B2C 크레딧 ↔ 마켓 결제 통합** — 크레딧으로 전문가 결제 가능 여부
- [ ] **세금 처리** — 원천징수 자동화 시점
- [ ] **로고/디자인 시스템** — 별도 디자이너 영입 필요

---

## 18. 부록

### 18.1 용어 정의

| 용어 | 정의 |
|---|---|
| **구직자 (Seeker)** | AI 면접·이력서·자소서 작성을 이용하는 사용자 |
| **전문가 (Expert)** | 마켓플레이스에 입점한 첨삭 제공자 |
| **의뢰 (Order)** | 구직자가 전문가에게 첨삭을 요청한 단건 |
| **크레딧 (Credit)** | B2C 기능 사용 시 차감되는 가상 화폐 (1C = ₩100) |
| **트랙 (Track)** | 직군별 면접 평가 체계 (개발자/마케팅/디자인 등) |
| **루브릭 (Rubric)** | 면접 평가 기준 (역량별 가중치) |
| **페르소나 (Persona)** | 면접관의 톤·스타일 (friendly/professional/cold) |
| **SLA** | Service Level Agreement (응답·처리 시간 약속) |
| **TTL** | Time To Live (권한 유효 기간) |
| **ledger** | 크레딧 변동 불변 원장 (append-only) |

### 18.2 참고 문서

- 기존 시스템 분석: `docs/FSD_ARCHITECTURE_AUDIT_2026-04-11.md`
- 인터뷰 UI 리팩토링: `docs/interview-ui-refactor-plan.md`
- 프로젝트 핸드오버: `PROJECT_HANDOVER_KR.md`

### 18.3 외부 참조

- Toss Payments 개발자 문서: https://docs.tosspayments.com
- Spring Boot 3 Reference: https://docs.spring.io/spring-boot/
- Querydsl Reference: http://querydsl.com/static/querydsl/latest/reference/html_single/
- AWS Korea 리전 가이드: https://aws.amazon.com/ko/local/seoul/
- 김영한 JPA 강의 (인프런)

### 18.4 다음 단계 산출물 (Phase 0 완료 후)

이 기획서를 기반으로 작성될 후속 문서:

1. **ERD 상세** — JPA 엔티티 + DB 인덱스 전략
2. **API 명세** — OpenAPI 3.0 (전 엔드포인트)
3. **인프라 IaC** — Terraform 모듈 (AWS Seoul)
4. **보안 가이드** — JWT 정책 + RLS + 비밀 관리
5. **UI/UX 디자인 시스템** — Figma + shadcn 커스터마이징
6. **운영 룬북** — 장애 대응 + 분쟁 중재 SOP
7. **마케팅 플랜** — 채널별 GTM + 캠페인 KPI

---

> **이 기획서는 Phase 0 검증(사용자/전문가 인터뷰) 결과에 따라 조정될 수 있습니다.**
> 결정 잠금 사항이라도 검증 신호가 명확히 부정적이면 재논의합니다.
