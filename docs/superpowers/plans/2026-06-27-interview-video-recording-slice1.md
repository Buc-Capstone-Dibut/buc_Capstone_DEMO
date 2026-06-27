# 면접 영상 녹화 → 저장 → 재생 (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모의면접 중 지원자 영상+음성을 녹화해 Supabase Storage(private)에 저장하고, 리포트 페이지에서 그 영상을 재생할 수 있게 한다.

**Architecture:** rehearse 레퍼런스의 "Always Recording(연속 녹화) + 타임스탬프" 패턴을 따른다. 단 이번 슬라이스는 **분석/타임라인 마커는 제외**하고, 녹화→업로드→재생까지의 수직 단면만 만든다. 녹화는 브라우저 `MediaRecorder`(WebM)로 하되 **기존 미리보기 카메라 스트림을 공유**(카메라 2중 취득 금지)하고 마이크만 별도 취득해 합성한다. **WebM duration 메타데이터 누락 함정**은 클라이언트 `fix-webm-duration`으로 보정한 뒤 업로드한다. 업로드는 BFF가 발급한 signed upload URL로 브라우저→Storage 직접 전송한다. 메타데이터는 FastAPI 소유 테이블 `interview_recordings`(FK→`interview_sessions`)에 web admin 클라이언트가 직접 기록한다. AWS는 쓰지 않는다(현 스택 그대로).

**Tech Stack:** Next.js(App Router, `web/`), Node `tsx --test`(node:test) 단위 테스트, Python stdlib `unittest`(ai-interview 기존 테스트 관례), Supabase Storage + service-role admin 클라이언트, FastAPI(`ai-interview/`) 시작 시 raw DDL.

**Scope (이 계획서가 다루는 것):** 녹화 · 저장 · 재생.
**Scope 밖 (후속 계획서):** ① 답변 구간 타임라인 마커 + 클릭 시 seek(Slice 2) ② Gemini 영상/음성 분석 + 리포트 신호 반영(Slice 3) ③ MediaPipe 시선·자세(Slice 4).

---

## 검증 반영 (2026-06-27, 7차원 워크플로 + 적대적 재확인)

초안에 대해 실제 코드 대조 검증을 돌려 confirmed blocker 4 + major 이슈 8을 반영함:
- **[blocker] 카메라 2중 취득 → 기존 파이프라인 손상**: 별도 `getUserMedia({video})` 금지. 미리보기 카메라 스트림을 공유하고 마이크만 별도 취득(Task 5·6·7).
- **[blocker] pytest 미설치**: ai-interview는 `unittest`만 쓰고 pytest 미선언 → `uv run pytest`가 anaconda로 새어 `app` import 실패. 테스트를 `unittest`로 작성, `uv run python -m unittest`로 실행(Task 1).
- **[blocker] 버킷 200MB 한계**: 15분 면접 ≈ 282MB라 거부됨. 한계를 500MiB(바이트 수치)로, videoBitsPerSecond 1.5Mbps로 하향(Task 4·5).
- **[blocker] GET /recording 인가 누락**: 다른 사용자의 signed URL 탈취 가능 → 소유권 검사 추가(Task 4).
- **[major] `getInterviewRouteUserId()`는 인자 없음**(route-auth.ts:12) → 3개 호출부 인자 제거(Task 4).
- **[major] RLS DO 블록**: 별도 블록 대신 database.py:271-338 기존 auth-guarded 블록에 fold(auth 없는 CI/로컬에서 init_db 실패 방지)(Task 1).
- **[major] 업로드 블로킹/행**: 완료 화면이 업로드에 무한 대기 → "영상 저장 중" 오버레이 + Promise.race 30s 타임아웃 + 청크 timeslice + 실패 표면화(Task 5·7).
- **[major] 동의 고지 부재**: 녹화 시작 화면에 한 줄 고지 추가(Task 7).
- 기각: started_at(정확·무관), webm-seek(라이브러리 정상, Slice2 범위).

---

## File Structure

**생성:**
- `web/lib/interview/recording/recording-metadata.ts` — 녹화 메타데이터/스토리지 경로 순수 함수 (테스트 대상)
- `web/lib/interview/recording/recording-metadata.test.ts` — 위 순수 함수 단위 테스트
- `web/lib/interview/recording/fix-duration.ts` — `fix-webm-duration` 얇은 래퍼 (실패 시 원본 Blob 반환)
- `web/hooks/interview/use-interview-recording.ts` — 공유 비디오 스트림 + 마이크 합성 MediaRecorder 훅
- `web/app/api/interview/sessions/[id]/recording/upload-url/route.ts` — signed upload URL 발급(POST)
- `web/app/api/interview/sessions/[id]/recording/route.ts` — 메타데이터 저장(POST) + 재생용 signed URL 조회(GET)
- `ai-interview/tests/test_interview_recordings_ddl.py` — DDL 상수 구조 테스트 (unittest)

