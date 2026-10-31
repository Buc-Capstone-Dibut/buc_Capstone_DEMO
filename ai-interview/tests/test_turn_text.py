from __future__ import annotations

import unittest

from app.interview.domain.turn_text import sanitize_user_turn_text


class TurnTextUserTranscriptTests(unittest.TestCase):
    def test_formats_demo_technical_terms_without_rewriting_the_answer(self) -> None:
        raw = "실무 경험은 없지만 수업에서 스프링으로 crud를 만들어 봤고, 지금은 스프링 부트로 송금 api를 만들고 있습니다."
        expected = "실무 경험은 없지만 수업에서 스프링으로 CRUD를 만들어 봤고, 지금은 Spring Boot로 송금 API를 만들고 있습니다."
        self.assertEqual(sanitize_user_turn_text(raw), expected)
        self.assertEqual(sanitize_user_turn_text(expected), expected)
        for untouched in ("김리버입니다.", "SpringBootApplication", "crudRepository", "RapidAPI", "스프링 부트캠프"):
            with self.subTest(untouched=untouched):
                self.assertEqual(sanitize_user_turn_text(untouched), untouched)

    def test_preserves_decimal_values_versions_and_dotted_technical_names(self) -> None:
        for text in (
            "오류율을 0.15%로 줄였습니다.",
            "Next.js와 Node.js를 사용했습니다.",
            "Python 3.11과 OAuth 2.0을 사용했습니다.",
            "12:30에 월 1,000건을 처리했습니다.",
        ):
            with self.subTest(text=text):
                cleaned = sanitize_user_turn_text(text)
                # Korean spacing may change, but lexical/numeric content cannot.
                self.assertEqual(cleaned.replace(" ", ""), text.replace(" ", ""))
                for token in ("0.15", "Next.js", "Node.js", "3.11", "2.0", "12:30", "1,000"):
                    if token in text:
                        self.assertIn(token, cleaned)
                self.assertEqual(sanitize_user_turn_text(cleaned), cleaned)

    def test_still_separates_sentences_and_list_punctuation(self) -> None:
        self.assertEqual(
            sanitize_user_turn_text("안녕하세요.반갑습니다!저는 백엔드,프론트엔드를 담당했습니다."),
            "안녕하세요. 반갑습니다! 저는 백엔드, 프론트엔드를 담당했습니다.",
        )

    def test_sanitize_user_turn_text_recovers_common_technical_terms(self) -> None:
        text = (
            "실시간 AI 면접서 비스 를개발하며웹소켓기반통신과백엔드 PI 구조설계해 "
            "여러 사용자의동요청을안정 적으로 처리 하는 스템 현한 경험 이 있습니다."
        )

        sanitized = sanitize_user_turn_text(text)

        self.assertIn("AI 면접 서비스", sanitized)
        self.assertIn("웹소켓 기반", sanitized)
        self.assertIn("API", sanitized)
        self.assertIn("구조 설계", sanitized)
        self.assertIn("동시 요청", sanitized)
        self.assertIn("안정적으로", sanitized)
        self.assertIn("처리하는", sanitized)
        self.assertIn("시스템 구현한 경험", sanitized)
        self.assertNotIn(" PI ", sanitized)
        self.assertNotIn("스템 현한", sanitized)


if __name__ == "__main__":
    unittest.main()
