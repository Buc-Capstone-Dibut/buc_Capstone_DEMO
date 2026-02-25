from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

SessionType = Literal["live_interview", "portfolio_defense"]


class ParseJobRequest(BaseModel):
    url: str


class ChatMessage(BaseModel):
    role: Literal["user", "model", "system"]
    parts: str


class SessionStartRequest(BaseModel):
    mode: Literal["chat", "voice", "video"] = "chat"
    personality: str = "professional"
    jobData: dict[str, Any] = Field(default_factory=dict)
    resumeData: Any = None
    targetDurationSec: int = Field(default=420, ge=300, le=600)
    closingThresholdSec: int = Field(default=60, ge=30, le=120)


class SessionStartResponse(BaseModel):
    sessionId: str
    mode: str
    status: str


# ── Portfolio ─────────────────────────────────────────────
class PortfolioAnalyzeRequest(BaseModel):
    repoUrl: str


class PortfolioAnalyzeResponse(BaseModel):
    visibility: str
    readmeSummary: str
    treeSummary: str
    infraHypotheses: list[str]
    detectedTopics: list[str]


class PortfolioSessionStartRequest(BaseModel):
    repoUrl: str
    mode: Literal["chat", "voice", "video"] = "voice"
    focus: list[str] = Field(default_factory=lambda: ["architecture", "infra", "ai-usage"])
    readmeSummary: str = ""
    treeSummary: str = ""
    infraHypotheses: list[str] = Field(default_factory=list)
    detectedTopics: list[str] = Field(default_factory=list)
    targetDurationSec: int = Field(default=420, ge=300, le=600)
    closingThresholdSec: int = Field(default=60, ge=30, le=120)


class PortfolioSessionStartResponse(BaseModel):
    sessionId: str
    sessionType: str
    rubricWeights: dict[str, int]


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    jobData: dict[str, Any] = Field(default_factory=dict)
    resumeData: Any = None
    personality: str = "professional"
    sessionId: str | None = None
    targetDurationSec: int = Field(default=420, ge=300, le=600)
    closingThresholdSec: int = Field(default=60, ge=30, le=120)


class AnalyzeRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    jobData: dict[str, Any] = Field(default_factory=dict)
    resumeData: Any = None
    personality: str = "professional"
    sessionId: str | None = None


InterviewPhase = Literal[
    "introduction",
    "experience",
    "technical",
    "problem_solving",
    "closing",
]


class QuestionPlanItem(BaseModel):
    slot: int = Field(ge=1, le=5)
    phase: InterviewPhase
    intent: str = ""
    questionBlueprint: str = ""
    targetCompetency: str = ""
    evaluationSignals: list[str] = Field(default_factory=list)


class QuestionPlanResponse(BaseModel):
    plan: list[QuestionPlanItem] = Field(default_factory=list)


class NextQuestionDraft(BaseModel):
    question: str
    phase: InterviewPhase
    rationale: str = ""
    expectedSignal: str = ""


class EvaluationScores(BaseModel):
    jobFit: int = Field(default=0, ge=0, le=100)
    logic: int = Field(default=0, ge=0, le=100)
    communication: int = Field(default=0, ge=0, le=100)
    attitude: int = Field(default=0, ge=0, le=100)


class HabitItem(BaseModel):
    habit: str = ""
    count: int = Field(default=0, ge=0)
    severity: Literal["low", "medium", "high"] = "low"


class Feedback(BaseModel):
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)


class BestPractice(BaseModel):
    question: str = ""
    userAnswer: str = ""
    refinedAnswer: str = ""
    reason: str = ""


class AnalysisReport(BaseModel):
    overallScore: int = Field(default=0, ge=0, le=100)
    passProbability: int = Field(default=0, ge=0, le=100)
    evaluation: EvaluationScores = Field(default_factory=EvaluationScores)
    sentimentTimeline: list[int] = Field(default_factory=list)
    habits: list[HabitItem] = Field(default_factory=list)
    feedback: Feedback = Field(default_factory=Feedback)
    bestPractices: list[BestPractice] = Field(default_factory=list)


class TtsRequest(BaseModel):
    text: str