**수정:**
- `ai-interview/app/db/database.py` — `INTERVIEW_RECORDINGS_DDL` 상수 + `init_db()` ddl/index 리스트 + 기존 RLS DO 블록에 정책 추가
- `web/package.json` — `fix-webm-duration` 의존성 + `test:interview-recording` 스크립트
- `web/components/features/interview/local-camera-preview.tsx` — 미리보기 스트림을 부모에 노출하는 `onStream` 콜백 추가
- `web/app/interview/room/video/page.tsx` — 녹화 훅 연결(공유 스트림·저장 오버레이·타임아웃·동의 고지)
- `web/app/interview/result/page.tsx` — 리포트 페이지 `<video>` 재생

**후속 운영 메모(코드 아님):** Supabase 무료 Storage 총 1GB → 녹화 누적 시 보관/정리 정책 필요(Slice 외, 별도 처리).

---

## Task 1: `interview_recordings` 테이블 DDL + RLS (FastAPI)

**Files:**
- Modify: `ai-interview/app/db/database.py`
- Test: `ai-interview/tests/test_interview_recordings_ddl.py`

- [ ] **Step 1: 실패하는 테스트 작성 (unittest)**

`ai-interview/tests/test_interview_recordings_ddl.py`:

```python
import unittest

from app.db.database import INTERVIEW_RECORDINGS_DDL


class InterviewRecordingsDdlTests(unittest.TestCase):
    def test_targets_correct_table(self) -> None:
        self.assertIn(
            "CREATE TABLE IF NOT EXISTS public.interview_recordings",
            INTERVIEW_RECORDINGS_DDL,
        )

    def test_has_required_columns(self) -> None:
        for col in [
            "session_id",
            "bucket",
            "storage_path",
            "duration_ms",
            "mime_type",
            "size_bytes",
            "recording_started_at",
        ]:
            self.assertIn(col, INTERVIEW_RECORDINGS_DDL, f"missing column: {col}")

    def test_fk_cascades_with_session(self) -> None:
        self.assertIn(
            "REFERENCES public.interview_sessions(id) ON DELETE CASCADE",
            INTERVIEW_RECORDINGS_DDL,
        )

    def test_unique_session_for_upsert(self) -> None:
        # web 라우트가 onConflict:'session_id' 로 upsert 하므로 UNIQUE 필요
        self.assertIn("UNIQUE(session_id)", INTERVIEW_RECORDINGS_DDL)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd ai-interview && uv run python -m unittest tests.test_interview_recordings_ddl -v`
Expected: FAIL — `ImportError: cannot import name 'INTERVIEW_RECORDINGS_DDL' from 'app.db.database'`

> 주의: `uv run pytest` 를 쓰지 말 것. 이 프로젝트는 pytest 미선언이라 `uv run pytest` 가 venv 밖(anaconda) pytest로 새어 `app` import에 실패한다. 기존 테스트(`tests/test_session_support.py` 등)도 전부 stdlib `unittest`다.

- [ ] **Step 3: DDL 상수 추가 + init_db 포함**

`ai-interview/app/db/database.py` 모듈 레벨(`init_db` 정의 위)에 상수 추가:

```python
INTERVIEW_RECORDINGS_DDL = """
CREATE TABLE IF NOT EXISTS public.interview_recordings (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    bucket TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    duration_ms INT,
    mime_type TEXT,
    size_bytes BIGINT,
    recording_started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(session_id)
)
"""
```

`init_db()` 안의 `ddl = [ ... ]` 리스트에서 `interview_turns` DDL 문자열 **뒤에** 추가:

```python
        INTERVIEW_RECORDINGS_DDL,
```

같은 함수의 인덱스 생성 부분(`CREATE INDEX IF NOT EXISTS ...` 들이 모인 리스트, 약 line 212~)에 추가:

```python
        "CREATE INDEX IF NOT EXISTS idx_interview_recordings_session ON public.interview_recordings(session_id)",
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd ai-interview && uv run python -m unittest tests.test_interview_recordings_ddl -v`
Expected: PASS (`Ran 4 tests ... OK`)

- [ ] **Step 5: 기존 RLS DO 블록에 정책 추가 (별도 블록 만들지 말 것)**

`ai-interview/app/db/database.py`의 **기존** auth-guarded RLS 블록(`DO $$ ... IF EXISTS (... pg_proc ... auth.uid ...) THEN ... END $$`, 약 line 271-338)에 두 가지를 끼워넣는다. 이 블록은 `auth.uid`가 없는 환경(CI/로컬 순수 Postgres)에서 정책 생성을 건너뛰도록 가드돼 있어, 여기에 fold해야 `init_db()`가 안 깨진다.

(1) ENABLE 구문들 사이(다른 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 옆, 약 line 284 뒤)에 추가:

