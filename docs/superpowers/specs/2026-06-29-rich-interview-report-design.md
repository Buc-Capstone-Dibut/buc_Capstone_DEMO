# 리치 면접 리포트 설계 — 구간 네비게이션 + 시선/표정 분석 시각화

> 상태: 설계(spec). 다음 단계 = writing-plans로 구현 계획 작성.
> 선행: Slice 1(녹화→Supabase 저장→리포트 통영상 재생) 완료(브랜치 junghwan/friendly-chatelet-41cc9b). 본 설계는 그 위에 얹는 Slice 2+3.

## 목표 (한 문장)
면접 영상을 "통째로 보는 것"에서, **답변 구간/STT를 클릭해 해당 시점으로 점프**하고 **시선·표정 분석을 영상 위 오버레이와 답변별 코멘트로 확인**하는 리치 리포트로 끌어올린다. 면접 중에는 분석 UI를 노출하지 않고, **셋업 단계에서 얼굴 인식·고정 캘리브레이션 + 녹화 동의**를 받는다.

## 핵심 원칙 / 제약
- **무점수**: 모든 분석은 정성·구간연결형(메모리: AI면접 점수제 폐기 → 보고서/구간재체험형). "시선이탈 28%" 같은 비율·구간은 OK, 종합 점수는 금지.
- **면접 중 분석 UI 없음 / 리포트에서만 노출**.
- **이모지 사용 금지**, 현 디자인 시스템(Pretendard · 라임그린 #82B84C · rounded-2xl border-border bg-card · lucide-react) 준수.
- **프라이버시**: 영상·STT·시선/표정 시계열 모두 민감정보 → Slice 1과 동일 private 버킷 + signed URL + 동의 + 소유권 검사. 시선/표정 계산은 **클라이언트(브라우저)에서** 수행하고 **집계 신호만** 서버 전송(원시 프레임 미전송).
- **Graceful degrade**: 카메라 없음/권한거부/저사양이면 캘리브레이션은 건너뛰고 음성 위주로 진행. 분석 캡처 실패해도 영상·STT 네비게이션은 동작.

## 데이터 아키텍처 결정 (확정)
**녹화 시 측정 → 시계열 저장 → 리포트에서 재현** (접근 ㄴ). 재생 시 실시간 추론 아님.
- 면접 중: 브라우저 MediaPipe가 시선·머리자세·표정을 **5Hz 시계열**로 캡처(녹화 t0 기준 ms). 면접 종료 시 영상과 함께 업로드.
- 리포트: 저장된 시계열을 영상 currentTime에 동기화해 **가볍게 오버레이 재현**(추론 없음). 시선이탈 "구간"은 서버에서 사전 집계.

---

## 시스템 구성 (3개 서브시스템 = 3개 구현 plan)

### Plan ① 네비게이션 UI (지금 가능, 분석 인프라 불필요)
리포트 "면접 영상" 섹션을 **2분할**로 확장. 데이터는 **이미 있는 `interview_turns`(STT content + started_at/completed_at)** 와 Slice 1 녹화만으로 충분.
- 좌: 영상 + 하단 타임라인 바(답변 구간). 우: **Q&A 구간 목록 + STT 스크립트, 클릭 → 영상 해당 구간 seek**, 답변별 기존 텍스트 피드백 연결.
- 구간 offset = `turn.started_at - recording.recording_started_at`(ms). 더 정밀하게는 Google STT 단어 타임스탬프(후속 옵션).
- seek/동기화는 **rehearse 검증 패턴 재사용**: `seekTo(ms) → video.currentTime = ms/1000`; 타임라인 `left% = startMs/durationMs*100`, `width% = (endMs-startMs)/durationMs*100`(최소 0.5%); 200ms 폴링은 **스크러버 하이라이트 상태에만** 사용(캔버스 구동 아님).
- WebM duration=Infinity 워크어라운드(Slice 1 `fix-webm-duration`)는 seek 정확성에 그대로 유효.

### Plan ② 셋업 캘리브레이션 + 캡처·저장 + 분석 (백엔드/파이프라인)
- **셋업 캘리브레이션**(신규 `face-calibration-panel.tsx`, 기존 `interview-device-check.tsx`와 조합):
  - 3-pose 상태기계: 중앙 → 좌 → 우. 단일 카메라 스트림 재사용. SVG 얼굴 가이드 오벌 + USWDS식 3-step 인디케이터 + `aria-live` 상태줄(아이콘+텍스트, 색상 단독 금지, WCAG 1.4.1/4.1.3).
  - 각 포즈는 범위 내 ~0.5–1s 유지 시 자동 확정. **중앙 프레임 = 시선 baseline**(파라미터만 저장, 원시 프레임 저장 안 함).
  - **반드시 `건너뛰기` 노출** + 카메라 없음/거부 시 자동 `unavailable`. `onCalibrationChange(status)` 콜백.
- **녹화 동의**(신규 `recording-consent.tsx`): 평문 한국어 고지("영상·음성이 녹화되어 리포트 생성에만 사용됩니다") + **미체크 단일 체크박스**(사전체크 금지) + 동등 비중 `동의하지 않음(음성으로만 진행)` 경로. 시작 게이트 = `micReady && consent && (calib done | skipped | unavailable)`, 비활성 사유 `role=status` 안내.
- **캡처**(녹화 훅 `use-interview-recording` 확장 또는 형제 훅): MediaPipe FaceLandmarker(`runningMode:'VIDEO'`, `delegate:'GPU'`, `outputFaceBlendshapes:true`, `outputFacialTransformationMatrixes:true`)를 공유 비디오 트랙에 5Hz로 적용. 각 샘플: `{ts_ms, gaze{x,y,away}, head{yaw,pitch}, expr{label}}` (+선택 핵심 blendshape 소수). baseline 대비 편차로 away 판정(스무딩 ~10프레임, 지속 ~500ms; 기본 임계값 |dGazeX|>0.30, |dGazeY|>0.30, |dYaw|>15°, |dPitch|>12° — 튜너블). 면접 종료 시 시계열 업로드.
- **분석 워커**(기존 `ai-interview/app/interview/reporting/agent.py` 잡 큐 확장에 `video_analysis` 잡 추가):
  - ① 시계열 집계 → gaze-away 비율·최장 이탈·`away_segments[[start,end]]`·표정 히스토그램 → `recording_signals.aggregates` + 파생 신호를 `interview_eval_signals`(dimension=eye_contact/expression…, evidence=구간+설명, **무점수**)로 기록.
  - ② **Gemini 답변별 보강**: **권장 경로 = 워커가 녹화본을 GCP 프로젝트(Vertex와 동일) GCS 버킷에 1회 복사 → 단일 gs:// URI에 답변별 `VideoMetadata` offset으로 N회 호출**(객체 1개·offset만 바꿔 답변별 분석, Vertex의 gs:// 선호와 정합). `types.Part.from_uri` + `types.VideoMetadata(start_offset='Xs', end_offset='Ys', fps=1)`(정적 토킹헤드 fps=0.5), `media_resolution=LOW`, `model='gemini-2.5-flash'`, `response_mime_type='application/json'` + `response_schema`(Pydantic) → `response.parsed`. 답변별 표정 인상·개선포인트 정성 코멘트. (90초당 ~$0.005, 비용 무시.) **폴백**: GCS 미사용 시 Supabase signed URL로 소형 답변 구간을 다운로드해 인라인 전달(인라인 크기 한계 주의). ※ Vertex는 Files API 없음.

### Plan ③ 리포트 분석 시각화 (②의 데이터 필요)
- 신규 `replay-overlay-player.tsx`: `relative aspect-video` 박스에 `<video object-contain>` + 형제 `pointer-events-none <canvas>`.
  - 구동: `video.requestVideoFrameCallback`(mediaTime) 자기재등록 루프, 미지원 시 `requestAnimationFrame` 폴백, pause/seeked/resize 시 1회 redraw.
  - 좌표 매핑: 정규화(0..1) → letterbox 콘텐츠 사각형(scale=min(W/vw,H/vh), 중앙 오프셋). 캔버스는 `devicePixelRatio` 백킹 + `ResizeObserver`. **이 매핑이 정확성의 핵심.**
  - 드로잉: 플레인 Canvas2D로 얼굴 박스 + 시선 벡터 + 표정 라벨(풀 메시 미사용). 시계열 nearest-sample 조회 + 수치 보간, 범주(표정)는 근접 샘플 스냅.
- 타임라인: 답변 구간(라임) + **시선이탈 마커(가는 빨강 틱, `pct(ms)` 위치)** + playhead.
- 우측 패널: 답변별 STT + 분석 코멘트(시선이탈 비율, 개선포인트) + 클릭 점프.

---

## 데이터 모델
- `interview_turns` (있음): STT content + started_at/completed_at → 구간 offset 소스.
- **신규 `interview_recording_signals`** (세션당 1행, FastAPI DDL — Prisma 아님):
  - `session_id` FK(→interview_sessions, ON DELETE CASCADE, UNIQUE)
  - `sample_rate_hz INT`, `sample_schema JSONB`(컬럼 순서 정의), `expr_labels JSONB`(라벨 맵)
  - `samples JSONB` — **compact array-of-arrays**(고정 컬럼 순서, 5Hz·15분 ≈ 4.5k 샘플 ≈ ~300KB; TOAST 자동)
  - `baseline JSONB`(중앙 캘리브레이션 파라미터), `aggregates JSONB`(gaze-away 비율·away_segments·표정 히스토그램)
  - `created_at`
  - ⚠️ 원시 프레임/이미지 저장 안 함(파라미터·시계열 수치만). 1행 write-once / 1 SELECT read-whole.
- `interview_eval_signals` (있음·확장): dimension + evidence(구간 ms+설명) + confidence, **무점수**.
- `report_payload` (있음): 기존 답변별 피드백 + Gemini 보강 코멘트.
- RLS: `interview_recordings`와 동일 패턴(database.py 기존 auth-guarded DO 블록에 fold, owner-select).

## 데이터 흐름 (E2E)
```
[셋업] device-check → face-calibration(중앙=baseline) → consent → 시작 게이트
[면접] 녹화(Slice1) + MediaPipe 5Hz 시계열 캡처(백그라운드, UI 없음)
   └ 종료: 영상 업로드(Slice1) + 시계열 업로드 → interview_recording_signals INSERT
[워커] video_analysis 잡: 시계열 집계→eval_signals + Gemini(gs://+VideoMetadata)→report 보강
[리포트] turns(구간/STT) + signals.samples(오버레이) + aggregates/eval_signals(분석) 결합
   └ replay-overlay-player + 타임라인(구간+이탈마커) + 우측 Q&A·코멘트 클릭 점프
```

## 기술 스택 결정 (리서치·공식문서 검증 반영)
- **MediaPipe**: `@mediapipe/tasks-vision@0.10.35`(정확 핀; 1.0.0-rc는 latest 아님). WASM(`/public/wasm`) + `face_landmarker.task`(`/public/models`) **자가호스팅**(런타임 3rd-party CDN 의존 제거). Next.js: `dynamic({ssr:false})` + `useEffect` 내 lazy `import()`(서버에서 window/WASM 접근 크래시 방지). detectForVideo는 `video.currentTime` de-dup 가드(비단조 타임스탬프 에러 방지).
- **Gaze/head-pose**: eyeLook* 8종 → 시선 축; `facialTransformationMatrixes[0].data`(16-float column-major) 상단 3x3 → yaw/pitch/roll(atan2). 정확도 ~2–5°(coarse) → 보수적 임계 + 스무딩 + baseline 의존 명시. "정밀 아이트래킹"으로 마케팅 금지.
- **Gemini**: google-genai(Vertex). **Vertex = Files API 없음** → gs:// `Part.from_uri`(대용량) 또는 인라인(소형). `VideoMetadata(start_offset/end_offset/fps)`, 기본 1fps(~300 tok/s), `media_resolution=LOW`(~100 tok/s). `gemini-2.5-flash` 기본(영상지원·저가), `gemini-3.5-flash`는 GA·가격 안정 후 옵션. structured는 response_mime_type+response_schema.
- **저장**: compact array-of-arrays JSONB 단일 행(per-sample 테이블 금지). jsonb는 text의 1GB 상한과 무관(정정됨) — TOAST가 처리. samples 컬럼은 리포트 경로 외 SELECT 금지(de-TOAST 증폭 방지).
- **오버레이**: requestVideoFrameCallback + letterbox 매핑 + DPR/ResizeObserver. rehearse seek 계약 재사용.

## 테스트 전략
- 순수 로직(node:test): 구간 offset 계산, letterbox 좌표 매핑(scale/offset), nearest-sample 보간, gaze 편차→away 판정, 시계열 compact 인코딩/디코딩, 집계(gaze-away 비율/segments).
- 행렬→오일러각 분해, blendshape→gaze 축 변환: 단위테스트(알려진 입력→기대 각도).
- FastAPI 워커: 시계열 집계 함수 unittest; Gemini 호출은 스텁.
- 브라우저 통합(MediaPipe 캡처·오버레이 렌더·캘리브레이션): 사용자 환경 수동검증(헤드리스 불가) — 각 plan에 명시 스텝.
- DDL: unittest(상수 구조) — Slice 1 패턴.

## 위험 / 미해결
- MediaPipe 캡처가 녹화 성능에 부담(저사양). → 5Hz·GPU delegate·rAF 1회/프레임·실패 시 degrade.
- 시선 정확도 coarse → 보수적 임계 + 캘리브레이션 + "주의 경향" 정성 표현(점수 아님).
- Gemini gs:// 경로는 Slice 1이 Supabase Storage라는 점과 상충 가능(Vertex는 gs:// 선호). → 1차는 Supabase signed URL 다운로드 후 인라인(소형 답변 구간) 또는 GCS 병행 검토(구현 plan에서 확정).
- 동의 거부(voice-only) 시 캡처·분석 전부 스킵 — 리포트는 Slice 1 수준으로 graceful.

## 구현 분해 (writing-plans 입력)
- **Plan ①**: 네비게이션 UI(좌우 분할 + STT 구간 점프 + 기존 피드백 연결). 즉시 가능.
- **Plan ②**: DDL(interview_recording_signals) + 셋업 캘리브레이션/동의 컴포넌트 + 캡처 훅 + 워커(집계+Gemini).
- **Plan ③**: replay-overlay-player + 타임라인 이탈마커 + 분석 코멘트 표시(②데이터 의존).
각 plan은 독립적으로 동작·검증 가능한 단위로 작성한다(①은 분석 없이도 완결).
