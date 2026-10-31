import unittest

from app.interview.domain.stt_entities import normalize_self_introduction_name


class SelfIntroductionNameTests(unittest.TestCase):
    def test_known_name_corrects_close_sounds_without_waiting_for_audio(self):
        for heard in ("김리버", "김비버", "김 디버"):
            text = f"안녕하세요 데이터의 근거를 끝까지 확인하는 개발자 {heard}입니다."
            corrected = normalize_self_introduction_name(text, ["김디벗"])
            self.assertEqual(corrected, "안녕하세요 데이터의 근거를 끝까지 확인하는 개발자 김디벗입니다.")
            self.assertEqual(normalize_self_introduction_name(corrected, ["김디벗"]), corrected)

    def test_unrelated_names_quoted_names_and_unknown_candidates_are_preserved(self):
        for text, names in (
            ("안녕하세요 개발자 김민수입니다.", ["김디벗"]),
            ("안녕하세요 개발자 이디벗입니다.", ["김디벗"]),
            ("팀원 개발자 김리버입니다.", ["김디벗"]),
            ("안녕하세요 개발자 김리버입니다.", []),
            ("안녕하세요 개발자 김리버입니다.", ["김리버"]),
        ):
            with self.subTest(text=text, names=names):
                self.assertEqual(normalize_self_introduction_name(text, names), text)
