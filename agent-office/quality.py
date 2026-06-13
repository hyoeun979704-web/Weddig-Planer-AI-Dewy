"""자기검토 eval — 사람 가기 전 품질 자동 게이트 (청사진 P2).

- rule_score(text): deslop(AI 티) + 길이/구조 규칙 → 0-10.
- judge_score(text, brief): LLM-as-judge(ANTHROPIC_API_KEY 있을 때) 톤·정확·유용 → 없으면 None(룰만).
- evaluate(text, brief): 종합 점수 + 통과 여부(임계) + 상세.
- 골든셋: golden.json(또는 내장 샘플)로 점수 회귀 추적 — 프롬프트/스코어러 변경이 품질을 떨어뜨리는지.

builtin eval 과 헷갈리지 않게 모듈명은 quality.
"""

import json
import os
from pathlib import Path

import deslop

BASE = Path(__file__).parent
GOLDEN_FILE = BASE / "golden.json"
THRESHOLD = 6  # 이 점수 미만이면 '주의'(사람이 반드시 검토)


def rule_score(text: str):
    r = deslop.review(text)
    score = r["score"]
    issues = list(r["issues"])
    body = text.strip()
    if len(body) < 120:
        score -= 2
        issues.append("내용이 너무 짧음(<120자)")
    if len(body) > 300 and "#" not in body and "\n" not in body:
        score -= 1
        issues.append("제목/문단 구조 부족")
    return max(0, min(10, score)), issues


def judge_score(text: str, brief: str = ""):
    """LLM-as-judge. 키 없으면 (None, 사유). 실패해도 게이트를 막지 않음."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None, "judge 미사용(ANTHROPIC_API_KEY 없음 — 룰 점수만)"
    try:
        import anthropic  # 지연 import — 키 있을 때만 필요
        import config
        client = anthropic.Anthropic()
        rubric = (
            "다음 마케팅 초안을 0-10 정수로 평가하라. 기준: 브랜드 톤(존댓말·과장/허위 금지), "
            "정확성, 유용성. 반드시 JSON {\"score\":N,\"reason\":\"...\"} 만 출력."
        )
        msg = client.messages.create(
            model=config.MARKETER_MODEL, max_tokens=200,
            messages=[{"role": "user", "content": f"{rubric}\n[brief] {brief}\n[초안]\n{text[:4000]}"}],
        )
        raw = "".join(getattr(b, "text", "") for b in msg.content)
        start, end = raw.find("{"), raw.rfind("}")
        data = json.loads(raw[start:end + 1])
        return int(data.get("score", 0)), str(data.get("reason", ""))[:200]
    except Exception as e:  # noqa: BLE001
        return None, f"judge 실패(룰만 사용): {e}"


def evaluate(text: str, brief: str = "", threshold: int = THRESHOLD) -> dict:
    rs, issues = rule_score(text)
    js, jnote = judge_score(text, brief)
    overall = round((rs + js) / 2) if js is not None else rs
    return {
        "score": overall, "rule": rs, "judge": js, "judge_note": jnote,
        "passed": overall >= threshold, "issues": issues,
    }


# 골든셋 — 내장 기본(파일 있으면 파일 우선). 대표 (brief, output) 쌍으로 스코어러 회귀 추적.
_DEFAULT_GOLDEN = [
    {"brief": "성수동 웨딩홀 추천",
     "text": "# 성수동 웨딩홀, 둘이서 고르기 좋은 5곳\n\n예비부부가 한 번쯤 고민하는 성수동. 채광 좋은 홀부터 인더스트리얼 감성까지, 발품을 줄이도록 핵심만 정리했어요.\n\n## 1. ...\n"},
    {"brief": "스드메 가이드",
     "text": "결론부터 말하면, 혁신적이고 최고의 — 압도적인 — 스드메!"},  # 일부러 저품질(슬롭) 샘플
]


def load_golden() -> list:
    if GOLDEN_FILE.exists():
        try:
            return json.loads(GOLDEN_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return _DEFAULT_GOLDEN


def run_golden() -> list:
    rows = []
    for g in load_golden():
        r = evaluate(g["text"], g.get("brief", ""))
        rows.append({"brief": g.get("brief", ""), "score": r["score"], "passed": r["passed"], "issues": r["issues"]})
    return rows


if __name__ == "__main__":
    print("=== 골든셋 회귀 ===")
    for row in run_golden():
        flag = "✅" if row["passed"] else "⚠️"
        print(f"{flag} {row['brief']}: {row['score']}/10  {row['issues']}")
