# 리치 리포트 — 인프라 재사용 · 셋업 · 확장 가이드

> Plan ②(분석) 착수 전 인프라 결정 기록. 원칙: **기존 인프라(Vercel + Render 무료 + Supabase + Vertex) 최대 재사용, 데모용 신규 서비스/키 0개.** 시연은 전부 로컬.

## 1. 핵심 결정 — Gemini는 "영상" 아닌 "텍스트(transcript)" 분석

| 분석 | 방식 | 인프라 | 비고 |
|---|---|---|---|
| 답변 내용 피드백/개선포인트 | **Gemini 텍스트**(STT transcript) — 기존 `analyze_interview` 패턴 클론 | **기존 Vertex**(ai-interview) | GCS·영상·새 키 **불필요** |
| 시선·표정·머리자세 | **클라이언트 MediaPipe**(자가호스팅 에셋) | 없음(브라우저) | 원시프레임 미전송, 집계만 |
| 신호 저장 | Supabase(`interview_eval_signals` + 신규 `interview_recording_signals`) | 기존 Supabase | JSONB |
| 분석 실행 | 기존 리포트 잡 워커 확장(`reporting/agent.py`) | 기존 Render FastAPI | 새 서비스 없음 |

→ **Gemini 영상이해(얼굴 인상 등)는 의도적으로 데모에서 제외.** 그건 Vertex가 gs://를 선호해 GCS가 필요한 유일한 항목이라 **확장 단계(§4)로 미룸**. MediaPipe가 시선·표정을 이미 커버하므로 데모엔 충분.

## 2. "따로 설정해야 하는 것" — 결론: 신규 키/서비스 없음

검증(코드 recon): `ai-interview`엔 GCS/Files API/`from_uri`/`response_schema` 전무. Gemini는 `app/services/vertex_genai.py` → `build_vertex_genai_client(vertexai=True)` 로 동작.

데모 동작에 필요한 것(전부 이미 보유):
- **Vertex 자격** (ai-interview/.env): `GOOGLE_GENAI_USE_VERTEXAI=true` + 자격증명(`GOOGLE_APPLICATION_CREDENTIALS` 파일 또는 `GEMINI_SERVICE_ACCOUNT_JSON_BASE64`) + `GOOGLE_CLOUD_PROJECT`. 모델 `GEMINI_MODEL`(기본 `gemini-3.5-flash`)·`GOOGLE_CLOUD_LOCATION`(기본 us-central1) 기본값. **→ 이미 세팅됨, 추가 불필요.**
- **web/.env** (로컬): Supabase(URL/anon/service-role) + `DATABASE_URL`/`DIRECT_URL` + `AI_INTERVIEW_BASE_URL=http://localhost:8001` + LiveKit. (Vertex 키는 web 아님 — ai-interview에 있음.)

데모 위해 **새로 해야 하는 일(코드/파일/스키마, 키 아님)**:
1. **MediaPipe 에셋 자가호스팅**: `@mediapipe/tasks-vision@0.10.35`의 WASM + `face_landmarker.task`(~3.7MB)를 `web/public/mediapipe/`에 두고 `next.config.mjs`에 immutable 캐시 헤더 추가(기존 `/libs/`·`/workers/` 패턴 미러). COEP/COOP 불필요(싱글스레드 WASM).
2. **DDL 추가(가산형)**: `interview_recording_signals`(시계열) — `init_db()`로 적용(Slice 1 패턴). 기존 `interview_eval_signals`는 그대로 사용(현재 호출자 0 = 클린 슬레이트).
3. 로컬 `.env` 2개(web/ai-interview) 존재 확인 — 이미 보유.

→ **추가 API 키·외부 서비스·결제 설정: 없음.** Gemini 텍스트 호출은 회당 수 센트(GCP 크레딧).

## 3. 무료 플랜 한계 — 데모에서 괜찮은가 (괜찮음)

| 서비스 | 무료 한계 | 데모 영향 |
|---|---|---|
| Vercel(web) | 서버리스 body 4.5MB | ✅ 무관(녹화 업로드는 클라→Supabase signed URL, web 우회) |
| Render(ai-interview) | 15분 미사용 스핀다운·512MB | ⚠️ 워커 콜드스타트 가능 → 분석은 비동기 잡이라 OK. **MediaPipe는 클라이언트라 Render CPU 0** |
| Supabase | 저장 1GB·egress 5GB·DB 500MB | ✅ 시계열 ~300KB/세션(JSONB) 미미. 영상만 용량주의(정리) |
| Vertex Gemini | GCP 크레딧 | ✅ 텍스트 분석 회당 센트 |
| 로컬 시연 | — | ✅ 전부 로컬 실행 → 무료한계 사실상 무관 |

## 4. 확장 가이드 (실사용·스케일 시)

무료/로컬을 벗어날 때 단계별:

1. **Render 무료 → 상시가동**: Render Starter($7+) 또는 FastAPI를 ECS Fargate/Fly로. 리포트 워커 신뢰성(스핀다운 제거). 무거운 영상 분석을 넣을 땐 별도 워커/큐(SQS) 분리.
2. **Supabase Storage 1GB → S3/GCS + CDN**: 영상 누적 시. (Slice 1 S3 설계 재사용: presigned 업로드 유지, 버킷만 교체.) DB 시계열이 세션당 1MB 초과로 커지면 시계열을 Storage blob(gzip)로 이전.
3. **Gemini 영상이해 추가(얼굴 인상 정밀)**: Vertex는 gs:// 필요 → **GCS 버킷 신설**(Vertex와 동일 GCP 프로젝트), 워커가 녹화본 1회 복사 → 단일 gs:// URI에 `VideoMetadata(start_offset/end_offset)` 로 답변별 호출(`media_resolution=LOW`, 90초 ~$0.005). 이게 **유일하게 새 인프라 필요한 항목** — 데모엔 미적용.
4. **MediaPipe 성능(저사양)**: 5Hz·GPU delegate·실패 시 graceful degrade. 대규모면 캡처율 조정.
5. **DB**: `interview_recording_signals` 행 증가 시 인덱스/보관정책. eval_signals에 per-answer 참조 필요하면 컬럼 추가(turn_id/exchange_index).
6. **LiveKit Egress**: 서버사이드 녹화가 필요해지면(현재 MediaRecorder로 회피). 무료 60분/월 한계 유의.

## 5. Plan ② 서브슬라이스 (이 가이드 기반)
- **②a (지금·신규인프라 0)**: 답변별 **Gemini 텍스트 콘텐츠 분석**(기존 `analyze_interview` 클론) → `questionFindings` 확장 → 리포트에 **"면접 내용 상세히 보기" 토글 섹션**(`CollapsibleSection` 재사용)으로 답변별 전문+피드백 노출. = 사용자 요청("오른쪽 디자인 변형 + 토글 상세 + plan2 도입")의 핵심.
- **②b (다음)**: 셋업 얼굴 캘리브레이션 + 클라이언트 MediaPipe 캡처 → `interview_recording_signals` 저장 → 워커 집계(gaze-away 구간/표정) → `nonverbalSummary` 리포트 표시. (MediaPipe 에셋·DDL 필요, 새 키 없음.)
- **③ (그 다음)**: 영상 위 오버레이 시각화(저장 시계열 재현) + 타임라인 이탈 마커.
