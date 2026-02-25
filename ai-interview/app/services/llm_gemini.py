from __future__ import annotations

import io
import json
import re
from typing import Any, Iterator, Type

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

# ── Phase 4: 금지질문/편향 필터 ─────────────────────────────
# 고용평등법 및 개인정보보호법 기준 금지 영역
_FORBIDDEN_PATTERNS: list[re.Pattern] = [
    re.compile(r"결혼|혼인|배우자|남편|아내|배우", re.IGNORECASE),
    re.compile(r"임신|출산|육아|모성", re.IGNORECASE),
    re.compile(r"(자녀|아이|아들|딸).{0,15}(있|없|몇|계획)", re.IGNORECASE),
    re.compile(r"종교|신앙|교회|성당|절|이슬람", re.IGNORECASE),
    re.compile(r"나이.{0,5}(몇|어떻게|언제)|출생.{0,5}(년|연도)", re.IGNORECASE),
    re.compile(r"(고향|출신지|어디서|어디 출신)\s*(는|이|어디)", re.IGNORECASE),
    re.compile(r"(키|몸무게|체중|외모|외형|피부)", re.IGNORECASE),
    re.compile(r"(장애|병력|건강 상태).{0,10}(있|없|어떤)", re.IGNORECASE),
    re.compile(r"(병역|군대|군복무|군필|미필).{0,10}(어떻게|언제|면제|했)", re.IGNORECASE),
    re.compile(r"(부모님|가족|형제|자매).{0,10}(직업|학력|어디)", re.IGNORECASE),
]


def _extract_json(text: str) -> dict[str, Any]:
    def _strip_fences(raw: str) -> str:
        return re.sub(r"```(?:json)?", "", raw or "", flags=re.IGNORECASE).strip()

    def _decode_first_object(raw: str) -> dict[str, Any] | None:
        decoder = json.JSONDecoder()
        source = (raw or "").strip()
        if not source:
            return None

        for idx, ch in enumerate(source):
            if ch not in "{[":
                continue
            try:
                parsed, _ = decoder.raw_decode(source[idx:])
            except json.JSONDecodeError:
                continue

            if isinstance(parsed, dict):
                return parsed
            if isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, dict):
                        return item
        return None

    cleaned = _strip_fences(text)

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, dict):
                    return item
    except json.JSONDecodeError:
        pass

    first = _decode_first_object(cleaned) or _decode_first_object(text)
    if first is not None:
        return first

    raise ValueError("No JSON object found in model response")


def _to_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        chunks = [str(v).strip() for v in value if str(v).strip()]
        return " ".join(chunks).strip()
    return str(value).strip()


def _to_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [token.strip() for token in re.split(r"[,\n;|•·]", value) if token.strip()]
    text = str(value).strip()
    return [text] if text else []


