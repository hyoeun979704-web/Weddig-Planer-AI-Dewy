"""AI 티(slop) 제거 — 마케팅 카피 품질 자동 검수.

stop-slop 아이디어를 외부 의존·전체권한 위험 없이 자체 구현. Dewy 톤(존댓말·과장 금지)에 맞춤.
- clean(text): em-dash·throat-clearing(군더더기 도입부) 제거 → 정리된 텍스트.
- review(text): {cleaned, issues, score(0-10)} — 사람 가기 전 자동 검수에 사용.
"""

import re

EM_DASHES = ["—", "–", "―"]

# 과장/슬롭 어휘(한글 substring + 영어). 발견 시 감점·플래그(자동 삭제는 의미 훼손 우려라 플래그만).
HYPE = [
    "획기적", "혁신적", "놀라운", "최고의", "엄청난", "압도적", "단언컨대", "비교불가",
    "완벽한", "최강", "역대급", "끝판왕", "world-class", "game-changer", "gamechanger",
    "revolutionary", "seamless", "unlock", "elevate", "delve", "tapestry",
    "supercharge", "unparalleled", "cutting-edge",
]

# 군더더기 도입부(문장/줄 시작). 제거 대상.
THROAT = [
    "결론부터 말하면", "결론부터 말씀드리면", "말할 것도 없이", "두말할 나위 없이",
    "아시다시피", "그뿐만 아니라", "in today's world", "in conclusion", "moreover", "furthermore",
]


def clean(text: str) -> str:
    out = text
    for d in EM_DASHES:
        out = out.replace(f" {d} ", ", ").replace(d, ", ")
    # 줄 시작의 군더더기 도입부 제거
    lines = []
    for ln in out.split("\n"):
        s = ln
        low = ln.lstrip().lower()
        for t in THROAT:
            if low.startswith(t.lower()):
                stripped = ln.lstrip()
                s = stripped[len(t):].lstrip(" ,，.·").rstrip()
                s = (s[:1].upper() + s[1:]) if s and s[0].isascii() else s
                break
        lines.append(s)
    out = "\n".join(lines)
    out = re.sub(r"[ \t]{2,}", " ", out)
    out = re.sub(r"(,\s*){2,}", ", ", out)
    return out.strip()


def review(text: str) -> dict:
    issues = []
    em = sum(text.count(d) for d in EM_DASHES)
    if em:
        issues.append(f"em-dash {em}개(— 대신 쉼표/마침표 권장)")
    found_hype = sorted({h for h in HYPE if h.lower() in text.lower()})
    if found_hype:
        issues.append("과장 어휘: " + ", ".join(found_hype))
    found_throat = sorted({t for t in THROAT if t.lower() in text.lower()})
    if found_throat:
        issues.append("군더더기 도입부: " + ", ".join(found_throat))
    # 점수: em-dash·도입부는 항목당 1, 과장 어휘는 개수만큼 가중.
    penalty = (1 if em else 0) + len(found_throat) + len(found_hype)
    score = max(0, 10 - penalty)
    return {"cleaned": clean(text), "issues": issues, "score": score}


if __name__ == "__main__":
    sample = ("결론부터 말하면, 이건 혁신적이고 획기적인 — 그리고 압도적인 — 웨딩 서비스입니다.\n"
              "두말할 나위 없이 최고의 선택이에요.")
    r = review(sample)
    print("점수:", r["score"]); print("이슈:", r["issues"]); print("정리:\n" + r["cleaned"])
