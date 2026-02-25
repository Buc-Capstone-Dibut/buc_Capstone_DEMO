from __future__ import annotations

import io
import json
import re
from typing import Any, Type

import google.generativeai as genai
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, ValidationError
from pypdf import PdfReader

from app.schemas.interview import InterviewPhase, NextQuestionDraft, QuestionPlanItem, QuestionPlanResponse


PHASE_BY_SLOT: dict[int, InterviewPhase] = {
    1: "introduction",
    2: "experience",
    3: "technical",
    4: "problem_solving",
    5: "closing",
}
CLOSING_SENTENCE = "수고하셨습니다. 이것으로 모든 면접을 마치겠습니다."


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip().replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        raise ValueError("No JSON object found in model response")

    return json.loads(match.group(0))


class GeminiService:
    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is missing")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)

    def _response_text(self, response: Any) -> str:
        text = getattr(response, "text", None)
        if isinstance(text, str):
            return text
        if callable(text):
            return text()
        return str(response)

    def fetch_url_text(self, url: str) -> str:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            res = client.get(url)
            res.raise_for_status()

        soup = BeautifulSoup(res.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "iframe"]):
            tag.decompose()

        text = soup.get_text(" ", strip=True)
        return re.sub(r"\s+", " ", text)[:15000]

    def parse_job_from_text(self, url: str, clean_context: str) -> dict[str, Any]:
        prompt = f"""
Analyze the following job posting text and extract key information in JSON format.
Translate everything into Korean if it's in English.

Text:
{clean_context}

Output JSON Format:
{{
  "title": "Job Title",
  "company": "Company Name",
  "description": "Brief summary of the company/service (2-3 sentences)",
  "responsibilities": ["Task 1", "Task 2"],
  "requirements": ["Requirement 1", "Requirement 2"],
  "preferred": ["Bonus skill 1", "Bonus skill 2"],
  "techStack": ["React", "Node.js", "AWS"],
  "culture": ["Culture item 1", "Culture item 2"]
}}

If specific info is missing, leave the array empty.
"""
        response = self.model.generate_content(prompt)
        parsed = _extract_json(self._response_text(response))
        parsed["url"] = url
        return parsed

    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        reader = PdfReader(io.BytesIO(file_bytes))
        texts: list[str] = []
        for page in reader.pages:
            texts.append(page.extract_text() or "")
        return "\n".join(texts).strip()

    def parse_resume_from_text(self, resume_text: str) -> dict[str, Any]:
        prompt = f"""
이력서 정보를 분석하여 아래 JSON 형식에 맞춰 핵심 정보를 추출해주세요.
모든 내용은 한국어를 기본으로 하되, 기술 스택명 등은 고유 명사를 존중하여 작성해주세요.

이력서 텍스트:
{resume_text[:20000]}

Output JSON Format:
{{
  "personalInfo": {{
    "name": "이름 (파일에서 추출)",
    "email": "이메일",
    "phone": "전화번호",
    "intro": "한 줄 소개",
    "links": {{
      "github": "Github URL if exists",
      "blog": "Blog/Portfolio URL if exists"
    }}
  }},
  "education": [
    {{ "school": "학교명", "major": "전공", "period": "기간", "degree": "학위" }}
  ],
  "experience": [
    {{ "company": "회사명", "position": "직무", "period": "기간", "description": "주요 역할 및 성과 요약" }}
  ],
  "skills": [
    {{ "name": "스킬명", "category": "분류", "level": "Basic/Intermediate/Advanced" }}
  ],
  "projects": [
    {{
      "name": "프로젝트명",
      "period": "기간",
      "description": "프로젝트 상세 설명",
      "techStack": ["사용한 기술 1", "사용한 기술 2"],
      "achievements": ["핵심 성과 1", "핵심 성과 2"]
    }}
  ]
}}

주의사항:
1. 데이터가 없는 경우 빈 문자열("") 또는 빈 배열([])로 채워주세요.
2. 마크다운 코드블록 없이 순수 JSON만 응답하세요.
3. 수치화된 성과가 있다면 포함해주세요.
"""
        response = self.model.generate_content(prompt)
        return _extract_json(self._response_text(response))

    def _tone_description(self, personality: str) -> str:
        if personality == "friendly":
            return "부드럽고 따뜻한 말투로 긴장을 낮춰주되, 질문의 난이도는 유지하세요."
        if personality == "cold":
            return "냉철하고 날카로운 톤으로 허점을 파고드는 압박 면접 스타일을 유지하세요."
        return "전문적이고 구조화된 톤으로 논리와 근거를 끌어내는 면접관처럼 진행하세요."

    def _default_question_plan(self, context: dict[str, Any]) -> list[QuestionPlanItem]:
        job_data = context.get("jobData", {}) or {}
        role = job_data.get("role", "지원 직무")
        tech_stack = ", ".join((job_data.get("techStack") or [])[:4]) or "핵심 기술 스택"

        return [
            QuestionPlanItem(
                slot=1,
                phase="introduction",
                intent="지원 동기와 직무 관심도 확인",
                questionBlueprint=f"{role} 포지션에 지원한 동기와 본인의 핵심 강점을 1분 내로 설명하게 유도",
                targetCompetency="직무 적합성",
                evaluationSignals=["지원 동기의 구체성", "직무 이해도"],
            ),
            QuestionPlanItem(
                slot=2,
                phase="experience",
                intent="가장 관련도 높은 실전 경험 검증",
                questionBlueprint="핵심 프로젝트 하나를 STAR 구조로 설명하게 유도",
                targetCompetency="문제 해결력",
                evaluationSignals=["문제 정의 명확성", "본인 기여도", "성과 지표"],
            ),
            QuestionPlanItem(
                slot=3,
                phase="technical",
                intent="기술 의사결정 깊이 점검",
                questionBlueprint=f"{tech_stack} 관련 설계/트레이드오프 질문",
                targetCompetency="기술 깊이",
                evaluationSignals=["대안 비교", "근거", "리스크 인지"],
            ),
            QuestionPlanItem(
                slot=4,
                phase="problem_solving",
                intent="협업 및 실패 대응 역량 확인",
                questionBlueprint="갈등, 장애, 실패 복구 중 하나를 구체 사례로 답하게 유도",
                targetCompetency="협업/태도",
                evaluationSignals=["회고 능력", "커뮤니케이션", "재발 방지"],
            ),
            QuestionPlanItem(
                slot=5,
                phase="closing",
                intent="마무리 질문으로 성장 가능성과 포지션 매칭도 확인",
                questionBlueprint="입사 후 90일 실행 계획 또는 마지막 어필 포인트를 질문",
                targetCompetency="성장성",
                evaluationSignals=["현실성", "우선순위", "자기 인식"],
            ),
        ]

    def _normalize_plan(self, context: dict[str, Any], raw_plan: list[dict[str, Any]] | None) -> list[QuestionPlanItem]:
        defaults = {item.slot: item for item in self._default_question_plan(context)}
        normalized: dict[int, QuestionPlanItem] = {}

        for entry in raw_plan or []:
            try:
                parsed = QuestionPlanItem.model_validate(entry)
            except ValidationError:
                continue

            if parsed.slot not in PHASE_BY_SLOT:
                continue

            parsed.phase = PHASE_BY_SLOT[parsed.slot]
            normalized[parsed.slot] = parsed

        merged: list[QuestionPlanItem] = []
        for slot in range(1, 6):
            merged.append(normalized.get(slot) or defaults[slot])
        return merged

    def build_interview_plan(self, context: dict[str, Any], retries: int = 1) -> list[dict[str, Any]]:
        job_data = context.get("jobData", {}) or {}
        resume_data = context.get("resumeData", {}) or {}

        prompt = f"""
당신은 시니어 기술 면접관입니다.
아래 JD와 이력서를 기반으로 "5문항 고정" 질문 설계를 JSON으로 작성하세요.
문항 간 난이도는 점진적으로 상승해야 하며, 마지막 문항은 마무리 질문입니다.

[JD]
회사명: {job_data.get('company', '')}
직무: {job_data.get('role', '')}
회사 소개: {job_data.get('companyDescription', '')}
주요 업무: {', '.join(job_data.get('responsibilities', []) or [])}
기술 스택: {', '.join(job_data.get('techStack', []) or [])}

[이력서]
{json.dumps(resume_data, ensure_ascii=False)}

출력 규칙:
1) 반드시 JSON만 출력
2) plan 배열은 정확히 5개
3) slot은 1~5, phase는 각 slot과 동일하게
slot1=introduction, slot2=experience, slot3=technical, slot4=problem_solving, slot5=closing

JSON 형식:
{{
  "plan": [
    {{
      "slot": 1,
      "phase": "introduction",
      "intent": "질문 의도",
      "questionBlueprint": "실제 질문을 만들기 위한 설계 문장",
      "targetCompetency": "평가 역량",
      "evaluationSignals": ["평가 신호1", "평가 신호2"]
    }}
  ]
}}
"""

        attempt = 0
        while attempt <= retries:
            try:
                response = self.model.generate_content(prompt)
                payload = _extract_json(self._response_text(response))
                parsed = QuestionPlanResponse.model_validate(payload)
                plan_items = self._normalize_plan(
                    context=context,
                    raw_plan=[item.model_dump() for item in parsed.plan],
                )
                return [item.model_dump() for item in plan_items]
            except (ValueError, json.JSONDecodeError, ValidationError):
                attempt += 1

        fallback = self._default_question_plan(context)
        return [item.model_dump() for item in fallback]

    def _last_user_answer(self, chat_history: list[dict[str, str]]) -> str:
        for message in reversed(chat_history):
            if message.get("role") == "user":
                return (message.get("parts") or "").strip()
        return ""

    def _sanitize_question(self, text: str) -> str:
        cleaned = re.sub(r"\s+", " ", (text or "")).strip()
        cleaned = re.sub(r"^질문\s*\d+\s*[:.)-]\s*", "", cleaned, flags=re.IGNORECASE)
        return cleaned

    def _fallback_question(
        self,
        slot: int,
        plan_item: QuestionPlanItem,
        context: dict[str, Any],
    ) -> str:
        role = (context.get("jobData", {}) or {}).get("role", "해당 직무")
        fallback_by_slot = {
            1: f"{role} 포지션에 지원한 이유와 본인의 핵심 강점을 한 가지 사례와 함께 말씀해 주세요.",
            2: "가장 성과가 좋았던 프로젝트 하나를 골라 문제, 본인 역할, 결과를 수치 중심으로 설명해 주세요.",
            3: "기술 선택에서 두 가지 대안을 비교해 의사결정했던 경험을 말씀해 주세요. 기준과 트레이드오프를 포함해 주세요.",
            4: "협업 중 충돌이나 장애를 겪었던 사례를 설명하고, 본인이 어떻게 해결했는지 구체적으로 말씀해 주세요.",
            5: "입사 후 90일 동안 가장 먼저 실행할 계획을 우선순위와 함께 설명해 주세요.",
        }
        blueprint = (plan_item.questionBlueprint or "").strip()
        return blueprint if blueprint else fallback_by_slot.get(slot, fallback_by_slot[5])

    def generate_next_question_structured(
        self,
        context: dict[str, Any],
        chat_history: list[dict[str, str]],
        question_index: int,
        planned_questions: list[dict[str, Any]] | None = None,
        current_phase: str = "introduction",
        answer_quality_hint: str = "",
    ) -> dict[str, Any]:
        if question_index >= 6:
            return {
                "question": f"면접이 종료되었습니다. {CLOSING_SENTENCE}",
                "phase": "closing",
                "rationale": "max-question-limit",
                "expectedSignal": "",
            }

        personality = context.get("personality", "professional")
        tone_description = self._tone_description(personality)
        normalized_plan = self._normalize_plan(context=context, raw_plan=planned_questions)
        plan_item = normalized_plan[question_index - 1]
        previous_answer = self._last_user_answer(chat_history)

        asked_questions = [m.get("parts", "") for m in chat_history if m.get("role") == "model"]
        recent_history = chat_history[-8:]

        prompt = f"""
당신은 숙련된 기술 면접관입니다.
이번 턴에서 질문을 1개만 생성하세요. 반드시 JSON만 출력하세요.

[질문 슬롯]
question_index: {question_index} / 5
phase: {PHASE_BY_SLOT.get(question_index, 'closing')}

[면접관 톤]
{tone_description}

[현재 설계 문항]
intent: {plan_item.intent}
questionBlueprint: {plan_item.questionBlueprint}
targetCompetency: {plan_item.targetCompetency}
evaluationSignals: {json.dumps(plan_item.evaluationSignals, ensure_ascii=False)}

[답변 품질 힌트]
{answer_quality_hint or "없음"}

[직전 지원자 답변]
{previous_answer or "직전 답변 없음"}

[이미 사용한 질문]
{json.dumps(asked_questions, ensure_ascii=False)}

[최근 대화 이력]
{json.dumps(recent_history, ensure_ascii=False)}

출력 JSON 형식:
{{
  "question": "지원자에게 바로 전달할 질문 한 문장",
  "phase": "{PHASE_BY_SLOT.get(question_index, current_phase)}",
  "rationale": "왜 이 질문이 필요한지",
  "expectedSignal": "좋은 답변에서 확인할 신호"
}}

강제 규칙:
1) 질문은 정확히 1개만 제시
2) 동일 의미 질문 반복 금지
3) 한국어로 작성
4) {question_index}번 문항이 5번이면 질문 끝에 반드시 "{CLOSING_SENTENCE}" 포함
5) 인사/설명문만 출력하지 말고 질문 핵심이 먼저 나오게 작성
"""

        try:
            response = self.model.generate_content(prompt)
            payload = _extract_json(self._response_text(response))
            parsed = NextQuestionDraft.model_validate(payload)
            question = self._sanitize_question(parsed.question)
            phase = parsed.phase
            rationale = parsed.rationale
            expected_signal = parsed.expectedSignal
        except (ValueError, json.JSONDecodeError, ValidationError):
            question = self._sanitize_question(self._fallback_question(question_index, plan_item, context))
            phase = PHASE_BY_SLOT.get(question_index, "closing")
            rationale = "fallback-template"
            expected_signal = ", ".join(plan_item.evaluationSignals)

        if question_index == 5 and CLOSING_SENTENCE not in question:
            question = f"{question} {CLOSING_SENTENCE}".strip()

        return {
            "question": question,
            "phase": phase,
            "rationale": rationale,
            "expectedSignal": expected_signal,
        }

    def generate_next_question(
        self,
        context: dict[str, Any],
        chat_history: list[dict[str, str]],
    ) -> dict[str, Any]:
        model_message_count = len([m for m in chat_history if m.get("role") == "model"])
        return self.generate_next_question_structured(
            context=context,
            chat_history=chat_history,
            question_index=model_message_count + 1,
            planned_questions=None,
            current_phase=PHASE_BY_SLOT.get(model_message_count + 1, "closing"),
            answer_quality_hint="",
        )

    def analyze_interview(
        self,
        context: dict[str, Any],
        chat_history: list[dict[str, str]],
        validator: Type[BaseModel] | None = None,
        retries: int = 1,
    ) -> dict[str, Any]:
        job_data = context.get("jobData", {})
        resume_data = context.get("resumeData", {})

        prompt = f"""
당신은 면접 분석 전문가입니다. 아래 면접 기록을 바탕으로 상세 분석 리포트를 작성하세요.
반드시 JSON만 출력하세요.

[분석 대상 데이터]
직무: {job_data.get('role', '')} @ {job_data.get('company', '')}
이력서: {json.dumps(resume_data, ensure_ascii=False)}
면접 대화 기록: {json.dumps(chat_history, ensure_ascii=False)}

[JSON 형식]
{{
  "overallScore": number (0-100),
  "passProbability": number (0-100),
  "evaluation": {{
    "jobFit": number (0-100),
    "logic": number (0-100),
    "communication": number (0-100),
    "attitude": number (0-100)
  }},
  "sentimentTimeline": [number],
  "habits": [
    {{ "habit": "어...", "count": number, "severity": "low" | "medium" | "high" }}
  ],
  "feedback": {{
    "strengths": [string],
    "improvements": [string]
  }},
  "bestPractices": [
    {{
      "question": "핵심 질문",
      "userAnswer": "지원자 답변",
      "refinedAnswer": "개선 답변",
      "reason": "개선 이유"
    }}
  ]
}}
"""

        attempt = 0
        last_error: Exception | None = None

        while attempt <= retries:
            try:
                response = self.model.generate_content(prompt)
                payload = _extract_json(self._response_text(response))

                if validator is not None:
                    validated = validator.model_validate(payload)
                    return validated.model_dump()

                return payload
            except (ValueError, json.JSONDecodeError, ValidationError) as exc:
                last_error = exc
                attempt += 1

        raise RuntimeError(f"Failed to generate valid analysis JSON: {last_error}")