```python
                EXECUTE 'ALTER TABLE public.interview_recordings ENABLE ROW LEVEL SECURITY';
```

(2) `interview_turns` 정책과 **동일한 형태**로(EXISTS join + `TO authenticated` + DROP 후 CREATE), 다른 DROP/CREATE 정책들 옆(약 line 333 뒤, `END IF` 앞)에 추가:

```python
                EXECUTE 'DROP POLICY IF EXISTS interview_recordings_owner_select ON public.interview_recordings';
                EXECUTE
                    'CREATE POLICY interview_recordings_owner_select ' ||
                    'ON public.interview_recordings FOR SELECT TO authenticated ' ||
                    'USING (EXISTS (SELECT 1 FROM public.interview_sessions s ' ||
                    'WHERE s.id = interview_recordings.session_id AND s.user_id = auth.uid()::text))';
```

> web의 쓰기/읽기는 service-role(admin) 클라이언트로 RLS를 우회하므로 이 정책은 anon 직접 읽기에만 영향. service-role 경로는 정책과 무관하게 동작한다.

- [ ] **Step 6: 앱 부팅으로 DDL 적용 확인 (DB 연결 필요한 환경에서)**

Run: `cd ai-interview && uv run python -c "from app.db.database import init_db; init_db(); print('init_db ok')"`
Expected: 예외 없이 `init_db ok`. (DB 연결 env가 없는 환경이면 이 스텝은 로컬/배포 DB 있는 곳에서 수행. import 자체는 DB 없이도 되어 Step 2/4는 통과해야 한다.)

- [ ] **Step 7: 커밋**

```bash
git add ai-interview/app/db/database.py ai-interview/tests/test_interview_recordings_ddl.py
git commit -m "feat(interview): interview_recordings 테이블 DDL + RLS 추가"
```

---

## Task 2: 녹화 메타데이터 순수 함수 (web)

**Files:**
- Create: `web/lib/interview/recording/recording-metadata.ts`
- Test: `web/lib/interview/recording/recording-metadata.test.ts`
- Modify: `web/package.json` (test 스크립트)

- [ ] **Step 1: 실패하는 테스트 작성**

`web/lib/interview/recording/recording-metadata.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRecordingStoragePath,
  pickRecordingExtension,
  buildRecordingMetadata,
} from "./recording-metadata";

test("pickRecordingExtension maps webm mime to webm", () => {
  assert.equal(pickRecordingExtension("video/webm;codecs=vp9,opus"), "webm");
  assert.equal(pickRecordingExtension("video/webm"), "webm");
});

test("pickRecordingExtension falls back to webm for unknown mime", () => {
  assert.equal(pickRecordingExtension(""), "webm");
});

test("buildRecordingStoragePath scopes by session id", () => {
  const path = buildRecordingStoragePath("sess_123", "video/webm");
  assert.match(path, /^sess_123\/recording-\d+\.webm$/);
});

test("buildRecordingMetadata shapes the POST body", () => {
  const meta = buildRecordingMetadata({
    storagePath: "sess_123/recording-1.webm",
    bucket: "interview-recordings",
    mimeType: "video/webm",
    sizeBytes: 4096,
    durationMs: 12000,
    recordingStartedAtIso: "2026-06-27T00:00:00.000Z",
  });
  assert.deepEqual(meta, {
    bucket: "interview-recordings",
    storagePath: "sess_123/recording-1.webm",
    mimeType: "video/webm",
    sizeBytes: 4096,
    durationMs: 12000,
    recordingStartedAt: "2026-06-27T00:00:00.000Z",
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

먼저 `web/package.json`의 `scripts`에 추가:

```json
    "test:interview-recording": "tsx --test lib/interview/recording/*.test.ts",
```

Run: `cd web && npm run test:interview-recording`
Expected: FAIL — `Cannot find module './recording-metadata'`

- [ ] **Step 3: 순수 함수 구현**

`web/lib/interview/recording/recording-metadata.ts`:

```ts
export const RECORDING_BUCKET = "interview-recordings";

// 15분(최대) 면접 ≈ 282MB(2.628Mbps) → 여유 두고 500MiB
export const MAX_RECORDING_BYTES = 500 * 1024 * 1024;

export function pickRecordingExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("webm")) return "webm";
  return "webm";
}

export function buildRecordingStoragePath(sessionId: string, mimeType: string): string {
  const ext = pickRecordingExtension(mimeType);
  return `${sessionId}/recording-${Date.now()}.${ext}`;
}

export interface RecordingMetadataInput {
  storagePath: string;
  bucket: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  recordingStartedAtIso: string;
}

export interface RecordingMetadataBody {
  bucket: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  recordingStartedAt: string;
}

