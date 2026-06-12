import time

from src.common.config.settings import TAG_RETRY_BASE_MS
from src.common.genai_client import get_genai_client

ALLOWED_TAGS = [
    # 프론트엔드
    "frontend", "react", "nextjs", "javascript", "typescript", "css", "web", "ui/ux", "design",
    # 백엔드
    "backend", "nodejs", "nestjs", "spring", "java", "python", "go", "api", "database",
    # 인공지능 (AI)
    "ai", "ai-ml", "llm", "genai", "mlops", "nlp", "cv",
    # 데브옵스 (DevOps)
    "devops", "kubernetes", "docker", "terraform", "monitoring", "logging", "sre", "cloud", "cicd",
    # 아키텍처
    "architecture", "scalability", "micro frontend", "monorepo", "module federation", "system design",
    # 기타
    "career", "culture", "business", "product", "ad", "case-study",
]

def merge_and_dedupe(tags):
    normalized = []
    for tag in tags:
        if tag:
            normalized_tag = str(tag).lower().strip()
            if normalized_tag:
                normalized.append(normalized_tag)
    return list(dict.fromkeys(normalized))

def parse_tags_from_text(text):
    if not text:
        return []
    text = text.replace("[", "").replace("]", "")
    parts = [p.strip().lower() for p in text.replace("\n", ",").split(",") if p.strip()]
    return merge_and_dedupe(parts)

def build_prompt(title, summary="", author=""):
    allowed = ", ".join(ALLOWED_TAGS)
    return f"""
You are a concise tagger for a tech blog aggregator.
Article:
- Title: {title}
- Author/Blog: {author}
- Summary: {summary}

Task: Choose 3-6 tags that best describe the article from the allowed list.
Allowed List: {allowed}

Output Format: Comma-separated list only. No extra text.
""".strip()

def generate_with_gemini(prompt, retry_count=0):
    client = get_genai_client()
    if client is None:
        print("⚠️ Gemini 백엔드 없음 (Vertex/AI Studio 모두 미설정).")
        return ""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "safety_settings": [
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                ],
            },
        )
        return response.text or ""
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower() or "resource_exhausted" in error_msg.lower():
            if retry_count < 3:
                wait_time = (2 ** retry_count) * TAG_RETRY_BASE_MS / 1000.0
                print(f"⏳ Rate Limit hit. Retrying in {wait_time}s... (Attempt {retry_count + 1}/3)")
                time.sleep(wait_time)
                return generate_with_gemini(prompt, retry_count + 1)
            else:
                print(f"❌ Max retries exceeded for Gemini: {error_msg}")
        else:
            print(f"❌ Gemini request failed: {e}")
        return ""


def generate_tags_fallback(title, summary, author):
    """
    AI API 호출 실패 시 사용하는 단순 키워드 매칭 대체 로직입니다.
    """
    combined_text = (title + " " + summary).lower()
    found_tags = []

    keyword_map = {
        "react": "react", "next": "nextjs", "vue": "frontend", "angular": "frontend",
        "javascript": "javascript", "typescript": "typescript", "css": "css",
        "spring": "spring", "java": "java", "node": "nodejs", "nodejs": "nodejs", "express": "nodejs",
        "nest": "nestjs", "nestjs": "nestjs", "python": "python", "django": "python", "flask": "python", "fastapi": "python",
        "go": "go", "golang": "go", "rust": "backend", "c++": "backend", "c#": "backend", "php": "backend", "laravel": "backend",
        "aws": "cloud", "azure": "cloud", "gcp": "cloud", "docker": "docker", "k8s": "kubernetes",
        "kubernetes": "kubernetes", "ci/cd": "cicd", "jenkins": "cicd", "github actions": "cicd", "git": "devops",
        "myql": "database", "postgresql": "database", "postgres": "database", "oracle": "database", "mongodb": "database", "redis": "database",
        "kafka": "backend", "rabbitmq": "backend", "elastic": "backend", "elasticsearch": "backend",
        "linux": "devops", "ubuntu": "devops", "jira": "cooperation", "confluence": "cooperation", "slack": "cooperation",
        "ai": "ai", "llm": "llm", "gpt": "genai", "machine learning": "ai-ml",
        "design": "design", "ux": "ui/ux", "ui": "ui/ux",
        "career": "career", "interview": "career", "salary": "career",
        "startup": "business", "agile": "culture", "scrum": "culture"
    }

    import re

    # 성능을 위해 정규식 패턴을 미리 컴파일할까요?
    # 현재는 리스트가 작으므로 단순 반복문으로도 충분합니다.

    for keyword, tag in keyword_map.items():
        # 단순 단어들이지만 만약을 위해 키워드를 이스케이프 처리합니다
        pattern = r"(?<![a-zA-Z0-9])" + re.escape(keyword) + r"(?![a-zA-Z0-9])"
        # 결합된 텍스트에서 검색
        if re.search(pattern, combined_text):
            found_tags.append(tag)

    return merge_and_dedupe(found_tags)[:5]

def generate_tags_for_article(article):
    """
    article 딕셔너리는 반드시 title, summary, author를 포함해야 합니다.
    """
    if get_genai_client() is None:
        print("⚠️ Gemini 백엔드 없음 - 폴백 태그 사용.")
        return generate_tags_fallback(article.get("title", ""), article.get("summary", ""), article.get("author", ""))

    try:
        prompt = build_prompt(
            title=article.get("title", ""),
            summary=article.get("summary", ""),
            author=article.get("author", "")
        )

        text = generate_with_gemini(prompt)
        # API가 빈 값을 반환하면 (최대 재시도 초과 또는 오류), 대체 로직을 사용합니다
        if not text:
            print("⚠️ API failed/empty - using fallback tags.")
            return generate_tags_fallback(article.get("title", ""), article.get("summary", ""), article.get("author", ""))

        parsed_tags = parse_tags_from_text(text)
        filtered = [tag for tag in parsed_tags if tag in ALLOWED_TAGS]
        result = merge_and_dedupe(filtered)[:6]

        # 필터링 후 AI 결과가 비어있다면, 혹시 모르니 대체 로직을 시도합니다
        if not result:
             return generate_tags_fallback(article.get("title", ""), article.get("summary", ""), article.get("author", ""))

        return result
    except Exception as e:
        print(f"❌ Error generating tags: {e}")
        return []

def base_tags_from_feed_category(category):
    if not category:
        return []
    key = str(category).upper()
    if key == "FE":
        return ["frontend", "web"]
    elif key == "BE":
        return ["backend"]
    elif key == "AI":
        return ["ai"]
    elif key == "APP":
        return ["mobile"]
    return []
