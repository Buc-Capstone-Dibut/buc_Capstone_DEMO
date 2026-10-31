"""Immediate spelling correction for a known candidate identifying themselves."""
from __future__ import annotations

import re
from typing import Iterable


def _jamo(text: str) -> str:
    consonants = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
    endings = ("", "ㄱ", "ㄲ", "ㄱㅅ", "ㄴ", "ㄴㅈ", "ㄴㅎ", "ㄷ", "ㄹ", "ㄹㄱ", "ㄹㅁ", "ㄹㅂ", "ㄹㅅ", "ㄹㅌ", "ㄹㅍ", "ㄹㅎ", "ㅁ", "ㅂ", "ㅂㅅ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ")
    result = []
    for char in text:
        value = ord(char) - 0xAC00
        if not 0 <= value < 11172:
            result.append(char)
            continue
        result.extend((consonants[value // 588], chr(0x1161 + value % 588 // 28)))
        if value % 28:
            result.append(endings[value % 28])
    return "".join(result)


def _distance(left: str, right: str) -> int:
    previous = list(range(len(right) + 1))
    for i, a in enumerate(left, 1):
        row = [i]
        for j, b in enumerate(right, 1):
            row.append(min(row[-1] + 1, previous[j] + 1, previous[j - 1] + (a != b)))
        previous = row
    return previous[-1]


def normalize_self_introduction_name(text: str, names: Iterable[str]) -> str:
    if not re.match(r"^(안녕하세요|안녕하십니까|저는)\b", text):
        return text
    known = {re.sub(r"\s+", "", name) for name in names if isinstance(name, str)}
    known = {name for name in known if re.fullmatch(r"[가-힣]{2,5}", name)}
    if not known:
        return text

    def replace(match: re.Match[str]) -> str:
        heard = re.sub(r"\s+", "", match.group("name"))
        if match.start() > 120 or heard in known:
            return match.group()
        close = [name for name in known if len(name) == len(heard) and name[0] == heard[0]
                 and _distance(_jamo(name), _jamo(heard)) <= 2]
        if len(close) != 1:
            return match.group()
        return match.group("intro") + close[0] + match.group("ending")

    return re.sub(
        r"(?P<intro>(?:개발자|지원자|이름은|저는)\s+)"
        r"(?P<name>[가-힣]{1,5}(?:\s+[가-힣]{1,3}){0,2})(?P<ending>\s*입니다)",
        replace, text,
    )


def normalize_application_company(text: str, company: str) -> str:
    if not re.fullmatch(r"[가-힣]{2,10}", company or ""):
        return text
    candidates = [company + ending for ending in ("", "에", "의", "을", "를", "은", "는", "이", "가")]

    def replace(match: re.Match[str]) -> str:
        heard = match.group()
        if heard.startswith(company):
            return heard
        options = [candidate for candidate in candidates if len(candidate) == len(heard)] or candidates
        scores = [(candidate, _distance(_jamo(candidate), _jamo(heard))) for candidate in options]
        closest = min(score for _, score in scores)
        matches = [candidate for candidate, score in scores if score == closest]
        return matches[0] if closest <= 1 and len(matches) == 1 else heard

    # Limit correction to an application statement about the known target.
    # Mentions of another company elsewhere are retained.
    return re.sub(r"(?<![가-힣])[가-힣]{2,12}(?=\s*지원(?:했|합|하|동기))", replace, text)