def _normalize_job_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": _to_text(payload.get("title")),
        "company": _to_text(payload.get("company")),
        "description": _to_text(payload.get("description")),
        "responsibilities": _to_string_list(payload.get("responsibilities")),
        "requirements": _to_string_list(payload.get("requirements")),
        "preferred": _to_string_list(payload.get("preferred")),
        "techStack": _to_string_list(payload.get("techStack")),
        "culture": _to_string_list(payload.get("culture")),
    }


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

    def parse_job_from_text(self, url: str, clean_context: str, retries: int = 2) -> dict[str, Any]:
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
        last_error: Exception | None = None
        for _ in range(max(0, retries) + 1):
            try:
                response = self.model.generate_content(prompt)
                parsed = _normalize_job_payload(_extract_json(self._response_text(response)))
                parsed["url"] = url
                return parsed
            except (ValueError, json.JSONDecodeError) as exc:
                last_error = exc
                continue

        raise ValueError(f"Failed to parse job posting JSON: {last_error}")

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

        # JD gap 분석: 이력서 스킬 텍스트 구성
        requirements = _to_string_list(job_data.get("requirements", []))
        skill_texts: list[str] = []
        for s in (resume_data.get("skills") or []):
            if isinstance(s, dict):
                skill_texts.append(str(s.get("name", "")).strip())
            else:
                skill_texts.append(str(s).strip())
        for exp in (resume_data.get("experience") or []):
            if isinstance(exp, dict):
                for sk in _to_string_list(exp.get("skills", [])):
                    skill_texts.append(sk)
        resume_skills_text = " ".join(t for t in skill_texts if t).lower()

        unmatched: list[str] = []
        for req in requirements:
            req_lower = req.lower()
            words = [w for w in req_lower.split() if len(w) > 2]
            if words and not any(w in resume_skills_text for w in words):
                unmatched.append(req)
            if len(unmatched) >= 3:
                break

        gap_section = ""
        if unmatched:
            items = "\n".join(f"- {r}" for r in unmatched)
            gap_section = f"\n[미매칭 JD 요구사항 - 이 항목을 다루는 질문 1개 이상 포함]\n{items}"

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
}}{gap_section}
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

    def _is_biased_question(self, question: str) -> bool:
        """금지질문/편향 키워드 포함 여부를 정규식으로 빠르게 검사한다."""
        for pattern in _FORBIDDEN_PATTERNS:
            if pattern.search(question):
                return True
        return False

    def _fix_rubric_consistency(self, analysis: dict[str, Any]) -> dict[str, Any]:
        """60/10/30 가중치 점수의 산술적 일관성을 검증하고 자동 보정한다."""
        rubric = analysis.get("rubricScores", {})
        weights = {"design_intent": 60, "code_quality": 10, "ai_usage": 30}
        total = 0.0
        for dim, weight in weights.items():
            if dim not in rubric:
                rubric[dim] = {"raw": 0, "weight": weight, "weighted": 0, "evidence": "", "confidence": 0}
            entry = rubric[dim]
            raw = float(max(0, min(100, entry.get("raw", 0) or 0)))
            weighted = round(raw * weight / 100, 2)
            entry["raw"] = raw
            entry["weight"] = weight
            entry["weighted"] = weighted
            total += weighted
        analysis["rubricScores"] = rubric
        analysis["totalWeightedScore"] = round(total, 2)
        return analysis

    def _fallback_question(
        self,
        slot: int,
        plan_item: QuestionPlanItem,
        context: dict[str, Any],
    ) -> str:
        normalized_slot = max(1, min(5, slot))
        role = (context.get("jobData", {}) or {}).get("role", "해당 직무")
        fallback_by_slot = {
            1: f"{role} 포지션에 지원한 이유와 본인의 핵심 강점을 한 가지 사례와 함께 말씀해 주세요.",
            2: "가장 성과가 좋았던 프로젝트 하나를 골라 문제, 본인 역할, 결과를 수치 중심으로 설명해 주세요.",
            3: "기술 선택에서 두 가지 대안을 비교해 의사결정했던 경험을 말씀해 주세요. 기준과 트레이드오프를 포함해 주세요.",
            4: "협업 중 충돌이나 장애를 겪었던 사례를 설명하고, 본인이 어떻게 해결했는지 구체적으로 말씀해 주세요.",
            5: "입사 후 90일 동안 가장 먼저 실행할 계획을 우선순위와 함께 설명해 주세요.",
        }
        blueprint = (plan_item.questionBlueprint or "").strip()
        return blueprint if blueprint else fallback_by_slot.get(normalized_slot, fallback_by_slot[5])

    def generate_next_question_structured(
        self,
        context: dict[str, Any],
        chat_history: list[dict[str, str]],
        question_index: int,
        planned_questions: list[dict[str, Any]] | None = None,
        current_phase: str = "introduction",
        answer_quality_hint: str = "",
        total_questions: int = 5,
    ) -> dict[str, Any]:
        safe_total_questions = max(3, min(12, int(total_questions or 5)))

        if question_index > safe_total_questions:
            return {
                "question": f"면접이 종료되었습니다. {CLOSING_SENTENCE}",
                "phase": "closing",
                "rationale": "max-question-limit",
                "expectedSignal": "",
            }

        personality = context.get("personality", "professional")
        tone_description = self._tone_description(personality)
        normalized_plan = self._normalize_plan(context=context, raw_plan=planned_questions)
        if question_index <= len(normalized_plan):
            plan_item = normalized_plan[question_index - 1]
        else:
            followup_phase: InterviewPhase = "technical"
            if current_phase in ("experience", "problem_solving"):
                followup_phase = current_phase
            if question_index >= safe_total_questions:
                followup_phase = "closing"

            plan_item = QuestionPlanItem(
                slot=5,
                phase=followup_phase,
                intent="직전 답변의 근거와 의사결정 품질을 깊게 검증",
                questionBlueprint="직전 답변에서 수치/대안/재현성을 확인하는 꼬리질문",
                targetCompetency="근거 기반 문제 해결력",
                evaluationSignals=["수치 근거", "대안 비교", "트레이드오프 설명"],
            )
        previous_answer = self._last_user_answer(chat_history)
        phase_hint = plan_item.phase if question_index <= len(normalized_plan) else current_phase
        if question_index >= safe_total_questions:
            phase_hint = "closing"

        asked_questions = [m.get("parts", "") for m in chat_history if m.get("role") == "model"]
        recent_history = chat_history[-8:]

        prompt = f"""
당신은 숙련된 기술 면접관입니다.
이번 턴에서 질문을 1개만 생성하세요. 반드시 JSON만 출력하세요.

[질문 슬롯]
question_index: {question_index} / {safe_total_questions}
phase: {phase_hint}

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
  "phase": "{phase_hint}",
  "rationale": "왜 이 질문이 필요한지",
  "expectedSignal": "좋은 답변에서 확인할 신호"
}}

강제 규칙:
1) 질문은 정확히 1개만 제시
2) 동일 의미 질문 반복 금지
3) 한국어로 작성
4) {question_index}번 문항이 마지막 턴이면 질문 끝에 반드시 "{CLOSING_SENTENCE}" 포함
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
            phase = phase_hint
            rationale = "fallback-template"
            expected_signal = ", ".join(plan_item.evaluationSignals)

        if question_index >= safe_total_questions and CLOSING_SENTENCE not in question:
            question = f"{question} {CLOSING_SENTENCE}".strip()

        # Phase 4: 편향/금지질문 필터
        if self._is_biased_question(question):
            question = self._sanitize_question(self._fallback_question(question_index, plan_item, context))

        return {
            "question": question,
            "phase": phase,
            "rationale": rationale,
            "expectedSignal": expected_signal,
        }

    def stream_next_question_text(
        self,
        context: dict[str, Any],
        chat_history: list[dict[str, str]],
        question_index: int,
        planned_questions: list[dict[str, Any]] | None = None,
        current_phase: str = "introduction",
        answer_quality_hint: str = "",
        total_questions: int = 5,
    ) -> Iterator[str]:
        safe_total_questions = max(3, min(12, int(total_questions or 5)))
        if question_index > safe_total_questions:
            yield f"면접이 종료되었습니다. {CLOSING_SENTENCE}"
            return

        personality = context.get("personality", "professional")
        tone_description = self._tone_description(personality)
        normalized_plan = self._normalize_plan(context=context, raw_plan=planned_questions)
        if question_index <= len(normalized_plan):
            plan_item = normalized_plan[question_index - 1]
        else:
            followup_phase: InterviewPhase = "technical"
            if current_phase in ("experience", "problem_solving"):
                followup_phase = current_phase
            if question_index >= safe_total_questions:
                followup_phase = "closing"

            plan_item = QuestionPlanItem(
                slot=5,
                phase=followup_phase,
                intent="직전 답변의 근거와 의사결정 품질을 깊게 검증",
                questionBlueprint="직전 답변에서 수치/대안/재현성을 확인하는 꼬리질문",
                targetCompetency="근거 기반 문제 해결력",
                evaluationSignals=["수치 근거", "대안 비교", "트레이드오프 설명"],
            )

        previous_answer = self._last_user_answer(chat_history)
        phase_hint = plan_item.phase if question_index <= len(normalized_plan) else current_phase
        if question_index >= safe_total_questions:
            phase_hint = "closing"

        asked_questions = [m.get("parts", "") for m in chat_history if m.get("role") == "model"]
        recent_history = chat_history[-8:]

        prompt = f"""