export function buildRecordingMetadata(input: RecordingMetadataInput): RecordingMetadataBody {
  return {
    bucket: input.bucket,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    durationMs: input.durationMs,
    recordingStartedAt: input.recordingStartedAtIso,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd web && npm run test:interview-recording`
Expected: PASS (4 tests pass)

- [ ] **Step 5: 커밋**

```bash
git add web/lib/interview/recording/recording-metadata.ts web/lib/interview/recording/recording-metadata.test.ts web/package.json
git commit -m "feat(interview): 녹화 메타데이터/스토리지 경로 순수 함수"
```

---

## Task 3: WebM duration 보정 래퍼 (web)

**Files:**
- Create: `web/lib/interview/recording/fix-duration.ts`
- Modify: `web/package.json` (의존성)

> WebM duration 함정: `MediaRecorder` WebM Blob엔 duration 메타데이터가 없어 `<video>` seek이 깨진다. 업로드 전 보정. 브라우저 전용이라 단위테스트 대신 Task 8 수동검증에서 확인.

- [ ] **Step 1: 의존성 설치**

Run: `cd web && npm install fix-webm-duration`
Expected: `package.json` dependencies에 추가, 에러 없음

- [ ] **Step 2: import 형태 확인 후 래퍼 구현**

먼저 설치된 패키지의 export 형태를 확인:

Run: `cd web && node -e "const m=require('fix-webm-duration'); console.log(typeof m, typeof m.default, Object.keys(m))"`
Expected: 함수 export 형태 확인. 보통 default export 함수다.

`web/lib/interview/recording/fix-duration.ts` (default export 가정; 위 출력이 다르면 import만 맞춘다):

```ts
import fixWebmDuration from "fix-webm-duration";

/**
 * MediaRecorder WebM Blob에 duration 메타데이터를 주입한다.
 * 실패하거나 webm이 아니면 원본 Blob을 반환해 업로드를 막지 않는다.
 */
export async function fixRecordingDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob.type.includes("webm") || durationMs <= 0) {
    return blob;
  }
  try {
    return await fixWebmDuration(blob, durationMs, { logger: false });
  } catch (err) {
    console.error("[recording] duration 보정 실패, 원본 사용:", err);
    return blob;
  }
}
```

- [ ] **Step 3: 타입체크**

Run: `cd web && npx tsc --noEmit -p tsconfig.json`
Expected: `fix-duration.ts` 관련 타입 에러 없음. 타입 선언이 없다는 에러 시 `web/types/fix-webm-duration.d.ts`에 `declare module "fix-webm-duration";` 추가.

- [ ] **Step 4: 커밋**

```bash
git add web/lib/interview/recording/fix-duration.ts web/package.json web/package-lock.json web/types/ 2>/dev/null
git commit -m "feat(interview): WebM duration 보정 래퍼 추가"
```

---

## Task 4: signed upload URL + 메타데이터 BFF 라우트 (web)

**Files:**
- Create: `web/app/api/interview/sessions/[id]/recording/upload-url/route.ts`
- Create: `web/app/api/interview/sessions/[id]/recording/route.ts`

> 패턴 출처: `getInterviewRouteUserId()`(인자 없음, `web/lib/interview/route-auth.ts:12`) + `createAdminSupabaseClient()`(`web/lib/supabase/admin.ts`) + 버킷 ensure(`web/app/api/career/projects/assets/route.ts`). 통합테스트는 Task 7 수동검증.

- [ ] **Step 1: upload-url 라우트 구현**

`web/app/api/interview/sessions/[id]/recording/upload-url/route.ts`:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getInterviewRouteUserId } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RECORDING_BUCKET, MAX_RECORDING_BYTES } from "@/lib/interview/recording/recording-metadata";

export const runtime = "nodejs";

async function ensureBucket(admin: ReturnType<typeof createAdminSupabaseClient>) {
  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.name === RECORDING_BUCKET)) return;
  await admin.storage.createBucket(RECORDING_BUCKET, {
    public: false,
    fileSizeLimit: MAX_RECORDING_BYTES,
    allowedMimeTypes: ["video/webm", "video/mp4"],
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const userId = await getInterviewRouteUserId();
  if (!userId) return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { storagePath?: string };
  if (!body.storagePath || !body.storagePath.startsWith(`${sessionId}/`)) {
    return NextResponse.json({ success: false, message: "invalid storagePath" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  // 소유권 확인: 이 세션이 요청 사용자 것인지
  const { data: session } = await admin
    .from("interview_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== userId) {
    return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 });
  }

  await ensureBucket(admin);

  const { data, error } = await admin.storage
    .from(RECORDING_BUCKET)
    .createSignedUploadUrl(body.storagePath);

  if (error || !data) {
    return NextResponse.json({ success: false, message: error?.message ?? "sign failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { bucket: RECORDING_BUCKET, path: data.path, token: data.token },
  });
}
```

