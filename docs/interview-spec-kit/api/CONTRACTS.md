# REST / WS Contracts

## 1) 브라우저 공개 경로 (Next BFF)
- `POST /api/interview/session/start`
- `POST /api/interview/chat`
- `POST /api/interview/analyze`
- `POST /api/interview/training/replay/start`
- `POST /api/interview/training/replay/chat`
- `POST /api/interview/portfolio/analyze-public-repo`
- `POST /api/interview/portfolio/session/start`

## 2) FastAPI 내부 경로
- `POST /v1/interview/session/start`
- `POST /v1/interview/chat`
- `POST /v1/interview/analyze`
- `POST /v1/interview/replay/start`
- `POST /v1/interview/replay/chat`
- `POST /v1/interview/portfolio/analyze-public-repo`
- `POST /v1/interview/portfolio/session/start`
- `WS /v1/interview/ws/client`

## 2-1) WS 아바타 이벤트 계약 (추가)

### server -> client
```json
{
  "type": "avatar.state",
  "state": "idle|thinking|listening|speaking",
  "sessionId": "uuid",
  "timestamp": 1700000000
}
```

### client 렌더 규칙
- `state=speaking` 인 동안 면접관 아바타 활성 애니메이션
- `state=listening` 인 동안 사용자 입력 강조 상태 표시
- 알 수 없는 상태 수신 시 `idle`로 fallback
- MVP에서는 `viseme` 필드를 사용하지 않고 `state`만으로 아바타를 렌더한다.

## 3) Replay Start Contract

### request
```json
{
  "originSessionId": "uuid",
  "originTurnId": "uuid",
  "mode": "chat",
  "personality": "professional"
}
```

### response
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "sessionType": "replay_simulation",
    "restoredPhase": "technical"
  }
}
```

## 4) Public Repo Analyze Contract

### request
```json
{
  "repoUrl": "https://github.com/org/repo"
}
```

### response
```json
{
  "success": true,
  "data": {
    "visibility": "public",
    "readmeSummary": "...",
    "treeSummary": "...",
    "infraHypotheses": ["..."],
    "detectedTopics": ["cicd", "deployment", "monitoring", "incident-response"]
  }
}
```

### 에러 규칙
- private repo 또는 접근 불가:
```json
{
  "success": false,
  "error": "PUBLIC_REPO_ONLY"
}
```

## 5) Portfolio Session Start Contract

### request
```json
{
  "repoUrl": "https://github.com/org/repo",
  "mode": "chat",
  "focus": ["architecture", "infra", "ai-usage"]
}
```

### response
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "sessionType": "portfolio_defense",
    "rubricWeights": {
      "designIntent": 60,
      "codeQuality": 10,
      "aiUsage": 30
    }
  }
}
```