당신은 숙련된 기술 면접관입니다.
이번 턴에서 지원자에게 전달할 질문 "한 문장"만 생성하세요.
설명문/서론 없이 질문 텍스트만 출력하고, JSON/마크다운/따옴표를 사용하지 마세요.

[질문 슬롯]
question_index: {question_index} / {safe_total_questions}
phase: {phase_hint}

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

강제 규칙:
1) 질문은 정확히 1개만 제시
2) 동일 의미 질문 반복 금지
3) 한국어로 작성
4) {question_index}번 문항이 마지막 턴이면 질문 끝에 반드시 "{CLOSING_SENTENCE}" 포함
5) 인사/설명문 없이 질문 핵심부터 시작
"""

        emitted = False
        try:
            stream = self.model.generate_content(prompt, stream=True)
            for chunk in stream:
                text = self._response_text(chunk)
                if not text:
                    continue
                emitted = True
                yield text
            if emitted:
                return
        except TypeError:
            # SDK/모델이 stream 파라미터를 지원하지 않으면 fallback으로 전환.
            pass
        except Exception:
            # 스트리밍 실패 시에도 면접은 계속 진행되어야 하므로 fallback.
            pass

        fallback = self.generate_next_question_structured(
            context=context,
            chat_history=chat_history,
            question_index=question_index,
            planned_questions=planned_questions,
            current_phase=current_phase,
            answer_quality_hint=answer_quality_hint,
            total_questions=total_questions,
        )
        yield fallback.get("question", "")

    def finalize_streamed_question(
        self,
        *,
        text: str,
        context: dict[str, Any],
        question_index: int,
        planned_questions: list[dict[str, Any]] | None = None,
        current_phase: str = "introduction",
        total_questions: int = 5,
    ) -> str:
        safe_total_questions = max(3, min(12, int(total_questions or 5)))
        normalized_plan = self._normalize_plan(context=context, raw_plan=planned_questions)

        if question_index <= len(normalized_plan):
            plan_item = normalized_plan[question_index - 1]
        else:
            followup_phase: InterviewPhase = "technical"
            if current_phase in ("experience", "problem_solving"):
                followup_phase = current_phase
            if question_index >= safe_total_questions:
                followup_phase = "closing"
            plan_item = QuestionPlanItem(
                slot=5,
                phase=followup_phase,
                intent="직전 답변의 근거와 의사결정 품질을 깊게 검증",
                questionBlueprint="직전 답변에서 수치/대안/재현성을 확인하는 꼬리질문",
                targetCompetency="근거 기반 문제 해결력",
                evaluationSignals=["수치 근거", "대안 비교", "트레이드오프 설명"],
            )

        question = self._sanitize_question(text)
        if not question:
            question = self._sanitize_question(self._fallback_question(question_index, plan_item, context))

        if question_index >= safe_total_questions and CLOSING_SENTENCE not in question:
            question = f"{question} {CLOSING_SENTENCE}".strip()

        if self._is_biased_question(question):
            question = self._sanitize_question(self._fallback_question(question_index, plan_item, context))

        return question

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
            total_questions=5,
        )

    def analyze_public_repo(self, repo_url: str) -> dict[str, Any]:
        """GitHub 공개 레포를 분석하여 README/트리/인프라 단서를 추출한다."""
        # GitHub API로 공개 여부 확인 및 기본 정보 수집
        normalized = repo_url.rstrip("/")
        parts = normalized.split("/")
        if len(parts) < 5:
            raise ValueError(f"Invalid GitHub URL: {repo_url}")

        owner, repo = parts[-2], parts[-1]
        api_base = f"https://api.github.com/repos/{owner}/{repo}"

        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            repo_resp = client.get(api_base, headers={"Accept": "application/vnd.github.v3+json"})

        if repo_resp.status_code == 404:
            raise PermissionError("PUBLIC_REPO_ONLY")
        if repo_resp.status_code != 200:
            raise PermissionError("PUBLIC_REPO_ONLY")

        repo_data = repo_resp.json()
        if repo_data.get("private"):
            raise PermissionError("PUBLIC_REPO_ONLY")

        default_branch = repo_data.get("default_branch", "main")

        # README 가져오기
        readme_text = ""
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            readme_resp = client.get(
                f"{api_base}/readme",
                headers={"Accept": "application/vnd.github.v3.raw"},
            )
            if readme_resp.status_code == 200:
                readme_text = readme_resp.text[:8000]

        # 파일 트리 가져오기
        tree_text = ""
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            tree_resp = client.get(
                f"{api_base}/git/trees/{default_branch}?recursive=1",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if tree_resp.status_code == 200:
                tree_data = tree_resp.json()
                paths = [
                    item["path"]
                    for item in tree_data.get("tree", [])
                    if item.get("type") == "blob"
                ][:200]
                tree_text = "\n".join(paths)

        # LLM으로 분석
        prompt = f"""