> 참고: `createSignedUploadUrl(path)`는 옵션 인자 없이 호출한다(설치된 supabase-js 버전에서 upsert 옵션을 받지 않을 수 있음). 동일 세션 재녹화는 `buildRecordingStoragePath`가 매번 새 파일명(`recording-{Date.now()}`)을 만들어 충돌하지 않는다.

- [ ] **Step 2: 메타데이터 저장 + 재생 URL 조회 라우트 구현**

`web/app/api/interview/sessions/[id]/recording/route.ts`:

```ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getInterviewRouteUserId } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RECORDING_BUCKET } from "@/lib/interview/recording/recording-metadata";

export const runtime = "nodejs";

async function assertSessionOwner(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const { data: session } = await admin
    .from("interview_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .maybeSingle();
  return !!session && session.user_id === userId;
}

// 녹화 메타데이터 저장 (브라우저가 Storage 직접 업로드 완료 후 호출)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const userId = await getInterviewRouteUserId();
  if (!userId) return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    bucket: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    durationMs: number;
    recordingStartedAt: string;
  };

  const admin = createAdminSupabaseClient();
  if (!(await assertSessionOwner(admin, sessionId, userId))) {
    return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("interview_recordings").upsert(
    {
      id: randomUUID(),
      session_id: sessionId,
      bucket: body.bucket,
      storage_path: body.storagePath,
      mime_type: body.mimeType,
      size_bytes: body.sizeBytes,
      duration_ms: body.durationMs,
      recording_started_at: body.recordingStartedAt,
    },
    { onConflict: "session_id" },
  );

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// 재생용 signed URL 조회 (리포트 페이지에서 호출) — 소유권 검사 후 발급
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  const userId = await getInterviewRouteUserId();
  if (!userId) return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!(await assertSessionOwner(admin, sessionId, userId))) {
    return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 });
  }

  const { data: rec } = await admin
    .from("interview_recordings")
    .select("storage_path, bucket, duration_ms, recording_started_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!rec) return NextResponse.json({ success: true, data: null });

  const { data: signed, error } = await admin.storage
    .from(rec.bucket || RECORDING_BUCKET)
    .createSignedUrl(rec.storage_path, 60 * 60);

  if (error || !signed) {
    return NextResponse.json({ success: false, message: error?.message ?? "sign failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      url: signed.signedUrl,
      durationMs: rec.duration_ms,
      recordingStartedAt: rec.recording_started_at,
    },
  });
}
```

- [ ] **Step 3: 타입체크**

Run: `cd web && npx tsc --noEmit -p tsconfig.json`
Expected: 두 라우트 관련 타입 에러 없음. (인자 없는 `getInterviewRouteUserId()`라 추가 인자 에러가 없어야 함.)

- [ ] **Step 4: 커밋**

```bash
git add web/app/api/interview/sessions/[id]/recording/
git commit -m "feat(interview): 녹화 signed-upload-url 발급 + 메타데이터 저장/조회 라우트(소유권 검사)"
```

---

## Task 5: 녹화 훅 — 공유 비디오 + 마이크 합성 (web)

**Files:**
- Create: `web/hooks/interview/use-interview-recording.ts`

> 유기성 핵심: 카메라를 **두 번 열지 않는다.** 미리보기(LocalCameraPreview)가 이미 취득한 비디오 스트림을 `start(videoStream)`로 받아 재사용하고, 마이크만 별도 취득해 합성한다. 정지 시 **훅이 소유한 마이크 트랙만** 멈추고 공유 비디오 트랙은 건드리지 않는다(미리보기 소유). 청크는 5초마다 flush(메모리 상한), 업로드 fetch엔 AbortController, 결과는 `{ok,error}`로 표면화.

- [ ] **Step 1: 훅 구현**

`web/hooks/interview/use-interview-recording.ts`:

