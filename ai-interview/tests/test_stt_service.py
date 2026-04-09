from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.stt_service import GoogleCloudSttService, _is_fatal_google_stt_error, pick_best_stt_alternative_text


class GoogleCloudSttServiceTests(unittest.TestCase):
    def test_pick_best_stt_alternative_prefers_cleaner_transcript(self) -> None:
        chosen = pick_best_stt_alternative_text(
            [
                "실시간 AI 면접 서비스를 개발 하며 웹소켓 기반 통신과 백엔드 PI 설계해다수 사용 자의동시 요청을 안정적으로 처리한경험이 있습니다.",
                "실시간 AI 면접 서비스를 개발하며 웹소켓 기반 통신과 백엔드 API 설계를 담당했습니다.",
            ]
        )
        self.assertEqual(
            chosen,
            "실시간 AI 면접 서비스를 개발하며 웹소켓 기반 통신과 백엔드 API 설계를 담당했습니다.",
        )

    def test_pick_best_stt_alternative_ignores_empty_candidates(self) -> None:
        chosen = pick_best_stt_alternative_text(["", "   ", "웹소켓 기반 통신 구조를 설계했습니다."])
        self.assertEqual(chosen, "웹소켓 기반 통신 구조를 설계했습니다.")

    def test_detects_service_disabled_error_as_fatal(self) -> None:
        exc = Exception(
            "403 Cloud Speech-to-Text API has not been used in project demo before or it is disabled. "
            'reason: "SERVICE_DISABLED" metadata { key: "service" value: "speech.googleapis.com" }'
        )
        self.assertTrue(_is_fatal_google_stt_error(exc))

    def test_disable_runtime_turns_service_off(self) -> None:
        service = GoogleCloudSttService.__new__(GoogleCloudSttService)
        service._client = object()
        service._runtime_disabled_reason = None
        service._runtime_disabled_at = None

        service._disable_runtime(Exception('reason: "SERVICE_DISABLED"'))

        self.assertFalse(service.enabled)
        self.assertIsNotNone(service._runtime_disabled_reason)


if __name__ == "__main__":
    unittest.main()
