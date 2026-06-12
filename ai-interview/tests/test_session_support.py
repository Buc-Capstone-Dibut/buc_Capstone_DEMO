from __future__ import annotations

import unittest
from unittest.mock import patch

from app.interview.runtime import session_support


class CreateLiveInterviewSessionTests(unittest.TestCase):
    def test_uses_vertex_client_and_vertex_model_when_enabled(self) -> None:
        vertex_client = object()

        with (
            patch.object(session_support.settings, "google_genai_use_vertexai", True),
            patch.object(
                session_support.settings,
                "gemini_vertex_live_model",
                "gemini-live-2.5-flash-native-audio",
            ),
            patch.object(
                session_support,
                "_build_vertex_live_client",
                return_value=(vertex_client, "debut-492601"),
            ),
        ):
            session = session_support.create_live_interview_session()

        self.assertIs(session._client, vertex_client)
        self.assertEqual(session.model, "gemini-live-2.5-flash-native-audio")

    def test_falls_back_to_api_key_when_vertex_configuration_fails(self) -> None:
        fallback_session = object()

        with (
            patch.object(session_support.settings, "google_genai_use_vertexai", True),
            patch.object(
                session_support,
                "_build_vertex_live_client",
                side_effect=RuntimeError("missing credential"),
            ),
            patch.object(
                session_support,
                "GeminiLiveInterviewSession",
                return_value=fallback_session,
            ) as session_factory,
            patch.object(session_support.logger, "exception"),
        ):
            session = session_support.create_live_interview_session()

        self.assertIs(session, fallback_session)
        session_factory.assert_called_once_with(
            api_key=session_support.settings.gemini_api_key,
            model=session_support.settings.gemini_live_stt_model,
            voice=session_support.settings.gemini_live_tts_voice,
            timeout_sec=30.0,
        )


if __name__ == "__main__":
    unittest.main()