당신은 시니어 개발자 채용 면접관입니다.
아래 GitHub 레포 정보를 바탕으로 포트폴리오 디펜스 면접 준비를 위한 분석을 JSON으로 반환하세요.
반드시 JSON만 출력하세요.

[레포 정보]
repo_url: {repo_url}
owner: {owner}
repo: {repo}
default_branch: {default_branch}

[README]
{readme_text or "(README 없음)"}

[파일 트리 (최대 200개)]
{tree_text or "(트리 정보 없음)"}

[출력 JSON]
{{
  "readmeSummary": "README를 3-5문장으로 요약 (없으면 레포명과 파일구조 기반 추정)",
  "treeSummary": "폴더/파일 구조에서 파악한 아키텍처 특징 2-3문장",
  "infraHypotheses": ["인프라 선택/구성 가설 1", "가설 2", "가설 3"],
  "detectedTopics": ["cicd", "deployment", "monitoring", "incident-response", "ai-usage"]
}}

detectedTopics는 실제 파일트리/README에서 감지된 항목만 포함하세요.
가능한 값: cicd, deployment, monitoring, incident-response, ai-usage, testing, containerization, serverless, database, caching
"""
        response = self.model.generate_content(prompt)
        result = _extract_json(self._response_text(response))
        result["visibility"] = "public"
        result.setdefault("readmeSummary", "")
        result.setdefault("treeSummary", "")
        result.setdefault("infraHypotheses", [])
        result.setdefault("detectedTopics", [])
        return result

    def generate_portfolio_defense_question(
        self,
        repo_context: dict[str, Any],
        chat_history: list[dict[str, str]],
        topic_focus: list[str] | None = None,
        personality: str = "professional",
    ) -> dict[str, Any]:
        """포트폴리오 디펜스 질문 생성 (60/10/30 루브릭 기반)"""
        tone = self._tone_description(personality)
        readme_summary = repo_context.get("readmeSummary", "")
        tree_summary = repo_context.get("treeSummary", "")
        infra_hypotheses = repo_context.get("infraHypotheses", [])
        detected_topics = repo_context.get("detectedTopics", [])

        model_count = len([m for m in chat_history if m.get("role") == "model"])
        asked = [m.get("parts", "") for m in chat_history if m.get("role") == "model"]
        recent = chat_history[-8:]

        prompt = f"""
