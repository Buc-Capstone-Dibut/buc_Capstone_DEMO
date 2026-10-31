from __future__ import annotations

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.stt_service import GoogleCloudSttService, GoogleCloudStreamingSttSession, _is_fatal_google_stt_error, pick_best_stt_alternative_text


def _result(text: str, *, final: bool = False, alternatives: tuple[str, ...] = ()):
    return SimpleNamespace(
        alternatives=[SimpleNamespace(transcript=value) for value in (text, *alternatives)],
        is_final=final,
        stability=0.8,
    )


def _response(*results):
    return SimpleNamespace(results=list(results))


def _stream_events(*responses):
    events = []
    client = Mock()
    client.streaming_recognize.return_value = iter(responses)
    session = GoogleCloudStreamingSttSession(
        client=client, provider="google-cloud-stt", sample_rate=16000,
        language_code="ko-KR", model="latest_long", max_alternatives=5,
        enable_automatic_punctuation=True, phrase_hints=[], phrase_hint_boost=16,
        timeout_sec=None, on_result=events.append,
    )
    session.close(wait_timeout=2.0)
    if session.failed():
        raise AssertionError("mocked STT stream failed")
    if session._thread.is_alive():
        raise AssertionError("mocked STT stream did not finish")
    return events


class GoogleCloudSttServiceTests(unittest.TestCase):
    def test_batch_transcription_joins_results_in_audio_order(self) -> None:
        service = GoogleCloudSttService.__new__(GoogleCloudSttService)
        service.__dict__.update(
            provider="google-cloud-stt", language_code="ko-KR", model="latest_long",
            max_alternatives=5, enable_automatic_punctuation=True,
            phrase_hints=[], phrase_hint_boost=16, timeout_sec=8,
            _runtime_disabled_reason=None, _client=Mock(),
        )
        service._client.recognize.return_value = _response(
            _result("웹소켓 통신을 담당했습니다."),
            _result("캐시로 응답 시간을 줄였습니다."),
        )
        self.assertEqual(
            service.transcribe_wav(b"mocked audio").text,
            "웹소켓 통신을 담당했습니다. 캐시로 응답 시간을 줄였습니다.",
        )

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


class GoogleCloudStreamingSttTests(unittest.TestCase):
    def test_combines_consecutive_interim_results_before_emitting(self) -> None:
        events = _stream_events(_response(_result("웹소켓 통신을"), _result("담당했습니다.")))
        self.assertEqual([event.text for event in events], ["웹소켓 통신을 담당했습니다."])
        self.assertFalse(events[0].is_final)

    def test_replaces_interim_tail_and_accumulates_finalized_segments(self) -> None:
        events = _stream_events(
            _response(_result("웹소켓을 적용했습니다.")),
            _response(_result("웹소켓을")),
            _response(_result("웹소켓을 검토했습니다.", final=True)),
            _response(_result("캐시도")),
            _response(_result("캐시도 적용했습니다.", final=True)),
        )
        self.assertEqual([event.text for event in events], [
            "웹소켓을 적용했습니다.",
            "웹소켓을",
            "웹소켓을 검토했습니다.",
            "웹소켓을 검토했습니다. 캐시도",
            "웹소켓을 검토했습니다. 캐시도 적용했습니다.",
        ])
        self.assertEqual([event.is_final for event in events], [False, False, True, False, True])

    def test_final_and_interim_in_one_response_keep_one_complete_snapshot(self) -> None:
        events = _stream_events(
            _response(_result("통신을 설계했습니다.", final=True), _result("캐시로"), _result("응답 시간을")),
            _response(_result("캐시로 응답 시간을 줄였습니다.", final=True)),
        )
        self.assertEqual([event.text for event in events], [
            "통신을 설계했습니다. 캐시로 응답 시간을",
            "통신을 설계했습니다. 캐시로 응답 시간을 줄였습니다.",
        ])
        self.assertEqual([event.is_final for event in events], [False, True])

    def test_repeated_spoken_segments_are_preserved(self) -> None:
        events = _stream_events(_response(_result("네.", final=True)), _response(_result("네.", final=True)))
        self.assertEqual(events[-1].text, "네. 네.")

    def test_empty_responses_do_not_erase_or_repeat_finalized_text(self) -> None:
        events = _stream_events(
            _response(_result("답변입니다.", final=True)), _response(), _response(_result(" ")),
        )
        self.assertEqual([event.text for event in events], ["답변입니다."])


if __name__ == "__main__":
    unittest.main()