```ts
"use client";

import { useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  RECORDING_BUCKET,
  buildRecordingStoragePath,
  buildRecordingMetadata,
} from "@/lib/interview/recording/recording-metadata";
import { fixRecordingDuration } from "@/lib/interview/recording/fix-duration";

const CODECS = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const UPLOAD_FETCH_TIMEOUT_MS = 20_000;

export interface RecordingResult {
  ok: boolean;
  error?: string;
}

export function useInterviewRecording() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const ownedAudioRef = useRef<MediaStream | null>(null); // 훅이 직접 취득한 마이크 (정리 책임)
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);

  // videoStream: 미리보기와 공유하는 카메라 스트림(소유권은 호출자). null이면 오디오 전용 녹화.
  const start = useCallback(async (videoStream: MediaStream | null) => {
    if (recorderRef.current) return;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      ownedAudioRef.current = audioStream;

      const tracks: MediaStreamTrack[] = [...audioStream.getAudioTracks()];
      const videoTrack = videoStream?.getVideoTracks?.()[0];
      if (videoTrack) tracks.unshift(videoTrack);
      const combined = new MediaStream(tracks);

      const mimeType = CODECS.find((c) => MediaRecorder.isTypeSupported(c)) ?? "video/webm";
      const recorder = new MediaRecorder(combined, {
        mimeType,
        audioBitsPerSecond: 128_000,
        videoBitsPerSecond: 1_500_000,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(5000); // 5초마다 청크 flush
    } catch (err) {
      console.error("[recording] 시작 실패(영상 없이 면접은 계속):", err);
    }
  }, []);

  const stopAndUpload = useCallback(async (sessionId: string): Promise<RecordingResult> => {
    const recorder = recorderRef.current;
    const startedAt = startedAtRef.current;
    if (!recorder || !startedAt) return { ok: false, error: "no-recorder" };

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
      recorder.stop();
    });

    // 훅이 소유한 마이크만 정리. 공유 비디오 트랙은 멈추지 않는다(미리보기가 소유).
    ownedAudioRef.current?.getTracks().forEach((t) => t.stop());
    ownedAudioRef.current = null;
    recorderRef.current = null;

    const durationMs = Date.now() - startedAt;
    const fixed = await fixRecordingDuration(blob, durationMs);
    const storagePath = buildRecordingStoragePath(sessionId, recorder.mimeType);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPLOAD_FETCH_TIMEOUT_MS);
    try {
      const signRes = await fetch(`/api/interview/sessions/${sessionId}/recording/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
        signal: controller.signal,
      });
      const signJson = await signRes.json();
      if (!signJson?.success) throw new Error(signJson?.message ?? "sign failed");

      const { error: upErr } = await supabase.storage
        .from(RECORDING_BUCKET)
        .uploadToSignedUrl(signJson.data.path, signJson.data.token, fixed);
      if (upErr) throw upErr;

      const meta = buildRecordingMetadata({
        bucket: RECORDING_BUCKET,
        storagePath,
        mimeType: recorder.mimeType,
        sizeBytes: fixed.size,
        durationMs,
        recordingStartedAtIso: new Date(startedAt).toISOString(),
      });
      await fetch(`/api/interview/sessions/${sessionId}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
        signal: controller.signal,
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[recording] 업로드 실패:", msg);
      return { ok: false, error: msg };
    } finally {
      clearTimeout(timer);
    }
  }, []);

  return { start, stopAndUpload };
}
```

> 주의: `uploadToSignedUrl`(멀티파트 XHR)은 AbortController로 확실히 끊기지 않을 수 있다. 업로드가 완료 화면을 무한 점유하지 않게 하는 **하드 타임아웃은 Task 7의 `Promise.race`** 가 보장한다. 여기 AbortController는 메타/서명 fetch용 보조 장치다.

- [ ] **Step 2: 타입체크**

Run: `cd web && npx tsc --noEmit -p tsconfig.json`
Expected: 이 훅 관련 타입 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add web/hooks/interview/use-interview-recording.ts
git commit -m "feat(interview): 공유 비디오+마이크 합성 MediaRecorder 녹화 훅"
```

---

## Task 6: 미리보기 카메라 스트림 노출 (web)

**Files:**
- Modify: `web/components/features/interview/local-camera-preview.tsx`

> 카메라 2중 취득을 피하려면, 미리보기가 이미 가진 스트림을 부모가 받아 녹화 훅에 넘겨야 한다. `onStream` 콜백을 추가한다(서지컬, 기존 동작 무변경).

- [ ] **Step 1: props에 onStream 추가**

`web/components/features/interview/local-camera-preview.tsx`의 `LocalCameraPreviewProps`에 추가:

```ts
  onStream?: (stream: MediaStream | null) => void;
```

함수 시그니처 구조분해에도 추가:

```ts
function LocalCameraPreviewImpl({
  enabled,
  fill = false,
  maxHeight = 220,
  onStream,
}: LocalCameraPreviewProps) {
```

- [ ] **Step 2: 스트림 취득/해제 시 콜백 호출**

`start()` 내부에서 `streamRef.current = stream;` 직후에 추가:

```ts
        onStream?.(stream);
```

`stopStream()` 내부에서 `streamRef.current = null;` 직후에 추가:

```ts
      onStream?.(null);
```

그리고 effect 의존성 배열 `}, [enabled]);` 를 `}, [enabled, onStream]);` 로 변경. (부모는 `onStream` 콜백을 `useCallback`으로 안정화해 넘긴다 — Task 7.)

- [ ] **Step 3: 타입체크**

Run: `cd web && npx tsc --noEmit -p tsconfig.json`
Expected: 이 파일 관련 타입 에러 없음. memo 래퍼(`LocalCameraPreview`)는 그대로 동작(새 prop은 optional).

- [ ] **Step 4: 커밋**

```bash
git add web/components/features/interview/local-camera-preview.tsx
git commit -m "feat(interview): 미리보기 카메라 스트림을 onStream으로 노출"
```

---

## Task 7: 라이브 면접 페이지에 녹화 연결 (web)

**Files:**
- Modify: `web/app/interview/room/video/page.tsx`

> 통합 앵커(라인 아닌 코드로 찾을 것): 면접 시작 effect(`sendInterviewInit` 직후, `isConnected && isAudioPrimed && hasConfirmedInterviewStart` 게이트), 종료 funnel `completeSession()`(내부 `POST /complete` + `router.push`), 세션키 `activeSessionIdRef`, 미리보기 사용처 `<LocalCameraPreview ... />`, 시작 준비 블록(녹화 동의 고지 삽입 위치).

- [ ] **Step 1: import + 상태 + 안정화 콜백**

상단 import에 추가:

```ts
import { useInterviewRecording } from "@/hooks/interview/use-interview-recording";
```

`InterviewVideoRoomPage` 본문 훅 영역에 추가:

```ts
  const recording = useInterviewRecording();
  const recordingVideoStreamRef = useRef<MediaStream | null>(null);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const handleRecordingStream = useCallback((stream: MediaStream | null) => {
    recordingVideoStreamRef.current = stream;
  }, []);
