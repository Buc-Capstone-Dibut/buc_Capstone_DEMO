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