당신은 시니어 기술 면접관입니다.
아래 공개 레포 정보와 면접 기록을 바탕으로 포트폴리오 디펜스 질문 1개를 생성하세요.
반드시 JSON만 출력하세요.

[평가 루브릭]
- 설계 의도 설명 능력: 60점 (대안 비교, 트레이드오프 설명)
- 코드 품질: 10점 (구조, 유지보수성 근거)
- AI 활용 능력: 30점 (AI 도구 사용 + 검증 루프)

[레포 정보]
README 요약: {readme_summary}
구조 특징: {tree_summary}
인프라 가설: {json.dumps(infra_hypotheses, ensure_ascii=False)}
감지된 토픽: {json.dumps(detected_topics, ensure_ascii=False)}
면접관 톤: {tone}

[현재 질문 번호]
{model_count + 1}번째 질문 (집중 토픽: {json.dumps(topic_focus or detected_topics, ensure_ascii=False)})

[이미 사용한 질문]
{json.dumps(asked, ensure_ascii=False)}

[최근 대화]
{json.dumps(recent, ensure_ascii=False)}

[출력 JSON]
{{
  "question": "면접관 질문 한 문장",
  "targetDimension": "design_intent | code_quality | ai_usage",
  "rationale": "이 질문이 필요한 이유",
  "expectedSignal": "좋은 답변에서 확인할 신호"
}}