```

- [ ] **Step 2: 미리보기에 onStream 연결**

페이지의 `<LocalCameraPreview ... />` 사용처에 prop 추가(기존 props 유지):

```tsx
        onStream={handleRecordingStream}
```

- [ ] **Step 3: 면접 시작 시 공유 스트림으로 녹화 시작**

면접이 공식 시작되는 effect 안, `sendInterviewInit(nextSessionId)` 직후에 추가:

```ts
      void recording.start(recordingVideoStreamRef.current);
```

> 카메라가 꺼져 있으면(`recordingVideoStreamRef.current === null`) 훅이 오디오 전용으로 녹화한다(영상 없이 면접 계속 가능).

- [ ] **Step 4: 종료 funnel에서 정지+업로드 (저장 오버레이 + 하드 타임아웃)**

`completeSession()` 내부에서 `POST /complete` 및 `router.push` **이전에** 삽입:

```ts
    const sid = activeSessionIdRef.current;
    if (sid) {
      setIsSavingRecording(true);
      const SAVE_TIMEOUT_MS = 30_000;
      // 업로드가 빠르면 영상이 리포트에 바로 뜨고, 느리면 30s 후 진행(결과 페이지가 자체 복구).
      await Promise.race([
        recording.stopAndUpload(sid),
        new Promise<{ ok: boolean }>((resolve) =>
          setTimeout(() => resolve({ ok: false }), SAVE_TIMEOUT_MS),
        ),
      ]).catch(() => undefined);
      setIsSavingRecording(false);
    }
```

- [ ] **Step 5: 저장 중 오버레이 렌더**

면접 화면 JSX 최상위 컨테이너 안에 조건부 오버레이 추가(기존 레이아웃을 가리는 모달형):

```tsx
        {isSavingRecording && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 text-white">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <p className="text-sm">면접 영상 저장 중...</p>
            </div>
          </div>
        )}
```

- [ ] **Step 6: 녹화 동의 한 줄 고지**

시작 준비 블록(예: "면접 시작하기" 버튼 근처)에 정적 고지 추가:

```tsx
          <p className="text-xs text-muted-foreground">
            이 면접은 영상·음성이 녹화되어 리포트에 저장됩니다.
          </p>
```

- [ ] **Step 7: 수동 검증 — 유기성 + 동작**

```bash
cd web && npm run dev
```

1. 면접 시작 화면에 녹화 고지가 보이는지 확인.
2. 카메라·마이크 허용 후 면접 진행 — **카메라 미리보기가 정상 표시**되고, **권한 팝업/카메라 표시등이 추가로 한 번 더 뜨지 않는지**(= 카메라 재취득 안 함) 확인.
3. 면접 도중 **AI 음성 응답/STT가 평소대로 동작**하는지(= 마이크 충돌로 오디오 파이프라인이 깨지지 않았는지) 확인.
4. 면접 종료 → "면접 영상 저장 중..." 오버레이가 잠깐 뜨고 결과 페이지로 이동, 콘솔에 `[recording] 업로드 실패` 없음.
5. Supabase → Storage `interview-recordings`에 `{sessionId}/recording-*.webm` 생성, Table `interview_recordings`에 행 + `duration_ms`>0 확인.

Expected: 카메라/오디오 파이프라인 무손상 + 파일 1개 + 메타 1행.

- [ ] **Step 8: 커밋**

```bash
git add web/app/interview/room/video/page.tsx
git commit -m "feat(interview): 라이브 면접 영상 녹화 연결(공유 스트림·저장 오버레이·타임아웃·동의 고지)"
```

---

## Task 8: 리포트 페이지 영상 재생 (web)

**Files:**
- Modify: `web/app/interview/result/page.tsx`

> 통합 앵커: `resolvedSessionId`, 리포트 본문 `<article>`, 기존 타임라인 섹션 `id="timeline"`. `DocumentSection`의 정확한 props는 같은 파일 기존 사용처(예: `id="timeline"` 섹션)와 **반드시 일치**시킬 것 — 아래는 `index`/`id`/`title` prop 가정이며, 실제 시그니처가 다르면(children 헤더형 등) 기존 사용처 형태로 맞춘다.

- [ ] **Step 1: 녹화 URL 상태 + fetch**

`InterviewResultPage` 본문에 추가:

```ts
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!resolvedSessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/interview/sessions/${resolvedSessionId}/recording`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled && json?.success && json.data?.url) {
          setRecordingUrl(json.data.url as string);
        }
      } catch {
        /* 녹화 없으면 무시 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedSessionId]);
```

