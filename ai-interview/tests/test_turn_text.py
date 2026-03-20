from __future__ import annotations

import unittest

from app.interview.domain.turn_text import sanitize_user_turn_text


class TurnTextUserTranscriptTests(unittest.TestCase):
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
