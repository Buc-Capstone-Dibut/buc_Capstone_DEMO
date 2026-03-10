# Report Models

## live_interview
### 목표
- 현재 `/interview/result`의 mock 기반 화면을 그대로 살릴 수 있어야 한다.

### `compatAnalysis`
- `overallScore`
- `passProbability`
- `evaluation`
  - `jobFit`
  - `logic`
  - `communication`
  - `attitude`
- `sentimentTimeline`
- `habits`
- `feedback`
  - `strengths`
  - `improvements`
- `bestPractices`

### `reportView`
- `badgeLabel`
- `typeName`
- `typeLabels`
- `summary`
- `fitSummary`
- `heroMetrics`
- `metaItems`
- `axes`
- `axisEvidence`
- `strengths`
- `weaknesses`
- `focusPoint`
- `nextActions`
- `questionHighlights`
- `deliveryInsights`
- `habits`
- `footerActions`

### `timeline`
- 각 entry는 다음을 가진다.
  - `exchangeIndex`
  - `timeLabel`
  - `phaseLabel`
  - `question`
  - `answer`
  - `recommendedAnswer`
  - `followUp`

## portfolio_defense
### 목표
- 현재 `/interview/training/portfolio/report`의 구조를 그대로 유지한다.

### `compatAnalysis`
- `rubricScores`
- `totalWeightedScore`
- `strengths`
- `improvements`
- `nextActions`

### `reportView`
- `badgeLabel`
- `typeName`
- `typeLabels`
- `summary`
- `heroMetrics`
- `metaItems`
- `axes`
- `axisEvidence`
- `strengths`
- `weaknesses`
- `focusPoint`
- `nextActions`
- `defenseSummary`
- `narrativeHighlights`
- `topicCoverage`
- `contributionInsights`
- `transcriptHighlights`
- `footerActions`

## `generationMeta`
- `generatedAt`
- `model`
- `provider`
- `sessionType`
- `totalTurns`
- `effectiveDurationSec`
- `reportLatencyMs`