- [ ] **Step 2: 영상 재생 섹션 렌더**

기존 타임라인 섹션(`id="timeline"`) **바로 앞**에 추가(분석/마커 연동은 Slice 2이므로 네이티브 컨트롤 재생만). `DocumentSection` 호출 형태는 같은 파일 기존 사용처와 일치시킬 것:

```tsx
        {recordingUrl && (
          <DocumentSection index="00" id="recording" title="면접 영상">
            <video
              src={recordingUrl}
              controls
              playsInline
              className="w-full rounded-xl border bg-black"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              녹화된 면접 영상입니다. 답변 구간 타임라인 연동은 다음 단계에서 추가됩니다.
            </p>
          </DocumentSection>
        )}
```

- [ ] **Step 3: 수동 검증 — 재생 + seek**

```bash
cd web && npm run dev
```

1. Task 7에서 녹화된 세션의 결과 페이지(`/interview/result?id={sessionId}`)를 연다.
2. "면접 영상" 섹션의 `<video>`가 로드·재생되는지 확인.
3. 진행바를 드래그(seek)했을 때 위치가 정상 이동하는지 확인(= WebM duration 보정 성공). seek이 끝으로 튕기거나 `duration`이 `Infinity`면 Task 3 보정 점검.

Expected: 재생 + seek 정상.

- [ ] **Step 4: 커밋**

```bash
git add web/app/interview/result/page.tsx
git commit -m "feat(interview): 리포트 페이지에 면접 영상 재생 추가"
```

---

## Self-Review (작성자 체크 — 검증 반영본)

**1. Spec coverage**
- 녹화(공유 스트림) → Task 5·6·7 ✅
- 저장(private, signed upload, 500MiB) → Task 4·5 ✅
- 메타데이터 영속화(소유권 검사) → Task 1·4 ✅
- 재생 → Task 8 ✅
- WebM duration 함정 → Task 3 + Task 8-Step3 ✅
- 분석/타임라인/MediaPipe → 의도적 범위 밖(Slice 2~4) ✅

**2. 검증 blocker/이슈 반영 확인**
- pytest→unittest(Task 1) ✅ / 카메라 공유(Task 5·6·7) ✅ / 버킷 500MiB+1.5Mbps(Task 2·5) ✅ / GET 소유권(Task 4) ✅ / `getInterviewRouteUserId()` 무인자 3곳(Task 4) ✅ / RLS fold(Task 1 Step5) ✅ / 저장 오버레이+Promise.race+timeslice+결과표면화(Task 5·7) ✅ / 동의 고지(Task 7 Step6) ✅

**3. Type consistency**
- `RECORDING_BUCKET`/`MAX_RECORDING_BYTES`/`buildRecordingStoragePath`/`buildRecordingMetadata`(→`RecordingMetadataBody`)/`fixRecordingDuration(blob,durationMs)`/`useInterviewRecording().{start(videoStream), stopAndUpload(sessionId):RecordingResult}` 모두 정의↔사용 일치.
- POST body 필드(`bucket/storagePath/mimeType/sizeBytes/durationMs/recordingStartedAt`) Task2 정의 ↔ Task4 파싱 ↔ Task5 호출 동일.
- DB 컬럼(snake: `storage_path/duration_ms/size_bytes/recording_started_at/mime_type/bucket/session_id`) Task1 DDL ↔ Task4 upsert 동일. `UNIQUE(session_id)` ↔ `onConflict:'session_id'` 정합.
- `onStream?: (s: MediaStream|null)=>void` Task6 정의 ↔ Task7 `handleRecordingStream` 일치.

**4. 실행자 확인 항목 (검증으로 좁혀짐)**
- `DocumentSection` props 형태 → `result/page.tsx` 기존 사용처와 일치(Task 8 주석).
- `fix-webm-duration` export 형태 → Task 3 Step2의 `node -e`로 확인 후 import 확정.
- `room/video/page.tsx` 앵커는 라인이 아니라 코드 심볼(`sendInterviewInit`/`completeSession`/`activeSessionIdRef`/`<LocalCameraPreview`)로 찾을 것.