규칙:
1) 질문은 1개만, 한국어로
2) 동일한 의미 질문 반복 금지
3) 아키텍처/인프라/AI 활용 중 아직 다루지 않은 영역 우선
4) 5번째 이상 질문이면 마무리 뉘앙스 포함
"""
        fallback_portfolio = {
            "question": "이 프로젝트에서 가장 어려운 기술 의사결정이 무엇이었고, 어떤 대안을 비교했는지 설명해 주세요.",
            "targetDimension": "design_intent",
            "rationale": "fallback",
            "expectedSignal": "대안 비교, 트레이드오프 설명",
        }
        try:
            response = self.model.generate_content(prompt)
            result = _extract_json(self._response_text(response))
            # Phase 4: 편향 필터
            question = result.get("question", "")
            if self._is_biased_question(question):
                return fallback_portfolio
            return result
        except (ValueError, json.JSONDecodeError, ValidationError):
            return fallback_portfolio

    def analyze_weighted(
        self,
        context: dict[str, Any],
        chat_history: list[dict[str, str]],
        session_type: str = "live_interview",
    ) -> dict[str, Any]:
        """60/10/30 루브릭 기반 분석 (portfolio/live 모두 사용)"""
        prompt = f"""
당신은 면접 분석 전문가입니다. 아래 면접 기록을 60/10/30 루브릭으로 분석하세요.
반드시 JSON만 출력하세요.

[루브릭]
- design_intent (설계 의도 설명 능력): 60점 만점
- code_quality (코드 품질): 10점 만점
- ai_usage (AI 활용 능력): 30점 만점

[면접 유형]
{session_type}

[컨텍스트]
{json.dumps(context, ensure_ascii=False)}

[대화 기록]
{json.dumps(chat_history, ensure_ascii=False)}

[출력 JSON]
{{
  "rubricScores": {{
    "design_intent": {{ "raw": number(0-100), "weight": 60, "weighted": number, "evidence": "근거 문장", "confidence": number(0-1) }},
    "code_quality": {{ "raw": number(0-100), "weight": 10, "weighted": number, "evidence": "근거 문장", "confidence": number(0-1) }},
    "ai_usage": {{ "raw": number(0-100), "weight": 30, "weighted": number, "evidence": "근거 문장", "confidence": number(0-1) }}
  }},
  "totalWeightedScore": number,
  "strengths": ["강점1", "강점2"],
  "improvements": ["개선점1", "개선점2"],
  "nextActions": ["다음 면접에서 실천할 행동1", "행동2"]
}}
"""
        empty_rubric: dict[str, Any] = {
            "rubricScores": {
                "design_intent": {"raw": 0, "weight": 60, "weighted": 0, "evidence": "분석 실패", "confidence": 0},
                "code_quality": {"raw": 0, "weight": 10, "weighted": 0, "evidence": "분석 실패", "confidence": 0},
                "ai_usage": {"raw": 0, "weight": 30, "weighted": 0, "evidence": "분석 실패", "confidence": 0},
            },
            "totalWeightedScore": 0,
            "strengths": [],
            "improvements": [],
            "nextActions": [],
        }
        try:
            response = self.model.generate_content(prompt)
            result = _extract_json(self._response_text(response))
            return self._fix_rubric_consistency(result)
        except (ValueError, json.JSONDecodeError, ValidationError):
            return empty_rubric

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
