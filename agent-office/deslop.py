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
    # 과한 슬랭 과장(웨딩 톤엔 부적합) — 실데이터에서 관측: "빡세게", "이를 갈고", "찐 정보".
    "빡세게", "빡셈", "이를 갈", "찐 정보", "개꿀", "레전드", "꿀잼", "갓생", "갓성비", "핵꿀",
]

# 공격적·대결적 표현 — 브랜드 톤(다정·응원·안심)과 정면 충돌. 강한 감점.
# 실데이터에서 관측: "썩은 웨딩 업계를 뒤집는" 류.
AGGRO = ["썩은", "뒤집", "갈아엎", "판을 바꾸", "혁명", "박살", "끝장"]

# 군더더기 도입부(문장/줄 시작). 제거 대상.
THROAT = [
    "결론부터 말하면", "결론부터 말씀드리면", "말할 것도 없이", "두말할 나위 없이",
    "아시다시피", "그뿐만 아니라", "in today's world", "in conclusion", "moreover", "furthermore",
    # 한국어 블로그 상투 인트로(실데이터: "안녕하세요 ...입니다", "오늘은 ~ 알려드릴게요").
    "안녕하세요", "오늘은", "지금부터", "이번 시간에는",
]

# 이모지/구어체 남발 감지(웨딩 톤은 이모지 1~2개 권장).
_EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF←-⇿⬀-⯿]"
)
_LAUGH_RE = re.compile("[ㅋㅎㅠㅜ]{2,}")  # ㅋㅋ/ㅎㅎ/ㅠㅠ 류
_EMOJI_MAX = 6   # 이 개수 초과면 과다
_EXCLAIM_MAX = 4  # 느낌표 이 개수 초과면 남발


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
        issues.append("과장/슬랭 어휘: " + ", ".join(found_hype))
    found_aggro = sorted({a for a in AGGRO if a in text})
    if found_aggro:
        issues.append("공격적 표현(브랜드 톤 위반): " + ", ".join(found_aggro))
    found_throat = sorted({t for t in THROAT if t.lower() in text.lower()})
    if found_throat:
        issues.append("군더더기 도입부: " + ", ".join(found_throat))
    emoji_n = len(_EMOJI_RE.findall(text))
    emoji_over = emoji_n > _EMOJI_MAX
    if emoji_over:
        issues.append(f"이모지 과다({emoji_n}개, 권장 1~2개)")
    exclaim_n = text.count("!") + text.count("！")
    exclaim_over = exclaim_n > _EXCLAIM_MAX
    if exclaim_over:
        issues.append(f"느낌표 남발({exclaim_n}개)")
    laugh = bool(_LAUGH_RE.search(text))
    if laugh:
        issues.append("구어체 감탄사(ㅠㅠ/ㅋㅋ 등)")
    # 점수: em-dash·도입부·과장은 항목당 1, 공격적 표현은 2배 가중(브랜드 톤 정면 위반).
    penalty = (
        (1 if em else 0)
        + len(found_throat)
        + len(found_hype)
        + 2 * len(found_aggro)
        + (1 if emoji_over else 0)
        + (1 if exclaim_over else 0)
        + (1 if laugh else 0)
    )
    score = max(0, 10 - penalty)
    return {"cleaned": clean(text), "issues": issues, "score": score}


if __name__ == "__main__":
    sample = ("결론부터 말하면, 이건 혁신적이고 획기적인 — 그리고 압도적인 — 웨딩 서비스입니다.\n"
              "두말할 나위 없이 최고의 선택이에요.")
    r = review(sample)
    print("점수:", r["score"]); print("이슈:", r["issues"]); print("정리:\n" + r["cleaned"])
