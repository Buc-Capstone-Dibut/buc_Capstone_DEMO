# Dibut AI Interview FastAPI

## Run

```bash
cd ai-interview
uv sync
uv run uvicorn app.main:app --reload --port 8001
```

## Required environment variables

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `CORS_ORIGINS` (optional, default `http://localhost:3000`)

## Secret hygiene (P0-4)

- `.env.example` 의 `your_*` / `<...>` 값은 런타임에서 자동으로 무효화됩니다.
- 실제 운영 키는 `.env` 또는 배포 환경변수(Render/Supabase Secret)로만 주입하세요.
- 키가 노출되었거나 대화/로그에 남았으면 즉시 로테이션 후 재배포하세요.

## Voice pipeline variables (STT/TTS)

- `OPENAI_API_KEY` (required for real-time STT/TTS)
- `OPENAI_STT_MODEL` (default `whisper-1`)
- `OPENAI_TTS_MODEL` (default `tts-1`)
- `OPENAI_TTS_VOICE` (default `alloy`)
- `VOICE_VAD_THRESHOLD` (default `0.015`)
- `VOICE_VAD_SILENCE_MS` (default `700`)
- `VOICE_MIN_SPEECH_MS` (default `350`)
- `VOICE_MAX_SEGMENT_MS` (default `10000`)

## WebSocket voice flow

1. Connect to `ws://localhost:8001/v1/interview/ws/client`
2. Send `init-interview-session`
3. Server sends first AI question (`transcript.final` role=`ai` + `audio`)
4. Client streams mic frames with `raw-audio-data`
5. Server VAD/STT creates user transcript (`transcript.final` role=`user`)
6. Server generates next question with Gemini and returns TTS audio
