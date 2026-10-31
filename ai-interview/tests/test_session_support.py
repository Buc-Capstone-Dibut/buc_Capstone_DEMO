from __future__ import annotations

import threading
import types
import unittest
from functools import lru_cache
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


class ParallelSttWarmupTests(unittest.IsolatedAsyncioTestCase):
    async def test_first_audio_reuses_client_initialized_outside_event_loop(self) -> None:
        initialization_threads: list[int] = []
        service = types.SimpleNamespace(enabled=True)

        @lru_cache(maxsize=1)
        def factory():
            initialization_threads.append(threading.get_ident())
            return service

        with (
            patch.object(session_support.settings, "voice_parallel_stt_enabled", True),
            patch.object(session_support, "get_parallel_stt_service", factory),
        ):
            await session_support.warm_up_parallel_stt_service()
            self.assertIs(session_support.get_parallel_stt_service(), service)

        self.assertEqual(len(initialization_threads), 1)
        self.assertNotEqual(initialization_threads[0], threading.get_ident())
        self.assertEqual(factory.cache_info().hits, 1)

    async def test_disabled_stt_does_not_initialize_client(self) -> None:
        with (
            patch.object(session_support.settings, "voice_parallel_stt_enabled", False),
            patch.object(session_support, "get_parallel_stt_service") as factory,
        ):
            await session_support.warm_up_parallel_stt_service()
        factory.assert_not_called()

    async def test_warmup_failure_does_not_prevent_api_startup(self) -> None:
        with (
            patch.object(session_support.settings, "voice_parallel_stt_enabled", True),
            patch.object(session_support, "get_parallel_stt_service", side_effect=RuntimeError("unavailable")),
            patch.object(session_support.logger, "exception") as log,
        ):
            await session_support.warm_up_parallel_stt_service()
        log.assert_called_once()


if __name__ == "__main__":
    unittest.main()
